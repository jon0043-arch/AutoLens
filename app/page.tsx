'use client'
import { useState, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Severity  = 'low' | 'moderate' | 'high'
type Status    = 'pending' | 'review' | 'approved' | 'sent'
type UploadCat = 'book' | 'mmr' | 'retail'

interface Issue { id: string; label: string; severity: Severity; repairLow: number; repairHigh: number }
interface ValUpload { fileName: string; preview: string; status: 'parsing' | 'parsed'; data: Record<string, string> }
interface Appraisal {
  id: string; status: Status; createdAt: string
  customer: { name: string; phone: string }
  vehicle: { year: string; make: string; model: string; trim: string; vin: string; mileage: string; color: string }
  issues: Issue[]; values: { retail: number; trade: number; wholesale: number }
  estimatedValue: number; conditionScore: number; recommendations: string[]; notes: string
}

// ─── Tokens ───────────────────────────────────────────────────────────────────
const Y  = '#F5B800'
const S1 = '#0E0E0E'
const S2 = '#141414'
const S3 = '#1C1C1C'
const S4 = '#242424'
const W0 = '#FFFFFF'
const W1 = 'rgba(255,255,255,0.85)'
const W2 = 'rgba(255,255,255,0.45)'
const W3 = 'rgba(255,255,255,0.22)'
const W4 = 'rgba(255,255,255,0.07)'
const W5 = 'rgba(255,255,255,0.03)'

const SEV: Record<Severity, { label: string; color: string }> = {
  low:      { label: 'Low',      color: W2       },
  moderate: { label: 'Moderate', color: '#F59E0B' },
  high:     { label: 'High',     color: '#EF4444' },
}
const STAT: Record<Status, { label: string; color: string }> = {
  pending:  { label: 'Pending',       color: W2       },
  review:   { label: 'Needs Review',  color: '#F59E0B' },
  approved: { label: 'Ready to Send', color: '#22C55E' },
  sent:     { label: 'Sent',          color: '#60A5FA' },
}
const PRODUCTS = [
  { id: 'wheel',    label: 'Wheel & Tire',    desc: 'Wheel and tire coverage'  },
  { id: 'shield',   label: 'Windshield',      desc: 'Chip and crack coverage'  },
  { id: 'key',      label: 'Key Replacement', desc: 'Lost or stolen key'       },
  { id: 'interior', label: 'Interior',        desc: 'Stain and tear coverage'  },
  { id: 'gps',      label: 'GPS & Theft',     desc: 'Tracking and recovery'    },
]
const UPLOAD_META: Record<UploadCat, { title: string; sources: string }> = {
  book:   { title: 'Book Values',     sources: 'KBB · Edmunds · Black Book'   },
  mmr:    { title: 'MMR / Wholesale', sources: 'Manheim MMR · Auction comps'  },
  retail: { title: 'Retail Comps',    sources: 'Clean & accident listings'    },
}
const FAKE_PARSE: Record<UploadCat, Record<string, string>> = {
  book:   { 'Trade-In': '$39,800', 'Private Party': '$42,200', 'Retail': '$45,900', 'Source': 'KBB', 'Confidence': 'High' },
  mmr:    { 'Clean Avg': '$41,500', 'Accident Avg': '$37,200', 'Transactions': '8', 'Mileage Range': '48k–65k', 'Confidence': 'Medium' },
  retail: { 'Clean Retail': '$46,900', 'Accident Retail': '$42,300', 'Listings': '12', 'Spread': '$4,600', 'Confidence': 'High' },
}
const fmt = (n: number) => n > 0 ? `$${n.toLocaleString()}` : '—'

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
    estimatedValue: 42750, conditionScore: 82, recommendations: ['wheel', 'shield', 'key'], notes: '',
  },
  {
    id: '84290', status: 'approved', createdAt: 'May 12, 12:30 PM',
    customer: { name: 'Sarah Williams', phone: '(305) 555-5678' },
    vehicle: { year: '2021', make: 'Mercedes-Benz', model: 'GLE', trim: '350 4MATIC', vin: 'W1N0G8EB4MF123456', mileage: '31,200', color: 'Silver' },
    issues: [{ id: 'i5', label: 'Minor Paint Scratch', severity: 'low', repairLow: 100, repairHigh: 300 }],
    values: { retail: 52000, trade: 38000, wholesale: 35000 },
    estimatedValue: 51500, conditionScore: 91, recommendations: ['shield', 'interior'], notes: '',
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
    estimatedValue: 37500, conditionScore: 76, recommendations: ['wheel', 'gps'], notes: '',
  },
]

// ─── Logo ─────────────────────────────────────────────────────────────────────
function Logo({ size = 18 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', fontWeight: 800, fontSize: size, letterSpacing: -0.5, lineHeight: 1, userSelect: 'none' }}>
      <span style={{ color: W0 }}>Aut</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size * 1.1, height: size * 1.1, borderRadius: '50%', background: Y, flexShrink: 0 }}>
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="#111">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
      </span>
      <span style={{ color: Y }}>Lens</span>
    </div>
  )
}

