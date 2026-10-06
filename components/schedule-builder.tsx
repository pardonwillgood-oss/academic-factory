'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addExam, deleteExam, schedulePlanFromStudyPlan } from '@/app/actions/premium-planner'

type Exam = { id: string; title: string; examDate: string }
type Summary = Awaited<ReturnType<typeof schedulePlanFromStudyPlan>>

function tzOffset() {
  const minutes = -new Date().getTimezoneOffset()
  const abs = Math.abs(minutes)
  return `${minutes < 0 ? '-' : '+'}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
}

export function ScheduleBuilder({ planId, planTitle, isPro, exams }: { planId: string | null; planTitle: string | null; isPro: boolean; exams: Exam[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [startHour, setStartHour] = useState(17)
  const [endHour, setEndHour] = useState(20)
  const [examTitle, setExamTitle] = useState('')
  const [examDate, setExamDate] = useState('')
  const [message, setMessage] = useState('')
  const [summary, setSummary] = useState<Summary | null>(null)

  if (!planId) return <article className="premium-card premium-card-wide"><span className="card-label">SCHEDULE BUILDER</span><h2>No study path yet</h2><p>Build a study path on the home page first, then come back to schedule it.</p><a className="button button-dark button-small" href="/#workspace">Go to workspace</a></article>

  const build = () => start(async () => {
    setMessage('')
    try {
      setSummary(await schedulePlanFromStudyPlan({ planId, tzOffset: tzOffset(), startHour, endHour }))
      router.refresh()
    } catch (error) {
      console.error(error)
      setMessage('We could not build the schedule. Please try again.')
    }
  })

  const saveExam = () => start(async () => {
    const result = await addExam({ title: examTitle, date: examDate, planId })
    if (!result.ok) return setMessage(result.error)
    setExamTitle(''); setExamDate(''); setMessage('Exam saved. Rebuild your schedule to plan around it.')
    router.refresh()
  })

  const hours = Array.from({ length: 18 }, (_, i) => i + 5)
  return <article className="premium-card premium-card-wide" id="builder">
    <span className="card-label">SCHEDULE BUILDER</span>
    <h2>{planTitle ?? 'Your study path'}</h2>
    <p>Pick the hours you can study each day. {isPro ? 'Blocks are planned backwards from your nearest exam.' : 'Free plans get a 7-day schedule. Pro plans around your exam date.'}</p>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', margin: '12px 0' }}>
      <label>From <select value={startHour} onChange={(e) => { const v = Number(e.target.value); setStartHour(v); if (endHour <= v) setEndHour(Math.min(23, v + 1)) }}>{hours.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}</select></label>
      <label>To <select value={endHour} onChange={(e) => setEndHour(Number(e.target.value))}>{hours.filter((h) => h > startHour).concat(23).filter((h, i, a) => a.indexOf(h) === i).map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}</select></label>
      <button className="button button-dark button-small" disabled={pending} onClick={build}>{pending ? 'Building…' : 'Build my schedule'}</button>
    </div>
    {summary && <p role="status"><b>{summary.scheduled} of {summary.total} blocks scheduled.</b> {summary.fits ? (summary.examTitle ? `You are on track for ${summary.examTitle}${summary.daysToExam !== null ? ` (${summary.daysToExam} days)` : ''}.` : 'Everything fits.') : `Not everything fits: you need about ${summary.neededMinutesPerDay} min/day but have ${(endHour - startHour) * 60} min/day. Add study hours or move your exam.`}</p>}
    <div style={{ marginTop: 16 }}>
      <span className="card-label">EXAMS {isPro ? '' : '· PRO'}</span>
      {isPro ? <>
        {exams.map((exam) => <div className="premium-row" key={exam.id}><div><strong>{exam.title}</strong><small>{new Date(exam.examDate).toLocaleDateString()}</small></div><button className="button button-outline button-small" onClick={() => start(async () => { await deleteExam(exam.id); router.refresh() })}>Remove</button></div>)}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <input className="settings-input" placeholder="Exam name" value={examTitle} maxLength={80} onChange={(e) => setExamTitle(e.target.value)} />
          <input className="settings-input" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          <button className="button button-outline button-small" disabled={pending || !examTitle || !examDate} onClick={saveExam}>Add exam</button>
        </div>
      </> : <p>Upgrade to Pro to add exam dates, get revision blocks and a feasibility check.</p>}
    </div>
    {message && <p role="alert">{message}</p>}
  </article>
}
