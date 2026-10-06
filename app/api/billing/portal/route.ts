import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ensureExtraTables } from '@/lib/db/ensure'
import { userPlan } from '@/lib/db/schema'
import { appUrl, stripeConfigured, stripePost } from '@/lib/billing/stripe'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return Response.json({ error: 'Please log in first.' }, { status: 401 })
  if (!stripeConfigured()) return Response.json({ error: 'Payments are not set up yet.' }, { status: 503 })
  try {
    await ensureExtraTables()
    const [row] = await db.select().from(userPlan).where(eq(userPlan.userId, session.user.id)).limit(1)
    if (!row?.stripeCustomerId) return Response.json({ error: 'No subscription found for this account.' }, { status: 404 })
    const portal = await stripePost('billing_portal/sessions', { customer: row.stripeCustomerId, return_url: `${appUrl(request)}/premium` })
    return Response.json({ url: portal.url })
  } catch (error) {
    console.error('Portal failed', error)
    return Response.json({ error: 'Could not open billing. Please try again.' }, { status: 500 })
  }
}
