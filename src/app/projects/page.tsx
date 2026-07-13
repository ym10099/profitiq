'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const GLOW = 'radial-gradient(120% 80% at 50% 100%, #3B82F6 0%, #1E4FA8 25%, #102A5C 50%, #0A0A0B 78%)'
const PANEL = 'rgba(20,20,23,0.72)'
const BORDER = '#23232A'
const INK = '#F4F5F7'
const SUB = '#9A9CA3'
const FAINT = '#5C5E66'
const GREEN_TEXT = '#3FD98A'
const RED_TEXT = '#F2607A'
const BLUE_TEXT = '#3B82F6'

type Project = { id: string; name: string; client: string | null; status: string }
type Txn = { amount: number; type: 'income' | 'expense'; project_id: string | null }
type ProjectStats = Project & { income: number; expenses: number; net: number; count: number }

export default function ProjectsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [projects, setProjects] = useState<Project[]>([])
  const [txns, setTxns] = useState<Txn[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newClient, setNewClient] = useState('')
  const [error, setError] = useState('')

  async function loadData() {
    const [{ data: projData }, { data: txnData }] = await Promise.all([
      supabase.from('projects').select('id, name, client, status').order('created_at', { ascending: false }),
      supabase.from('transactions').select('amount, type, project_id'),
    ])
    setProjects((projData ?? []) as Project[])
    setTxns((txnData ?? []) as Txn[])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function createProject() {
    setError('')
    if (!newName.trim()) {
      setError('Give your project a name.')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in.')
      return
    }
    const { error: insertError } = await supabase.from('projects').insert({
      user_id: user.id,
      name: newName.trim(),
      client: newClient.trim() || null,
    })
    if (insertError) {
      setError(`Could not create project: ${insertError.message}`)
      return
    }
    setNewName('')
    setNewClient('')
    setShowForm(false)
    await loadData()
  }

  async function deleteProject(id: string) {
    const ok = window.confirm('Delete this project? Its transactions will stay but become unassigned.')
    if (!ok) return
    await supabase.from('projects').delete().eq('id', id)
    await loadData()
  }

  // Compute per-project stats from the transactions
  const stats: ProjectStats[] = projects.map((p) => {
    const projTxns = txns.filter((t) => t.project_id === p.id)
    const income = projTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = projTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { ...p, income, expenses, net: income - expenses, count: projTxns.length }
  })

  // How many transactions aren't assigned to any project
  const unassignedCount = txns.filter((t) => t.project_id === null).length

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const money = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: GLOW, fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: 200, background: 'transparent', borderRight: `0.5px solid ${BORDER}`, padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 28, padding: '0 6px' }}>
          <img src="/logo.png" alt="MargoIQ" style={{ height: 26 }} />
        </div>
        <NavItem label="Dashboard" href="/dashboard" />
        <NavItem label="Close out night" href="/close-out" />
        <NavItem label="Purchase orders" href="/purchase-orders" />
        <NavItem label="Projects" href="/projects" active />
        <NavItem label="Transactions" href="/transactions" />
        <NavItem label="Weekly digest" href="/weekly-digest" />
        <NavItem label="Settings" href="/dashboard" />
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: '9px 12px', borderRadius: 9, color: SUB, fontSize: 14 }}>
            Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: `0.5px solid ${BORDER}` }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: INK }}>Projects</p>
            <p style={{ fontSize: 12, color: FAINT, margin: 0 }}>See what each project actually makes you</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{ fontSize: 13, background: '#fff', color: '#0A0A0B', border: 'none', padding: '8px 16px', borderRadius: 9, fontWeight: 600, cursor: 'pointer' }}>
            {showForm ? 'Cancel' : '+ New project'}
          </button>
        </div>

        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 820 }}>

          {/* New project form */}
          {showForm && (
            <div style={{ background: PANEL, border: `0.5px solid ${BORDER}`, borderRadius: 14, padding: 18, backdropFilter: 'blur(8px)' }}>
              <p style={{ fontSize: 11, color: FAINT, fontWeight: 600, letterSpacing: 0.5, margin: '0 0 12px' }}>NEW PROJECT</p>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Project name (e.g. Nike Campaign)"
                  style={{ flex: 2, background: '#141417', border: `0.5px solid ${BORDER}`, borderRadius: 9, padding: '10px 12px', color: INK, fontSize: 14, outline: 'none' }}
                />
                <input
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  placeholder="Client (optional)"
                  style={{ flex: 1, background: '#141417', border: `0.5px solid ${BORDER}`, borderRadius: 9, padding: '10px 12px', color: INK, fontSize: 14, outline: 'none' }}
                />
              </div>
              <button onClick={createProject} style={{ background: '#fff', color: '#0A0A0B', border: 'none', padding: '10px 18px', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Create project
              </button>
            </div>
          )}

          {error && <p style={{ color: RED_TEXT, fontSize: 14 }}>⚠️ {error}</p>}

          {loading && <p style={{ color: SUB }}>Loading your projects…</p>}

          {/* Empty state */}
          {!loading && projects.length === 0 && (
            <div style={{ background: PANEL, border: `0.5px solid ${BORDER}`, borderRadius: 16, padding: 40, textAlign: 'center', backdropFilter: 'blur(8px)' }}>
              <p style={{ color: INK, fontSize: 15, fontWeight: 600, margin: 0 }}>No projects yet</p>
              <p style={{ color: SUB, fontSize: 13, margin: '8px 0 0' }}>Create a project, then assign transactions to it from the Transactions page.</p>
            </div>
          )}

          {/* Project cards */}
          {stats.map((p) => {
            const profitable = p.net >= 0
            return (
              <div key={p.id} style={{ background: PANEL, border: `0.5px solid ${BORDER}`, borderRadius: 14, padding: '18px 20px', backdropFilter: 'blur(8px)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: INK, fontSize: 16, fontWeight: 600 }}>{p.name}</span>
                      <span style={{ fontSize: 11, color: profitable ? GREEN_TEXT : RED_TEXT, background: profitable ? '#0E2A1C' : '#2A1116', border: `0.5px solid ${profitable ? '#1F5C3E' : '#5C2230'}`, padding: '2px 9px', borderRadius: 20 }}>
                        {profitable ? 'Profitable' : 'Losing money'}
                      </span>
                    </div>
                    {p.client && <p style={{ color: SUB, fontSize: 13, margin: '4px 0 0' }}>{p.client}</p>}
                  </div>
                  <button onClick={() => deleteProject(p.id)} style={{ background: 'transparent', border: 'none', color: FAINT, cursor: 'pointer', fontSize: 12, padding: 2 }}>Delete</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <Stat label="Money in" value={money(p.income)} color={GREEN_TEXT} />
                  <Stat label="Money out" value={money(p.expenses)} color={RED_TEXT} />
                  <Stat label="Net profit" value={money(p.net)} color={profitable ? GREEN_TEXT : RED_TEXT} big />
                </div>

                <p style={{ color: FAINT, fontSize: 12, margin: '12px 0 0' }}>
                  {p.count} transaction{p.count === 1 ? '' : 's'} assigned
                </p>
              </div>
            )
          })}

          {/* Unassigned note */}
          {!loading && projects.length > 0 && unassignedCount > 0 && (
            <p style={{ color: FAINT, fontSize: 12 }}>
              {unassignedCount} transaction{unassignedCount === 1 ? '' : 's'} not assigned to any project.{' '}
              <Link href="/transactions" style={{ color: BLUE_TEXT, textDecoration: 'none' }}>Assign them →</Link>
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

function NavItem({ label, active, href }: { label: string; active?: boolean; href: string }) {
  return (
    <Link
      href={href}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: active ? 'rgba(255,255,255,0.06)' : 'transparent', color: active ? '#F4F5F7' : '#9A9CA3', fontSize: 14, fontWeight: active ? 600 : 400, cursor: 'pointer', textDecoration: 'none' }}
    >
      {label}
    </Link>
  )
}

function Stat({ label, value, color, big }: { label: string; value: string; color: string; big?: boolean }) {
  return (
    <div style={{ background: '#141417', border: '0.5px solid #23232A', borderRadius: 10, padding: '12px 14px' }}>
      <p style={{ fontSize: 11, color: '#5C5E66', fontWeight: 600, letterSpacing: 0.4, margin: '0 0 4px' }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: big ? 20 : 16, fontWeight: 600, margin: 0, color }}>{value}</p>
    </div>
  )
}