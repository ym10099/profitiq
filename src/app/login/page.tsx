'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    setMessage('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else setMessage('Account created. You can now log in.')
      setMode('login')
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) setMessage(error.message)
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1115' }}>
      <div style={{ width: 360, padding: 32, background: '#1a1d24', borderRadius: 16, border: '1px solid #2a2e37' }}>
<img src="/logo.png" alt="MargoIQ" style={{ height: 40 }} />
        <p style={{ color: '#8a909c', fontSize: 14, marginTop: 4, marginBottom: 24 }}>
          {mode === 'login' ? 'Log in to your AI CFO' : 'Create your account'}
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        <button onClick={handleSubmit} disabled={loading} style={buttonStyle}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>

        {message && (
          <p style={{ color: '#e2b340', fontSize: 13, marginTop: 12 }}>{message}</p>
        )}

        <p style={{ color: '#8a909c', fontSize: 13, marginTop: 20, textAlign: 'center' }}>
          {mode === 'login' ? "No account? " : 'Already have one? '}
          <span
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            style={{ color: '#5b8def', cursor: 'pointer' }}
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </span>
        </p>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  marginBottom: 12,
  background: '#0f1115',
  border: '1px solid #2a2e37',
  borderRadius: 8,
  color: '#fff',
  fontSize: 14,
  boxSizing: 'border-box',
}

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px',
  background: '#5b8def',
  border: 'none',
  borderRadius: 8,
  color: '#fff',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: 4,
}