'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DemoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = useState('')

  useEffect(() => {
    async function go() {
      const res = await fetch('/api/demo-credentials')
      const { email, password, error: credError } = await res.json()
      if (credError) { setError(credError); return }
      await supabase.auth.signOut()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/dashboard')
    }
    go()
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1115', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <p style={{ color: error ? '#F2607A' : '#9A9CA3', fontSize: 15 }}>
        {error || 'Loading the demo business…'}
      </p>
    </div>
  )
}
