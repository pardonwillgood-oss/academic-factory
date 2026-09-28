import { generateObject, gateway } from 'ai'
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

    const { object } = await generateObject({
      model: gateway('google/gemini-3.1-flash-lite'),
      schema: planSchema,
      system: 'You are an expert academic coach. Build a practical, encouraging study path from the student material. Keep tasks concrete and student-friendly. Return only the requested structured output.',
      prompt: `Create a personalized study path from this material. Cover learning, practice, revision, creating something, and exam preparation for every concept. Material:\n\n${material.slice(0, 30000)}`,
    })

    return Response.json(object)
  } catch (error) {
    console.error('[v0] Study plan generation failed', error)
    const fallback = buildFallbackPlan(material)
    return Response.json({ ...fallback, generatedWith: 'Academic Factory planner' })
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
