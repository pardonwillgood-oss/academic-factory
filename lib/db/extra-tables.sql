CREATE TABLE IF NOT EXISTS study_exam (
  id text PRIMARY KEY,
  "userId" text NOT NULL,
  "planId" text,
  title text NOT NULL,
  "examDate" timestamp NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS study_exam_user_idx ON study_exam ("userId");
