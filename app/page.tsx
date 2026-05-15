'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

type Severity = 'low' | 'moderate' | 'high'
type Status = 'pending' | 'review' | 'approved' | 'sent'
type UploadCat = 'book' | 'mmr' | 'retail'

interface Issue {
  id: string
  label: string
  severity: Severity
  repairLow: number
  repairHigh: number
}

interface ValUpload {
  fileName: string
  preview: string
  status: 'parsing' | 'parsed'
  data: Record<string, string>
}

interface Appraisal {
  id: string
  status: Status
  createdAt: string
  customer: { name: string; phone: string }
  vehicle: { year: string; make: string; model: string; trim: string; vin: string; mileage: string; color: string }
  issues: Issue[]
  values: { retail: number; trade: number; wholesale: number }
  estimatedValue: number
  conditionScore: number
  recommendations: string[]
  notes: string
}

interface Photo {
  id: string
  angle: string
  preview: string
  uploading: boolean
}

const PHOTO_ANGLES = [
  'Front', 'Front Left', 'Front Right',
  'Rear', 'Rear Left', 'Rear Right',
  'Left Side', 'Right Side',
  'Interior', 'Engine', 'Odometer', 'Damage',
]

const GOLD = '#B8962A'
const INK = '#1A1A1C'
const CHAR = '#252527'
const PAGE = '#F3F2EF'
const CARD = '#FFFFFF'
const SURF = '#ECEAE6'
const MUTED = '#6B6A67'
const DIM = '#9E9D9A'
const LINE = '#E6E4E0'

const SEV: Record<Severity, { label: string; color: string }> = {
  low: { label: 'Low', color: '#8C8A84' },
  moderate: { label: 'Moderate', color: '#B87528' },
  high: { label: 'High', color: '#B83232' },
}

const STAT: Record<Status, { label: string; color: string }> = {
  pending: { label: 'Pending', color: DIM },
  review: { label: 'Needs Review', color: '#B87528' },
  approved: { label: 'Ready to Send', color: '#2A7B52' },
  sent: { label: 'Sent', color: '#2A5A8C' },
}

const PRODUCTS = [
  { id: 'wheel', label: 'Wheel & Tire', desc: 'Wheel and tire coverage' },
  { id: 'shield', label: 'Windshield', desc: 'Chip and crack coverage' },
  { id: 'key', label: 'Key Replacement', desc: 'Lost or broken key' },
  { id: 'interior', label: 'Interior', desc: 'Stain and tear coverage' },
  { id: 'gps', label: 'GPS & Theft', desc: 'Tracking and recovery' },
]

const UPLOAD_META: Record<UploadCat, { title: string; sources: string }> = {
  book: { title: 'Book Values', sources: 'KBB · Edmunds · Black Book' },
  mmr: { title: 'MMR / Wholesale', sources: 'Manheim MMR · Auction comps' },
  retail: { title: 'Retail Comps', sources: 'Clean & accident listings' },
}

const FAKE_PARSE: Record<UploadCat, Record<string, string>> = {
  book: { 'Trade-In': '$39,800', 'Private Party': '$42,200', Retail: '$45,900', Source: 'KBB', Confidence: 'High' },
  mmr: { 'Clean Avg': '$41,500', 'Accident Avg': '$37,200', Transactions: '8', 'Mileage Range': '48k-65k', Confidence: 'Medium' },
  retail: { 'Clean Retail': '$46,900', 'Accident Retail': '$42,300', Listings: '12', Spread: '$4,600', Confidence: 'High' },
}

