import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'

export const FREE_PLAN_LIMIT = 2

export type Tier = { tier: 'free' | 'pro'; isPro: boolean }

// Online payments are intentionally disabled. Admins retain Pro access for testing.
export async function getTier(userId: string): Promise<Tier> {
  try {
    const [account] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId)).limit(1)
    const isPro = account?.role === 'admin'
    return { tier: isPro ? 'pro' : 'free', isPro }
  } catch (error) {
    console.error('getTier failed; treating user as free', error)
    return { tier: 'free', isPro: false }
  }
}
