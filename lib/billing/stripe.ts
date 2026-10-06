import { createHmac, timingSafeEqual } from 'node:crypto'

export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID)

export function appUrl(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : new URL(request.url).origin)
}

export async function stripePost(path: string, params: Record<string, string>) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  })
  const json = await response.json()
  if (!response.ok) throw new Error(json?.error?.message ?? `Stripe error ${response.status}`)
  return json
}

// Verifies the `Stripe-Signature` header (t=...,v1=...) against the raw body.
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, toleranceSeconds = 300) {
  if (!header) return false
  const parts = Object.fromEntries(header.split(',').map((p) => { const i = p.indexOf('='); return [p.slice(0, i), p.slice(i + 1)] }))
  const timestamp = Number(parts.t)
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false
  const expected = createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest('hex')
  const signatures = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3))
  return signatures.some((sig) => sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
}