// ─── Vehicle SVG ──────────────────────────────────────────────────────────────
function VehicleSVG() {
  const spokes = (cx: number, cy: number) =>
    [0, 72, 144, 216, 288].map(deg => {
      const a = (deg - 90) * Math.PI / 180
      return <line key={deg}
        x1={cx + 9 * Math.cos(a)} y1={cy + 9 * Math.sin(a)}
        x2={cx + 22 * Math.cos(a)} y2={cy + 22 * Math.sin(a)}
        stroke="#686868" strokeWidth={5} strokeLinecap="round" />
    })
  return (
    <svg viewBox="0 0 640 200" style={{ width: '100%', maxWidth: 500, height: 'auto', display: 'block' }}>
      {/* Ground shadow */}
      <ellipse cx="320" cy="190" rx="270" ry="8" fill="rgba(0,0,0,0.55)" />

      {/* Body */}
      <path d="M 70 163 L 70 117 C 70 94 94 78 120 70 L 192 50 C 217 42 250 36 282 34 L 402 34 C 435 34 464 40 487 54 L 550 80 C 566 91 572 107 572 121 L 572 163 Z" fill="#E0E0E0" />

      {/* Lower body */}
      <path d="M 70 147 L 572 147 L 572 163 L 70 163 Z" fill="#C6C6C6" />

      {/* Body highlight */}
      <path d="M 124 72 L 485 56 L 547 80 L 536 76 C 508 63 468 37 402 37 L 282 37 C 252 37 219 43 194 52 L 136 70 Z" fill="rgba(255,255,255,0.36)" />

      {/* Glass */}
      <path d="M 198 52 L 484 58 L 545 82 L 539 127 L 192 127 Z" fill="#0C1A26" />

      {/* A-pillar */}
      <path d="M 484 58 L 545 82 L 539 127 L 488 127 L 486 60 Z" fill="#091420" />

      {/* Window pillars */}
      <rect x="387" y="58" width="5" height="69" fill="#060D18" />
      <rect x="285" y="35" width="5" height="92" fill="#060D18" />

      {/* Glass reflection */}
      <path d="M 202 56 L 380 60 L 378 74 L 202 70 Z" fill="rgba(255,255,255,0.06)" />

      {/* Roof rail */}
      <rect x="204" y="33" width="282" height="2.5" rx="1.25" fill="rgba(255,255,255,0.5)" />

      {/* Character line */}
      <path d="M 77 113 Q 265 107 365 106 Q 465 105 566 111" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />

      {/* Wheel arches */}
      <path d="M 110 147 Q 106 110 138 102 Q 167 95 198 102 Q 226 110 226 147" fill="#E0E0E0" />
      <path d="M 420 147 Q 416 110 448 102 Q 477 95 507 102 Q 535 110 535 147" fill="#E0E0E0" />

      {/* Front bumper */}
      <path d="M 554 86 L 572 98 L 572 142 L 552 137 Z" fill="#D2D2D2" />
      <rect x="560" y="116" width="14" height="11" rx="2" fill="#B4B4B4" />

      {/* Headlight */}
      <path d="M 553 89 L 570 100 L 568 120 L 550 117 Z" fill="rgba(255,251,195,0.42)" />

      {/* Taillight */}
      <path d="M 70 100 L 84 98 L 86 135 L 70 135 Z" fill="rgba(200,38,38,0.58)" />

      {/* Mirror */}
      <path d="M 545 90 L 557 88 L 557 99 L 545 98 Z" fill="#C8C8C8" />

      {/* Door handles */}
      <rect x="304" y="96" width="34" height="4" rx="2" fill="rgba(0,0,0,0.2)" />
      <rect x="428" y="96" width="34" height="4" rx="2" fill="rgba(0,0,0,0.2)" />

      {/* Front wheel */}
      <circle cx="168" cy="163" r="43" fill="#101010" />
      <circle cx="168" cy="163" r="36" fill="#191919" />
      <circle cx="168" cy="163" r="23" fill="#202020" />
      <circle cx="168" cy="163" r="8"  fill="#2A2A2A" />
      {spokes(168, 163)}
      <path d={`M ${168 - 36 * 0.766} ${163 - 36 * 0.643} A 36 36 0 0 1 ${168 + 36 * 0.766} ${163 - 36 * 0.643}`} fill="none" stroke="rgba(255,255,255,0.17)" strokeWidth="1.8" />

      {/* Rear wheel */}
      <circle cx="462" cy="163" r="43" fill="#101010" />
      <circle cx="462" cy="163" r="36" fill="#191919" />
      <circle cx="462" cy="163" r="23" fill="#202020" />
      <circle cx="462" cy="163" r="8"  fill="#2A2A2A" />
      {spokes(462, 163)}
      <path d={`M ${462 - 36 * 0.766} ${163 - 36 * 0.643} A 36 36 0 0 1 ${462 + 36 * 0.766} ${163 - 36 * 0.643}`} fill="none" stroke="rgba(255,255,255,0.17)" strokeWidth="1.8" />
    </svg>
  )
}

