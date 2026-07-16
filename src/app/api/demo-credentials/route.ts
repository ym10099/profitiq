import { NextResponse } from 'next/server'

export async function GET() {
  if (!process.env.DEMO_PASSWORD) {
    return NextResponse.json({ error: 'Demo not configured' })
  }
  return NextResponse.json({
    email: 'demo@margoiq.com',
    password: process.env.DEMO_PASSWORD,
  })
}
