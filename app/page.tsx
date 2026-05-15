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

// ─── Palette — light luxury ───────────────────────────────────────────────────
const GOLD  = '#B8962A'          // warm restrained gold
const INK   = '#1A1A1C'          // near-black charcoal
const CHAR  = '#252527'          // mid charcoal (hero)
const PAGE  = '#F3F2EF'          // warm off-white canvas
const CARD  = '#FFFFFF'
const SURF  = '#ECEAE6'          // warm surface
const MUTED = '#6B6A67'
const DIM   = '#9E9D9A'
const LINE  = '#E6E4E0'

const SEV: Record<Severity, { label: string; color: string }> = {
  low:      { label: 'Low',      color: '#9E9D9A' },
  moderate: { label: 'Moderate', color: '#C07B2A' },
  high:     { label: 'High',     color: '#B83232' },
}
const STAT: Record<Status, { label: string; color: string }> = {
  pending:  { label: 'Pending',       color: DIM    },
  review:   { label: 'Needs Review',  color: '#C07B2A' },
  approved: { label: 'Ready to Send', color: '#2A7B52' },
  sent:     { label: 'Sent',          color: '#2A5A8C' },
}
const PRODUCTS = [
  { id: 'wheel',    label: 'Wheel & Tire',    desc: 'Wheel and tire coverage'  },
  { id: 'shield',   label: 'Windshield',      desc: 'Chip and crack coverage'  },
  { id: 'key',      label: 'Key Replacement', desc: 'Lost or broken key'       },
  { id: 'interior', label: 'Interior',        desc: 'Stain and tear coverage'  },
  { id: 'gps',      label: 'GPS & Theft',     desc: 'Tracking and recovery'    },
]
const UPLOAD_META: Record<UploadCat, { title: string; sources: string }> = {
  book:   { title: 'Book Values',     sources: 'KBB · Edmunds · Black Book'  },
  mmr:    { title: 'MMR / Wholesale', sources: 'Manheim MMR · Auction comps' },
  retail: { title: 'Retail Comps',    sources: 'Clean & accident listings'   },
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
function Logo({ size = 18, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', fontWeight: 800, fontSize: size, letterSpacing: -0.5, lineHeight: 1, userSelect: 'none' }}>
      <span style={{ color: dark ? INK : '#fff' }}>Aut</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size * 1.1, height: size * 1.1, borderRadius: '50%', background: GOLD, flexShrink: 0 }}>
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="#fff">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
      </span>
      <span style={{ color: dark ? INK : '#fff' }}>Lens</span>
    </div>
  )
}

