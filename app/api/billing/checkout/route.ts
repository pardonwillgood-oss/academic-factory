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
  if (!stripeConfigured()) return Response.json({ error: 'Payments are not set up yet. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID in Vercel.' }, { status: 503 })
  try {
    await ensureExtraTables()
    const [existing] = await db.select().from(userPlan).where(eq(userPlan.userId, session.user.id)).limit(1)
    const base = appUrl(request)
    const params: Record<string, string> = {
      mode: 'subscription',
      'line_items[0][price]': process.env.STRIPE_PRICE_ID!,
      'line_items[0][quantity]': '1',
      client_reference_id: session.user.id,
      'subscription_data[metadata][userId]': session.user.id,
      success_url: `${base}/premium?upgraded=1`,
      cancel_url: `${base}/premium`,
    }
    if (existing?.stripeCustomerId) params.customer = existing.stripeCustomerId
    else if (session.user.email) params.customer_email = session.user.email
    const checkout = await stripePost('checkout/sessions', params)
    return Response.json({ url: checkout.url })
  } catch (error) {
    console.error('Checkout failed', error)
    return Response.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 })
  }
}
