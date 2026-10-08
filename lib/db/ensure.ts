import { pool } from '@/lib/db'

let ready: Promise<void> | null = null

// Creates the additive study-exam table if needed, without modifying existing tables.
export function ensureExtraTables() {
  if (!ready) {
    ready = (async () => {
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
