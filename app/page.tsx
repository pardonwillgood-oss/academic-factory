'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
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

const plan = [
  { title: 'Revise integration', subject: 'Mathematics', duration: '25 min', done: true, color: 'lavender' },
  { title: 'Practice: Electrostatics', subject: 'Physics', duration: '20 min', done: false, color: 'mint' },
  { title: 'Read reaction mechanisms', subject: 'Chemistry', duration: '30 min', done: false, color: 'peach' },
]

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [activeNav, setActiveNav] = useState('Overview')
  const [billingYearly, setBillingYearly] = useState(true)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [notice, setNotice] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const router = useRouter()
  const { data: session } = authClient.useSession()

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
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

  const handleUpload = () => {
    if (!selectedFile) {
      showNotice('Choose a PDF, DOCX or TXT file first.')
      return
    }
    setShowUpload(false)
    showNotice(`${selectedFile.name} is ready to add to your workspace.`)
  }

  return (
    <main className="site-shell">
      <header className="marketing-nav">
        <a className="brand" href="#top" aria-label="Academic Factory home">
          <span className="brand-mark"><Sparkles size={16} /></span>
          <span>Academic <span>Factory</span></span>
        </a>
        <nav className="marketing-links" aria-label="Main navigation">
          <a href="#product">Product</a><a href="#how-it-works">How it works</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a>
        </nav>
        <div className="nav-actions">{session?.user ? <><span className="nav-user">{session.user.name}</span><button className="login-link nav-button" onClick={handleLogout}>Log out</button><button className="button button-dark button-small" onClick={handleDeleteAccount}>Delete account</button></> : <><a className="login-link" href="/login">Log in</a><a className="button button-dark button-small" href="/login">Get started <ArrowUpRight size={15} /></a></>}</div>
        <button className="icon-button mobile-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
        {menuOpen && <div className="mobile-menu"><a href="#product">Product</a><a href="#how-it-works">How it works</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a><a href="#workspace">Get started</a></div>}
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

      <section className="section workspace-section" id="workspace"><div className="workspace-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> A workspace that thinks ahead</div><h2>Meet your academic <em>command center.</em></h2></div><button className="button button-dark" onClick={() => setShowUpload(true)}><Upload size={17} /> Upload material</button></div><div className="app-window"><aside className="app-sidebar"><div className="app-brand"><span className="brand-mark"><Sparkles size={14} /></span><span>Academic <span>Factory</span></span></div><div className="app-nav-group"><small>WORKSPACE</small>{navItems.map((item) => { const Icon = item.icon; return <button key={item.label} className={`app-nav-item ${activeNav === item.label ? 'active' : ''}`} onClick={() => setActiveNav(item.label)}><Icon size={16} /> {item.label}</button> })}</div><div className="app-nav-group"><small>CREATE</small><button className="app-nav-item" onClick={() => showNotice('New project workspace is ready to configure.') }><Plus size={16} /> New project</button><button className="app-nav-item" onClick={() => showNotice('Your uploaded materials will appear here.') }><FileText size={16} /> Materials</button></div><div className="sidebar-profile"><span className="preview-avatar">{session?.user?.name?.slice(0, 2).toUpperCase() ?? 'AF'}</span><span><b>{session?.user?.name ?? 'Aarav Sharma'}</b><small>Student workspace</small></span><MoreHorizontal size={16} /></div></aside><div className="app-content"><div className="app-topbar"><button className="mobile-app-menu" onClick={() => showNotice('Use the workspace links below to switch sections.') } aria-label="Open workspace navigation"><Menu size={18} /></button><span className="crumb">Workspace / {activeNav}</span><div className="app-top-actions"><span className="streak"><Flame size={15} /> 7 day streak</span><span className="preview-avatar">AS</span></div></div><div className="app-greeting"><div><p className="date-label">TUESDAY, 12 MARCH 2024</p><h3>Good afternoon, Aarav</h3><p>Let&apos;s make today count.</p></div><div className="app-motivation"><Trophy size={19} /><span>Keep going<br /><b>78% of your weekly goal</b></span></div></div><div className="stats-grid"><Stat label="EXAM READINESS" value="72%" detail="+8% this week" tone="lavender" /><Stat label="STUDY STREAK" value="7 days" detail="Personal best: 12" tone="peach" /><Stat label="WEEKLY PROGRESS" value="14.5h" detail="Goal: 18 hours" tone="mint" /></div><div className="app-columns"><div className="plan-panel"><div className="panel-heading"><span>Today&apos;s plan</span><button className="plain-link">View all</button></div>{plan.map((item) => <div className={`task-row ${item.done ? 'task-done' : ''}`} key={item.title}><span className={`task-icon ${item.color}`}>{item.done ? <Check size={14} /> : <Clock3 size={14} />}</span><span className="task-info"><b>{item.title}</b><small>{item.subject}</small></span><span className="task-time">{item.duration}</span><button className="task-more" aria-label={`More options for ${item.title}`}><MoreHorizontal size={16} /></button></div>)}<button className="add-task"><Plus size={15} /> Add a task</button></div><div className="subjects-panel"><div className="panel-heading"><span>Subject progress</span><button className="plain-link">Manage</button></div>{subjects.map((subject) => <div className="subject-row" key={subject.name}><div className={`subject-icon ${subject.tone}`}>{subject.code.slice(0, 2)}</div><div className="subject-info"><b>{subject.name}</b><small>Next: {subject.next}</small><div className="subject-progress"><i style={{ width: `${subject.progress}%` }} /></div></div><strong>{subject.progress}%</strong></div>)}</div></div></div></div></section>

      <section className="section pricing-section" id="pricing"><div className="section-intro centered"><div className="eyebrow"><span className="eyebrow-dot" /> Simple, student-friendly pricing</div><h2>Start free. <em>Go further</em> when you&apos;re ready.</h2><p>Everything you need to build better study habits, without the overwhelm.</p><div className="billing-toggle"><button className={!billingYearly ? 'selected' : ''} onClick={() => setBillingYearly(false)}>Monthly</button><button className={billingYearly ? 'selected' : ''} onClick={() => setBillingYearly(true)}>Yearly <span>Save 30%</span></button></div></div><div className="pricing-grid"><PriceCard name="Starter" price="0" copy="A focused start to your academic system." items={['3 subjects', '5 uploads per month', 'Basic practice quizzes', 'Weekly study plan']} /><PriceCard featured name="Focus" price={billingYearly ? '7' : '10'} copy="For students who are serious about improving." items={['Unlimited subjects', 'Unlimited uploads', 'Adaptive quizzes & revision', 'Project Factory', 'Viva preparation']} /><PriceCard name="Classroom" price={billingYearly ? '15' : '20'} copy="For tutors, teachers and small cohorts." items={['Everything in Focus', 'Shared class workspaces', 'Progress insights', 'Priority support']} /></div></section>

      <section className="section faq-section" id="faq"><div className="faq-heading"><div className="eyebrow"><span className="eyebrow-dot" /> Questions, answered</div><h2>Built for your<br /><em>next chapter.</em></h2><p>Still curious? We&apos;re here to help you get started.</p><a className="text-link" href="mailto:hello@academicfactory.app">Talk to us <ArrowUpRight size={15} /></a></div><div className="faq-list">{['What can I upload to Academic Factory?', 'Is Academic Factory only for CBSE students?', 'How does the AI use my study material?', 'Can I cancel my plan anytime?', 'Can I use it on my phone?'].map((question, index) => <div className={`faq-item ${openFaq === index ? 'open' : ''}`} key={question}><button onClick={() => setOpenFaq(openFaq === index ? null : index)}><span>{question}</span><ChevronDown size={18} /></button>{openFaq === index && <p>{index === 0 ? 'Upload syllabi, PDFs, notes, textbook chapters and other study material. Your workspace turns them into useful learning outputs.' : index === 1 ? 'No. It is designed to flex across boards, classes and subjects, starting with a strong experience for senior-school students.' : index === 2 ? 'Your material is used to create structured study outputs such as notes, questions and revision plans. You stay in control of your workspace.' : index === 3 ? 'Yes. Change or cancel your plan whenever you like from account settings.' : 'Yes. The responsive workspace is designed for desktop, tablet and mobile.'}</p>}</div>)}</div></section>

      <section className="final-cta"><div className="final-orb" /><div className="eyebrow light"><span className="eyebrow-dot" /> Your next chapter starts here</div><h2>Make studying feel<br /><em>less scattered.</em></h2><p>Upload once. Understand more. Show up ready.</p><a className="button button-light" href="#workspace">Build my academic workspace <ArrowUpRight size={17} /></a></section>
      <footer className="footer"><div className="footer-top"><a className="brand" href="#top"><span className="brand-mark"><Sparkles size={16} /></span><span>Academic <span>Factory</span></span></a><span className="footer-note">The academic operating system for curious students.</span><div className="footer-links"><a href="#product">Product</a><a href="#pricing">Pricing</a><a href="#faq">Help</a><a href="mailto:hello@academicfactory.app">Contact</a></div></div><div className="footer-bottom"><span>© 2024 Academic Factory. Built for the next chapter.</span><span><a href="#faq">Privacy</a><a href="#faq">Terms</a></span></div></footer>

      {showUpload && <div className="modal-backdrop" role="presentation" onClick={() => setShowUpload(false)}><div className="upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowUpload(false)} aria-label="Close upload dialog"><X size={18} /></button><div className="upload-icon"><Upload size={23} /></div><h3 id="upload-title">Add your first material</h3><p>Drop a syllabus, chapter, notes or PDF here and we&apos;ll start building your workspace.</p><label className="drop-zone"><input type="file" accept=".pdf,.doc,.docx,.txt" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} /><FileText size={23} /><b>{selectedFile ? selectedFile.name : 'Choose a file to upload'}</b><span>PDF, DOCX or TXT · up to 20MB</span></label><button className="button button-dark full-width" onClick={handleUpload}>Continue <ArrowUpRight size={16} /></button></div></div>}
      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  )
}

