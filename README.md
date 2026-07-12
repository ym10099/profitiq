# MargoIQ — an AI CFO for small businesses

MargoIQ is a web app that turns a small business's raw financial data into plain-English answers: *Am I making money? Why? What should I do next?* It's built for owners who can't afford a full-time CFO but still need to understand their numbers.

The core idea: a spreadsheet just adds up your numbers. MargoIQ adds them up, then uses an LLM to interpret the trend and recommend a concrete next action.

## What it does

- **CSV upload** — drop in transactions and get an instant profit-and-loss breakdown (revenue, expenses, net profit, margin, biggest expense category).
- **Month-over-month trend** — an area chart showing whether the business is climbing or sinking over time.
- **AI CFO insight** — the standout feature. Sends the calculated monthly trajectory to the Claude API, which returns a structured insight: the key number, why it's happening, and a recommended action.
- **PO Analyzer** — upload a PDF or photo of a purchase order and the Claude API extracts structured data (vendor, PO number, total, line items) plus a plain-English summary.
- **Nightly call logger ("Close out the night")** — a fast entry screen built for a real towing-company owner, so he can log each job at the end of his shift and see his nightly total instantly.
- **Projects** — track income, expenses, and net profit per project, so owners see exactly what each project makes them.
- **Weekly digest** — an AI-generated summary of the week's performance.

## How the Claude API integration works

The app never asks the LLM to do math. All financial calculations happen in a pure, deterministic TypeScript engine (`src/lib/calculations.ts`). The computed results are then passed to the Claude API, which is prompted to return a strict JSON structure that maps directly to the UI.

This separation matters: numbers stay accurate and reproducible, while the LLM does what it's good at — interpreting the data and giving forward-looking advice. The AI layers live in `src/app/api/insights/route.ts`, `src/app/api/digest/route.ts`, and `src/app/api/analyze-po/route.ts`.

## Tech stack

- **Framework:** Next.js 14 (App Router)
- **Database & auth:** Supabase (Postgres + Row Level Security)
- **AI:** Anthropic Claude API
- **Charts:** Recharts
- **CSV parsing:** PapaParse
- **Language:** TypeScript

## Running locally

```bash
npm install
npm run dev
```

Requires a `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `ANTHROPIC_API_KEY`.

## Status

Active MVP. Built solo as a hands-on project in AI-powered product development — from database schema and auth through the LLM integrations and UI.
