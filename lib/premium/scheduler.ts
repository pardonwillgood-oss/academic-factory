// Adaptive scheduler for student study plans.
// Tasks are ranked by urgency, weakness, priority, and whether they are overdue.
// Windows are local-time availability windows represented with an explicit UTC offset.

export type AvailabilityWindow = { date: string; start: string; end: string; offset?: string }
export type SchedulableTask = {
  id: string
  planId?: string
  title: string
  minutes: number
  priority: number
  difficulty: number
  mastery: number
  dueAt?: string
  stage?: 'learn' | 'practice' | 'revise'
}
export type ScheduledBlock = { taskId: string; title: string; startsAt: Date; endsAt: Date; priority: number }

export const OFFSET_PATTERN = /^[+-]\d{2}:\d{2}$/

export function windowBounds(window: AvailabilityWindow) {
  const offset = window.offset && OFFSET_PATTERN.test(window.offset) ? window.offset : '+00:00'
  return {
    start: new Date(`${window.date}T${window.start}:00${offset}`),
    end: new Date(`${window.date}T${window.end}:00${offset}`),
  }
}

function taskScore(task: SchedulableTask, now: Date) {
  const mastery = Math.min(1, Math.max(0, task.mastery))
  const weakness = 1 - mastery
  const difficulty = Math.min(1, Math.max(0, task.difficulty))
  const priority = Math.min(1, Math.max(0, task.priority))
  let urgency = 0

  if (task.dueAt) {
    const due = new Date(task.dueAt).getTime()
    if (Number.isFinite(due)) {
      const days = (due - now.getTime()) / 86400000
      urgency = days <= 0 ? 1 : Math.min(1, 1 / Math.max(1, days / 2))
    }
  }

  const stageBonus = task.stage === 'revise' ? 0.05 : task.stage === 'practice' ? 0.03 : 0
  return 0.38 * urgency + 0.30 * weakness + 0.17 * difficulty + 0.10 * priority + stageBonus
}

export function buildConflictFreeSchedule(tasks: SchedulableTask[], windows: AvailabilityWindow[], now = new Date()): ScheduledBlock[] {
  const ranked = [...tasks]
    .filter((task) => Number.isFinite(task.minutes) && task.minutes > 0)
    .sort((a, b) => taskScore(b, now) - taskScore(a, now))

  const blocks: ScheduledBlock[] = []
  const scheduled = new Set<string>()
  const orderedWindows = [...windows].sort((a, b) => windowBounds(a).start.getTime() - windowBounds(b).start.getTime())

  for (const window of orderedWindows) {
    const bounds = windowBounds(window)
    if (Number.isNaN(bounds.start.getTime()) || Number.isNaN(bounds.end.getTime()) || bounds.end <= bounds.start) continue

    let cursor = new Date(Math.max(bounds.start.getTime(), now.getTime()))
    for (const task of ranked) {
      if (scheduled.has(task.id)) continue
      const taskEnd = new Date(cursor.getTime() + task.minutes * 60000)
      if (taskEnd > bounds.end) continue

      blocks.push({ taskId: task.id, title: task.title, startsAt: new Date(cursor), endsAt: taskEnd, priority: task.priority })
      scheduled.add(task.id)
      cursor = new Date(taskEnd.getTime() + 5 * 60000)
      if (cursor >= bounds.end) break
    }
  }

  return blocks.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
}

export function nextRevisionDate(reviewNumber: number, from = new Date(), mastery = 0) {
  const intervals = [1, 3, 7, 14, 30]
  const index = Math.min(Math.max(reviewNumber, 0), intervals.length - 1)
  const baseDays = intervals[index]
  const days = mastery < 0.4 ? 1 : mastery < 0.7 ? Math.min(baseDays, 3) : baseDays
  return new Date(from.getTime() + days * 86400000)
}
