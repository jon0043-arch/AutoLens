'use client'

import { useRef, useState, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface VehicleData {
  vin: string
  year: string
  make: string
  model: string
  trim: string
}

interface FormData {
  customerName: string
  phone: string
  mileage: string
  keys: string
  notes: string
}

interface Photo {
  angle: string
  preview: string
}

type Step = 'vehicle' | 'photos' | 'review' | 'submit'

// ─── Constants ────────────────────────────────────────────────────────────────
const GOLD   = '#B8962A'
const INK    = '#1A1A1C'
const PAGE   = '#F3F2EF'
const CARD   = '#FFFFFF'
const SURF   = '#ECEAE6'
const MUTED  = '#6B6A67'
const DIM    = '#9E9D9A'
const LINE   = '#E6E4E0'

const REQUIRED_ANGLES = [
  'Front', 'Rear', 'Driver Side', 'Passenger Side',
  'Wheel 1', 'Wheel 2', 'Wheel 3', 'Wheel 4',
  'Windshield', 'Interior', 'Odometer', 'Damage',
]

const REQUIRED_FOR_SUBMIT = ['Damage']

const STEPS: Step[] = ['vehicle', 'photos', 'review', 'submit']
const STEP_LABELS = ['Vehicle', 'Photos', 'Review', 'Submit']

// ─── NHTSA VIN decode ─────────────────────────────────────────────────────────
// TODO: replace Claude VIN photo decode with POST /api/decode-vin-photo { base64 }
async function decodeVIN(vin: string): Promise<Partial<VehicleData>> {
  try {
    const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`)
    const data = await res.json()
    const r = data.Results?.[0]
    if (!r) return {}
    return {
      year:  r.ModelYear || '',
      make:  r.Make      || '',
      model: r.Model     || '',
      trim:  r.Trim      || '',
    }
  } catch {
    return {}
  }
}

export default function SalespersonPage() {
  const [step, setStep]               = useState<Step>('vehicle')
  const [vehicle, setVehicle]         = useState<VehicleData>({ vin: '', year: '', make: '', model: '', trim: '' })
  const [form, setForm]               = useState<FormData>({ customerName: '', phone: '', mileage: '', keys: '2', notes: '' })
  const [photos, setPhotos]           = useState<Photo[]>([])
  const [vinLoading, setVinLoading]   = useState(false)
  const [vinError, setVinError]       = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [submitted, setSubmitted]     = useState(false)

  // VIN photo decode state
  const [vinPhotoMode, setVinPhotoMode] = useState(false)
  const vinPhotoRef  = useRef<HTMLInputElement>(null)
  const photoRefs    = useRef<Record<string, HTMLInputElement | null>>({})

  const stepIndex = STEPS.indexOf(step)

  const setV = (k: keyof VehicleData, v: string) => setVehicle(p => ({ ...p, [k]: v }))
  const setF = (k: keyof FormData,    v: string) => setForm(p => ({ ...p, [k]: v }))

  // ── VIN decode from text ──────────────────────────────────────────────────
  const handleVINDecode = async (vin: string) => {
    if (vin.length !== 17) return
    setVinLoading(true)
    setVinError('')
    const result = await decodeVIN(vin)
    if (result.make) {
      setVehicle(p => ({ ...p, ...result }))
    } else {
      setVinError('VIN not found — check the number and try again')
    }
    setVinLoading(false)
  }

  // ── VIN photo decode via Claude Vision ───────────────────────────────────
  // TODO: wire to POST /api/decode-vin-photo { base64 } → returns { vin }
  const handleVINPhoto = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      setVinLoading(true)
      setVinError('')
      // Placeholder — replace with real Claude Vision call
      await new Promise(r => setTimeout(r, 1500))
      // Fake extracted VIN for now
      const fakeVIN = 'SALWR2RV2LA123456'
      setV('vin', fakeVIN)
      const result = await decodeVIN(fakeVIN)
      if (result.make) setVehicle(p => ({ ...p, ...result }))
      setVinLoading(false)
      setVinPhotoMode(false)
    }
    reader.readAsDataURL(file)
  }, [])

  // ── Photo upload ──────────────────────────────────────────────────────────
  const handlePhoto = useCallback((angle: string, file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const preview = e.target?.result as string
      setPhotos(prev => [...prev.filter(p => p.angle !== angle), { angle, preview }])
    }
    reader.readAsDataURL(file)
  }, [])

  const getPhoto = (angle: string) => photos.find(p => p.angle === angle)
  const photoCount = photos.length

  // ── Submit to manager ─────────────────────────────────────────────────────
  // TODO: replace with POST /api/appraisals { vehicle, form, photos }
  const handleSubmit = async () => {
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1800))
    setSubmitting(false)
    setSubmitted(true)
  }

  const canAdvanceVehicle = vehicle.vin.length === 17 && vehicle.make && form.customerName && form.phone && form.mileage
  const canAdvancePhotos  = photoCount >= 1

  // ── Submitted screen ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: PAGE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, fontFamily: 'Inter,-apple-system,sans-serif' }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: INK, marginBottom: 8, textAlign: 'center' }}>Submitted to Manager</div>
        <div style={{ fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 1.6, marginBottom: 40 }}>
          {form.customerName}'s {vehicle.year} {vehicle.make} {vehicle.model} is in the queue.
        </div>
        <button onClick={() => { setSubmitted(false); setStep('vehicle'); setVehicle({ vin:'',year:'',make:'',model:'',trim:'' }); setForm({ customerName:'',phone:'',mileage:'',keys:'2',notes:'' }); setPhotos([]) }}
          style={btnStyle(true)}>
          Start New Appraisal
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: PAGE, fontFamily: 'Inter,-apple-system,sans-serif', maxWidth: 480, margin: '0 auto', padding: '0 0 40px' }}>
      <style>{`*{box-sizing:border-box} input,button,textarea,select{font:inherit} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ padding: '20px 24px 16px', background: CARD, borderBottom: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>
          <span style={{ color: INK }}>Aut</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: GOLD, color: '#fff', fontSize: 9, margin: '0 1px' }}>AL</span>
          <span style={{ color: INK }}>Lens</span>
        </div>
        <div style={{ fontSize: 12, color: DIM }}>Lot capture</div>
      </div>

      {/* Vehicle name bar (once VIN decoded) */}
      {vehicle.make && (
        <div style={{ padding: '12px 24px', background: CARD, borderBottom: `1px solid ${LINE}` }}>
          <div style={{ fontSize: 11, color: DIM }}>{vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}</div>
          {form.customerName && <div style={{ fontSize: 16, fontWeight: 700, color: INK, marginTop: 2 }}>{form.customerName}</div>}
        </div>
      )}

      {/* Progress bar */}
      <div style={{ display: 'flex', padding: '16px 24px 0', gap: 8 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ flex: 1 }}>
            <div style={{ height: 3, borderRadius: 99, background: i <= stepIndex ? GOLD : LINE, marginBottom: 6 }} />
            <div style={{ fontSize: 10, color: i <= stepIndex ? INK : DIM, fontWeight: i === stepIndex ? 600 : 400 }}>{STEP_LABELS[i]}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '24px 24px 0' }}>

        {/* ── STEP 1: VEHICLE ──────────────────────────────────────────── */}
        {step === 'vehicle' && (
          <div>
            {/* VIN Scan button */}
            <button onClick={() => { setVinPhotoMode(true); vinPhotoRef.current?.click() }}
              style={{ ...btnStyle(true), width: '100%', marginBottom: 12, fontSize: 15 }}>
              📷 Scan VIN
            </button>
            <input ref={vinPhotoRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleVINPhoto(f) }} />

            {/* VIN text input */}
            <div style={{ marginBottom: 16 }}>
              <Field label="VIN Number" value={vehicle.vin} placeholder="Scan or type 17-digit VIN"
                onChange={v => { setV('vin', v.toUpperCase()); if (v.length === 17) handleVINDecode(v.toUpperCase()) }} />
              {vinLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, color: MUTED, fontSize: 12 }}>
                  <span style={{ width: 12, height: 12, border: `2px solid ${LINE}`, borderTopColor: GOLD, borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  {vinPhotoMode ? 'Reading VIN from photo…' : 'Decoding VIN…'}
                </div>
              )}
              {vinError && <div style={{ fontSize: 11, color: '#B83232', marginTop: 6 }}>{vinError}</div>}
            </div>

            {/* Auto-filled vehicle fields */}
            {vehicle.make && (
              <div style={{ background: SURF, borderRadius: 12, padding: '12px 16px', marginBottom: 16, border: `1px solid ${LINE}` }}>
                <div style={{ fontSize: 10, color: DIM, marginBottom: 4 }}>VIN DECODED</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{vehicle.year} {vehicle.make} {vehicle.model}</div>
                {vehicle.trim && <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{vehicle.trim}</div>}
              </div>
            )}

            {/* Customer info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Customer Name" value={form.customerName} placeholder="Full name" onChange={v => setF('customerName', v)} />
              </div>
              <Field label="Phone" value={form.phone} placeholder="(555) 000-0000" onChange={v => setF('phone', v)} type="tel" />
              <Field label="Mileage" value={form.mileage} placeholder="58,342" onChange={v => setF('mileage', v)} type="number" />
              <Field label="Keys" value={form.keys} placeholder="2" onChange={v => setF('keys', v)} type="number" />
            </div>

            <button onClick={() => setStep('photos')} disabled={!canAdvanceVehicle}
              style={{ ...btnStyle(true), width: '100%', marginTop: 16, opacity: canAdvanceVehicle ? 1 : 0.4 }}>
              Continue to Photos →
            </button>
          </div>
        )}

        {/* ── STEP 2: PHOTOS ───────────────────────────────────────────── */}
        {step === 'photos' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: INK }}>Guided Photos</div>
              <div style={{ background: GOLD, color: '#fff', borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                {photoCount}/{REQUIRED_ANGLES.length}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
              {REQUIRED_ANGLES.map(angle => {
                const photo = getPhoto(angle)
                return (
                  <div key={angle} onClick={() => photoRefs.current[angle]?.click()}
                    style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden', background: photo ? 'transparent' : SURF, border: `1.5px ${photo ? 'solid' : 'dashed'} ${photo ? GOLD : LINE}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
                    {photo ? (
                      <>
                        <img src={photo.preview} alt={angle} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent,rgba(0,0,0,0.5))', padding: '8px 6px 4px', fontSize: 8, color: '#fff' }}>{angle}</div>
                        <div style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff' }}>✓</div>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 18, opacity: 0.4 }}>📷</span>
                        <span style={{ fontSize: 9, color: DIM, textAlign: 'center', padding: '0 4px' }}>{angle}</span>
                      </>
                    )}
                    <input ref={el => { photoRefs.current[angle] = el }} type="file" accept="image/*" capture="environment"
                      style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(angle, f) }} />
                  </div>
                )
              })}
            </div>

            {/* Notes */}
            <textarea value={form.notes} onChange={e => setF('notes', e.target.value)}
              placeholder="Customer mentioned wheel scrape, windshield chip visible from driver side..."
              style={{ width: '100%', minHeight: 90, border: `1px solid ${LINE}`, borderRadius: 12, padding: '12px 14px', fontSize: 13, color: INK, resize: 'none', outline: 'none', background: CARD, lineHeight: 1.6, marginBottom: 16 }} />

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep('vehicle')} style={{ ...btnStyle(false), flex: 1 }}>← Back</button>
              <button onClick={() => setStep('review')} disabled={!canAdvancePhotos}
                style={{ ...btnStyle(true), flex: 2, opacity: canAdvancePhotos ? 1 : 0.4 }}>
                Review →
              </button>
            </div>
            <button style={{ ...btnStyle(false), width: '100%', marginTop: 10, fontSize: 12, color: DIM, border: 'none' }}
              onClick={() => setStep('review')}>
              Skip for now
            </button>
          </div>
        )}

        {/* ── STEP 3: REVIEW ───────────────────────────────────────────── */}
        {step === 'review' && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: INK, marginBottom: 16 }}>Review & Confirm</div>

            {/* Vehicle summary */}
            <div style={cardStyle}>
              <Label>Vehicle</Label>
              <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginTop: 6 }}>{vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>VIN: {vehicle.vin} · {form.mileage} mi · {form.keys} key{form.keys !== '1' ? 's' : ''}</div>
            </div>

            {/* Customer summary */}
            <div style={cardStyle}>
              <Label>Customer</Label>
              <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginTop: 6 }}>{form.customerName}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{form.phone}</div>
            </div>

            {/* Photos summary */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Label>Photos</Label>
                <span style={{ fontSize: 12, color: photoCount >= REQUIRED_ANGLES.length ? '#2A7B52' : MUTED }}>
                  {photoCount}/{REQUIRED_ANGLES.length} uploaded
                </span>
              </div>
              {photos.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {photos.map(p => (
                    <img key={p.angle} src={p.preview} alt={p.angle} style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: 7, border: `1px solid ${LINE}` }} />
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            {form.notes && (
              <div style={cardStyle}>
                <Label>Notes</Label>
                <div style={{ fontSize: 13, color: INK, marginTop: 6, lineHeight: 1.5 }}>{form.notes}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setStep('photos')} style={{ ...btnStyle(false), flex: 1 }}>← Back</button>
              <button onClick={() => setStep('submit')} style={{ ...btnStyle(true), flex: 2 }}>Looks Good →</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: SUBMIT ───────────────────────────────────────────── */}
        {step === 'submit' && (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: INK, marginBottom: 8 }}>Ready to Submit</div>
            <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, marginBottom: 32 }}>
              {form.customerName}'s {vehicle.year} {vehicle.make} {vehicle.model} will be sent to the manager for review.
            </div>

            <button onClick={handleSubmit} disabled={submitting}
              style={{ ...btnStyle(true), width: '100%', fontSize: 15, padding: '16px', marginBottom: 12 }}>
              {submitting ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <span style={{ width: 16, height: 16, border: `2px solid rgba(255,255,255,0.4)`, borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  Submitting…
                </span>
              ) : 'Submit to Manager'}
            </button>

            <button onClick={() => setStep('review')} style={{ ...btnStyle(false), width: '100%' }}>← Back to Review</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Shared mini components ───────────────────────────────────────────────────
function Field({ label, value, placeholder, onChange, type = 'text' }: { label: string; value: string; placeholder: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: DIM, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', background: CARD, border: `1px solid ${LINE}`, borderRadius: 10, padding: '12px 14px', fontSize: 15, color: '#1A1A1C', outline: 'none' }} />
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, color: DIM, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{children}</div>
}

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 14,
  padding: '14px 16px',
  marginBottom: 12,
  border: `1px solid #E6E4E0`,
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
}

function btnStyle(primary: boolean): React.CSSProperties {
  return {
    padding: '13px 22px',
    background: primary ? INK : CARD,
    border: `1px solid ${primary ? INK : LINE}`,
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    color: primary ? '#fff' : MUTED,
    display: 'block',
    textAlign: 'center',
  }
}
