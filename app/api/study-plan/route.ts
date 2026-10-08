import { PDFParse } from 'pdf-parse'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { studyPlan } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { buildStudyPlan, type GeneratedPlan } from '@/lib/study/build-plan'
import { buildAiPlan } from '@/lib/study/ai-plan'

export const runtime = 'nodejs'
export const maxDuration = 30

const planSchema = z.object({
  title: z.string(),
  summary: z.string(),
  estimatedHours: z.number(),
  concepts: z.array(z.object({
    title: z.string(),
    whyItMatters: z.string(),
    learn: z.array(z.string()).min(1).max(4),
    practice: z.array(z.string()).min(1).max(4),
    revise: z.array(z.string()).min(1).max(4),
    create: z.array(z.string()).min(1).max(3),
    prepare: z.array(z.string()).min(1).max(3),
    cards: z.array(z.object({ q: z.string(), a: z.string() })).max(8).optional(),
    quiz: z.array(z.object({ q: z.string(), options: z.array(z.string()).min(2).max(6), answer: z.number().int() })).max(6).optional(),
  })).min(1).max(12),
})

async function currentUserId() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    return session?.user?.id ?? null
  } catch (error) {
    console.error('Could not read session', error)
    return null
  }
}

// Only ever returns the signed-in user's own plans.
export async function GET() {
  const userId = await currentUserId()
  if (!userId) return Response.json({ plans: [] })
  try {
    const plans = await db.select().from(studyPlan).where(eq(studyPlan.userId, userId)).orderBy(desc(studyPlan.createdAt))
    return Response.json({ plans })
  } catch (error) {
    console.error('Could not load study plans', error)
    return Response.json({ plans: [] })
  }
}

export async function POST(request: Request) {
  let material = ''
  let fileName = ''
  try {
    const formData = await request.formData()
    material = String(formData.get('material') ?? '').trim()
    const uploadedFile = formData.get('file')
    if (uploadedFile instanceof File) fileName = String(formData.get('fileName') ?? uploadedFile.name)

    if (!material && uploadedFile instanceof File) {
      const isPdf = uploadedFile.type === 'application/pdf' || uploadedFile.name.toLowerCase().endsWith('.pdf')
      if (uploadedFile.size > 3_000_000) {
        return Response.json({ error: 'This file is too large. Please use a file under 3 MB or paste the chapter text.' }, { status: 413 })
      }
      if (isPdf) {
        try {
          const parser = new PDFParse({ data: new Uint8Array(await uploadedFile.arrayBuffer()) })
          try {
            const parsed = await parser.getText()
            material = parsed.text
          } finally {
            await parser.destroy().catch(() => {})
          }
        } catch (error) {
          console.error('PDF parsing failed', error)
          return Response.json({ error: 'We could not read this PDF. Please paste the chapter text instead.' }, { status: 422 })
        }
      } else {
        material = (await uploadedFile.text()).trim()
      }
    }

    if (material.replace(/\s+/g, ' ').trim().length < 20) {
      return Response.json({ error: 'We could not read enough text from this file. Try a text-based PDF or paste the chapter text.' }, { status: 400 })
    }
    if (material.length > 30000) material = material.slice(0, 30000)

    // Use the AI planner whenever its optional API key is configured; otherwise fall back to the built-in planner.
    let candidate: GeneratedPlan | null = await buildAiPlan(material)
    if (candidate && !planSchema.safeParse(candidate).success) candidate = null
    const generatedWith = candidate ? 'Academic Factory AI planner' : 'Academic Factory planner'
    const parsedPlan = planSchema.safeParse(candidate ?? buildStudyPlan(material))
    if (!parsedPlan.success) {
      return Response.json({ error: 'We could not turn this material into a plan. Try adding more detail.' }, { status: 400 })
    }
    const plan = parsedPlan.data as GeneratedPlan

    // Awaited on purpose: on serverless the function may be frozen once the response is sent.
    const saved = await savePlan(plan, fileName || undefined)
    return Response.json({ ...plan, id: saved?.id ?? null, saved: Boolean(saved), generatedWith })
  } catch (error) {
    console.error('Study plan generation failed', error)
    return Response.json({ error: 'Something went wrong while building your plan. Please try again.' }, { status: 500 })
  }
}

async function savePlan(plan: GeneratedPlan, materialName?: string) {
  const userId = await currentUserId()
  if (!userId) return null
  try {
    const id = crypto.randomUUID()
    await db.insert(studyPlan).values({
      id,
      userId,
      title: plan.title,
      summary: plan.summary,
      estimatedHours: plan.estimatedHours,
      materialName: materialName ?? null,
      plan: plan.concepts,
    })
    return { id }
  } catch (error) {
    console.error('Could not save study plan; returning generated plan anyway', error)
    return null
  }
}
