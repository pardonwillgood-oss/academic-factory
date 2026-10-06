// offset is an ISO-8601 UTC offset such as "+05:30" or "-08:00" (the user's local timezone).
export type AvailabilityWindow = { date: string; start: string; end: string; offset?: string }
export type SchedulableTask = { id: string; planId?: string; title: string; minutes: number; priority: number; difficulty: number; mastery: number; dueAt?: string }
export type ScheduledBlock = { taskId: string; title: string; startsAt: Date; endsAt: Date; priority: number }

export const OFFSET_PATTERN = /^[+-]\d{2}:\d{2}$/

export function windowBounds(window: AvailabilityWindow) {
  const offset = window.offset && OFFSET_PATTERN.test(window.offset) ? window.offset : '+00:00'
  return {
    start: new Date(`${window.date}T${window.start}:00${offset}`),
    end: new Date(`${window.date}T${window.end}:00${offset}`),
  }
}

export function buildConflictFreeSchedule(tasks: SchedulableTask[], windows: AvailabilityWindow[], now = new Date()): ScheduledBlock[] {
  const ranked = [...tasks].sort((a, b) => {
    const urgency = (task: SchedulableTask) => task.dueAt ? 1 / Math.max(1, (new Date(task.dueAt).getTime() - now.getTime()) / 86400000) : 0
    const score = (task: SchedulableTask) => 0.35 * urgency(task) + 0.25 * task.difficulty + 0.25 * (1 - task.mastery) + 0.15 * task.priority
    return score(b) - score(a)
  })
  const blocks: ScheduledBlock[] = []
  const scheduled = new Set<string>()
  const orderedWindows = [...windows].sort((a, b) => windowBounds(a).start.getTime() - windowBounds(b).start.getTime())
  for (const window of orderedWindows) {
    const bounds = windowBounds(window)
    if (Number.isNaN(bounds.start.getTime()) || Number.isNaN(bounds.end.getTime())) continue
    let cursor = bounds.start
    for (const task of ranked) {
      if (scheduled.has(task.id)) continue
      const taskEnd = new Date(cursor.getTime() + task.minutes * 60000)
      if (taskEnd <= bounds.end) {
        blocks.push({ taskId: task.id, title: task.title, startsAt: new Date(cursor), endsAt: taskEnd, priority: task.priority })
        scheduled.add(task.id)
        cursor = new Date(taskEnd.getTime() + 5 * 60000)
      }
    }
  }
  return blocks.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
}

export function nextRevisionDate(reviewNumber: number, from = new Date()) {
  const days = [1, 3, 7, 14, 30][Math.min(Math.max(reviewNumber, 0), 4)]
  return new Date(from.getTime() + days * 86400000)
}
