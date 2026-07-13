'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { calculatePnL, calculateMonthly, type Transaction, type PnL, type MonthlyPnL } from '@/lib/calculations'

const GLOW = 'radial-gradient(120% 80% at 50% 100%, #3B82F6 0%, #1E4FA8 25%, #102A5C 50%, #0A0A0B 78%)'
const PANEL = 'rgba(20,20,23,0.72)'
const PANEL_AI = 'rgba(12,15,13,0.72)'
const BORDER = '#23232A'
const BORDER_AI = '#1B4030'
const INK = '#F4F5F7'
const SUB = '#9A9CA3'
const FAINT = '#5C5E66'
const GREEN_FILL = '#0E2A1C'; const GREEN_BORDER = '#1F5C3E'; const GREEN_TEXT = '#3FD98A'
const RED_TEXT = '#F2607A'
const BLUE_FILL = '#0F1E33'; const BLUE_BORDER = '#234A7A'; const BLUE_TEXT = '#3B82F6'
const AMBER_FILL = '#2A1F00'; const AMBER_BORDER = '#5C4500'; const AMBER = '#FBBF24'

type Digest = {
  weekInReview: string
  trend: string
  watchOut: string
  win: string
  thisWeek: string
}

export default function WeeklyDigestPage() {
  const supabase = createClient()
  const router = useRouter()

  const [pnl, setPnl] = useState<PnL | null>(null)
  const [monthly, setMonthly] = useState<MonthlyPnL[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [digest, setDigest] = useState<Digest | null>(null)
  const [digestLoading, setDigestLoading] = useState(false)
  const [error, setError] = useState('')
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('transactions')
        .select('txn_date, description, amount, type')
      const txns = (data ?? []) as Transaction[]
      setPnl(calculatePnL(txns))
      setMonthly(calculateMonthly(txns))

      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 7)
      const cutoffStr = cutoff.toISOString().slice(0, 10)
      const recent = txns.filter((t) => t.txn_date >= cutoffStr)
      setRecentTransactions(recent)
      setLoading(false)
    }
    load()
  }, [])

  async function generateDigest() {
    if (!pnl) return
    setDigestLoading(true)
    setDigest(null)
    setError('')
    try {
      const res = await fetch('/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pnl, monthly, recentTransactions }),
      })
      const data = await res.json()
      if (data.error) setError(`AI error: ${data.error}`)
      else {
        setDigest(data.digest)
        setGeneratedAt(new Date())
      }
    } catch (err: any) {
      setError(`Request failed: ${err.message}`)
    }
    setDigestLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const weekLabel = (() => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 6)
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${fmt(start)} – ${fmt(end)}`
  })()

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
        <NavItem label="Projects" href="/projects" />
        <NavItem label="Transactions" href="/transactions" />
        <NavItem label="Weekly digest" href="/weekly-digest" active />
        <NavItem label="Settings" href="/dashboard" />
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: '9px 12px', borderRadius: 9, color: SUB, fontSize: 14 }}>
            Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: `0.5px solid ${BORDER}` }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: INK }}>Weekly digest</p>
            <p style={{ fontSize: 12, color: FAINT, margin: 0 }}>{weekLabel}</p>
          </div>
          {!loading && pnl && pnl.transactionCount > 0 && (
            <button
              onClick={generateDigest}
              disabled={digestLoading}
              style={{ fontSize: 13, background: '#fff', color: '#0A0A0B', border: 'none', padding: '8px 16px', borderRadius: 9, fontWeight: 600, cursor: digestLoading ? 'default' : 'pointer', opacity: digestLoading ? 0.7 : 1 }}
            >
              {digestLoading ? 'Generating…' : digest ? 'Regenerate' : 'Generate digest'}
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
          {loading && <p style={{ color: SUB }}>Loading your data…</p>}

          {!loading && pnl && pnl.transactionCount === 0 && (
            <div style={{ background: PANEL, border: `0.5px solid ${BORDER}`, borderRadius: 16, padding: 40, textAlign: 'center', backdropFilter: 'blur(8px)' }}>
              <p style={{ color: INK, fontSize: 15, fontWeight: 600, margin: 0 }}>No data yet</p>
              <p style={{ color: SUB, fontSize: 13, margin: '8px 0 0' }}>Upload transactions from the dashboard first.</p>
            </div>
          )}

          {!loading && pnl && pnl.transactionCount > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              <StatCard
                label="This week's transactions"
                value={String(recentTransactions.length)}
                sub={recentTransactions.length === 0 ? 'No activity in last 7 days' : `across last 7 days`}
              />
              <StatCard
                label="This week's net"
                value={(() => {
                  const inc = recentTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
                  const exp = recentTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
                  const net = inc - exp
                  return (net >= 0 ? '+$' : '-$') + Math.abs(net).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                })()}
                sub="income minus expenses"
                valueColor={(() => {
                  const inc = recentTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
                  const exp = recentTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
                  return inc - exp >= 0 ? GREEN_TEXT : RED_TEXT
                })()}
              />
            </div>
          )}

          {!loading && pnl && pnl.transactionCount > 0 && (
            <div style={{ background: PANEL_AI, border: `0.5px solid ${BORDER_AI}`, borderRadius: 16, padding: '24px 26px', backdropFilter: 'blur(8px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 22 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: GREEN_FILL, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GREEN_TEXT, fontSize: 15 }}>✦</div>
                <span style={{ color: INK, fontSize: 14, fontWeight: 600 }}>AI Weekly Digest</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: FAINT }}>Powered by Claude</span>
              </div>

              {!digest && !digestLoading && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <p style={{ color: SUB, fontSize: 14, margin: '0 0 16px' }}>
                    Get a full AI breakdown of your week — what happened, what to watch, and what to do next.
                  </p>
                  <button
                    onClick={generateDigest}
                    style={{ background: '#fff', color: '#0A0A0B', border: 'none', padding: '11px 22px', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Generate digest
                  </button>
                </div>
              )}

              {digestLoading && (
                <div style={{ padding: '24px 0' }}>
                  <p style={{ color: SUB, margin: '0 0 16px' }}>Analyzing your week…</p>
                  {['WEEK IN REVIEW', 'TREND', 'WATCH OUT', 'WIN', 'THIS WEEK'].map((label) => (
                    <div key={label} style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                      <div style={{ width: 4, borderRadius: 2, background: BORDER, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 10, width: 80, background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginBottom: 8 }} />
                        <div style={{ height: 14, width: '90%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, marginBottom: 4 }} />
                        <div style={{ height: 14, width: '60%', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {digest && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <DigestRow bar={GREEN_TEXT} labelColor={GREEN_TEXT} label="WEEK IN REVIEW" text={digest.weekInReview} color={INK} />
                  <DigestRow bar={BLUE_TEXT} labelColor={BLUE_TEXT} label="TREND" text={digest.trend} color="#C2C8D2" />
                  <DigestRow bar={AMBER} labelColor={AMBER} label="WATCH OUT" text={digest.watchOut} color={INK} />
                  <DigestRow bar={GREEN_TEXT} labelColor={GREEN_TEXT} label="WIN" text={digest.win} color="#C2C8D2" />
                  <DigestRow bar={BLUE_TEXT} labelColor={BLUE_TEXT} label="THIS WEEK" text={digest.thisWeek} color={INK} />
                  {generatedAt && (
                    <p style={{ color: FAINT, fontSize: 11, margin: 0 }}>
                      Generated {generatedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {error && <p style={{ color: RED_TEXT, fontSize: 14 }}>⚠️ {error}</p>}
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

function StatCard({ label, value, sub, valueColor }: { label: string; value: string; sub: string; valueColor?: string }) {
  return (
    <div style={{ background: 'rgba(20,20,23,0.72)', border: '0.5px solid #23232A', borderRadius: 12, padding: '16px 18px', backdropFilter: 'blur(8px)' }}>
      <p style={{ fontSize: 11, color: '#5C5E66', fontWeight: 600, letterSpacing: 0.4, margin: '0 0 8px' }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: 24, fontWeight: 600, margin: 0, color: valueColor ?? '#F4F5F7' }}>{value}</p>
      <p style={{ fontSize: 12, color: '#9A9CA3', margin: '4px 0 0' }}>{sub}</p>
    </div>
  )
}

function DigestRow({ bar, labelColor, label, text, color }: { bar: string; labelColor: string; label: string; text: string; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ width: 4, borderRadius: 2, background: bar, flexShrink: 0 }} />
      <div>
        <p style={{ color: labelColor, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, margin: 0 }}>{label}</p>
        <p style={{ color, fontSize: 15, margin: '5px 0 0', lineHeight: 1.6 }}>{text}</p>
      </div>
    </div>
  )
}