// ─── Vehicle SVG — studio render on charcoal ──────────────────────────────────
function VehicleSVG() {
  const spokes = (cx: number, cy: number) =>
    [0, 72, 144, 216, 288].map(deg => {
      const a = (deg - 90) * Math.PI / 180
      return <line key={deg}
        x1={cx + 9 * Math.cos(a)} y1={cy + 9 * Math.sin(a)}
        x2={cx + 21 * Math.cos(a)} y2={cy + 21 * Math.sin(a)}
        stroke="#787878" strokeWidth={4.5} strokeLinecap="round" />
    })
  return (
    <svg viewBox="0 0 640 200" style={{ width: '100%', maxWidth: 480, height: 'auto', display: 'block' }}>
      {/* Ground shadow — soft, no glow */}
      <ellipse cx="320" cy="189" rx="255" ry="7" fill="rgba(0,0,0,0.38)" />

      {/* Body */}
      <path d="M 72 162 L 72 116 C 72 94 96 78 122 70 L 194 50 C 219 42 252 36 284 34 L 402 34 C 435 34 464 40 487 54 L 550 80 C 566 91 572 107 572 121 L 572 162 Z" fill="#E2DDD8" />

      {/* Lower body panel */}
      <path d="M 72 146 L 572 146 L 572 162 L 72 162 Z" fill="#CCCAC5" />

      {/* Body upper light catch */}
      <path d="M 126 72 L 485 56 L 547 80 L 536 76 C 508 63 468 37 402 37 L 284 37 C 254 37 221 43 196 52 L 138 70 Z" fill="rgba(255,255,255,0.32)" />

      {/* Glass */}
      <path d="M 200 52 L 484 58 L 544 82 L 538 126 L 194 126 Z" fill="#0F1D29" />

      {/* A-pillar */}
      <path d="M 484 58 L 544 82 L 538 126 L 488 126 L 486 60 Z" fill="#0A1520" />

      {/* Window pillars */}
      <rect x="388" y="58" width="5" height="68" fill="#060E18" />
      <rect x="286" y="35" width="5" height="91" fill="#060E18" />

      {/* Glass reflection — subtle */}
      <path d="M 204 55 L 381 60 L 379 72 L 204 68 Z" fill="rgba(255,255,255,0.055)" />

      {/* Roof rail */}
      <rect x="206" y="33" width="280" height="2.5" rx="1.25" fill="rgba(255,255,255,0.45)" />

      {/* Body character line */}
      <path d="M 79 112 Q 265 106 366 105 Q 465 104 566 110" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />

      {/* Wheel arches */}
      <path d="M 112 146 Q 108 110 140 102 Q 169 95 200 102 Q 228 110 228 146" fill="#E2DDD8" />
      <path d="M 420 146 Q 416 110 448 102 Q 477 95 507 102 Q 535 110 535 146" fill="#E2DDD8" />

      {/* Front bumper */}
      <path d="M 554 86 L 572 98 L 572 140 L 552 135 Z" fill="#D8D4CF" />
      <rect x="560" y="114" width="13" height="11" rx="2" fill="#B8B4B0" />

      {/* Headlight */}
      <path d="M 553 89 L 570 100 L 568 119 L 550 116 Z" fill="rgba(245,242,220,0.35)" />

      {/* Tail light */}
      <path d="M 72 100 L 86 98 L 88 134 L 72 134 Z" fill="rgba(180,40,40,0.5)" />

      {/* Mirror */}
      <path d="M 545 90 L 557 88 L 557 98 L 545 97 Z" fill="#CCCAC5" />

      {/* Door handles */}
      <rect x="302" y="95" width="34" height="4" rx="2" fill="rgba(0,0,0,0.15)" />
      <rect x="426" y="95" width="34" height="4" rx="2" fill="rgba(0,0,0,0.15)" />

      {/* Front wheel */}
      <circle cx="170" cy="162" r="42" fill="#1A1A1A" />
      <circle cx="170" cy="162" r="35" fill="#222222" />
      <circle cx="170" cy="162" r="23" fill="#282828" />
      <circle cx="170" cy="162" r="8"  fill="#303030" />
      {spokes(170, 162)}
      <path d={`M ${170 - 35 * 0.766} ${162 - 35 * 0.643} A 35 35 0 0 1 ${170 + 35 * 0.766} ${162 - 35 * 0.643}`}
        fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.8" />

      {/* Rear wheel */}
      <circle cx="462" cy="162" r="42" fill="#1A1A1A" />
      <circle cx="462" cy="162" r="35" fill="#222222" />
      <circle cx="462" cy="162" r="23" fill="#282828" />
      <circle cx="462" cy="162" r="8"  fill="#303030" />
      {spokes(462, 162)}
      <path d={`M ${462 - 35 * 0.766} ${162 - 35 * 0.643} A 35 35 0 0 1 ${462 + 35 * 0.766} ${162 - 35 * 0.643}`}
        fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.8" />
    </svg>
  )
}

