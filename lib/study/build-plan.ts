// Deterministic study-plan builder. No network, no AI provider required.

export type Concept = {
  title: string
  whyItMatters: string
  learn: string[]
  practice: string[]
  revise: string[]
  create: string[]
  prepare: string[]
  cards?: Array<{ q: string; a: string }>
  quiz?: Array<{ q: string; options: string[]; answer: number }>
}

export type GeneratedPlan = {
  title: string
  summary: string
  estimatedHours: number
  concepts: Concept[]
}

const STOP = new Set(
  'this that with from have has had were was are been being will would could should shall into onto than then them they their there these those what when where which while about above after again also because before between both each other over same some such only just more most very your yours ours its our out any can may might must not nor but and for the you his her him she who whom how why does did done doing own off per via use used using uses'.split(' '),
)

const clean = (s: string) => s.replace(/\s+/g, ' ').trim()

function clip(s: string, n: number) {
  const c = clean(s)
  if (c.length <= n) return c
  return c.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map(clean)
    .filter((s) => s.length >= 3)
}

function topKeywords(text: string, n: number) {
  const counts = new Map<string, { c: number; i: number }>()
  const words = text.toLowerCase().match(/[a-z][a-z'-]{3,}/g) ?? []
  words.forEach((w, i) => {
    if (STOP.has(w)) return
    const e = counts.get(w)
    if (e) e.c += 1
    else counts.set(w, { c: 1, i })
  })
  return [...counts.entries()]
    .sort((a, b) => b[1].c - a[1].c || a[1].i - b[1].i)
    .slice(0, n)
    .map(([w]) => w)
}

function isHeading(line: string) {
  const words = line.split(/\s+/).length
  if (line.length < 3 || line.length > 80 || words > 10) return false
  if (/^(chapter|unit|section|topic|module|lesson|part)\b/i.test(line)) return true
  if (/^\d+(\.\d+)*[.)]?\s+\S/.test(line) && !/[.!?]$/.test(line)) return true
  if (/[.!?,;]$/.test(line)) return false
  return /^[A-Z0-9]/.test(line) && words <= 8
}

type Section = { heading?: string; body: string }

function toSections(text: string): Section[] {
  const lines = text.split(/\n/).map(clean).filter(Boolean)
  const headingFlags = lines.map((l, i) => isHeading(l) && i < lines.length - 1)
  const headingCount = headingFlags.filter(Boolean).length
  if (headingCount >= 2 && headingCount <= lines.length * 0.5) {
    const sections: Section[] = []
    let current: Section | null = null
    lines.forEach((line, i) => {
      if (headingFlags[i]) {
        if (current && current.body.length >= 20) sections.push(current)
        current = { heading: line.replace(/[:\s]+$/, ''), body: '' }
      } else if (current) current.body += (current.body ? ' ' : '') + line
      else current = { body: line }
    })
    if (current && (current as Section).body.length >= 20) sections.push(current)
    if (sections.length >= 2) return sections.slice(0, 8)
  }
  const sentences = splitSentences(text)
  const groups = Math.min(8, Math.max(1, Math.ceil(sentences.length / 3)))
  const size = Math.max(1, Math.ceil(sentences.length / groups))
  const out: Section[] = []
  for (let i = 0; i < sentences.length; i += size) out.push({ body: sentences.slice(i, i + size).join(' ') })
  return out.length ? out : [{ body: clean(text) }]
}

function titleFromSentence(sentence: string) {
  const def = sentence.match(/^(.{3,60}?)\s+(is|are|means|refers to|was|were)\b/i)
  const raw = def ? def[1] : sentence.split(/\s+/).slice(0, 7).join(' ')
  return capitalize(clip(raw.replace(/^(the|a|an)\s+/i, (m) => m).replace(/[,:;]+$/, ''), 60))
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildCards(sentences: string[], kw: string[]) {
  const cards: Array<{ q: string; a: string }> = []
  for (const sentence of sentences) {
    if (cards.length >= 4) break
    const def = sentence.match(/^(.{3,60}?)\s+(is (?:a|an|the|defined as|called)|are|means|refers to)\b/i)
    if (def) {
      cards.push({ q: `What ${/^are/i.test(def[2]) ? 'are' : 'is'} ${def[1].replace(/^(the|a|an)\s+/i, '')}?`, a: clip(sentence, 220) })
      continue
    }
    const word = kw.find((k) => new RegExp(`\\b${escapeRe(k)}\\b`, 'i').test(sentence))
    if (word) cards.push({ q: clip(sentence.replace(new RegExp(`\\b${escapeRe(word)}\\b`, 'i'), '_____'), 200), a: word })
  }
  return cards
}

function buildQuiz(sentences: string[], kw: string[], pool: string[], seed: number) {
  const quiz: Array<{ q: string; options: string[]; answer: number }> = []
  const used = new Set<string>()
  for (const sentence of sentences) {
    if (quiz.length >= 3) break
    if (sentence.length < 25) continue
    const word = kw.find((k) => !used.has(k) && new RegExp(`\\b${escapeRe(k)}\\b`, 'i').test(sentence))
    if (!word) continue
    used.add(word)
    const distractors = pool.filter((w) => w !== word && !kw.includes(w)).slice(seed % Math.max(1, pool.length)).concat(pool).filter((w, i, arr) => w !== word && arr.indexOf(w) === i).slice(0, 3)
    if (distractors.length < 1) continue
    const options = [...distractors]
    const at = (seed * 7 + quiz.length * 3) % (options.length + 1)
    options.splice(at, 0, word)
    quiz.push({ q: `Fill in the blank: ${clip(sentence.replace(new RegExp(`\\b${escapeRe(word)}\\b`, 'i'), '_____'), 220)}`, options, answer: at })
  }
  return quiz
}

function buildConcept(section: Section, pool: string[], seed: number): Concept {
  const sentences = splitSentences(section.body)
  const first = sentences[0] ?? section.heading ?? section.body
  const kw = topKeywords(section.body, 4)
  const title = section.heading ? capitalize(clip(section.heading, 60)) : titleFromSentence(first)
  const defs = sentences.filter((s) => s !== first && /\b(is|are|means|refers to|is defined as)\b/i.test(s) && s.length < 220).slice(0, 2)
  const kwText = kw.slice(0, 3).join(', ')

  const learn = [
    `Read this section and highlight the key terms${kwText ? `: ${kwText}` : ''}.`,
    `Write a two-sentence summary of: "${clip(first, 140)}"`,
  ]
  if (defs[0]) learn.push(`Memorise this definition: "${clip(defs[0], 160)}"`)

  const practice = [
    `Write 3 questions about ${title} and answer them without looking.`,
    kw[0] ? `Explain "${kw[0]}" to a friend using one concrete example.` : 'Work through one example, then explain each step.',
  ]

  return {
    title,
    whyItMatters: `Core idea${kwText ? ` around ${kwText}` : ''}. Connect it to the surrounding concepts and explain it in your own words.`,
    learn,
    practice,
    revise: [
      `Make ${Math.max(3, Math.min(8, kw.length + 2))} flashcards covering ${kwText || title}.`,
      'Review tomorrow, again in three days, then after a week.',
    ],
    create: [`Draw a concept map linking ${kwText || title}.`, `Teach ${title} aloud in under two minutes.`],
    prepare: [`Answer an exam-style question on ${title} in 10 minutes.`, `List one common mistake about ${title} and how to avoid it.`],
    cards: buildCards(sentences, kw),
    quiz: buildQuiz(sentences, kw, pool, seed),
  }
}

export function buildStudyPlan(material: string): GeneratedPlan {
  const text = material.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  const sections = toSections(text)
  const pool = [...new Set(sections.flatMap((section) => topKeywords(section.body, 8)))]
  const concepts = sections.map((section, index) => buildConcept(section, pool, index))

  const seen = new Map<string, number>()
  for (const c of concepts) {
    const key = c.title.toLowerCase()
    const n = (seen.get(key) ?? 0) + 1
    seen.set(key, n)
    if (n > 1) c.title = `${c.title} (${n})`
  }

  const words = text.split(/\s+/).length
  return {
    title: 'Your personalized study path',
    summary: `A practical learning loop built from ${concepts.length} key idea${concepts.length === 1 ? '' : 's'} in your material (about ${words.toLocaleString('en-US')} words).`,
    estimatedHours: Math.max(1, Math.round((concepts.length * 0.75 + words / 1500) * 2) / 2),
    concepts,
  }
}
