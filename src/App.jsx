import { useState, useCallback, useRef, useEffect } from "react";
import JSZip from "jszip";

// ─── Global styles ────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Space+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #050508;
    --surface: #0d0d14;
    --border: #1a1a28;
    --border-bright: #2a2a40;
    --text: #e2ddd6;
    --muted: #6b6580;
    --faint: #2a2535;
    --gold: #d4a843;
    --gold-dim: #8a6a20;
    --gold-glow: rgba(212,168,67,0.15);
    --teal: #3dd6c8;
    --teal-dim: #1a7a72;
    --rose: #e86060;
    --green: #5dd68a;
    --amber: #e8a840;
  }
  body { background: var(--bg); color: var(--text); font-family: 'Space Mono', monospace; overflow-x: hidden; }
  ::selection { background: var(--gold-glow); }
  .serif { font-family: 'Playfair Display', Georgia, serif; }

  body::before {
    content: '';
    position: fixed; inset: 0; z-index: 9999; pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
    opacity: 0.4;
  }

  @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
  @keyframes glowPulse { 0%,100% { box-shadow: 0 0 20px var(--gold-glow); } 50% { box-shadow: 0 0 40px rgba(212,168,67,0.3); } }

  .animate-fade-up   { animation: fadeUp 0.7s ease forwards; }
  .animate-fade-up-1 { animation: fadeUp 0.7s 0.1s ease forwards; opacity:0; }
  .animate-fade-up-2 { animation: fadeUp 0.7s 0.2s ease forwards; opacity:0; }
  .animate-fade-up-3 { animation: fadeUp 0.7s 0.3s ease forwards; opacity:0; }
  .animate-fade-up-4 { animation: fadeUp 0.7s 0.4s ease forwards; opacity:0; }
  .animate-fade-up-5 { animation: fadeUp 0.7s 0.5s ease forwards; opacity:0; }
  .animate-fade-up-6 { animation: fadeUp 0.7s 0.6s ease forwards; opacity:0; }
  .animate-fade-up-7 { animation: fadeUp 0.7s 0.7s ease forwards; opacity:0; }

  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 1px; position: relative; overflow: hidden; }
  .card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--gold-dim),transparent); }

  .drop-zone { border: 1px dashed var(--border-bright); cursor: pointer; transition: all 0.3s; }
  .drop-zone:hover, .drop-zone.over { border-color: var(--gold); background: var(--gold-glow); }
  .drop-zone:hover .upload-icon { transform: translateY(-4px); color: var(--gold); }
  .upload-icon { transition: all 0.3s; color: var(--muted); }

  .btn-primary { background: var(--gold); color: var(--bg); border: none; padding: 14px 40px; font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.15em; cursor: pointer; transition: all 0.2s; text-decoration: none; display: inline-block; }
  .btn-primary:hover { background: #e8c060; transform: translateY(-1px); box-shadow: 0 8px 32px rgba(212,168,67,0.3); }

  .btn-ghost { background: transparent; color: var(--muted); border: 1px solid var(--border-bright); padding: 10px 24px; font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.15em; cursor: pointer; transition: all 0.2s; }
  .btn-ghost:hover { border-color: var(--gold); color: var(--gold); }

  .tab { padding: 10px 20px; font-size: 10px; letter-spacing: 0.12em; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; color: var(--muted); background: none; border-top: none; border-left: none; border-right: none; font-family: 'Space Mono', monospace; }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--gold); border-bottom-color: var(--gold); }

  .hex-score { filter: drop-shadow(0 0 24px rgba(212,168,67,0.4)); }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border-bright); }
