export type AvailabilityWindow = { date: string; start: string; end: string }
export type SchedulableTask = { id: string; planId?: string; title: string; minutes: number; priority: number; difficulty: number; mastery: number; dueAt?: string }
export type ScheduledBlock = { taskId: string; title: string; startsAt: Date; endsAt: Date; priority: number }

function toDate(date: string, time: string) { return new Date(`${date}T${time}:00`) }

export function buildConflictFreeSchedule(tasks: SchedulableTask[], windows: AvailabilityWindow[], now = new Date()): ScheduledBlock[] {
  const ranked = [...tasks].sort((a, b) => {
    const urgency = (task: SchedulableTask) => task.dueAt ? 1 / Math.max(1, (new Date(task.dueAt).getTime() - now.getTime()) / 86400000) : 0
    const score = (task: SchedulableTask) => 0.35 * urgency(task) + 0.25 * task.difficulty + 0.25 * (1 - task.mastery) + 0.15 * task.priority
    return score(b) - score(a)
  })
  const blocks: ScheduledBlock[] = []
  for (const window of windows) {
    let cursor = toDate(window.date, window.start)
    const end = toDate(window.date, window.end)
    for (const task of ranked) {
      if (blocks.some((block) => block.taskId === task.id)) continue
      const taskEnd = new Date(cursor.getTime() + task.minutes * 60000)
      if (taskEnd <= end) {
        blocks.push({ taskId: task.id, title: task.title, startsAt: new Date(cursor), endsAt: taskEnd, priority: task.priority })
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
