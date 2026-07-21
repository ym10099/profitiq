'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const PANEL = '#0E0E13'
const BORDER = '#2B2B35'
const INK = '#F4F5F7'
const SUB = '#9A9CA3'
const FAINT = '#5C5E66'
const BLUE = '#3B82F6'

type Msg = { role: 'user' | 'assistant'; content: string }

const GENERAL_STARTERS = [
  'How did I do last month?',
  'What is my biggest expense?',
  'Where can I save money?',
  'Explain my numbers like I am new to business',
]
const PROJECT_STARTERS = [
  'How is this project doing?',
  'What is the biggest cost on this job?',
  'How does this compare to my other jobs?',
]

export default function MargoChat({ projectId, projectName }: { projectId?: string; projectName?: string } = {}) {
  const supabase = createClient()
  const [summary, setSummary] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const [{ data }, { data: projects }] = await Promise.all([
        supabase
          .from('transactions')
          .select('txn_date, description, amount, type, project_id')
          .order('txn_date', { ascending: true }),
        supabase.from('projects').select('id, name'),
      ])
      if (!data || data.length === 0) {
        setSummary('The user has not uploaded any transactions yet.')
        return
      }
      const byMonth: Record<string, { income: number; expense: number }> = {}
      const byDesc: Record<string, number> = {}
      for (const t of data) {
        const m = t.txn_date.slice(0, 7)
        byMonth[m] = byMonth[m] || { income: 0, expense: 0 }
        if (t.type === 'income') byMonth[m].income += t.amount
        else {
          byMonth[m].expense += t.amount
          byDesc[t.description] = (byDesc[t.description] || 0) + t.amount
        }
      }
      const monthLines = Object.entries(byMonth)
        .map(([m, v]) => `${m}: income $${v.income.toFixed(0)}, expenses $${v.expense.toFixed(0)}, net $${(v.income - v.expense).toFixed(0)}`)
        .join('\n')
      const topExpenses = Object.entries(byDesc)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([d, v]) => `${d}: $${v.toFixed(0)}`)
        .join('\n')
      let projectLines = 'No projects created yet.'
      if (projects && projects.length > 0) {
        projectLines = projects
          .map((pr) => {
            const txns = data.filter((t) => t.project_id === pr.id)
            const inc = txns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
            const exp = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
            return `${pr.name}: income $${inc.toFixed(0)}, expenses $${exp.toFixed(0)}, profit $${(inc - exp).toFixed(0)} (${txns.length} transactions)`
          })
          .join('\n')
      }
      const unassigned = data.filter((t) => !t.project_id).length
      const focus = projectId && projectName ? `FOCUS: The user is currently viewing the project "${projectName}". Prioritize answering about this project unless asked otherwise.\n\n` : ''
      setSummary(`${focus}MONTHLY TOTALS:\n${monthLines}\n\nTOP EXPENSES (all time):\n${topExpenses}\n\nPROJECTS (per-job profit):\n${projectLines}\nUnassigned transactions: ${unassigned}\n\nTOTAL TRANSACTIONS: ${data.length}`)
    }
    load()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  async function ask(q: string) {
    if (!q.trim() || thinking) return
    const newMessages: Msg[] = [...messages, { role: 'user', content: q.trim() }]
    setMessages(newMessages)
    setInput('')
    setThinking(true)
    try {
      const res = await fetch('/api/margo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.trim(), history: messages, summary }),
      })
      const data = await res.json()
      setMessages([...newMessages, { role: 'assistant', content: data.answer || data.error || 'Sorry, I had trouble with that one.' }])
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, something went wrong. Try again.' }])
    }
    setThinking(false)
  }

  return (
    <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ color: INK, fontSize: 15, fontWeight: 600, margin: 0 }}>💬 Ask Margo</p>
        <p style={{ color: FAINT, fontSize: 11, margin: 0 }}>Your AI CFO — answers from your real numbers</p>
      </div>

      {messages.length === 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(projectId ? PROJECT_STARTERS : GENERAL_STARTERS).map((s) => (
            <button key={s} onClick={() => ask(s)} style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: SUB, borderRadius: 20, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', background: m.role === 'user' ? BLUE : '#141417', color: m.role === 'user' ? '#fff' : INK, border: m.role === 'user' ? 'none' : `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 14px', fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
              {m.content}
            </div>
          ))}
          {thinking && (
            <div style={{ alignSelf: 'flex-start', color: FAINT, fontSize: 13 }}>Margo is looking at your numbers…</div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') ask(input) }}
          placeholder="Ask anything about your business finances…"
          style={{ flex: 1, background: '#141417', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '11px 14px', color: INK, fontSize: 14, outline: 'none' }}
        />
        <button onClick={() => ask(input)} disabled={thinking} style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: thinking ? 0.5 : 1 }}>
          Ask
        </button>
      </div>
    </div>
  )
}
