import { boolean, jsonb, pgTable, real, text, timestamp } from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull(),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const studyPlan = pgTable('study_plan', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  estimatedHours: real('estimatedHours').notNull(),
  materialName: text('materialName'),
  plan: jsonb('plan').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const smartSchedules = pgTable('smart_schedules', {
  id: text('id').primaryKey(), userId: text('userId').notNull(), planId: text('planId'), taskId: text('taskId'),
  startsAt: timestamp('startsAt').notNull(), endsAt: timestamp('endsAt').notNull(), status: text('status').notNull().default('planned'), priority: real('priority').notNull().default(0), createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const revisionQueues = pgTable('revision_queues', {
  id: text('id').primaryKey(), userId: text('userId').notNull(), planId: text('planId'), conceptKey: text('conceptKey').notNull(), mastery: real('mastery').notNull().default(0), reviewNumber: real('reviewNumber').notNull().default(0), nextReviewAt: timestamp('nextReviewAt').notNull(), lastReviewedAt: timestamp('lastReviewedAt'), createdAt: timestamp('createdAt').notNull().defaultNow(), updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const analyticsMilestones = pgTable('analytics_milestones', {
  id: text('id').primaryKey(), userId: text('userId').notNull(), planId: text('planId'), milestoneKey: text('milestoneKey').notNull(), value: real('value').notNull().default(0), metadata: jsonb('metadata'), achievedAt: timestamp('achievedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})