const SEED: Appraisal[] = [
  {
    id: '84291',
    status: 'review',
    createdAt: 'May 12, 2:45 PM',
    customer: { name: 'Mike Johnson', phone: '(305) 555-1234' },
    vehicle: { year: '2020', make: 'Land Rover', model: 'Range Rover Sport', trim: 'HSE', vin: 'SALWR2RV2LA123456', mileage: '58,342', color: 'Black' },
    issues: [
      { id: 'i1', label: 'Front Right Wheel Damage', severity: 'moderate', repairLow: 150, repairHigh: 300 },
      { id: 'i2', label: 'Windshield Chip', severity: 'low', repairLow: 75, repairHigh: 150 },
      { id: 'i3', label: 'Interior Wear', severity: 'moderate', repairLow: 250, repairHigh: 600 },
      { id: 'i4', label: 'Only 1 Key Detected', severity: 'high', repairLow: 400, repairHigh: 1200 },
    ],
    values: { retail: 43250, trade: 26800, wholesale: 24100 },
    estimatedValue: 42750,
    conditionScore: 82,
    recommendations: ['wheel', 'shield', 'key'],
    notes: '',
  },
  {
    id: '84290',
    status: 'approved',
    createdAt: 'May 12, 12:30 PM',
    customer: { name: 'Sarah Williams', phone: '(305) 555-5678' },
    vehicle: { year: '2021', make: 'Mercedes-Benz', model: 'GLE', trim: '350 4MATIC', vin: 'W1N0G8EB4MF123456', mileage: '31,200', color: 'Silver' },
    issues: [{ id: 'i5', label: 'Minor Paint Scratch', severity: 'low', repairLow: 100, repairHigh: 300 }],
    values: { retail: 52000, trade: 38000, wholesale: 35000 },
    estimatedValue: 51500,
    conditionScore: 91,
    recommendations: ['shield', 'interior'],
    notes: '',
  },
  {
    id: '84289',
    status: 'pending',
    createdAt: 'May 12, 11:05 AM',
    customer: { name: 'Chris Davis', phone: '(305) 555-3456' },
    vehicle: { year: '2019', make: 'Audi', model: 'Q7', trim: 'Premium Plus', vin: 'WA1BXAF75KD012345', mileage: '44,100', color: 'White' },
    issues: [],
    values: { retail: 0, trade: 0, wholesale: 0 },
    estimatedValue: 0,
    conditionScore: 0,
    recommendations: [],
    notes: '',
  },
  {
    id: '84288',
    status: 'sent',
    createdAt: 'May 12, 10:30 AM',
    customer: { name: 'James Wilson', phone: '(305) 555-7890' },
    vehicle: { year: '2020', make: 'Ford', model: 'F-150', trim: 'XLT', vin: '1FTEW1E53KFA12345', mileage: '67,890', color: 'Blue' },
    issues: [
      { id: 'i6', label: 'Bed Liner Damage', severity: 'low', repairLow: 200, repairHigh: 500 },
      { id: 'i7', label: 'Front Bumper Scuff', severity: 'moderate', repairLow: 300, repairHigh: 700 },
    ],
    values: { retail: 38000, trade: 28000, wholesale: 25000 },
    estimatedValue: 37500,
    conditionScore: 76,
    recommendations: ['wheel', 'gps'],
    notes: '',
  },
]

const fmt = (n: number) => (n > 0 ? `$${n.toLocaleString()}` : '—')
const softShadow = '0 12px 34px rgba(40,34,25,0.08)'

const shell: React.CSSProperties = {
  display: 'flex',
  height: '100vh',
  overflow: 'hidden',
  background: PAGE,
  color: INK,
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
}

function Logo({ size = 18, light = false }: { size?: number; light?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', fontWeight: 800, fontSize: size, letterSpacing: -0.5, lineHeight: 1 }}>
      <span style={{ color: light ? '#fff' : INK }}>Aut</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size * 1.1, height: size * 1.1, borderRadius: '50%', background: GOLD, color: '#fff', margin: '0 1px', fontSize: size * 0.5 }}>AL</span>
      <span style={{ color: light ? '#fff' : INK }}>Lens</span>
    </div>
  )
}

function VehicleHero({ a }: { a: Appraisal }) {
  const scoreColor = a.conditionScore >= 85 ? '#4CAF80' : a.conditionScore >= 70 ? GOLD : '#B84040'
  return (
    <section style={{ margin: 24, marginBottom: 0, borderRadius: 26, overflow: 'hidden', background: `linear-gradient(135deg, ${CHAR}, #343230)`, boxShadow: '0 22px 70px rgba(35,30,25,0.20)', flexShrink: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '170px minmax(360px, 1fr) 170px', alignItems: 'center', gap: 20, padding: '28px 34px 20px', minHeight: 300 }}>
        <HeroMetric label="Estimated Value" value={fmt(a.estimatedValue)} />
        <div style={{ textAlign: 'center', minWidth: 0 }}>
          <img src="/vehicle-hero.png" alt={`${a.vehicle.year} ${a.vehicle.make} ${a.vehicle.model}`} style={{ width: '100%', maxWidth: 620, height: 220, objectFit: 'contain', display: 'block', margin: '0 auto', filter: 'saturate(.96) contrast(.98)' }} />
          <div style={{ color: 'rgba(255,255,255,.42)', fontSize: 10, letterSpacing: 2.6, textTransform: 'uppercase' }}>
            {a.vehicle.year} · {a.vehicle.make} {a.vehicle.model} · {a.vehicle.mileage} mi
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <HeroMetric label="Condition" value={`${a.conditionScore}/100`} color={scoreColor} />
          <div style={{ height: 22 }} />
          <HeroMetric label="Status" value={STAT[a.status].label} color={STAT[a.status].color} small />
        </div>
      </div>
    </section>
  )
}

