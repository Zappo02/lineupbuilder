import React, { useState, useRef, useEffect, useCallback, createContext, useContext } from "react";
import { PLAYERS, FORMATIONS, POSITION_COLORS, STAT_VIEWS, SERIE_A_TEAMS, NATION_FLAGS } from "./data/players.js";

/* ═══════════════════════════════════════════════════════════════════════════
   THEME
   ═══════════════════════════════════════════════════════════════════════════ */
const ThemeCtx = createContext("dark");
const THEMES = {
  dark: { bg:"#0a0e1a",panel:"#111827",border:"rgba(255,255,255,0.08)",text:"#f9fafb",
    dim:"#6b7280",faint:"#374151",inpBg:"rgba(255,255,255,0.07)",inpBd:"rgba(255,255,255,0.12)",
    head:"rgba(0,0,0,0.65)",pDark:"#1a4d2e",pLight:"#1d5c35",line:"rgba(255,255,255,0.28)",
    label:"rgba(0,0,0,0.88)",stroke:"rgba(255,255,255,0.2)" },
  light: { bg:"#f0f4f8",panel:"#ffffff",border:"rgba(0,0,0,0.1)",text:"#111827",
    dim:"#4b5563",faint:"#9ca3af",inpBg:"rgba(0,0,0,0.05)",inpBd:"rgba(0,0,0,0.15)",
    head:"rgba(255,255,255,0.9)",pDark:"#2d6a4f",pLight:"#40916c",line:"rgba(255,255,255,0.5)",
    label:"rgba(0,0,0,0.75)",stroke:"rgba(0,0,0,0.22)" },
};

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */
const ini = n => n.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
const rc  = r => r>=90?"#ffd700":r>=85?"#c8c8c8":r>=80?"#cd7f32":"#6b7280";
const XLR = {GK:"GK",ST:"ST",LS:"ST",RS:"ST",CF:"ST",LCB:"CB",RCB:"CB",CB:"CB",MCB:"CB",
  LB:"LB",LWB:"LB",RB:"RB",RWB:"RB",CDM:"DM",LCDM:"DM",RCDM:"DM",LCM:"CM",RCM:"CM",
  CM:"CM",CAM:"AM",LAM:"LW",RAM:"RW",LM:"LM",RM:"RM",LW:"LW",RW:"RW"};
const SAVE_KEY = "lu_v7";

/* ═══════════════════════════════════════════════════════════════════════════
   KIT SVG — disegno le strisce come <rect> individuali, senza pattern/defs
   Niente ID condivisi, niente clipPath, niente conflitti.
   Uso un <svg> con overflow:hidden + un path per la forma.
   ═══════════════════════════════════════════════════════════════════════════ */
const KITS = {
  Juventus:{p:"#1a1a1a",s:"#fff",t:"sv"},Inter:{p:"#003399",s:"#000",t:"sv"},
  Milan:{p:"#C0392B",s:"#1a1a1a",t:"sv"},Roma:{p:"#8B0000",s:"#e8b84b",t:"s"},
  Lazio:{p:"#89CFF0",s:"#fff",t:"s"},Napoli:{p:"#009FD4",s:"#fff",t:"s"},
  Atalanta:{p:"#1A3A6B",s:"#000",t:"sv"},Bologna:{p:"#C0392B",s:"#1a1a1a",t:"h"},
  Fiorentina:{p:"#6A0DAD",s:"#fff",t:"s"},Como:{p:"#0047AB",s:"#fff",t:"s"},
  Genoa:{p:"#8B0000",s:"#1B4F72",t:"h"},Torino:{p:"#8B2500",s:"#fff",t:"s"},
};

