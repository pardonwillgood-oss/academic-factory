import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { ensureExtraTables } from '@/lib/db/ensure'
import { user, userPlan } from '@/lib/db/schema'

export const FREE_PLAN_LIMIT = 2

export type Tier = { tier: 'free' | 'pro'; isPro: boolean; status: string | null; currentPeriodEnd: Date | null; hasCustomer: boolean }

// Never throws: if billing tables are unavailable the user is simply treated as free.
export async function getTier(userId: string): Promise<Tier> {
  const free: Tier = { tier: 'free', isPro: false, status: null, currentPeriodEnd: null, hasCustomer: false }
  try {
    const [account] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId)).limit(1)
    await ensureExtraTables()
    const [row] = await db.select().from(userPlan).where(eq(userPlan.userId, userId)).limit(1)
    const active = row && row.tier === 'pro' && (!row.currentPeriodEnd || row.currentPeriodEnd > new Date()) && row.status !== 'canceled'
    const isPro = account?.role === 'admin' || Boolean(active)
    return { tier: isPro ? 'pro' : 'free', isPro, status: row?.status ?? null, currentPeriodEnd: row?.currentPeriodEnd ?? null, hasCustomer: Boolean(row?.stripeCustomerId) }
  } catch (error) {
    console.error('getTier failed; treating user as free', error)
    return free
  }
}
