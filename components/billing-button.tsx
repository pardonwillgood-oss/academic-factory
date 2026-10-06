'use client'

import { useState } from 'react'

export function BillingButton({ isPro, hasCustomer, label }: { isPro: boolean; hasCustomer: boolean; label?: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function go() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch(isPro && hasCustomer ? '/api/billing/portal' : '/api/billing/checkout', { method: 'POST' })
      const data = await response.json()
      if (data.url) window.location.href = data.url
      else setError(data.error ?? 'Something went wrong.')
    } catch {
      setError('Network problem. Please try again.')
    }
    setBusy(false)
  }
  if (isPro && !hasCustomer) return null
  return <span><button className="button button-dark button-small" onClick={go} disabled={busy}>{busy ? 'Opening…' : label ?? (isPro ? 'Manage billing' : 'Upgrade to Pro')}</button>{error && <small role="alert" style={{ display: 'block', color: 'var(--coral)' }}>{error}</small>}</span>
}
