import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { account, analyticsMilestones, revisionQueues, session, smartSchedules, studyPlan, user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST() {
  const currentSession = await auth.api.getSession({ headers: await headers() })
  if (!currentSession?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.delete(smartSchedules).where(eq(smartSchedules.userId, currentSession.user.id))
  await db.delete(revisionQueues).where(eq(revisionQueues.userId, currentSession.user.id))
  await db.delete(analyticsMilestones).where(eq(analyticsMilestones.userId, currentSession.user.id))
  await db.delete(studyPlan).where(eq(studyPlan.userId, currentSession.user.id))
  await db.delete(account).where(eq(account.userId, currentSession.user.id))
  await db.delete(session).where(eq(session.userId, currentSession.user.id))
  await db.delete(user).where(eq(user.id, currentSession.user.id))
  return NextResponse.json({ success: true })
}
