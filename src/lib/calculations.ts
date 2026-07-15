// Pure, deterministic P&L math. No AI, no randomness.
// Every number MargoiQ shows comes from here.

export type Transaction = {
  txn_date: string
  description: string
  amount: number
  type: 'income' | 'expense'
}

export type PnL = {
  revenue: number
  expenses: number
  netProfit: number
  profitMargin: number // percentage, e.g. 22 means 22%
  biggestExpense: { category: string; amount: number } | null
  transactionCount: number
}

// Group similar expenses by a simple category derived from the description.
// e.g. "Fuel" on different days all roll up into one "Fuel" bucket.
function categorize(description: string): string {
  const d = description.toLowerCase()
  if (d.includes('fuel') || d.includes('gas')) return 'Fuel'
  if (d.includes('wage') || d.includes('payroll') || d.includes('salary'))
    return 'Wages'
  if (d.includes('insurance')) return 'Insurance'
  if (d.includes('repair') || d.includes('maintenance')) return 'Repairs'
  if (d.includes('rent') || d.includes('lease')) return 'Rent'
  if (d.includes('software') || d.includes('subscription') || d.includes('app'))
    return 'Software'
  if (d.includes('phone') || d.includes('dispatch')) return 'Phone & Dispatch'
  if (d.includes('supplies') || d.includes('inventory')) return 'Supplies'
  // Fall back to the raw description if nothing matches
  return description
}

export function calculatePnL(transactions: Transaction[]): PnL {
  let revenue = 0
  let expenses = 0
  const expenseByCategory: Record<string, number> = {}

  for (const t of transactions) {
    if (t.type === 'income') {
      revenue += t.amount
    } else {
      expenses += t.amount
      const cat = categorize(t.description)
      expenseByCategory[cat] = (expenseByCategory[cat] ?? 0) + t.amount
    }
  }

  const netProfit = revenue - expenses
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

  // Find the single largest expense category
  let biggestExpense: { category: string; amount: number } | null = null
  for (const [category, amount] of Object.entries(expenseByCategory)) {
    if (!biggestExpense || amount > biggestExpense.amount) {
      biggestExpense = { category, amount }
    }
  }

  return {
    revenue: round(revenue),
    expenses: round(expenses),
    netProfit: round(netProfit),
    profitMargin: round(profitMargin),
    biggestExpense: biggestExpense
      ? { category: biggestExpense.category, amount: round(biggestExpense.amount) }
      : null,
    transactionCount: transactions.length,
  }
}

// Round to 2 decimal places to avoid floating-point noise like 4180.0000001
function round(n: number): number {
  return Math.round(n * 100) / 100
}

// ---- Month-aware analysis (for trends, charts, and time-based AI) ----

export type MonthlyPnL = {
  month: string        // "2026-01"
  label: string        // "Jan 2026"
  revenue: number
  expenses: number
  netProfit: number
  profitMargin: number
  transactionCount: number
}

// Turn a flat list of transactions into one PnL summary per month,
// sorted oldest → newest. Reuses calculatePnL so the math stays identical.
export function calculateMonthly(transactions: Transaction[]): MonthlyPnL[] {
  // Group transactions by their "YYYY-MM" prefix
  const byMonth: Record<string, Transaction[]> = {}
  for (const t of transactions) {
    const key = t.txn_date.slice(0, 7) // "2026-01-15" -> "2026-01"
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(t)
  }

  const months = Object.keys(byMonth).sort() // chronological

  return months.map((month) => {
    const pnl = calculatePnL(byMonth[month])
    return {
      month,
      label: monthLabel(month),
      revenue: pnl.revenue,
      expenses: pnl.expenses,
      netProfit: pnl.netProfit,
      profitMargin: pnl.profitMargin,
      transactionCount: pnl.transactionCount,
    }
  })
}

// "2026-01" -> "Jan 2026"
function monthLabel(month: string): string {
  const [year, m] = month.split('-')
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const idx = parseInt(m, 10) - 1
  return `${names[idx] ?? m} ${year}`
}