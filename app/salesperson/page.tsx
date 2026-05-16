'use client'

import { useRef, useState, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface VehicleData { vin: string; year: string; make: string; model: string; trim: string }
interface FormData    { customerName: string; phone: string; keys: string; notes: string }
interface PhotoBucket { category: string; photos: { id: string; preview: string }[] }
type Step = 'vehicle' | 'photos' | 'submit'

// ─── Tokens ───────────────────────────────────────────────────────────────────
const GOLD  = '#B8962A'
const INK   = '#1A1A1C'
const CHAR  = '#2C2B29'
const PAGE  = '#F2F0EC'
const CARD  = '#FFFFFF'
const SURF  = '#ECEAE6'
const MUTED = '#6B6A67'
const DIM   = '#9E9D9A'
const LINE  = '#E6E4E0'

const STEPS: Step[]  = ['vehicle', 'photos', 'submit']
const STEP_LABELS    = ['Vehicle', 'Photos', 'Submit']

const BUCKETS = [
  { id: 'damage',     label: 'Damage',     sub: 'Dents, scratches, any visible damage', featured: true  },
  { id: 'wheels',     label: 'Wheels',     sub: 'All four wheels',                       featured: false },
  { id: 'tires',      label: 'Tire Tread', sub: 'Tread depth close-ups',                featured: false },
  { id: 'windshield', label: 'Windshield', sub: 'Chips, cracks, or damage',             featured: false },
  { id: 'interior',   label: 'Interior',   sub: 'Seats, dash, wear',                    featured: false },
  { id: 'odometer',   label: 'Odometer',   sub: 'Current mileage',                      featured: false },
]

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IC = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const Icons: Record<string, React.FC<{ size?: number }>> = {
  damage:     ({ size }) => <IC size={size} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />,
  wheels:     ({ size }) => <IC size={size} d="M12 12m-9 0a9 9 0 1018 0 9 9 0 00-18 0M12 12m-3 0a3 3 0 106 0 3 3 0 00-6 0M3 12h3m12 0h3M12 3v3m0 12v3" />,
  tires:      ({ size }) => <IC size={size} d="M12 12m-9 0a9 9 0 1018 0 9 9 0 00-18 0M12 12m-4 0a4 4 0 108 0 4 4 0 00-8 0" />,
  windshield: ({ size }) => <IC size={size} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />,
  interior:   ({ size }) => <IC size={size} d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />,
  odometer:   ({ size }) => <IC size={size} d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-14v4l3 3" />,
}

// ─── NHTSA decode ─────────────────────────────────────────────────────────────
async function decodeVIN(vin: string): Promise<Partial<VehicleData>> {
  try {
    const res  = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`)
    const data = await res.json()
    const r    = data.Results?.[0]
    if (!r) return {}
    return { year: r.ModelYear||'', make: r.Make||'', model: r.Model||'', trim: r.Trim||'' }
  } catch { return {} }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SalespersonPage() {
  const [step, setStep]             = useState<Step>('vehicle')
  const [vehicle, setVehicle]       = useState<VehicleData>({ vin:'',year:'',make:'',model:'',trim:'' })
  const [form, setForm]             = useState<FormData>({ customerName:'',phone:'',keys:'2',notes:'' })
  const [buckets, setBuckets]       = useState<PhotoBucket[]>(BUCKETS.map(b => ({ category: b.id, photos: [] })))
  const [vinLoading, setVinLoading] = useState(false)
  const [vinError, setVinError]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)

  const fileRefs   = useRef<Record<string, HTMLInputElement | null>>({})
  const stepIndex  = STEPS.indexOf(step)
  const totalPhotos = buckets.reduce((s, b) => s + b.photos.length, 0)
  const canGo      = vehicle.vin.length === 17 && form.customerName && form.phone
  const canSubmit  = totalPhotos >= 1

  const setV = (k: keyof VehicleData, v: string) => setVehicle(p => ({ ...p, [k]: v }))
  const setF = (k: keyof FormData,    v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleVIN = async (vin: string) => {
    setV('vin', vin.toUpperCase())
    if (vin.length !== 17) return
    setVinLoading(true); setVinError('')
    const r = await decodeVIN(vin.toUpperCase())
    if (r.make) setVehicle(p => ({ ...p, ...r }))
    else setVinError('VIN not found — check the number')
    setVinLoading(false)
  }

  const addPhoto = useCallback((bucketId: string, file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      setBuckets(prev => prev.map(b =>
        b.category === bucketId
          ? { ...b, photos: [...b.photos, { id: `${bucketId}-${Date.now()}`, preview: e.target?.result as string }] }
          : b
      ))
    }
    reader.readAsDataURL(file)
  }, [])

  const removePhoto = useCallback((bucketId: string, id: string) => {
    setBuckets(prev => prev.map(b =>
      b.category === bucketId ? { ...b, photos: b.photos.filter(p => p.id !== id) } : b
    ))
  }, [])

  // TODO: POST /api/appraisals { vehicle, form, buckets }
  const handleSubmit = async () => {
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1500))
    setSubmitting(false); setSubmitted(true)
  }

  if (submitted) return (
    <Shell>
      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'80vh',padding:32,textAlign:'center' }}>
        <div style={{ width:64,height:64,borderRadius:'50%',background:'#D1FAE5',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:24 }}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#2A7B52" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
        </div>
        <div style={{ fontSize:22,fontWeight:700,color:INK,letterSpacing:-0.5,marginBottom:8 }}>Sent to Manager</div>
        <div style={{ fontSize:14,color:MUTED,lineHeight:1.6,marginBottom:40 }}>
          {form.customerName}'s {vehicle.year} {vehicle.make} {vehicle.model} is in the review queue.
        </div>
        <button onClick={() => { setSubmitted(false); setStep('vehicle'); setVehicle({ vin:'',year:'',make:'',model:'',trim:'' }); setForm({ customerName:'',phone:'',keys:'2',notes:'' }); setBuckets(BUCKETS.map(b => ({ category:b.id,photos:[] }))) }}
          style={primaryBtn}>New Appraisal</button>
      </div>
    </Shell>
  )

  return (
    <Shell>
      {/* Header */}
      <div style={{ padding:'18px 20px 16px',background:CARD,borderBottom:`1px solid ${LINE}`,display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,zIndex:20 }}>
        <LogoMark />
        <div style={{ fontSize:11,color:DIM,letterSpacing:0.4 }}>Lot Capture</div>
      </div>

      {/* Vehicle identity strip — appears after VIN decode */}
      {vehicle.make && (
        <div style={{ background:CHAR,padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div>
            <div style={{ fontSize:11,color:'rgba(255,255,255,0.45)',letterSpacing:0.5,marginBottom:3 }}>{vehicle.year} · {vehicle.trim}</div>
            <div style={{ fontSize:15,fontWeight:600,color:'#fff',letterSpacing:-0.3 }}>{vehicle.make} {vehicle.model}</div>
          </div>
          {form.customerName && <div style={{ fontSize:12,color:'rgba(255,255,255,0.55)',textAlign:'right' }}>{form.customerName}</div>}
        </div>
      )}

      {/* Progress */}
      <div style={{ padding:'14px 20px 0',background:CARD,borderBottom:`1px solid ${LINE}` }}>
        <div style={{ display:'flex',gap:6,marginBottom:12 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex:1 }}>
              <div style={{ height:2,borderRadius:99,background:i <= stepIndex ? GOLD : LINE }} />
            </div>
          ))}
        </div>
        <div style={{ display:'flex',gap:6,paddingBottom:12 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex:1,fontSize:10,fontWeight:i===stepIndex?600:400,color:i<=stepIndex?INK:DIM }}>{STEP_LABELS[i]}</div>
          ))}
        </div>
      </div>

      <div style={{ padding:'24px 20px 120px' }}>

        {/* ── VEHICLE ──────────────────────────────────────────────── */}
        {step === 'vehicle' && (
          <div>
            {/* Scan registration */}
            <button onClick={() => fileRefs.current['reg']?.click()}
              style={{ width:'100%',padding:'14px',background:CHAR,border:'none',borderRadius:14,fontSize:13,fontWeight:600,color:'#fff',cursor:'pointer',marginBottom:10,display:'flex',alignItems:'center',justifyContent:'center',gap:8,letterSpacing:0.1 }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
              Scan Registration
            </button>
            <input ref={el=>{fileRefs.current['reg']=el}} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{/* TODO: Claude Vision */}} />

            {/* Scan VIN */}
            <button onClick={() => fileRefs.current['vin']?.click()}
              style={{ width:'100%',padding:'14px',background:SURF,border:`1px solid ${LINE}`,borderRadius:14,fontSize:13,fontWeight:600,color:INK,cursor:'pointer',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 8V6a2 2 0 012-2h2M3 16v2a2 2 0 002 2h2m10-16h2a2 2 0 012 2v2m-4 14h2a2 2 0 002-2v-2M7 12h1m3 0h1m3 0h1M8 7v10M12 7v10M16 7v10"/></svg>
              Scan VIN Barcode
            </button>
            <input ref={el=>{fileRefs.current['vin']=el}} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{/* TODO: Claude Vision */}} />

            <div style={{ height:1,background:LINE,marginBottom:20 }} />

            {/* VIN manual */}
            <Field label="VIN" value={vehicle.vin} placeholder="17-digit VIN" onChange={handleVIN} mono />
            {vinLoading && <Spin label="Decoding VIN…" />}
            {vinError   && <div style={{fontSize:11,color:'#B83232',marginTop:5}}>{vinError}</div>}
            {vehicle.make && (
              <div style={{background:SURF,borderRadius:10,padding:'10px 14px',marginTop:8,marginBottom:4,display:'flex',alignItems:'center',gap:8}}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:INK}}>{vehicle.year} {vehicle.make} {vehicle.model}</div>
                  {vehicle.trim && <div style={{fontSize:11,color:MUTED}}>{vehicle.trim}</div>}
                </div>
              </div>
            )}

            <div style={{height:16}} />
            <Field label="Customer Name" value={form.customerName} placeholder="Full name" onChange={v=>setF('customerName',v)} />
            <div style={{height:10}} />
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Field label="Phone" value={form.phone} placeholder="(555) 000-0000" onChange={v=>setF('phone',v)} type="tel" />
              <Field label="Keys" value={form.keys} placeholder="2" onChange={v=>setF('keys',v)} type="number" />
            </div>
          </div>
        )}

        {/* ── PHOTOS ───────────────────────────────────────────────── */}
        {step === 'photos' && (
          <div>
            <div style={{marginBottom:22}}>
              <div style={{fontSize:18,fontWeight:700,color:INK,letterSpacing:-0.4,marginBottom:4}}>Upload Photos</div>
              <div style={{fontSize:13,color:MUTED,lineHeight:1.5}}>Upload anything you'd like us to evaluate. One photo is all you need.</div>
            </div>

            {BUCKETS.map(bucket => {
              const data    = buckets.find(b => b.category === bucket.id)!
              const count   = data.photos.length
              const Icon    = Icons[bucket.id]

              if (bucket.featured) return (
                // ── Featured: Damage card ─────────────────────────────
                <div key={bucket.id} onClick={() => fileRefs.current[bucket.id]?.click()}
                  style={{ background:CHAR,borderRadius:18,padding:'22px',marginBottom:14,cursor:'pointer',position:'relative',overflow:'hidden' }}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom: count > 0 ? 16 : 0}}>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                        <span style={{color:'rgba(255,255,255,0.7)'}}><Icon size={16} /></span>
                        <div style={{fontSize:15,fontWeight:600,color:'#fff',letterSpacing:-0.2}}>{bucket.label}</div>
                      </div>
                      <div style={{fontSize:12,color:'rgba(255,255,255,0.45)'}}>{bucket.sub}</div>
                    </div>
                    {count > 0
                      ? <span style={{fontSize:11,color:GOLD,fontWeight:600}}>{count} photo{count!==1?'s':''}</span>
                      : <span style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>Tap to add</span>
                    }
                  </div>
                  {count === 0 ? (
                    <div style={{border:'1.5px dashed rgba(255,255,255,0.15)',borderRadius:12,padding:'24px',textAlign:'center',marginTop:14}}>
                      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:6,display:'block',margin:'0 auto 6px'}}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                      <div style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>Upload or take photo</div>
                    </div>
                  ) : (
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      {data.photos.map(p => (
                        <div key={p.id} style={{position:'relative',width:76,height:56}}>
                          <img src={p.preview} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:8}} />
                          <button onClick={e=>{e.stopPropagation();removePhoto(bucket.id,p.id)}}
                            style={{position:'absolute',top:-5,right:-5,width:17,height:17,borderRadius:'50%',background:'rgba(0,0,0,0.7)',border:'none',color:'#fff',fontSize:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>×</button>
                        </div>
                      ))}
                      <div style={{width:76,height:56,borderRadius:8,border:'1.5px dashed rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,0.3)',fontSize:20}}>+</div>
                    </div>
                  )}
                  <input ref={el=>{fileRefs.current[bucket.id]=el}} type="file" accept="image/*" multiple style={{display:'none'}}
                    onChange={e=>{Array.from(e.target.files||[]).forEach(f=>addPhoto(bucket.id,f));e.target.value=''}} />
                </div>
              )

              return (
                // ── Secondary bucket cards ────────────────────────────
                <div key={bucket.id} onClick={() => fileRefs.current[bucket.id]?.click()}
                  style={{ background:CARD,borderRadius:14,padding:'14px 16px',marginBottom:8,border:`1px solid ${LINE}`,cursor:'pointer',boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <span style={{color:count>0?GOLD:DIM,flexShrink:0}}><Icon size={17} /></span>
                      <div>
                        <div style={{fontSize:13,fontWeight:count>0?600:400,color:count>0?INK:MUTED,lineHeight:1.2}}>{bucket.label}</div>
                        <div style={{fontSize:11,color:DIM,marginTop:1}}>{bucket.sub}</div>
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                      {count > 0 && (
                        <div style={{display:'flex',gap:4}}>
                          {data.photos.slice(0,3).map(p => (
                            <img key={p.id} src={p.preview} alt="" style={{width:30,height:24,objectFit:'cover',borderRadius:5,border:`1px solid ${LINE}`}} />
                          ))}
                          {count > 3 && <div style={{width:30,height:24,borderRadius:5,background:SURF,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:MUTED,fontWeight:600}}>+{count-3}</div>}
                        </div>
                      )}
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={DIM} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                    </div>
                  </div>
                  <input ref={el=>{fileRefs.current[bucket.id]=el}} type="file" accept="image/*" multiple style={{display:'none'}}
                    onChange={e=>{Array.from(e.target.files||[]).forEach(f=>addPhoto(bucket.id,f));e.target.value=''}} />
                </div>
              )
            })}

            {/* Notes */}
            <textarea value={form.notes} onChange={e=>setF('notes',e.target.value)}
              placeholder="Notes for the manager (optional)"
              style={{width:'100%',minHeight:72,border:`1px solid ${LINE}`,borderRadius:12,padding:'12px 14px',fontSize:13,color:INK,resize:'none',outline:'none',background:CARD,lineHeight:1.6,marginTop:8}} />
          </div>
        )}

        {/* ── SUBMIT ───────────────────────────────────────────────── */}
        {step === 'submit' && (
          <div>
            <div style={{fontSize:18,fontWeight:700,color:INK,letterSpacing:-0.4,marginBottom:18}}>Review &amp; Submit</div>

            <ReviewCard label="Vehicle">
              <div style={{fontSize:15,fontWeight:600,color:INK}}>{vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}</div>
              <div style={{fontSize:12,color:MUTED,marginTop:3,fontFamily:'monospace'}}>{vehicle.vin}</div>
            </ReviewCard>

            <ReviewCard label="Customer">
              <div style={{fontSize:15,fontWeight:600,color:INK}}>{form.customerName}</div>
              <div style={{fontSize:12,color:MUTED,marginTop:2}}>{form.phone} · {form.keys} key{form.keys!=='1'?'s':''}</div>
            </ReviewCard>

            <ReviewCard label={`Photos · ${totalPhotos}`}>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
                {buckets.flatMap(b=>b.photos).map(p=>(
                  <img key={p.id} src={p.preview} alt="" style={{width:52,height:40,objectFit:'cover',borderRadius:7,border:`1px solid ${LINE}`}} />
                ))}
              </div>
            </ReviewCard>

            {form.notes && (
              <ReviewCard label="Notes">
                <div style={{fontSize:13,color:INK,lineHeight:1.5}}>{form.notes}</div>
              </ReviewCard>
            )}

            <button onClick={handleSubmit} disabled={submitting} style={{...primaryBtn,marginTop:8}}>
              {submitting
                ? <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
                    <span style={{width:15,height:15,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin 0.8s linear infinite'}} />
                    Submitting…
                  </span>
                : 'Submit to Manager'
              }
            </button>
            <button onClick={()=>setStep('photos')} style={secondaryBtn}>← Back</button>
          </div>
        )}
      </div>

      {/* ── Floating CTA ─────────────────────────────────────────── */}
      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,padding:'16px 20px 28px',background:`linear-gradient(transparent, ${PAGE} 30%)`,zIndex:30}}>
        {step === 'vehicle' && (
          <button onClick={()=>setStep('photos')} disabled={!canGo}
            style={{...primaryBtn,opacity:canGo?1:0.35}}>
            Continue to Photos →
          </button>
        )}
        {step === 'photos' && (
          <div>
            {totalPhotos > 0 && (
              <div style={{textAlign:'center',fontSize:11,color:MUTED,marginBottom:8}}>
                {totalPhotos} photo{totalPhotos!==1?'s':''} added
              </div>
            )}
            <button onClick={()=>setStep('submit')} disabled={!canSubmit}
              style={{...primaryBtn,opacity:canSubmit?1:0.35}}>
              Review Submission →
            </button>
          </div>
        )}
      </div>
    </Shell>
  )
}

// ─── Shared ───────────────────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{minHeight:'100vh',background:PAGE,fontFamily:'Inter,-apple-system,BlinkMacSystemFont,sans-serif',maxWidth:480,margin:'0 auto',position:'relative'}}>
      <style>{`*{box-sizing:border-box} input,button,textarea{font:inherit} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {children}
    </div>
  )
}

function LogoMark() {
  return (
    <div style={{display:'flex',alignItems:'center',fontWeight:800,fontSize:17,letterSpacing:-0.5,lineHeight:1}}>
      <span style={{color:INK}}>Aut</span>
      <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:19,height:19,borderRadius:'50%',background:GOLD,color:'#fff',fontSize:8,margin:'0 1px'}}>AL</span>
      <span style={{color:INK}}>Lens</span>
    </div>
  )
}

