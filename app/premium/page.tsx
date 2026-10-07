import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getPremiumDashboardData, listExams } from '@/app/actions/premium-planner'
import { db } from '@/lib/db'
import { studyPlan } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { ScheduleBuilder } from '@/components/schedule-builder'
import { CompleteBlockButton, ReviewButton } from '@/components/premium-actions'

export default async function PremiumPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/login')
  const [latest] = await db.select({ id: studyPlan.id, title: studyPlan.title }).from(studyPlan).where(eq(studyPlan.userId, session.user.id)).orderBy(desc(studyPlan.createdAt)).limit(1)
  const exams = await listExams()
  return <main className="premium-shell"><header className="premium-header"><div><span className="eyebrow">PREMIUM PLANNER</span><h1>Your intelligent study operating system.</h1><p>One calm view for today&apos;s blocks, revision pressure, and progress.</p></div><span className="premium-badge">STUDENT PLANNER</span><a className="auth-back" href="/#workspace">← Back to workspace</a><a className="button button-outline button-small" href="/practice">Practice</a></header><section className="premium-grid"><ScheduleBuilder planId={latest?.id ?? null} planTitle={latest?.title ?? null} exams={exams.map((e) => ({ id: e.id, title: e.title, examDate: e.examDate.toISOString() }))} /></section><Suspense fallback={<DashboardSkeleton />}><PremiumDashboard /></Suspense></main>
}

async function PremiumDashboard() {
  const data = await getPremiumDashboardData()
  const due = data.revisions.filter((item) => new Date(item.nextReviewAt) <= new Date()).length
  const completed = data.schedule.filter((item) => item.status === 'completed').length
  return <section className="premium-grid"><article className="premium-card premium-card-wide"><span className="card-label">UPCOMING TIME BLOCKS</span><h2>{data.schedule.length ? `${data.schedule.length} blocks planned` : 'No blocks yet'}</h2>{!data.schedule.length && <p>Generate a study plan on the home page, then choose “Plan my schedule”.</p>}<div className="premium-list">{data.schedule.slice(0, 12).map((block) => <div className="premium-row" key={block.id}><span className={`status-dot ${block.status}`} /><div><strong>{block.taskId ?? 'Study block'}</strong><small>{new Date(block.startsAt).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })} – {new Date(block.endsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></div>{block.status === 'completed' ? <b>completed</b> : <CompleteBlockButton id={block.id} />}</div>)}</div></article><article className="premium-card"><span className="card-label">REVISION QUEUE</span><h2>{due} due now</h2><p>Spaced reviews protect what you&apos;ve learned before the exam.</p><div className="metric-bar"><span style={{ width: `${Math.min(100, due * 12)}%` }} /></div><div className="premium-list">{data.revisions.slice(0, 6).map((item) => { const isDue = new Date(item.nextReviewAt) <= new Date(); return <div className="premium-row" key={item.id}><div><strong>{item.conceptKey}</strong><small>{isDue ? 'Due now' : `Next: ${new Date(item.nextReviewAt).toLocaleDateString()}`}</small></div>{isDue ? <ReviewButton id={item.id} /> : <b>scheduled</b>}</div> })}</div></article><article className="premium-card"><span className="card-label">MOMENTUM</span><h2>{completed} completed</h2><p>Keep stacking focused sessions. Your consistency compounds.</p><div className="milestone-list">{data.milestones.slice(0, 4).map((milestone) => <span key={milestone.id}>{milestone.milestoneKey}</span>)}</div></article></section>
}

function DashboardSkeleton() { return <section className="premium-grid"><div className="premium-card skeleton" /><div className="premium-card skeleton" /><div className="premium-card skeleton" /></section> }