// ─── Vehicle Hero ─────────────────────────────────────────────────────────────
function VehicleHero({ a }: { a: Appraisal }) {
  const scoreCol = a.conditionScore >= 85 ? '#22C55E' : a.conditionScore >= 70 ? Y : '#EF4444'
  return (
    <div style={{ position: 'relative', background: 'linear-gradient(180deg, #080808 0%, #0D0D0D 100%)', flexShrink: 0, overflow: 'hidden' }}>
      {/* Grid overlay */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px)', backgroundSize: '52px 52px' }} />
      {/* Floor glow */}
      <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 560, height: 60, background: 'radial-gradient(ellipse at center bottom, rgba(245,184,0,0.09) 0%, transparent 70%)' }} />

      <div style={{ display: 'flex', alignItems: 'center', padding: '30px 36px 24px', position: 'relative', zIndex: 1, gap: 0 }}>

        {/* Left metrics */}
        <div style={{ width: 164, flexShrink: 0 }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 9, color: W3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Estimated Value</div>
            <div style={{ fontSize: 34, fontWeight: 800, color: W0, letterSpacing: -1, lineHeight: 1 }}>{fmt(a.estimatedValue)}</div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, color: W3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Trade Value</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: W2, letterSpacing: -0.5, lineHeight: 1 }}>{fmt(a.values.trade)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: W3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Confidence</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#22C55E' }}>High</span>
            </div>
          </div>
        </div>

        {/* Vehicle */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px' }}>
          <VehicleSVG />
          <div style={{ fontSize: 9, color: W3, letterSpacing: 3, textTransform: 'uppercase', marginTop: 6 }}>
            {a.vehicle.year} · {a.vehicle.make} {a.vehicle.model} · {a.vehicle.mileage} mi
          </div>
        </div>

        {/* Right metrics */}
        <div style={{ width: 164, flexShrink: 0, textAlign: 'right' }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 9, color: W3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Condition</div>
            <div style={{ fontSize: 34, fontWeight: 800, color: scoreCol, letterSpacing: -1, lineHeight: 1 }}>
              {a.conditionScore}<span style={{ fontSize: 16, opacity: 0.5, fontWeight: 600 }}>/100</span>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, color: W3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Issues Detected</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: a.issues.length > 0 ? '#F59E0B' : W2, letterSpacing: -0.5, lineHeight: 1 }}>{a.issues.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: W3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Status</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: STAT[a.status].color }}>{STAT[a.status].label}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Progress Ring ────────────────────────────────────────────────────────────
