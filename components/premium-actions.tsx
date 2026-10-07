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
  const review = (mastery: number) => start(async () => { await reviewConcept({ id, mastery }); router.refresh() })
  return <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
    <button className="button button-outline button-small" disabled={pending} onClick={() => review(0.35)}>Need work</button>
    <button className="button button-outline button-small" disabled={pending} onClick={() => review(0.65)}>Okay</button>
    <button className="button button-outline button-small" disabled={pending} onClick={() => review(0.9)}>Got it</button>
  </span>
}
