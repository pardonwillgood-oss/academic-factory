'use server'

import { and, asc, desc, eq, gte, lte } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { analyticsMilestones, revisionQueues, smartSchedules } from '@/lib/db/schema'
import { buildConflictFreeSchedule, type AvailabilityWindow, type SchedulableTask } from '@/lib/premium/scheduler'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export type ScheduleInput = { planId?: string; taskId?: string; startsAt: Date; endsAt: Date; priority: number }

export async function generateSmartSchedule(input: { planId?: string; tasks: SchedulableTask[]; windows: AvailabilityWindow[] }) {
  const userId = await getUserId()
  const blocks = buildConflictFreeSchedule(input.tasks, input.windows)
  if (blocks.length) await db.insert(smartSchedules).values(blocks.map((block) => ({ id: crypto.randomUUID(), userId, planId: input.planId ?? null, taskId: block.taskId, startsAt: block.startsAt, endsAt: block.endsAt, priority: block.priority, status: 'planned' })))
  revalidatePath('/premium')
  return blocks
}

export async function createSmartSchedule(input: ScheduleInput) {
  const userId = await getUserId()
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
  await db.update(smartSchedules).set({ status: 'completed' }).where(and(eq(smartSchedules.id, id), eq(smartSchedules.userId, userId)))
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
