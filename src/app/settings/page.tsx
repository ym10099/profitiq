'use client'

import { useState, useEffect } from 'react'
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

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email)
    })
  }, [])

  async function changePassword() {
    setMessage('')
    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters.')
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setMessage(error.message)
    else {
      setMessage('Password updated.')
      setNewPassword('')
    }
    setSaving(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: GLOW, fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <aside style={{ width: 200, borderRight: '0.5px solid ' + BORDER, padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 28, padding: '0 6px' }}>
          <img src="/logo.png" alt="MargoiQ" style={{ height: 26 }} />
        </div>
        <NavItem label="Dashboard" href="/dashboard" />
        <NavItem label="Close out night" href="/close-out" />
        <NavItem label="Purchase orders" href="/purchase-orders" />
        <NavItem label="Projects" href="/projects" />
        <NavItem label="Transactions" href="/transactions" />
        <NavItem label="Weekly digest" href="/weekly-digest" />
        <NavItem label="Settings" href="/settings" active />
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: '9px 12px', borderRadius: 9, color: SUB, fontSize: 14 }}>
            Log out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1 }}>
        <div style={{ padding: '16px 28px', borderBottom: '0.5px solid ' + BORDER }}>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: INK }}>Settings</p>
          <p style={{ fontSize: 12, color: FAINT, margin: 0 }}>Your account</p>
        </div>

        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520 }}>
          <div style={{ background: PANEL, border: '0.5px solid ' + BORDER, borderRadius: 14, padding: 18 }}>
            <p style={{ fontSize: 11, color: FAINT, fontWeight: 600, letterSpacing: 0.5, margin: '0 0 8px' }}>ACCOUNT EMAIL</p>
            <p style={{ color: INK, fontSize: 15, margin: 0 }}>{email || 'Loading…'}</p>
          </div>

          <div style={{ background: PANEL, border: '0.5px solid ' + BORDER, borderRadius: 14, padding: 18 }}>
            <p style={{ fontSize: 11, color: FAINT, fontWeight: 600, letterSpacing: 0.5, margin: '0 0 12px' }}>CHANGE PASSWORD</p>
            <input
              type="password"
              placeholder="New password (6+ characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', background: '#141417', border: '0.5px solid ' + BORDER, borderRadius: 9, padding: '10px 12px', color: INK, fontSize: 14, outline: 'none', marginBottom: 10 }}
            />
            <button onClick={changePassword} disabled={saving} style={{ background: '#3B82F6', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              {saving ? 'Saving…' : 'Update password'}
            </button>
            {message && (
              <p style={{ color: message === 'Password updated.' ? GREEN_TEXT : RED_TEXT, fontSize: 13, margin: '10px 0 0' }}>{message}</p>
            )}
          </div>
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
