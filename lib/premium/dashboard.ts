import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { ensureExtraTables } from '@/lib/db/ensure'
import { analyticsMilestones, revisionQueues, smartSchedules, studyExam, studyPlan } from '@/lib/db/schema'
import { OFFSET_PATTERN } from '@/lib/premium/scheduler'

// All queries are scoped to userId. Pure read; never throws for missing optional tables.
export async function loadDashboard(userId: string, tzOffset: string) {
  const offset = OFFSET_PATTERN.test(tzOffset) ? tzOffset : '+00:00'
  const [h, m] = offset.slice(1).split(':').map(Number)
  const offsetMs = (offset.startsWith('-') ? -1 : 1) * (h * 60 + m) * 60000
  const now = new Date()
  const day = (d: Date) => new Date(d.getTime() + offsetMs).toISOString().slice(0, 10)
  const today = day(now)

  const [plan] = await db.select().from(studyPlan).where(eq(studyPlan.userId, userId)).orderBy(desc(studyPlan.createdAt)).limit(1)
  const schedule = await db.select().from(smartSchedules).where(eq(smartSchedules.userId, userId)).orderBy(asc(smartSchedules.startsAt)).limit(500)
  const revisions = await db.select().from(revisionQueues).where(eq(revisionQueues.userId, userId))
  const done = await db.select().from(analyticsMilestones).where(and(eq(analyticsMilestones.userId, userId), eq(analyticsMilestones.milestoneKey, 'block-completed'))).orderBy(desc(analyticsMilestones.achievedAt)).limit(400)

  const todayBlocks = schedule
    .filter((block) => day(block.startsAt) === today)
    .map((block) => ({ id: block.id, title: block.taskId ?? 'Study block', status: block.status, minutes: Math.round((block.endsAt.getTime() - block.startsAt.getTime()) / 60000), startsAt: block.startsAt.toISOString() }))

  const days = new Set(done.map((row) => day(row.achievedAt)))
  let streak = 0
  for (let i = days.has(today) ? 0 : 1; ; i++) {
    const d = day(new Date(now.getTime() - i * 86400000))
    if (!days.has(d)) break
    streak++
    if (streak > 400) break
  }

  const weekAgo = now.getTime() - 7 * 86400000
  const weekMinutes = done.filter((row) => row.achievedAt.getTime() >= weekAgo).reduce((sum, row) => sum + Number((row.metadata as { minutes?: number } | null)?.minutes ?? 25), 0)

  const titles = ((Array.isArray(plan?.plan) ? plan.plan : []) as Array<{ title?: string }>).map((c) => c?.title ?? '').filter(Boolean)
  const planBlocks = plan ? schedule.filter((b) => b.planId === plan.id) : []
  const planRevisions = plan ? revisions.filter((r) => r.planId === plan.id) : []
  const concepts = titles.slice(0, 8).map((title) => {
    const blocks = planBlocks.filter((b) => (b.taskId ?? '').startsWith(`${title} — `))
    const completedCount = blocks.filter((b) => b.status === 'completed').length
    const mastery = planRevisions.find((r) => r.conceptKey === title)?.mastery ?? 0
    return { title, progress: blocks.length ? Math.round((completedCount / blocks.length) * 100) : 0, mastery: Math.round(Number(mastery) * 100) }
  })

  let readiness: number | null = null
  if (plan && planBlocks.length) {
    const completion = planBlocks.filter((b) => b.status === 'completed').length / planBlocks.length
    const avgMastery = planRevisions.length ? planRevisions.reduce((sum, r) => sum + Number(r.mastery), 0) / planRevisions.length : 0
    readiness = Math.round(100 * (0.6 * completion + 0.4 * avgMastery))
  }

  let nextExam: { title: string; daysLeft: number } | null = null
  try {
    await ensureExtraTables()
    const exams = await db.select().from(studyExam).where(eq(studyExam.userId, userId)).orderBy(asc(studyExam.examDate))
    const upcoming = exams.find((e) => e.examDate > now)
    if (upcoming) nextExam = { title: upcoming.title, daysLeft: Math.max(0, Math.ceil((upcoming.examDate.getTime() - now.getTime()) / 86400000)) }
  } catch {}

  return { planId: plan?.id ?? null, planTitle: plan?.title ?? null, todayBlocks, streak, weekHours: Math.round((weekMinutes / 60) * 10) / 10, readiness, concepts, nextExam }
}