function KitSVG({club, size=32}) {
  const k = KITS[club] || {p:"#555",s:"#888",t:"s"};
  const th = useContext(ThemeCtx);
  const sk = th==="dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)";
  // Disegno su canvas 60×72 scalato
  const W=60, H=72;
  // Corpo
  const bd = `M13,10 Q30,2 47,10 L58,23 L48,28 L48,70 L12,70 L12,28 L2,23 Z`;
  // Maniche
  const ml = `M13,10 L2,23 L12,28 L17,17 Z`;
  const mr = `M47,10 L58,23 L48,28 L43,17 Z`;

  // Per le strisce verticali: 4 rect da 15px ciascuno, alternati
  const stripes = k.t === "sv" ? [0,1,2,3].map(i => (
    <rect key={i} x={i*15} y={0} width={15} height={H}
      fill={i%2===0 ? k.p : k.s}/>
  )) : null;

  return (
    <svg width={size} height={Math.round(size*1.2)} viewBox={`0 0 ${W} ${H}`}
      style={{display:"block",flexShrink:0}}>
      {/* Sfondo maglia = forma base */}
      <path d={bd} fill={k.p}/>

      {/* Strisce verticali: disegno rect e li maschero con la forma della maglia */}
      {/* Uso un <g> con la proprietà CSS clip-path su un path inline */}
      {k.t === "sv" && (
        <g style={{clipPath:`path('${bd}')`}}>
          {stripes}
        </g>
      )}

      {/* Metà destra per halves */}
      {k.t === "h" && (
        <g style={{clipPath:`path('${bd}')`}}>
          <rect x={W/2} y={0} width={W/2} height={H} fill={k.s}/>
        </g>
      )}

      {/* Contorno */}
      <path d={bd} fill="none" stroke={sk} strokeWidth="0.8"/>

      {/* Maniche */}
      <path d={ml} fill={k.s}/>
      <path d={mr} fill={k.s}/>
      {k.t === "sv" && <>
        <g style={{clipPath:`path('${ml}')`}}>{[0,1,2,3].map(i=><rect key={i} x={i*15} y={0} width={15} height={H} fill={i%2===0?k.p:k.s}/>)}</g>
        <g style={{clipPath:`path('${mr}')`}}>{[0,1,2,3].map(i=><rect key={i} x={i*15} y={0} width={15} height={H} fill={i%2===0?k.p:k.s}/>)}</g>
      </>}
      <path d={ml} fill="none" stroke={sk} strokeWidth="0.6"/>
      <path d={mr} fill="none" stroke={sk} strokeWidth="0.6"/>

      {/* Colletto */}
      <ellipse cx={30} cy={7} rx={6} ry={3} fill={k.s} stroke={sk} strokeWidth="0.4"/>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STAT BADGES
   ═══════════════════════════════════════════════════════════════════════════ */
function StatBadges({player, stats}) {
  if (!player) return null;
  const items = STAT_VIEWS.filter(s=>stats.includes(s.id)&&s.id!=="rating"&&player[s.id]!==undefined);
  if (!items.length) return null;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center",marginTop:2}}>
      {items.slice(0,2).map(sv => {
        const exp = sv.id==="contract"&&player.contract<=2026;
        const c = exp?"#ef4444":sv.color;
        const l = sv.id==="nation"?(NATION_FLAGS[player.nation]||player.nation)
                 :sv.id==="foot"?(player.foot==="L"?"✦ Sin":"Dx")
                 :`${sv.icon} ${sv.format(player[sv.id])}`;
        return <div key={sv.id} style={{background:c+"22",border:`1px solid ${c}66`,borderRadius:3,padding:"0 4px",fontSize:7,fontWeight:800,color:c,whiteSpace:"nowrap",lineHeight:"13px"}}>{l}</div>;
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PITCH SLOT — drag HTML5 nativo SOLO per desktop.
   Niente pointer events, niente touch events, niente setTimeout.
   ═══════════════════════════════════════════════════════════════════════════ */
function PitchSlot({slot, pos, player, alt, onDrop, onClick, tColor, stats, kits, cap}) {
  const [over, setOver] = useState(false);
  const th = useContext(ThemeCtx); const T = THEMES[th];
  const c = POSITION_COLORS[pos.role]||"#6b7280";
  const b = tColor||c;
  const cnt = useRef(0);

  // HTML5 drag
  const ds = e => { if(!player) return; e.dataTransfer.effectAllowed="move"; e.dataTransfer.setData("text/plain",JSON.stringify({id:player.id,slot})); };
  const de = e => { e.preventDefault(); cnt.current++; setOver(true); };
  const dv = e => { e.preventDefault(); };
  const dl = () => { cnt.current--; if(cnt.current<=0){cnt.current=0;setOver(false);} };
  const dd = e => { e.preventDefault(); cnt.current=0; setOver(false);
    try { const d=JSON.parse(e.dataTransfer.getData("text/plain")); onDrop(slot,d); } catch{} };

  const S = {position:"absolute",left:`${pos.x}%`,top:`${pos.y}%`,transform:"translate(-50%,-50%)",
    display:"flex",flexDirection:"column",alignItems:"center",gap:2,zIndex:over?20:10};

  if (!player) return (
    <div data-slot={slot} style={S} onDragEnter={de} onDragOver={dv} onDragLeave={dl} onDrop={dd}>
      <div onClick={()=>onClick(slot)} style={{width:44,height:44,borderRadius:"50%",border:`2px dashed ${c}`,
        backgroundColor:over?c+"33":c+"11",display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:18,color:c+"bb",cursor:"pointer",transform:over?"scale(1.15)":"scale(1)",transition:"all .12s"}}>+</div>
      <div style={{background:T.label,borderRadius:4,padding:"1px 6px",fontSize:9,color:c,fontWeight:700}}>{pos.role}</div>
    </div>
  );

  return (
    <div data-slot={slot} style={S} onDragEnter={de} onDragOver={dv} onDragLeave={dl} onDrop={dd}>
      <div draggable onDragStart={ds} onClick={()=>onClick(slot)}
        style={{position:"relative",cursor:"grab",transform:over?"scale(1.15)":"scale(1)",transition:"transform .12s",
          userSelect:"none",WebkitUserSelect:"none"}}>
        {kits ? <KitSVG club={player.club} size={40}/>
          : <div style={{width:44,height:44,borderRadius:"50%",backgroundColor:c+"22",border:`3px solid ${b}`,
              boxShadow:`0 0 10px ${b}55`,display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:13,fontWeight:800,color:c,fontFamily:"'Barlow Condensed',sans-serif"}}>{ini(player.name)}</div>}
        {stats.includes("rating") && <div style={{position:"absolute",top:-4,right:-4,background:rc(player.rating),
          color:"#000",fontSize:8,fontWeight:800,borderRadius:3,padding:"0 2px",lineHeight:"13px",minWidth:13,textAlign:"center"}}>{player.rating}</div>}
      </div>
      <div style={{background:T.label,borderRadius:5,padding:"1px 5px",maxWidth:82,textAlign:"center"}} onClick={()=>onClick(slot)}>
        <div style={{fontSize:8,color:"#9ca3af",fontWeight:700}}>{pos.role}</div>
        <div style={{fontSize:10,color:"#fff",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {cap===player.id&&<span style={{color:"#ffd700",marginRight:2}}>★</span>}{player.shortName}
        </div>
        {alt&&<div style={{fontSize:8,color:"#16a34a",fontWeight:600,borderTop:"1px solid rgba(22,163,74,0.3)",marginTop:1,paddingTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>↕ {alt.shortName}</div>}
      </div>
      <StatBadges player={player} stats={stats}/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PITCH
   ═══════════════════════════════════════════════════════════════════════════ */
function PitchView({lineup, alts, form, onDrop, onClick, name, color, stats, kits, cap}) {
  const th = useContext(ThemeCtx); const T = THEMES[th];
  const positions = FORMATIONS[form]?.positions||[];
  return (
    <div style={{position:"relative",width:"100%",paddingBottom:"150%",userSelect:"none",WebkitUserSelect:"none"}}>
      <svg viewBox="0 0 300 450" style={{position:"absolute",inset:0,width:"100%",height:"100%"}}>
        <defs><linearGradient id="gf" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={T.pDark}/><stop offset="100%" stopColor={T.pLight}/>
        </linearGradient></defs>
        <rect width="300" height="450" fill="url(#gf)" rx="8"/>
        {[0,1,2,3,4,5,6,7].map(i=><rect key={i} x="0" y={i*57} width="300" height="28" fill={i%2===0?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.02)"}/>)}
        <g fill="none" stroke={T.line} strokeWidth="1.3">
          <rect x="10" y="10" width="280" height="430" rx="2"/>
          <line x1="10" y1="225" x2="290" y2="225"/>
          <circle cx="150" cy="225" r="36"/>
          <circle cx="150" cy="225" r="2.5" fill={T.line} stroke="none"/>
          <rect x="56" y="350" width="188" height="80"/>
          <rect x="100" y="390" width="100" height="40"/>
          <rect x="56" y="20" width="188" height="80"/>
          <rect x="100" y="20" width="100" height="40"/>
          <path d="M 100 122 A 36 36 0 0 0 200 122"/>
          <path d="M 100 328 A 36 36 0 0 1 200 328"/>
        </g>
        {name&&<text x="150" y="226" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.04)" fontSize="19" fontFamily="'Barlow Condensed',sans-serif" fontWeight="900" letterSpacing="3">{name.toUpperCase()}</text>}
      </svg>
      {positions.map(p=>(
        <PitchSlot key={p.slot} slot={p.slot} pos={p} player={lineup[p.slot]||null}
          alt={alts[p.slot]?PLAYERS.find(x=>x.id===alts[p.slot])||null:null}
          onDrop={onDrop} onClick={onClick} tColor={color} stats={stats} kits={kits} cap={cap}/>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEAM PICKER
   ═══════════════════════════════════════════════════════════════════════════ */
function TeamPicker({onSelect, onClose}) {
  const th = useContext(ThemeCtx); const T = THEMES[th];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.panel,borderRadius:16,width:"100%",maxWidth:500,border:`1px solid ${T.border}`,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:T.panel,zIndex:1}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:700,color:T.text}}>Carica squadra Serie A</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.dim,cursor:"pointer",fontSize:20}}>✕</button>
        </div>
        <div style={{padding:14,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {SERIE_A_TEAMS.map(team=>(
            <button key={team.name} onClick={()=>onSelect(team)}
              style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"12px 8px",background:T.inpBg,border:`1px solid ${team.color}44`,borderRadius:10,cursor:"pointer"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=team.color;e.currentTarget.style.background=team.color+"18";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=team.color+"44";e.currentTarget.style.background=T.inpBg;}}>
              <KitSVG club={team.name} size={36}/>
              <div style={{fontSize:11,fontWeight:700,color:T.text,textAlign:"center"}}>{team.name}</div>
              <div style={{fontSize:9,color:T.dim}}>{team.formation} · OVR {team.rating}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PLAYER SEARCH
   ═══════════════════════════════════════════════════════════════════════════ */
function PlayerSearch({onSelect, onClose, role, lineup}) {
  const th = useContext(ThemeCtx); const T = THEMES[th];
  const [q,setQ]=useState("");const [pf,setPf]=useState("ALL");const [cf,setCf]=useState("ALL");
  const [minR,setMinR]=useState(60);const [maxA,setMaxA]=useState(40);const [footF,setFootF]=useState("ALL");
  const [conF,setConF]=useState("ALL");const [adv,setAdv]=useState(false);
  const ref=useRef();
  useEffect(()=>{const t=setTimeout(()=>ref.current?.focus(),400);return()=>clearTimeout(t);},[]);
  const PM={DEF:["CB","RB","LB"],MID:["DM","CM","AM","RM","LM"],ATT:["ST","RW","LW"]};
  const clubs=["ALL",...new Set(PLAYERS.map(p=>p.club))];
  const used=new Set(lineup.filter(Boolean).map(p=>p.id));
  const list=PLAYERS.filter(p=>{
    if(used.has(p.id))return false;
    if(q&&!p.name.toLowerCase().includes(q.toLowerCase())&&!p.club.toLowerCase().includes(q.toLowerCase()))return false;
    if(pf!=="ALL"&&!(pf==="GK"&&p.position==="GK")&&!(PM[pf]?.includes(p.position)))return false;
    if(cf!=="ALL"&&p.club!==cf)return false;
    if(p.rating<minR)return false;
    if(p.age>maxA&&maxA<40)return false;
    if(footF!=="ALL"&&p.foot!==footF)return false;
    if(conF==="exp"&&p.contract>2026)return false;
    if(conF==="safe"&&p.contract<=2026)return false;
    return true;
  }).sort((a,b)=>b.rating-a.rating);

  const pill=(active,fn,label,col="#16a34a")=><button onClick={fn} style={{padding:"3px 9px",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer",border:"1px solid",background:active?col:"transparent",borderColor:active?col:"rgba(128,128,128,0.3)",color:active?"#fff":T.dim}}>{label}</button>;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:12}}>
      <div style={{background:T.panel,borderRadius:16,width:"100%",maxWidth:520,maxHeight:"92vh",display:"flex",flexDirection:"column",border:`1px solid ${T.border}`}}>
        <div style={{padding:"12px 14px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,fontWeight:700,color:T.text}}>
              Scegli giocatore {role&&<span style={{marginLeft:7,fontSize:11,color:POSITION_COLORS[role]||"#6b7280",background:(POSITION_COLORS[role]||"#6b7280")+"22",padding:"2px 6px",borderRadius:4,fontWeight:600}}>{role}</span>}
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",color:T.dim,cursor:"pointer",fontSize:20}}>✕</button>
          </div>
          <input ref={ref} value={q} onChange={e=>setQ(e.target.value)} placeholder="Cerca per nome o club..."
            style={{width:"100%",background:T.inpBg,border:`1px solid ${T.inpBd}`,borderRadius:7,padding:"7px 11px",color:T.text,fontSize:16,outline:"none",boxSizing:"border-box",marginBottom:7}}/>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
            {["ALL","GK","DEF","MID","ATT"].map(g=>pill(pf===g,()=>setPf(g),g))}
            <button onClick={()=>setAdv(s=>!s)} style={{marginLeft:"auto",padding:"3px 9px",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer",border:"1px solid",background:adv?"rgba(99,102,241,0.2)":"transparent",borderColor:adv?"#6366f1":"rgba(128,128,128,0.3)",color:adv?"#6366f1":T.dim}}>⚙ Filtri {adv?"▲":"▼"}</button>
          </div>
          {adv&&<div style={{background:T.inpBg,borderRadius:8,padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:10,color:T.dim,width:64}}>Squadra</span>
              <select value={cf} onChange={e=>setCf(e.target.value)} style={{flex:1,background:T.inpBg,border:`1px solid ${T.inpBd}`,borderRadius:5,padding:"4px 8px",color:T.dim,fontSize:11,outline:"none"}}>
                {clubs.map(c=><option key={c} value={c}>{c==="ALL"?"Tutte":c}</option>)}
              </select>
            </div>
            {[{l:"Rating min",v:minR,s:setMinR,mn:60,mx:90,st:1,cl:"#ffd700",f:v=>v},
              {l:"Età max",v:maxA,s:setMaxA,mn:18,mx:40,st:1,cl:"#3b82f6",f:v=>v>=40?"∞":v+"a"},
            ].map(x=><div key={x.l} style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:10,color:T.dim,width:64}}>{x.l}</span>
              <input type="range" min={x.mn} max={x.mx} step={x.st} value={x.v} onChange={e=>x.s(+e.target.value)} style={{flex:1,accentColor:x.cl}}/>
              <span style={{fontSize:11,fontWeight:800,color:x.cl,width:36,textAlign:"right"}}>{x.f(x.v)}</span>
            </div>)}
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:10,color:T.dim,width:64}}>Piede</span>
              {[["ALL","Tutti"],["R","Destro"],["L","Mancino"]].map(([v,l])=>pill(footF===v,()=>setFootF(v),l,"#ec4899"))}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:10,color:T.dim,width:64}}>Contratto</span>
              {[["ALL","Tutti"],["exp","In scadenza"],["safe","Sicuri"]].map(([v,l])=>pill(conF===v,()=>setConF(v),l,"#f97316"))}
            </div>
          </div>}
          <div style={{fontSize:10,color:T.dim,textAlign:"right",marginTop:4}}>{list.length} giocatori</div>
        </div>
        <div style={{overflowY:"auto",flex:1}}>
          {list.length===0?<div style={{padding:28,textAlign:"center",color:T.dim}}>Nessun giocatore trovato</div>
          :list.map(p=>{const exp=p.contract<=2026;return(
            <div key={p.id} onClick={()=>onSelect(p)} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 14px",cursor:"pointer",borderBottom:`1px solid ${T.border}`}}
              onMouseEnter={e=>e.currentTarget.style.background=T.inpBg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <KitSVG club={p.club} size={26}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:T.text}}>{p.name} <span style={{fontSize:11}}>{NATION_FLAGS[p.nation]||""}</span>{p.foot==="L"&&<span style={{fontSize:9,color:"#ec4899",marginLeft:4}}>✦</span>}</div>
                <div style={{fontSize:10,color:T.dim}}>{p.club} · {p.age}a · €{p.value}M{exp&&<span style={{color:"#ef4444",marginLeft:5}}>⚠{p.contract}</span>}</div>
              </div>
              <div style={{fontSize:9,color:POSITION_COLORS[p.position]||"#6b7280",background:(POSITION_COLORS[p.position]||"#6b7280")+"22",padding:"1px 5px",borderRadius:3,fontWeight:700}}>{p.position}</div>
              <div style={{fontSize:13,fontWeight:800,color:rc(p.rating),width:24,textAlign:"right"}}>{p.rating}</div>
            </div>
          );})}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SETTINGS, LINEUP LIST, BENCH, STATS, COMPARE — pannelli laterali
   ═══════════════════════════════════════════════════════════════════════════ */
function Settings({name,setName,color,setColor,form,setForm,kits,setKits,onPick}) {
  const th=useContext(ThemeCtx);const T=THEMES[th];
  const colors=["#16a34a","#2563eb","#dc2626","#d97706","#7c3aed","#db2777","#0891b2","#e5e7eb","#000","#8B2500"];
  const cats=[...new Set(Object.values(FORMATIONS).map(f=>f.category))];
  return(
    <div style={{background:T.panel,borderRadius:12,border:`1px solid ${T.border}`,overflow:"hidden"}}>
      <button onClick={onPick} style={{width:"100%",padding:"10px 12px",background:"rgba(22,163,74,0.12)",border:"none",borderBottom:`1px solid ${T.border}`,color:"#16a34a",fontSize:12,fontWeight:700,cursor:"pointer"}}>🏟️ Carica squadra Serie A</button>
      <div style={{padding:"9px 12px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontSize:9,fontWeight:700,color:T.dim,letterSpacing:"1px",textTransform:"uppercase",marginBottom:4}}>Nome squadra</div>
        <input value={name} onChange={e=>setName(e.target.value)} maxLength={24}
          style={{width:"100%",background:T.inpBg,border:`1px solid ${T.inpBd}`,borderRadius:7,padding:"6px 9px",color:T.text,fontSize:16,outline:"none",boxSizing:"border-box"}}/>
      </div>
      <div style={{padding:"9px 12px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontSize:9,fontWeight:700,color:T.dim,letterSpacing:"1px",textTransform:"uppercase",marginBottom:4}}>Colore</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {colors.map(c=><div key={c} onClick={()=>setColor(c)} style={{width:18,height:18,borderRadius:"50%",backgroundColor:c,cursor:"pointer",border:color===c?`2.5px solid ${th==="dark"?"#fff":"#333"}`:"2px solid rgba(128,128,128,0.3)"}}/>)}
        </div>
      </div>
      <div style={{padding:"9px 12px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontSize:9,fontWeight:700,color:T.dim,letterSpacing:"1px",textTransform:"uppercase",marginBottom:4}}>Modulo</div>
        {cats.map(cat=><div key={cat} style={{marginBottom:6}}>
          <div style={{fontSize:8,color:T.faint,fontWeight:700,marginBottom:3,textTransform:"uppercase"}}>{cat}</div>
          <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
            {Object.entries(FORMATIONS).filter(([,f])=>f.category===cat).map(([k])=>(
              <button key={k} onClick={()=>setForm(k)} style={{padding:"2px 6px",borderRadius:4,fontSize:9,fontWeight:700,cursor:"pointer",border:"1px solid",background:form===k?color:"transparent",borderColor:form===k?color:"rgba(128,128,128,0.3)",color:form===k?(color==="#e5e7eb"?"#000":"#fff"):T.dim}}>{k}</button>
            ))}
          </div>
        </div>)}
      </div>
      <div style={{padding:"8px 12px"}}>
        <button onClick={()=>setKits(s=>!s)} style={{width:"100%",padding:"6px",borderRadius:6,border:`1px solid ${kits?"#16a34a":"rgba(128,128,128,0.3)"}`,background:kits?"rgba(22,163,74,0.1)":"transparent",color:kits?"#16a34a":T.dim,fontSize:11,fontWeight:600,cursor:"pointer"}}>
          {kits?"✓ Kit abilitati":"⚽ Mostra kit"}
        </button>
      </div>
    </div>
  );
}

function StatSel({stats,setStats}) {
  const th=useContext(ThemeCtx);const T=THEMES[th];
  const toggle=id=>setStats(p=>p.includes(id)?p.filter(s=>s!==id):[...p,id]);
  const nr=stats.filter(s=>s!=="rating").length;
  return(
    <div style={{background:T.panel,borderRadius:12,border:`1px solid ${T.border}`,padding:"9px 12px"}}>
      <div style={{fontSize:9,fontWeight:700,color:T.dim,letterSpacing:"1px",textTransform:"uppercase",marginBottom:6}}>Info visibili</div>
      {STAT_VIEWS.map(sv=>{const a=stats.includes(sv.id);const bl=!a&&sv.id!=="rating"&&nr>=2;return(
        <button key={sv.id} onClick={()=>{if(!bl)toggle(sv.id);}} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 9px",borderRadius:6,border:`1px solid ${a?sv.color:T.border}`,background:a?sv.color+"18":"transparent",cursor:bl?"not-allowed":"pointer",width:"100%",marginBottom:3,opacity:bl?0.4:1}}>
          <span style={{fontSize:12}}>{sv.icon}</span>
          <span style={{fontSize:10,fontWeight:600,color:a?sv.color:T.dim,flex:1}}>{sv.label}</span>
          <div style={{width:13,height:13,borderRadius:3,background:a?sv.color:"transparent",border:`1.5px solid ${a?sv.color:T.faint}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#000"}}>{a?"✓":""}</div>
        </button>
      );})}
    </div>
  );
}

function LineupList({lineup,alts,form,onRemove,onRemoveAlt,onSlot,stats,cap,setCap}) {
  const th=useContext(ThemeCtx);const T=THEMES[th];
  const positions=FORMATIONS[form]?.positions||[];
  const sh=STAT_VIEWS.filter(s=>stats.includes(s.id)&&s.id!=="rating");
  return(
    <div style={{background:T.panel,borderRadius:12,border:`1px solid ${T.border}`,overflow:"hidden"}}>
      <div style={{padding:"9px 12px",borderBottom:`1px solid ${T.border}`}}>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:700,color:T.text}}>XI ({lineup.filter(Boolean).length}/11)</span>
      </div>
      <div style={{maxHeight:480,overflowY:"auto"}}>
        {positions.map(pos=>{
          const p=lineup[pos.slot];const alt=alts[pos.slot]?PLAYERS.find(x=>x.id===alts[pos.slot]):null;
          const rc2=POSITION_COLORS[pos.role]||"#6b7280";
          return(<div key={pos.slot} style={{borderBottom:`1px solid ${T.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",cursor:p?"default":"pointer",minHeight:34}}
              onClick={()=>{if(!p)onSlot(pos.slot);}}>
              <div style={{width:24,fontSize:8,fontWeight:700,color:rc2,background:rc2+"22",borderRadius:3,textAlign:"center",padding:"2px",flexShrink:0}}>{pos.role}</div>
              {p?<>
                <KitSVG club={p.club} size={22}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {cap===p.id&&<span style={{color:"#ffd700",marginRight:2}}>★</span>}{p.shortName}
                    {p.foot==="L"&&<span style={{fontSize:8,color:"#ec4899",marginLeft:2}}>✦</span>}
                    {p.contract<=2026&&<span style={{fontSize:8,color:"#ef4444",marginLeft:2}}>⚠{p.contract}</span>}
                  </div>
                  {sh.length>0&&<div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                    {sh.map(sv=>p[sv.id]!==undefined&&<span key={sv.id} style={{fontSize:8,color:sv.id==="contract"&&p.contract<=2026?"#ef4444":sv.color,fontWeight:700}}>{sv.id==="nation"?NATION_FLAGS[p.nation]||p.nation:sv.id==="foot"?(p.foot==="L"?"✦":"Dx"):`${sv.icon}${sv.format(p[sv.id])}`}</span>)}
                  </div>}
                </div>
                {stats.includes("rating")&&<div style={{fontSize:10,fontWeight:800,color:rc(p.rating),flexShrink:0}}>{p.rating}</div>}
                <button onClick={e=>{e.stopPropagation();setCap(p.id);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:cap===p.id?"#ffd700":T.faint,padding:2,flexShrink:0}}>★</button>
                <button onClick={e=>{e.stopPropagation();onRemove(pos.slot);}} style={{background:"none",border:"none",color:T.faint,cursor:"pointer",fontSize:11,padding:2,flexShrink:0}}>✕</button>
              </>
              :<div style={{fontSize:10,color:T.faint,fontStyle:"italic",display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:14,color:rc2+"66"}}>+</span>Aggiungi {pos.role}</div>}
            </div>
            {alt&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"3px 10px 4px 36px",background:"rgba(22,163,74,0.06)"}}>
              <span style={{fontSize:9,color:"#16a34a",fontWeight:700,width:24,textAlign:"center"}}>↕</span>
              <KitSVG club={alt.club} size={18}/>
              <div style={{flex:1,fontSize:10,color:"#16a34a",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{alt.shortName}</div>
              <div style={{fontSize:9,fontWeight:800,color:rc(alt.rating)}}>{alt.rating}</div>
              <button onClick={()=>onRemoveAlt(pos.slot)} style={{background:"none",border:"none",color:T.faint,cursor:"pointer",fontSize:10}}>✕</button>
            </div>}
          </div>);
        })}
      </div>
    </div>
  );
}

function BenchPanel({bench,lineup,alts,onSetAlt,stats,cap,setCap}) {
  const th=useContext(ThemeCtx);const T=THEMES[th];
  const [sort,setSort]=useState("rating");
  const sh=STAT_VIEWS.filter(s=>stats.includes(s.id)&&s.id!=="rating");
  const ids=new Set(lineup.filter(Boolean).map(p=>p.id));
  const list=bench.filter(p=>!ids.has(p.id)).sort((a,b)=>sort==="rating"?b.rating-a.rating:sort==="age"?a.age-b.age:sort==="value"?b.value-a.value:b.wage-a.wage);
  return(
    <div style={{background:T.panel,borderRadius:12,border:`1px solid ${T.border}`,overflow:"hidden"}}>
      <div style={{padding:"9px 12px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,color:T.text}}>Rosa ({list.length})</div>
          <select value={sort} onChange={e=>setSort(e.target.value)} style={{background:T.inpBg,border:`1px solid ${T.inpBd}`,borderRadius:5,padding:"2px 6px",color:T.dim,fontSize:10,outline:"none"}}>
            <option value="rating">Rating ↓</option><option value="age">Età ↑</option><option value="value">Valore ↓</option><option value="wage">Stipendio ↓</option>
          </select>
        </div>
        <div style={{fontSize:9,color:T.faint,marginTop:2}}>Clicca → alternativa ↕</div>
      </div>
      <div style={{overflowY:"auto",maxHeight:500}}>
        {list.length===0&&<div style={{padding:20,color:T.faint,fontSize:12,textAlign:"center"}}>Carica una squadra</div>}
        {list.map(p=>{const isA=Object.values(alts).includes(p.id);const exp=p.contract<=2026;return(
          <div key={p.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderBottom:`1px solid ${T.border}`,cursor:"pointer"}}
            onMouseEnter={e=>e.currentTarget.style.background=T.inpBg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <div style={{width:22,fontSize:8,fontWeight:700,color:POSITION_COLORS[p.position]||"#6b7280",background:(POSITION_COLORS[p.position]||"#6b7280")+"22",borderRadius:3,textAlign:"center",padding:"2px",flexShrink:0}}>{p.position}</div>
            <div onClick={()=>onSetAlt(p)} style={{flexShrink:0}}><KitSVG club={p.club} size={22}/></div>
            <div onClick={()=>onSetAlt(p)} style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,fontWeight:700,color:isA?"#16a34a":T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {cap===p.id&&<span style={{color:"#ffd700",marginRight:2}}>★</span>}{p.shortName}
                {p.foot==="L"&&<span style={{fontSize:8,color:"#ec4899",marginLeft:2}}>✦</span>}
                {exp&&<span style={{fontSize:8,color:"#ef4444",marginLeft:2}}>⚠{p.contract}</span>}
                {isA&&<span style={{fontSize:8,color:"#16a34a",marginLeft:2}}>↕</span>}
              </div>
              {sh.length>0&&<div style={{display:"flex",gap:3}}>{sh.map(sv=>p[sv.id]!==undefined&&<span key={sv.id} style={{fontSize:8,color:sv.id==="contract"&&exp?"#ef4444":sv.color,fontWeight:700}}>{sv.id==="nation"?NATION_FLAGS[p.nation]||p.nation:sv.id==="foot"?(p.foot==="L"?"✦":"Dx"):`${sv.icon}${sv.format(p[sv.id])}`}</span>)}</div>}
            </div>
            <button onClick={()=>setCap(p.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:cap===p.id?"#ffd700":T.faint,padding:2,flexShrink:0}}>★</button>
            <div style={{fontSize:10,fontWeight:800,color:rc(p.rating),flexShrink:0}}>{p.rating}</div>
          </div>
        );})}
      </div>
    </div>
  );
}

function SquadStats({lineup}) {
  const th=useContext(ThemeCtx);const T=THEMES[th];
  const f=lineup.filter(Boolean);if(!f.length)return null;
  const avg=k=>{const v=f.map(p=>p[k]).filter(x=>x!==undefined);return v.length?v.reduce((a,b)=>a+b,0)/v.length:0;};
  const sum=k=>f.reduce((a,p)=>a+(p[k]||0),0);
  const ag={"≤21":0,"22-25":0,"26-29":0,"30+":0};
  f.forEach(p=>{if(p.age<=21)ag["≤21"]++;else if(p.age<=25)ag["22-25"]++;else if(p.age<=29)ag["26-29"]++;else ag["30+"]++;});
  return(
    <div style={{background:T.panel,borderRadius:12,border:`1px solid ${T.border}`,overflow:"hidden"}}>
      <div style={{padding:"9px 12px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontSize:9,fontWeight:700,color:T.dim,letterSpacing:"1px",textTransform:"uppercase"}}>Statistiche</div>
      </div>
      <div style={{padding:"2px 0"}}>
        {[{l:"Rating medio",v:avg("rating").toFixed(1),c:rc(avg("rating"))},{l:"Età media",v:`${avg("age").toFixed(1)}a`},
          {l:"Valore totale",v:`€${sum("value")}M`,c:"#16a34a"},{l:"Stipendi/anno",v:`€${sum("wage").toLocaleString("it-IT")}K`,c:"#f59e0b"},
          {l:"Mancini",v:`${f.filter(p=>p.foot==="L").length}/${f.length}`,c:"#ec4899"},
          {l:"In scadenza ⚠",v:`${f.filter(p=>p.contract<=2026).length}`,c:f.some(p=>p.contract<=2026)?"#ef4444":T.dim},
        ].map(s=><div key={s.l} style={{display:"flex",justifyContent:"space-between",padding:"4px 12px",borderBottom:`1px solid ${T.border}`}}>
          <span style={{fontSize:10,color:T.dim}}>{s.l}</span><span style={{fontSize:11,fontWeight:700,color:s.c||T.text}}>{s.v}</span>
        </div>)}
      </div>
      <div style={{padding:"7px 12px 10px",borderTop:`1px solid ${T.border}`}}>
        <div style={{fontSize:9,fontWeight:700,color:T.dim,textTransform:"uppercase",marginBottom:5}}>Distribuzione età</div>
        {Object.entries(ag).map(([l,c])=><div key={l} style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
          <span style={{fontSize:9,color:T.dim,width:34}}>{l}</span>
          <div style={{flex:1,height:4,background:T.inpBg,borderRadius:2,overflow:"hidden"}}>
            <div style={{width:`${f.length?(c/f.length)*100:0}%`,height:"100%",background:l==="≤21"?"#3b82f6":l==="22-25"?"#16a34a":l==="26-29"?"#f59e0b":"#ef4444",borderRadius:2}}/>
          </div>
          <span style={{fontSize:9,color:T.dim,width:10,textAlign:"right"}}>{c}</span>
        </div>)}
      </div>
    </div>
  );
}

function AltPicker({player,lineup,positions,onSelect,onClose}) {
  const th=useContext(ThemeCtx);const T=THEMES[th];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.panel,borderRadius:14,width:"100%",maxWidth:340,border:`1px solid ${T.border}`}}>
        <div style={{padding:"11px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700,color:T.text}}>Alternativa per?</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.dim,cursor:"pointer",fontSize:18}}>✕</button>
        </div>
        <div style={{maxHeight:340,overflowY:"auto"}}>
          {positions.map(pos=>{const s=lineup[pos.slot];if(!s)return null;return(
            <div key={pos.slot} onClick={()=>onSelect(pos.slot)} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 14px",cursor:"pointer",borderBottom:`1px solid ${T.border}`}}
              onMouseEnter={e=>e.currentTarget.style.background=T.inpBg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{width:24,fontSize:8,fontWeight:700,color:POSITION_COLORS[pos.role],background:POSITION_COLORS[pos.role]+"22",borderRadius:3,textAlign:"center",padding:"2px 3px"}}>{pos.role}</div>
              <KitSVG club={s.club} size={24}/>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:T.text}}>{s.name}</div><div style={{fontSize:10,color:T.dim}}>→ {player.name}</div></div>
            </div>
          );})}
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({team,onOk,onNo}) {
  const th=useContext(ThemeCtx);const T=THEMES[th];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:T.panel,borderRadius:14,width:"100%",maxWidth:360,border:`1px solid ${T.border}`,padding:24,textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:12}}>⚠️</div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:700,color:T.text,marginBottom:8}}>Sovrascrivere?</div>
        <div style={{fontSize:13,color:T.dim,marginBottom:20,lineHeight:1.5}}>Hai giocatori in campo. Caricare <strong style={{color:T.text}}>{team.name}</strong> sostituirà tutti i titolari.</div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onNo} style={{flex:1,padding:10,borderRadius:8,border:`1px solid ${T.border}`,background:"transparent",color:T.dim,cursor:"pointer",fontSize:13,fontWeight:600}}>Annulla</button>
          <button onClick={onOk} style={{flex:1,padding:10,borderRadius:8,border:"none",background:"#16a34a",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>Carica</button>
        </div>
      </div>
    </div>
  );
}

function Toast({msg,onDone}) {
  useEffect(()=>{const t=setTimeout(onDone,2500);return()=>clearTimeout(t);},[onDone]);
  return <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#16a34a",color:"#fff",padding:"10px 20px",borderRadius:10,fontWeight:700,fontSize:14,zIndex:999,whiteSpace:"nowrap"}}>{msg}</div>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   APP
   ═══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [theme, setTheme] = useState("dark");
  const T = THEMES[theme];

  // ── State: plain useState, no fancy hooks ────────────────────────────────
  const [lineup, setLineup]     = useState(Array(11).fill(null));
  const [form,   setFormRaw]    = useState("4-3-3");
  const [name,   setName]       = useState("La mia Squadra");
  const [color,  setColor]      = useState("#16a34a");
  const [alts,   setAlts]       = useState({});
  const [bench,  setBench]      = useState([]);
  const [cap,    setCap]        = useState(null);

  const [stats,  setStats]      = useState(["rating"]);
  const [kits,   setKits]       = useState(false);
  const [picking,setPicking]    = useState(null);   // {slot, role}
  const [teamPicker,setTeamPicker] = useState(false);
  const [altPick,setAltPick]    = useState(null);   // player object
  const [pending,setPending]    = useState(null);    // team to confirm
  const [toast,  setToast]      = useState(null);
  const [saved,  setSaved]      = useState([]);
  const [showSaved,setShowSaved]= useState(false);

  useEffect(()=>{setSaved(JSON.parse(localStorage.getItem(SAVE_KEY)||"[]"));},[]);

  // ── Formation change — simple: just set formation, DON'T remap ──────────
  // Players stay in their slots. No crash possible.
  const setForm = useCallback(f => setFormRaw(f), []);

  // ── Load team ───────────────────────────────────────────────────────────
  const doLoad = useCallback(team => {
    const tf = team.formation || "4-3-3";
    const positions = FORMATIONS[tf]?.positions || [];
    const newLU = Array(11).fill(null);
    const used = new Set();
    const starters = (team.starters||[])
      .map(s=>({...s,p:s.playerId?PLAYERS.find(x=>x.id===s.playerId):null}))
      .filter(s=>s.p);
    // Pass 1: exact role match from starters
    positions.forEach(pos=>{
      if(newLU[pos.slot])return;
      const c=starters.find(s=>XLR[s.xlRole]===pos.role&&!used.has(s.p.id))
           ||starters.find(s=>s.p.position===pos.role&&!used.has(s.p.id));
      if(c){newLU[pos.slot]=c.p;used.add(c.p.id);}
    });
    // Pass 2: fill from team roster
    const roster=PLAYERS.filter(p=>p.club===team.name).sort((a,b)=>b.rating-a.rating);
    positions.forEach(pos=>{if(newLU[pos.slot])return;const c=roster.find(p=>p.position===pos.role&&!used.has(p.id));if(c){newLU[pos.slot]=c;used.add(c.id);}});
    positions.forEach(pos=>{if(newLU[pos.slot])return;const c=roster.find(p=>!used.has(p.id));if(c){newLU[pos.slot]=c;used.add(c.id);}});

    setLineup(newLU);
    setFormRaw(tf);
    setName(team.name);
    setColor(team.color);
    setAlts({});
    setBench(PLAYERS.filter(p=>p.club===team.name));
    setTeamPicker(false);
    setPending(null);
    setToast(`${team.name} caricata! ⚽`);
  },[]);

  const loadTeam = team => {
    if (lineup.some(Boolean)) { setPending(team); setTeamPicker(false); }
    else doLoad(team);
  };

  // ── Slot click → open search ────────────────────────────────────────────
  const slotClick = slot => {
    const pos=(FORMATIONS[form]?.positions||[]).find(p=>p.slot===slot);
    setPicking({slot,role:pos?.role||null});
  };

  const selectPlayer = player => {
    if(!picking)return;
    setLineup(prev=>{const n=[...prev];n[picking.slot]=player;return n;});
    setPicking(null);
  };

  // ── Drag & drop (HTML5 only, works on PC) ───────────────────────────────
  const handleDrop = useCallback((targetSlot, data) => {
    setLineup(prev => {
      const next = [...prev];
      if (data.slot !== undefined && data.slot !== null) {
        // Swap: drag from slot to slot
        const fromPlayer = PLAYERS.find(p=>p.id===data.id);
        [next[data.slot], next[targetSlot]] = [next[targetSlot], next[data.slot]];
      } else {
        // From search/bench: just place
        const p = PLAYERS.find(x=>x.id===data.id);
        if (p) next[targetSlot] = p;
      }
      return next;
    });
  }, []);

  const removePlayer = slot => setLineup(prev=>{const n=[...prev];n[slot]=null;return n;});
  const removeAlt = slot => setAlts(prev=>{const n={...prev};delete n[slot];return n;});
  const benchClick = player => setAltPick(player);
  const altSlotSelect = slot => {
    if(!altPick)return;
    setAlts(prev=>({...prev,[slot]:altPick.id}));
    setAltPick(null);
    setToast(`${altPick.shortName} → alternativa ↕`);
  };

  const share = () => {
    const code=enc(lineup,form,name,color,alts);
    const url=`${location.origin}${location.pathname}#${code}`;
    navigator.clipboard.writeText(url).then(()=>setToast("Link copiato! 🔗")).catch(()=>{});
  };
  const save = () => {
    const s=JSON.parse(localStorage.getItem(SAVE_KEY)||"[]");
    const e={id:Date.now(),name,formation:form,color,lineup:lineup.map(p=>p?.id??null),alts,date:new Date().toLocaleDateString("it-IT")};
    const u=[e,...s].slice(0,10);
    localStorage.setItem(SAVE_KEY,JSON.stringify(u));setSaved(u);setToast("Salvata! 💾");
  };
  const load = entry => {
    setLineup(entry.lineup.map(id=>id?PLAYERS.find(p=>p.id===id)||null:null));
    setFormRaw(entry.formation);setName(entry.name);setColor(entry.color);
    setAlts(entry.alts||{});setShowSaved(false);setToast("Caricata! ✅");
  };

  const positions = FORMATIONS[form]?.positions||[];
  const [mobile,setMobile]=useState(window.innerWidth<900);
  useEffect(()=>{const h=()=>setMobile(window.innerWidth<900);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);

  return (
    <ThemeCtx.Provider value={theme}>
      <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Inter',sans-serif"}}>
        <style>{`*{box-sizing:border-box;}html,body{margin:0;padding:0;overflow-x:hidden;width:100%;max-width:100vw;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:rgba(128,128,128,0.2);border-radius:2px;}input[type=range]{accent-color:#ffd700;}`}</style>

        {/* HEADER */}
        <header style={{background:T.head,backdropFilter:"blur(12px)",borderBottom:`1px solid ${T.border}`,padding:"0 14px",height:50,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:26,height:26,background:"linear-gradient(135deg,#16a34a,#059669)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>⚽</div>
            <div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:900,lineHeight:1,color:T.text}}>LINEUP BUILDER</div>
              <div style={{fontSize:8,color:T.dim,letterSpacing:"1.5px"}}>UNIVERSO SPORTIVO</div>
            </div>
          </div>
          <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
            <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} style={{background:T.inpBg,border:`1px solid ${T.border}`,color:T.text,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:13}}>{theme==="dark"?"☀️":"🌙"}</button>
            <button onClick={save} style={{background:T.inpBg,border:`1px solid ${T.border}`,color:T.text,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:12}}>💾</button>
            <button onClick={()=>setShowSaved(s=>!s)} style={{background:showSaved?"#16a34a18":T.inpBg,border:`1px solid ${showSaved?"#16a34a":T.border}`,color:showSaved?"#16a34a":T.text,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:11}}>📁{saved.length>0&&` (${saved.length})`}</button>
            <button onClick={share} style={{background:"#16a34a",border:"none",color:"#fff",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>🔗</button>
          </div>
        </header>

        {showSaved&&<div style={{background:T.panel,borderBottom:`1px solid ${T.border}`,padding:"9px 14px"}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,marginBottom:7,color:T.text}}>Salvate</div>
          {saved.length===0?<div style={{color:T.dim,fontSize:11}}>Nessuna</div>
          :<div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{saved.map(e=>(
            <div key={e.id} onClick={()=>load(e)} style={{background:T.inpBg,border:`1px solid ${e.color}44`,borderRadius:8,padding:"6px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:7}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:e.color}}/>
              <div><div style={{fontSize:11,fontWeight:700,color:T.text}}>{e.name}</div><div style={{fontSize:9,color:T.dim}}>{e.formation} · {e.date}</div></div>
            </div>
          ))}</div>}
        </div>}

        <main style={{maxWidth:1160,margin:"0 auto",padding:"12px 10px",display:"grid",gridTemplateColumns:mobile?"1fr":"200px 1fr 200px 180px",gap:12,alignItems:"start"}}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <Settings name={name} setName={setName} color={color} setColor={setColor} form={form} setForm={setForm} kits={kits} setKits={setKits} onPick={()=>setTeamPicker(true)}/>
            <StatSel stats={stats} setStats={setStats}/>
            <div style={{background:T.panel,borderRadius:10,border:`1px solid ${T.border}`,padding:"8px 12px"}}>
              <button onClick={()=>{setLineup(Array(11).fill(null));setAlts({});setBench([]);}} style={{width:"100%",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",color:"#f87171",borderRadius:6,padding:"6px",cursor:"pointer",fontSize:11,fontWeight:600}}>🗑 Svuota</button>
            </div>
          </div>

          <PitchView lineup={lineup} alts={alts} form={form} onDrop={handleDrop} onClick={slotClick}
            name={name} color={color} stats={stats} kits={kits} cap={cap}/>

          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <LineupList lineup={lineup} alts={alts} form={form} onRemove={removePlayer} onRemoveAlt={removeAlt}
              onSlot={slotClick} stats={stats} cap={cap} setCap={setCap}/>
            <BenchPanel bench={bench} lineup={lineup} alts={alts} onSetAlt={benchClick} stats={stats} cap={cap} setCap={setCap}/>
          </div>

          {!mobile&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
            <SquadStats lineup={lineup}/>
          </div>}
        </main>

        {teamPicker&&<TeamPicker onSelect={loadTeam} onClose={()=>setTeamPicker(false)}/>}
        {picking&&<PlayerSearch onSelect={selectPlayer} onClose={()=>setPicking(null)} role={picking.role} lineup={lineup}/>}
        {altPick&&<AltPicker player={altPick} lineup={lineup} positions={positions} onSelect={altSlotSelect} onClose={()=>setAltPick(null)}/>}
        {pending&&<ConfirmModal team={pending} onOk={()=>doLoad(pending)} onNo={()=>setPending(null)}/>}
        {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
      </div>
    </ThemeCtx.Provider>
  );
}

