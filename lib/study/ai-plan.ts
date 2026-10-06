import type { Concept, GeneratedPlan } from '@/lib/study/build-plan'

// Optional upgrade: if ANTHROPIC_API_KEY is set, ask Claude for a richer plan.
// Plain fetch, no extra dependency. Returns null on ANY problem so the caller falls back to the deterministic planner.
export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY)

const SYSTEM = `You are a study coach. Turn the student's material into a study plan. Respond with ONLY a JSON object, no markdown fences, shaped exactly:
{"title": string, "summary": string, "estimatedHours": number,
 "concepts": [ {"title": string, "whyItMatters": string, "learn": string[1-3], "practice": string[1-3], "revise": string[1-3], "create": string[1-2], "prepare": string[1-2],
   "cards": [{"q": string, "a": string}] (3-5 items), "quiz": [{"q": string, "options": string[4], "answer": number (index of the correct option)}] (2-3 items)} ] }
Use 3 to 8 concepts, ordered from foundational to advanced. Be specific to the material, not generic. Quiz questions must be answerable from the material.`

export async function buildAiPlan(material: string): Promise<GeneratedPlan | null> {
  if (!aiConfigured()) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 22000)
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.AI_MODEL ?? 'claude-sonnet-5-5',
        max_tokens: 4000,
        system: SYSTEM,
        messages: [{ role: 'user', content: material.slice(0, 20000) }],
      }),
    })
    if (!response.ok) {
      console.error('AI planner HTTP', response.status)
      return null
    }
    const data = await response.json()
    const text: string = (data.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start < 0 || end <= start) return null
    const parsed = JSON.parse(text.slice(start, end + 1)) as GeneratedPlan
    parsed.concepts = (parsed.concepts as Concept[]).map((c) => ({
      ...c,
      quiz: (c.quiz ?? []).filter((q) => Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length),
    }))
    return parsed
  } catch (error) {
    console.error('AI planner failed; using built-in planner', error)
    return null
  } finally {
    clearTimeout(timer)
  }
}
