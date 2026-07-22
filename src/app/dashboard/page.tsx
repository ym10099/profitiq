'use client'

import { useState, useEffect, useRef } from 'react'
import Papa from 'papaparse'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { calculatePnL, calculateMonthly, type Transaction, type PnL, type MonthlyPnL } from '@/lib/calculations'
import ProfitTrend from '@/components/ProfitTrend'
import ExpenseDonut from '@/components/ExpenseDonut'
import MargoChat from '@/components/MargoChat'

type Insight = { number: string; reason: string; action: string }

const GLOW = '#000000'
const PANEL = '#0E0E13'
const PANEL_AI = 'rgba(12,15,13,0.72)'
const BORDER = '#2B2B35'
const BORDER_AI = '#1B4030'
const INK = '#F4F5F7'
const SUB = '#9A9CA3'
const FAINT = '#5C5E66'

const GREEN_FILL = '#0E2A1C'; const GREEN_BORDER = '#1F5C3E'; const GREEN_TEXT = '#3FD98A'
const RED_FILL = '#2A1116'; const RED_BORDER = '#5C2230'; const RED_TEXT = '#F2607A'
const BLUE_TEXT = '#3B82F6'
const AMBER = '#FBBF24'

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()

  const [pnl, setPnl] = useState<PnL | null>(null)
  const [monthly, setMonthly] = useState<MonthlyPnL[]>([])
  const [allTxns, setAllTxns] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [parsedRows, setParsedRows] = useState<Transaction[]>([])
  const [insight, setInsight] = useState<Insight | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)

  async function loadData() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('transactions')
      .select('txn_date, description, amount, type')
    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }
    const txns = (data ?? []) as Transaction[]
    setPnl(calculatePnL(txns))
    setMonthly(calculateMonthly(txns))
    setAllTxns(txns)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function getInsight() {
    if (!pnl) return
    setInsightLoading(true)
    setInsight(null)
    setError('')
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pnl, monthly }),
      })
      const data = await res.json()
      if (data.error) setError(`AI error: ${data.error}`)
      else setInsight(data.insight)
    } catch (err: any) {
      setError(`AI request failed: ${err.message}`)
    }
    setInsightLoading(false)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError('')
    setStatus('')
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        try {
          const parsed: Transaction[] = (results.data as any[]).map((r, i) => {
            const amount = parseFloat(r.amount)
            if (!r.date || !r.description || isNaN(amount) || !r.type)
              throw new Error(`Row ${i + 2} is missing or has invalid data`)
            if (r.type !== 'income' && r.type !== 'expense')
              throw new Error(`Row ${i + 2}: type must be "income" or "expense"`)
            return {
              txn_date: r.date.trim(),
              description: r.description.trim(),
              amount,
              type: r.type.trim() as 'income' | 'expense',
            }
          })
          setParsedRows(parsed)
          setStatus(`Parsed ${parsed.length} transactions. Click Save to store them.`)
        } catch (err: any) {
          setError(err.message)
          setParsedRows([])
        }
      },
      error: (err: any) => setError(err.message),
    })
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setStatus('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in to save. Please log in again.')
      setSaving(false)
      return
    }
    const { data: existing } = await supabase
      .from('transactions')
      .select('txn_date, description, amount, type')
      .eq('user_id', user.id)
    const seen = new Set(
      (existing ?? []).map((r: any) => `${r.txn_date}|${r.description}|${r.amount}|${r.type}`)
    )
    const newRows = parsedRows.filter(
      (r) => !seen.has(`${r.txn_date}|${r.description}|${r.amount}|${r.type}`)
    )
    const skipped = parsedRows.length - newRows.length
    if (newRows.length === 0) {
      setStatus(`All ${parsedRows.length} transactions are already saved. Nothing new to add.`)
      setParsedRows([])
      setSaving(false)
      return
    }
    const records = newRows.map((r) => ({
      user_id: user.id,
      txn_date: r.txn_date,
      description: r.description,
      amount: r.amount,
      type: r.type,
      source: 'csv',
    }))
    const { error: insertError } = await supabase.from('transactions').insert(records)
    if (insertError) setError(`Save failed: ${insertError.message}`)
    else {
      setStatus(
        skipped > 0
          ? `Saved ${newRows.length} new transactions. Skipped ${skipped} duplicates.`
          : `Saved ${newRows.length} transactions.`
      )
      setParsedRows([])
      setInsight(null)
      await loadData()
    }
    setSaving(false)
  }

  async function handleClearAll() {
    const ok = window.confirm('Delete ALL your saved transactions? This cannot be undone.')
    if (!ok) return
    setError('')
    setStatus('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in to clear data. Please log in again.')
      return
    }
    const { error: delError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', user.id)
    if (delError) setError(`Clear failed: ${delError.message}`)
    else {
      setStatus('All transactions cleared.')
      setInsight(null)
      await loadData()
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const money = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

  const profitable = pnl ? pnl.netProfit >= 0 : true

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: GLOW, fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <Sidebar active="Dashboard" />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: INK }}>Dashboard</p>
            <p style={{ fontSize: 12, color: FAINT, margin: 0 }}>Your profit at a glance</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={handleClearAll} style={{ fontSize: 13, background: 'transparent', color: SUB, border: `1px solid ${BORDER}`, padding: '8px 14px', borderRadius: 9, fontWeight: 500, cursor: 'pointer' }}>
              Clear data
            </button>
            <label style={{ cursor: 'pointer' }}>
              <span style={{ display: 'inline-block', fontSize: 13, background: '#fff', color: '#0A0A0B', padding: '8px 14px', borderRadius: 9, fontWeight: 600 }}>
                Upload CSV
              </span>
              <input type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 880 }}>
          {loading && <p style={{ color: SUB }}>Loading your numbers…</p>}

          {!loading && pnl && pnl.transactionCount > 0 && (
            <>
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 26, backdropFilter: 'blur(8px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: SUB, fontWeight: 500 }}>Net profit</span>
                  <Pill
                    text={profitable ? 'Making money' : 'Losing money'}
                    fill={profitable ? GREEN_FILL : RED_FILL}
                    border={profitable ? GREEN_BORDER : RED_BORDER}
                    color={profitable ? GREEN_TEXT : RED_TEXT}
                  />
                </div>
                <CountUpNumber value={pnl.netProfit} />
                <p style={{ color: SUB, fontSize: 14, margin: '10px 0 0' }}>
                  <span style={{ color: profitable ? GREEN_TEXT : RED_TEXT }}>{pnl.profitMargin}%</span> margin overall
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <MetricCard label="Revenue" value={money(pnl.revenue)} dot={GREEN_TEXT} />
                <MetricCard label="Expenses" value={money(pnl.expenses)} dot={RED_TEXT} />
                <MetricCard
                  label="Biggest expense"
                  value={pnl.biggestExpense ? pnl.biggestExpense.category : '—'}
                  sub={pnl.biggestExpense ? money(pnl.biggestExpense.amount) : ''}
                  dot={AMBER}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, alignItems: 'stretch' }}>
                <ProfitTrend data={monthly} transactions={allTxns} />
                <ExpenseDonut />
              </div>

              <div style={{ background: PANEL_AI, border: `1px solid ${BORDER_AI}`, borderRadius: 16, padding: '22px 24px', backdropFilter: 'blur(8px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: GREEN_FILL, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GREEN_TEXT, fontSize: 15 }}>✦</div>
                  <span style={{ color: INK, fontSize: 14, fontWeight: 600 }}>Your AI CFO</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: FAINT }}>Powered by Claude</span>
                </div>
                {!insight && !insightLoading && (
                  <button onClick={getInsight} style={{ background: '#fff', color: '#0A0A0B', border: 'none', padding: '11px 20px', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    Get AI insight
                  </button>
                )}
                {insightLoading && <p style={{ color: SUB, margin: 0 }}>Analyzing your numbers…</p>}
                {insight && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <TypingRow bar={GREEN_TEXT} labelColor={GREEN_TEXT} label="THE NUMBER" text={insight.number} color={INK} delay={0} />
                    <TypingRow bar="#33476B" labelColor={SUB} label="WHY" text={insight.reason} color="#C2C8D2" delay={1} />
                    <TypingRow bar={BLUE_TEXT} labelColor={BLUE_TEXT} label="RECOMMENDED" text={insight.action} color={INK} delay={2} />
                    <button onClick={getInsight} style={{ alignSelf: 'flex-start', background: 'transparent', color: SUB, border: `1px solid ${BORDER}`, padding: '7px 13px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                      Regenerate
                    </button>
                  </div>
                )}
              </div>

              <p style={{ color: FAINT, fontSize: 12 }}>Based on {pnl.transactionCount} transactions across {monthly.length} month{monthly.length === 1 ? '' : 's'}</p>
            </>
          )}

          {!loading && pnl && pnl.transactionCount > 0 && <MargoChat />}
          {!loading && pnl && pnl.transactionCount === 0 && (
            <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 40, textAlign: 'center', backdropFilter: 'blur(8px)' }}>
              <p style={{ color: INK, fontSize: 16, fontWeight: 600, margin: 0 }}>No transactions yet</p>
              <p style={{ color: SUB, fontSize: 14, margin: '8px 0 0' }}>Download your transactions from your bank's website (look for “Export” or “Download” and choose CSV format), then click Upload CSV above. MargoiQ instantly shows your income, expenses, and profit. Works with Chase, Bank of America, Wells Fargo, QuickBooks, and most banks.</p>
            </div>
          )}

          {status && <p style={{ color: GREEN_TEXT, fontSize: 14 }}>{status}</p>}
          {error && <p style={{ color: RED_TEXT, fontSize: 14 }}>⚠️ {error}</p>}
          {parsedRows.length > 0 && (
            <button onClick={handleSave} disabled={saving} style={{ alignSelf: 'flex-start', background: '#fff', color: '#0A0A0B', border: 'none', padding: '11px 20px', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}>
              {saving ? 'Saving…' : `Save ${parsedRows.length} transactions`}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}

function Pill({ text, fill, border, color }: { text: string; fill: string; border: string; color: string }) {
  return (
    <span style={{ fontSize: 11, background: fill, color, border: `1px solid ${border}`, padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>
      {text}
    </span>
  )
}

function CountUpNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const duration = 1100
    let startTime: number | null = null
    function tick(ts: number) {
      if (startTime === null) startTime = ts
      const p = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(value * eased)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
      else setDisplay(value)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value])

  const text = (display < 0 ? '−$' : '$') + Math.abs(Math.round(display)).toLocaleString('en-US')

  return (
    <p style={{ color: '#F4F5F7', fontSize: 48, fontWeight: 600, margin: 0, letterSpacing: -2 }}>
      {text}<span style={{ color: '#5C5E66', fontSize: 26 }}>.00</span>
    </p>
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

function MetricCard({ label, value, sub, dot }: { label: string; value: string; sub?: string; dot: string }) {
  return (
    <div style={{ background: '#0E0E13', border: '1px solid #2B2B35', borderRadius: 12, padding: '16px 18px', backdropFilter: 'blur(8px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} />
        <span style={{ fontSize: 12, color: '#9A9CA3' }}>{label}</span>
      </div>
      <p style={{ fontSize: 23, fontWeight: 600, margin: 0, color: '#F4F5F7' }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: '#5C5E66', margin: '2px 0 0' }}>{sub}</p>}
    </div>
  )
}

function TypingRow({ bar, labelColor, label, text, color, delay }: { bar: string; labelColor: string; label: string; text: string; color: string; delay: number }) {
  const [shown, setShown] = useState('')

  useEffect(() => {
    setShown('')
    let i = 0
    let timer: ReturnType<typeof setTimeout>
    const startDelay = setTimeout(() => {
      function type() {
        i++
        setShown(text.slice(0, i))
        if (i < text.length) timer = setTimeout(type, 16)
      }
      type()
    }, delay * 450)
    return () => { clearTimeout(startDelay); clearTimeout(timer) }
  }, [text, delay])

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ width: 4, borderRadius: 2, background: bar, flexShrink: 0 }} />
      <div>
        <p style={{ color: labelColor, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, margin: 0 }}>{label}</p>
        <p style={{ color, fontSize: 15, margin: '4px 0 0', lineHeight: 1.55, minHeight: 22 }}>{shown}</p>
      </div>
    </div>
  )
}
