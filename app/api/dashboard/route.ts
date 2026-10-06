import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getTier } from '@/lib/billing/tier'
import { loadDashboard } from '@/lib/premium/dashboard'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return Response.json({ signedIn: false })
  try {
    const tz = new URL(request.url).searchParams.get('tz') ?? '+00:00'
    const [data, tier] = await Promise.all([loadDashboard(session.user.id, tz), getTier(session.user.id)])
    return Response.json({ signedIn: true, tier: tier.tier, ...data })
  } catch (error) {
    console.error('Dashboard failed', error)
    return Response.json({ signedIn: true, error: true })
  }
}
