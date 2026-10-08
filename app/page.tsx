'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { completeSmartSchedule, schedulePlanFromStudyPlan } from '@/app/actions/premium-planner'
import {
  ArrowUpRight,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  FileText,
  Flame,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Play,
  Plus,
  Settings,
  Sparkles,
  Target,
  Trophy,
  Upload,
  X,
  Zap,
} from 'lucide-react'

const navItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'My learning', icon: BookOpen },
  { label: 'Practice', icon: Brain },
  { label: 'Projects', icon: FileText },
  { label: 'Analytics', icon: Target },
]

const subjects = [
  { name: 'Mathematics', code: 'MATH', progress: 78, tone: 'lavender', next: 'Integration & calculus' },
  { name: 'Physics', code: 'PHYS', progress: 64, tone: 'mint', next: 'Electromagnetic induction' },
  { name: 'Chemistry', code: 'CHEM', progress: 52, tone: 'peach', next: 'Organic reactions' },
]

function tzString() {
  const minutes = -new Date().getTimezoneOffset()
  const abs = Math.abs(minutes)
  return `${minutes < 0 ? '-' : '+'}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
}

type DashboardData = { signedIn?: boolean; error?: boolean; tier?: string; streak: number; weekHours: number; readiness: number | null; todayBlocks: Array<{ id: string; title: string; status: string; minutes: number; startsAt: string }>; concepts: Array<{ title: string; progress: number; mastery: number }>; nextExam: { title: string; daysLeft: number } | null }

const fetcher = (url: string) => fetch(url).then((response) => (response.ok ? response.json() : { plans: [] })).catch(() => ({ plans: [] }))

const plan = [
  { title: 'Revise integration', subject: 'Mathematics', duration: '25 min', done: true, color: 'lavender' },
  { title: 'Practice: Electrostatics', subject: 'Physics', duration: '20 min', done: false, color: 'mint' },
  { title: 'Read reaction mechanisms', subject: 'Chemistry', duration: '30 min', done: false, color: 'peach' },
]

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [activeNav, setActiveNav] = useState('Overview')
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [notice, setNotice] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [materialText, setMaterialText] = useState('')
  const [studyPlan, setStudyPlan] = useState<{ title: string; summary: string; estimatedHours: number; concepts: Array<{ title: string; whyItMatters: string; learn: string[]; practice: string[]; revise: string[]; create: string[]; prepare: string[] }> } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [displayName, setDisplayName] = useState('')
  const [planId, setPlanId] = useState<string | null>(null)
  const [doneTasks, setDoneTasks] = useState<string[]>([])
  const [isScheduling, setIsScheduling] = useState(false)
  const router = useRouter()
  const [todayLabel, setTodayLabel] = useState('')
  useEffect(() => setTodayLabel(new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()), [])
  const { data: session } = authClient.useSession()
  const { data: dashRaw, mutate: mutateDash } = useSWR(session?.user ? `/api/dashboard?tz=${encodeURIComponent(tzString())}` : null, fetcher, { revalidateOnFocus: false })
  const dash = dashRaw as DashboardData | undefined
  const live = Boolean(session?.user && dash?.signedIn && !dash?.error)
  const firstName = session?.user?.name?.split(' ')[0]
  const { data: savedPlans } = useSWR(session?.user ? '/api/study-plan' : null, fetcher, { revalidateOnFocus: false })

  useEffect(() => {
    const latest = savedPlans?.plans?.[0]
    if (latest) { setStudyPlan({ title: latest.title, summary: latest.summary, estimatedHours: latest.estimatedHours, concepts: latest.plan }); setPlanId(latest.id) }
  }, [savedPlans])

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  const handleSaveProfile = async () => {
    if (!displayName.trim()) return showNotice('Enter a display name first.')
    const result = await authClient.updateUser({ name: displayName.trim() })
    if (result.error) return showNotice('We could not update your profile.')
    setSettingsOpen(false)
    router.refresh()
    showNotice('Profile updated.')
  }

  const handleLogout = async () => {
    await authClient.signOut()
    router.refresh()
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your account and all linked sign-in data? This cannot be undone.')) return
    const response = await fetch('/api/account/delete', { method: 'POST' })
    if (response.ok) {
      await authClient.signOut()
      router.push('/')
      router.refresh()
    } else showNotice('We could not delete your account. Please try again.')
  }

  const handleSchedule = async () => {
    if (!session?.user) { router.push('/login'); return }
    if (!planId) return showNotice('Your plan was not saved, so it cannot be scheduled. Please generate it again.')
    setIsScheduling(true)
    try {
      const minutes = -new Date().getTimezoneOffset()
      const sign = minutes < 0 ? '-' : '+'
      const abs = Math.abs(minutes)
      const tzOffset = `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
      await schedulePlanFromStudyPlan({ planId, tzOffset })
      router.push('/premium')
    } catch (error) {
      console.error('Scheduling failed', error)
      showNotice('We could not schedule your plan. Please try again.')
    } finally {
      setIsScheduling(false)
    }
  }

  const tones = ['lavender', 'mint', 'peach'] as const
  const todayTasks: Array<{ key: string; id?: string; title: string; subject: string; duration: string; color: string; done: boolean }> = live
    ? (dash?.todayBlocks ?? []).map((block, index) => ({ key: block.id, id: block.id, title: block.title, subject: new Date(block.startsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), duration: `${block.minutes} min`, color: tones[index % 3], done: block.status === 'completed' }))
    : studyPlan
      ? studyPlan.concepts.slice(0, 3).map((concept, index) => ({ title: `Learn: ${concept.title}`, subject: 'Your study path', duration: '30 min', color: tones[index % 3], done: doneTasks.includes(concept.title), key: concept.title }))
      : plan.map((item) => ({ ...item, key: item.title }))

  const toggleTask = async (item: { key: string; id?: string; done: boolean }) => {
    if (live && item.id) {
      if (item.done) return
      try { await completeSmartSchedule(item.id); await mutateDash() } catch { showNotice('We could not update that block.') }
    } else if (studyPlan) setDoneTasks((current) => current.includes(item.key) ? current.filter((k) => k !== item.key) : [...current, item.key])
  }

  const subjectRows = live && dash?.concepts?.length
    ? dash.concepts.map((concept, index) => ({ name: concept.title, code: concept.title, progress: concept.progress, tone: tones[index % 3], next: `Mastery ${concept.mastery}%` }))
    : subjects

  const handleUpload = async () => {
    let material = materialText.trim()
    let fileName: string | undefined
    if (!material && selectedFile) {
      if (selectedFile.size > 3_000_000) {
        showNotice('This file is too large for the planner. Please paste the chapter text or use a PDF under 3 MB.')
        return
      }
      fileName = selectedFile.name
      if (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf')) {
        material = ''
      } else {
        material = await selectedFile.text()
      }
    }
    if (!material && !selectedFile) {
      showNotice('Paste at least a few sentences or choose a text-based file.')
      return
    }
    setIsGenerating(true)
    try {
      const formData = new FormData()
      formData.set('material', material)
      if (selectedFile) formData.set('file', selectedFile)
      if (fileName) formData.set('fileName', fileName)
      const response = await fetch('/api/study-plan', { method: 'POST', headers: { Accept: 'application/json' }, body: formData })
      const responseText = await response.text()
      let result: { error?: string; id?: string | null; title?: string; summary?: string; estimatedHours?: number; concepts?: Array<{ title: string; whyItMatters: string; learn: string[]; practice: string[]; revise: string[]; create: string[]; prepare: string[] }> }
      try {
        result = JSON.parse(responseText)
      } catch {
        if (response.status === 413 || responseText.includes('Request Entity')) {
          throw new Error('This upload is too large. Please paste the chapter text or use a PDF under 3 MB.')
        }
        throw new Error(`The study planner could not process this request (${response.status}). Please try again.`)
      }
      if (!response.ok) {
        const message = typeof result?.error === 'string' ? result.error : 'We could not build your study path.'
        throw new Error(message)
      }
      if (result?.title && result?.concepts) {
        setStudyPlan(result as typeof studyPlan)
        setPlanId(result.id ?? null)
        setDoneTasks([])
        if (session?.user && !result.id) showNotice('Plan built, but it could not be saved to your account.')
        setShowUpload(false)
        setMaterialText('')
        setSelectedFile(null)
        if (!session?.user || result.id) showNotice(session?.user ? 'Your personalized study path is ready.' : 'Your study path is ready. Log in to save it and schedule it.')
      } else {
        throw new Error('Invalid study plan format received.')
      }
    } catch (error) {
      let errorMsg = 'We could not build your study path.'
      if (error instanceof Error) {
        errorMsg = error.message
      } else if (typeof error === 'string') {
        errorMsg = error
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMsg = String((error as Record<string, unknown>).message)
      }
      console.error('[v0] Study plan error:', error)
      showNotice(errorMsg)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <main className={`site-shell ${theme === 'dark' ? 'theme-dark' : ''}`}>
      <header className="marketing-nav">
        <a className="brand" href="#top" aria-label="Academic Factory home">
          <span className="brand-mark"><Sparkles size={16} /></span>
          <span>Academic <span>Factory</span></span>
        </a>
        <nav className="marketing-links" aria-label="Main navigation">
          <a href="#product">Product</a><a href="#how-it-works">How it works</a><a href="#faq">FAQ</a>
        </nav>
        <div className="nav-actions">{session?.user ? <><a className="login-link" href="/premium">Schedule</a><a className="login-link" href="/practice">Practice</a><span className="nav-user">{session.user.name}</span><button className="settings-trigger" onClick={() => { setDisplayName(session.user.name ?? ''); setSettingsOpen(true) }} aria-label="Open settings"><Settings size={17} /></button></> : <><a className="login-link" href="/login">Log in</a><a className="button button-dark button-small" href="/login">Get started <ArrowUpRight size={15} /></a></>}</div>
        <button className="icon-button mobile-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
        {menuOpen && <div className="mobile-menu"><a href="#product">Product</a><a href="#how-it-works">How it works</a><a href="#faq">FAQ</a><a href="#workspace">Get started</a></div>}
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> Your academic operating system</div>
          <h1>Your syllabus just became your <em>study system.</em></h1>
          <p>Upload your syllabus, textbooks, notes or PDFs. Academic Factory turns them into a personalized path to learn, practice, revise, create and prepare.</p>
          <div className="hero-actions"><a className="button button-dark" href="#workspace">Build my workspace <ArrowUpRight size={17} /></a><a className="text-link" href="#how-it-works"><span className="play-icon"><Play size={12} fill="currentColor" /></span> See how it works</a></div>
          <div className="hero-note"><div className="avatar-stack"><span>AS</span><span>RK</span><span>PN</span></div><span>Made for students who want to feel ready.</span></div>
        </div>
        <div className="hero-art" aria-label="Academic Factory dashboard preview">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="float-card float-card-top"><Zap size={14} /> <span>Study momentum</span><strong>+24%</strong></div>
          <div className="dashboard-preview">
            <div className="preview-sidebar"><div className="mini-logo"><span className="brand-mark"><Sparkles size={11} /></span></div><div className="mini-nav active"><LayoutDashboard size={13} /></div><div className="mini-nav"><BookOpen size={13} /></div><div className="mini-nav"><Brain size={13} /></div><div className="mini-nav"><FileText size={13} /></div><div className="mini-nav"><Target size={13} /></div></div>
            <div className="preview-main"><div className="preview-top"><span>Tuesday, 12 March 2024</span><span className="preview-avatar">AS</span></div><h3>Good afternoon, Aarav</h3><p className="preview-muted">Here&apos;s your path to exam day.</p><div className="preview-grid"><div className="readiness-card"><span className="card-label">EXAM READINESS</span><div className="readiness-score">72<span>%</span></div><div className="progress-line"><i /></div><small>+8% from last week</small></div><div className="countdown-card"><span className="card-label">NEXT EXAM</span><strong>18</strong><span>days left</span><div className="countdown-sub"><CalendarDays size={12} /> Mathematics · 30 Mar</div></div></div><div className="preview-plan"><div className="plan-heading"><span>Today&apos;s plan</span><span>3 tasks</span></div><div className="mini-task done"><span className="check-circle"><Check size={10} /></span><span>Revise integration</span><b>25 min</b></div><div className="mini-task"><span className="empty-circle" /><span>Practice: Electrostatics</span><b>20 min</b></div><div className="mini-task"><span className="empty-circle" /><span>Read reaction mechanisms</span><b>30 min</b></div></div></div>
          </div>
          <div className="float-card float-card-bottom"><div className="sparkle-bubble"><Sparkles size={14} /></div><span>AI study plan<br /><b>Ready for you</b></span><ArrowUpRight size={15} /></div>
        </div>
      </section>

      <section className="proof-strip"><span>ONE UPLOAD. AN ENTIRE ACADEMIC WORKFLOW.</span><div className="proof-items"><span><FileText size={15} /> Notes</span><span><Brain size={15} /> Practice</span><span><CalendarDays size={15} /> Revision</span><span><Sparkles size={15} /> Projects</span><span><GraduationCap size={15} /> Viva</span></div></section>

      <section className="section product-section" id="product"><div className="section-intro"><div className="eyebrow"><span className="eyebrow-dot" /> Everything in one place</div><h2>From scattered material to <em>exam ready.</em></h2><p>Stop switching between ten different tools. Academic Factory connects every part of your academic workflow around the material you already have.</p></div><div className="feature-grid"><Feature icon={<BookOpen />} number="01" title="Learn with context" copy="Turn chapters into clear notes, examples and explanations that match your level." tone="lavender" /><Feature icon={<Brain />} number="02" title="Practice smarter" copy="Generate adaptive quizzes that focus on exactly what you need to strengthen." tone="mint" /><Feature icon={<CalendarDays />} number="03" title="Revise with a plan" copy="A daily plan that changes with your progress and keeps you moving forward." tone="peach" /><Feature icon={<Sparkles />} number="04" title="Create confidently" copy="Build projects, presentations and assignments from your source material." tone="yellow" /></div></section>

      <section className="section workflow-section" id="how-it-works"><div className="workflow-copy"><div className="eyebrow"><span className="eyebrow-dot" /> A better way to study</div><h2>One upload.<br /><em>Every outcome.</em></h2><p>Academic Factory is built around the way learning actually happens. Your materials power a loop that gets more personal every time you use it.</p><a className="button button-dark" href="#workspace">Explore the workspace <ArrowUpRight size={17} /></a></div><div className="workflow-steps"><WorkflowStep n="01" title="Upload" copy="Your syllabus, notes, PDFs or textbooks." /><WorkflowStep n="02" title="Understand" copy="AI maps the topics, gaps and priorities." /><WorkflowStep n="03" title="Practice" copy="Learn through questions made for you." /><WorkflowStep n="04" title="Get ready" copy="Revise, create and walk into exams ready." last /></div></section>

      <section className="section workspace-section" id="workspace"><div className="workspace-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> A workspace that thinks ahead</div><h2>Meet your academic <em>command center.</em></h2></div><button className="button button-dark" onClick={() => setShowUpload(true)}><Upload size={17} /> Upload material</button></div>{studyPlan && <section className="study-plan" aria-live="polite"><div className="study-plan-header"><div><span className="card-label">PERSONALIZED PATH</span><h3>{studyPlan.title}</h3><p>{studyPlan.summary}</p></div><span className="plan-hours">{studyPlan.estimatedHours}h total</span></div><div style={{ marginTop: 16 }}><button className="button button-dark button-small" onClick={handleSchedule} disabled={isScheduling}>{isScheduling ? 'Scheduling…' : 'Plan my schedule'} <ArrowUpRight size={15} /></button></div><div className="concept-grid">{studyPlan.concepts.map((concept, conceptIndex) => <article className="concept-card" key={`${conceptIndex}-${concept.title}`}><h4>{concept.title}</h4><p>{concept.whyItMatters}</p><div className="concept-columns"><PlanColumn title="Learn" items={concept.learn} /><PlanColumn title="Practice" items={concept.practice} /><PlanColumn title="Revise" items={concept.revise} /><PlanColumn title="Create" items={concept.create} /><PlanColumn title="Prepare" items={concept.prepare} /></div></article>)}</div></section>}<div className="app-window"><aside className="app-sidebar"><div className="app-brand"><span className="brand-mark"><Sparkles size={14} /></span><span>Academic <span>Factory</span></span></div><div className="app-nav-group"><small>WORKSPACE</small>{navItems.map((item) => { const Icon = item.icon; return <button key={item.label} className={`app-nav-item ${activeNav === item.label ? 'active' : ''}`} onClick={() => setActiveNav(item.label)}><Icon size={16} /> {item.label}</button> })}</div><div className="app-nav-group"><small>CREATE</small><button className="app-nav-item" onClick={() => showNotice('New project workspace is ready to configure.') }><Plus size={16} /> New project</button><button className="app-nav-item" onClick={() => showNotice('Your uploaded materials will appear here.') }><FileText size={16} /> Materials</button></div><div className="sidebar-profile"><span className="preview-avatar">{session?.user?.name?.slice(0, 2).toUpperCase() ?? 'AF'}</span><span><b>{session?.user?.name ?? 'Aarav Sharma'}</b><small>Student workspace</small></span><MoreHorizontal size={16} /></div></aside><div className="app-content"><div className="app-topbar"><button className="mobile-app-menu" onClick={() => showNotice('Use the workspace links below to switch sections.') } aria-label="Open workspace navigation"><Menu size={18} /></button><span className="crumb">Workspace / {activeNav}</span><div className="app-top-actions"><span className="streak"><Flame size={15} /> {live ? dash?.streak ?? 0 : 7} day streak</span><span className="preview-avatar">AS</span></div></div><div className="app-greeting"><div><p className="date-label">{todayLabel || ' '}</p><h3>{live ? `Welcome back, ${firstName ?? 'student'}` : 'Good afternoon, Aarav'}</h3><p>Let&apos;s make today count.</p></div><div className="app-motivation"><Trophy size={19} /><span>Keep going<br /><b>{live ? `${dash?.weekHours ?? 0}h studied this week` : '78% of your weekly goal'}</b></span></div></div><div className="stats-grid"><Stat label="EXAM READINESS" value={live ? (dash?.readiness != null ? `${dash.readiness}%` : '—') : '72%'} detail={live ? (dash?.nextExam ? `${dash.nextExam.title} in ${dash.nextExam.daysLeft} days` : 'Complete blocks and quizzes to raise it') : '+8% this week'} tone="lavender" /><Stat label="STUDY STREAK" value={live ? `${dash?.streak ?? 0} day${dash?.streak === 1 ? '' : 's'}` : '7 days'} detail={live ? 'Finish a block today to keep it' : 'Personal best: 12'} tone="peach" /><Stat label="WEEKLY PROGRESS" value={live ? `${dash?.weekHours ?? 0}h` : '14.5h'} detail={live ? 'Studied in the last 7 days' : 'Goal: 18 hours'} tone="mint" /></div><div className="app-columns"><div className="plan-panel"><div className="panel-heading"><span>Today&apos;s plan</span><button className="plain-link">View all</button></div>{todayTasks.map((item) => <div className={`task-row ${item.done ? 'task-done' : ''}`} key={item.key}><span className={`task-icon ${item.color}`} role="button" tabIndex={0} style={{ cursor: live || studyPlan ? 'pointer' : undefined }} onClick={() => toggleTask(item)}>{item.done ? <Check size={14} /> : <Clock3 size={14} />}</span><span className="task-info"><b>{item.title}</b><small>{item.subject}</small></span><span className="task-time">{item.duration}</span><button className="task-more" aria-label={`More options for ${item.title}`}><MoreHorizontal size={16} /></button></div>)}{live && todayTasks.length === 0 && <p style={{ fontSize: 12, margin: '10px 0' }}>No blocks today. <a href="/premium#builder">Build your schedule</a>.</p>}<button className="add-task" onClick={() => router.push(session?.user ? '/premium#builder' : '/login')}><Plus size={15} /> {live ? 'Plan my schedule' : 'Add a task'}</button></div><div className="subjects-panel"><div className="panel-heading"><span>{live && dash?.concepts?.length ? 'Concept progress' : 'Subject progress'}</span><button className="plain-link">Manage</button></div>{subjectRows.map((subject) => <div className="subject-row" key={subject.name}><div className={`subject-icon ${subject.tone}`}>{subject.code.slice(0, 2)}</div><div className="subject-info"><b>{subject.name}</b><small>Next: {subject.next}</small><div className="subject-progress"><i style={{ width: `${subject.progress}%` }} /></div></div><strong>{subject.progress}%</strong></div>)}</div></div></div></div></section>

      <section className="section faq-section" id="faq"><div className="faq-heading"><div className="eyebrow"><span className="eyebrow-dot" /> Questions, answered</div><h2>Built for your<br /><em>next chapter.</em></h2><p>Still curious? We&apos;re here to help you get started.</p><a className="text-link" href="mailto:hello@academicfactory.app">Talk to us <ArrowUpRight size={15} /></a></div><div className="faq-list">{['What can I upload to Academic Factory?', 'Is Academic Factory only for CBSE students?', 'How does the AI use my study material?', 'How do I start using Academic Factory?', 'Can I use it on my phone?'].map((question, index) => <div className={`faq-item ${openFaq === index ? 'open' : ''}`} key={question}><button onClick={() => setOpenFaq(openFaq === index ? null : index)}><span>{question}</span><ChevronDown size={18} /></button>{openFaq === index && <p>{index === 0 ? 'Upload syllabi, PDFs, notes, textbook chapters and other study material. Your workspace turns them into useful learning outputs.' : index === 1 ? 'No. It is designed to flex across boards, classes and subjects, starting with a strong experience for senior-school students.' : index === 2 ? 'Your material is used to create structured study outputs such as notes, questions and revision plans. You stay in control of your workspace.' : index === 3 ? 'Create an account, upload your study material, and build your personalized study path from the workspace.' : 'Yes. The responsive workspace is designed for desktop, tablet and mobile.'}</p>}</div>)}</div></section>

      <section className="final-cta"><div className="final-orb" /><div className="eyebrow light"><span className="eyebrow-dot" /> Your next chapter starts here</div><h2>Make studying feel<br /><em>less scattered.</em></h2><p>Upload once. Understand more. Show up ready.</p><a className="button button-light" href="#workspace">Build my academic workspace <ArrowUpRight size={17} /></a></section>
      <footer className="footer"><div className="footer-top"><a className="brand" href="#top"><span className="brand-mark"><Sparkles size={16} /></span><span>Academic <span>Factory</span></span></a><span className="footer-note">The academic operating system for curious students.</span><div className="footer-links"><a href="#product">Product</a><a href="#faq">Help</a><a href="mailto:hello@academicfactory.app">Contact</a></div></div><div className="footer-bottom"><span>© 2024 Academic Factory. Built for the next chapter.</span><span><a href="#faq">Privacy</a><a href="#faq">Terms</a></span></div></footer>

      {settingsOpen && session?.user && <div className="modal-backdrop" role="presentation" onClick={() => setSettingsOpen(false)}><div className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><X size={18} /></button><div className="settings-heading"><Settings size={20} /><span>Account settings</span></div><h3 id="settings-title">Make it yours.</h3><p>Manage your profile, appearance and account access.</p><section className="settings-section"><label className="settings-label" htmlFor="display-name">Display name</label><input id="display-name" className="settings-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={60} /><button className="button button-dark full-width" onClick={handleSaveProfile}>Save changes</button></section><section className="settings-section"><span className="settings-label">Theme</span><div className="theme-options"><button className={theme === 'light' ? 'selected' : ''} onClick={() => setTheme('light')}>Light</button><button className={theme === 'dark' ? 'selected' : ''} onClick={() => setTheme('dark')}>Dark</button></div></section><section className="settings-section settings-danger"><button className="settings-action" onClick={handleLogout}>Log out</button><button className="settings-action danger" onClick={handleDeleteAccount}>Delete account</button></section></div></div>}
      {showUpload && <div className="modal-backdrop" role="presentation" onClick={() => setShowUpload(false)}><div className="upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowUpload(false)} aria-label="Close upload dialog"><X size={18} /></button><div className="upload-icon"><Upload size={23} /></div><h3 id="upload-title">Add your first material</h3><p>Paste notes, a syllabus, or chapter text and we&apos;ll turn it into a complete learning loop.</p><textarea className="material-input" value={materialText} onChange={(event) => setMaterialText(event.target.value)} placeholder="Example: Photosynthesis converts light energy into chemical energy..." rows={7} /><label className="drop-zone"><input type="file" accept=".pdf,.txt,.md,.csv" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} /><FileText size={23} /><b>{selectedFile ? selectedFile.name : 'Or choose a text file'}</b><span>PDF, TXT, MD or CSV</span></label><button className="button button-dark full-width" onClick={handleUpload} disabled={isGenerating}>{isGenerating ? 'Building your path...' : 'Build my study path'} <ArrowUpRight size={16} /></button></div></div>}
      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  )
}

function PlanColumn({ title, items }: { title: string; items: string[] }) { return <div className="plan-column"><strong>{title}</strong><ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div> }
function Feature({ icon, number, title, copy, tone }: { icon: React.ReactNode; number: string; title: string; copy: string; tone: string }) { return <article className={`feature-card ${tone}`}><div className="feature-top"><span className="feature-icon">{icon}</span><span>{number}</span></div><h3>{title}</h3><p>{copy}</p><ArrowUpRight className="feature-arrow" size={18} /></article> }
function WorkflowStep({ n, title, copy, last }: { n: string; title: string; copy: string; last?: boolean }) { return <div className={`workflow-step ${last ? 'last' : ''}`}><div className="step-number">{n}</div><div><h3>{title}</h3><p>{copy}</p></div></div> }
function Stat({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) { return <div className={`stat-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div> }
