import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { desc } from 'drizzle-orm'
import { ArrowLeft, Users } from 'lucide-react'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'

export default async function UsersPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/login')
  const users = await db.select({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }).from(user).orderBy(desc(user.createdAt))
  return <main className="admin-shell"><div className="admin-header"><a className="auth-back" href="/"><ArrowLeft size={15} /> Back to site</a><a className="brand" href="/"><span className="brand-mark"><Users size={16} /></span><span>Academic <span>Factory</span></span></a></div><section className="admin-panel"><div className="eyebrow"><span className="eyebrow-dot" /> Account overview</div><h1>{users.length} {users.length === 1 ? 'student' : 'students'} registered.</h1><p>Every account created through Academic Factory, newest first.</p><div className="user-table"><div className="user-row user-row-head"><span>Name</span><span>Email</span><span>Joined</span></div>{users.map((entry) => <div className="user-row" key={entry.id}><strong>{entry.name}</strong><span>{entry.email}</span><span>{entry.createdAt.toLocaleDateString()}</span></div>)}</div></section></main>
}
