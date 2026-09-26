import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { account, session, user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST() {
  const currentSession = await auth.api.getSession({ headers: await headers() })
  if (!currentSession?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.delete(account).where(eq(account.userId, currentSession.user.id))
  await db.delete(session).where(eq(session.userId, currentSession.user.id))
  await db.delete(user).where(eq(user.id, currentSession.user.id))
  return NextResponse.json({ success: true })
}