function Feature({ icon, number, title, copy, tone }: { icon: React.ReactNode; number: string; title: string; copy: string; tone: string }) { return <article className={`feature-card ${tone}`}><div className="feature-top"><span className="feature-icon">{icon}</span><span>{number}</span></div><h3>{title}</h3><p>{copy}</p><ArrowUpRight className="feature-arrow" size={18} /></article> }
function WorkflowStep({ n, title, copy, last }: { n: string; title: string; copy: string; last?: boolean }) { return <div className={`workflow-step ${last ? 'last' : ''}`}><div className="step-number">{n}</div><div><h3>{title}</h3><p>{copy}</p></div></div> }
function Stat({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) { return <div className={`stat-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div> }
function PriceCard({ name, price, copy, items, featured }: { name: string; price: string; copy: string; items: string[]; featured?: boolean }) { return <article className={`price-card ${featured ? 'featured' : ''}`}>{featured && <span className="popular-tag">Most popular</span>}<h3>{name}</h3><p>{copy}</p><div className="price"><strong>₹{price}</strong><span>/ month</span></div><a className={`button ${featured ? 'button-dark' : 'button-outline'} full-width`} href="#workspace">{name === 'Starter' ? 'Start for free' : 'Choose plan'} <ArrowUpRight size={16} /></a><ul>{items.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul></article> }
