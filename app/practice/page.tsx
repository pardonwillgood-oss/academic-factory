import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { desc, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { studyPlan } from '@/lib/db/schema'
import { getTier } from '@/lib/billing/tier'
import { QuizRunner } from '@/components/quiz-runner'
import { BillingButton } from '@/components/billing-button'

export const dynamic = 'force-dynamic'

export default async function PracticePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/login')
  const tier = await getTier(session.user.id)
  const [plan] = await db.select().from(studyPlan).where(eq(studyPlan.userId, session.user.id)).orderBy(desc(studyPlan.createdAt)).limit(1)
  return <main className="premium-shell"><header className="premium-header"><div><span className="eyebrow">PRACTICE</span><h1>Test what you actually know.</h1><p>Quizzes and flashcards built from your material. Scores feed your revision queue.</p></div><a className="auth-back" href="/">← Back to workspace</a></header>
    {!plan ? <section className="premium-card"><h2>No study path yet</h2><p>Build one on the home page first.</p></section>
      : !tier.isPro ? <section className="premium-card"><span className="card-label">PRO</span><h2>Practice is part of Pro</h2><p>Unlock quizzes, flashcards, mastery tracking and exam-date planning.</p><BillingButton isPro={false} hasCustomer={tier.hasCustomer} /></section>
      : <QuizRunner planId={plan.id} concepts={plan.plan as Array<{ title: string; cards?: Array<{ q: string; a: string }>; quiz?: Array<{ q: string; options: string[]; answer: number }> }>} />}
  </main>
}