function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 19, c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
      <svg width={48} height={48} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={24} cy={24} r={r} fill="none" stroke={S4} strokeWidth={3.5} />
        <circle cx={24} cy={24} r={r} fill="none" stroke={Y} strokeWidth={3.5} strokeDasharray={`${(done / total) * c} ${c}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: W0 }}>{done}</span>
      </div>
    </div>
  )
}

// ─── AI Co-pilot ──────────────────────────────────────────────────────────────
function AICopilot({ checklist, allDone, doneCount }: { checklist: Record<string, boolean>; allDone: boolean; doneCount: number }) {
  const steps = [
    { key: 'customerInfo',    label: 'Customer profile',   sub: 'Identity confirmed'    },
    { key: 'vehicleInfo',     label: 'Vehicle registration',sub: 'VIN decoded'           },
    { key: 'photosReviewed',  label: 'Photo inspection',   sub: 'Visuals reviewed'      },
    { key: 'valuesReviewed',  label: 'Market valuation',   sub: 'Pricing confirmed'     },
    { key: 'damageReviewed',  label: 'Damage assessment',  sub: 'Risk evaluated'        },
    { key: 'recommendations', label: 'Product matching',   sub: 'Recommendations set'   },
  ]
  return (
    <div style={{ background: S2, borderRadius: 14, padding: '20px', border: `1px solid ${W4}`, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: W0, marginBottom: 3 }}>Inspection Status</div>
          <div style={{ fontSize: 10, color: W3 }}>
            {allDone ? 'Ready to deliver' : `${6 - doneCount} step${6 - doneCount !== 1 ? 's' : ''} remaining`}
          </div>
        </div>
        <ProgressRing done={doneCount} total={6} />
      </div>
      {steps.map(({ key, label, sub }) => {
        const done = checklist[key]
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 15 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? Y : S4, border: `1px solid ${done ? Y : W4}`, transition: 'all 0.2s' }}>
              {done && <svg width={9} height={9} viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#111" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: done ? 500 : 400, color: done ? W1 : W3, lineHeight: 1.2 }}>{label}</div>
              {done && <div style={{ fontSize: 9, color: W3, marginTop: 2, letterSpacing: 0.3 }}>{sub}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Inline Edit ──────────────────────────────────────────────────────────────
function InlineEdit({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [ed, setEd] = useState(false)
  const [v, setV]   = useState(value)
  if (ed) return <input autoFocus value={v} onChange={e => setV(e.target.value)} onBlur={() => { onChange(v); setEd(false) }} onKeyDown={e => e.key === 'Enter' && (onChange(v), setEd(false))} style={{ width: '100%', border: 'none', borderBottom: `1px solid ${Y}`, outline: 'none', fontSize: 12, fontWeight: 500, padding: '2px 0', background: 'transparent', color: W1 }} />
  return <span onClick={() => setEd(true)} style={{ cursor: 'text', fontWeight: 500, color: W1 }}>{v}<span style={{ color: W3, marginLeft: 4, fontSize: 9 }}>✎</span></span>
}

// ─── Upload Card ──────────────────────────────────────────────────────────────
function UploadCard({ cat, upload, onFile, onEdit }: { cat: UploadCat; upload: ValUpload | null; onFile: (c: UploadCat, f: File) => void; onEdit: (c: UploadCat, k: string, v: string) => void }) {
  const ref  = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const { title, sources } = UPLOAD_META[cat]
  const pick = (f: File) => onFile(cat, f)
  return (
    <div style={{ background: S2, borderRadius: 12, border: `1px solid ${drag ? 'rgba(245,184,0,0.4)' : W4}`, overflow: 'hidden', transition: 'border-color 0.15s' }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${W5}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: W1 }}>{title}</div>
          <div style={{ fontSize: 10, color: W3, marginTop: 2 }}>{sources}</div>
        </div>
        {upload && <span style={{ fontSize: 10, fontWeight: 500, color: upload.status === 'parsed' ? '#22C55E' : '#60A5FA' }}>{upload.status === 'parsed' ? '✓ Parsed' : 'Analyzing…'}</span>}
      </div>
      <div style={{ padding: '14px 16px' }}>
        {!upload ? (
          <div onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) pick(f) }}
            onClick={() => ref.current?.click()}
            style={{ border: `1.5px dashed ${drag ? 'rgba(245,184,0,0.5)' : W4}`, borderRadius: 8, padding: '18px', textAlign: 'center', cursor: 'pointer', background: drag ? 'rgba(245,184,0,0.04)' : S3, transition: 'all 0.15s' }}>
            <div style={{ fontSize: 12, color: W2, fontWeight: 400 }}>Drop screenshot or click to upload</div>
            <div style={{ fontSize: 10, color: W3, marginTop: 3 }}>PNG · JPG · PDF</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: upload.status === 'parsed' ? 14 : 0 }}>
              {upload.preview && <img src={upload.preview} alt="" style={{ width: 52, height: 38, objectFit: 'cover', borderRadius: 5, flexShrink: 0, opacity: 0.85 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: W1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{upload.fileName}</div>
                <button onClick={() => ref.current?.click()} style={{ fontSize: 10, color: W3, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 3 }}>Replace</button>
              </div>
            </div>
            {upload.status === 'parsing' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#60A5FA', fontSize: 11 }}>
                <span style={{ display: 'inline-block', width: 11, height: 11, border: '2px solid rgba(96,165,250,0.3)', borderTopColor: '#60A5FA', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Analyzing screenshot…
              </div>
            )}
            {upload.status === 'parsed' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(upload.data).map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: `1px solid ${W5}` }}>
                      <td style={{ padding: '6px 0', fontSize: 10, color: W3, width: '48%' }}>{k}</td>
                      <td style={{ padding: '6px 0', fontSize: 11 }}><InlineEdit value={v} onChange={nv => onEdit(cat, k, nv)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
        <input ref={ref} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) pick(f) }} />
      </div>
    </div>
  )
}

// ─── SMS Modal ────────────────────────────────────────────────────────────────
function SMSModal({ a, onClose, onSend }: { a: Appraisal; onClose: () => void; onSend: () => void }) {
  const msg = `Hi ${a.customer.name.split(' ')[0]}, your AutoLens Vehicle Report is ready.\n\nWe found a few items on your ${a.vehicle.year} ${a.vehicle.make} ${a.vehicle.model}:\n${a.issues.slice(0, 3).map(i => `• ${i.label}`).join('\n')}\n\nView your full report:\nautolens.ai/report/${a.id}\n\nReply STOP to opt out.`
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: S2, borderRadius: 20, padding: '32px', width: 400, border: `1px solid ${W4}`, boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ fontSize: 19, fontWeight: 700, color: W0, marginBottom: 4 }}>Text Message Preview</div>
        <div style={{ fontSize: 12, color: W3, marginBottom: 24 }}>Exactly what {a.customer.name} will receive.</div>
        <div style={{ background: S3, borderRadius: 14, padding: '18px', marginBottom: 24, border: `1px solid ${W4}` }}>
          <div style={{ fontSize: 9, color: W3, textAlign: 'center', marginBottom: 12, letterSpacing: 0.8, textTransform: 'uppercase' }}>AutoLens · SMS</div>
          <div style={{ background: '#1A2A3A', borderRadius: 12, borderBottomLeftRadius: 3, padding: '14px 16px', fontSize: 12.5, lineHeight: 1.7, color: W1, whiteSpace: 'pre-wrap' }}>{msg}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${W4}`, background: 'transparent', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: W2 }}>Cancel</button>
          <button onClick={onSend} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: Y, fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#111' }}>Send Now →</button>
        </div>
      </div>
    </div>
  )
}