function HeroMetric({ label, value, color = '#fff', small = false }: { label: string; value: string; color?: string; small?: boolean }) {
  return (
    <div>
      <div style={{ color: 'rgba(255,255,255,.42)', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ color, fontSize: small ? 18 : 32, fontWeight: 750, letterSpacing: -0.8, lineHeight: 1 }}>{value}</div>
      {!small && <div style={{ color: 'rgba(255,255,255,.48)', fontSize: 12, marginTop: 8 }}>Manager reviewed</div>}
    </div>
  )
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 19
  const c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
      <svg width={48} height={48} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={24} cy={24} r={r} fill="none" stroke={SURF} strokeWidth={3.5} />
        <circle cx={24} cy={24} r={r} fill="none" stroke={GOLD} strokeWidth={3.5} strokeDasharray={`${(done / total) * c} ${c}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 750 }}>{done}</div>
    </div>
  )
}

function InspectionStatus({ checklist, allDone, doneCount }: { checklist: Record<string, boolean>; allDone: boolean; doneCount: number }) {
  const steps = [
    ['customerInfo', 'Customer profile'],
    ['vehicleInfo', 'Vehicle details'],
    ['photosReviewed', 'Photo inspection'],
    ['valuesReviewed', 'Market valuation'],
    ['damageReviewed', 'Damage assessment'],
    ['recommendations', 'Product selection'],
  ] as const
  return (
    <section style={panelStyle()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 750, marginBottom: 3 }}>Inspection Status</div>
          <div style={{ fontSize: 10, color: DIM }}>{allDone ? 'Ready to deliver' : `${6 - doneCount} remaining`}</div>
        </div>
        <ProgressRing done={doneCount} total={6} />
      </div>
      {steps.map(([key, label]) => {
        const done = checklist[key]
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13 }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', display: 'grid', placeItems: 'center', background: done ? GOLD : SURF, color: '#fff', fontSize: 11, flexShrink: 0 }}>
              {done ? '✓' : ''}
            </span>
            <span style={{ fontSize: 12, color: done ? INK : DIM, fontWeight: done ? 560 : 400 }}>{label}</span>
          </div>
        )
      })}
    </section>
  )
}

function InlineEdit({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  if (editing) {
    return (
      <input autoFocus value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { onChange(draft); setEditing(false) }}
        onKeyDown={(e) => { if (e.key === 'Enter') { onChange(draft); setEditing(false) } }}
        style={{ width: '100%', border: 'none', borderBottom: `1.5px solid ${GOLD}`, outline: 'none', fontSize: 12, background: 'transparent', color: INK }}
      />
    )
  }
  return (
    <span onClick={() => setEditing(true)} style={{ cursor: 'text', fontWeight: 560, color: INK }}>
      {value}<span style={{ color: DIM, marginLeft: 4, fontSize: 9 }}>edit</span>
    </span>
  )
}

function UploadCard({ cat, upload, onFile, onEdit }: { cat: UploadCat; upload: ValUpload | null; onFile: (c: UploadCat, f: File) => void; onEdit: (c: UploadCat, k: string, v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const { title, sources } = UPLOAD_META[cat]
  return (
    <div style={{ background: CARD, borderRadius: 14, border: `1px solid ${drag ? GOLD : LINE}`, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 650 }}>{title}</div>
          <div style={{ fontSize: 10, color: DIM, marginTop: 2 }}>{sources}</div>
        </div>
        {upload && <span style={{ fontSize: 10, fontWeight: 600, color: upload.status === 'parsed' ? '#2A7B52' : '#2A5A8C' }}>{upload.status === 'parsed' ? 'Parsed' : 'Analyzing'}</span>}
      </div>
      <div style={{ padding: 16 }}>
        {!upload ? (
          <div onClick={() => ref.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(cat, f) }}
            style={{ border: `1.5px dashed ${drag ? GOLD : LINE}`, borderRadius: 10, padding: 20, textAlign: 'center', cursor: 'pointer', background: drag ? '#FAF8F2' : SURF }}>
            <div style={{ fontSize: 12, color: MUTED }}>Drop or click to upload</div>
            <div style={{ fontSize: 10, color: DIM, marginTop: 3 }}>PNG · JPG · PDF</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: upload.status === 'parsed' ? 12 : 0 }}>
              {upload.preview && <img src={upload.preview} alt="" style={{ width: 52, height: 38, objectFit: 'cover', borderRadius: 6, border: `1px solid ${LINE}` }} />}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{upload.fileName}</div>
                <button onClick={() => ref.current?.click()} style={plainButton(10, DIM)}>Replace</button>
              </div>
            </div>
            {upload.status === 'parsing' && <div style={{ color: MUTED, fontSize: 11 }}>Analyzing screenshot...</div>}
            {upload.status === 'parsed' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(upload.data).map(([key, value]) => (
                    <tr key={key} style={{ borderBottom: `1px solid ${LINE}` }}>
                      <td style={{ padding: '6px 0', fontSize: 10, color: DIM, width: '48%' }}>{key}</td>
                      <td style={{ padding: '6px 0', fontSize: 11 }}><InlineEdit value={value} onChange={(next) => onEdit(cat, key, next)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
        <input ref={ref} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(cat, f) }} />
      </div>
    </div>
  )
}

function SMSModal({ a, onClose, onSend }: { a: Appraisal; onClose: () => void; onSend: () => void }) {
  const msg = `Hi ${a.customer.name.split(' ')[0]}, your AutoLens Vehicle Report is ready.\n\nWe found a few items on your ${a.vehicle.year} ${a.vehicle.make} ${a.vehicle.model}:\n${a.issues.slice(0, 3).map((i) => `- ${i.label}`).join('\n')}\n\nView your full report:\nautolens.ai/report/${a.id}\n\nReply STOP to opt out.`
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,28,0.5)', zIndex: 1000, display: 'grid', placeItems: 'center', backdropFilter: 'blur(6px)' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: CARD, borderRadius: 22, padding: 32, width: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <div style={{ fontSize: 19, fontWeight: 760, marginBottom: 4 }}>Text Message Preview</div>
        <div style={{ fontSize: 12, color: DIM, marginBottom: 24 }}>Exactly what {a.customer.name} will receive.</div>
        <div style={{ background: SURF, borderRadius: 16, padding: 18, marginBottom: 24 }}>
          <div style={{ fontSize: 9, color: DIM, textAlign: 'center', marginBottom: 12, letterSpacing: 0.8, textTransform: 'uppercase' }}>AutoLens · SMS</div>
          <div style={{ background: CARD, borderRadius: 13, borderBottomLeftRadius: 4, padding: '14px 16px', fontSize: 12.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{msg}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={buttonStyle(false, 1)}>Cancel</button>
          <button onClick={onSend} style={buttonStyle(true, 2)}>Send Now</button>
        </div>
      </div>
    </div>
  )
}

function ZoomModal({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(10,10,10,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        <img src={src} alt="" style={{ maxWidth: '88vw', maxHeight: '86vh', objectFit: 'contain', borderRadius: 14, display: 'block', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }} />
        <button onClick={onClose} style={{ position: 'absolute', top: -14, right: -14, width: 30, height: 30, borderRadius: '50%', background: CARD, border: 'none', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', color: INK }}>×</button>
      </div>
    </div>
  )
}

function ReportPreview({ a }: { a: Appraisal }) {
  return (
    <div style={{ maxWidth: 920, display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 360px', gap: 28, alignItems: 'start' }}>
      <section style={{ ...panelStyle(0), overflow: 'hidden' }}>
        <div style={{ background: INK, color: '#fff', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Logo size={17} light />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.55)' }}>Report #{a.id}</span>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ color: DIM, fontSize: 13 }}>Hi {a.customer.name.split(' ')[0]},</div>
          <h2 style={{ margin: '4px 0 8px', fontSize: 34, letterSpacing: -1.4 }}>Your Vehicle Report</h2>
          <p style={{ margin: 0, color: MUTED, lineHeight: 1.6 }}>A manager-reviewed summary of condition, estimated repair ranges, and relevant ownership protection options.</p>
          <div style={{ margin: '24px 0', borderRadius: 18, background: INK, padding: 16, color: '#fff', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <ReportStat label="Est. Value" value={fmt(a.estimatedValue)} color={GOLD} />
            <ReportStat label="Condition" value={`${a.conditionScore}/100`} color="#4CAF80" />
            <ReportStat label="Mileage" value={a.vehicle.mileage} color="#fff" />
          </div>
          <SectionLabel>Detected Issues</SectionLabel>
          {a.issues.slice(0, 4).map((issue) => <IssueLine key={issue.id} issue={issue} />)}
        </div>
      </section>
      <section style={panelStyle()}>
        <SectionLabel>Recommended Protections</SectionLabel>
        {PRODUCTS.filter((p) => a.recommendations.includes(p.id)).map((p) => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '13px 0', borderBottom: `1px solid ${LINE}` }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 650 }}>{p.label}</div>
              <div style={{ fontSize: 11, color: DIM, marginTop: 2 }}>{p.desc}</div>
            </div>
            <span style={{ color: MUTED, fontSize: 12 }}>Learn more</span>
          </div>
        ))}
        <button style={{ ...buttonStyle(true), width: '100%', marginTop: 22, background: GOLD, borderColor: GOLD }}>View Full Report Online</button>
        <button style={{ ...buttonStyle(false), width: '100%', marginTop: 8 }}>Contact Dealership</button>
      </section>
    </div>
  )
}

function ReportStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '6px 10px', borderRight: `1px solid rgba(255,255,255,.08)` }}>
      <div style={{ color: 'rgba(255,255,255,.38)', fontSize: 9, marginBottom: 7 }}>{label}</div>
      <div style={{ color, fontSize: 20, fontWeight: 760, lineHeight: 1 }}>{value}</div>
    </div>
  )
}

function IssueLine({ issue }: { issue: Issue }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${LINE}` }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 650 }}>{issue.label}</div>
        <div style={{ fontSize: 11, color: DIM, marginTop: 2 }}>Est. ${issue.repairLow.toLocaleString()}–${issue.repairHigh.toLocaleString()}</div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 650, color: SEV[issue.severity].color }}>{SEV[issue.severity].label}</span>
    </div>
  )
}