// ─── Vehicle Hero Card ────────────────────────────────────────────────────────
function VehicleHero({ a }: { a: Appraisal }) {
  const scoreCol = a.conditionScore >= 85 ? '#4CAF80' : a.conditionScore >= 70 ? GOLD : '#B84040'
  return (
    <div style={{ background: CHAR, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
      {/* Subtle warm floor glow — no neon, just atmosphere */}
      <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 500, height: 48, background: 'radial-gradient(ellipse, rgba(184,150,42,0.08) 0%, transparent 68%)' }} />

      <div style={{ display: 'flex', alignItems: 'center', padding: '28px 36px 22px', position: 'relative', zIndex: 1 }}>

        {/* Left metrics */}
        <div style={{ width: 158, flexShrink: 0 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 7 }}>Estimated Value</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', letterSpacing: -0.8, lineHeight: 1 }}>{fmt(a.estimatedValue)}</div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 7 }}>Trade Value</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: -0.3 }}>{fmt(a.values.trade)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 7 }}>Confidence</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4CAF80', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#4CAF80', fontWeight: 500 }}>High</span>
            </div>
          </div>
        </div>

        {/* Vehicle centered */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}>
          <VehicleSVG />
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 2.5, textTransform: 'uppercase', marginTop: 6 }}>
            {a.vehicle.year} · {a.vehicle.make} {a.vehicle.model} · {a.vehicle.mileage} mi
          </div>
        </div>

        {/* Right metrics */}
        <div style={{ width: 158, flexShrink: 0, textAlign: 'right' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 7 }}>Condition</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: scoreCol, letterSpacing: -0.8, lineHeight: 1 }}>
              {a.conditionScore}<span style={{ fontSize: 15, opacity: 0.5, fontWeight: 500 }}>/100</span>
            </div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 7 }}>Issues Found</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: a.issues.length > 0 ? '#D4924A' : 'rgba(255,255,255,0.6)', letterSpacing: -0.3 }}>{a.issues.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 7 }}>Status</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: STAT[a.status].color === MUTED ? 'rgba(255,255,255,0.45)' : STAT[a.status].color.replace('2A', '6A') }}>{STAT[a.status].label}</div>
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
        <circle cx={24} cy={24} r={r} fill="none" stroke={SURF} strokeWidth={3.5} />
        <circle cx={24} cy={24} r={r} fill="none" stroke={GOLD} strokeWidth={3.5}
          strokeDasharray={`${(done / total) * c} ${c}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>{done}</span>
      </div>
    </div>
  )
}

// ─── AI Inspection Status ─────────────────────────────────────────────────────
function InspectionStatus({ checklist, allDone, doneCount }: { checklist: Record<string, boolean>; allDone: boolean; doneCount: number }) {
  const steps = [
    { key: 'customerInfo',    label: 'Customer profile'   },
    { key: 'vehicleInfo',     label: 'Vehicle details'    },
    { key: 'photosReviewed',  label: 'Photo inspection'   },
    { key: 'valuesReviewed',  label: 'Market valuation'   },
    { key: 'damageReviewed',  label: 'Damage assessment'  },
    { key: 'recommendations', label: 'Product selection'  },
  ]
  return (
    <div style={{ background: CARD, borderRadius: 14, padding: '20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 3 }}>Inspection Status</div>
          <div style={{ fontSize: 10, color: DIM }}>
            {allDone ? 'Ready to deliver' : `${6 - doneCount} remaining`}
          </div>
        </div>
        <ProgressRing done={doneCount} total={6} />
      </div>
      {steps.map(({ key, label }) => {
        const done = checklist[key]
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? GOLD : SURF, transition: 'background 0.2s' }}>
              {done && <svg width={8} height={8} viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </div>
            <span style={{ fontSize: 12, color: done ? INK : DIM, fontWeight: done ? 500 : 400, transition: 'color 0.2s' }}>{label}</span>
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
  if (ed) return <input autoFocus value={v} onChange={e => setV(e.target.value)} onBlur={() => { onChange(v); setEd(false) }} onKeyDown={e => e.key === 'Enter' && (onChange(v), setEd(false))} style={{ width: '100%', border: 'none', borderBottom: `1.5px solid ${GOLD}`, outline: 'none', fontSize: 12, fontWeight: 500, padding: '2px 0', background: 'transparent', color: INK, fontFamily: 'inherit' }} />
  return <span onClick={() => setEd(true)} style={{ cursor: 'text', fontWeight: 500, color: INK }}>{v}<span style={{ color: DIM, marginLeft: 3, fontSize: 9 }}>✎</span></span>
}

// ─── Upload Card ──────────────────────────────────────────────────────────────
function UploadCard({ cat, upload, onFile, onEdit }: { cat: UploadCat; upload: ValUpload | null; onFile: (c: UploadCat, f: File) => void; onEdit: (c: UploadCat, k: string, v: string) => void }) {
  const ref  = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const { title, sources } = UPLOAD_META[cat]
  const pick = (f: File) => onFile(cat, f)
  return (
    <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${drag ? GOLD : LINE}`, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.05)', transition: 'border-color 0.15s' }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: INK }}>{title}</div>
          <div style={{ fontSize: 10, color: DIM, marginTop: 2 }}>{sources}</div>
        </div>
        {upload && <span style={{ fontSize: 10, fontWeight: 500, color: upload.status === 'parsed' ? '#2A7B52' : '#2A5A8C' }}>{upload.status === 'parsed' ? '✓ Parsed' : 'Analyzing…'}</span>}
      </div>
      <div style={{ padding: '14px 16px' }}>
        {!upload ? (
          <div onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) pick(f) }}
            onClick={() => ref.current?.click()}
            style={{ border: `1.5px dashed ${drag ? GOLD : LINE}`, borderRadius: 9, padding: '20px', textAlign: 'center', cursor: 'pointer', background: drag ? '#FAF8F2' : SURF, transition: 'all 0.15s' }}>
            <div style={{ fontSize: 12, fontWeight: 400, color: MUTED }}>Drop or click to upload</div>
            <div style={{ fontSize: 10, color: DIM, marginTop: 3 }}>PNG · JPG · PDF</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: upload.status === 'parsed' ? 14 : 0 }}>
              {upload.preview && <img src={upload.preview} alt="" style={{ width: 52, height: 38, objectFit: 'cover', borderRadius: 6, flexShrink: 0, border: `1px solid ${LINE}` }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{upload.fileName}</div>
                <button onClick={() => ref.current?.click()} style={{ fontSize: 10, color: DIM, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 3, fontFamily: 'inherit' }}>Replace</button>
              </div>
            </div>
            {upload.status === 'parsing' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: MUTED, fontSize: 11 }}>
                <span style={{ display: 'inline-block', width: 11, height: 11, border: `2px solid ${LINE}`, borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Analyzing screenshot…
              </div>
            )}
            {upload.status === 'parsed' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(upload.data).map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: `1px solid ${LINE}` }}>
                      <td style={{ padding: '6px 0', fontSize: 10, color: DIM, width: '48%' }}>{k}</td>
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
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,28,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: CARD, borderRadius: 20, padding: '32px', width: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <div style={{ fontSize: 19, fontWeight: 700, color: INK, marginBottom: 4 }}>Text Message Preview</div>
        <div style={{ fontSize: 12, color: DIM, marginBottom: 24 }}>Exactly what {a.customer.name} will receive.</div>
        <div style={{ background: SURF, borderRadius: 14, padding: '18px', marginBottom: 24 }}>
          <div style={{ fontSize: 9, color: DIM, textAlign: 'center', marginBottom: 12, letterSpacing: 0.8, textTransform: 'uppercase' }}>AutoLens · SMS</div>
          <div style={{ background: CARD, borderRadius: 12, borderBottomLeftRadius: 3, padding: '14px 16px', fontSize: 12.5, lineHeight: 1.7, color: INK, whiteSpace: 'pre-wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>{msg}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${LINE}`, background: CARD, fontSize: 13, fontWeight: 500, cursor: 'pointer', color: MUTED, fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={onSend} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: INK, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#fff', fontFamily: 'inherit' }}>Send Now →</button>
        </div>
      </div>
    </div>
  )
}

