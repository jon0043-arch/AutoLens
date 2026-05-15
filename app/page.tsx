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
const Y    = '#F5B800'   // primary action only
const INK  = '#0D0D0D'   // primary text
const MID  = '#6B7280'   // secondary text
const DIM  = '#B0B4BC'   // tertiary / labels
const LINE = '#EBEBEB'   // dividers
const LIFT = '#F7F7F7'   // surface / hover

const SEV: Record<Severity, { label: string; color: string }> = {
  low:      { label: 'Low',      color: '#9CA3AF' },
  moderate: { label: 'Moderate', color: '#D97706' },
  high:     { label: 'High',     color: '#DC2626' },
}
const STAT: Record<Status, { label: string; color: string }> = {
  pending:  { label: 'Pending',       color: '#9CA3AF' },
  review:   { label: 'Needs Review',  color: '#D97706' },
  approved: { label: 'Ready to Send', color: '#16A34A' },
  sent:     { label: 'Sent',          color: '#2563EB' },
}
const PRODUCTS = [
  { id: 'wheel',    label: 'Wheel & Tire',       desc: 'Covers wheels and tires'        },
  { id: 'shield',   label: 'Windshield',          desc: 'Chip and crack coverage'        },
  { id: 'key',      label: 'Key Replacement',     desc: 'Lost or broken key coverage'   },
  { id: 'interior', label: 'Interior Protection', desc: 'Stain and tear coverage'        },
  { id: 'gps',      label: 'GPS & Theft',         desc: 'Tracking and recovery'          },
]
const UPLOAD_META: Record<UploadCat, { title: string; sources: string }> = {
  book:   { title: 'Book Values',     sources: 'KBB · Edmunds · Black Book · JD Power' },
  mmr:    { title: 'MMR / Wholesale', sources: 'Manheim MMR · Auction comps'           },
  retail: { title: 'Retail Comps',    sources: 'Clean & accident retail listings'      },
}
const FAKE_PARSE: Record<UploadCat, Record<string, string>> = {
  book:   { 'Trade-In': '$39,800', 'Private Party': '$42,200', 'Retail': '$45,900', 'Source': 'KBB', 'Confidence': 'High'   },
  mmr:    { 'Clean Avg': '$41,500', 'Accident Avg': '$37,200', 'Transactions': '8', 'Mileage': '48k–65k', 'Confidence': 'Medium' },
  retail: { 'Clean Retail': '$46,900', 'Accident Retail': '$42,300', 'Listings': '12', 'Spread': '$4,600', 'Confidence': 'High' },
}
const fmt = (n: number) => n > 0 ? `$${n.toLocaleString()}` : '—'

// ─── Seed ─────────────────────────────────────────────────────────────────────
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
    estimatedValue: 51500, conditionScore: 91, recommendations: ['shield', 'interior'], notes: 'Clean vehicle.',
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
      <span style={{ color: '#fff' }}>Aut</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size * 1.1, height: size * 1.1, borderRadius: '50%', background: Y, flexShrink: 0 }}>
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="#111">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
      </span>
      <span style={{ color: Y }}>Lens</span>
    </div>
  )
}