export default function Page() {
  const [appraisals, setAppraisals] = useState<Appraisal[]>(SEED)
  const [selectedId, setSelectedId] = useState('84291')
  const [activeNav, setActiveNav] = useState('Appraisals')
  const [activeTab, setActiveTab] = useState('photos')
  const [showSMS, setShowSMS] = useState(false)
  const [photosOk, setPhotosOk] = useState(false)
  const [valuesOk, setValuesOk] = useState(false)
  const [damageOk, setDamageOk] = useState(false)
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [zoomSrc, setZoomSrc] = useState<string | null>(null)
  const [uploads, setUploads] = useState<Record<UploadCat, ValUpload | null>>({ book: null, mmr: null, retail: null })
  const [vals, setVals] = useState({ retail: '43250', trade: '26800', wholesale: '24100' })

  const a = appraisals.find((item) => item.id === selectedId)!
  const updateAppraisal = (id: string, changes: Partial<Appraisal>) =>
    setAppraisals((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)))

  const checklist = {
    customerInfo: Boolean(a.customer.name && a.customer.phone),
    vehicleInfo: Boolean(a.vehicle.vin && a.vehicle.year),
    photosReviewed: photosOk,
    valuesReviewed: valuesOk,
    damageReviewed: damageOk,
    recommendations: a.recommendations.length > 0,
  }
  const doneCount = Object.values(checklist).filter(Boolean).length
  const allDone = doneCount === 6

  const handlePhotoUpload = useCallback((angle: string, file: File) => {
    const id = `${angle}-${Date.now()}`
    setPhotos(prev => [...prev.filter(p => p.angle !== angle), { id, angle, preview: '', uploading: true }])
    const reader = new FileReader()
    reader.onload = (e) => {
      const preview = e.target?.result as string
      setTimeout(() => {
        setPhotos(prev => prev.map(p => p.id === id ? { ...p, preview, uploading: false } : p))
      }, 900)
    }
    reader.readAsDataURL(file)
  }, [])

  const handlePhotoDelete = useCallback((id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id))
  }, [])

  const handleUpload = (cat: UploadCat, file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      setUploads((current) => ({ ...current, [cat]: { fileName: file.name, preview: event.target?.result as string, status: 'parsing', data: {} } }))
      setTimeout(() => {
        setUploads((current) => ({ ...current, [cat]: { ...current[cat]!, status: 'parsed', data: { ...FAKE_PARSE[cat] } } }))
      }, 1100)
    }
    reader.readAsDataURL(file)
  }

  const tabs = [
    ['photos', 'Photos'],
    ['values', 'Values'],
    ['damage', 'Damage'],
    ['notes', 'Notes'],
    ['report', 'Customer Report'],
  ] as const

  const workflow = [
    { label: 'Photos', tab: 'photos', done: photosOk },
    { label: 'Values', tab: 'values', done: valuesOk },
    { label: 'Damage', tab: 'damage', done: damageOk },
    { label: 'Report', tab: 'report', done: activeTab === 'report' },
    { label: 'Send', tab: '', done: a.status === 'sent' },
  ]

  return (
    <div style={shell}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box} input,button,textarea{font:inherit} .photo-slot:hover .photo-delete{opacity:1!important} .photo-slot:hover img{transform:scale(1.03)}`}</style>

      {zoomSrc && <ZoomModal src={zoomSrc} onClose={() => setZoomSrc(null)} />}
      {showSMS && <SMSModal a={a} onClose={() => setShowSMS(false)} onSend={() => { updateAppraisal(a.id, { status: 'sent' }); setShowSMS(false) }} />}

      <aside style={{ width: 190, background: INK, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '26px 22px 22px' }}><Logo size={18} light /></div>
        <nav style={{ padding: '4px 10px', flex: 1 }}>
          {['Dashboard', 'Appraisals', 'Deals', 'Inventory', 'Customers', 'Reports', 'Products', 'Settings'].map((label) => {
            const active = activeNav === label
            return <button key={label} onClick={() => setActiveNav(label)} style={{ ...navItemStyle(active), width: '100%', textAlign: 'left' }}>{label}</button>
          })}
        </nav>
        <div style={{ padding: '16px 22px', borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.24)', fontSize: 10 }}>AutoLens v1.0</div>
      </aside>

      <aside style={{ width: 252, background: CARD, borderRight: `1px solid ${LINE}`, display: 'flex', flexDirection: 'column', flexShrink: 0, boxShadow: '2px 0 12px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '22px 20px 14px', borderBottom: `1px solid ${LINE}` }}>
          <div style={{ fontSize: 15, fontWeight: 750 }}>Appraisals</div>
          <div style={{ fontSize: 10, color: DIM, marginTop: 3 }}>{appraisals.filter((item) => item.status === 'review').length} need review</div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {appraisals.map((item) => (
            <button key={item.id} onClick={() => {
              setSelectedId(item.id)
              setVals({ retail: String(item.values.retail), trade: String(item.values.trade), wholesale: String(item.values.wholesale) })
              setPhotosOk(false); setValuesOk(false); setDamageOk(false)
              setActiveTab('photos')
              setUploads({ book: null, mmr: null, retail: null })
              setPhotos([])
            }} style={queueItemStyle(item.id === selectedId)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 3 }}>
                <div style={{ fontSize: 13, fontWeight: item.id === selectedId ? 650 : 430, color: item.id === selectedId ? INK : MUTED }}>{item.customer.name}</div>
                <span style={{ fontSize: 9, color: STAT[item.status].color, fontWeight: 650 }}>{STAT[item.status].label}</span>
              </div>
              <div style={{ fontSize: 11, color: DIM }}>{item.vehicle.year} {item.vehicle.make} {item.vehicle.model}</div>
              {item.estimatedValue > 0 && <div style={{ fontSize: 13, fontWeight: 760, marginTop: 6 }}>{fmt(item.estimatedValue)}</div>}
              <div style={{ fontSize: 10, color: DIM, marginTop: 2 }}>{item.createdAt}</div>
            </button>
          ))}
        </div>
      </aside>

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ padding: '18px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: CARD, borderBottom: `1px solid ${LINE}` }}>
          <div>
            <div style={{ fontSize: 10, color: DIM, letterSpacing: 0.4, marginBottom: 4 }}>#{a.id} · {a.createdAt}</div>
            <div style={{ fontSize: 21, fontWeight: 760, letterSpacing: -0.5, lineHeight: 1 }}>{a.customer.name}</div>
          </div>
          <button onClick={() => allDone && setShowSMS(true)} style={{ ...buttonStyle(allDone), background: allDone ? GOLD : SURF, borderColor: allDone ? GOLD : LINE, cursor: allDone ? 'pointer' : 'default' }}>
            {a.status === 'sent' ? 'Sent' : 'Send to Customer'}
          </button>
        </header>

        <VehicleHero a={a} />

        <div style={{ display: 'flex', alignItems: 'center', padding: '13px 32px', background: CARD, borderBottom: `1px solid ${LINE}`, flexShrink: 0 }}>
          {workflow.map((step, index) => (
            <div key={step.label} style={{ display: 'flex', alignItems: 'center', flex: index < workflow.length - 1 ? 1 : undefined }}>
              <button onClick={() => step.tab && setActiveTab(step.tab)} style={{ ...plainButton(11, step.done || activeTab === step.tab ? INK : MUTED), opacity: step.done || activeTab === step.tab ? 1 : 0.44, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: step.done ? GOLD : activeTab === step.tab ? INK : LINE }} />
                {step.label}
              </button>
              {index < workflow.length - 1 && <div style={{ flex: 1, height: 1, background: LINE, margin: '0 10px' }} />}
            </div>
          ))}
        </div>

        <nav style={{ display: 'flex', padding: '0 32px', background: CARD, borderBottom: `1px solid ${LINE}`, flexShrink: 0 }}>
          {tabs.map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={tabStyle(activeTab === key)}>{label}</button>
          ))}
        </nav>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 48px', background: PAGE }}>
            {activeTab === 'photos' && (
              <PhotosTab
                photos={photos}
                onZoom={setZoomSrc}
                photosOk={photosOk}
                onReview={() => setPhotosOk(true)}
              />
            )}
            {activeTab === 'values' && (
              <ValuesTab
                vals={vals} setVals={setVals} uploads={uploads}
                onSave={() => updateAppraisal(selectedId, { values: { retail: +vals.retail, trade: +vals.trade, wholesale: +vals.wholesale } })}
                onFile={handleUpload}
                onEdit={(cat, key, value) => setUploads((current) => ({ ...current, [cat]: { ...current[cat]!, data: { ...current[cat]!.data, [key]: value } } }))}
                valuesOk={valuesOk} onReview={() => setValuesOk(true)}
              />
            )}
            {activeTab === 'damage' && <DamageTab a={a} damageOk={damageOk} onReview={() => setDamageOk(true)} />}
            {activeTab === 'notes' && (
              <div>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes visible only to your team..."
                  style={{ width: '100%', minHeight: 180, border: `1px solid ${LINE}`, borderRadius: 14, padding: 18, fontSize: 13, color: INK, resize: 'vertical', outline: 'none', background: CARD, lineHeight: 1.7, boxShadow: softShadow }} />
                <button onClick={() => updateAppraisal(a.id, { notes })} style={{ ...buttonStyle(true), marginTop: 10 }}>Save Notes</button>
              </div>
            )}
            {activeTab === 'report' && <ReportPreview a={a} />}
          </main>

          <aside style={{ width: 230, borderLeft: `1px solid ${LINE}`, padding: '24px 20px', overflowY: 'auto', flexShrink: 0, background: PAGE }}>
            <InspectionStatus checklist={checklist} allDone={allDone} doneCount={doneCount} />
            <div style={{ height: 20 }} />
            <ProductsPanel a={a} update={(recommendations) => updateAppraisal(a.id, { recommendations })} />
            <div style={{ height: 20 }} />
            <section style={panelStyle()}>
              <div style={{ fontSize: 12, fontWeight: 750, marginBottom: 12 }}>Notes</div>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes..."
                style={{ width: '100%', minHeight: 90, border: `1px solid ${LINE}`, borderRadius: 10, padding: 10, fontSize: 12, color: INK, resize: 'vertical', outline: 'none', background: PAGE, lineHeight: 1.6 }} />
              <button onClick={() => updateAppraisal(a.id, { notes })} style={{ ...buttonStyle(false), marginTop: 8, width: '100%' }}>Save</button>
            </section>
          </aside>
        </div>
      </section>
    </div>
  )
}

function PhotosTab({ photos, onZoom, photosOk, onReview }: {
  photos: Photo[]
  onZoom: (src: string) => void
  photosOk: boolean
  onReview: () => void
}) {
  const uploadedPhotos = photos.filter(p => p.preview)

  return (
    <div>
      {uploadedPhotos.length === 0 ? (
        <div style={{ padding: '52px 0', textAlign: 'center', color: DIM, fontSize: 12 }}>
          No photos submitted yet. Photos are uploaded by the salesperson during vehicle capture.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))', gap: 10, marginBottom: 18 }}>
          {uploadedPhotos.map(photo => (
            <div key={photo.id} className="photo-slot"
              onClick={() => onZoom(photo.preview)}
              style={{ position: 'relative', aspectRatio: '4 / 3', borderRadius: 12, overflow: 'hidden', border: `1px solid ${LINE}`, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <img src={photo.preview} alt={photo.angle} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.45))', padding: '10px 8px 5px', fontSize: 9, color: '#fff', letterSpacing: 0.3 }}>{photo.angle}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 12, color: DIM, marginBottom: 20 }}>
        {uploadedPhotos.length} of {PHOTO_ANGLES.length} photos submitted
      </div>
      {photosOk ? <DoneText label="Photos reviewed" /> : <button onClick={onReview} style={buttonStyle(true)}>Mark Photos Reviewed</button>}
    </div>
  )
}

function ValuesTab({ vals, setVals, uploads, onSave, onFile, onEdit, valuesOk, onReview }: {
  vals: { retail: string; trade: string; wholesale: string }
  setVals: React.Dispatch<React.SetStateAction<{ retail: string; trade: string; wholesale: string }>>
  uploads: Record<UploadCat, ValUpload | null>
  onSave: () => void
  onFile: (cat: UploadCat, file: File) => void
  onEdit: (cat: UploadCat, key: string, value: string) => void
  valuesOk: boolean
  onReview: () => void
}) {
  const parsed = uploads.book?.status === 'parsed' || uploads.mmr?.status === 'parsed' || uploads.retail?.status === 'parsed'
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', gap: 12, marginBottom: 22 }}>
        {([['Retail Value', 'retail'], ['Trade-In Value', 'trade'], ['Wholesale Value', 'wholesale']] as const).map(([label, key]) => (
          <div key={key} style={panelStyle()}>
            <SectionLabel>{label}</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 10 }}>
              <span style={{ fontSize: 15, color: MUTED }}>$</span>
              <input type="number" value={vals[key]} onChange={(e) => setVals((c) => ({ ...c, [key]: e.target.value }))}
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 28, fontWeight: 760, color: INK, outline: 'none', padding: 0, letterSpacing: -0.8 }} />
            </div>
            <div style={{ fontSize: 10, color: DIM, marginTop: 5 }}>Manager override required</div>
          </div>
        ))}
      </div>
      <button onClick={onSave} style={{ ...buttonStyle(false), marginBottom: 28 }}>Save Values</button>
      {parsed && (
        <div style={{ background: INK, borderRadius: 16, padding: '20px 24px', marginBottom: 28 }}>
          <div style={{ color: 'rgba(255,255,255,.38)', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>AI Valuation Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[['Book Avg', uploads.book?.status === 'parsed' ? '$42,633' : null], ['MMR Avg', uploads.mmr?.status === 'parsed' ? '$39,350' : null], ['Retail Avg', uploads.retail?.status === 'parsed' ? '$44,600' : null], ['Suggested', uploads.book?.status === 'parsed' ? '$44,200' : null]].map(([label, value]) => (
              <div key={String(label)}>
                <div style={{ color: 'rgba(255,255,255,.35)', fontSize: 9, marginBottom: 6 }}>{label}</div>
                <div style={{ color: value ? GOLD : 'rgba(255,255,255,.15)', fontSize: 20, fontWeight: 760 }}>{value || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <SectionLabel>Valuation Sources</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', gap: 12, marginTop: 14, marginBottom: 24 }}>
        {(['book', 'mmr', 'retail'] as UploadCat[]).map((cat) => (
          <UploadCard key={cat} cat={cat} upload={uploads[cat]} onFile={onFile} onEdit={onEdit} />
        ))}
      </div>
      {valuesOk ? <DoneText label="Values reviewed" /> : <button onClick={onReview} style={buttonStyle(true)}>Mark Values Reviewed</button>}
    </div>
  )
}

function DamageTab({ a, damageOk, onReview }: { a: Appraisal; damageOk: boolean; onReview: () => void }) {
  return (
    <div>
      {a.issues.length === 0
        ? <div style={{ padding: '52px 0', textAlign: 'center', color: DIM, fontSize: 12 }}>No damage confirmed yet. Issues appear here once photos are analyzed.</div>
        : <div style={{ marginBottom: 24 }}>{a.issues.map((issue) => <IssueLine key={issue.id} issue={issue} />)}</div>
      }
      {damageOk ? <DoneText label="Damage reviewed" /> : <button onClick={onReview} style={buttonStyle(true)}>Mark Damage Reviewed</button>}
    </div>
  )
}

function ProductsPanel({ a, update }: { a: Appraisal; update: (recommendations: string[]) => void }) {
  return (
    <section style={panelStyle()}>
      <div style={{ fontSize: 12, fontWeight: 760, marginBottom: 16 }}>Protection Products</div>
      {a.recommendations.length === 0 && <div style={{ fontSize: 11, color: DIM, marginBottom: 12 }}>None selected</div>}
      {PRODUCTS.map((product) => {
        const on = a.recommendations.includes(product.id)
        return (
          <button key={product.id} onClick={() => update(on ? a.recommendations.filter((id) => id !== product.id) : [...a.recommendations, product.id])}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 13, cursor: 'pointer', border: 0, background: 'transparent', padding: 0, textAlign: 'left', width: '100%' }}>
            <span style={{ width: 17, height: 17, borderRadius: 4, background: on ? GOLD : SURF, border: `1px solid ${on ? GOLD : LINE}`, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 10, flexShrink: 0, marginTop: 1 }}>
              {on ? '✓' : ''}
            </span>
            <span>
              <span style={{ display: 'block', fontSize: 12, fontWeight: on ? 650 : 430, color: on ? INK : MUTED, lineHeight: 1.2 }}>{product.label}</span>
              <span style={{ display: 'block', fontSize: 10, color: DIM, marginTop: 2 }}>{product.desc}</span>
            </span>
          </button>
        )
      })}
    </section>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 650, color: DIM, letterSpacing: 0.7, textTransform: 'uppercase' }}>{children}</div>
}

function DoneText({ label }: { label: string }) {
  return <div style={{ fontSize: 12, color: '#2A7B52', fontWeight: 650 }}>{label}</div>
}

function panelStyle(padding: number | string = '18px 20px'): React.CSSProperties {
  return { background: CARD, borderRadius: 16, padding, boxShadow: softShadow }
}

function buttonStyle(primary: boolean, flex?: number): React.CSSProperties {
  return { flex, padding: '11px 22px', background: primary ? INK : CARD, border: `1px solid ${primary ? INK : LINE}`, borderRadius: 10, fontSize: 12, fontWeight: 650, cursor: 'pointer', color: primary ? '#fff' : MUTED }
}

function navItemStyle(active: boolean): React.CSSProperties {
  return { padding: '9px 12px', borderRadius: 8, marginBottom: 1, cursor: 'pointer', fontSize: 13, fontWeight: active ? 560 : 430, color: active ? '#fff' : 'rgba(255,255,255,0.38)', background: active ? 'rgba(255,255,255,0.08)' : 'transparent', border: 0 }
}

function queueItemStyle(selected: boolean): React.CSSProperties {
  return { width: '100%', display: 'block', padding: '15px 20px', cursor: 'pointer', background: selected ? '#FAFAF8' : 'transparent', border: 0, borderLeft: `2px solid ${selected ? GOLD : 'transparent'}`, borderBottom: `1px solid ${LINE}`, textAlign: 'left' }
}

function tabStyle(active: boolean): React.CSSProperties {
  return { padding: '13px 14px 12px', border: 'none', background: 'none', fontSize: 12, fontWeight: active ? 650 : 430, cursor: 'pointer', color: active ? INK : DIM, borderBottom: `2px solid ${active ? GOLD : 'transparent'}`, marginBottom: -1, whiteSpace: 'nowrap' }
}

function plainButton(size: number, color: string): React.CSSProperties {
  return { border: 0, background: 'transparent', padding: 0, color, fontSize: size, cursor: 'pointer' }
}