`;

// ─── Data classification ──────────────────────────────────────────────────────
const INDUSTRY_MAP = {
  "Tech & Engineering": ["software","engineer","developer","product manager","cto","technical","data scientist","data engineer","ai ","machine learning","cloud","devops","saas","tech ","digital","cyber","it ","fullstack","frontend","backend","platform","infrastructure","programmer","architect"],
  "HR & People": ["hr ","human resources","people","talent","recruitment","recruiter","culture","l&d","organisational","organizational","wellbeing","people ops","hrbp","chief people","people director"],
  "EX / OD / L&D": ["employee experience","ex ","organisational development","od ","learning","leadership development","executive coach","facilitator","trainer","coach","coaching"],
  "Consulting & Strategy": ["consultant","consulting","strategy","strategist","advisory","advisor","transformation","change management","programme director"],
  "Marketing & Growth": ["marketing","brand","content","social media","communications","pr ","public relations","copywriter","seo","growth","demand gen","cmo"],
  "Finance & Investment": ["finance","financial","cfo","accountant","accounting","investment","banking","analyst","equity","venture","cpa","audit","treasury","risk","compliance"],
  "Sales & Revenue": ["sales","account executive","business development","revenue","account manager","bdr","sdr","commercial","partnerships"],
  "Executive & C-Suite": ["ceo","coo","chief","managing director","chairman","board","non-exec","general manager","country manager","founder","co-founder","president","owner"],
  "Healthcare & Science": ["healthcare","medical","clinical","nurse","doctor","physician","health","pharma","hospital","biotech"],
  "Education & Academia": ["education","teacher","lecturer","professor","academic","university","school","dean","principal"],
};

const SENIORITY_MAP = [
  { label: "C-Suite & Founder", re: /(ceo|coo|cto|cfo|chief|founder|co-founder|president|owner|chairman|managing director)/i },
  { label: "VP & Director",     re: /(vp |vice president|svp|evp|\bdirector\b|head of)/i },
  { label: "Manager & Senior",  re: /(manager|\blead\b|principal|senior|sr\.)/i },
  { label: "Mid-Level",         re: /(specialist|consultant|analyst|engineer|designer|coordinator|advisor)/i },
  { label: "Early Career",      re: /(junior|associate|assistant|intern|graduate|entry|trainee)/i },
];

function classifyIndustry(title = "", company = "") {
  const text = (title + " " + company).toLowerCase();
  for (const [ind, kws] of Object.entries(INDUSTRY_MAP)) {
    if (kws.some(k => text.includes(k))) return ind;
  }
  return "Other";
}

function classifySeniority(title = "") {
  for (const { label, re } of SENIORITY_MAP) {
    if (re.test(title)) return label;
  }
  return "Individual Contributor";
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headerIdx = lines.findIndex(l => /first.?name|connected.?on|position/i.test(l));
  const start = headerIdx >= 0 ? headerIdx : 0;
  const headers = lines[start].split(",").map(h => h.replace(/"/g, "").trim());
  return lines.slice(start + 1).map(line => {
    const vals = []; let cur = ""; let inQ = false;
    for (const c of line) {
      if (c === '"') inQ = !inQ;
      else if (c === ',' && !inQ) { vals.push(cur.trim()); cur = ""; }
      else cur += c;
    }
    vals.push(cur.trim());
    const o = {};
    headers.forEach((h, i) => o[h] = (vals[i] || "").replace(/"/g, "").trim());
    return o;
  });
}

function analyseConnections(rows) {
  const now = new Date();
  const industries = {}, seniorities = {}, yearMap = {}, monthMap = {}, companies = {};

  rows.forEach(r => {
    const title   = r["Position"] || r["Job Title"] || r["Title"] || "";
    const company = r["Company"]  || r["Organization"] || "";
    const dateStr = r["Connected On"] || r["Date Connected"] || "";

    const ind = classifyIndustry(title, company);
    const sen = classifySeniority(title);
    industries[ind] = (industries[ind] || 0) + 1;
    seniorities[sen] = (seniorities[sen] || 0) + 1;
    if (company) companies[company] = (companies[company] || 0) + 1;

    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d)) {
        const yr = d.getFullYear();
        yearMap[yr] = (yearMap[yr] || 0) + 1;
        const mk = `${yr}-${String(d.getMonth()+1).padStart(2,"0")}`;
        monthMap[mk] = (monthMap[mk] || 0) + 1;
      }
    }
  });

  const total = rows.length;
  const topInd = Object.entries(industries).sort((a,b) => b[1]-a[1]);
  const concentration = topInd[0] ? Math.round((topInd[0][1]/total)*100) : 0;

  // Growth
  const mths = (offset) => Array.from({length:12},(_,i)=>{
    const d = new Date(now.getFullYear(), now.getMonth()-offset-i, 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  });
  const recent12 = mths(0).reduce((s,k)=>s+(monthMap[k]||0),0);
  const prev12   = mths(12).reduce((s,k)=>s+(monthMap[k]||0),0);
  const growthPct = prev12>0 ? Math.round(((recent12-prev12)/prev12)*100) : null;

  const execCount  = (seniorities["C-Suite & Founder"]||0) + (seniorities["VP & Director"]||0);
  const execPct    = Math.round((execCount/total)*100);
  const sortedYrs  = Object.keys(yearMap).sort();
  const firstYear  = parseInt(sortedYrs[0]) || now.getFullYear();
  const networkAge = now.getFullYear() - firstYear;
  const topCompanies = Object.entries(companies).sort((a,b)=>b[1]-a[1]).slice(0,8);

  // Timeline last 24 months
  const last24 = [];
  for (let i=23;i>=0;i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    last24.push({ month: k, added: monthMap[k]||0 });
  }

  // Score
  let score = 45;
  if (total>1000) score+=12; else if (total>500) score+=8; else if (total>200) score+=4;
  if (concentration<35) score+=15; else if (concentration<50) score+=8; else if (concentration<65) score+=3;
  if (execPct>25) score+=12; else if (execPct>15) score+=6; else if (execPct>8) score+=3;
  if (recent12>30) score+=10; else if (recent12>15) score+=5;
  if (Object.keys(industries).length>=7) score+=6; else if (Object.keys(industries).length>=5) score+=3;
  score = Math.min(97, Math.max(18, score));

  // Gaps
  const gaps = Object.keys(INDUSTRY_MAP).filter(ind => !industries[ind] || industries[ind]<3);

  // Insights
  const insights = [];
  if (concentration>65) insights.push({type:"warning", headline:"High concentration risk", body:`${concentration}% of your network sits in ${topInd[0][0]}. A single-sector network is fragile — and limits your reach.`});
  else if (concentration<35) insights.push({type:"positive", headline:"Well diversified", body:`No single industry dominates your network. You have genuine cross-sector reach — a real strategic asset.`});
  else insights.push({type:"neutral", headline:"Moderate concentration", body:`${topInd[0][0]} leads at ${concentration}%. Healthy, but worth asking if that's by design or default.`});

  if (execPct<10) insights.push({type:"warning", headline:"Thin at the top", body:`Only ${execPct}% of connections are C-Suite or VP level. Senior relationships compound — they refer, champion, and open doors disproportionately.`});
  else if (execPct>25) insights.push({type:"positive", headline:"Strong senior reach", body:`${execPct}% of your network is C-Suite or VP — well above average. You have the relationships that move things.`});
  else insights.push({type:"neutral", headline:"Mixed seniority", body:`${execPct}% executive-level connections. Building more senior relationships would increase leverage significantly.`});

  if (growthPct!==null && growthPct<-25) insights.push({type:"warning", headline:"Network momentum stalling", body:`Connection rate down ${Math.abs(growthPct)}% year-on-year. Your network may be plateauing just as your audience needs to grow.`});
  else if (growthPct!==null && growthPct>30) insights.push({type:"positive", headline:"Strong momentum", body:`Up ${growthPct}% on last year. You're in a building phase — the compounding effects will show in 12–18 months.`});
  else insights.push({type:"neutral", headline:"Steady growth", body:`${recent12} new connections in the last year. ${growthPct!==null ? `${growthPct>0?"+":""}${growthPct}% vs the prior year.` : ""}`});

  if (gaps.length>0) insights.push({type:"neutral", headline:"Structural gaps", body:`Near-zero presence in: ${gaps.slice(0,3).join(", ")}. Whether these matter depends on your goals — but blind spots are worth naming.`});

  return { total, industries, seniorities, yearMap, monthMap, last24, topInd, topCompanies, concentration, networkAge, firstYear, execPct, recent12, prev12, growthPct, score, insights, gaps };
}

