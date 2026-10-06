'use server'

import { and, asc, desc, eq, gte, lte } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { analyticsMilestones, revisionQueues, smartSchedules, studyExam, studyPlan } from '@/lib/db/schema'
import { ensureExtraTables } from '@/lib/db/ensure'
import { getTier } from '@/lib/billing/tier'
import { buildConflictFreeSchedule, nextRevisionDate, OFFSET_PATTERN, windowBounds, type AvailabilityWindow, type SchedulableTask } from '@/lib/premium/scheduler'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

async function assertOwnsPlan(userId: string, planId?: string | null) {
  if (!planId) return
  const [owned] = await db.select({ id: studyPlan.id }).from(studyPlan).where(and(eq(studyPlan.id, planId), eq(studyPlan.userId, userId))).limit(1)
  if (!owned) throw new Error('Study plan not found')
}

export type ScheduleInput = { planId?: string; taskId?: string; startsAt: Date; endsAt: Date; priority: number }

export async function generateSmartSchedule(input: { planId?: string; tasks: SchedulableTask[]; windows: AvailabilityWindow[] }) {
  const userId = await getUserId()
  await assertOwnsPlan(userId, input.planId)
  const blocks = buildConflictFreeSchedule(input.tasks, input.windows)
  if (blocks.length) await db.insert(smartSchedules).values(blocks.map((block) => ({ id: crypto.randomUUID(), userId, planId: input.planId ?? null, taskId: block.taskId, startsAt: block.startsAt, endsAt: block.endsAt, priority: block.priority, status: 'planned' })))
  revalidatePath('/premium')
  return blocks
}

export async function createSmartSchedule(input: ScheduleInput) {
  const userId = await getUserId()
  await assertOwnsPlan(userId, input.planId)
  const row = { id: crypto.randomUUID(), userId, planId: input.planId ?? null, taskId: input.taskId ?? null, startsAt: input.startsAt, endsAt: input.endsAt, priority: input.priority, status: 'planned' }
  await db.insert(smartSchedules).values(row)
  revalidatePath('/premium')
  return row
}

export async function getSmartSchedule(from: Date, to: Date) {
  const userId = await getUserId()
  return db.select().from(smartSchedules).where(and(eq(smartSchedules.userId, userId), gte(smartSchedules.startsAt, from), lte(smartSchedules.endsAt, to))).orderBy(asc(smartSchedules.startsAt))
}

export async function completeSmartSchedule(id: string) {
  const userId = await getUserId()
  const updated = await db.update(smartSchedules).set({ status: 'completed' }).where(and(eq(smartSchedules.id, id), eq(smartSchedules.userId, userId), eq(smartSchedules.status, 'planned'))).returning({ planId: smartSchedules.planId })
  if (updated.length) {
    const [block] = await db.select().from(smartSchedules).where(and(eq(smartSchedules.id, id), eq(smartSchedules.userId, userId))).limit(1)
    const minutes = block ? Math.max(1, Math.round((block.endsAt.getTime() - block.startsAt.getTime()) / 60000)) : 25
    await db.insert(analyticsMilestones).values({ id: crypto.randomUUID(), userId, planId: updated[0].planId, milestoneKey: 'block-completed', value: 1, metadata: { minutes } })
  }
  revalidatePath('/premium')
}

export async function reviewConcept(input: { id: string; mastery: number }) {
  const userId = await getUserId()
  const mastery = Math.min(1, Math.max(0, input.mastery))
  const [current] = await db.select().from(revisionQueues).where(and(eq(revisionQueues.id, input.id), eq(revisionQueues.userId, userId))).limit(1)
  if (!current) throw new Error('Revision item not found')
  const intervals = [1, 3, 7, 14, 30]
  const reviewNumber = Number(current.reviewNumber) + 1
  const interval = intervals[Math.min(reviewNumber - 1, intervals.length - 1)]
  const nextReviewAt = new Date(Date.now() + interval * 86400000)
  await db.update(revisionQueues).set({ mastery, reviewNumber, nextReviewAt, lastReviewedAt: new Date(), updatedAt: new Date() }).where(and(eq(revisionQueues.id, input.id), eq(revisionQueues.userId, userId)))
  revalidatePath('/premium')
  return { nextReviewAt, interval }
}