function Field({ label, value, placeholder, onChange, type='text', mono=false }: { label: string; value: string; placeholder: string; onChange: (v: string) => void; type?: string; mono?: boolean }) {
  return (
    <div>
      <div style={{fontSize:10,color:DIM,fontWeight:600,letterSpacing:0.6,textTransform:'uppercase',marginBottom:6}}>{label}</div>
      <input type={type} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}
        style={{width:'100%',background:CARD,border:`1px solid ${LINE}`,borderRadius:10,padding:'12px 14px',fontSize:15,color:INK,outline:'none',fontFamily:mono?'monospace':undefined,letterSpacing:mono?0.5:undefined}} />
    </div>
  )
}

function Spin({ label }: { label: string }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:7,marginTop:7,color:MUTED,fontSize:12}}>
      <span style={{width:11,height:11,border:`2px solid ${LINE}`,borderTopColor:GOLD,borderRadius:'50%',display:'inline-block',animation:'spin 0.8s linear infinite'}} />
      {label}
    </div>
  )
}

function ReviewCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{background:CARD,borderRadius:14,padding:'14px 16px',marginBottom:10,border:`1px solid ${LINE}`,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
      <div style={{fontSize:10,color:DIM,fontWeight:600,letterSpacing:0.6,textTransform:'uppercase',marginBottom:6}}>{label}</div>
      {children}
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  width:'100%',padding:'14px',background:INK,border:'none',borderRadius:13,
  fontSize:14,fontWeight:600,cursor:'pointer',color:'#fff',display:'block',textAlign:'center',letterSpacing:-0.1,
}

const secondaryBtn: React.CSSProperties = {
  width:'100%',padding:'13px',background:'transparent',border:`1px solid ${LINE}`,borderRadius:13,
  fontSize:13,fontWeight:500,cursor:'pointer',color:MUTED,display:'block',textAlign:'center',marginTop:8,
}