// ─── Condition Ring ───────────────────────────────────────────────────────────
function Ring({ score }: { score: number }) {
  const r = 28, c = 2 * Math.PI * r
  const col = score >= 85 ? '#22C55E' : score >= 70 ? Y : '#EF4444'
  return (
    <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
      <svg width={68} height={68} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={34} cy={34} r={r} fill="none" stroke={LINE} strokeWidth={5} />
        <circle cx={34} cy={34} r={r} fill="none" stroke={col} strokeWidth={5} strokeDasharray={`${(score / 100) * c} ${c}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: INK, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: DIM, marginTop: 1 }}>/ 100</span>
      </div>
    </div>
  )
}

// ─── Inline Edit ──────────────────────────────────────────────────────────────
function InlineEdit({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [ed, setEd] = useState(false)
  const [v, setV] = useState(value)
  if (ed) return <input autoFocus value={v} onChange={e => setV(e.target.value)} onBlur={() => { onChange(v); setEd(false) }} onKeyDown={e => e.key === 'Enter' && (onChange(v), setEd(false))} style={{ width: '100%', border: 'none', borderBottom: `1px solid ${Y}`, outline: 'none', fontSize: 12, fontWeight: 500, padding: '2px 0', background: 'transparent', color: INK }} />
  return <span onClick={() => setEd(true)} style={{ cursor: 'text', fontWeight: 500, color: INK }}>{v}<span style={{ color: DIM, marginLeft: 3, fontSize: 10 }}>✎</span></span>
}

// ─── Upload Card ──────────────────────────────────────────────────────────────
function UploadCard({ cat, upload, onFile, onEdit }: { cat: UploadCat; upload: ValUpload | null; onFile: (c: UploadCat, f: File) => void; onEdit: (c: UploadCat, k: string, v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const { title, sources } = UPLOAD_META[cat]
  const pick = (f: File) => onFile(cat, f)

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${drag ? Y : LINE}`, overflow: 'hidden', transition: 'border-color 0.15s' }}>
      <div style={{ padding: '16px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{title}</div>
          <div style={{ fontSize: 11, color: DIM, marginTop: 2 }}>{sources}</div>
        </div>
        {upload && (
          <span style={{ fontSize: 10, fontWeight: 500, color: upload.status === 'parsed' ? '#16A34A' : '#2563EB', letterSpacing: 0.2 }}>
            {upload.status === 'parsed' ? '✓ Parsed' : 'Analyzing…'}
          </span>
        )}
      </div>

      <div style={{ padding: '0 18px 18px' }}>
        {!upload ? (
          <div onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) pick(f) }}
            onClick={() => ref.current?.click()}
            style={{ border: `1.5px dashed ${drag ? Y : '#D4D4D4'}`, borderRadius: 10, padding: '20px', textAlign: 'center', cursor: 'pointer', background: drag ? '#FFFCF0' : LIFT, transition: 'all 0.15s' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: MID }}>Drop screenshot or click to upload</div>
            <div style={{ fontSize: 11, color: DIM, marginTop: 4 }}>PNG · JPG · PDF</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: upload.status === 'parsed' ? 14 : 0 }}>
              {upload.preview && <img src={upload.preview} alt="" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0, opacity: 0.9 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{upload.fileName}</div>
                <button onClick={() => ref.current?.click()} style={{ fontSize: 11, color: DIM, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>Replace</button>
              </div>
            </div>
            {upload.status === 'parsing' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#2563EB', fontSize: 11, paddingTop: 4 }}>
                <span style={{ display: 'inline-block', width: 11, height: 11, border: '1.5px solid #BFDBFE', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Analyzing screenshot…
              </div>
            )}
            {upload.status === 'parsed' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(upload.data).map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: `1px solid ${LINE}` }}>
                      <td style={{ padding: '6px 0', fontSize: 11, color: DIM, width: '50%' }}>{k}</td>
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
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: '32px', width: 400, boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 19, fontWeight: 700, color: INK, marginBottom: 2 }}>Text Message Preview</div>
        <div style={{ fontSize: 12, color: DIM, marginBottom: 24 }}>Exactly what {a.customer.name} will receive.</div>
        <div style={{ background: LIFT, borderRadius: 16, padding: '18px', marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: DIM, textAlign: 'center', marginBottom: 12, letterSpacing: 0.3, textTransform: 'uppercase' }}>AutoLens · SMS</div>
          <div style={{ background: '#fff', borderRadius: 14, borderBottomLeftRadius: 3, padding: '14px 16px', fontSize: 12.5, lineHeight: 1.65, color: INK, whiteSpace: 'pre-wrap' }}>{msg}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${LINE}`, background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: MID }}>Cancel</button>
          <button onClick={onSend} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: INK, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#fff' }}>Send Now →</button>
        </div>
      </div>
    </div>
  )
}

// ─── Customer Report Preview ──────────────────────────────────────────────────
function ReportPreview({ a }: { a: Appraisal }) {
  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: DIM, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>Report #{a.id}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: INK, lineHeight: 1.1 }}>Hi {a.customer.name.split(' ')[0]},</div>
        <div style={{ fontSize: 14, color: MID, marginTop: 6 }}>Your vehicle report is ready — {a.createdAt}</div>
      </div>
      <div style={{ background: INK, borderRadius: 16, padding: '24px 28px', marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: '#555', marginBottom: 16 }}>{a.vehicle.year} {a.vehicle.make} {a.vehicle.model} {a.vehicle.trim}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
          {[['Est. Value', fmt(a.estimatedValue), Y], ['Condition', `${a.conditionScore}/100`, '#22C55E'], ['Mileage', a.vehicle.mileage, '#fff']].map(([l, v, c], i) => (
            <div key={l} style={{ paddingRight: i < 2 ? 20 : 0, borderRight: i < 2 ? '1px solid #1F1F1F' : 'none', paddingLeft: i > 0 ? 20 : 0 }}>
              <div style={{ fontSize: 10, color: '#555', marginBottom: 6 }}>{l}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: c, lineHeight: 1 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      {a.issues.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: DIM, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 14 }}>Detected Issues</div>
          {a.issues.slice(0, 4).map(i => (
            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${LINE}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{i.label}</div>
                <div style={{ fontSize: 11, color: DIM, marginTop: 2 }}>Est. ${i.repairLow}–${i.repairHigh}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: SEV[i.severity].color }}>{SEV[i.severity].label}</span>
            </div>
          ))}
        </div>
      )}
      {a.recommendations.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: DIM, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 14 }}>Recommended Protections</div>
          {PRODUCTS.filter(p => a.recommendations.includes(p.id)).map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${LINE}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{p.label}</div>
                <div style={{ fontSize: 11, color: DIM, marginTop: 2 }}>{p.desc}</div>
              </div>
              <span style={{ fontSize: 11, color: MID, cursor: 'pointer' }}>Learn more →</span>
            </div>
          ))}
        </div>
      )}
      <button style={{ width: '100%', padding: '15px', background: Y, border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>View Full Report</button>
      <button style={{ width: '100%', padding: '15px', background: LIFT, border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer', color: MID }}>Contact Dealership</button>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Page() {
  const [appraisals, setAppraisals] = useState<Appraisal[]>(SEED)
  const [selectedId, setSelectedId] = useState('84291')
  const [activeNav, setActiveNav]   = useState('Appraisals')
  const [activeTab, setActiveTab]   = useState('photos')
  const [notes, setNotes]           = useState('')
  const [showSMS, setShowSMS]       = useState(false)
  const [photosOk,  setPhotosOk]    = useState(false)
  const [valuesOk,  setValuesOk]    = useState(false)
  const [damageOk,  setDamageOk]    = useState(false)
  const [uploads, setUploads]       = useState<Record<UploadCat, ValUpload | null>>({ book: null, mmr: null, retail: null })
  const [vals, setVals]             = useState({ retail: '43250', trade: '26800', wholesale: '24100' })

  const a   = appraisals.find(x => x.id === selectedId)!
  const upd = (id: string, ch: Partial<Appraisal>) => setAppraisals(p => p.map(x => x.id === id ? { ...x, ...ch } : x))

  const checklist = {
    'Customer info':    !!(a.customer.name && a.customer.phone),
    'Vehicle info':     !!(a.vehicle.vin && a.vehicle.year),
    'Photos reviewed':  photosOk,
    'Values reviewed':  valuesOk,
    'Damage reviewed':  damageOk,
    'Products selected': a.recommendations.length > 0,
  }
  const doneCount = Object.values(checklist).filter(Boolean).length
  const allDone   = doneCount === 6

  const handleUpload = (cat: UploadCat, file: File) => {
    const r = new FileReader()
    r.onload = e => {
      const preview = e.target?.result as string
      setUploads(p => ({ ...p, [cat]: { fileName: file.name, preview, status: 'parsing', data: {} } }))
      setTimeout(() => setUploads(p => ({ ...p, [cat]: { ...p[cat]!, status: 'parsed', data: { ...FAKE_PARSE[cat] } } })), 2000)
    }
    r.readAsDataURL(file)
  }
  const editExtracted = (cat: UploadCat, key: string, val: string) =>
    setUploads(p => ({ ...p, [cat]: { ...p[cat]!, data: { ...p[cat]!.data, [key]: val } } }))

  const NAV_ITEMS = ['Dashboard', 'Appraisals', 'Deals', 'Inventory', 'Customers', 'Reports', 'Products', 'Settings']
  const TABS = [
    { k: 'photos',  l: 'Photos'          },
    { k: 'values',  l: 'Values'          },
    { k: 'damage',  l: 'Damage'          },
    { k: 'vehicle', l: 'Vehicle Info'    },
    { k: 'notes',   l: 'Notes'           },
    { k: 'report',  l: 'Customer Report' },
  ]
  const WORKFLOW = [
    { label: 'Photos',  tab: 'photos',  done: photosOk },
    { label: 'Values',  tab: 'values',  done: valuesOk },
    { label: 'Damage',  tab: 'damage',  done: damageOk },
    { label: 'Report',  tab: 'report',  done: false    },
    { label: 'Send',    tab: '',        done: a.status === 'sent' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,sans-serif', overflow: 'hidden', background: '#fff' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} * { box-sizing: border-box; }`}</style>
      {showSMS && <SMSModal a={a} onClose={() => setShowSMS(false)} onSend={() => { upd(a.id, { status: 'sent' }); setShowSMS(false) }} />}

      {/* ── Sidebar ───────────────────────────────────────── */}
      <div style={{ width: 190, background: '#0A0A0A', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '26px 22px 22px' }}>
          <Logo size={18} />
        </div>
        <nav style={{ padding: '4px 10px', flex: 1 }}>
          {NAV_ITEMS.map(label => {
            const active = activeNav === label
            return (
              <div key={label} onClick={() => setActiveNav(label)} style={{ padding: '8px 12px', borderRadius: 7, marginBottom: 1, cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#fff' : '#4A4A4A', background: active ? '#1A1A1A' : 'transparent', transition: 'all 0.12s' }}>
                {label}
              </div>
            )
          })}
        </nav>
        <div style={{ padding: '18px 22px', borderTop: '1px solid #1A1A1A' }}>
          <div style={{ fontSize: 10, color: '#2A2A2A', letterSpacing: 0.3 }}>AutoLens v1.0</div>
        </div>
      </div>

      {/* ── Queue ─────────────────────────────────────────── */}
      <div style={{ width: 248, background: LIFT, borderRight: `1px solid ${LINE}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '22px 20px 14px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: INK }}>Appraisals</div>
          <div style={{ fontSize: 11, color: DIM, marginTop: 3 }}>
            {appraisals.filter(x => x.status === 'review').length} need review
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {appraisals.map(x => {
            const sel  = x.id === selectedId
            const stat = STAT[x.status]
            return (
              <div key={x.id} onClick={() => {
                setSelectedId(x.id)
                setVals({ retail: String(x.values.retail), trade: String(x.values.trade), wholesale: String(x.values.wholesale) })
                setPhotosOk(false); setValuesOk(false); setDamageOk(false)
                setActiveTab('photos'); setUploads({ book: null, mmr: null, retail: null })
              }} style={{ padding: '14px 20px', cursor: 'pointer', background: sel ? '#fff' : 'transparent', borderLeft: `2px solid ${sel ? Y : 'transparent'}`, transition: 'all 0.12s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                  <div style={{ fontSize: 13, fontWeight: sel ? 600 : 500, color: INK }}>{x.customer.name}</div>
                  <span style={{ fontSize: 10, color: stat.color, fontWeight: 500 }}>{stat.label}</span>
                </div>
                <div style={{ fontSize: 11, color: DIM }}>{x.vehicle.year} {x.vehicle.make} {x.vehicle.model}</div>
                {x.estimatedValue > 0 && <div style={{ fontSize: 12, fontWeight: 600, color: INK, marginTop: 6 }}>{fmt(x.estimatedValue)}</div>}
                <div style={{ fontSize: 10, color: DIM, marginTop: 2 }}>{x.createdAt}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Detail ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>

        {/* Page header */}
        <div style={{ padding: '28px 36px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 11, color: DIM, letterSpacing: 0.3, marginBottom: 6 }}>#{a.id} · {a.createdAt}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: INK, letterSpacing: -0.5, lineHeight: 1.1 }}>{a.customer.name}</div>
            <div style={{ fontSize: 14, color: MID, marginTop: 4 }}>{a.vehicle.year} {a.vehicle.make} {a.vehicle.model} {a.vehicle.trim} · {a.vehicle.mileage} mi</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: STAT[a.status].color }}>{STAT[a.status].label}</span>
            <button onClick={() => allDone ? setShowSMS(true) : null}
              style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: allDone ? Y : LIFT, fontSize: 13, fontWeight: 600, cursor: allDone ? 'pointer' : 'default', color: allDone ? INK : DIM, transition: 'all 0.2s', letterSpacing: -0.2 }}>
              {a.status === 'sent' ? '✓ Sent' : 'Send to Customer →'}
            </button>
          </div>
        </div>

        {/* Workflow strip */}
        <div style={{ padding: '20px 36px 0', display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
          {WORKFLOW.map((s, i) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', flex: i < WORKFLOW.length - 1 ? 1 : undefined }}>
              <div onClick={() => s.tab && setActiveTab(s.tab)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: s.tab ? 'pointer' : 'default', opacity: s.done || activeTab === s.tab ? 1 : 0.45 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.done ? Y : activeTab === s.tab ? INK : LINE, transition: 'background 0.2s' }} />
                <span style={{ fontSize: 11, fontWeight: activeTab === s.tab ? 600 : 400, color: s.done ? INK : activeTab === s.tab ? INK : MID, whiteSpace: 'nowrap' }}>{s.label}</span>
              </div>
              {i < WORKFLOW.length - 1 && <div style={{ flex: 1, height: 1, background: LINE, margin: '0 10px' }} />}
            </div>
          ))}
        </div>

        {/* Stat strip */}
        <div style={{ padding: '20px 36px', display: 'flex', gap: 0, flexShrink: 0 }}>
          {[
            { label: 'Estimated Value',  value: fmt(a.estimatedValue), color: INK     },
            { label: 'Issues Detected',  value: String(a.issues.length), color: a.issues.length > 0 ? '#D97706' : '#22C55E' },
            { label: 'Checklist',        value: `${doneCount}/6`, color: allDone ? '#22C55E' : INK },
          ].map((s, i) => (
            <div key={s.label} style={{ paddingRight: 36, borderRight: i < 2 ? `1px solid ${LINE}` : 'none', marginRight: 36 }}>
              <div style={{ fontSize: 10, color: DIM, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, letterSpacing: -0.5, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
          {/* Condition ring inline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Ring score={a.conditionScore} />
            <div>
              <div style={{ fontSize: 10, color: DIM, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 4 }}>Condition</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{a.conditionScore >= 85 ? 'Excellent' : a.conditionScore >= 70 ? 'Good' : 'Fair'}</div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: LINE, margin: '0 36px', flexShrink: 0 }} />

        {/* Tab bar */}
        <div style={{ display: 'flex', padding: '0 36px', gap: 0, flexShrink: 0 }}>
          {TABS.map(({ k, l }) => (
            <button key={k} onClick={() => setActiveTab(k)} style={{ padding: '14px 16px 13px', border: 'none', background: 'none', fontSize: 13, fontWeight: activeTab === k ? 600 : 400, cursor: 'pointer', color: activeTab === k ? INK : DIM, borderBottom: `2px solid ${activeTab === k ? INK : 'transparent'}`, marginBottom: -1, whiteSpace: 'nowrap', letterSpacing: -0.1 }}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ height: 1, background: LINE, flexShrink: 0 }} />

        {/* Scrollable content + right sidebar */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px 48px' }}>

            {/* Photos */}
            {activeTab === 'photos' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
                  {['Front', 'Front Left', 'Front Right', 'Rear', 'Rear Left', 'Rear Right', 'Left Side', 'Right Side', 'Interior', 'Engine', 'Odometer'].map(lbl => (
                    <div key={lbl} style={{ background: LIFT, borderRadius: 10, aspectRatio: '4/3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', border: `1.5px dashed ${LINE}` }}>
                      <span style={{ fontSize: 18, opacity: 0.4 }}>📷</span>
                      <span style={{ fontSize: 9, color: DIM }}>{lbl}</span>
                    </div>
                  ))}
                  <div style={{ background: LIFT, borderRadius: 10, aspectRatio: '4/3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', border: `1.5px dashed ${LINE}` }}>
                    <span style={{ fontSize: 20, color: MID }}>+</span>
                    <span style={{ fontSize: 9, color: MID, fontWeight: 500 }}>Add</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: DIM, marginBottom: 20 }}>No photos uploaded yet. Photos help build customer confidence in the report.</div>
                {!photosOk
                  ? <button onClick={() => setPhotosOk(true)} style={{ padding: '11px 24px', background: INK, border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#fff' }}>Mark Photos Reviewed</button>
                  : <div style={{ fontSize: 13, color: '#16A34A', fontWeight: 500 }}>✓ Photos reviewed</div>
                }
              </div>
            )}

            {/* Values */}
            {activeTab === 'values' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 32 }}>
                  {([['Retail Value', 'retail'], ['Trade-In Value', 'trade'], ['Wholesale Value', 'wholesale']] as const).map(([label, key]) => (
                    <div key={key} style={{ padding: '18px 20px', background: LIFT, borderRadius: 12 }}>
                      <div style={{ fontSize: 10, color: DIM, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 14, color: MID }}>$</span>
                        <input type="number" value={vals[key]} onChange={e => setVals(p => ({ ...p, [key]: e.target.value }))}
                          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 26, fontWeight: 800, color: INK, outline: 'none', padding: 0, width: '100%', letterSpacing: -0.5 }} />
                      </div>
                      <div style={{ fontSize: 10, color: DIM, marginTop: 6 }}>Click to edit</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => upd(selectedId, { values: { retail: +vals.retail, trade: +vals.trade, wholesale: +vals.wholesale } })} style={{ padding: '10px 22px', background: INK, border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#fff', marginBottom: 36 }}>
                  Save Values
                </button>

                {(uploads.book?.status === 'parsed' || uploads.mmr?.status === 'parsed' || uploads.retail?.status === 'parsed') && (
                  <div style={{ background: INK, borderRadius: 14, padding: '20px 24px', marginBottom: 32 }}>
                    <div style={{ fontSize: 11, color: '#555', letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 16 }}>AI Valuation Summary</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                      {[['Book Avg', uploads.book?.status === 'parsed' ? '$42,633' : '—'], ['MMR Avg', uploads.mmr?.status === 'parsed' ? '$39,350' : '—'], ['Retail Avg', uploads.retail?.status === 'parsed' ? '$44,600' : '—'], ['Suggested', uploads.book?.status === 'parsed' ? '$44,200' : '—']].map(([l, v]) => (
                        <div key={l}>
                          <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>{l}</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: v === '—' ? '#333' : Y }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: 11, fontWeight: 600, color: DIM, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 16 }}>Valuation Sources</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 28 }}>
                  {(['book', 'mmr', 'retail'] as UploadCat[]).map(cat => (
                    <UploadCard key={cat} cat={cat} upload={uploads[cat]} onFile={handleUpload} onEdit={editExtracted} />
                  ))}
                </div>

                {!valuesOk
                  ? <button onClick={() => setValuesOk(true)} style={{ padding: '11px 24px', background: INK, border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#fff' }}>Mark Values Reviewed</button>
                  : <div style={{ fontSize: 13, color: '#16A34A', fontWeight: 500 }}>✓ Values reviewed</div>
                }
              </div>
            )}

            {/* Damage */}
            {activeTab === 'damage' && (
              <div>
                {a.issues.length === 0 ? (
                  <div style={{ padding: '48px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.3 }}>✓</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 4 }}>No damage confirmed</div>
                    <div style={{ fontSize: 12, color: DIM }}>Issues will appear here once photos are analyzed</div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 28 }}>
                    {a.issues.map(i => (
                      <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0', borderBottom: `1px solid ${LINE}` }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{i.label}</div>
                          <div style={{ fontSize: 12, color: DIM, marginTop: 3 }}>Est. repair ${i.repairLow.toLocaleString()}–${i.repairHigh.toLocaleString()}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: SEV[i.severity].color }}>{SEV[i.severity].label}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!damageOk
                  ? <button onClick={() => setDamageOk(true)} style={{ padding: '11px 24px', background: INK, border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#fff' }}>Mark Damage Reviewed</button>
                  : <div style={{ fontSize: 13, color: '#16A34A', fontWeight: 500 }}>✓ Damage reviewed</div>
                }
              </div>
            )}

            {/* Vehicle Info */}
            {activeTab === 'vehicle' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {[['Year', a.vehicle.year], ['Make', a.vehicle.make], ['Model', a.vehicle.model], ['Trim', a.vehicle.trim], ['VIN', a.vehicle.vin], ['Mileage', a.vehicle.mileage + ' mi'], ['Color', a.vehicle.color]].map(([l, v]) => (
                  <div key={l} style={{ padding: '18px 0', borderBottom: `1px solid ${LINE}`, paddingRight: 40 }}>
                    <div style={{ fontSize: 10, color: DIM, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 5 }}>{l}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            {activeTab === 'notes' && (
              <div>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes — visible only to your team..."
                  style={{ width: '100%', minHeight: 180, border: `1px solid ${LINE}`, borderRadius: 12, padding: '18px', fontSize: 13, color: INK, resize: 'vertical', outline: 'none', lineHeight: 1.7, fontFamily: 'inherit' }} />
                <button onClick={() => upd(a.id, { notes })} style={{ marginTop: 10, padding: '10px 22px', background: INK, border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#fff' }}>Save</button>
              </div>
            )}

            {/* Customer Report */}
            {activeTab === 'report' && (
              <div>
                <div style={{ fontSize: 11, color: DIM, marginBottom: 24, letterSpacing: 0.2 }}>Preview — this is exactly what {a.customer.name} will see.</div>
                <ReportPreview a={a} />
              </div>
            )}
          </div>

          {/* ── Right sidebar ──────────────────────────────── */}
          <div style={{ width: 220, padding: '28px 20px', borderLeft: `1px solid ${LINE}`, overflowY: 'auto', flexShrink: 0 }}>

            {/* Checklist */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: DIM, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 14 }}>Checklist {doneCount}/6</div>
              {Object.entries(checklist).map(([label, done]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, background: done ? Y : LINE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {done && <svg width={8} height={8} viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#111" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{ fontSize: 12, color: done ? INK : DIM, fontWeight: done ? 500 : 400 }}>{label}</span>
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: LINE, marginBottom: 24 }} />

            {/* Products */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: DIM, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 14 }}>Protection Products</div>
              {a.recommendations.length === 0 && <div style={{ fontSize: 11, color: DIM, marginBottom: 12 }}>None selected</div>}
              {PRODUCTS.map(p => {
                const on = a.recommendations.includes(p.id)
                return (
                  <div key={p.id} onClick={() => { const r = on ? a.recommendations.filter(x => x !== p.id) : [...a.recommendations, p.id]; upd(a.id, { recommendations: r }) }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 13, cursor: 'pointer' }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: on ? Y : LINE, border: `1px solid ${on ? Y : '#D4D4D4'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      {on && <svg width={8} height={8} viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#111" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: on ? 600 : 400, color: on ? INK : MID }}>{p.label}</div>
                      <div style={{ fontSize: 10, color: DIM, marginTop: 1 }}>{p.desc}</div>
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
