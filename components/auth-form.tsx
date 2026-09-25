'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, Sparkles } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

export function AuthForm() {
  const router = useRouter()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const result = mode === 'sign-in'
      ? await authClient.signIn.email({ email, password })
      : await authClient.signUp.email({ name, email, password })
    setLoading(false)
    if (result.error) {
      setError('We could not complete that request. Check your details and try again.')
      return
    }
    router.push('/')
    router.refresh()
  }

  async function continueWithGoogle() {
    setError('')
    setLoading(true)
    const result = await authClient.signIn.social({ provider: 'google', callbackURL: '/' })
    if (result.error) {
      setLoading(false)
      setError('Google sign-in is not available right now. Please try email instead.')
    }
  }

  return <main className="auth-shell"><div className="auth-card"><a className="auth-back" href="/"><ArrowLeft size={15} /> Back to Academic Factory</a><div className="auth-brand"><span className="brand-mark"><Sparkles size={16} /></span><span>Academic <b>Factory</b></span></div><h1>{mode === 'sign-in' ? 'Welcome back.' : 'Create your workspace.'}</h1><p className="auth-lede">{mode === 'sign-in' ? 'Sign in to continue your academic journey.' : 'Start building a calmer, smarter study system.'}</p><button className="auth-google" type="button" onClick={continueWithGoogle} disabled={loading}>Continue with Google</button><div className="auth-divider"><span>or use email</span></div><form onSubmit={submit} className="auth-form">{mode === 'sign-up' && <label>Name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label>}<label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label>Password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="button button-dark auth-submit" disabled={loading}>{loading ? 'Please wait…' : mode === 'sign-in' ? 'Log in' : 'Create account'} <ArrowUpRight size={16} /></button></form><p className="auth-switch">{mode === 'sign-in' ? 'New to Academic Factory?' : 'Already have an account?'} <button type="button" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError('') }}>{mode === 'sign-in' ? 'Create an account' : 'Log in'}</button></p></div></main>
}
