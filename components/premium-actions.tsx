'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeSmartSchedule, reviewConcept } from '@/app/actions/premium-planner'

export function CompleteBlockButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return <button className="button button-outline button-small" disabled={pending} onClick={() => start(async () => { await completeSmartSchedule(id); router.refresh() })}>{pending ? 'Saving…' : 'Done'}</button>
}

export function ReviewButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return <button className="button button-outline button-small" disabled={pending} onClick={() => start(async () => { await reviewConcept({ id, mastery: 0.8 }); router.refresh() })}>{pending ? 'Saving…' : 'Reviewed'}</button>
}
