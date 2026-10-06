'use client'

import { useMemo, useState } from 'react'
import { submitQuizResult } from '@/app/actions/premium-planner'

type Concept = { title: string; cards?: Array<{ q: string; a: string }>; quiz?: Array<{ q: string; options: string[]; answer: number }> }

export function QuizRunner({ planId, concepts }: { planId: string; concepts: Concept[] }) {
  const [mode, setMode] = useState<'quiz' | 'cards'>('quiz')
  const questions = useMemo(() => concepts.flatMap((c) => (c.quiz ?? []).map((q) => ({ ...q, concept: c.title }))), [concepts])
  const cards = useMemo(() => concepts.flatMap((c) => (c.cards ?? []).map((card) => ({ ...card, concept: c.title }))), [concepts])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<string, { correct: number; total: number }>>({})
  const [saved, setSaved] = useState<string>('')
  const [cardIndex, setCardIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const finished = index >= questions.length
  const choose = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    const q = questions[index]
    setAnswers((prev) => { const cur = prev[q.concept] ?? { correct: 0, total: 0 }; return { ...prev, [q.concept]: { correct: cur.correct + (i === q.answer ? 1 : 0), total: cur.total + 1 } } })
  }
  const next = async () => {
    const last = index + 1 >= questions.length
    setPicked(null)
    setIndex(index + 1)
    if (last) {
      const results = Object.entries(answers).map(([concept, r]) => ({ concept, ...r }))
      const response = await submitQuizResult({ planId, results })
      setSaved(response.ok ? `Saved. Your score was ${response.percent}% and your revision queue is updated.` : response.error)
    }
  }
  const total = Object.values(answers).reduce((s, r) => s + r.total, 0)
  const correct = Object.values(answers).reduce((s, r) => s + r.correct, 0)

  return <section className="premium-card premium-card-wide">
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
      <button className={`button button-small ${mode === 'quiz' ? 'button-dark' : 'button-outline'}`} onClick={() => setMode('quiz')}>Quiz ({questions.length})</button>
      <button className={`button button-small ${mode === 'cards' ? 'button-dark' : 'button-outline'}`} onClick={() => setMode('cards')}>Flashcards ({cards.length})</button>
    </div>
    {mode === 'quiz' ? (questions.length === 0 ? <p>This plan has no quiz questions yet. Generate a new study path with more detailed material.</p> : finished ? <div><h2>{correct} / {total} correct</h2><p>{saved || 'Saving your results…'}</p><button className="button button-outline button-small" onClick={() => { setIndex(0); setAnswers({}); setPicked(null); setSaved('') }}>Try again</button></div> : <div>
      <span className="card-label">{questions[index].concept.toUpperCase()} · QUESTION {index + 1} OF {questions.length}</span>
      <h2 style={{ fontSize: 20 }}>{questions[index].q}</h2>
      <div style={{ display: 'grid', gap: 8, margin: '12px 0' }}>{questions[index].options.map((option, i) => {
        const isRight = picked !== null && i === questions[index].answer
        const isWrong = picked === i && i !== questions[index].answer
        return <button key={i} onClick={() => choose(i)} className="button button-outline" style={{ justifyContent: 'flex-start', textAlign: 'left', borderColor: isRight ? 'green' : isWrong ? 'crimson' : undefined }}>{option}{isRight ? ' ✓' : isWrong ? ' ✗' : ''}</button>
      })}</div>
      {picked !== null && <button className="button button-dark button-small" onClick={next}>{index + 1 >= questions.length ? 'Finish' : 'Next question'}</button>}
    </div>) : (cards.length === 0 ? <p>No flashcards for this plan yet.</p> : <div>
      <span className="card-label">{cards[cardIndex].concept.toUpperCase()} · CARD {cardIndex + 1} OF {cards.length}</span>
      <button className="button button-outline" style={{ display: 'block', width: '100%', minHeight: 120, margin: '12px 0', textAlign: 'left', whiteSpace: 'normal' }} onClick={() => setFlipped(!flipped)}>{flipped ? cards[cardIndex].a : cards[cardIndex].q}<small style={{ display: 'block', opacity: .6 }}>{flipped ? 'Answer' : 'Tap to reveal'}</small></button>
      <div style={{ display: 'flex', gap: 8 }}><button className="button button-outline button-small" onClick={() => { setCardIndex((cardIndex - 1 + cards.length) % cards.length); setFlipped(false) }}>Previous</button><button className="button button-dark button-small" onClick={() => { setCardIndex((cardIndex + 1) % cards.length); setFlipped(false) }}>Next</button></div>
    </div>)}
  </section>
}