export async function getRevisionQueue() {
  const userId = await getUserId()
  return db.select().from(revisionQueues).where(and(eq(revisionQueues.userId, userId), lte(revisionQueues.nextReviewAt, new Date()))).orderBy(asc(revisionQueues.nextReviewAt))
}

export async function recordMilestone(input: { planId?: string; milestoneKey: string; value: number; metadata?: Record<string, unknown> }) {
  const userId = await getUserId()
  const row = { id: crypto.randomUUID(), userId, planId: input.planId ?? null, milestoneKey: input.milestoneKey, value: input.value, metadata: input.metadata ?? null }
  await db.insert(analyticsMilestones).values(row)
  revalidatePath('/premium')
  return row
}

export async function getPremiumDashboardData() {
  const userId = await getUserId()
  const [schedule, revisions, milestones] = await Promise.all([
    db.select().from(smartSchedules).where(eq(smartSchedules.userId, userId)).orderBy(asc(smartSchedules.startsAt)).limit(50),
    db.select().from(revisionQueues).where(eq(revisionQueues.userId, userId)).orderBy(asc(revisionQueues.nextReviewAt)).limit(20),
    db.select().from(analyticsMilestones).where(eq(analyticsMilestones.userId, userId)).orderBy(desc(analyticsMilestones.achievedAt)).limit(20),
  ])
  return { schedule, revisions, milestones }
}

export async function deletePremiumData() {
  const userId = await getUserId()
  await db.delete(smartSchedules).where(eq(smartSchedules.userId, userId))
  await db.delete(revisionQueues).where(eq(revisionQueues.userId, userId))
  await db.delete(analyticsMilestones).where(eq(analyticsMilestones.userId, userId))
  revalidatePath('/premium')
}

const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(value))
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}
const pad = (n: number) => String(n).padStart(2, '0')

