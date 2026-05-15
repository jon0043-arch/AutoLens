'use client'
import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Severity = 'low' | 'moderate' | 'high'
type Status   = 'pending' | 'review' | 'approved' | 'sent'

interface Issue {
  id: string; label: string; severity: Severity
  repairLow: number; repairHigh: number
}
interface Appraisal {
  id: string; status: Status; createdAt: string
  customer: { name: string; phone: string }
  vehicle: { year: string; make: string; model: string; trim: string; vin: string; mileage: string; color: string }
  issues: Issue[]
  values: { retail: number; trade: number; wholesale: number }
  estimatedValue: number; conditionScore: number
  recommendations: string[]; notes: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const Y = '#F5B800'

const SEV: Record<Severity, { text: string; bg: string; label: string }> = {
  low:      { text: '#6B7280', bg: '#F3F4F6', label: 'Low'      },
  moderate: { text: '#D97706', bg: '#FEF3C7', label: 'Moderate' },
  high:     { text: '#DC2626', bg: '#FEE2E2', label: 'High'     },
}
const STAT: Record<Status, { label: string; text: string; bg: string }> = {
  pending:  { label: 'Pending',        text: '#6B7280', bg: '#F3F4F6' },
  review:   { label: 'Pending Review', text: '#B45309', bg: '#FEF3C7' },
  approved: { label: 'Approved',       text: '#065F46', bg: '#D1FAE5' },
  sent:     { label: 'Sent',           text: '#1D4ED8', bg: '#DBEAFE' },
}
const PRODUCTS = [
  { id: 'wheel',    label: 'Wheel & Tire Protection',    savings: '$150–$900'   },
  { id: 'shield',   label: 'Windshield Protection',      savings: '$75–$1,000'  },
  { id: 'key',      label: 'Key Replacement Protection', savings: '$400–$1,200' },
  { id: 'interior', label: 'Interior Protection',        savings: '$250–$600'   },
  { id: 'gps',      label: 'GPS Recovery & Theft',       savings: '$299–$699'   },
]
const NAV = [
  { icon: '▦',  label: 'Dashboard'  },
  { icon: '≡',  label: 'Appraisals' },
  { icon: '⊙',  label: 'Deals'      },
  { icon: '▤',  label: 'Inventory'  },
  { icon: '◎',  label: 'Customers'  },
  { icon: '▣',  label: 'Reports'    },
  { icon: '⊡',  label: 'Products'   },
  { icon: '⚙',  label: 'Settings'   },
  { icon: '⊛',  label: 'Admin'      },
]
const fmt = (n: number) => n > 0 ? `$${n.toLocaleString()}` : '—'

// ─── Seed Data ────────────────────────────────────────────────────────────────
const SEED: Appraisal[] = [
  {
    id: '84291', status: 'review', createdAt: 'May 12, 2:45 PM',
    customer: { name: 'Mike Johnson', phone: '(305) 555-1234' },
    vehicle: { year: '2020', make: 'Land Rover', model: 'Range Rover Sport', trim: 'HSE', vin: 'SALWR2RV2LA123456', mileage: '58,342', color: 'Black' },
    issues: [
      { id: 'i1', label: 'Front Right Wheel Damage', severity: 'moderate', repairLow: 150,  repairHigh: 300  },
      { id: 'i2', label: 'Windshield Chip',          severity: 'low',      repairLow: 75,   repairHigh: 150  },
      { id: 'i3', label: 'Interior Wear',            severity: 'moderate', repairLow: 250,  repairHigh: 600  },
      { id: 'i4', label: 'Only 1 Key Detected',      severity: 'high',     repairLow: 400,  repairHigh: 1200 },
    ],
    values: { retail: 43250, trade: 26800, wholesale: 24100 },
    estimatedValue: 42750, conditionScore: 82,
    recommendations: ['wheel', 'shield', 'key'], notes: '',
  },
  {
    id: '84290', status: 'approved', createdAt: 'May 12, 12:30 PM',
    customer: { name: 'Sarah Williams', phone: '(305) 555-5678' },
    vehicle: { year: '2021', make: 'Mercedes-Benz', model: 'GLE', trim: '350 4MATIC', vin: 'W1N0G8EB4MF123456', mileage: '31,200', color: 'Silver' },
    issues: [{ id: 'i5', label: 'Minor Paint Scratch', severity: 'low', repairLow: 100, repairHigh: 300 }],
    values: { retail: 52000, trade: 38000, wholesale: 35000 },
    estimatedValue: 51500, conditionScore: 91,
    recommendations: ['shield', 'interior'], notes: 'Clean vehicle.',
  },
  {
    id: '84289', status: 'pending', createdAt: 'May 12, 11:05 AM',
    customer: { name: 'Chris Davis', phone: '(305) 555-3456' },
    vehicle: { year: '2019', make: 'Audi', model: 'Q7', trim: 'Premium Plus', vin: 'WA1BXAF75KD012345', mileage: '44,100', color: 'White' },
    issues: [], values: { retail: 0, trade: 0, wholesale: 0 },
    estimatedValue: 0, conditionScore: 0, recommendations: [], notes: '',
  },
  {
    id: '84288', status: 'sent', createdAt: 'May 12, 10:30 AM',
    customer: { name: 'James Wilson', phone: '(305) 555-7890' },
    vehicle: { year: '2020', make: 'Ford', model: 'F-150', trim: 'XLT', vin: '1FTEW1E53KFA12345', mileage: '67,890', color: 'Blue' },
    issues: [
      { id: 'i6', label: 'Bed Liner Damage',   severity: 'low',      repairLow: 200, repairHigh: 500 },
      { id: 'i7', label: 'Front Bumper Scuff', severity: 'moderate', repairLow: 300, repairHigh: 700 },
    ],
    values: { retail: 38000, trade: 28000, wholesale: 25000 },
    estimatedValue: 37500, conditionScore: 76,
    recommendations: ['wheel', 'gps'], notes: '',
  },
]

// ─── Logo ─────────────────────────────────────────────────────────────────────
function Logo({ size = 20 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, fontWeight: 900, fontSize: size, letterSpacing: -0.5, lineHeight: 1 }}>
      <span style={{ color: '#fff' }}>Aut</span>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size * 1.1, height: size * 1.1, borderRadius: '50%',
        background: Y, position: 'relative', flexShrink: 0,
      }}>
        <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="#111">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
      </span>
      <span style={{ color: Y }}>Lens</span>
    </div>
  )
}

