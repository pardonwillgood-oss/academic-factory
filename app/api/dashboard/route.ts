import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { loadDashboard } from '@/lib/premium/dashboard'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return Response.json({ signedIn: false })
  try {
    const tz = new URL(request.url).searchParams.get('tz') ?? '+00:00'
    const data = await loadDashboard(session.user.id, tz)
    return Response.json({ signedIn: true, ...data })
  } catch (error) {
    console.error('Dashboard failed', error)
    return Response.json({ signedIn: true, error: true })
  }
}
