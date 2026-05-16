'use client'

import { useRef, useState, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface VehicleData {
  vin: string; year: string; make: string; model: string; trim: string
}
interface FormData {
  customerName: string; phone: string; notes: string
}
interface PhotoBucket {
  category: string
  photos: { id: string; preview: string }[]
}
type Step = 'vehicle' | 'photos' | 'submit'

// ─── Constants ────────────────────────────────────────────────────────────────
const GOLD  = '#B8962A'
const INK   = '#1A1A1C'
const PAGE  = '#F3F2EF'
const CARD  = '#FFFFFF'
const SURF  = '#ECEAE6'
const MUTED = '#6B6A67'
const DIM   = '#9E9D9A'
const LINE  = '#E6E4E0'

const STEPS: Step[] = ['vehicle', 'photos', 'submit']
const STEP_LABELS   = ['Vehicle', 'Photos', 'Submit']

// Photo buckets — AI will later auto-categorize and link to recommendations
const BUCKETS = [
  { id: 'damage',     label: 'Damage',     icon: '🔍', hint: 'Any dents, scratches, or damage'  },
  { id: 'wheels',     label: 'Wheels',     icon: '⭕', hint: 'All four wheels'                  },
  { id: 'tires',      label: 'Tire Tread', icon: '🔄', hint: 'Tread depth close-ups'            },
  { id: 'windshield', label: 'Windshield', icon: '🪟', hint: 'Chips, cracks, or damage'         },
  { id: 'interior',   label: 'Interior',   icon: '🪑', hint: 'Seats, dashboard, wear'           },
  { id: 'keys',       label: 'Keys',       icon: '🔑', hint: 'Show all keys'                    },
  { id: 'odometer',   label: 'Odometer',   icon: '📊', hint: 'Current mileage reading'          },
]

// ─── NHTSA VIN decode ─────────────────────────────────────────────────────────
async function decodeVIN(vin: string): Promise<Partial<VehicleData>> {
  try {
    const res  = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`)
    const data = await res.json()
    const r    = data.Results?.[0]
    if (!r) return {}
    return { year: r.ModelYear || '', make: r.Make || '', model: r.Model || '', trim: r.Trim || '' }
  } catch { return {} }
}

export default function SalespersonPage() {
  const [step, setStep]           = useState<Step>('vehicle')
  const [vehicle, setVehicle]     = useState<VehicleData>({ vin: '', year: '', make: '', model: '', trim: '' })
  const [form, setForm]           = useState<FormData>({ customerName: '', phone: '', notes: '' })
  const [buckets, setBuckets]     = useState<PhotoBucket[]>(BUCKETS.map(b => ({ category: b.id, photos: [] })))
  const [vinLoading, setVinLoading] = useState(false)
  const [vinError, setVinError]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const setV = (k: keyof VehicleData, v: string) => setVehicle(p => ({ ...p, [k]: v }))
  const setF = (k: keyof FormData,    v: string) => setForm(p => ({ ...p, [k]: v }))

  const totalPhotos = buckets.reduce((sum, b) => sum + b.photos.length, 0)
  const stepIndex   = STEPS.indexOf(step)

  // ── VIN decode ───────────────────────────────────────────────────────────
  const handleVINInput = async (vin: string) => {
    setV('vin', vin.toUpperCase())
    if (vin.length !== 17) return
    setVinLoading(true); setVinError('')
    const result = await decodeVIN(vin.toUpperCase())
    if (result.make) {
      setVehicle(p => ({ ...p, ...result }))
    } else {
      setVinError('VIN not found — check the number and try again')
    }
    setVinLoading(false)
  }

  // ── Photo upload per bucket ───────────────────────────────────────────────
  const handlePhoto = useCallback((bucketId: string, file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const preview = e.target?.result as string
      const id      = `${bucketId}-${Date.now()}`
      setBuckets(prev => prev.map(b =>
        b.category === bucketId
          ? { ...b, photos: [...b.photos, { id, preview }] }
          : b
      ))
    }
    reader.readAsDataURL(file)
  }, [])

  const removePhoto = useCallback((bucketId: string, photoId: string) => {
    setBuckets(prev => prev.map(b =>
      b.category === bucketId
        ? { ...b, photos: b.photos.filter(p => p.id !== photoId) }
        : b
    ))
  }, [])

  // ── Submit ───────────────────────────────────────────────────────────────
  // TODO: replace with POST /api/appraisals { vehicle, form, buckets }
  const handleSubmit = async () => {
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1600))
    setSubmitting(false)
    setSubmitted(true)
  }

  const canAdvanceVehicle = vehicle.vin.length === 17 && form.customerName && form.phone
  const canSubmit         = totalPhotos >= 1

  // ── Submitted ────────────────────────────────────────────────────────────
  if (submitted) return (
    <Shell>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 52, marginBottom: 20 }}>✅</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: INK, marginBottom: 8 }}>Submitted to Manager</div>
        <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, marginBottom: 40 }}>
          {form.customerName}'s {vehicle.year} {vehicle.make} {vehicle.model} is in the queue.
        </div>
        <button onClick={() => {
          setSubmitted(false); setStep('vehicle')
          setVehicle({ vin:'',year:'',make:'',model:'',trim:'' })
          setForm({ customerName:'',phone:'',notes:'' })
          setBuckets(BUCKETS.map(b => ({ category: b.id, photos: [] })))
        }} style={btn(true, '100%')}>
          Start New Appraisal
        </button>
      </div>
    </Shell>
  )

  return (
    <Shell>
      {/* Header */}
      <div style={{ padding: '18px 20px 14px', background: CARD, borderBottom: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: -0.5 }}>
          <span style={{ color: INK }}>Aut</span>
          <span style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',width:19,height:19,borderRadius:'50%',background:GOLD,color:'#fff',fontSize:8,margin:'0 1px' }}>AL</span>
          <span style={{ color: INK }}>Lens</span>
        </div>
        <div style={{ fontSize: 11, color: DIM, letterSpacing: 0.3 }}>Lot capture</div>
      </div>

      {/* Vehicle bar */}
      {vehicle.make && (
        <div style={{ padding: '10px 20px', background: SURF, borderBottom: `1px solid ${LINE}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: INK }}>{vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}</div>
          {form.customerName && <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{form.customerName}</div>}
        </div>
      )}

      {/* Progress */}
      <div style={{ display: 'flex', padding: '14px 20px 0', gap: 8 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ flex: 1 }}>
            <div style={{ height: 3, borderRadius: 99, background: i <= stepIndex ? GOLD : LINE, marginBottom: 5 }} />
            <div style={{ fontSize: 10, color: i <= stepIndex ? INK : DIM, fontWeight: i === stepIndex ? 600 : 400 }}>{STEP_LABELS[i]}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '20px 20px 48px' }}>

        {/* ── VEHICLE ────────────────────────────────────────────────── */}
        {step === 'vehicle' && (
          <div>
            {/* Scan VIN */}
            <button onClick={() => fileRefs.current['vin-scan']?.click()}
              style={{ ...btn(true, '100%'), marginBottom: 14, fontSize: 14 }}>
              📷 Scan VIN
            </button>
            <input ref={el => { fileRefs.current['vin-scan'] = el }} type="file" accept="image/*" capture="environment"
              style={{ display: 'none' }} onChange={e => { /* TODO: Claude Vision decode */ }} />

            {/* VIN input */}
            <div style={{ marginBottom: 14 }}>
              <Field label="VIN" value={vehicle.vin} placeholder="Type or scan 17-digit VIN"
                onChange={handleVINInput} />
              {vinLoading && <Spinner label="Decoding VIN…" />}
              {vinError   && <div style={{ fontSize: 11, color: '#B83232', marginTop: 5 }}>{vinError}</div>}
            </div>

            {/* Decoded vehicle */}
            {vehicle.make && (
              <div style={{ background: SURF, borderRadius: 12, padding: '10px 14px', marginBottom: 14, border: `1px solid ${LINE}` }}>
                <div style={{ fontSize: 10, color: GOLD, fontWeight: 600, marginBottom: 3 }}>✓ VIN DECODED</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{vehicle.year} {vehicle.make} {vehicle.model}</div>
                {vehicle.trim && <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{vehicle.trim}</div>}
              </div>
            )}

            {/* Customer fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Customer Name" value={form.customerName} placeholder="Full name" onChange={v => setF('customerName', v)} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Phone Number" value={form.phone} placeholder="(555) 000-0000" onChange={v => setF('phone', v)} type="tel" />
              </div>
            </div>

            <button onClick={() => setStep('photos')} disabled={!canAdvanceVehicle}
              style={{ ...btn(true, '100%'), opacity: canAdvanceVehicle ? 1 : 0.35 }}>
              Continue →
            </button>
          </div>
        )}

        {/* ── PHOTOS ─────────────────────────────────────────────────── */}
        {step === 'photos' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: INK, marginBottom: 4 }}>Upload Photos</div>
              <div style={{ fontSize: 13, color: MUTED }}>Add photos of anything you'd like us to evaluate. Only one photo required.</div>
            </div>

            {BUCKETS.map(bucket => {
              const bucketData = buckets.find(b => b.category === bucket.id)!
              const count      = bucketData.photos.length

              return (
                <div key={bucket.id} style={{ background: CARD, borderRadius: 16, padding: '16px', marginBottom: 12, border: `1px solid ${LINE}`, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                  {/* Bucket header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: count > 0 ? 12 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{bucket.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{bucket.label}</div>
                        <div style={{ fontSize: 11, color: DIM, marginTop: 1 }}>{bucket.hint}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {count > 0 && (
                        <span style={{ fontSize: 11, color: GOLD, fontWeight: 600 }}>{count} photo{count !== 1 ? 's' : ''}</span>
                      )}
                      <button onClick={() => fileRefs.current[bucket.id]?.click()}
                        style={{ width: 32, height: 32, borderRadius: '50%', background: count > 0 ? SURF : INK, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: count > 0 ? INK : '#fff', flexShrink: 0 }}>
                        +
                      </button>
                    </div>
                  </div>

                  {/* Photo thumbnails */}
                  {count > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {bucketData.photos.map(photo => (
                        <div key={photo.id} style={{ position: 'relative', width: 72, height: 54 }}>
                          <img src={photo.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: `1px solid ${LINE}` }} />
                          <button onClick={() => removePhoto(bucket.id, photo.id)}
                            style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#B83232', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                            ×
                          </button>
                        </div>
                      ))}
                      {/* Add more */}
                      <div onClick={() => fileRefs.current[bucket.id]?.click()}
                        style={{ width: 72, height: 54, borderRadius: 8, border: `1.5px dashed ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 20, color: DIM }}>
                        +
                      </div>
                    </div>
                  )}

                  <input ref={el => { fileRefs.current[bucket.id] = el }} type="file" accept="image/*" capture="environment" multiple
                    style={{ display: 'none' }}
                    onChange={e => {
                      Array.from(e.target.files || []).forEach(f => handlePhoto(bucket.id, f))
                      e.target.value = ''
                    }} />
                </div>
              )
            })}

            {/* Notes */}
            <textarea value={form.notes} onChange={e => setF('notes', e.target.value)}
              placeholder="Any notes for the manager... (optional)"
              style={{ width: '100%', minHeight: 80, border: `1px solid ${LINE}`, borderRadius: 12, padding: '12px 14px', fontSize: 13, color: INK, resize: 'none', outline: 'none', background: CARD, lineHeight: 1.6, marginTop: 4, marginBottom: 16 }} />

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep('vehicle')} style={btn(false, undefined)}>← Back</button>
              <button onClick={() => setStep('submit')} disabled={!canSubmit}
                style={{ ...btn(true, undefined), flex: 1, opacity: canSubmit ? 1 : 0.35 }}>
                Review →
              </button>
            </div>
            {!canSubmit && <div style={{ fontSize: 11, color: DIM, textAlign: 'center', marginTop: 10 }}>Add at least one photo to continue</div>}
          </div>
        )}

        {/* ── SUBMIT ─────────────────────────────────────────────────── */}
        {step === 'submit' && (
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: INK, marginBottom: 16 }}>Review & Submit</div>

            {/* Vehicle */}
            <div style={card}>
              <Label>Vehicle</Label>
              <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginTop: 6 }}>{vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>VIN: {vehicle.vin}</div>
            </div>

            {/* Customer */}
            <div style={card}>
              <Label>Customer</Label>
              <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginTop: 6 }}>{form.customerName}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{form.phone}</div>
            </div>

            {/* Photos summary */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Label>Photos</Label>
                <span style={{ fontSize: 12, color: GOLD, fontWeight: 600 }}>{totalPhotos} uploaded</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {buckets.flatMap(b => b.photos).map(p => (
                  <img key={p.id} src={p.preview} alt="" style={{ width: 52, height: 40, objectFit: 'cover', borderRadius: 7, border: `1px solid ${LINE}` }} />
                ))}
              </div>
            </div>

            {form.notes && (
              <div style={card}>
                <Label>Notes</Label>
                <div style={{ fontSize: 13, color: INK, marginTop: 6, lineHeight: 1.5 }}>{form.notes}</div>
              </div>
            )}

            <button onClick={handleSubmit} disabled={submitting}
              style={{ ...btn(true, '100%'), fontSize: 15, padding: '15px', marginBottom: 10 }}>
              {submitting
                ? <span style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:10 }}>
                    <span style={{ width:15,height:15,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin 0.8s linear infinite' }} />
                    Submitting…
                  </span>
                : 'Submit to Manager'
              }
            </button>
            <button onClick={() => setStep('photos')} style={btn(false, '100%')}>← Back</button>
          </div>
        )}
      </div>
    </Shell>
  )
}

// ─── Shared components ────────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: PAGE, fontFamily: 'Inter,-apple-system,sans-serif', maxWidth: 480, margin: '0 auto' }}>
      <style>{`*{box-sizing:border-box} input,button,textarea{font:inherit} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {children}
    </div>
  )
}

function Field({ label, value, placeholder, onChange, type = 'text' }: { label: string; value: string; placeholder: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: DIM, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', background: CARD, border: `1px solid ${LINE}`, borderRadius: 10, padding: '12px 14px', fontSize: 15, color: INK, outline: 'none' }} />
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, color: DIM, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{children}</div>
}

function Spinner({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 7, color: MUTED, fontSize: 12 }}>
      <span style={{ width: 12, height: 12, border: `2px solid ${LINE}`, borderTopColor: GOLD, borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
      {label}
    </div>
  )
}

const card: React.CSSProperties = {
  background: CARD, borderRadius: 14, padding: '14px 16px', marginBottom: 12,
  border: `1px solid ${LINE}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
}

function btn(primary: boolean, width?: string | number): React.CSSProperties {
  return {
    width, padding: '12px 20px', background: primary ? INK : CARD,
    border: `1px solid ${primary ? INK : LINE}`, borderRadius: 12,
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    color: primary ? '#fff' : MUTED, display: 'block', textAlign: 'center',
  }
}
