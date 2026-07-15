'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const GLOW = 'radial-gradient(120% 80% at 50% 100%, #16326B 0%, #0E2149 35%, #0A1226 60%, #0A0A0B 82%)'
const PANEL = 'rgba(20,20,23,0.72)'
const PANEL_AI = 'rgba(12,15,13,0.72)'
const BORDER = '#23232A'
const BORDER_AI = '#1B4030'
const INK = '#F4F5F7'
const SUB = '#9A9CA3'
const FAINT = '#5C5E66'
const GREEN_FILL = '#0E2A1C'; const GREEN_TEXT = '#3FD98A'
const RED_TEXT = '#F2607A'
const BLUE_TEXT = '#3B82F6'

type LineItem = { description: string; quantity: number | null; price: number | null }
type POResult = {
  vendor: string | null
  po_number: string | null
  total: number | null
  po_date: string | null
  line_items: LineItem[]
  summary: string
}
type SavedPO = POResult & { id: string; file_name: string; created_at: string }

export default function PurchaseOrdersPage() {
  const supabase = createClient()
  const router = useRouter()

  const [saved, setSaved] = useState<SavedPO[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<POResult | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')

  async function loadPOs() {
    const { data } = await supabase
      .from('purchase_orders')
      .select('*')
      .order('created_at', { ascending: false })
    setSaved((data ?? []) as SavedPO[])
    setLoading(false)
  }

  useEffect(() => { loadPOs() }, [])

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const res = reader.result as string
        resolve(res.split(',')[1]) // strip the "data:...;base64," prefix
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setResult(null)
    setFileName(file.name)
    setAnalyzing(true)

    try {
      const base64 = await fileToBase64(file)
      const res = await fetch('/api/analyze-po', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData: base64, mediaType: file.type }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setResult(data.result)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze the file.')
    }
    setAnalyzing(false)
    e.target.value = '' // reset so the same file can be re-picked
  }

  async function savePO() {
    if (!result) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in.')
      return
    }
    const { error: insertError } = await supabase.from('purchase_orders').insert({
      user_id: user.id,
      vendor: result.vendor,
      po_number: result.po_number,
      total: result.total,
      po_date: result.po_date,
      line_items: result.line_items,
      summary: result.summary,
      file_name: fileName,
    })
    if (insertError) {
      setError(`Save failed: ${insertError.message}`)
      return
    }
    setResult(null)
    setFileName('')
    await loadPOs()
  }

  async function deletePO(id: string) {
    const ok = window.confirm('Delete this purchase order?')
    if (!ok) return
    await supabase.from('purchase_orders').delete().eq('id', id)
    await loadPOs()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const money = (n: number | null) =>
    n == null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: GLOW, fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: 200, background: 'transparent', borderRight: `0.5px solid ${BORDER}`, padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 28, padding: '0 6px' }}>
          <img src="/logo.png" alt="MargoiQ" style={{ height: 26 }} />
        </div>
        <NavItem label="Dashboard" href="/dashboard" />
        <NavItem label="Close out night" href="/close-out" />
        <NavItem label="Purchase orders" href="/purchase-orders" active />
        <NavItem label="Projects" href="/projects" />
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
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: INK }}>Purchase orders</p>
            <p style={{ fontSize: 12, color: FAINT, margin: 0 }}>Upload a PO and let AI pull out what matters</p>
          </div>
          <label style={{ cursor: analyzing ? 'default' : 'pointer' }}>
            <span style={{ display: 'inline-block', fontSize: 13, background: '#fff', color: '#0A0A0B', padding: '8px 16px', borderRadius: 9, fontWeight: 600, opacity: analyzing ? 0.6 : 1 }}>
              {analyzing ? 'Analyzing…' : 'Upload PO'}
            </span>
            <input type="file" accept="application/pdf,image/*" onChange={handleFile} disabled={analyzing} style={{ display: 'none' }} />
          </label>
        </div>

        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 760 }}>

          {analyzing && (
            <div style={{ background: PANEL_AI, border: `0.5px solid ${BORDER_AI}`, borderRadius: 16, padding: '22px 24px', backdropFilter: 'blur(8px)' }}>
              <p style={{ color: GREEN_TEXT, fontSize: 14, fontWeight: 600, margin: 0 }}>✦ Reading {fileName}…</p>
              <p style={{ color: SUB, fontSize: 13, margin: '6px 0 0' }}>Extracting vendor, totals, and line items.</p>
            </div>
          )}

          {error && <p style={{ color: RED_TEXT, fontSize: 14 }}>⚠️ {error}</p>}

          {/* Fresh analysis result — review before saving */}
          {result && !analyzing && (
            <div style={{ background: PANEL_AI, border: `0.5px solid ${BORDER_AI}`, borderRadius: 16, padding: '22px 24px', backdropFilter: 'blur(8px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: GREEN_FILL, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GREEN_TEXT, fontSize: 15 }}>✦</div>
                <span style={{ color: INK, fontSize: 14, fontWeight: 600 }}>AI read your PO</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: FAINT }}>{fileName}</span>
              </div>

              <p style={{ color: '#C2C8D2', fontSize: 15, lineHeight: 1.6, margin: '0 0 18px' }}>{result.summary}</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
                <Field label="Vendor" value={result.vendor ?? '—'} />
                <Field label="PO Number" value={result.po_number ?? '—'} />
                <Field label="Total" value={money(result.total)} highlight />
                <Field label="Date" value={result.po_date ?? '—'} />
              </div>

              {result.line_items && result.line_items.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <p style={{ fontSize: 11, color: FAINT, fontWeight: 600, letterSpacing: 0.5, margin: '0 0 8px' }}>LINE ITEMS</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {result.line_items.map((it, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#141417', borderRadius: 8, border: `0.5px solid ${BORDER}`, fontSize: 13 }}>
                        <span style={{ color: INK }}>
                          {it.quantity ? `${it.quantity}× ` : ''}{it.description}
                        </span>
                        <span style={{ color: SUB }}>{it.price != null ? money(it.price) : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={savePO} style={{ background: '#fff', color: '#0A0A0B', border: 'none', padding: '11px 20px', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Save to my POs
                </button>
                <button onClick={() => { setResult(null); setFileName('') }} style={{ background: 'transparent', color: SUB, border: `0.5px solid ${BORDER}`, padding: '11px 20px', borderRadius: 9, fontSize: 14, cursor: 'pointer' }}>
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* Saved POs list */}
          {!loading && saved.length === 0 && !result && !analyzing && (
            <div style={{ background: PANEL, border: `0.5px solid ${BORDER}`, borderRadius: 16, padding: 40, textAlign: 'center', backdropFilter: 'blur(8px)' }}>
              <p style={{ color: INK, fontSize: 15, fontWeight: 600, margin: 0 }}>No purchase orders yet</p>
              <p style={{ color: SUB, fontSize: 13, margin: '8px 0 0' }}>Click "Upload PO" to analyze your first one — PDF or photo.</p>
            </div>
          )}

          {saved.length > 0 && (
            <>
              <p style={{ fontSize: 11, color: FAINT, fontWeight: 600, letterSpacing: 0.5, margin: '4px 0 0' }}>SAVED PURCHASE ORDERS</p>
              {saved.map((po) => (
                <div key={po.id} style={{ background: PANEL, border: `0.5px solid ${BORDER}`, borderRadius: 14, padding: '16px 18px', backdropFilter: 'blur(8px)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ color: INK, fontSize: 15, fontWeight: 600 }}>{po.vendor ?? 'Unknown vendor'}</span>
                        {po.po_number && <span style={{ fontSize: 11, color: BLUE_TEXT, background: '#0F1E33', border: '0.5px solid #234A7A', padding: '2px 8px', borderRadius: 20 }}>PO #{po.po_number}</span>}
                      </div>
                      <p style={{ color: SUB, fontSize: 13, margin: '0 0 8px', lineHeight: 1.5 }}>{po.summary}</p>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: FAINT }}>
                        <span>{po.po_date ?? 'No date'}</span>
                        <span>{po.line_items?.length ?? 0} line item{(po.line_items?.length ?? 0) === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ color: GREEN_TEXT, fontSize: 18, fontWeight: 600, margin: 0 }}>{money(po.total)}</p>
                      <button onClick={() => deletePO(po.id)} style={{ background: 'transparent', border: 'none', color: FAINT, cursor: 'pointer', fontSize: 12, marginTop: 6, padding: 2 }}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </>
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

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ background: '#141417', border: '0.5px solid #23232A', borderRadius: 10, padding: '12px 14px' }}>
      <p style={{ fontSize: 11, color: '#5C5E66', fontWeight: 600, letterSpacing: 0.4, margin: '0 0 4px' }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: highlight ? 18 : 15, fontWeight: 600, margin: 0, color: highlight ? '#3FD98A' : '#F4F5F7' }}>{value}</p>
    </div>
  )
}