// ─── Customer Report Preview ──────────────────────────────────────────────────
function ReportPreview({ a }: { a: Appraisal }) {
  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ fontSize: 11, color: DIM, marginBottom: 4 }}>Report #{a.id}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: INK, marginBottom: 3 }}>Hi {a.customer.name.split(' ')[0]},</div>
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 26 }}>Your vehicle report — {a.createdAt}</div>
      <div style={{ background: INK, borderRadius: 14, padding: '22px 26px', marginBottom: 26 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>{a.vehicle.year} {a.vehicle.make} {a.vehicle.model} {a.vehicle.trim}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
          {[['Est. Value', fmt(a.estimatedValue), GOLD], ['Condition', `${a.conditionScore}/100`, '#4CAF80'], ['Odometer', a.vehicle.mileage, '#fff']].map(([l, v, c], i) => (
            <div key={String(l)} style={{ paddingRight: i < 2 ? 18 : 0, borderRight: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none', paddingLeft: i > 0 ? 18 : 0 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 5 }}>{l}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: String(c), lineHeight: 1 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      {a.issues.length > 0 && (
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: DIM, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 14 }}>Detected Issues</div>
          {a.issues.slice(0, 4).map(i => (
            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: `1px solid ${LINE}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{i.label}</div>
                <div style={{ fontSize: 11, color: DIM, marginTop: 2 }}>Est. ${i.repairLow}–${i.repairHigh}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: SEV[i.severity].color }}>{SEV[i.severity].label}</span>
            </div>
          ))}
        </div>
      )}
      {a.recommendations.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: DIM, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 14 }}>Recommended Protections</div>
          {PRODUCTS.filter(p => a.recommendations.includes(p.id)).map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: `1px solid ${LINE}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{p.label}</div>
                <div style={{ fontSize: 11, color: DIM, marginTop: 1 }}>{p.desc}</div>
              </div>
              <span style={{ fontSize: 11, color: MUTED, cursor: 'pointer' }}>Learn more →</span>
            </div>
          ))}
        </div>
      )}
      <button style={{ width: '100%', padding: '14px', background: GOLD, border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 8, color: '#fff' }}>View Full Report Online</button>
      <button style={{ width: '100%', padding: '14px', background: SURF, border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 500, cursor: 'pointer', color: MUTED }}>Contact Dealership</button>
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

  const btn = (label: string, onClick: () => void, primary = false) => (
    <button onClick={onClick} style={{ padding: '11px 22px', background: primary ? INK : SURF, border: `1px solid ${primary ? INK : LINE}`, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: primary ? '#fff' : MUTED, fontFamily: 'inherit', transition: 'opacity 0.15s' }}>
      {label}
    </button>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,sans-serif', overflow: 'hidden', background: PAGE }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>
      {showSMS && <SMSModal a={a} onClose={() => setShowSMS(false)} onSend={() => { upd(a.id, { status: 'sent' }); setShowSMS(false) }} />}

      {/* ── Sidebar ──────────────────────────── */}
      <div style={{ width: 190, background: INK, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '26px 22px 22px' }}>
          <Logo size={18} />
        </div>
        <nav style={{ padding: '4px 10px', flex: 1 }}>
          {NAV_ITEMS.map(label => {
            const active = activeNav === label
            return (
              <div key={label} onClick={() => setActiveNav(label)} style={{ padding: '9px 12px', borderRadius: 8, marginBottom: 1, cursor: 'pointer', fontSize: 13, fontWeight: active ? 500 : 400, color: active ? '#fff' : 'rgba(255,255,255,0.35)', background: active ? 'rgba(255,255,255,0.08)' : 'transparent', transition: 'all 0.12s' }}>
                {label}
              </div>
            )
          })}
        </nav>
        <div style={{ padding: '16px 22px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 0.4 }}>AutoLens v1.0</div>
        </div>
      </div>

      {/* ── Queue ────────────────────────────── */}
      <div style={{ width: 252, background: CARD, borderRight: `1px solid ${LINE}`, display: 'flex', flexDirection: 'column', flexShrink: 0, boxShadow: '2px 0 12px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '22px 20px 14px', borderBottom: `1px solid ${LINE}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: INK }}>Appraisals</div>
          <div style={{ fontSize: 10, color: DIM, marginTop: 3 }}>{appraisals.filter(x => x.status === 'review').length} need review</div>
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
              }} style={{ padding: '15px 20px', cursor: 'pointer', background: sel ? '#FAFAF8' : 'transparent', borderLeft: `2px solid ${sel ? GOLD : 'transparent'}`, borderBottom: `1px solid ${LINE}`, transition: 'all 0.12s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                  <div style={{ fontSize: 13, fontWeight: sel ? 600 : 400, color: sel ? INK : MUTED }}>{x.customer.name}</div>
                  <span style={{ fontSize: 9, color: STAT[x.status].color, fontWeight: 600, letterSpacing: 0.2 }}>{STAT[x.status].label}</span>
                </div>
                <div style={{ fontSize: 11, color: DIM }}>{x.vehicle.year} {x.vehicle.make} {x.vehicle.model}</div>
                {x.estimatedValue > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginTop: 6, letterSpacing: -0.3 }}>{fmt(x.estimatedValue)}</div>}
                <div style={{ fontSize: 10, color: DIM, marginTop: 2 }}>{x.createdAt}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Detail ───────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Page header */}
        <div style={{ padding: '18px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: CARD, borderBottom: `1px solid ${LINE}` }}>
          <div>
            <div style={{ fontSize: 10, color: DIM, letterSpacing: 0.4, marginBottom: 4 }}>#{a.id} · {a.createdAt}</div>
            <div style={{ fontSize: 21, fontWeight: 700, color: INK, letterSpacing: -0.5, lineHeight: 1 }}>{a.customer.name}</div>
          </div>
          <button onClick={() => allDone ? setShowSMS(true) : undefined}
            style={{ padding: '11px 26px', borderRadius: 10, border: allDone ? 'none' : `1px solid ${LINE}`, background: allDone ? GOLD : SURF, fontSize: 13, fontWeight: 600, cursor: allDone ? 'pointer' : 'default', color: allDone ? '#fff' : DIM, transition: 'all 0.2s', fontFamily: 'inherit' }}>
            {a.status === 'sent' ? '✓ Sent' : 'Send to Customer →'}
          </button>
        </div>

        {/* Vehicle Hero */}
        <VehicleHero a={a} />

        {/* Workflow strip */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '13px 32px', background: CARD, borderBottom: `1px solid ${LINE}`, flexShrink: 0 }}>
          {WORKFLOW.map((s, i) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', flex: i < WORKFLOW.length - 1 ? 1 : undefined }}>
              <div onClick={() => s.tab && setActiveTab(s.tab)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: s.tab ? 'pointer' : 'default', opacity: s.done || activeTab === s.tab ? 1 : 0.4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.done ? GOLD : activeTab === s.tab ? INK : LINE, flexShrink: 0, transition: 'background 0.2s' }} />
                <span style={{ fontSize: 11, fontWeight: activeTab === s.tab ? 600 : 400, color: s.done ? INK : activeTab === s.tab ? INK : MUTED, whiteSpace: 'nowrap' }}>{s.label}</span>
              </div>
              {i < WORKFLOW.length - 1 && <div style={{ flex: 1, height: 1, background: LINE, margin: '0 10px' }} />}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '0 32px', background: CARD, borderBottom: `1px solid ${LINE}`, flexShrink: 0 }}>
          {TABS.map(({ k, l }) => (
            <button key={k} onClick={() => setActiveTab(k)} style={{ padding: '13px 14px 12px', border: 'none', background: 'none', fontSize: 12, fontWeight: activeTab === k ? 600 : 400, cursor: 'pointer', color: activeTab === k ? INK : DIM, borderBottom: `2px solid ${activeTab === k ? GOLD : 'transparent'}`, marginBottom: -1, whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              {l}
            </button>
          ))}
        </div>

        {/* Content + sidebar */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 48px', background: PAGE }}>

            {/* Photos */}
            {activeTab === 'photos' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 22 }}>
                  {['Front','Front Left','Front Right','Rear','Rear Left','Rear Right','Left Side','Right Side','Interior','Engine','Odometer'].map(lbl => (
                    <div key={lbl} style={{ background: CARD, borderRadius: 10, aspectRatio: '4/3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', border: `1.5px dashed ${LINE}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'border-color 0.15s' }}>
                      <span style={{ fontSize: 16, opacity: 0.25 }}>📷</span>
                      <span style={{ fontSize: 9, color: DIM }}>{lbl}</span>
                    </div>
                  ))}
                  <div style={{ background: CARD, borderRadius: 10, aspectRatio: '4/3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', border: `1.5px dashed ${GOLD}`, opacity: 0.6 }}>
                    <span style={{ fontSize: 18, color: GOLD }}>+</span>
                    <span style={{ fontSize: 9, color: GOLD, fontWeight: 500 }}>Add</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: DIM, marginBottom: 20 }}>No photos uploaded yet. Photos strengthen the customer report.</div>
                {!photosOk
                  ? btn('Mark Photos Reviewed', () => setPhotosOk(true), true)
                  : <div style={{ fontSize: 12, color: '#2A7B52', fontWeight: 500 }}>✓ Photos reviewed</div>
                }
              </div>
            )}

            {/* Values */}
            {activeTab === 'values' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 22 }}>
                  {([['Retail Value','retail'],['Trade-In Value','trade'],['Wholesale Value','wholesale']] as const).map(([label, key]) => (
                    <div key={key} style={{ background: CARD, borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize: 9, color: DIM, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                        <span style={{ fontSize: 15, color: MUTED }}>$</span>
                        <input type="number" value={vals[key]} onChange={e => setVals(p => ({ ...p, [key]: e.target.value }))}
                          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 28, fontWeight: 700, color: INK, outline: 'none', padding: 0, letterSpacing: -0.8, fontFamily: 'inherit' }} />
                      </div>
                      <div style={{ fontSize: 9, color: DIM, marginTop: 5 }}>Click to edit</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => upd(selectedId, { values: { retail: +vals.retail, trade: +vals.trade, wholesale: +vals.wholesale } })} style={{ padding: '10px 20px', background: CARD, border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: MUTED, fontFamily: 'inherit', marginBottom: 30 }}>Save Values</button>

                {(uploads.book?.status === 'parsed' || uploads.mmr?.status === 'parsed' || uploads.retail?.status === 'parsed') && (
                  <div style={{ background: INK, borderRadius: 14, padding: '20px 24px', marginBottom: 28 }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>AI Valuation Summary</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
                      {[['Book Avg', uploads.book?.status === 'parsed' ? '$42,633' : null], ['MMR Avg', uploads.mmr?.status === 'parsed' ? '$39,350' : null], ['Retail Avg', uploads.retail?.status === 'parsed' ? '$44,600' : null], ['Suggested', uploads.book?.status === 'parsed' ? '$44,200' : null]].map(([l, v]) => (
                        <div key={String(l)}>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>{l}</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: v ? GOLD : 'rgba(255,255,255,0.15)', letterSpacing: -0.5 }}>{v || '—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: 10, color: DIM, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 }}>Valuation Sources</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                  {(['book','mmr','retail'] as UploadCat[]).map(cat => (
                    <UploadCard key={cat} cat={cat} upload={uploads[cat]} onFile={handleUpload} onEdit={(c,k,v) => setUploads(p => ({ ...p, [c]: { ...p[c]!, data: { ...p[c]!.data, [k]: v } } }))} />
                  ))}
                </div>
                {!valuesOk
                  ? btn('Mark Values Reviewed', () => setValuesOk(true), true)
                  : <div style={{ fontSize: 12, color: '#2A7B52', fontWeight: 500 }}>✓ Values reviewed</div>
                }
              </div>
            )}

            {/* Damage */}
            {activeTab === 'damage' && (
              <div>
                {a.issues.length === 0 ? (
                  <div style={{ padding: '52px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: DIM, marginBottom: 6 }}>No damage confirmed yet</div>
                    <div style={{ fontSize: 11, color: DIM }}>Issues appear here once photos are analyzed</div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 24 }}>
                    {a.issues.map(i => (
                      <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0', borderBottom: `1px solid ${LINE}` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: SEV[i.severity].color, marginTop: 7, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: INK }}>{i.label}</div>
                            <div style={{ fontSize: 11, color: DIM, marginTop: 3 }}>Est. repair ${i.repairLow.toLocaleString()}–${i.repairHigh.toLocaleString()}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: SEV[i.severity].color }}>{SEV[i.severity].label}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!damageOk
                  ? btn('Mark Damage Reviewed', () => setDamageOk(true), true)
                  : <div style={{ fontSize: 12, color: '#2A7B52', fontWeight: 500 }}>✓ Damage reviewed</div>
                }
              </div>
            )}

            {/* Vehicle Info */}
            {activeTab === 'vehicle' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {[['Year',a.vehicle.year],['Make',a.vehicle.make],['Model',a.vehicle.model],['Trim',a.vehicle.trim],['VIN',a.vehicle.vin],['Mileage',a.vehicle.mileage+' mi'],['Color',a.vehicle.color]].map(([l,v]) => (
                  <div key={String(l)} style={{ padding: '18px 0', borderBottom: `1px solid ${LINE}`, paddingRight: 32 }}>
                    <div style={{ fontSize: 9, color: DIM, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>{l}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>{String(v) || '—'}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            {activeTab === 'notes' && (
              <div>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes — visible only to your team..."
                  style={{ width: '100%', minHeight: 180, border: `1px solid ${LINE}`, borderRadius: 12, padding: '18px', fontSize: 13, color: INK, resize: 'vertical', outline: 'none', background: CARD, lineHeight: 1.7, fontFamily: 'inherit', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }} />
                <button onClick={() => upd(a.id, { notes })} style={{ marginTop: 10, padding: '10px 22px', background: INK, border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#fff', fontFamily: 'inherit' }}>Save</button>
              </div>
            )}

            {/* Customer Report */}
            {activeTab === 'report' && (
              <div>
                <div style={{ fontSize: 11, color: DIM, marginBottom: 24 }}>Preview — exactly what {a.customer.name} will see.</div>
                <ReportPreview a={a} />
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{ width: 230, borderLeft: `1px solid ${LINE}`, padding: '24px 20px', overflowY: 'auto', flexShrink: 0, background: PAGE }}>
            <InspectionStatus checklist={checklist} allDone={allDone} doneCount={doneCount} />

            <div style={{ height: 20 }} />

            <div style={{ background: CARD, borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 16 }}>Protection Products</div>
              {a.recommendations.length === 0 && <div style={{ fontSize: 11, color: DIM, marginBottom: 12 }}>None selected</div>}
              {PRODUCTS.map(p => {
                const on = a.recommendations.includes(p.id)
                return (
                  <div key={p.id} onClick={() => { const r = on ? a.recommendations.filter(x => x !== p.id) : [...a.recommendations, p.id]; upd(a.id, { recommendations: r }) }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 13, cursor: 'pointer' }}>
                    <div style={{ width: 17, height: 17, borderRadius: 4, background: on ? GOLD : SURF, border: `1px solid ${on ? GOLD : LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'all 0.15s' }}>
                      {on && <svg width={9} height={9} viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: on ? 600 : 400, color: on ? INK : MUTED, lineHeight: 1.2 }}>{p.label}</div>
                      <div style={{ fontSize: 10, color: DIM, marginTop: 2 }}>{p.desc}</div>
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