function analyseAds(rows) {
  return rows.flatMap(r => Object.values(r)).join(";").split(/[;,]/).map(s=>s.trim().replace(/"/g,"")).filter(s=>s.length>2 && s.length<60 && !/^\d+$/.test(s)).slice(0,50);
}

function analyseMessages(rows) {
  const senders = {};
  rows.forEach(r => { const f = r["FROM"]||r["Sender"]||""; if(f) senders[f]=(senders[f]||0)+1; });
  return { total: rows.length, uniquePeople: Object.keys(senders).length, topConversations: Object.entries(senders).sort((a,b)=>b[1]-a[1]).slice(0,5) };
}

// ─── Colours ──────────────────────────────────────────────────────────────────
const IND_COLORS = ["#d4a843","#3dd6c8","#e86060","#5dd68a","#a8d4e8","#e8a840","#c8a8e8","#e8c8a8","#a8e8c8","#d4d4d4","#888"];
const GRADE = s => s>=82?"A":s>=68?"B":s>=52?"C":"D";
const GRADE_LABEL = s => ({A:"Elite Network",B:"Strong Network",C:"Developing",D:"Needs Work"})[GRADE(s)];
const GRADE_COLOR = s => ({A:"var(--green)",B:"var(--gold)",C:"var(--amber)",D:"var(--rose)"})[GRADE(s)];

// ─── Sub-components ───────────────────────────────────────────────────────────
function SparkBar({ value, max, color="#d4a843", delay=0, label, count, total }) {
  const pct = max>0?(value/max)*100:0;
  const sharePct = total>0?Math.round((value/total)*100):0;
  return (
    <div style={{marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,alignItems:"baseline"}}>
        <span style={{fontSize:12,color:"var(--text)"}}>{label}</span>
        <span style={{fontSize:10,color:"var(--muted)"}}>{count.toLocaleString()} <span style={{color}}>{sharePct}%</span></span>
      </div>
      <div style={{height:3,background:"var(--faint)",borderRadius:2,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:2,animation:`fadeIn 1s ${delay}s ease forwards`,opacity:0}} />
      </div>
    </div>
  );
}

function TimelineChart({ data }) {
  if (!data||data.length<2) return null;
  const maxAdded = Math.max(...data.map(d=>d.added),1);
  return (
    <div>
      <svg viewBox={`0 0 ${data.length*10} 60`} style={{width:"100%",height:90,overflow:"visible"}}>
        {[0,0.5,1].map(p=><line key={p} x1={0} y1={60*(1-p)} x2={data.length*10} y2={60*(1-p)} stroke="var(--border)" strokeWidth="0.3"/>)}
        {data.map((d,i)=>{
          const h=(d.added/maxAdded)*54;
          return <rect key={i} x={i*10+1} y={60-h} width={8} height={h} fill="var(--gold)" opacity="0.7" style={{animation:`fadeIn 0.3s ${i*0.02}s ease forwards`,opacity:0}}/>;
        })}
      </svg>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
        <span style={{fontSize:9,color:"var(--muted)"}}>{data[0]?.month}</span>
        <span style={{fontSize:9,color:"var(--muted)"}}>{data[data.length-1]?.month}</span>
      </div>
    </div>
  );
}

function RadialSegments({ industries, total }) {
  const topN = Object.entries(industries).sort((a,b)=>b[1]-a[1]).slice(0,7);
  const cx=80,cy=80,r=65,ir=35;
  let angle = -Math.PI/2;
  const segs = topN.map(([label,count],i)=>{
    const frac=count/total, sweep=frac*2*Math.PI;
    const x1=cx+r*Math.cos(angle),y1=cy+r*Math.sin(angle);
    const x2=cx+r*Math.cos(angle+sweep),y2=cy+r*Math.sin(angle+sweep);
    const ix1=cx+ir*Math.cos(angle),iy1=cy+ir*Math.sin(angle);
    const ix2=cx+ir*Math.cos(angle+sweep),iy2=cy+ir*Math.sin(angle+sweep);
    const lg=sweep>Math.PI?1:0;
    const path=`M ${ix1} ${iy1} L ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${ir} ${ir} 0 ${lg} 0 ${ix1} ${iy1} Z`;
    angle+=sweep+0.02;
    return {path,color:IND_COLORS[i],label,count,frac};
  });
  return (
    <div style={{display:"flex",gap:24,alignItems:"center",flexWrap:"wrap"}}>
      <svg width={160} height={160} style={{flexShrink:0}}>
        <defs><filter id="sg"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        {segs.map((s,i)=><path key={i} d={s.path} fill={s.color} opacity="0.85" filter="url(#sg)"/>)}
        <circle cx={cx} cy={cy} r={ir-2} fill="var(--surface)"/>
        <text x={cx} y={cy-4} textAnchor="middle" fill="var(--gold)" fontSize="16" fontFamily="Playfair Display,serif">{Object.keys(industries).length}</text>
        <text x={cx} y={cy+12} textAnchor="middle" fill="var(--muted)" fontSize="7" fontFamily="Space Mono" letterSpacing="1">SECTORS</text>
      </svg>
      <div style={{flex:1,minWidth:140}}>
        {segs.map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:s.color,flexShrink:0}}/>
            <div style={{fontSize:11,color:"var(--text)",flex:1}}>{s.label}</div>
            <div style={{fontSize:10,color:"var(--muted)"}}>{Math.round(s.frac*100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreHex({ score }) {
  const gc = GRADE_COLOR(score), gl = GRADE_LABEL(score), g = GRADE(score);
  const cx=90,cy=90,size=72;
  const pts = Array.from({length:6},(_,i)=>{const a=(Math.PI/3)*i-Math.PI/6;return `${cx+size*Math.cos(a)},${cy+size*Math.sin(a)}`;}).join(" ");
  const ipts = Array.from({length:6},(_,i)=>{const a=(Math.PI/3)*i-Math.PI/6,s2=size*(score/100);return `${cx+s2*Math.cos(a)},${cy+s2*Math.sin(a)}`;}).join(" ");
  return (
    <div style={{textAlign:"center"}}>
      <svg width={180} height={180} className="hex-score">
        <defs><filter id="hg"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <polygon points={pts} fill="none" stroke="var(--border-bright)" strokeWidth="1"/>
        <polygon points={ipts} fill={`${gc.replace("var(--","").replace(")","") === gc ? gc+"22" : "rgba(212,168,67,0.13)"}`} stroke={gc} strokeWidth="1.5" filter="url(#hg)" style={{animation:"glowPulse 3s ease infinite"}}/>
        <text x={cx} y={cy-8} textAnchor="middle" fill={gc} fontSize="36" fontFamily="Playfair Display,serif" fontWeight="700">{g}</text>
        <text x={cx} y={cy+14} textAnchor="middle" fill="var(--muted)" fontSize="10" fontFamily="Space Mono" letterSpacing="2">{score}/100</text>
      </svg>
      <div style={{fontSize:12,color:gc,letterSpacing:"0.15em",marginTop:-8}}>{gl.toUpperCase()}</div>
    </div>
  );
}

// ─── File processing ──────────────────────────────────────────────────────────
async function processZip(file) {
  const zip = await JSZip.loadAsync(file);
  const find = pat => zip.file(new RegExp(pat,"i"))[0];
  const result = {};
  const cf = find("connections\\.csv"); if(cf) result.connections = parseCSV(await cf.async("string"));
  const mf = find("messages\\.csv");    if(mf) result.messages    = parseCSV(await mf.async("string"));
  const af = find("ad_targeting\\.csv"); if(af) result.adTargeting = parseCSV(await af.async("string"));
  const inf = find("inferences\\.csv"); if(inf) result.inferences  = parseCSV(await inf.async("string"));
  return result;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [stage, setStage] = useState("upload");
  const [analysed, setAnalysed] = useState(null);
  const [error, setError]   = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  useEffect(()=>{
    const s = document.createElement("style");
    s.textContent = GLOBAL_CSS;
    document.head.appendChild(s);
    return ()=>document.head.removeChild(s);
  },[]);

  const process = useCallback(async (file) => {
    setError(""); setStage("analysing");
    try {
      let files = {};
      if (file.name.endsWith(".zip")) {
        files = await processZip(file);
        if (!files.connections) throw new Error("Couldn't find Connections.csv in the zip.");
      } else if (file.name.endsWith(".csv")) {
        files.connections = parseCSV(await file.text());
      } else {
        throw new Error("Please upload your LinkedIn zip export or Connections.csv");
      }
      if (!files.connections || files.connections.length < 5) throw new Error("Too few connections found. Make sure this is your Connections.csv.");
      await new Promise(r=>setTimeout(r,2000));
      setAnalysed({
        connections: analyseConnections(files.connections),
        messages:    files.messages    ? analyseMessages(files.messages)  : null,
        adTargeting: files.adTargeting ? analyseAds(files.adTargeting)    : null,
        inferences:  files.inferences  ? analyseAds(files.inferences)     : null,
        filesFound:  Object.keys(files),
      });
      setStage("results");
    } catch(e) { setError(e.message); setStage("upload"); }
  },[]);

  const onDrop = useCallback(e=>{
    e.preventDefault(); setDragOver(false);
    const f=e.dataTransfer.files[0]; if(f) process(f);
  },[process]);

  return (
    <>
      {stage==="upload"    && <Upload onDrop={onDrop} dragOver={dragOver} setDragOver={setDragOver} fileRef={fileRef} process={process} error={error}/>}
      {stage==="analysing" && <Analysing/>}
      {stage==="results"   && analysed && <Results data={analysed} onReset={()=>{setStage("upload");setAnalysed(null);}}/>}
    </>
  );
}

// ─── Upload ───────────────────────────────────────────────────────────────────
function Upload({ onDrop, dragOver, setDragOver, fileRef, process, error }) {
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"center",padding:"40px 24px",maxWidth:680,margin:"0 auto"}}>
      <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{position:"absolute",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle, rgba(212,168,67,0.04) 0%, transparent 70%)",top:"20%",left:"50%",transform:"translateX(-50%)"}}/>
      </div>
      <div style={{position:"relative",zIndex:1}}>
        <div className="animate-fade-up" style={{marginBottom:8}}>
          <span style={{fontSize:10,letterSpacing:"0.25em",color:"var(--gold)",borderBottom:"1px solid var(--gold-dim)",paddingBottom:2}}>LINKEDIN NETWORK INTELLIGENCE</span>
        </div>
        <h1 className="serif animate-fade-up-1" style={{fontSize:"clamp(32px,5vw,52px)",fontWeight:400,lineHeight:1.1,margin:"16px 0 12px"}}>
          LinkedIn has been<br/>studying you for years.<br/><em style={{color:"var(--gold)"}}>Now return the favour.</em>
        </h1>
        <p className="animate-fade-up-2" style={{color:"var(--muted)",fontSize:14,lineHeight:1.8,marginBottom:36,maxWidth:520}}>
          Upload your LinkedIn data export and discover what your network really says about you — concentration risks, seniority gaps, growth momentum, and how LinkedIn has categorised you for advertisers.
        </p>
        <div className={`drop-zone animate-fade-up-3 ${dragOver?"over":""}`}
          style={{padding:"48px 40px",textAlign:"center",marginBottom:16}}
          onDrop={onDrop} onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
          onClick={()=>fileRef.current.click()}>
          <div className="upload-icon" style={{fontSize:28,marginBottom:12}}>↑</div>
          <div className="serif" style={{fontSize:20,marginBottom:6}}>Drop your export here</div>
          <div style={{fontSize:10,color:"var(--muted)",letterSpacing:"0.15em"}}>CONNECTIONS.CSV · OR FULL ZIP ARCHIVE</div>
          <input ref={fileRef} type="file" accept=".csv,.zip" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f)process(f);}}/>
        </div>
        {error && <div style={{padding:"12px 16px",background:"rgba(232,96,96,0.08)",border:"1px solid rgba(232,96,96,0.25)",color:"var(--rose)",fontSize:12,marginBottom:16,lineHeight:1.6}}>{error}</div>}
        <div className="card animate-fade-up-4" style={{padding:24,marginBottom:16}}>
          <div style={{fontSize:10,letterSpacing:"0.2em",color:"var(--gold)",marginBottom:14}}>HOW TO GET YOUR DATA</div>
          <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"10px 16px",fontSize:12,color:"var(--muted)",lineHeight:1.6}}>
            {[["01","Go to LinkedIn → Settings & Privacy"],["02","Data Privacy → Get a copy of your data"],["03","Select 'Download larger data archive' → Request"],["04","Upload the zip file you receive by email"]].map(([n,t],i)=>(
              <><span key={`n${i}`} style={{color:"var(--gold-dim)",fontWeight:700}}>{n}</span><span key={`t${i}`} style={{color:i===3?"var(--gold)":"var(--text)"}}>{t}</span></>
            ))}
          </div>
        </div>
        <div className="animate-fade-up-5" style={{display:"flex",gap:24,fontSize:10,color:"var(--muted)",letterSpacing:"0.08em",flexWrap:"wrap"}}>
          <span>🔒 Runs entirely in your browser</span>
          <span>⚡ No data stored or transmitted</span>
          <span>📁 Works with full zip or just Connections.csv</span>
        </div>
      </div>
    </div>
  );
}

