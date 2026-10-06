CREATE TABLE IF NOT EXISTS user_plan (
  "userId" text PRIMARY KEY,
  tier text NOT NULL DEFAULT 'free',
  "stripeCustomerId" text,
  "stripeSubscriptionId" text,
  status text,
  "currentPeriodEnd" timestamp,
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS study_exam (
  id text PRIMARY KEY,
  "userId" text NOT NULL,
  "planId" text,
  title text NOT NULL,
  "examDate" timestamp NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS study_exam_user_idx ON study_exam ("userId");
CREATE INDEX IF NOT EXISTS user_plan_customer_idx ON user_plan ("stripeCustomerId");
