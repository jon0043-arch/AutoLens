'use client'
import { useState, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Sev    = 'low' | 'moderate' | 'high'
type Status = 'missing_info' | 'needs_review' | 'ready' | 'sent'
type ValCat = 'book' | 'mmr' | 'retail'
type View   = 'manager' | 'salesperson'

interface Issue { id:string; label:string; severity:Sev; repairLow:number; repairHigh:number }
interface Appraisal {
  id:string; status:Status; createdAt:string
  customer:{ name:string; phone:string }
  vehicle:{ year:string; make:string; model:string; trim:string; vin:string; mileage:string; color:string }
  issues:Issue[]; values:{ retail:number; trade:number; wholesale:number }
  estimatedValue:number; conditionScore:number; recommendations:string[]; notes:string
}
interface ValUpload { fileName:string; preview:string; parseStatus:'idle'|'parsing'|'parsed'; extracted:Record<string,string> }

// ─── Design tokens ────────────────────────────────────────────────────────────
const Y = '#F5B800'
const DARK = '#111827'

const SEV: Record<Sev,{text:string;bg:string;label:string}> = {
  low:      {text:'#6B7280',bg:'#F3F4F6',label:'Low'},
  moderate: {text:'#D97706',bg:'#FEF3C7',label:'Moderate'},
  high:     {text:'#DC2626',bg:'#FEE2E2',label:'High'},
}
const STAT: Record<Status,{label:string;text:string;bg:string}> = {
  missing_info: {label:'Missing Info',   text:'#6B7280',bg:'#F3F4F6'},
  needs_review: {label:'Needs Review',   text:'#B45309',bg:'#FEF3C7'},
  ready:        {label:'Ready to Send',  text:'#065F46',bg:'#D1FAE5'},
  sent:         {label:'Sent',           text:'#1D4ED8',bg:'#DBEAFE'},
}
const TIPS: Record<string,string> = {
  retail:    'The price a dealer lists the car for on the lot.',
  trade:     'What a dealer pays a customer when they trade in a vehicle.',
  wholesale: 'What dealers pay each other at auction — the floor value.',
  book:      'Published pricing guides like KBB, Edmunds, and Black Book.',
  mmr:       'Manheim Market Report — average wholesale auction prices nationwide.',
  condition: 'A score from 0–100 based on mileage, damage, and overall vehicle condition.',
}
const PRODUCTS = [
  {id:'wheel',   label:'Wheel & Tire Protection',   desc:'Covers damaged wheels and tires'},
  {id:'shield',  label:'Windshield Protection',      desc:'Chip and crack repair/replacement'},
  {id:'key',     label:'Key Replacement',            desc:'Lost, stolen, or broken key coverage'},
  {id:'interior',label:'Interior Protection',        desc:'Stain, burn, and tear coverage'},
  {id:'gps',     label:'GPS & Theft Protection',     desc:'Tracking and theft recovery'},
]
const FAKE_PARSE: Record<ValCat,Record<string,string>> = {
  book:   {'Source':'KBB','Trade-In Value':'$39,800','Private Party Value':'$42,200','Retail Value':'$45,900','Confidence':'High'},
  mmr:    {'Clean MMR Average':'$41,500','Accident MMR Average':'$37,200','Transaction Count':'8','Mileage Range':'48k–65k mi','Confidence':'Medium'},
  retail: {'Clean Retail Average':'$46,900','Accident Retail Average':'$42,300','Listing Count':'12','Market Spread':'$4,600','Confidence':'High'},
}
const NAV_ITEMS = ['Dashboard','Appraisals','Deals','Inventory','Customers','Reports','Products','Settings']

const SEED: Appraisal[] = [
  {
    id:'84291', status:'needs_review', createdAt:'May 12, 2:45 PM',
    customer:{name:'Mike Johnson',phone:'(305) 555-1234'},
    vehicle:{year:'2020',make:'Land Rover',model:'Range Rover Sport',trim:'HSE',vin:'SALWR2RV2LA123456',mileage:'58,342',color:'Black'},
    issues:[
      {id:'i1',label:'Front Right Wheel Damage',severity:'moderate',repairLow:150,repairHigh:300},
      {id:'i2',label:'Windshield Chip',severity:'low',repairLow:75,repairHigh:150},
      {id:'i3',label:'Interior Wear',severity:'moderate',repairLow:250,repairHigh:600},
      {id:'i4',label:'Only 1 Key Detected',severity:'high',repairLow:400,repairHigh:1200},
    ],
    values:{retail:43250,trade:26800,wholesale:24100},
    estimatedValue:42750, conditionScore:82,
    recommendations:['wheel','shield','key'], notes:'',
  },
  {
    id:'84290', status:'ready', createdAt:'May 12, 12:30 PM',
    customer:{name:'Sarah Williams',phone:'(305) 555-5678'},
    vehicle:{year:'2021',make:'Mercedes-Benz',model:'GLE',trim:'350 4MATIC',vin:'W1N0G8EB4MF123456',mileage:'31,200',color:'Silver'},
    issues:[{id:'i5',label:'Minor Paint Scratch',severity:'low',repairLow:100,repairHigh:300}],
    values:{retail:52000,trade:38000,wholesale:35000},
    estimatedValue:51500, conditionScore:91,
    recommendations:['shield','interior'], notes:'Clean vehicle.',
  },
  {
    id:'84289', status:'missing_info', createdAt:'May 12, 11:05 AM',
    customer:{name:'Chris Davis',phone:'(305) 555-3456'},
    vehicle:{year:'2019',make:'Audi',model:'Q7',trim:'Premium Plus',vin:'WA1BXAF75KD012345',mileage:'44,100',color:'White'},
    issues:[], values:{retail:0,trade:0,wholesale:0},
    estimatedValue:0, conditionScore:0, recommendations:[], notes:'',
  },
  {
    id:'84288', status:'sent', createdAt:'May 12, 10:30 AM',
    customer:{name:'James Wilson',phone:'(305) 555-7890'},
    vehicle:{year:'2020',make:'Ford',model:'F-150',trim:'XLT',vin:'1FTEW1E53KFA12345',mileage:'67,890',color:'Blue'},
    issues:[
      {id:'i6',label:'Bed Liner Damage',severity:'low',repairLow:200,repairHigh:500},
      {id:'i7',label:'Front Bumper Scuff',severity:'moderate',repairLow:300,repairHigh:700},
    ],
    values:{retail:38000,trade:28000,wholesale:25000},
    estimatedValue:37500, conditionScore:76,
    recommendations:['wheel','gps'], notes:'',
  },
]

const fmt = (n:number) => n > 0 ? `$${n.toLocaleString()}` : '—'

// ─── Shared mini-components ───────────────────────────────────────────────────

function Logo({size=20}:{size?:number}) {
  return (
    <div style={{display:'flex',alignItems:'center',fontWeight:900,fontSize:size,letterSpacing:-0.5,lineHeight:1}}>
      <span style={{color:'#fff'}}>Aut</span>
      <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:size*1.1,height:size*1.1,borderRadius:'50%',background:Y,flexShrink:0}}>
        <svg width={size*0.62} height={size*0.62} viewBox="0 0 24 24" fill="#111">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
      </span>
      <span style={{color:Y}}>Lens</span>
    </div>
  )
}

