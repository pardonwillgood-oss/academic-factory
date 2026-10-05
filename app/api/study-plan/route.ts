import { PDFParse } from 'pdf-parse'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { studyPlan } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'

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
  })).min(1).max(12),
})

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return Response.json({ plans: [] })
  const plans = await db.select().from(studyPlan).where(eq(studyPlan.userId, session.user.id)).orderBy(desc(studyPlan.createdAt))
  return Response.json({ plans })
}

export async function POST(request: Request) {
  let material = ''
  try {
    const formData = await request.formData()
    material = String(formData.get('material') ?? '').trim()
    const uploadedFile = formData.get('file')
    if (!material && uploadedFile instanceof File && uploadedFile.type === 'application/pdf') {
      if (uploadedFile.size > 3_000_000) return Response.json({ error: 'This PDF is too large. Please use a PDF under 3 MB or paste the chapter text.' }, { status: 413 })
      const parser = new PDFParse({ data: Buffer.from(await uploadedFile.arrayBuffer()) })
      const parsed = await parser.getText()
      material = parsed.text.replace(/\s+/g, ' ').trim()
      await parser.destroy()
    }
    const body = { fileName: String(formData.get('fileName') ?? (uploadedFile instanceof File ? uploadedFile.name : '')) }
    if (material.length < 20) return Response.json({ error: 'We could not read enough text from this file. Try a text-based PDF or paste the chapter text.' }, { status: 400 })
    if (material.length > 30000) material = material.slice(0, 30000)

    const plan = buildFallbackPlan(material)
    void savePlanForSignedInUser(plan, body.fileName)
    return Response.json({ ...plan, generatedWith: 'Academic Factory planner' }, { status: 200 })
  } catch (error) {
    console.error('[v0] Study plan generation failed', error)
    return createFallbackResponse(material)
  }
}

function createFallbackResponse(material: string) {
  try {
    const fallback = buildFallbackPlan(material)
    void savePlanForSignedInUser(fallback, undefined)
    return Response.json({ ...fallback, generatedWith: 'Academic Factory planner' }, { status: 200 })
  } catch (fallbackError) {
    console.error('[v0] Fallback study plan failed', fallbackError)
    return Response.json({ error: 'Please paste at least a few sentences of study material and try again.' }, { status: 400 })
  }
}

async function savePlanForSignedInUser(plan: z.infer<typeof planSchema>, materialName?: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return
    await db.insert(studyPlan).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      title: plan.title,
      summary: plan.summary,
      estimatedHours: plan.estimatedHours,
      materialName: materialName ?? null,
      plan: plan.concepts,
    })
  } catch (error) {
    console.error('[v0] Could not save study plan; returning generated plan anyway', error)
  }
}

function buildFallbackPlan(material: string) {
  const sentences = material.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean)
  const concepts = (sentences.length ? sentences : [material]).slice(0, 8).map((sentence, index) => {
    const title = sentence.split(/\s+/).slice(0, 7).join(' ')
    return {
      title: title.charAt(0).toUpperCase() + title.slice(1),
      whyItMatters: `This is a core idea from your material. Connect it to the surrounding concepts and explain it in your own words.`,
      learn: [`Read the section carefully and highlight the key terms.`, `Write a two-sentence explanation of: ${sentence.slice(0, 140)}.`],
      practice: [`Create 3 questions about this idea and answer them without looking.`, `Work through one example, then explain each step.`],
      revise: [`Make 5 flashcards for the definitions and relationships.`, `Review this concept tomorrow and again in three days.`],
      create: [`Draw a simple concept map linking this idea to the next topic.`, `Teach the idea aloud in under two minutes.`],
      prepare: [`Answer an exam-style question on this concept in 10 minutes.`, `List one common mistake and how to avoid it.`],
    }
  })
  return {
    title: 'Your personalized study path',
    summary: `A practical learning loop built from ${concepts.length} key idea${concepts.length === 1 ? '' : 's'} in your material.`,
    estimatedHours: Math.max(1, Math.ceil(concepts.length * 0.75)),
    concepts,
  }
}
