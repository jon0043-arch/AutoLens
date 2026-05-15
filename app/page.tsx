'use client'
import { useState, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Severity = 'low' | 'moderate' | 'high'
type Status   = 'pending' | 'review' | 'approved' | 'sent'
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

// ─── Constants ────────────────────────────────────────────────────────────────
const Y = '#F5B800'

const SEV: Record<Severity, { text: string; bg: string; label: string }> = {
  low:      { text: '#6B7280', bg: '#F3F4F6', label: 'Low'      },
  moderate: { text: '#D97706', bg: '#FEF3C7', label: 'Moderate' },
  high:     { text: '#DC2626', bg: '#FEE2E2', label: 'High'     },
}
const STAT: Record<Status, { label: string; text: string; bg: string }> = {
  pending:  { label: 'Pending',        text: '#6B7280', bg: '#F3F4F6' },
  review:   { label: 'Needs Review',   text: '#B45309', bg: '#FEF3C7' },
  approved: { label: 'Ready to Send',  text: '#065F46', bg: '#D1FAE5' },
  sent:     { label: 'Sent',           text: '#1D4ED8', bg: '#DBEAFE' },
}
const PRODUCTS = [
  { id: 'wheel',    label: 'Wheel & Tire Protection',    desc: 'Covers damaged wheels and tires'      },
  { id: 'shield',   label: 'Windshield Protection',      desc: 'Chip and crack repair/replacement'    },
  { id: 'key',      label: 'Key Replacement',            desc: 'Lost, stolen, or broken key coverage' },
  { id: 'interior', label: 'Interior Protection',        desc: 'Stain, burn, and tear coverage'       },
  { id: 'gps',      label: 'GPS & Theft Protection',     desc: 'GPS tracking and theft recovery'      },
]
const NAV = ['Dashboard','Appraisals','Deals','Inventory','Customers','Reports','Products','Settings','Admin']
const TABS = [
  { k: 'photos',  l: 'Photos'          },
  { k: 'values',  l: 'Values'          },
  { k: 'damage',  l: 'Damage'          },
  { k: 'vehicle', l: 'Vehicle Info'    },
  { k: 'notes',   l: 'Notes'           },
  { k: 'report',  l: 'Customer Report' },
]
const FAKE_PARSE: Record<UploadCat, Record<string, string>> = {
  book:   { 'Source': 'KBB', 'Trade-In Value': '$39,800', 'Private Party': '$42,200', 'Retail Value': '$45,900', 'Confidence': 'High' },
  mmr:    { 'Clean MMR Avg': '$41,500', 'Accident MMR Avg': '$37,200', 'Transactions': '8', 'Mileage Range': '48k–65k mi', 'Confidence': 'Medium' },
  retail: { 'Clean Retail Avg': '$46,900', 'Accident Retail Avg': '$42,300', 'Listings': '12', 'Market Spread': '$4,600', 'Confidence': 'High' },
}
const UPLOAD_META: Record<UploadCat, { title: string; hint: string; empty: string }> = {
  book:   { title: 'Book Values',     hint: 'KBB · Edmunds · Black Book · JD Power', empty: 'No book values uploaded yet'    },
  mmr:    { title: 'MMR / Wholesale', hint: 'Manheim MMR · Auction comps',            empty: 'Upload MMR screenshot'         },
  retail: { title: 'Retail Comps',    hint: 'Clean & accident retail listings',        empty: 'No retail comps uploaded yet' },
}
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
    estimatedValue: 37500, conditionScore: 76, recommendations: ['wheel', 'gps'], notes: '',
  },
]

