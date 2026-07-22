'use client'
import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { Transaction, MonthlyPnL } from '@/lib/calculations'

const PANEL = '#0E0E13'
const BORDER = '#2B2B35'
const INK = '#F4F5F7'
const SUB = '#9A9CA3'
const GREEN = '#3FD98A'
const RED = '#F2607A'

type Point = { label: string; netProfit: number; revenue: number; expenses: number }
type View = 'Daily' | 'Weekly' | 'Monthly'

function money(n: number) {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`
}

function shortDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function weekStart(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1 // Monday start
  d.setDate(d.getDate() - day)
  return d.toISOString().slice(0, 10)
}

function aggregate(txns: Transaction[], keyFn: (iso: string) => string): Point[] {
  const buckets: Record<string, { revenue: number; expenses: number }> = {}
  for (const t of txns) {
    const k = keyFn(t.txn_date)
    buckets[k] = buckets[k] || { revenue: 0, expenses: 0 }
    if (t.type === 'income') buckets[k].revenue += t.amount
    else buckets[k].expenses += t.amount
  }
  return Object.entries(buckets)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => ({ label: shortDate(k), netProfit: v.revenue - v.expenses, revenue: v.revenue, expenses: v.expenses }))
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0].payload as Point
  const positive = d.netProfit >= 0
  return (
    <div style={{ background: '#15151A', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 12px' }}>
      <p style={{ margin: 0, color: SUB, fontSize: 11 }}>{d.label}</p>
      <p style={{ margin: '4px 0 0', color: positive ? GREEN : RED, fontSize: 16, fontWeight: 600 }}>
        {money(d.netProfit)}
      </p>
      <p style={{ margin: '2px 0 0', color: SUB, fontSize: 11 }}>
        Rev {money(d.revenue)} · Exp {money(d.expenses)}
      </p>
    </div>
  )
}

export default function ProfitTrend({ data, transactions }: { data: MonthlyPnL[]; transactions?: Transaction[] }) {
  const [view, setView] = useState<View>('Monthly')

  const series: Point[] =
    view === 'Monthly' || !transactions
      ? data.map((m) => ({ label: m.label, netProfit: m.netProfit, revenue: m.revenue, expenses: m.expenses }))
      : view === 'Weekly'
      ? aggregate(transactions, weekStart)
      : aggregate(transactions, (iso) => iso)

  if (data.length < 2) {
    return (
      <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: '0 10px 30px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)', padding: 24 }}>
        <p style={{ color: INK, fontSize: 14, fontWeight: 600, margin: 0 }}>Profit trend</p>
        <p style={{ color: SUB, fontSize: 13, margin: '8px 0 0' }}>
          Upload at least two months of data to see your trend over time.
        </p>
      </div>
    )
  }

  const latest = series[series.length - 1]?.netProfit ?? 0
  const first = series[0]?.netProfit ?? 0
  const climbing = latest > first
  const best = series.reduce((a, b) => (b.netProfit > a.netProfit ? b : a))
  const worst = series.reduce((a, b) => (b.netProfit < a.netProfit ? b : a))
  const avg = series.reduce((s, d) => s + d.netProfit, 0) / series.length
  const periodWord = view === 'Monthly' ? 'month' : view === 'Weekly' ? 'week' : 'day'

  return (
    <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 18, padding: '22px 22px 14px', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', boxShadow: '0 10px 30px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color: INK, fontSize: 14, fontWeight: 600 }}>Profit trend</span>
        <span style={{ fontSize: 11, color: climbing ? GREEN : RED, fontWeight: 600 }}>
          {climbing ? '▲ trending up' : '▼ trending down'}
        </span>
        {transactions && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, background: '#15151A', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 3 }}>
            {(['Daily', 'Weekly', 'Monthly'] as View[]).map((v) => (
              <button key={v} onClick={() => setView(v)}
                style={{ background: view === v ? 'rgba(255,255,255,0.10)' : 'transparent', color: view === v ? INK : SUB, border: 'none', borderRadius: 8, padding: '5px 11px', fontSize: 12, fontWeight: view === v ? 600 : 400, cursor: 'pointer' }}>
                {v}
              </button>
            ))}
          </div>
        )}
      </div>
      <p style={{ color: SUB, fontSize: 12, margin: '0 0 12px' }}>
        Net profit by {periodWord}, {series[0]?.label} → {series[series.length - 1]?.label}
      </p>
      <div style={{ flex: 1, minHeight: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GREEN} stopOpacity={0.45} />
              <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" tick={{ fill: SUB, fontSize: 11 }} axisLine={{ stroke: BORDER }} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: SUB, fontSize: 11 }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => money(v)} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: BORDER }} />
          <ReferenceLine y={0} stroke={RED} strokeDasharray="3 3" strokeOpacity={0.5} />
          <Area type="monotone" dataKey="netProfit" stroke={GREEN} strokeWidth={2.5} fill="url(#profitFill)" dot={{ fill: GREEN, r: 3 }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ flex: 1 }}>
          <p style={{ color: SUB, fontSize: 11, margin: '0 0 3px' }}>Best {periodWord}</p>
          <p style={{ color: GREEN, fontSize: 14, fontWeight: 600, margin: 0 }}>{best.label} · {money(best.netProfit)}</p>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: SUB, fontSize: 11, margin: '0 0 3px' }}>Toughest {periodWord}</p>
          <p style={{ color: worst.netProfit < 0 ? RED : INK, fontSize: 14, fontWeight: 600, margin: 0 }}>{worst.label} · {money(worst.netProfit)}</p>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: SUB, fontSize: 11, margin: '0 0 3px' }}>Per-{periodWord} average</p>
          <p style={{ color: INK, fontSize: 14, fontWeight: 600, margin: 0 }}>{money(avg)}</p>
        </div>
      </div>
    </div>
  )
}