function Tip({id,children}:{id:string;children:React.ReactNode}) {
  const [show,setShow] = useState(false)
  return (
    <span style={{position:'relative',display:'inline-flex',alignItems:'center',gap:4}}>
      {children}
      <span onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}
        style={{width:15,height:15,borderRadius:'50%',background:'#E5E7EB',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#6B7280',cursor:'help',fontWeight:700,flexShrink:0}}>?</span>
      {show && <span style={{position:'absolute',bottom:'calc(100% + 8px)',left:0,background:DARK,color:'#fff',fontSize:11,padding:'8px 12px',borderRadius:8,zIndex:200,width:220,lineHeight:1.5,fontWeight:400,pointerEvents:'none',boxShadow:'0 4px 16px rgba(0,0,0,0.2)'}}>
        {TIPS[id]}
      </span>}
    </span>
  )
}

function ConditionGauge({score}:{score:number}) {
  const r=36, c=2*Math.PI*r, pct=score/100
  const col = score>=85?'#10B981':score>=70?Y:'#EF4444'
  const lbl = score>=85?'Excellent':score>=70?'Good':score>=50?'Fair':'Poor'
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
      <div style={{position:'relative',width:90,height:90}}>
        <svg width={90} height={90} style={{transform:'rotate(-90deg)'}}>
          <circle cx={45} cy={45} r={r} fill="none" stroke="#F3F4F6" strokeWidth={8}/>
          <circle cx={45} cy={45} r={r} fill="none" stroke={col} strokeWidth={8} strokeDasharray={`${pct*c} ${c}`} strokeLinecap="round"/>
        </svg>
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
          <div style={{fontSize:22,fontWeight:800,color:'#111',lineHeight:1}}>{score}</div>
          <div style={{fontSize:10,color:'#9CA3AF'}}>/100</div>
        </div>
      </div>
      <div style={{fontSize:11,color:col,fontWeight:600,marginTop:4}}>{lbl}</div>
    </div>
  )
}