// ─── Customer Report Preview ──────────────────────────────────────────────────
function ReportPreview({ a }: { a: Appraisal }) {
  return (
    <div style={{ maxWidth: 480, background: '#fff', borderRadius: 16, padding: '32px', boxShadow: '0 8px 48px rgba(0,0,0,0.4)' }}>
      <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Report #{a.id}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#0D0D0D', marginBottom: 2 }}>Hi {a.customer.name.split(' ')[0]},</div>
      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>Your vehicle report — {a.createdAt}</div>
      <div style={{ background: '#0D0D0D', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>{a.vehicle.year} {a.vehicle.make} {a.vehicle.model} {a.vehicle.trim}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
          {[['Est. Value', fmt(a.estimatedValue), Y], ['Condition', `${a.conditionScore}/100`, '#22C55E'], ['Mileage', a.vehicle.mileage, '#fff']].map(([l, v, c], i) => (
            <div key={String(l)} style={{ paddingRight: i < 2 ? 18 : 0, borderRight: i < 2 ? '1px solid #1F1F1F' : 'none', paddingLeft: i > 0 ? 18 : 0 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 5 }}>{l}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: String(c), lineHeight: 1 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      {a.issues.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>Detected Issues</div>
          {a.issues.slice(0, 4).map(i => (
            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{i.label}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Est. ${i.repairLow}–${i.repairHigh}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: SEV[i.severity].color }}>{SEV[i.severity].label}</span>
            </div>
          ))}
        </div>
      )}
      {a.recommendations.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>Recommended Protections</div>
          {PRODUCTS.filter(p => a.recommendations.includes(p.id)).map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{p.label}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{p.desc}</div>
              </div>
              <span style={{ fontSize: 11, color: '#6B7280', cursor: 'pointer' }}>Learn more →</span>
            </div>
          ))}
        </div>
      )}
      <button style={{ width: '100%', padding: '14px', background: Y, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>View Full Report Online</button>
      <button style={{ width: '100%', padding: '14px', background: '#F5F5F5', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#6B7280' }}>Contact Dealership</button>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Page() {
  const [appraisals, setAppraisals] = useState<Appraisal[]>(SEED)
  const [selectedId, setSelectedId] = useState('84291')
  const [activeNav, setActiveNav]   = useState('Appraisals')
  const [activeTab, setActiveTab]   = useState('photos')
  const [showSMS, setShowSMS]       = useState(false)
  const [photosOk, setPhotosOk]     = useState(false)
  const [valuesOk, setValuesOk]     = useState(false)
  const [damageOk, setDamageOk]     = useState(false)
  const [notes, setNotes]           = useState('')
  const [uploads, setUploads]       = useState<Record<UploadCat, ValUpload | null>>({ book: null, mmr: null, retail: null })
  const [vals, setVals]             = useState({ retail: '43250', trade: '26800', wholesale: '24100' })

  const a   = appraisals.find(x => x.id === selectedId)!
  const upd = (id: string, ch: Partial<Appraisal>) => setAppraisals(p => p.map(x => x.id === id ? { ...x, ...ch } : x))

  const checklist = {
    customerInfo:    !!(a.customer.name && a.customer.phone),
    vehicleInfo:     !!(a.vehicle.vin && a.vehicle.year),
    photosReviewed:  photosOk,
    valuesReviewed:  valuesOk,
    damageReviewed:  damageOk,
    recommendations: a.recommendations.length > 0,
  }
  const doneCount = Object.values(checklist).filter(Boolean).length
  const allDone   = doneCount === 6

  const handleUpload = (cat: UploadCat, file: File) => {
    const r = new FileReader()
    r.onload = e => {
      setUploads(p => ({ ...p, [cat]: { fileName: file.name, preview: e.target?.result as string, status: 'parsing', data: {} } }))
      setTimeout(() => setUploads(p => ({ ...p, [cat]: { ...p[cat]!, status: 'parsed', data: { ...FAKE_PARSE[cat] } } })), 2000)
    }
    r.readAsDataURL(file)
  }

  const TABS = [
    { k: 'photos',  l: 'Photos'          },
    { k: 'values',  l: 'Values'          },
    { k: 'damage',  l: 'Damage'          },
    { k: 'vehicle', l: 'Vehicle Info'    },
    { k: 'notes',   l: 'Notes'           },
    { k: 'report',  l: 'Customer Report' },
  ]
  const WORKFLOW = [
    { label: 'Photos', tab: 'photos', done: photosOk },
    { label: 'Values', tab: 'values', done: valuesOk },
    { label: 'Damage', tab: 'damage', done: damageOk },
    { label: 'Report', tab: 'report', done: false    },
    { label: 'Send',   tab: '',       done: a.status === 'sent' },
  ]
  const NAV_ITEMS = ['Dashboard','Appraisals','Deals','Inventory','Customers','Reports','Products','Settings']

  const cardStyle = { background: S2, borderRadius: 12, border: `1px solid ${W4}`, padding: '18px 20px', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,sans-serif', overflow: 'hidden', background: '#090909' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>
      {showSMS && <SMSModal a={a} onClose={() => setShowSMS(false)} onSend={() => { upd(a.id, { status: 'sent' }); setShowSMS(false) }} />}

      {/* ── Sidebar ─────────────────────────────────── */}
      <div style={{ width: 190, background: '#060606', display: 'flex', flexDirection: 'column', flexShrink: 0, borderRight: `1px solid ${W4}` }}>
        <div style={{ padding: '26px 22px 22px' }}>
          <Logo size={18} />
        </div>
        <nav style={{ padding: '4px 10px', flex: 1 }}>
          {NAV_ITEMS.map(label => {
            const active = activeNav === label
            return (
              <div key={label} onClick={() => setActiveNav(label)} style={{ padding: '9px 12px', borderRadius: 8, marginBottom: 1, cursor: 'pointer', fontSize: 13, fontWeight: active ? 500 : 400, color: active ? W0 : W3, background: active ? S3 : 'transparent', transition: 'all 0.12s' }}>
                {label}
              </div>
            )
          })}
        </nav>
        <div style={{ padding: '16px 22px', borderTop: `1px solid ${W5}` }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: 0.4 }}>AutoLens v1.0</div>
        </div>
      </div>

      {/* ── Queue ───────────────────────────────────── */}
      <div style={{ width: 248, background: S1, borderRight: `1px solid ${W4}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '22px 20px 14px', borderBottom: `1px solid ${W5}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: W0 }}>Appraisals</div>
          <div style={{ fontSize: 10, color: W3, marginTop: 4 }}>
            {appraisals.filter(x => x.status === 'review').length} awaiting review
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {appraisals.map(x => {
            const sel = x.id === selectedId
            return (
              <div key={x.id} onClick={() => {
                setSelectedId(x.id)
                setVals({ retail: String(x.values.retail), trade: String(x.values.trade), wholesale: String(x.values.wholesale) })
                setPhotosOk(false); setValuesOk(false); setDamageOk(false)
                setActiveTab('photos'); setUploads({ book: null, mmr: null, retail: null })
              }} style={{ padding: '16px 20px', cursor: 'pointer', background: sel ? S2 : 'transparent', borderLeft: `2px solid ${sel ? Y : 'transparent'}`, borderBottom: `1px solid ${W5}`, transition: 'all 0.12s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: sel ? 600 : 400, color: sel ? W0 : W2 }}>{x.customer.name}</div>
                  <span style={{ fontSize: 9, color: STAT[x.status].color, fontWeight: 500, letterSpacing: 0.2 }}>{STAT[x.status].label}</span>
                </div>
                <div style={{ fontSize: 11, color: W3 }}>{x.vehicle.year} {x.vehicle.make} {x.vehicle.model}</div>
                {x.estimatedValue > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: W1, marginTop: 6, letterSpacing: -0.3 }}>{fmt(x.estimatedValue)}</div>}
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', marginTop: 3 }}>{x.createdAt}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Detail ──────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0A0A0A' }}>

        {/* Header */}
        <div style={{ padding: '18px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, borderBottom: `1px solid ${W5}` }}>
          <div>
            <div style={{ fontSize: 10, color: W3, letterSpacing: 0.5, marginBottom: 5 }}>#{a.id} · {a.createdAt}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: W0, letterSpacing: -0.6, lineHeight: 1 }}>{a.customer.name}</div>
          </div>
          <button onClick={() => allDone ? setShowSMS(true) : undefined}
            style={{ padding: '11px 26px', borderRadius: 10, border: allDone ? 'none' : `1px solid ${W4}`, background: allDone ? Y : 'transparent', fontSize: 13, fontWeight: 700, cursor: allDone ? 'pointer' : 'default', color: allDone ? '#111' : W3, transition: 'all 0.2s', letterSpacing: -0.2 }}>
            {a.status === 'sent' ? '✓ Sent' : 'Send to Customer →'}
          </button>
        </div>

        {/* Vehicle Hero */}
        <VehicleHero a={a} />

        {/* Workflow strip */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 32px', background: S1, borderBottom: `1px solid ${W5}`, flexShrink: 0 }}>
          {WORKFLOW.map((s, i) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', flex: i < WORKFLOW.length - 1 ? 1 : undefined }}>
              <div onClick={() => s.tab && setActiveTab(s.tab)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: s.tab ? 'pointer' : 'default', opacity: s.done || activeTab === s.tab ? 1 : 0.4 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.done ? Y : activeTab === s.tab ? W1 : W3, flexShrink: 0, transition: 'all 0.2s' }} />
                <span style={{ fontSize: 11, fontWeight: activeTab === s.tab ? 600 : 400, color: s.done ? W1 : activeTab === s.tab ? W0 : W2, whiteSpace: 'nowrap' }}>{s.label}</span>
              </div>
              {i < WORKFLOW.length - 1 && <div style={{ flex: 1, height: 1, background: W5, margin: '0 10px' }} />}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '0 32px', borderBottom: `1px solid ${W5}`, flexShrink: 0 }}>
          {TABS.map(({ k, l }) => (
            <button key={k} onClick={() => setActiveTab(k)} style={{ padding: '13px 15px 12px', border: 'none', background: 'none', fontSize: 12, fontWeight: activeTab === k ? 600 : 400, cursor: 'pointer', color: activeTab === k ? W0 : W3, borderBottom: `2px solid ${activeTab === k ? Y : 'transparent'}`, marginBottom: -1, whiteSpace: 'nowrap', letterSpacing: -0.1, transition: 'all 0.15s' }}>
              {l}
            </button>
          ))}
        </div>

        {/* Content + right sidebar */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 48px' }}>

            {/* Photos */}
            {activeTab === 'photos' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
                  {['Front','Front Left','Front Right','Rear','Rear Left','Rear Right','Left Side','Right Side','Interior','Engine','Odometer'].map(lbl => (
                    <div key={lbl} style={{ background: S2, borderRadius: 10, aspectRatio: '4/3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', border: `1.5px dashed ${W4}`, transition: 'border-color 0.15s' }}>
                      <span style={{ fontSize: 18, opacity: 0.3 }}>📷</span>
                      <span style={{ fontSize: 9, color: W3 }}>{lbl}</span>
                    </div>
                  ))}
                  <div style={{ background: S2, borderRadius: 10, aspectRatio: '4/3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', border: `1.5px dashed rgba(245,184,0,0.3)` }}>
                    <span style={{ fontSize: 20, color: Y, opacity: 0.7 }}>+</span>
                    <span style={{ fontSize: 9, color: Y, opacity: 0.7 }}>Add</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: W3, marginBottom: 20 }}>No photos uploaded yet. Photos strengthen the report.</div>
                {!photosOk
                  ? <button onClick={() => setPhotosOk(true)} style={{ padding: '11px 24px', background: S3, border: `1px solid ${W4}`, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: W1 }}>Mark Photos Reviewed</button>
                  : <div style={{ fontSize: 12, color: '#22C55E', fontWeight: 500 }}>✓ Photos reviewed</div>
                }
              </div>
            )}

            {/* Values */}
            {activeTab === 'values' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                  {([['Retail Value', 'retail'], ['Trade-In Value', 'trade'], ['Wholesale Value', 'wholesale']] as const).map(([label, key]) => (
                    <div key={key} style={{ ...cardStyle }}>
                      <div style={{ fontSize: 9, color: W3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>{label}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 16, color: W3 }}>$</span>
                        <input type="number" value={vals[key]} onChange={e => setVals(p => ({ ...p, [key]: e.target.value }))}
                          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 28, fontWeight: 800, color: W0, outline: 'none', padding: 0, letterSpacing: -0.8 }} />
                      </div>
                      <div style={{ fontSize: 10, color: W3, marginTop: 6 }}>Click to edit</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => upd(selectedId, { values: { retail: +vals.retail, trade: +vals.trade, wholesale: +vals.wholesale } })} style={{ padding: '10px 22px', background: S3, border: `1px solid ${W4}`, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: W1, marginBottom: 32 }}>Save Values</button>

                {(uploads.book?.status === 'parsed' || uploads.mmr?.status === 'parsed' || uploads.retail?.status === 'parsed') && (
                  <div style={{ background: '#080808', borderRadius: 14, padding: '20px 24px', marginBottom: 28, border: `1px solid ${W4}` }}>
                    <div style={{ fontSize: 9, color: W3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 18 }}>AI Valuation Summary</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
                      {[['Book Avg', uploads.book?.status === 'parsed' ? '$42,633' : null], ['MMR Avg', uploads.mmr?.status === 'parsed' ? '$39,350' : null], ['Retail Avg', uploads.retail?.status === 'parsed' ? '$44,600' : null], ['Suggested', uploads.book?.status === 'parsed' ? '$44,200' : null]].map(([l, v]) => (
                        <div key={String(l)}>
                          <div style={{ fontSize: 9, color: W3, marginBottom: 6 }}>{l}</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: v ? Y : S4, letterSpacing: -0.5 }}>{v || '—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: 10, color: W3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 16 }}>Upload Valuation Sources</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                  {(['book','mmr','retail'] as UploadCat[]).map(cat => (
                    <UploadCard key={cat} cat={cat} upload={uploads[cat]} onFile={handleUpload} onEdit={(c,k,v) => setUploads(p => ({ ...p, [c]: { ...p[c]!, data: { ...p[c]!.data, [k]: v } } }))} />
                  ))}
                </div>
                {!valuesOk
                  ? <button onClick={() => setValuesOk(true)} style={{ padding: '11px 24px', background: S3, border: `1px solid ${W4}`, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: W1 }}>Mark Values Reviewed</button>
                  : <div style={{ fontSize: 12, color: '#22C55E', fontWeight: 500 }}>✓ Values reviewed</div>
                }
              </div>
            )}

            {/* Damage */}
            {activeTab === 'damage' && (
              <div>
                {a.issues.length === 0 ? (
                  <div style={{ padding: '52px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.15 }}>✓</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: W2, marginBottom: 6 }}>No damage confirmed</div>
                    <div style={{ fontSize: 12, color: W3 }}>Issues appear here once photos are analyzed</div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 24 }}>
                    {a.issues.map(i => (
                      <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0', borderBottom: `1px solid ${W5}` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: SEV[i.severity].color, marginTop: 6, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: W1 }}>{i.label}</div>
                            <div style={{ fontSize: 11, color: W3, marginTop: 3 }}>Est. repair ${i.repairLow.toLocaleString()}–${i.repairHigh.toLocaleString()}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: SEV[i.severity].color }}>{SEV[i.severity].label}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!damageOk
                  ? <button onClick={() => setDamageOk(true)} style={{ padding: '11px 24px', background: S3, border: `1px solid ${W4}`, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: W1 }}>Mark Damage Reviewed</button>
                  : <div style={{ fontSize: 12, color: '#22C55E', fontWeight: 500 }}>✓ Damage reviewed</div>
                }
              </div>
            )}

            {/* Vehicle Info */}
            {activeTab === 'vehicle' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {[['Year',a.vehicle.year],['Make',a.vehicle.make],['Model',a.vehicle.model],['Trim',a.vehicle.trim],['VIN',a.vehicle.vin],['Mileage',a.vehicle.mileage+' mi'],['Color',a.vehicle.color]].map(([l,v]) => (
                  <div key={String(l)} style={{ padding: '18px 0', borderBottom: `1px solid ${W5}`, paddingRight: 32 }}>
                    <div style={{ fontSize: 9, color: W3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>{l}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: W1 }}>{String(v) || '—'}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            {activeTab === 'notes' && (
              <div>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes — visible only to your team..."
                  style={{ width: '100%', minHeight: 180, border: `1px solid ${W4}`, borderRadius: 12, padding: '18px', fontSize: 13, color: W1, resize: 'vertical', outline: 'none', background: S2, lineHeight: 1.7, fontFamily: 'inherit' }} />
                <button onClick={() => upd(a.id, { notes })} style={{ marginTop: 10, padding: '10px 22px', background: S3, border: `1px solid ${W4}`, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: W1 }}>Save</button>
              </div>
            )}

            {/* Customer Report */}
            {activeTab === 'report' && (
              <div>
                <div style={{ fontSize: 10, color: W3, marginBottom: 24, letterSpacing: 0.3 }}>Preview — exactly what {a.customer.name} will see.</div>
                <ReportPreview a={a} />
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{ width: 230, borderLeft: `1px solid ${W5}`, padding: '24px 20px', overflowY: 'auto', flexShrink: 0, background: S1 }}>
            <AICopilot checklist={checklist} allDone={allDone} doneCount={doneCount} />

            <div style={{ height: 20 }} />

            {/* Products */}
            <div>
              <div style={{ fontSize: 10, color: W3, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 16 }}>Protection Products</div>
              {a.recommendations.length === 0 && <div style={{ fontSize: 11, color: W3, marginBottom: 14 }}>None selected</div>}
              {PRODUCTS.map(p => {
                const on = a.recommendations.includes(p.id)
                return (
                  <div key={p.id} onClick={() => { const r = on ? a.recommendations.filter(x => x !== p.id) : [...a.recommendations, p.id]; upd(a.id, { recommendations: r }) }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14, cursor: 'pointer' }}>
                    <div style={{ width: 17, height: 17, borderRadius: 4, background: on ? Y : S4, border: `1px solid ${on ? Y : W4}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'all 0.15s' }}>
                      {on && <svg width={9} height={9} viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#111" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: on ? 500 : 400, color: on ? W1 : W3, lineHeight: 1.2 }}>{p.label}</div>
                      <div style={{ fontSize: 10, color: W3, marginTop: 2, opacity: on ? 0.6 : 0.4 }}>{p.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