// ─── Logo ─────────────────────────────────────────────────────────────────────
function Logo({ size = 20 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', fontWeight: 900, fontSize: size, letterSpacing: -0.5, lineHeight: 1 }}>
      <span style={{ color: '#fff' }}>Aut</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size * 1.1, height: size * 1.1, borderRadius: '50%', background: Y, flexShrink: 0 }}>
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
  const r = 36, c = 2 * Math.PI * r, pct = score / 100
  const color = score >= 85 ? '#10B981' : score >= 70 ? Y : '#EF4444'
  const label = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Poor'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: 90, height: 90 }}>
        <svg width={90} height={90} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={45} cy={45} r={r} fill="none" stroke="#F3F4F6" strokeWidth={8} />
          <circle cx={45} cy={45} r={r} fill="none" stroke={color} strokeWidth={8} strokeDasharray={`${pct * c} ${c}`} strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#111', lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 10, color: '#9CA3AF' }}>/100</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 4 }}>{label}</div>
    </div>
  )
}

// ─── Workflow Bar ─────────────────────────────────────────────────────────────
function WorkflowBar({ activeTab, setActiveTab, done }: { activeTab: string; setActiveTab: (t: string) => void; done: Record<string, boolean> }) {
  const steps = [
    { tab: 'photos',  label: 'Review Photos',   key: 'photos'  },
    { tab: 'values',  label: 'Check Values',    key: 'values'  },
    { tab: 'damage',  label: 'Confirm Damage',  key: 'damage'  },
    { tab: 'report',  label: 'Preview Report',  key: 'report'  },
    { tab: '',        label: 'Send',             key: 'send'    },
  ]
  return (
    <div style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', padding: '0 28px', display: 'flex', alignItems: 'center', height: 48, gap: 0, flexShrink: 0 }}>
      {steps.map((s, i) => {
        const isDone = done[s.key]
        const isActive = s.tab === activeTab || (s.key === 'send' && activeTab === 'report')
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : undefined }}>
            <div onClick={() => s.tab && setActiveTab(s.tab)} style={{
              display: 'flex', alignItems: 'center', gap: 7, cursor: s.tab ? 'pointer' : 'default',
              padding: '4px 8px', borderRadius: 8,
              background: isActive ? '#111' : 'transparent',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: isDone ? Y : isActive ? '#fff' : '#E5E7EB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
                color: isDone ? '#111' : isActive ? '#111' : '#9CA3AF',
              }}>
                {isDone ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? '#fff' : isDone ? '#374151' : '#9CA3AF', whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 1, background: isDone ? Y : '#E5E7EB', margin: '0 4px' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Inline Edit Cell ─────────────────────────────────────────────────────────
function InlineEdit({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(value)
  if (editing) return (
    <input autoFocus value={v} onChange={e => setV(e.target.value)}
      onBlur={() => { onChange(v); setEditing(false) }}
      onKeyDown={e => { if (e.key === 'Enter') { onChange(v); setEditing(false) } }}
      style={{ width: '100%', border: '1px solid ' + Y, borderRadius: 5, padding: '3px 6px', fontSize: 12, fontWeight: 600, outline: 'none', background: '#FFFBEB' }} />
  )
  return (
    <span onClick={() => setEditing(true)} style={{ cursor: 'pointer', fontWeight: 600 }} title="Click to edit">
      {v} <span style={{ fontSize: 10, color: '#D1D5DB' }}>✎</span>
    </span>
  )
}

// ─── Upload Card ──────────────────────────────────────────────────────────────
function UploadCard({ cat, upload, onFile, onEdit }: {
  cat: UploadCat
  upload: ValUpload | null
  onFile: (cat: UploadCat, file: File) => void
  onEdit: (cat: UploadCat, key: string, val: string) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const meta = UPLOAD_META[cat]

  const handle = (file: File) => onFile(cat, file)

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
      {/* Card header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{meta.title}</div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{meta.hint}</div>
        </div>
        {upload && (
          <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 99, fontWeight: 600,
            background: upload.status === 'parsed' ? '#D1FAE5' : '#DBEAFE',
            color: upload.status === 'parsed' ? '#065F46' : '#1D4ED8' }}>
            {upload.status === 'parsed' ? '✓ Parsed' : 'Parsing…'}
          </span>
        )}
      </div>

      <div style={{ padding: 16 }}>
        {/* Drop zone or preview */}
        {!upload ? (
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handle(f) }}
            onClick={() => ref.current?.click()}
            style={{ border: `2px dashed ${drag ? Y : '#D1D5DB'}`, borderRadius: 10, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', background: drag ? '#FFFBEB' : '#FAFAFA' }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>📤</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Drag & drop or click to upload</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>PNG · JPG · PDF</div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
            {upload.preview && <img src={upload.preview} alt="" style={{ width: 68, height: 50, objectFit: 'cover', borderRadius: 7, border: '1px solid #E5E7EB', flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{upload.fileName}</div>
              <button onClick={() => ref.current?.click()} style={{ marginTop: 4, fontSize: 11, color: Y, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}>Replace ↑</button>
            </div>
          </div>
        )}
        <input ref={ref} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handle(f) }} />

        {/* Parsing spinner */}
        {upload?.status === 'parsing' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2563EB', fontSize: 12, marginTop: 8 }}>
            <span style={{ display: 'inline-block', width: 13, height: 13, border: '2px solid #BFDBFE', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Analyzing screenshot…
          </div>
        )}

        {/* Extracted data table */}
        {upload?.status === 'parsed' && Object.keys(upload.data).length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
            <tbody>
              {Object.entries(upload.data).map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '6px 0', fontSize: 11, color: '#6B7280', width: '52%' }}>{k}</td>
                  <td style={{ padding: '6px 0', fontSize: 11, color: '#111' }}>
                    <InlineEdit value={v} onChange={nv => onEdit(cat, k, nv)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!upload && (
          <button onClick={() => ref.current?.click()} style={{ width: '100%', marginTop: 10, padding: '9px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
            Upload Screenshot
          </button>
        )}
      </div>
    </div>
  )
}

// ─── SMS Modal ────────────────────────────────────────────────────────────────
function SMSModal({ a, onClose, onSend }: { a: Appraisal; onClose: () => void; onSend: () => void }) {
  const msg = `Hi ${a.customer.name.split(' ')[0]}, your AutoLens Vehicle Report is ready.\n\nWe found a few items on your ${a.vehicle.year} ${a.vehicle.make} ${a.vehicle.model}:\n${a.issues.slice(0, 3).map(i => `• ${i.label}`).join('\n')}\n\nView your full report here:\nautolens.ai/report/${a.id}\n\nReply STOP to opt out.`
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '28px', width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#111', marginBottom: 4 }}>Preview Text Message</div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 20 }}>This is exactly what {a.customer.name} will receive.</div>
        <div style={{ background: '#F3F4F6', borderRadius: 16, padding: '16px', marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginBottom: 10 }}>AutoLens · Text Message</div>
          <div style={{ background: '#fff', borderRadius: 14, borderBottomLeftRadius: 4, padding: '12px 14px', fontSize: 12, lineHeight: 1.7, color: '#111', whiteSpace: 'pre-wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            {msg}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Cancel</button>
          <button onClick={onSend} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: Y, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>📤 Send Now</button>
        </div>
      </div>
    </div>
  )
}

// ─── Customer Report Preview ──────────────────────────────────────────────────
function CustomerReportPreview({ a }: { a: Appraisal }) {
  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>Report #{a.id}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#111', marginBottom: 2 }}>Hi {a.customer.name.split(' ')[0]},</div>
      <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>Here's your Vehicle Report — {a.createdAt}</div>
      {/* Dark summary card */}
      <div style={{ background: '#111827', borderRadius: 14, padding: '20px 24px', marginBottom: 24, color: '#fff' }}>
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>{a.vehicle.year} {a.vehicle.make} {a.vehicle.model} {a.vehicle.trim}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div><div style={{ fontSize: 10, color: '#6B7280', marginBottom: 4 }}>Estimated Value</div><div style={{ fontSize: 22, fontWeight: 900, color: Y }}>{fmt(a.estimatedValue)}</div></div>
          <div><div style={{ fontSize: 10, color: '#6B7280', marginBottom: 4 }}>Condition</div><div style={{ fontSize: 22, fontWeight: 900, color: '#10B981' }}>{a.conditionScore}<span style={{ fontSize: 11, color: '#6B7280' }}>/100</span></div></div>
          <div><div style={{ fontSize: 10, color: '#6B7280', marginBottom: 4 }}>Mileage</div><div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{a.vehicle.mileage}</div><div style={{ fontSize: 10, color: '#6B7280' }}>miles</div></div>
        </div>
      </div>
      {/* Issues */}
      {a.issues.length > 0 && <>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 12 }}>Detected Issues</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {a.issues.slice(0, 4).map(i => (
            <div key={i.id} style={{ background: '#F9FAFB', borderRadius: 10, padding: '14px', border: '1px solid #F3F4F6' }}>
              <span style={{ fontSize: 10, background: SEV[i.severity].bg, color: SEV[i.severity].text, padding: '2px 7px', borderRadius: 99, fontWeight: 600 }}>{SEV[i.severity].label}</span>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginTop: 8 }}>{i.label}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>Est. ${i.repairLow}–${i.repairHigh}</div>
            </div>
          ))}
        </div>
      </>}
      {/* Recommendations */}
      {a.recommendations.length > 0 && <>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 12 }}>Recommended Protections</div>
        {PRODUCTS.filter(p => a.recommendations.includes(p.id)).map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#F9FAFB', borderRadius: 10, marginBottom: 8, border: '1px solid #F3F4F6' }}>
            <div><div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{p.label}</div><div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{p.desc}</div></div>
            <span style={{ fontSize: 11, color: Y, fontWeight: 600, cursor: 'pointer' }}>Learn more →</span>
          </div>
        ))}
      </>}
      <div style={{ marginTop: 24 }}>
        <button style={{ width: '100%', padding: '14px', background: Y, border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: 'pointer', marginBottom: 10 }}>View Full Report Online</button>
        <button style={{ width: '100%', padding: '14px', background: '#F3F4F6', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Contact Us With Questions</button>
      </div>
    </div>
  )
}

// ─── Checklist Card ───────────────────────────────────────────────────────────
function ChecklistCard({ checklist }: { checklist: Record<string, boolean> }) {
  const done = Object.values(checklist).filter(Boolean).length
  const total = Object.values(checklist).length
  const allDone = done === total
  const LABELS: Record<string, string> = {
    customerInfo: 'Customer info reviewed', vehicleInfo: 'Vehicle info reviewed',
    photosReviewed: 'Photos reviewed', valuesReviewed: 'Values reviewed',
    damageReviewed: 'Damage reviewed', recommendations: 'Recommendations selected',
  }
  return (
    <div style={{ background: '#fff', border: `1px solid ${allDone ? '#A7F3D0' : '#E5E7EB'}`, borderRadius: 12, padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{allDone ? '✅ Ready to Send' : 'Review Checklist'}</div>
        <div style={{ fontSize: 11, color: '#9CA3AF' }}>{done}/{total}</div>
      </div>
      {Object.entries(checklist).map(([key, isDone]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDone ? '#D1FAE5' : '#F3F4F6' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: isDone ? '#059669' : '#D1D5DB' }}>{isDone ? '✓' : '○'}</span>
          </div>
          <span style={{ fontSize: 12, color: isDone ? '#374151' : '#9CA3AF', fontWeight: isDone ? 500 : 400 }}>{LABELS[key]}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Page() {
  const [appraisals, setAppraisals] = useState<Appraisal[]>(SEED)
  const [selectedId, setSelectedId] = useState('84291')
  const [activeNav, setActiveNav]   = useState('Appraisals')
  const [activeTab, setActiveTab]   = useState('photos')
  const [notes, setNotes]           = useState('')
  const [showSMS, setShowSMS]       = useState(false)

  // Review state — tracks what manager has confirmed
  const [photosReviewed,  setPhotosReviewed]  = useState(false)
  const [valuesReviewed,  setValuesReviewed]  = useState(false)
  const [damageReviewed,  setDamageReviewed]  = useState(false)

  // Valuation uploads — TODO: replace fake parse with POST /api/parse-screenshot
  const [uploads, setUploads] = useState<Record<UploadCat, ValUpload | null>>({ book: null, mmr: null, retail: null })

  // Editable values state (per selected appraisal)
  const [vals, setVals] = useState({ retail: '43250', trade: '26800', wholesale: '24100' })

  const a = appraisals.find(x => x.id === selectedId)!
  const upd = (id: string, changes: Partial<Appraisal>) =>
    setAppraisals(prev => prev.map(x => x.id === id ? { ...x, ...changes } : x))

  // Checklist — derived from appraisal + review states
  const checklist = {
    customerInfo:    !!(a.customer.name && a.customer.phone),
    vehicleInfo:     !!(a.vehicle.vin && a.vehicle.year && a.vehicle.make),
    photosReviewed,
    valuesReviewed,
    damageReviewed,
    recommendations: a.recommendations.length > 0,
  }
  const allDone = Object.values(checklist).every(Boolean)

  // Workflow done state per step
  const workflowDone = {
    photos: photosReviewed,
    values: valuesReviewed,
    damage: damageReviewed,
    report: allDone,
    send:   a.status === 'sent',
  }

  // Handle valuation screenshot upload
  const handleUpload = (cat: UploadCat, file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const preview = e.target?.result as string
      setUploads(p => ({ ...p, [cat]: { fileName: file.name, preview, status: 'parsing', data: {} } }))
      // Fake parse delay — replace with real AI call here
      setTimeout(() => {
        setUploads(p => ({ ...p, [cat]: { ...p[cat]!, status: 'parsed', data: { ...FAKE_PARSE[cat] } } }))
      }, 2000)
    }
    reader.readAsDataURL(file)
  }

  const handleEditExtracted = (cat: UploadCat, key: string, val: string) => {
    setUploads(p => ({ ...p, [cat]: { ...p[cat]!, data: { ...p[cat]!.data, [key]: val } } }))
  }

  const saveValues = () => {
    upd(selectedId, { values: { retail: +vals.retail, trade: +vals.trade, wholesale: +vals.wholesale } })
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,sans-serif', overflow: 'hidden', background: '#fff' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      {showSMS && <SMSModal a={a} onClose={() => setShowSMS(false)} onSend={() => { upd(a.id, { status: 'sent' }); setShowSMS(false) }} />}

      {/* ── Sidebar ───────────────────────────────────────── */}
      <div style={{ width: 210, background: '#111827', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid #1F2937' }}>
          <Logo size={19} />
        </div>
        <nav style={{ padding: '10px 8px', flex: 1 }}>
          {NAV.map(label => {
            const active = activeNav === label
            return (
              <div key={label} onClick={() => setActiveNav(label)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, marginBottom: 2, cursor: 'pointer', background: active ? Y : 'transparent', color: active ? '#111' : '#6B7280', fontSize: 13, fontWeight: active ? 700 : 400 }}>
                {label}
              </div>
            )
          })}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid #1F2937' }}>
          <div style={{ fontSize: 11, color: '#4B5563' }}>v1.0 · AutoLens</div>
        </div>
      </div>

      {/* ── Queue ─────────────────────────────────────────── */}
      <div style={{ width: 265, background: '#F9FAFB', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid #E5E7EB', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>Appraisals</div>
            <button style={{ background: Y, border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ New</button>
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
            {appraisals.length} total · {appraisals.filter(x => x.status === 'review').length} need review
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '10px 8px' }}>
          {appraisals.map(x => {
            const s = STAT[x.status], sel = x.id === selectedId
            return (
              <div key={x.id} onClick={() => {
                setSelectedId(x.id)
                setVals({ retail: String(x.values.retail), trade: String(x.values.trade), wholesale: String(x.values.wholesale) })
                setPhotosReviewed(false); setValuesReviewed(false); setDamageReviewed(false)
                setActiveTab('photos'); setUploads({ book: null, mmr: null, retail: null })
              }} style={{ background: '#fff', border: `2px solid ${sel ? Y : '#E5E7EB'}`, borderRadius: 10, padding: '12px 14px', marginBottom: 8, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{x.customer.name}</div>
                  <span style={{ fontSize: 9, background: s.bg, color: s.text, padding: '2px 7px', borderRadius: 99, fontWeight: 600, marginLeft: 6, whiteSpace: 'nowrap' }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>{x.vehicle.year} {x.vehicle.make} {x.vehicle.model}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{x.createdAt}</div>
                {x.estimatedValue > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: Y, marginTop: 6 }}>{fmt(x.estimatedValue)}</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Detail ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid #F3F4F6', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 3 }}>Appraisal #{a.id} · {a.createdAt}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#111' }}>{a.customer.name} — {a.vehicle.year} {a.vehicle.make} {a.vehicle.model}</div>
              <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 99, fontWeight: 600, background: STAT[a.status].bg, color: STAT[a.status].text }}>{STAT[a.status].label}</span>
            </div>
          </div>
          <button
            onClick={() => allDone ? setShowSMS(true) : undefined}
            style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: allDone ? Y : '#F3F4F6', fontSize: 13, fontWeight: 700, cursor: allDone ? 'pointer' : 'not-allowed', color: allDone ? '#111' : '#9CA3AF', transition: 'all 0.2s' }}
            title={allDone ? 'Send to customer' : 'Complete checklist first'}>
            📤 Send to Customer
          </button>
        </div>

        {/* Workflow bar */}
        <WorkflowBar activeTab={activeTab} setActiveTab={setActiveTab} done={workflowDone} />

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '20px 24px 0' }}>

            {/* Customer + Vehicle row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px', gap: 12, marginBottom: 16 }}>
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
              <div style={{ background: '#1F2937', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 5, cursor: 'pointer' }}>
                <svg width={36} height={26} viewBox="0 0 24 24" fill="#4B5563"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
                <div style={{ fontSize: 9, color: '#4B5563' }}>No photo</div>
              </div>
            </div>

            {/* Metric cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 10 }}>Estimated Value</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#111', lineHeight: 1 }}>{fmt(a.estimatedValue)}</div>
                <div style={{ fontSize: 10, color: '#10B981', fontWeight: 500, marginTop: 8 }}>● High confidence</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4, alignSelf: 'flex-start' }}>Condition Score</div>
                <ConditionGauge score={a.conditionScore} />
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 10 }}>Issues Found</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: a.issues.length > 0 ? '#D97706' : '#10B981', lineHeight: 1 }}>{a.issues.length}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 8 }}>{a.issues.filter(i => i.severity === 'high').length} high severity</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 10 }}>Checklist</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: allDone ? '#10B981' : '#111', lineHeight: 1 }}>
                  {Object.values(checklist).filter(Boolean).length}<span style={{ fontSize: 14, color: '#9CA3AF', fontWeight: 400 }}>/{Object.values(checklist).length}</span>
                </div>
                <div style={{ fontSize: 11, color: allDone ? '#10B981' : '#6B7280', marginTop: 8 }}>{allDone ? '✓ Ready to send' : 'Items remaining'}</div>
              </div>
            </div>
          </div>

          {/* Tabs + content + right sidebar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 230px', gap: 0, padding: '0 24px 40px' }}>
            <div style={{ paddingRight: 20 }}>
              {/* Tab bar */}
              <div style={{ display: 'flex', borderBottom: '2px solid #F3F4F6', marginBottom: 20 }}>
                {TABS.map(({ k, l }) => (
                  <button key={k} onClick={() => setActiveTab(k)} style={{ padding: '10px 14px', border: 'none', background: 'none', fontSize: 13, fontWeight: activeTab === k ? 700 : 400, cursor: 'pointer', color: activeTab === k ? '#111' : '#9CA3AF', borderBottom: `2px solid ${activeTab === k ? Y : 'transparent'}`, marginBottom: -2, whiteSpace: 'nowrap' }}>
                    {l}
                  </button>
                ))}
              </div>

              {/* ── Photos ───────────────────────────────────── */}
              {activeTab === 'photos' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                    {['Front','Front Left','Front Right','Rear','Rear Left','Rear Right','Left Side','Right Side','Interior','Engine','Odometer'].map(lbl => (
                      <div key={lbl} style={{ background: '#F9FAFB', borderRadius: 8, aspectRatio: '4/3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', border: '2px dashed #E5E7EB' }}>
                        <span style={{ fontSize: 20 }}>📷</span>
                        <span style={{ fontSize: 9, color: '#9CA3AF' }}>{lbl}</span>
                      </div>
                    ))}
                    <div style={{ background: '#F9FAFB', borderRadius: 8, aspectRatio: '4/3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', border: `2px dashed ${Y}` }}>
                      <span style={{ fontSize: 20, color: Y }}>+</span>
                      <span style={{ fontSize: 9, color: Y, fontWeight: 600 }}>Add Photo</span>
                    </div>
                  </div>
                  <div style={{ padding: '12px 16px', background: '#FFF9E6', borderRadius: 10, border: '1px solid #FDE68A', fontSize: 12, color: '#92400E', marginBottom: 16 }}>
                    📷 No photos uploaded yet — photos build customer confidence in the report.
                  </div>
                  {!photosReviewed
                    ? <button onClick={() => setPhotosReviewed(true)} style={{ width: '100%', padding: '13px', background: Y, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✓ Mark Photos as Reviewed</button>
                    : <div style={{ padding: '12px 16px', background: '#D1FAE5', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#065F46', textAlign: 'center' }}>✅ Photos reviewed</div>
                  }
                </div>
              )}

              {/* ── Values ───────────────────────────────────── */}
              {activeTab === 'values' && (
                <div>
                  {/* Editable value fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                    {([['Retail Value', 'retail'], ['Trade-In Value', 'trade'], ['Wholesale Value', 'wholesale']] as const).map(([label, key]) => (
                      <div key={key} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px' }}>
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>{label}</div>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', background: '#F9FAFB' }}>
                          <span style={{ padding: '8px 10px', fontSize: 13, color: '#6B7280', borderRight: '1px solid #E5E7EB', background: '#F3F4F6' }}>$</span>
                          <input type="number" value={vals[key]} onChange={e => setVals(p => ({ ...p, [key]: e.target.value }))}
                            style={{ flex: 1, border: 'none', background: 'transparent', padding: '8px 10px', fontSize: 16, fontWeight: 700, outline: 'none', color: '#111' }} />
                        </div>
                        <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 6 }}>✎ Click to edit</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={saveValues} style={{ marginBottom: 24, padding: '9px 20px', background: Y, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Save Values
                  </button>

                  {/* AI Valuation Summary */}
                  {(uploads.book?.status === 'parsed' || uploads.mmr?.status === 'parsed' || uploads.retail?.status === 'parsed') && (
                    <div style={{ background: '#111827', borderRadius: 12, padding: '18px 20px', marginBottom: 24, border: '1px solid #1F2937' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14 }}>AI Valuation Summary</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[
                          ['Book Value Avg', uploads.book?.status === 'parsed' ? '$42,633' : '—'],
                          ['MMR Wholesale Avg', uploads.mmr?.status === 'parsed' ? '$39,350' : '—'],
                          ['Retail Comp Avg', uploads.retail?.status === 'parsed' ? '$44,600' : '—'],
                          ['Suggested Retail', uploads.book?.status === 'parsed' ? '$44,200' : '—'],
                        ].map(([l, v]) => (
                          <div key={l} style={{ background: '#1F2937', borderRadius: 8, padding: '12px 14px' }}>
                            <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 4 }}>{l}</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: v === '—' ? '#374151' : Y }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload cards */}
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 14 }}>Upload Valuation Sources</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                    {(['book', 'mmr', 'retail'] as UploadCat[]).map(cat => (
                      <UploadCard key={cat} cat={cat} upload={uploads[cat]} onFile={handleUpload} onEdit={handleEditExtracted} />
                    ))}
                  </div>

                  {!valuesReviewed
                    ? <button onClick={() => setValuesReviewed(true)} style={{ width: '100%', padding: '13px', background: Y, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✓ Mark Values as Reviewed</button>
                    : <div style={{ padding: '12px 16px', background: '#D1FAE5', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#065F46', textAlign: 'center' }}>✅ Values reviewed</div>
                  }
                </div>
              )}

              {/* ── Damage ───────────────────────────────────── */}
              {activeTab === 'damage' && (
                <div>
                  {a.issues.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', background: '#F9FAFB', borderRadius: 12, border: '2px dashed #E5E7EB', marginBottom: 20 }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 4 }}>No damage confirmed yet</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>Issues will appear here once photos are analyzed</div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: 20 }}>
                      {a.issues.map(i => (
                        <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', background: '#F9FAFB', borderRadius: 12, marginBottom: 10, border: '1px solid #F3F4F6' }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{i.label}</div>
                            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>Est. repair: ${i.repairLow.toLocaleString()} – ${i.repairHigh.toLocaleString()}</div>
                          </div>
                          <span style={{ fontSize: 11, background: SEV[i.severity].bg, color: SEV[i.severity].text, padding: '4px 12px', borderRadius: 99, fontWeight: 700 }}>{SEV[i.severity].label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {!damageReviewed
                    ? <button onClick={() => setDamageReviewed(true)} style={{ width: '100%', padding: '13px', background: Y, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✓ Mark Damage as Reviewed</button>
                    : <div style={{ padding: '12px 16px', background: '#D1FAE5', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#065F46', textAlign: 'center' }}>✅ Damage reviewed</div>
                  }
                </div>
              )}

              {/* ── Vehicle Info ─────────────────────────────── */}
              {activeTab === 'vehicle' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[['Year', a.vehicle.year],['Make', a.vehicle.make],['Model', a.vehicle.model],['Trim', a.vehicle.trim],['VIN', a.vehicle.vin],['Mileage', a.vehicle.mileage + ' mi'],['Color', a.vehicle.color]].map(([l, v]) => (
                    <div key={l} style={{ padding: '14px 16px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{l}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{v || '—'}</div>
                      </div>
                      <button style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', color: '#6B7280' }}>✎ Edit</button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Notes ────────────────────────────────────── */}
              {activeTab === 'notes' && (
                <div>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add internal notes visible only to your team..."
                    style={{ width: '100%', minHeight: 160, border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px', fontSize: 13, color: '#374151', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.7 }} />
                  <button onClick={() => upd(a.id, { notes })} style={{ marginTop: 8, padding: '10px 20px', background: Y, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Save Notes</button>
                </div>
              )}

              {/* ── Customer Report Preview ───────────────────── */}
              {activeTab === 'report' && (
                <div>
                  <div style={{ padding: '12px 16px', background: '#FFFBEB', borderRadius: 10, border: '1px solid #FDE68A', fontSize: 12, color: '#92400E', marginBottom: 20 }}>
                    👁 <strong>Preview only</strong> — this is exactly what {a.customer.name} will see.
                  </div>
                  <CustomerReportPreview a={a} />
                </div>
              )}
            </div>

            {/* ── Right Sidebar ─────────────────────────────── */}
            <div>
              <ChecklistCard checklist={checklist} />
              <div style={{ marginTop: 16, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#111', marginBottom: 14 }}>Protection Products</div>
                {a.recommendations.length === 0 && <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12 }}>No products selected yet</div>}
                {PRODUCTS.map(p => {
                  const checked = a.recommendations.includes(p.id)
                  return (
                    <div key={p.id} onClick={() => { const r = checked ? a.recommendations.filter(x => x !== p.id) : [...a.recommendations, p.id]; upd(a.id, { recommendations: r }) }}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12, cursor: 'pointer' }}>
                      <div style={{ width: 17, height: 17, borderRadius: 4, background: checked ? Y : '#F3F4F6', border: `1px solid ${checked ? Y : '#D1D5DB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        {checked && <svg width={9} height={9} viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#111" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{p.label}</div>
                        <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>{p.desc}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