function EditableValue({label,value,tipId,onChange}:{label:string;value:number;tipId?:string;onChange:(n:number)=>void}) {
  const [editing,setEditing] = useState(false)
  const [v,setV] = useState(String(value))
  return (
    <div style={{background:'#F9FAFB',borderRadius:10,padding:'14px 16px',border:'1px solid #F3F4F6'}}>
      <div style={{fontSize:11,color:'#9CA3AF',marginBottom:8,display:'flex',alignItems:'center',gap:4}}>
        {tipId ? <Tip id={tipId}>{label}</Tip> : label}
      </div>
      {editing ? (
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{fontSize:14,color:'#6B7280'}}>$</span>
          <input autoFocus type="number" value={v} onChange={e=>setV(e.target.value)}
            onBlur={()=>{onChange(+v);setEditing(false)}}
            onKeyDown={e=>{if(e.key==='Enter'){onChange(+v);setEditing(false)}}}
            style={{width:'100%',border:'1px solid '+Y,borderRadius:7,padding:'6px 8px',fontSize:16,fontWeight:700,outline:'none',background:'#FFFBEB'}}/>
        </div>
      ) : (
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:20,fontWeight:800,color:'#111'}}>$ {value.toLocaleString()}</span>
          <button onClick={()=>setEditing(true)} style={{background:'none',border:'1px solid #E5E7EB',borderRadius:6,padding:'4px 10px',fontSize:11,cursor:'pointer',color:'#6B7280',display:'flex',alignItems:'center',gap:4}}>
            ✎ Edit
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Checklist logic ──────────────────────────────────────────────────────────
function useChecklist(a:Appraisal, valReviewed:boolean, dmgReviewed:boolean) {
  return {
    customerInfo:    !!(a.customer.name && a.customer.phone),
    vehicleInfo:     !!(a.vehicle.vin && a.vehicle.year && a.vehicle.make),
    photosUploaded:  false, // will be true once photo upload is wired
    valuesReviewed:  valReviewed,
    damageReviewed:  dmgReviewed,
    recommendations: a.recommendations.length > 0,
  }
}

// ─── Next Step Bar ────────────────────────────────────────────────────────────
function NextStepBar({checklist,allDone,onTabChange}:{checklist:Record<string,boolean>;allDone:boolean;onTabChange:(t:string)=>void}) {
  const STEPS: Record<string,{msg:string;tab:string;btn:string}> = {
    customerInfo:    {msg:'Add customer information',               tab:'vehicle',  btn:'Add Info'},
    vehicleInfo:     {msg:'Complete the vehicle details',           tab:'vehicle',  btn:'Edit Vehicle'},
    photosUploaded:  {msg:'Upload vehicle photos',                  tab:'photos',   btn:'Upload Photos'},
    valuesReviewed:  {msg:'Review and confirm the estimated values', tab:'values',  btn:'Review Values'},
    damageReviewed:  {msg:'Review detected damage',                 tab:'damage',   btn:'Review Damage'},
    recommendations: {msg:'Select protection products',             tab:'vehicle',  btn:'Select Products'},
  }
  const next = Object.entries(checklist).find(([,done])=>!done)
  if (allDone) return (
    <div style={{background:'#D1FAE5',borderBottom:'1px solid #A7F3D0',padding:'12px 28px',display:'flex',alignItems:'center',gap:10}}>
      <span style={{fontSize:18}}>✅</span>
      <span style={{fontSize:13,fontWeight:700,color:'#065F46'}}>Everything looks good — this appraisal is ready to send to the customer.</span>
    </div>
  )
  if (!next) return null
  const [key] = next; const step = STEPS[key]
  return (
    <div style={{background:'#FFFBEB',borderBottom:'1px solid #FDE68A',padding:'12px 28px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontSize:18}}>👉</span>
        <div>
          <span style={{fontSize:11,color:'#92400E',fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>Next Step</span>
          <div style={{fontSize:13,fontWeight:600,color:'#78350F',marginTop:1}}>{step.msg}</div>
        </div>
      </div>
      <button onClick={()=>onTabChange(step.tab)} style={{background:Y,border:'none',borderRadius:8,padding:'8px 16px',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
        {step.btn} →
      </button>
    </div>
  )
}

// ─── Ready Checklist ──────────────────────────────────────────────────────────
function ReadyChecklist({checklist,allDone}:{checklist:Record<string,boolean>;allDone:boolean}) {
  const LABELS: Record<string,string> = {
    customerInfo:'Customer info',vehicleInfo:'Vehicle info',photosUploaded:'Photos uploaded',
    valuesReviewed:'Values reviewed',damageReviewed:'Damage reviewed',recommendations:'Products selected',
  }
  const done = Object.values(checklist).filter(Boolean).length
  const total = Object.values(checklist).length
  return (
    <div style={{background:'#fff',border:`1px solid ${allDone?'#A7F3D0':'#E5E7EB'}`,borderRadius:12,padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:'#111'}}>{allDone?'✅ Ready to Send':'📋 Checklist'}</div>
        <div style={{fontSize:11,color:'#9CA3AF'}}>{done}/{total}</div>
      </div>
      {Object.entries(checklist).map(([key,isDone])=>(
        <div key={key} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <div style={{width:18,height:18,borderRadius:'50%',background:isDone?'#D1FAE5':'#F3F4F6',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <span style={{fontSize:10,color:isDone?'#059669':'#D1D5DB',fontWeight:700}}>{isDone?'✓':'○'}</span>
          </div>
          <span style={{fontSize:12,color:isDone?'#374151':'#9CA3AF',fontWeight:isDone?500:400}}>{LABELS[key]}</span>
        </div>
      ))}
    </div>
  )
}

// ─── SMS Modal ────────────────────────────────────────────────────────────────
function SMSModal({a,onClose,onSend}:{a:Appraisal;onClose:()=>void;onSend:()=>void}) {
  const msg = `Hi ${a.customer.name.split(' ')[0]}, your AutoLens Vehicle Report is ready.\n\nWe found a few items on your ${a.vehicle.year} ${a.vehicle.make} ${a.vehicle.model}:\n${a.issues.slice(0,3).map(i=>`• ${i.label}`).join('\n')}\n\nView your full report and protection options:\nautolens.ai/report/${a.id}\n\nReply STOP to opt out.`
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:16,padding:'28px',width:460,boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:17,fontWeight:800,color:'#111',marginBottom:4}}>Preview Text Message</div>
        <div style={{fontSize:12,color:'#9CA3AF',marginBottom:20}}>This is what {a.customer.name} will receive on their phone.</div>
        {/* Phone mockup */}
        <div style={{background:'#F3F4F6',borderRadius:20,padding:'20px 16px',marginBottom:20}}>
          <div style={{fontSize:11,color:'#9CA3AF',textAlign:'center',marginBottom:12}}>AutoLens · Text Message</div>
          <div style={{background:'#fff',borderRadius:16,borderBottomLeftRadius:4,padding:'12px 16px',fontSize:13,lineHeight:1.6,color:'#111',whiteSpace:'pre-wrap',boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
            {msg}
          </div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:'12px',borderRadius:10,border:'1px solid #E5E7EB',background:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',color:'#374151'}}>
            Cancel
          </button>
          <button onClick={onSend} style={{flex:2,padding:'12px',borderRadius:10,border:'none',background:Y,fontSize:13,fontWeight:700,cursor:'pointer'}}>
            📤 Send Now
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Customer Report Preview ──────────────────────────────────────────────────
function CustomerReportPreview({a}:{a:Appraisal}) {
  return (
    <div style={{maxWidth:520,margin:'0 auto',fontFamily:'Inter,sans-serif'}}>
      <div style={{fontSize:13,color:'#9CA3AF',marginBottom:4}}>Report #{a.id}</div>
      <div style={{fontSize:22,fontWeight:800,color:'#111',marginBottom:2}}>Hi {a.customer.name.split(' ')[0]},</div>
      <div style={{fontSize:15,color:'#374151',marginBottom:20}}>Here's your Vehicle Report — completed {a.createdAt}</div>

      {/* Hero card */}
      <div style={{background:DARK,borderRadius:14,padding:'20px 24px',marginBottom:20,color:'#fff'}}>
        <div style={{fontSize:13,color:'#9CA3AF',marginBottom:12}}>{a.vehicle.year} {a.vehicle.make} {a.vehicle.model} {a.vehicle.trim}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
          <div>
            <div style={{fontSize:10,color:'#6B7280',marginBottom:4}}>Estimated Value</div>
            <div style={{fontSize:24,fontWeight:900,color:Y}}>{fmt(a.estimatedValue)}</div>
          </div>
          <div>
            <div style={{fontSize:10,color:'#6B7280',marginBottom:4}}>Condition Score</div>
            <div style={{fontSize:24,fontWeight:900,color:a.conditionScore>=80?'#10B981':Y}}>{a.conditionScore}<span style={{fontSize:12,color:'#6B7280'}}>/100</span></div>
          </div>
          <div>
            <div style={{fontSize:10,color:'#6B7280',marginBottom:4}}>Odometer</div>
            <div style={{fontSize:22,fontWeight:800,color:'#fff'}}>{a.vehicle.mileage}</div>
            <div style={{fontSize:10,color:'#6B7280'}}>miles</div>
          </div>
        </div>
      </div>

      {/* Issues */}
      {a.issues.length > 0 && <>
        <div style={{fontSize:13,fontWeight:700,color:'#111',marginBottom:12}}>Detected Issues</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:20}}>
          {a.issues.slice(0,4).map(i=>(
            <div key={i.id} style={{background:'#F9FAFB',borderRadius:10,padding:'14px',border:'1px solid #F3F4F6'}}>
              <span style={{fontSize:10,background:SEV[i.severity].bg,color:SEV[i.severity].text,padding:'2px 7px',borderRadius:99,fontWeight:600}}>{SEV[i.severity].label}</span>
              <div style={{fontSize:13,fontWeight:600,color:'#111',marginTop:8}}>{i.label}</div>
              <div style={{fontSize:11,color:'#9CA3AF',marginTop:3}}>Est. ${i.repairLow}–${i.repairHigh}</div>
            </div>
          ))}
        </div>
      </>}

      {/* Recommendations */}
      {a.recommendations.length > 0 && <>
        <div style={{fontSize:13,fontWeight:700,color:'#111',marginBottom:12}}>Recommended Protections</div>
        <div style={{marginBottom:24}}>
          {PRODUCTS.filter(p=>a.recommendations.includes(p.id)).map(p=>(
            <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',background:'#F9FAFB',borderRadius:10,marginBottom:8,border:'1px solid #F3F4F6'}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:'#111'}}>{p.label}</div>
                <div style={{fontSize:11,color:'#9CA3AF',marginTop:2}}>{p.desc}</div>
              </div>
              <span style={{fontSize:11,color:Y,fontWeight:600,cursor:'pointer'}}>Learn more →</span>
            </div>
          ))}
        </div>
      </>}

      <button style={{width:'100%',padding:'14px',background:Y,border:'none',borderRadius:12,fontSize:14,fontWeight:800,cursor:'pointer',marginBottom:10}}>
        View Full Report Online
      </button>
      <button style={{width:'100%',padding:'14px',background:'#F3F4F6',border:'none',borderRadius:12,fontSize:14,fontWeight:600,cursor:'pointer',color:'#374151'}}>
        Contact Us With Questions
      </button>
    </div>
  )
}

// ─── Valuation Tab ────────────────────────────────────────────────────────────
function ValuationTab({valuation,setValuation}:{valuation:Record<ValCat,ValUpload|null>;setValuation:(fn:(p:Record<ValCat,ValUpload|null>)=>Record<ValCat,ValUpload|null>)=>void}) {
  const fileRefs = {book:useRef<HTMLInputElement>(null),mmr:useRef<HTMLInputElement>(null),retail:useRef<HTMLInputElement>(null)}
  const [drag,setDrag] = useState<ValCat|null>(null)
  const CARDS: {cat:ValCat;title:string;hint:string}[] = [
    {cat:'book',  title:'Book Values',    hint:'Upload KBB, Edmunds, Black Book screenshots'},
    {cat:'mmr',   title:'MMR / Wholesale',hint:'Upload Manheim MMR or auction comp screenshots'},
    {cat:'retail',title:'Retail Comps',   hint:'Upload clean and accident listing screenshots'},
  ]
  const handleFile = (cat:ValCat, file:File) => {
    const r = new FileReader()
    r.onload = e => {
      const preview = e.target?.result as string
      setValuation(p=>({...p,[cat]:{fileName:file.name,preview,parseStatus:'parsing',extracted:{}}}))
      setTimeout(()=>setValuation(p=>({...p,[cat]:{...p[cat]!,parseStatus:'parsed',extracted:{...FAKE_PARSE[cat]}}})),2200)
    }
    r.readAsDataURL(file)
  }
  const editCell = (cat:ValCat,key:string,val:string) =>
    setValuation(p=>({...p,[cat]:{...p[cat]!,extracted:{...p[cat]!.extracted,[key]:val}}}))

  return (
    <div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
        {CARDS.map(({cat,title,hint})=>{
          const d = valuation[cat]
          return (
            <div key={cat} style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:12,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
              <div style={{padding:'14px 16px',borderBottom:'1px solid #F3F4F6',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:'#111'}}>
                    {cat==='mmr'?<Tip id="mmr">{title}</Tip>:<Tip id="book">{title}</Tip>}
                  </div>
                  <div style={{fontSize:11,color:'#9CA3AF',marginTop:3}}>{hint}</div>
                </div>
                {d && <span style={{fontSize:10,padding:'2px 8px',borderRadius:99,fontWeight:600,flexShrink:0,marginLeft:8,background:d.parseStatus==='parsed'?'#D1FAE5':d.parseStatus==='parsing'?'#DBEAFE':'#F3F4F6',color:d.parseStatus==='parsed'?'#065F46':d.parseStatus==='parsing'?'#1D4ED8':'#6B7280'}}>{d.parseStatus==='parsed'?'Parsed':d.parseStatus==='parsing'?'Parsing…':'Pending'}</span>}
              </div>
              <div style={{padding:16}}>
                {!d ? (
                  <div onDragOver={e=>{e.preventDefault();setDrag(cat)}} onDragLeave={()=>setDrag(null)} onDrop={e=>{e.preventDefault();setDrag(null);const f=e.dataTransfer.files[0];if(f)handleFile(cat,f)}}
                    onClick={()=>fileRefs[cat].current?.click()}
                    style={{border:`2px dashed ${drag===cat?Y:'#D1D5DB'}`,borderRadius:10,padding:'28px 16px',textAlign:'center',cursor:'pointer',background:drag===cat?'#FFFBEB':'#FAFAFA'}}>
                    <div style={{fontSize:28,marginBottom:8}}>📤</div>
                    <div style={{fontSize:12,fontWeight:600,color:'#374151'}}>Drag & drop or click to upload</div>
                    <div style={{fontSize:11,color:'#9CA3AF',marginTop:4}}>PNG, JPG, PDF</div>
                  </div>
                ) : (
                  <div style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:12}}>
                    {d.preview&&<img src={d.preview} alt="" style={{width:72,height:52,objectFit:'cover',borderRadius:7,border:'1px solid #E5E7EB',flexShrink:0}}/>}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:500,color:'#374151',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.fileName}</div>
                      <button onClick={()=>fileRefs[cat].current?.click()} style={{marginTop:4,fontSize:11,color:Y,background:'none',border:'none',cursor:'pointer',padding:0,fontWeight:500}}>Replace</button>
                    </div>
                  </div>
                )}
                <input ref={fileRefs[cat]} type="file" accept="image/*,.pdf" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(cat,f)}}/>
                {d?.parseStatus==='parsing' && <div style={{display:'flex',alignItems:'center',gap:8,color:'#2563EB',fontSize:12,marginTop:8}}><span style={{width:13,height:13,border:'2px solid #BFDBFE',borderTopColor:'#2563EB',borderRadius:'50%',display:'inline-block',animation:'spin 0.8s linear infinite'}}/> Analyzing…</div>}
                {d?.parseStatus==='parsed' && (
                  <table style={{width:'100%',borderCollapse:'collapse',marginTop:4}}>
                    <tbody>
                      {Object.entries(d.extracted).map(([k,v])=>(
                        <tr key={k} style={{borderBottom:'1px solid #F3F4F6'}}>
                          <td style={{padding:'5px 0',fontSize:11,color:'#6B7280',width:'55%'}}>{k}</td>
                          <td style={{padding:'5px 0',fontSize:11,fontWeight:600,color:'#111'}}>
                            <InlineEdit value={v} onChange={nv=>editCell(cat,k,nv)}/>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InlineEdit({value,onChange}:{value:string;onChange:(v:string)=>void}) {
  const [editing,setEditing] = useState(false)
  const [v,setV] = useState(value)
  if (editing) return <input autoFocus value={v} onChange={e=>setV(e.target.value)} onBlur={()=>{onChange(v);setEditing(false)}} onKeyDown={e=>{if(e.key==='Enter'){onChange(v);setEditing(false)}}} style={{width:'100%',border:'1px solid '+Y,borderRadius:5,padding:'2px 6px',fontSize:11,fontWeight:600,outline:'none',background:'#FFFBEB'}}/>
  return <span onClick={()=>setEditing(true)} style={{cursor:'pointer',borderBottom:'1px dashed #D1D5DB'}} title="Click to edit">{v}</span>
}

// ─── Salesperson Wizard ───────────────────────────────────────────────────────
function SalespersonWizard({onDone}:{onDone:()=>void}) {
  const [step,setStep] = useState(0)
  const [form,setForm] = useState({name:'',phone:'',year:'',make:'',model:'',vin:''})
  const STEPS = ['Customer','Vehicle','Photos','Submit']
  const pct = Math.round((step/3)*100)

  const set = (k:string,v:string) => setForm(p=>({...p,[k]:v}))

  return (
    <div style={{minHeight:'100vh',background:DARK,display:'flex',flexDirection:'column'}}>
      {/* Header */}
      <div style={{padding:'20px 24px',borderBottom:'1px solid #1F2937',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <Logo size={18}/>
        <button onClick={onDone} style={{background:'none',border:'1px solid #374151',borderRadius:8,padding:'6px 14px',fontSize:12,color:'#9CA3AF',cursor:'pointer'}}>← Back to Dashboard</button>
      </div>

      {/* Progress */}
      <div style={{padding:'20px 24px 0'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          {STEPS.map((s,i)=>(
            <div key={s} style={{display:'flex',alignItems:'center',gap:8,flex:i<STEPS.length-1?1:undefined}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:i<step?Y:i===step?Y:'#1F2937',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:i<=step?'#111':'#4B5563',flexShrink:0}}>
                {i<step?'✓':i+1}
              </div>
              <span style={{fontSize:12,fontWeight:i===step?700:400,color:i===step?'#fff':'#4B5563'}}>{s}</span>
              {i<STEPS.length-1&&<div style={{flex:1,height:1,background:i<step?Y:'#1F2937',margin:'0 8px'}}/>}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div style={{flex:1,padding:'32px 24px',maxWidth:520,margin:'0 auto',width:'100%',boxSizing:'border-box'}}>

        {step===0 && <div>
          <div style={{fontSize:24,fontWeight:800,color:'#fff',marginBottom:6}}>Customer Info</div>
          <div style={{fontSize:14,color:'#6B7280',marginBottom:28}}>Who are you helping today?</div>
          <Field label="Customer Name" value={form.name} onChange={v=>set('name',v)} placeholder="John Smith"/>
          <Field label="Phone Number" value={form.phone} onChange={v=>set('phone',v)} placeholder="(555) 000-0000"/>
          <div style={{display:'flex',gap:10,marginTop:8}}>
            <button onClick={()=>setStep(1)} disabled={!form.name||!form.phone}
              style={{flex:1,padding:'16px',background:form.name&&form.phone?Y:'#1F2937',border:'none',borderRadius:12,fontSize:15,fontWeight:700,cursor:form.name&&form.phone?'pointer':'not-allowed',color:form.name&&form.phone?'#111':'#374151'}}>
              Continue →
            </button>
          </div>
        </div>}

        {step===1 && <div>
          <div style={{fontSize:24,fontWeight:800,color:'#fff',marginBottom:6}}>Vehicle Details</div>
          <div style={{fontSize:14,color:'#6B7280',marginBottom:28}}>Enter the vehicle information</div>
          <Field label="Year" value={form.year} onChange={v=>set('year',v)} placeholder="2022"/>
          <Field label="Make" value={form.make} onChange={v=>set('make',v)} placeholder="Land Rover"/>
          <Field label="Model" value={form.model} onChange={v=>set('model',v)} placeholder="Range Rover Sport"/>
          <Field label="VIN (optional)" value={form.vin} onChange={v=>set('vin',v)} placeholder="Scan or type VIN"/>
          <div style={{display:'flex',gap:10,marginTop:8}}>
            <button onClick={()=>setStep(0)} style={{padding:'16px 20px',background:'none',border:'1px solid #374151',borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer',color:'#9CA3AF'}}>← Back</button>
            <button onClick={()=>setStep(2)} disabled={!form.year||!form.make||!form.model}
              style={{flex:1,padding:'16px',background:form.year&&form.make&&form.model?Y:'#1F2937',border:'none',borderRadius:12,fontSize:15,fontWeight:700,cursor:form.year&&form.make&&form.model?'pointer':'not-allowed',color:form.year&&form.make&&form.model?'#111':'#374151'}}>
              Continue →
            </button>
          </div>
        </div>}

        {step===2 && <div>
          <div style={{fontSize:24,fontWeight:800,color:'#fff',marginBottom:6}}>Take Photos</div>
          <div style={{fontSize:14,color:'#6B7280',marginBottom:24}}>Walk around the vehicle and capture each angle.</div>
          {['Front','Front Left','Front Right','Rear','Left Side','Right Side','Interior','Damage (if any)'].map(angle=>(
            <div key={angle} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#1F2937',borderRadius:12,padding:'16px 20px',marginBottom:10}}>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:'#fff'}}>{angle}</div>
                <div style={{fontSize:11,color:'#4B5563',marginTop:2}}>Tap to capture</div>
              </div>
              <button style={{background:'#374151',border:'none',borderRadius:10,padding:'10px 16px',fontSize:12,fontWeight:600,cursor:'pointer',color:'#9CA3AF'}}>
                📷 Take Photo
              </button>
            </div>
          ))}
          <div style={{display:'flex',gap:10,marginTop:16}}>
            <button onClick={()=>setStep(1)} style={{padding:'16px 20px',background:'none',border:'1px solid #374151',borderRadius:12,fontSize:15,fontWeight:600,cursor:'pointer',color:'#9CA3AF'}}>← Back</button>
            <button onClick={()=>setStep(3)} style={{flex:1,padding:'16px',background:Y,border:'none',borderRadius:12,fontSize:15,fontWeight:700,cursor:'pointer'}}>Continue →</button>
          </div>
          <button onClick={()=>setStep(3)} style={{width:'100%',marginTop:10,padding:'12px',background:'none',border:'none',fontSize:12,color:'#4B5563',cursor:'pointer'}}>Skip photos for now</button>
        </div>}

        {step===3 && <div style={{textAlign:'center'}}>
          <div style={{fontSize:48,marginBottom:16}}>✅</div>
          <div style={{fontSize:26,fontWeight:800,color:'#fff',marginBottom:8}}>Submitted to Manager</div>
          <div style={{fontSize:14,color:'#6B7280',marginBottom:32,lineHeight:1.6}}>
            The appraisal for <strong style={{color:'#fff'}}>{form.name}</strong>'s {form.year} {form.make} {form.model} has been sent for review. You'll get a notification when it's ready.
          </div>
          <button onClick={onDone} style={{width:'100%',padding:'16px',background:Y,border:'none',borderRadius:12,fontSize:15,fontWeight:700,cursor:'pointer'}}>
            Back to Dashboard
          </button>
          <button onClick={()=>{setStep(0);setForm({name:'',phone:'',year:'',make:'',model:'',vin:''})}} style={{width:'100%',marginTop:10,padding:'14px',background:'none',border:'1px solid #374151',borderRadius:12,fontSize:14,fontWeight:600,cursor:'pointer',color:'#9CA3AF'}}>
            Start Another Appraisal
          </button>
        </div>}
      </div>
    </div>
  )
}

function Field({label,value,onChange,placeholder}:{label:string;value:string;onChange:(v:string)=>void;placeholder:string}) {
  return (
    <div style={{marginBottom:16}}>
      <label style={{fontSize:12,fontWeight:600,color:'#9CA3AF',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>{label}</label>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:'100%',background:'#1F2937',border:'1px solid #374151',borderRadius:10,padding:'14px 16px',fontSize:15,color:'#fff',outline:'none',boxSizing:'border-box'}}/>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Page() {
  const [view,setView]               = useState<View>('manager')
  const [appraisals,setAppraisals]   = useState<Appraisal[]>(SEED)
  const [selectedId,setSelectedId]   = useState('84291')
  const [activeNav,setActiveNav]     = useState('Appraisals')
  const [activeTab,setActiveTab]     = useState('photos')
  const [valReviewed,setValReviewed] = useState(false)
  const [dmgReviewed,setDmgReviewed] = useState(false)
  const [showSMS,setShowSMS]         = useState(false)
  const [valuation,setValuation]     = useState<Record<ValCat,ValUpload|null>>({book:null,mmr:null,retail:null})

  const a = appraisals.find(x=>x.id===selectedId)!
  const upd = (id:string,ch:Partial<Appraisal>) => setAppraisals(p=>p.map(x=>x.id===id?{...x,...ch}:x))
  const checklist = useChecklist(a,valReviewed,dmgReviewed)
  const allDone = Object.values(checklist).every(Boolean)

  if (view==='salesperson') return <SalespersonWizard onDone={()=>setView('manager')}/>

  const TABS = [
    {k:'photos',    l:'Photos'},
    {k:'values',    l:'Values'},
    {k:'damage',    l:'Damage'},
    {k:'vehicle',   l:'Vehicle Info'},
    {k:'notes',     l:'Notes'},
    {k:'report',    l:'Customer Report'},
  ]

  return (
    <div style={{display:'flex',height:'100vh',fontFamily:'Inter,-apple-system,sans-serif',overflow:'hidden'}}>
      {showSMS && <SMSModal a={a} onClose={()=>setShowSMS(false)} onSend={()=>{upd(a.id,{status:'sent'});setShowSMS(false)}}/>}

      {/* Sidebar */}
      <div style={{width:200,background:DARK,display:'flex',flexDirection:'column',flexShrink:0}}>
        <div style={{padding:'22px 20px 18px',borderBottom:'1px solid #1F2937'}}>
          <Logo size={18}/>
        </div>
        <nav style={{padding:'10px 8px',flex:1}}>
          <div onClick={()=>setView('salesperson')} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',borderRadius:8,marginBottom:2,cursor:'pointer',background:Y,color:'#111',fontSize:12,fontWeight:700,marginBottom:12}}>
            <span>📷</span> New Appraisal
          </div>
          {NAV_ITEMS.map(label=>{
            const active = activeNav===label
            return (
              <div key={label} onClick={()=>setActiveNav(label)} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',borderRadius:8,marginBottom:2,cursor:'pointer',background:active?'#1F2937':'transparent',color:active?'#fff':'#6B7280',fontSize:13,fontWeight:active?600:400}}>
                {label}
              </div>
            )
          })}
        </nav>
      </div>

      {/* Queue */}
      <div style={{width:260,background:'#F9FAFB',borderRight:'1px solid #E5E7EB',display:'flex',flexDirection:'column',flexShrink:0}}>
        <div style={{padding:'18px 16px 12px',borderBottom:'1px solid #E5E7EB',background:'#fff'}}>
          <div style={{fontSize:15,fontWeight:700,color:'#111',marginBottom:3}}>Appraisals</div>
          <div style={{fontSize:11,color:'#9CA3AF'}}>{appraisals.filter(x=>x.status==='needs_review').length} need review</div>
        </div>
        <div style={{overflowY:'auto',flex:1,padding:'10px 8px'}}>
          {appraisals.map(x=>{
            const s=STAT[x.status]; const sel=x.id===selectedId
            return (
              <div key={x.id} onClick={()=>{setSelectedId(x.id);setValReviewed(false);setDmgReviewed(false);setActiveTab('photos');setValuation({book:null,mmr:null,retail:null})}}
                style={{background:'#fff',border:`2px solid ${sel?Y:'#E5E7EB'}`,borderRadius:10,padding:'14px',marginBottom:8,cursor:'pointer'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#111'}}>{x.customer.name}</div>
                  <span style={{fontSize:9,background:s.bg,color:s.text,padding:'2px 7px',borderRadius:99,fontWeight:600,marginLeft:6,whiteSpace:'nowrap'}}>{s.label}</span>
                </div>
                <div style={{fontSize:11,color:'#6B7280'}}>{x.vehicle.year} {x.vehicle.make} {x.vehicle.model}</div>
                <div style={{fontSize:11,color:'#9CA3AF',marginTop:2}}>{x.createdAt}</div>
                {x.estimatedValue>0&&<div style={{fontSize:13,fontWeight:700,color:Y,marginTop:6}}>{fmt(x.estimatedValue)}</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail */}
      <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>

        {/* Header */}
        <div style={{padding:'16px 24px',borderBottom:'1px solid #F3F4F6',background:'#fff',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div>
              <div style={{fontSize:11,color:'#9CA3AF',marginBottom:2}}>Appraisal #{a.id} · {a.createdAt}</div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{fontSize:18,fontWeight:800,color:'#111'}}>{a.customer.name} — {a.vehicle.year} {a.vehicle.make} {a.vehicle.model}</div>
                <span style={{fontSize:10,padding:'3px 10px',borderRadius:99,fontWeight:600,background:STAT[a.status].bg,color:STAT[a.status].text}}>{STAT[a.status].label}</span>
              </div>
            </div>
          </div>
          <button onClick={()=>setShowSMS(true)} disabled={!allDone}
            style={{padding:'10px 22px',borderRadius:10,border:'none',background:allDone?Y:'#F3F4F6',fontSize:13,fontWeight:700,cursor:allDone?'pointer':'not-allowed',color:allDone?'#111':'#9CA3AF',transition:'all 0.2s'}}>
            📤 Send to Customer {!allDone&&'(checklist incomplete)'}
          </button>
        </div>

        {/* Next Step Bar */}
        <NextStepBar checklist={checklist} allDone={allDone} onTabChange={setActiveTab}/>

        {/* Main content area */}
        <div style={{flex:1,overflow:'hidden',display:'flex'}}>

          {/* Tabs + content */}
          <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>

            {/* Value cards */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
              <div style={{background:'#fff',borderRadius:12,padding:'16px',border:'1px solid #E5E7EB',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
                <div style={{fontSize:10,color:'#9CA3AF',marginBottom:10}}>Estimated Value</div>
                <div style={{fontSize:26,fontWeight:900,color:'#111',lineHeight:1}}>{fmt(a.estimatedValue)}</div>
                <div style={{fontSize:11,color:'#10B981',marginTop:6,fontWeight:500}}>● High confidence</div>
              </div>
              <div style={{background:'#fff',borderRadius:12,padding:'16px',border:'1px solid #E5E7EB',boxShadow:'0 1px 4px rgba(0,0,0,0.05)',display:'flex',flexDirection:'column',alignItems:'center'}}>
                <div style={{fontSize:10,color:'#9CA3AF',marginBottom:4,alignSelf:'flex-start'}}><Tip id="condition">Condition Score</Tip></div>
                <ConditionGauge score={a.conditionScore}/>
              </div>
              <div style={{background:'#fff',borderRadius:12,padding:'16px',border:'1px solid #E5E7EB',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
                <div style={{fontSize:10,color:'#9CA3AF',marginBottom:10}}>Issues Found</div>
                <div style={{fontSize:26,fontWeight:900,color:a.issues.length>0?'#D97706':'#10B981',lineHeight:1}}>{a.issues.length}</div>
                <div style={{fontSize:11,color:'#6B7280',marginTop:6}}>{a.issues.filter(i=>i.severity==='high').length} high severity</div>
              </div>
              <div style={{background:'#fff',borderRadius:12,padding:'16px',border:'1px solid #E5E7EB',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
                <div style={{fontSize:10,color:'#9CA3AF',marginBottom:10}}>Products Selected</div>
                <div style={{fontSize:26,fontWeight:900,color:'#111',lineHeight:1}}>{a.recommendations.length}</div>
                <div style={{fontSize:11,color:'#6B7280',marginTop:6}}>of {PRODUCTS.length} available</div>
              </div>
            </div>

            {/* Tab bar */}
            <div style={{display:'flex',borderBottom:'2px solid #F3F4F6',marginBottom:20,overflowX:'auto'}}>
              {TABS.map(({k,l})=>(
                <button key={k} onClick={()=>setActiveTab(k)} style={{padding:'10px 16px',border:'none',background:'none',whiteSpace:'nowrap',fontSize:13,fontWeight:activeTab===k?700:400,cursor:'pointer',color:activeTab===k?'#111':'#9CA3AF',borderBottom:`2px solid ${activeTab===k?Y:'transparent'}`,marginBottom:-2}}>
                  {l}
                </button>
              ))}
            </div>

            {/* Photos */}
            {activeTab==='photos' && (
              <div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
                  {['Front','Front Left','Front Right','Rear','Rear Left','Rear Right','Left Side','Right Side','Interior','Engine','Odometer'].map(lbl=>(
                    <div key={lbl} style={{background:'#F9FAFB',borderRadius:10,aspectRatio:'4/3',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,cursor:'pointer',border:'2px dashed #E5E7EB'}}>
                      <span style={{fontSize:24}}>📷</span>
                      <span style={{fontSize:10,color:'#9CA3AF',textAlign:'center'}}>{lbl}</span>
                    </div>
                  ))}
                  <div style={{background:'#F9FAFB',borderRadius:10,aspectRatio:'4/3',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,cursor:'pointer',border:'2px dashed '+Y}}>
                    <span style={{fontSize:24}}>+</span>
                    <span style={{fontSize:10,color:Y,fontWeight:600}}>Add Photo</span>
                  </div>
                </div>
                <div style={{marginTop:16,padding:'14px 16px',background:'#FFFBEB',borderRadius:10,border:'1px solid #FDE68A',fontSize:12,color:'#92400E'}}>
                  📷 No photos uploaded yet — photos help build customer confidence in the report.
                </div>
              </div>
            )}

            {/* Values */}
            {activeTab==='values' && (
              <div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:20}}>
                  <EditableValue label="Retail Value" tipId="retail" value={a.values.retail} onChange={v=>upd(a.id,{values:{...a.values,retail:v}})}/>
                  <EditableValue label="Trade-In Value" tipId="trade" value={a.values.trade} onChange={v=>upd(a.id,{values:{...a.values,trade:v}})}/>
                  <EditableValue label="Wholesale Value" tipId="wholesale" value={a.values.wholesale} onChange={v=>upd(a.id,{values:{...a.values,wholesale:v}})}/>
                </div>
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#111',marginBottom:12}}>
                    <Tip id="book">Upload Book Value Screenshots</Tip>
                    <span style={{fontSize:11,color:'#9CA3AF',fontWeight:400,marginLeft:8}}>Upload KBB, Edmunds, MMR, or other sources</span>
                  </div>
                  <ValuationTab valuation={valuation} setValuation={setValuation}/>
                </div>
                {!valReviewed && (
                  <button onClick={()=>setValReviewed(true)} style={{width:'100%',padding:'14px',background:Y,border:'none',borderRadius:12,fontSize:14,fontWeight:700,cursor:'pointer',marginTop:8}}>
                    ✓ Mark Values as Reviewed
                  </button>
                )}
                {valReviewed && <div style={{padding:'12px 16px',background:'#D1FAE5',borderRadius:10,fontSize:13,fontWeight:600,color:'#065F46',textAlign:'center'}}>✅ Values reviewed</div>}
              </div>
            )}

            {/* Damage */}
            {activeTab==='damage' && (
              <div>
                {a.issues.length===0 ? (
                  <div style={{padding:'32px',textAlign:'center',background:'#F9FAFB',borderRadius:12,border:'2px dashed #E5E7EB'}}>
                    <div style={{fontSize:32,marginBottom:8}}>✅</div>
                    <div style={{fontSize:15,fontWeight:700,color:'#111',marginBottom:4}}>No damage detected yet</div>
                    <div style={{fontSize:12,color:'#9CA3AF'}}>Issues will appear here once photos are analyzed</div>
                  </div>
                ) : (
                  <div style={{marginBottom:16}}>
                    {a.issues.map(i=>(
                      <div key={i.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 18px',background:'#F9FAFB',borderRadius:12,marginBottom:10,border:'1px solid #F3F4F6'}}>
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:'#111'}}>{i.label}</div>
                          <div style={{fontSize:12,color:'#6B7280',marginTop:3}}>Estimated repair: ${i.repairLow.toLocaleString()} – ${i.repairHigh.toLocaleString()}</div>
                        </div>
                        <span style={{fontSize:11,background:SEV[i.severity].bg,color:SEV[i.severity].text,padding:'4px 12px',borderRadius:99,fontWeight:700}}>{SEV[i.severity].label}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!dmgReviewed && (
                  <button onClick={()=>setDmgReviewed(true)} style={{width:'100%',padding:'14px',background:Y,border:'none',borderRadius:12,fontSize:14,fontWeight:700,cursor:'pointer'}}>
                    ✓ Mark Damage as Reviewed
                  </button>
                )}
                {dmgReviewed && <div style={{padding:'12px 16px',background:'#D1FAE5',borderRadius:10,fontSize:13,fontWeight:600,color:'#065F46',textAlign:'center'}}>✅ Damage reviewed</div>}
              </div>
            )}

            {/* Vehicle Info */}
            {activeTab==='vehicle' && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                {[['Year',a.vehicle.year],['Make',a.vehicle.make],['Model',a.vehicle.model],['Trim',a.vehicle.trim],['VIN',a.vehicle.vin],['Mileage',a.vehicle.mileage+' mi'],['Color',a.vehicle.color]].map(([l,v])=>(
                  <div key={l} style={{padding:'14px 16px',background:'#F9FAFB',borderRadius:10,border:'1px solid #F3F4F6',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontSize:10,color:'#9CA3AF',marginBottom:4,fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>{l}</div>
                      <div style={{fontSize:14,fontWeight:700,color:'#111'}}>{v||'—'}</div>
                    </div>
                    <button style={{background:'none',border:'1px solid #E5E7EB',borderRadius:6,padding:'4px 10px',fontSize:11,cursor:'pointer',color:'#6B7280'}}>✎ Edit</button>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            {activeTab==='notes' && (
              <div>
                <textarea defaultValue={a.notes} placeholder="Add internal notes visible only to your team..."
                  style={{width:'100%',minHeight:160,border:'1px solid #E5E7EB',borderRadius:12,padding:'16px',fontSize:14,color:'#374151',resize:'vertical',outline:'none',boxSizing:'border-box',lineHeight:1.6}}/>
                <button style={{marginTop:8,padding:'10px 20px',background:Y,border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer'}}>Save Notes</button>
              </div>
            )}

            {/* Customer Report preview */}
            {activeTab==='report' && (
              <div>
                <div style={{padding:'12px 16px',background:'#FFFBEB',borderRadius:10,border:'1px solid #FDE68A',fontSize:12,color:'#92400E',marginBottom:20,display:'flex',alignItems:'center',gap:8}}>
                  👁 <strong>Preview only</strong> — this is exactly what the customer will see when you hit Send.
                </div>
                <CustomerReportPreview a={a}/>
              </div>
            )}
          </div>

          {/* Right sidebar — checklist + recommendations */}
          <div style={{width:240,borderLeft:'1px solid #F3F4F6',padding:'20px 16px',overflowY:'auto',flexShrink:0,background:'#FAFAFA'}}>
            <ReadyChecklist checklist={checklist} allDone={allDone}/>

            {/* Recommendations */}
            <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:12,padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
              <div style={{fontSize:12,fontWeight:700,color:'#111',marginBottom:12}}>Protection Products</div>
              {a.recommendations.length===0 && <div style={{fontSize:11,color:'#9CA3AF',marginBottom:12,fontStyle:'italic'}}>No products selected yet</div>}
              {PRODUCTS.map(p=>{
                const checked = a.recommendations.includes(p.id)
                return (
                  <div key={p.id} onClick={()=>{const recs=checked?a.recommendations.filter(r=>r!==p.id):[...a.recommendations,p.id];upd(a.id,{recommendations:recs})}}
                    style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:12,cursor:'pointer'}}>
                    <div style={{width:18,height:18,borderRadius:5,background:checked?Y:'#F3F4F6',border:`1px solid ${checked?Y:'#D1D5DB'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
                      {checked&&<svg width={10} height={10} viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#111" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:'#111',lineHeight:1.3}}>{p.label}</div>
                      <div style={{fontSize:10,color:'#9CA3AF',marginTop:1}}>{p.desc}</div>
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