// ─── Condition Gauge ──────────────────────────────────────────────────────────
function ConditionGauge({ score }: { score: number }) {
  const r = 36, c = 2 * Math.PI * r
  const pct = score / 100
  const color = score >= 85 ? '#10B981' : score >= 70 ? '#F5B800' : '#EF4444'
  const label = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Poor'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={90} height={90} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={45} cy={45} r={r} fill="none" stroke="#F3F4F6" strokeWidth={8} />
        <circle cx={45} cy={45} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${pct * c} ${c}`} strokeLinecap="round" />
      </svg>
      <div style={{ marginTop: -70, textAlign: 'center', zIndex: 1 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#111', lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 10, color: '#9CA3AF' }}>/100</div>
      </div>
      <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 32 }}>{label}</div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Page() {
  const [appraisals, setAppraisals] = useState<Appraisal[]>(SEED)
  const [selectedId, setSelectedId]   = useState('84291')
  const [activeNav, setActiveNav]     = useState('Appraisals')
  const [activeTab, setActiveTab]     = useState('photos')
  const [editingVals, setEditingVals] = useState(false)
  const [vals, setVals] = useState({ retail: '43250', trade: '26800', wholesale: '24100' })
  const [notes, setNotes] = useState('')

  const a = appraisals.find(x => x.id === selectedId)!
  const update = (id: string, changes: Partial<Appraisal>) =>
    setAppraisals(prev => prev.map(x => x.id === id ? { ...x, ...changes } : x))

  const saveVals = () => {
    update(selectedId, { values: { retail: +vals.retail, trade: +vals.trade, wholesale: +vals.wholesale } })
    setEditingVals(false)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,sans-serif', overflow: 'hidden', background: '#fff' }}>

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <div style={{ width: 220, background: '#111827', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid #1F2937' }}>
          <Logo size={19} />
        </div>
        <nav style={{ padding: '10px 8px', flex: 1, overflowY: 'auto' }}>
          {NAV.map(({ icon, label }) => {
            const active = activeNav === label
            return (
              <div key={label} onClick={() => setActiveNav(label)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, marginBottom: 2,
                cursor: 'pointer', transition: 'all 0.15s',
                background: active ? Y : 'transparent',
                color: active ? '#111' : '#6B7280',
                fontSize: 13, fontWeight: active ? 700 : 400,
              }}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
                {label}
              </div>
            )
          })}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid #1F2937' }}>
          <div style={{ fontSize: 11, color: '#4B5563' }}>v1.0 · AutoLens</div>
        </div>
      </div>

      {/* ── Queue ───────────────────────────────────────────────── */}
      <div style={{ width: 272, background: '#F9FAFB', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid #E5E7EB', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>Appraisals</div>
            <button style={{ background: Y, border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#111' }}>+ New</button>
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
            {appraisals.length} total · {appraisals.filter(x => x.status === 'review').length} need review
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '10px 8px' }}>
          {appraisals.map(x => {
            const s = STAT[x.status]
            const sel = x.id === selectedId
            return (
              <div key={x.id} onClick={() => {
                setSelectedId(x.id)
                setVals({ retail: String(x.values.retail), trade: String(x.values.trade), wholesale: String(x.values.wholesale) })
                setEditingVals(false); setActiveTab('photos')
              }} style={{
                background: '#fff', border: `2px solid ${sel ? Y : '#E5E7EB'}`,
                borderRadius: 10, padding: '12px 14px', marginBottom: 8,
                cursor: 'pointer', transition: 'border-color 0.15s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{x.customer.name}</div>
                  <span style={{ fontSize: 9, background: s.bg, color: s.text, padding: '2px 7px', borderRadius: 99, fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 6 }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>{x.vehicle.year} {x.vehicle.make} {x.vehicle.model}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{x.createdAt}</div>
                {x.estimatedValue > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: Y, marginTop: 6 }}>{fmt(x.estimatedValue)}</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Detail ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>

        {/* Header */}
        <div style={{ padding: '18px 28px 14px', borderBottom: '1px solid #F3F4F6', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6, cursor: 'pointer' }}>← Back to Appraisals</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111' }}>Appraisal #{a.id}</h1>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 600, background: STAT[a.status].bg, color: STAT[a.status].text }}>{STAT[a.status].label}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: '#374151' }}>
                ✏ Edit Vehicle Info
              </button>
              <button onClick={() => update(a.id, { status: 'sent' })} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: Y, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#111' }}>
                📤 Send to Customer
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 28px 40px' }}>

          {/* Customer + Vehicle + Photo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 148px', gap: 14, marginBottom: 18 }}>
            <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '14px 16px', border: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Customer</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{a.customer.name}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>{a.customer.phone}</div>
            </div>
            <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '14px 16px', border: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Vehicle</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{a.vehicle.year} {a.vehicle.make} {a.vehicle.model} {a.vehicle.trim}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>VIN: {a.vehicle.vin} · {a.vehicle.mileage} mi · {a.vehicle.color}</div>
            </div>
            <div style={{ background: '#1F2937', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
              <svg width={40} height={28} viewBox="0 0 24 24" fill="#4B5563">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>
              <div style={{ fontSize: 9, color: '#4B5563' }}>No photo</div>
            </div>
          </div>

          {/* 4 Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>

            {/* AI Est Value */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '18px', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500, marginBottom: 12 }}>AI Estimated Market Value</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#111', lineHeight: 1 }}>{fmt(a.estimatedValue)}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 6 }}>Retail Value</div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
                <div style={{ fontSize: 10, color: '#10B981', fontWeight: 600 }}>● Confidence: High</div>
              </div>
            </div>

            {/* Condition Score */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '18px', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500, marginBottom: 4, alignSelf: 'flex-start' }}>Overall Condition Score</div>
              <ConditionGauge score={a.conditionScore} />
            </div>

            {/* Detected Issues */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '18px', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>Detected Issues</div>
                <span style={{ background: '#FEF3C7', color: '#B45309', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{a.issues.length}</span>
              </div>
              {a.issues.slice(0, 4).map(i => (
                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: '#374151', flex: 1, paddingRight: 6 }}>{i.label}</div>
                  <span style={{ fontSize: 9, background: SEV[i.severity].bg, color: SEV[i.severity].text, padding: '2px 7px', borderRadius: 99, fontWeight: 600, flexShrink: 0 }}>{SEV[i.severity].label}</span>
                </div>
              ))}
              <div style={{ fontSize: 11, color: Y, marginTop: 6, cursor: 'pointer', fontWeight: 500 }}>View all issues →</div>
            </div>

            {/* Manager Adjustments */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '18px', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>Manager Adjustments</div>
                <button onClick={() => setEditingVals(v => !v)} style={{ fontSize: 10, color: Y, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>{editingVals ? 'Cancel' : '✏ Edit'}</button>
              </div>
              {(['retail','trade','wholesale'] as const).map((k, idx) => (
                <div key={k} style={{ marginBottom: idx < 2 ? 12 : 0 }}>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 3 }}>
                    {k === 'retail' ? 'Retail Value' : k === 'trade' ? 'Trade Value' : 'Wholesale Value'}
                  </div>
                  {editingVals ? (
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E5E7EB', borderRadius: 7, overflow: 'hidden', background: '#F9FAFB' }}>
                      <span style={{ padding: '5px 8px', fontSize: 12, color: '#6B7280', borderRight: '1px solid #E5E7EB', background: '#F3F4F6' }}>$</span>
                      <input type="number" value={vals[k]} onChange={e => setVals(p => ({ ...p, [k]: e.target.value }))}
                        style={{ flex: 1, border: 'none', background: 'transparent', padding: '5px 8px', fontSize: 13, fontWeight: 600, outline: 'none' }} />
                    </div>
                  ) : (
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>$ {a.values[k].toLocaleString()}</div>
                  )}
                </div>
              ))}
              {editingVals && (
                <button onClick={saveVals} style={{ width: '100%', marginTop: 12, background: Y, border: 'none', borderRadius: 7, padding: '7px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Save Changes
                </button>
              )}
            </div>

          </div>

          {/* Tabs + Content */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 20 }}>
            <div>
              {/* Tab Bar */}
              <div style={{ display: 'flex', borderBottom: '2px solid #F3F4F6', marginBottom: 18 }}>
                {[['photos','Photos'],['damage','Damage & Issues'],['vehicle','Vehicle Info'],['history','History'],['notes','Notes']].map(([k, l]) => (
                  <button key={k} onClick={() => setActiveTab(k)} style={{
                    padding: '8px 14px', border: 'none', background: 'none', fontSize: 12,
                    fontWeight: activeTab === k ? 600 : 400, cursor: 'pointer',
                    color: activeTab === k ? '#111' : '#9CA3AF',
                    borderBottom: `2px solid ${activeTab === k ? Y : 'transparent'}`,
                    marginBottom: -2,
                  }}>{l}</button>
                ))}
              </div>

              {/* Photos */}
              {activeTab === 'photos' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {['Front Left','Front','Front Right','Rear Side','Rear','Left Side','Interior'].map(lbl => (
                    <div key={lbl} style={{ background: '#F3F4F6', borderRadius: 8, aspectRatio: '4/3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 10, color: '#9CA3AF' }}>
                      <span style={{ fontSize: 22 }}>📷</span>{lbl}
                    </div>
                  ))}
                  <div style={{ background: '#1F2937', borderRadius: 8, aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>+12 More</div>
                </div>
              )}

              {/* Damage */}
              {activeTab === 'damage' && (
                <div>
                  {a.issues.length === 0
                    ? <div style={{ color: '#9CA3AF', fontSize: 13, padding: '20px 0' }}>No issues detected yet.</div>
                    : a.issues.map(i => (
                      <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#F9FAFB', borderRadius: 10, marginBottom: 8, border: '1px solid #F3F4F6' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{i.label}</div>
                          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Est. Repair: ${i.repairLow}–${i.repairHigh}</div>
                        </div>
                        <span style={{ fontSize: 11, background: SEV[i.severity].bg, color: SEV[i.severity].text, padding: '3px 10px', borderRadius: 99, fontWeight: 600 }}>{SEV[i.severity].label}</span>
                      </div>
                    ))
                  }
                </div>
              )}

              {/* Vehicle Info */}
              {activeTab === 'vehicle' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[['Year', a.vehicle.year],['Make', a.vehicle.make],['Model', a.vehicle.model],['Trim', a.vehicle.trim],['VIN', a.vehicle.vin],['Mileage', a.vehicle.mileage + ' mi'],['Color', a.vehicle.color]].map(([l, v]) => (
                    <div key={l} style={{ padding: '12px 14px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #F3F4F6' }}>
                      <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{l}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              {activeTab === 'notes' && (
                <div>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add internal notes about this appraisal..."
                    style={{ width: '100%', minHeight: 140, border: '1px solid #E5E7EB', borderRadius: 10, padding: 14, fontSize: 13, color: '#374151', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                  <button onClick={() => update(a.id, { notes })} style={{ marginTop: 8, padding: '8px 18px', background: Y, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save Notes</button>
                </div>
              )}

              {activeTab === 'history' && (
                <div style={{ color: '#9CA3AF', fontSize: 13, padding: '20px 0' }}>No history yet.</div>
              )}
            </div>

            {/* Recommended Protections */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '18px', height: 'fit-content', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#111', marginBottom: 14 }}>Recommended Protections</div>
              {PRODUCTS.filter(p => a.recommendations.includes(p.id)).map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#374151', flex: 1 }}>{p.label}</div>
                  <span style={{ width: 18, height: 18, background: Y, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width={10} height={10} viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#111" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #F3F4F6', marginTop: 6, paddingTop: 12 }}>
                <div style={{ fontSize: 11, color: Y, cursor: 'pointer', fontWeight: 500 }}>View all products →</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
