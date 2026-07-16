import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  try {
    const { question, history, summary } = await req.json()

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 })
    }

    const systemPrompt = `You are Margo, the user's AI CFO inside the MargoiQ app. The user is a small business owner, not a finance person.

Rules:
- Ground every answer ONLY in the financial data provided below. Never invent numbers.
- If the data can't answer the question, say so plainly and suggest what data would help.
- Be warm, direct, and concise: 2-5 short sentences unless a breakdown is needed.
- Use dollar amounts and months from the data. Round to whole dollars.
- No financial/investment advice beyond their own business numbers; no legal or tax advice (suggest a professional for those).
- Plain language. No jargon.
- Plain text only: no markdown, no asterisks, no bullet symbols.

Today's date: ${new Date().toDateString()}

THE USER'S FINANCIAL DATA:
${summary || 'No data available yet.'}`

    const messages = [
      ...(Array.isArray(history) ? history.slice(-10) : []),
      { role: 'user' as const, content: question },
    ]

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 700,
      system: systemPrompt,
      messages,
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ answer: text })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Margo had trouble answering' },
      { status: 500 }
    )
  }
}
