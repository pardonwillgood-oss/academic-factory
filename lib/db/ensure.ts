import { pool } from '@/lib/db'

let ready: Promise<void> | null = null

// Creates ONLY the two additive tables, and only if they do not exist. Never touches existing tables.
export function ensureExtraTables() {
  if (!ready) {
    ready = (async () => {
      await pool.query(`CREATE TABLE IF NOT EXISTS user_plan (
        "userId" text PRIMARY KEY,
        tier text NOT NULL DEFAULT 'free',
        "stripeCustomerId" text,
        "stripeSubscriptionId" text,
        status text,
        "currentPeriodEnd" timestamp,
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )`)
      await pool.query(`CREATE TABLE IF NOT EXISTS study_exam (
        id text PRIMARY KEY,
        "userId" text NOT NULL,
        "planId" text,
        title text NOT NULL,
        "examDate" timestamp NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now()
      )`)
      await pool.query(`CREATE INDEX IF NOT EXISTS study_exam_user_idx ON study_exam ("userId")`)    })().catch((error) => {
      ready = null
      throw error
    })
  }
  return ready
}