// Turns a saved study plan into time blocks + a spaced-revision queue. Everything is scoped to the signed-in user.
// Free: 7-day Learn+Practice schedule. Pro: works backwards from your nearest exam, adds Revise blocks and a feasibility check.
export async function schedulePlanFromStudyPlan(input: { planId: string; tzOffset: string; startHour?: number; endHour?: number }) {
  const userId = await getUserId()
  if (!OFFSET_PATTERN.test(input.tzOffset)) throw new Error('Invalid timezone offset')
  const [plan] = await db.select().from(studyPlan).where(and(eq(studyPlan.id, input.planId), eq(studyPlan.userId, userId))).limit(1)
  if (!plan) throw new Error('Study plan not found')
  const tier = await getTier(userId)

  const startHour = clampInt(input.startHour, 5, 22, 17)
  const endHour = clampInt(input.endHour, startHour + 1, 23, Math.min(23, startHour + 3))

  const concepts = (Array.isArray(plan.plan) ? plan.plan : []) as Array<{ title?: string }>
  const titles = concepts.map((concept, index) => (concept?.title ?? `Concept ${index + 1}`).trim() || `Concept ${index + 1}`)

  const existingRevisions = await db.select().from(revisionQueues).where(and(eq(revisionQueues.userId, userId), eq(revisionQueues.planId, plan.id)))
  const masteryByKey = new Map(existingRevisions.map((row) => [row.conceptKey, Number(row.mastery)]))
  const completed = await db.select({ taskId: smartSchedules.taskId }).from(smartSchedules).where(and(eq(smartSchedules.userId, userId), eq(smartSchedules.planId, plan.id), eq(smartSchedules.status, 'completed')))
  const completedIds = new Set(completed.map((row) => row.taskId))

  const now = new Date()
  let exam: { title: string; examDate: Date } | null = null
  if (tier.isPro) {
    try {
      await ensureExtraTables()
      const exams = await db.select().from(studyExam).where(eq(studyExam.userId, userId)).orderBy(asc(studyExam.examDate))
      exam = exams.find((row) => row.examDate > now && (!row.planId || row.planId === plan.id)) ?? null
    } catch (error) {
      console.error('Could not load exams', error)
    }
  }
  const horizonDays = exam ? Math.min(45, Math.max(1, Math.ceil((exam.examDate.getTime() - now.getTime()) / 86400000))) : 7
  const dueAt = exam?.examDate.toISOString()

  const tasks: SchedulableTask[] = []
  titles.forEach((title, index) => {
    const priority = titles.length > 1 ? 1 - index / titles.length : 1
    const mastery = masteryByKey.get(title) ?? 0
    const stages: Array<[string, number]> = [['Learn', 30], ['Practice', 25]]
    if (tier.isPro) stages.push(['Revise', 15])
    for (const [stage, minutes] of stages) {
      const id = `${title} — ${stage}`
      if (!completedIds.has(id)) tasks.push({ id, planId: plan.id, title: id, minutes, priority, difficulty: 0.5, mastery, dueAt })
    }
  })

  const sign = input.tzOffset.startsWith('-') ? -1 : 1
  const [offH, offM] = input.tzOffset.slice(1).split(':').map(Number)
  const offsetMs = sign * (offH * 60 + offM) * 60000
  const localNow = new Date(now.getTime() + offsetMs)
  const nowMinutes = localNow.getUTCHours() * 60 + localNow.getUTCMinutes()
  const windows: AvailabilityWindow[] = []
  for (let i = 0; i <= horizonDays; i++) {
    const date = new Date(now.getTime() + offsetMs + i * 86400000).toISOString().slice(0, 10)
    let startMinutes = startHour * 60
    if (i === 0) startMinutes = Math.max(startMinutes, Math.ceil((nowMinutes + 5) / 5) * 5)
    if (startMinutes >= endHour * 60) continue
    const window = { date, start: `${pad(Math.floor(startMinutes / 60))}:${pad(startMinutes % 60)}`, end: `${pad(endHour)}:00`, offset: input.tzOffset }
    const end = windowBounds(window).end
    if (end <= now || (exam && end >= exam.examDate)) continue
    windows.push(window)
  }

  const blocks = buildConflictFreeSchedule(tasks, windows, now)
  const totalMinutes = tasks.reduce((sum, task) => sum + task.minutes, 0)
  const availableMinutes = windows.reduce((sum, window) => { const b = windowBounds(window); return sum + Math.max(0, (b.end.getTime() - b.start.getTime()) / 60000) }, 0)

  // Replace this plan's unfinished blocks so scheduling twice (or after missing days) re-balances instead of duplicating.
  await db.delete(smartSchedules).where(and(eq(smartSchedules.userId, userId), eq(smartSchedules.planId, plan.id), eq(smartSchedules.status, 'planned')))
  if (blocks.length) {
    await db.insert(smartSchedules).values(blocks.map((block) => ({ id: crypto.randomUUID(), userId, planId: plan.id, taskId: block.taskId, startsAt: block.startsAt, endsAt: block.endsAt, priority: block.priority, status: 'planned' })))
  }

  const known = new Set(existingRevisions.map((row) => row.conceptKey))
  const newRevisions = [...new Set(titles)].filter((title) => !known.has(title))
  if (newRevisions.length) {
    await db.insert(revisionQueues).values(newRevisions.map((title) => ({ id: crypto.randomUUID(), userId, planId: plan.id, conceptKey: title, mastery: 0, reviewNumber: 0, nextReviewAt: nextRevisionDate(0, now) })))
  }

  await db.insert(analyticsMilestones).values({ id: crypto.randomUUID(), userId, planId: plan.id, milestoneKey: 'plan-scheduled', value: blocks.length, metadata: { tasks: tasks.length } })
  revalidatePath('/premium')
  const daysUsed = Math.max(1, windows.length)
  return {
    scheduled: blocks.length,
    total: tasks.length,
    revisions: newRevisions.length,
    fits: blocks.length === tasks.length,
    totalMinutes,
    availableMinutes: Math.round(availableMinutes),
    neededMinutesPerDay: Math.ceil(totalMinutes / daysUsed),
    examTitle: exam?.title ?? null,
    daysToExam: exam ? Math.ceil((exam.examDate.getTime() - now.getTime()) / 86400000) : null,
    isPro: tier.isPro,
  }
}

