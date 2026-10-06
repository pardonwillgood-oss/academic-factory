import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { ensureExtraTables } from '@/lib/db/ensure'
import { userPlan } from '@/lib/db/schema'
import { verifyStripeSignature } from '@/lib/billing/stripe'

export const runtime = 'nodejs'

async function upsert(userId: string, values: Partial<typeof userPlan.$inferInsert>) {
  await db.insert(userPlan).values({ userId, tier: 'free', ...values, updatedAt: new Date() }).onConflictDoUpdate({ target: userPlan.userId, set: { ...values, updatedAt: new Date() } })
}

function periodEnd(sub: any): Date | null {
  const seconds = sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end
  return seconds ? new Date(seconds * 1000) : null
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return new Response('Webhook secret not configured', { status: 503 })
  const raw = await request.text()
  if (!verifyStripeSignature(raw, request.headers.get('stripe-signature'), secret)) return new Response('Invalid signature', { status: 400 })

  try {
    await ensureExtraTables()
    const event = JSON.parse(raw)
    const object = event.data?.object ?? {}
    if (event.type === 'checkout.session.completed' && object.client_reference_id && object.mode === 'subscription') {
      await upsert(object.client_reference_id, { tier: 'pro', status: 'active', stripeCustomerId: object.customer ?? null, stripeSubscriptionId: object.subscription ?? null })
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const active = event.type !== 'customer.subscription.deleted' && ['active', 'trialing', 'past_due'].includes(object.status)
      const userId: string | undefined = object.metadata?.userId
      const values = { tier: active ? 'pro' : 'free', status: object.status ?? null, stripeSubscriptionId: object.id ?? null, stripeCustomerId: object.customer ?? null, currentPeriodEnd: periodEnd(object) }
      if (userId) await upsert(userId, values)
      else if (object.customer) await db.update(userPlan).set({ ...values, updatedAt: new Date() }).where(eq(userPlan.stripeCustomerId, object.customer))
    }
    return Response.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook failed', error)
    return new Response('Webhook handler failed', { status: 500 })
  }
}
