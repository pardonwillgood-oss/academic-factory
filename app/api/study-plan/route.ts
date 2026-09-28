import { generateText, gateway, Output } from 'ai'
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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const material = typeof body.material === 'string' ? body.material.trim() : ''
    if (material.length < 20) return Response.json({ error: 'Add at least a few sentences of study material.' }, { status: 400 })

    const { output } = await generateText({
      model: gateway('google/gemini-3.1-flash-lite'),
      output: Output.object({ schema: planSchema }),
      system: 'You are an expert academic coach. Build a practical, encouraging study path from the student material. Keep tasks concrete and student-friendly. Return only the requested structured output.',
      prompt: `Create a personalized study path from this material. Cover learning, practice, revision, creating something, and exam preparation for every concept. Material:\n\n${material.slice(0, 30000)}`,
    })

    return Response.json(output)
  } catch (error) {
    console.error('[v0] Study plan generation failed', error)
    return Response.json({ error: 'The study plan could not be generated. Please try again.' }, { status: 500 })
  }
}