type Result<T = Record<string, never>> = ({ ok: true } & T) | { ok: false; error: string }

export async function addExam(input: { title: string; date: string; planId?: string }): Promise<Result> {
  const userId = await getUserId()
  const tier = await getTier(userId)
  if (!tier.isPro) return { ok: false, error: 'Exam-date planning is a Pro feature.' }
  const title = input.title.trim().slice(0, 80)
  if (!title) return { ok: false, error: 'Enter an exam name.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, error: 'Choose a valid date.' }
  const examDate = new Date(`${input.date}T00:00:00Z`)
  if (Number.isNaN(examDate.getTime()) || examDate.getTime() < Date.now()) return { ok: false, error: 'Choose a date in the future.' }
  await assertOwnsPlan(userId, input.planId)
  await ensureExtraTables()
  await db.insert(studyExam).values({ id: crypto.randomUUID(), userId, planId: input.planId ?? null, title, examDate })
  revalidatePath('/premium')
  return { ok: true }
}

export async function deleteExam(id: string) {
  const userId = await getUserId()
  await ensureExtraTables()
  await db.delete(studyExam).where(and(eq(studyExam.id, id), eq(studyExam.userId, userId)))
  revalidatePath('/premium')
}

export async function listExams() {
  const userId = await getUserId()
  try {
    await ensureExtraTables()
    return await db.select().from(studyExam).where(eq(studyExam.userId, userId)).orderBy(asc(studyExam.examDate))
  } catch (error) {
    console.error('listExams failed', error)
    return []
  }
}

// Quiz results feed the same mastery + spaced-repetition queue used by revision.
export async function submitQuizResult(input: { planId: string; results: Array<{ concept: string; correct: number; total: number }> }): Promise<Result<{ percent: number }>> {
  const userId = await getUserId()
  const tier = await getTier(userId)
  if (!tier.isPro) return { ok: false, error: 'Practice quizzes are a Pro feature.' }
  await assertOwnsPlan(userId, input.planId)
  let correctSum = 0
  let totalSum = 0
  for (const result of input.results.slice(0, 40)) {
    const total = clampInt(result.total, 1, 50, 1)
    const correct = clampInt(result.correct, 0, total, 0)
    correctSum += correct
    totalSum += total
    const score = correct / total
    const [row] = await db.select().from(revisionQueues).where(and(eq(revisionQueues.userId, userId), eq(revisionQueues.planId, input.planId), eq(revisionQueues.conceptKey, result.concept))).limit(1)
    const now = new Date()
    if (row) {
      const mastery = Math.round((0.5 * Number(row.mastery) + 0.5 * score) * 100) / 100
      const reviewNumber = score >= 0.7 ? Number(row.reviewNumber) + 1 : Number(row.reviewNumber)
      const nextReviewAt = score >= 0.7 ? nextRevisionDate(reviewNumber - 1, now) : new Date(now.getTime() + 86400000)
      await db.update(revisionQueues).set({ mastery, reviewNumber, nextReviewAt, lastReviewedAt: now, updatedAt: now }).where(and(eq(revisionQueues.id, row.id), eq(revisionQueues.userId, userId)))
    } else {
      await db.insert(revisionQueues).values({ id: crypto.randomUUID(), userId, planId: input.planId, conceptKey: result.concept.slice(0, 120), mastery: score, reviewNumber: score >= 0.7 ? 1 : 0, nextReviewAt: score >= 0.7 ? nextRevisionDate(0, now) : new Date(now.getTime() + 86400000), lastReviewedAt: now })
    }
  }
  const percent = totalSum ? Math.round((correctSum / totalSum) * 100) : 0
  await db.insert(analyticsMilestones).values({ id: crypto.randomUUID(), userId, planId: input.planId, milestoneKey: 'quiz-completed', value: percent, metadata: { correct: correctSum, total: totalSum } })
  revalidatePath('/premium')
  return { ok: true, percent }
}
