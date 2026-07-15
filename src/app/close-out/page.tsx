'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const GLOW = 'radial-gradient(120% 80% at 50% 100%, #16326B 0%, #0E2149 35%, #0A1226 60%, #0A0A0B 82%)'
const PANEL = 'rgba(20,20,23,0.72)'
const BORDER = '#23232A'
const INK = '#F4F5F7'
const SUB = '#9A9CA3'
const FAINT = '#5C5E66'
const GREEN_TEXT = '#3FD98A'
const RED_TEXT = '#F2607A'
const BLUE_TEXT = '#3B82F6'

const AAA_RATE = 38 // typical AAA flat rate — pre-fills when AAA is picked

type CallType = 'AAA' | 'private' | 'cash'
type Call = { id: number; type: CallType; amount: string; miles: string; note: string }

function emptyCall(id: number): Call {
  return { id, type: 'AAA', amount: '', miles: '', note: '' }
}

const TYPE_LABEL: Record<CallType, string> = { AAA: 'AAA', private: 'Private', cash: 'Cash' }
const TYPE_COLOR: Record<CallType, string> = { AAA: BLUE_TEXT, private: '#C69BFF', cash: GREEN_TEXT }

export default function CloseOutPage() {
  const supabase = createClient()
  const router = useRouter()

  const idRef = useRef(2)
  const [calls, setCalls] = useState<Call[]>([emptyCall(1)])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ count: number; total: number } | null>(null)

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const todayLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  const subtotal = calls.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)
  const totalMiles = calls.reduce((s, c) => s + (parseFloat(c.miles) || 0), 0)

  // Calls that are "real" (have an amount) — these are what get reviewed and saved
  const validCalls = calls.filter((c) => parseFloat(c.amount) > 0)

  // Totals broken down by type, for the review summary
  const byType = validCalls.reduce(
    (acc, c) => {
      acc[c.type] += parseFloat(c.amount)
      return acc
    },
    { AAA: 0, private: 0, cash: 0 } as Record<CallType, number>
  )

  function updateCall(id: number, patch: Partial<Call>) {
    setCalls((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const next = { ...c, ...patch }
        // If they pick AAA and haven't typed an amount yet, pre-fill the flat rate
        if (patch.type === 'AAA' && (c.amount === '' || c.amount === '0')) {
          next.amount = String(AAA_RATE)
        }
        return next
      })
    )
  }

  function addCall() {
    setCalls((prev) => [...prev, emptyCall(idRef.current++)])
  }

  function removeCall(id: number) {
    setCalls((prev) => (prev.length === 1 ? prev : prev.filter((c) => c.id !== id)))
  }

  function buildDescription(c: Call): string {
    const label = c.type === 'AAA' ? 'AAA call' : c.type === 'private' ? 'Private tow' : 'Cash job'
    const parts = [label]
    if (c.miles && parseFloat(c.miles) > 0) parts.push(`${c.miles} mi`)
    if (c.note.trim()) parts.push(c.note.trim())
    return parts.join(' — ')
  }

  async function closeOut() {
    setError('')
    const valid = calls.filter((c) => parseFloat(c.amount) > 0)
    if (valid.length === 0) {
      setError('Add at least one call with an amount before closing out.')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in. Please log in again.')
      setSaving(false)
      return
    }
    const records = valid.map((c) => ({
      user_id: user.id,
      txn_date: todayStr,
      description: buildDescription(c),
      amount: parseFloat(c.amount),
      type: 'income',
      source: 'nightly',
    }))
    const { error: insertError } = await supabase.from('transactions').insert(records)
    if (insertError) {
      setError(`Save failed: ${insertError.message}`)
      setSaving(false)
      return
    }
    const total = valid.reduce((s, c) => s + parseFloat(c.amount), 0)
    setDone({ count: valid.length, total })
    setCalls([emptyCall(idRef.current++)])
    setSaving(false)
  }

  const money = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: GLOW, fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: 200, background: 'transparent', borderRight: `0.5px solid ${BORDER}`, padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 28, padding: '0 6px' }}>
          <img src="/logo.png" alt="MargoiQ" style={{ height: 26 }} />
        </div>
        <NavItem label="Dashboard" href="/dashboard" />
        <NavItem label="Close out night" href="/close-out" active />
        <NavItem label="Purchase orders" href="/purchase-orders" />
        <NavItem label="Projects" href="/projects" />
        <NavItem label="Transactions" href="/transactions" />
        <NavItem label="Weekly digest" href="/weekly-digest" />
        <NavItem label="Settings" href="/settings" />
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
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: INK }}>Close out the night</p>
            <p style={{ fontSize: 12, color: FAINT, margin: 0 }}>{todayLabel} — log tonight's calls</p>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 640 }}>

          {done && (
            <div style={{ background: 'rgba(14,42,28,0.6)', border: `0.5px solid #1F5C3E`, borderRadius: 14, padding: '16px 20px', backdropFilter: 'blur(8px)' }}>
              <p style={{ color: GREEN_TEXT, fontSize: 15, fontWeight: 600, margin: 0 }}>
                Night closed out — {done.count} call{done.count === 1 ? '' : 's'}, {money(done.total)} logged
              </p>
              <p style={{ color: SUB, fontSize: 13, margin: '6px 0 0' }}>
                It's now in your numbers.{' '}
                <Link href="/dashboard" style={{ color: BLUE_TEXT, textDecoration: 'none' }}>View dashboard →</Link>
              </p>
            </div>
          )}

          {/* Running totals */}
          <div style={{ background: PANEL, border: `0.5px solid ${BORDER}`, borderRadius: 16, padding: '20px 24px', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{ fontSize: 12, color: SUB, fontWeight: 500, margin: 0 }}>Tonight so far</p>
              <p style={{ color: GREEN_TEXT, fontSize: 40, fontWeight: 600, margin: '4px 0 0', letterSpacing: -1.5 }}>
                {money(subtotal)}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 12, color: SUB, fontWeight: 500, margin: 0 }}>Total miles</p>
              <p style={{ color: INK, fontSize: 24, fontWeight: 600, margin: '4px 0 0' }}>{totalMiles || 0}</p>
            </div>
          </div>

          {/* Call rows */}
          {calls.map((c, i) => (
            <div key={c.id} style={{ background: PANEL, border: `0.5px solid ${BORDER}`, borderRadius: 14, padding: 16, backdropFilter: 'blur(8px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: FAINT, fontWeight: 600 }}>CALL {i + 1}</span>
                {calls.length > 1 && (
                  <button onClick={() => removeCall(c.id)} style={{ background: 'transparent', border: 'none', color: FAINT, cursor: 'pointer', fontSize: 16, padding: 2 }} title="Remove">×</button>
                )}
              </div>

              {/* Type selector */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {(['AAA', 'private', 'cash'] as CallType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => updateCall(c.id, { type: t })}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      background: c.type === t ? 'rgba(255,255,255,0.08)' : 'transparent',
                      color: c.type === t ? INK : SUB,
                      border: `0.5px solid ${c.type === t ? '#444' : BORDER}`,
                    }}
                  >
                    {t === 'AAA' ? 'AAA' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {/* Amount + miles */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: 11, color: FAINT, display: 'block', marginBottom: 4 }}>Amount</label>
                  <input
                    inputMode="decimal"
                    value={c.amount}
                    onChange={(e) => updateCall(c.id, { amount: e.target.value })}
                    placeholder="0.00"
                    style={{ width: '100%', background: '#141417', border: `0.5px solid ${BORDER}`, borderRadius: 9, padding: '10px 12px', color: INK, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: FAINT, display: 'block', marginBottom: 4 }}>Miles</label>
                  <input
                    inputMode="decimal"
                    value={c.miles}
                    onChange={(e) => updateCall(c.id, { miles: e.target.value })}
                    placeholder="0"
                    style={{ width: '100%', background: '#141417', border: `0.5px solid ${BORDER}`, borderRadius: 9, padding: '10px 12px', color: INK, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Note */}
              <input
                value={c.note}
                onChange={(e) => updateCall(c.id, { note: e.target.value })}
                placeholder="Note (optional) — e.g. Jeep on highway"
                style={{ width: '100%', background: '#141417', border: `0.5px solid ${BORDER}`, borderRadius: 9, padding: '10px 12px', color: INK, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          ))}

          {/* Add call */}
          <button
            onClick={addCall}
            style={{ background: 'transparent', border: `1px dashed ${BORDER}`, color: SUB, padding: '12px', borderRadius: 12, fontSize: 14, cursor: 'pointer', fontWeight: 500 }}
          >
            + Add another call
          </button>

          {/* ---- REVIEW SECTION: shows once at least one call has an amount ---- */}
          {validCalls.length > 0 && (
            <div style={{ background: PANEL, border: `0.5px solid ${BORDER}`, borderRadius: 16, padding: '18px 20px', backdropFilter: 'blur(8px)' }}>
              <p style={{ fontSize: 11, color: FAINT, fontWeight: 600, letterSpacing: 0.5, margin: '0 0 14px' }}>
                REVIEW TONIGHT'S CALLS
              </p>

              {/* Each valid call as a clean line */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {validCalls.map((c) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#141417', borderRadius: 10, border: `0.5px solid ${BORDER}` }}>
                    {/* Type badge */}
                    <span style={{ fontSize: 11, fontWeight: 600, color: TYPE_COLOR[c.type], background: 'rgba(255,255,255,0.05)', border: `0.5px solid ${BORDER}`, padding: '3px 9px', borderRadius: 20, flexShrink: 0 }}>
                      {TYPE_LABEL[c.type]}
                    </span>

                    {/* Miles + note */}
                    <span style={{ flex: 1, color: SUB, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.miles && parseFloat(c.miles) > 0 ? `${c.miles} mi` : ''}
                      {c.miles && parseFloat(c.miles) > 0 && c.note.trim() ? ' · ' : ''}
                      {c.note.trim()}
                    </span>

                    {/* Amount */}
                    <span style={{ color: GREEN_TEXT, fontSize: 15, fontWeight: 600, flexShrink: 0 }}>
                      {money(parseFloat(c.amount))}
                    </span>

                    {/* Delete this call */}
                    <button
                      onClick={() => removeCall(c.id)}
                      disabled={calls.length === 1}
                      style={{ background: 'transparent', border: 'none', color: FAINT, cursor: calls.length === 1 ? 'default' : 'pointer', fontSize: 16, padding: 2, flexShrink: 0, opacity: calls.length === 1 ? 0.3 : 1 }}
                      title="Remove this call"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Summary footer */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: `0.5px solid ${BORDER}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ color: SUB, fontSize: 13 }}>
                    {validCalls.length} call{validCalls.length === 1 ? '' : 's'} · {totalMiles || 0} mi
                  </span>
                  <span style={{ color: INK, fontSize: 15, fontWeight: 600 }}>{money(subtotal)}</span>
                </div>

                {/* Breakdown by type — only show types that have money */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(['AAA', 'private', 'cash'] as CallType[]).map((t) =>
                    byType[t] > 0 ? (
                      <span key={t} style={{ fontSize: 12, color: SUB, background: '#141417', border: `0.5px solid ${BORDER}`, padding: '4px 10px', borderRadius: 8 }}>
                        <span style={{ color: TYPE_COLOR[t], fontWeight: 600 }}>{TYPE_LABEL[t]}</span>
                        {' '}{money(byType[t])}
                      </span>
                    ) : null
                  )}
                </div>
              </div>
            </div>
          )}

          {error && <p style={{ color: RED_TEXT, fontSize: 14 }}>⚠️ {error}</p>}

          {/* Close out */}
          <button
            onClick={closeOut}
            disabled={saving}
            style={{ background: '#fff', color: '#0A0A0B', border: 'none', padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving…' : `Close out night — ${money(subtotal)}`}
          </button>
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
