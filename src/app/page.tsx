import Link from 'next/link'

const GLOW = 'radial-gradient(120% 80% at 50% 100%, #16326B 0%, #0E2149 35%, #0A1226 60%, #0A0A0B 82%)'
const PANEL = 'rgba(20,20,23,0.72)'
const BORDER = '#23232A'
const INK = '#F4F5F7'
const SUB = '#9A9CA3'
const FAINT = '#5C5E66'
const BLUE = '#3B82F6'

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: GLOW, fontFamily: 'Inter, system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Top nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 32px', borderBottom: `0.5px solid ${BORDER}`, maxWidth: 1100, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <img src="/logo.png" alt="MargoiQ" style={{ height: 30 }} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/login" style={{ color: SUB, fontSize: 14, textDecoration: 'none', padding: '9px 14px' }}>
            Log in
          </Link>
          <Link href="/login" style={{ background: BLUE, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', padding: '9px 18px', borderRadius: 9 }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 780, margin: '0 auto', padding: '90px 32px 60px', textAlign: 'center' }}>
        <p style={{ display: 'inline-block', fontSize: 12, color: BLUE, border: `0.5px solid ${BLUE}`, borderRadius: 20, padding: '4px 14px', margin: '0 0 22px', letterSpacing: 0.4 }}>
          YOUR AI CFO
        </p>
        <h1 style={{ color: INK, fontSize: 52, fontWeight: 700, margin: 0, lineHeight: 1.12, letterSpacing: -1 }}>
          Know exactly where your money goes
        </h1>
        <p style={{ color: SUB, fontSize: 18, lineHeight: 1.6, margin: '22px auto 34px', maxWidth: 560 }}>
          MargoiQ turns your raw transactions into clear profit numbers, AI-powered
          insights, and per-project P&amp;L — the financial clarity of a CFO, without hiring one.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link href="/login" style={{ background: BLUE, color: '#fff', fontSize: 16, fontWeight: 600, textDecoration: 'none', padding: '14px 28px', borderRadius: 11 }}>
            Get started free
          </Link>
          <Link href="/login" style={{ background: 'transparent', color: INK, fontSize: 16, fontWeight: 500, textDecoration: 'none', padding: '14px 28px', borderRadius: 11, border: `0.5px solid ${BORDER}` }}>
            Log in
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 32px 80px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, width: '100%', boxSizing: 'border-box' }}>
        <Feature
          title="Upload. Done."
          body="Drop in a CSV from your bank or point-of-sale and instantly see income, expenses, and net profit — categorized and organized for you."
        />
        <Feature
          title="AI insights that talk business"
          body="Ask your AI CFO what's eating your margin, which expenses are creeping up, and what to fix first. Plain answers, not spreadsheets."
        />
        <Feature
          title="Profit per project"
          body="Assign transactions to projects and see exactly which clients and jobs make you money — and which ones quietly lose it."
        />
      </section>

      {/* Bottom CTA */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '0 32px 90px', textAlign: 'center' }}>
        <h2 style={{ color: INK, fontSize: 30, fontWeight: 700, margin: '0 0 14px' }}>
          Stop guessing. Start knowing.
        </h2>
        <p style={{ color: SUB, fontSize: 15, margin: '0 0 26px' }}>
          Set up in minutes. Your first upload gives you answers today.
        </p>
        <Link href="/login" style={{ background: BLUE, color: '#fff', fontSize: 16, fontWeight: 600, textDecoration: 'none', padding: '14px 30px', borderRadius: 11, display: 'inline-block' }}>
          Create your account
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ marginTop: 'auto', borderTop: `0.5px solid ${BORDER}`, padding: '22px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1100, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <img src="/logo.png" alt="MargoiQ" style={{ height: 20, opacity: 0.7 }} />
        <p style={{ color: FAINT, fontSize: 12, margin: 0 }}>
          © {new Date().getFullYear()} MargoiQ · margoiq.com
        </p>
      </footer>
    </div>
  )
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ background: PANEL, border: `0.5px solid ${BORDER}`, borderRadius: 14, padding: '22px 22px', backdropFilter: 'blur(8px)' }}>
      <p style={{ color: INK, fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>{title}</p>
      <p style={{ color: SUB, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{body}</p>
    </div>
  )
}