// ─── Analysing ────────────────────────────────────────────────────────────────
function Analysing() {
  const steps = ["Parsing connection data...","Classifying industries...","Scoring seniority levels...","Calculating network health...","Generating insights..."];
  const [step,setStep] = useState(0);
  useEffect(()=>{const t=setInterval(()=>setStep(s=>Math.min(s+1,steps.length-1)),400);return()=>clearInterval(t);},[]);
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:32}}>
      <div style={{position:"relative"}}>
        <div style={{width:48,height:48,border:"1px solid var(--border)",borderTop:"1px solid var(--gold)",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
        <div style={{position:"absolute",inset:0,border:"1px solid transparent",borderRight:"1px solid var(--gold-dim)",borderRadius:"50%",animation:"spin 2s linear infinite reverse"}}/>
      </div>
      <div style={{textAlign:"center"}}>
        <div className="serif" style={{fontSize:24,fontWeight:400,marginBottom:8}}>Mapping your network</div>
        <div style={{fontSize:11,color:"var(--gold)",letterSpacing:"0.15em",animation:"pulse 1s ease infinite"}}>{steps[step]}</div>
      </div>
    </div>
  );
}

// ─── Results ──────────────────────────────────────────────────────────────────
function Results({ data, onReset }) {
  const [tab,setTab] = useState("network");
  const { connections:c, messages, adTargeting, inferences, filesFound } = data;
  const tabs = [
    {id:"network",label:"NETWORK"},
    ...(messages?[{id:"messages",label:"MESSAGES"}]:[]),
    ...((adTargeting||inferences)?[{id:"targeting",label:"HOW LINKEDIN SEES YOU"}]:[]),
  ];

  return (
    <div style={{maxWidth:780,margin:"0 auto",padding:"48px 24px 120px"}}>
      <div className="animate-fade-up" style={{marginBottom:40}}>
        <div style={{fontSize:10,letterSpacing:"0.25em",color:"var(--gold)",marginBottom:16}}>NETWORK INTELLIGENCE REPORT</div>
        <div style={{display:"flex",gap:32,alignItems:"flex-start",flexWrap:"wrap"}}>
          <div style={{flex:1}}>
            <h1 className="serif" style={{fontSize:"clamp(28px,4vw,42px)",fontWeight:400,lineHeight:1.15,marginBottom:10}}>
              Your Network<br/><em style={{color:"var(--gold)"}}>Decoded</em>
            </h1>
            <div style={{fontSize:11,color:"var(--muted)",letterSpacing:"0.1em"}}>
              {c.total.toLocaleString()} CONNECTIONS · {c.networkAge} YEAR{c.networkAge!==1?"S":""} ACTIVE · {filesFound.length} FILE{filesFound.length!==1?"S":""} ANALYSED
            </div>
          </div>
          <ScoreHex score={c.score}/>
        </div>
      </div>

      <div className="animate-fade-up-1" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:32}}>
        {[
          {v:c.total.toLocaleString(),l:"Total Connections",s:`since ${c.firstYear}`},
          {v:`${c.concentration}%`,l:"Top Sector Share",s:c.topInd[0]?.[0]||"—",warn:c.concentration>60},
          {v:`${c.execPct}%`,l:"C-Suite & VP",s:"executive reach"},
          {v:c.recent12,l:"Added This Year",s:c.growthPct!==null?`${c.growthPct>0?"+":""}${c.growthPct}% vs last year`:"12-month total"},
        ].map((s,i)=>(
          <div key={i} className="card" style={{padding:"18px 16px"}}>
            <div style={{fontSize:10,color:"var(--muted)",letterSpacing:"0.1em",marginBottom:8}}>{s.l.toUpperCase()}</div>
            <div className="serif" style={{fontSize:28,fontWeight:400,color:s.warn?"var(--amber)":"var(--gold)",lineHeight:1,marginBottom:4}}>{s.v}</div>
            <div style={{fontSize:10,color:"var(--muted)"}}>{s.s}</div>
          </div>
        ))}
      </div>

      {tabs.length>1&&(
        <div className="animate-fade-up-2" style={{display:"flex",borderBottom:"1px solid var(--border)",marginBottom:28}}>
          {tabs.map(t=><button key={t.id} className={`tab ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}>{t.label}</button>)}
        </div>
      )}

      {tab==="network"   && <NetworkTab c={c}/>}
      {tab==="messages"  && messages && <MessagesTab m={messages}/>}
      {tab==="targeting" && <TargetingTab adTargeting={adTargeting} inferences={inferences}/>}

      <div className="animate-fade-up-7" style={{borderTop:"1px solid var(--border)",paddingTop:48,marginTop:48,textAlign:"center"}}>
        <div style={{width:40,height:1,background:"var(--gold)",margin:"0 auto 24px"}}/>
        <h2 className="serif" style={{fontSize:28,fontWeight:400,marginBottom:10}}>Surprised by anything?</h2>
        <p style={{color:"var(--muted)",fontSize:13,lineHeight:1.9,maxWidth:480,margin:"0 auto 28px"}}>
          I built this because most professionals have no idea what's actually inside their LinkedIn data. If your results revealed something interesting — connect and let me know.
        </p>
        <a href="https://www.linkedin.com/in/robertbrowton" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{marginBottom:16}}>
          CONNECT WITH ROB ON LINKEDIN →
        </a>
        <div style={{marginTop:16}}>
          <button onClick={onReset} className="btn-ghost">RUN ANOTHER ANALYSIS</button>
        </div>
      </div>
    </div>
  );
}

function NetworkTab({ c }) {
  const maxInd = c.topInd[0]?.[1]||1;
  const senOrder = ["C-Suite & Founder","VP & Director","Manager & Senior","Individual Contributor","Mid-Level","Early Career"];
  const sortedSen = senOrder.map(l=>[l,c.seniorities[l]||0]).filter(([,v])=>v>0);
  const maxSen = Math.max(...sortedSen.map(([,v])=>v));

  return (
    <>
      <div className="animate-fade-up-2" style={{marginBottom:28}}>
        <div style={{fontSize:10,letterSpacing:"0.2em",color:"var(--muted)",marginBottom:14}}>KEY FINDINGS</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {c.insights.map((ins,i)=>(
            <div key={i} className="card" style={{padding:"16px 20px",display:"flex",gap:16}}>
              <div style={{width:3,background:ins.type==="positive"?"var(--green)":ins.type==="warning"?"var(--amber)":"var(--muted)",flexShrink:0,borderRadius:2}}/>
              <div>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",color:ins.type==="positive"?"var(--green)":ins.type==="warning"?"var(--amber)":"var(--muted)",marginBottom:4}}>{ins.headline.toUpperCase()}</div>
                <div style={{fontSize:13,lineHeight:1.7,color:"var(--text)"}}>{ins.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card animate-fade-up-3" style={{padding:24,marginBottom:16}}>
        <div style={{fontSize:10,letterSpacing:"0.2em",color:"var(--muted)",marginBottom:20}}>INDUSTRY DISTRIBUTION</div>
        <RadialSegments industries={c.industries} total={c.total}/>
      </div>

      <div className="card animate-fade-up-4" style={{padding:24,marginBottom:16}}>
        <div style={{fontSize:10,letterSpacing:"0.2em",color:"var(--muted)",marginBottom:20}}>SENIORITY PROFILE</div>
        {sortedSen.map(([label,count],i)=>(
          <SparkBar key={label} label={label} value={count} max={maxSen} count={count} total={c.total} color={i===0?"var(--gold)":i===1?"var(--teal)":"var(--gold-dim)"} delay={i*0.1}/>
        ))}
      </div>

      <div className="card animate-fade-up-5" style={{padding:24,marginBottom:16}}>
        <div style={{fontSize:10,letterSpacing:"0.2em",color:"var(--muted)",marginBottom:4}}>GROWTH TIMELINE (24 MONTHS)</div>
        <div style={{fontSize:11,color:"var(--muted)",marginBottom:16}}>Connections added per month</div>
        <TimelineChart data={c.last24}/>
      </div>

      {c.topCompanies.length>0&&(
        <div className="card animate-fade-up-6" style={{padding:24,marginBottom:16}}>
          <div style={{fontSize:10,letterSpacing:"0.2em",color:"var(--muted)",marginBottom:20}}>TOP COMPANIES IN YOUR NETWORK</div>
          {c.topCompanies.map(([company,count],i)=>(
            <SparkBar key={company} label={company} value={count} max={c.topCompanies[0][1]} count={count} total={c.total} color="var(--teal)" delay={i*0.07}/>
          ))}
        </div>
      )}
    </>
  );
}

function MessagesTab({ m }) {
  return (
    <div className="animate-fade-up-2">
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:20}}>
        {[{v:m.total.toLocaleString(),l:"Total messages"},{v:m.uniquePeople,l:"People messaged"}].map((s,i)=>(
          <div key={i} className="card" style={{padding:20}}>
            <div style={{fontSize:10,color:"var(--muted)",letterSpacing:"0.1em",marginBottom:8}}>{s.l.toUpperCase()}</div>
            <div className="serif" style={{fontSize:32,color:"var(--gold)",lineHeight:1}}>{s.v}</div>
          </div>
        ))}
      </div>
      {m.topConversations.length>0&&(
        <div className="card" style={{padding:24}}>
          <div style={{fontSize:10,letterSpacing:"0.2em",color:"var(--muted)",marginBottom:16}}>MOST ACTIVE CONVERSATIONS</div>
          {m.topConversations.map(([name,count],i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:i<m.topConversations.length-1?"1px solid var(--border)":"none"}}>
              <span style={{fontSize:13}}>{name}</span>
              <span style={{fontSize:11,color:"var(--gold)"}}>{count} messages</span>
            </div>
          ))}
        </div>
      )}
      <div className="card" style={{padding:20,marginTop:16,borderColor:"rgba(212,168,67,0.2)"}}>
        <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.8}}>
          💡 <strong style={{color:"var(--text)"}}>What this reveals:</strong> LinkedIn tracks every message you send — who, when, how often. This data is used to infer relationship strength and professional intent for ad targeting.
        </div>
      </div>
    </div>
  );
}

function TargetingTab({ adTargeting, inferences }) {
  return (
    <div className="animate-fade-up-2">
      <div className="card" style={{padding:20,marginBottom:16,borderColor:"rgba(212,168,67,0.2)",background:"rgba(212,168,67,0.04)"}}>
        <div style={{fontSize:12,color:"var(--text)",lineHeight:1.8}}>
          This is how LinkedIn has <strong style={{color:"var(--gold)"}}>categorised you</strong> to sell access to advertisers. Every label here has a price tag attached.
        </div>
      </div>
      {adTargeting&&adTargeting.length>0&&(
        <div className="card" style={{padding:24,marginBottom:16}}>
          <div style={{fontSize:10,letterSpacing:"0.2em",color:"var(--muted)",marginBottom:16}}>AD TARGETING CATEGORIES</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {adTargeting.map((tag,i)=>(
              <span key={i} style={{padding:"4px 12px",border:"1px solid var(--border-bright)",fontSize:11,color:"var(--text)",background:"var(--faint)",animation:`fadeIn 0.3s ${i*0.03}s ease forwards`,opacity:0}}>{tag}</span>
            ))}
          </div>
        </div>
      )}
      {inferences&&inferences.length>0&&(
        <div className="card" style={{padding:24}}>
          <div style={{fontSize:10,letterSpacing:"0.2em",color:"var(--muted)",marginBottom:16}}>LINKEDIN'S INFERENCES ABOUT YOU</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {inferences.map((tag,i)=>(
              <span key={i} style={{padding:"4px 12px",border:"1px solid var(--teal-dim)",fontSize:11,color:"var(--teal)",animation:`fadeIn 0.3s ${i*0.03}s ease forwards`,opacity:0}}>{tag}</span>
            ))}
          </div>
        </div>
      )}
      {!adTargeting&&!inferences&&(
        <div className="card" style={{padding:24,textAlign:"center"}}>
          <div className="serif" style={{fontSize:20,marginBottom:10}}>Not in your export</div>
          <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.8,maxWidth:400,margin:"0 auto"}}>
            Ad targeting data requires the full archive export. It takes 24–48 hrs but reveals exactly how LinkedIn has profiled you — worth the wait.
          </div>
        </div>
      )}
    </div>
  );
}
