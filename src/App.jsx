import React,{useState,useRef,useEffect,useCallback,createContext,useContext} from"react";
import{PLAYERS,FORMATIONS,POSITION_COLORS,STAT_VIEWS,SERIE_A_TEAMS,NATION_FLAGS,TEAM_COLORS}from"./data/players.js";

// ═══ THEME ═══════════════════════════════════════════════════════════════════
const ThCtx=createContext("dark");
const TH={
  dark:{bg:"#0a0e1a",pn:"#111827",bd:"rgba(255,255,255,0.08)",tx:"#f9fafb",dm:"#6b7280",ft:"#374151",ib:"rgba(255,255,255,0.07)",hd:"rgba(0,0,0,0.65)",pD:"#1a4d2e",pL:"#1d5c35",ln:"rgba(255,255,255,0.28)",lb:"rgba(0,0,0,0.88)",sk:"rgba(255,255,255,0.25)"},
  light:{bg:"#f0f4f8",pn:"#fff",bd:"rgba(0,0,0,0.1)",tx:"#111827",dm:"#4b5563",ft:"#9ca3af",ib:"rgba(0,0,0,0.05)",hd:"rgba(255,255,255,0.9)",pD:"#2d6a4f",pL:"#40916c",ln:"rgba(255,255,255,0.5)",lb:"rgba(0,0,0,0.75)",sk:"rgba(0,0,0,0.22)"},
};

// ═══ HELPERS ═════════════════════════════════════════════════════════════════
const ini=n=>n.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
const rcol=r=>r>=90?"#ffd700":r>=85?"#c8c8c8":r>=80?"#cd7f32":"#6b7280";
const XLR={GK:"GK",ST:"ST",LS:"ST",RS:"ST",CF:"ST",LCB:"CB",RCB:"CB",CB:"CB",MCB:"CB",LB:"LB",LWB:"LB",RB:"RB",RWB:"RB",CDM:"DM",LCDM:"DM",RCDM:"DM",LCM:"CM",RCM:"CM",CM:"CM",CAM:"AM",LAM:"LW",RAM:"RW",LM:"LM",RM:"RM",LW:"LW",RW:"RW"};
const SK="lu_v8";
const norm=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const enc=(lu,f,n,c,a,cp,co,nm)=>{try{return btoa(unescape(encodeURIComponent(JSON.stringify({f,n,c,l:lu.map(s=>s?.id??null),a,cp,co,nm}))));}catch{return"";}};
const dec=s=>{try{return JSON.parse(decodeURIComponent(escape(atob(s))));}catch{return null;}};

// ═══ KIT SVG — Monocromatico premium ════════════════════════════════════════
// Una sola maglia con gradiente e ombre, prende solo il colore primario.
// Per il portiere: colore giallo/arancione automatico.
function KitSVG({color="#16a34a",size=32,isGK=false}) {
  const th=useContext(ThCtx);
  const c=isGK?"#d4a017":color;
  const r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16);
  const lt=`rgb(${Math.min(255,r+40)},${Math.min(255,g+40)},${Math.min(255,b+40)})`;
  const dk=`rgb(${Math.max(0,r-30)},${Math.max(0,g-30)},${Math.max(0,b-30)})`;
  const sk=th==="dark"?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.2)";
  const uid=`kg${size}${c.replace('#','')}`;
  return(
    <svg width={size} height={Math.round(size*1.2)} viewBox="0 0 60 72" style={{display:"block",flexShrink:0}}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor={lt}/><stop offset="100%" stopColor={dk}/>
        </linearGradient>
      </defs>
      {/* Body */}
      <path d="M15,17 Q30,10 45,17 L48,70 L12,70 Z" fill={`url(#${uid})`}/>
      {/* Side accent stripe */}
      <rect x="12" y="30" width="2.5" height="40" rx="1" fill="rgba(255,255,255,0.12)"/>
      <rect x="45.5" y="30" width="2.5" height="40" rx="1" fill="rgba(255,255,255,0.12)"/>
      {/* Chest highlight */}
      <path d="M22,22 Q30,18 38,22 L36,35 Q30,37 24,35 Z" fill="rgba(255,255,255,0.06)"/>
      {/* Sleeves */}
      <path d="M15,17 L3,26 L7,36 L15,30 Z" fill={dk}/>
      <path d="M45,17 L57,26 L53,36 L45,30 Z" fill={dk}/>
      {/* Collar */}
      <path d="M22,17 L30,22 L38,17" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="30" cy="15" r="1" fill="rgba(255,255,255,0.2)"/>
      {/* Seams */}
      <line x1="15" y1="17" x2="15" y2="30" stroke={sk} strokeWidth="0.3"/>
      <line x1="45" y1="17" x2="45" y2="30" stroke={sk} strokeWidth="0.3"/>
      <line x1="14" y1="69" x2="46" y2="69" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6"/>
      {/* Outline */}
      <path d="M15,17 Q30,10 45,17 L48,70 L12,70 Z" fill="none" stroke={sk} strokeWidth="0.5"/>
      <path d="M15,17 L3,26 L7,36 L15,30" fill="none" stroke={sk} strokeWidth="0.4"/>
      <path d="M45,17 L57,26 L53,36 L45,30" fill="none" stroke={sk} strokeWidth="0.4"/>
    </svg>
  );
}

// ═══ STAT BADGES ════════════════════════════════════════════════════════════
function StatBadges({player,stats}){
  if(!player)return null;
  const items=STAT_VIEWS.filter(s=>stats.includes(s.id)&&s.id!=="rating"&&player[s.id]!==undefined);
  if(!items.length)return null;
  return(<div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center",marginTop:2}}>
    {items.slice(0,2).map(sv=>{const exp=sv.id==="contract"&&player.contract<=2026;const c=exp?"#ef4444":sv.color;
      const l=sv.id==="nation"?(NATION_FLAGS[player.nation]||player.nation):sv.id==="foot"?(player.foot==="L"?"✦ Sin":"Dx"):`${sv.icon} ${sv.format(player[sv.id])}`;
      return<div key={sv.id} style={{background:c+"22",border:`1px solid ${c}66`,borderRadius:3,padding:"0 4px",fontSize:7,fontWeight:800,color:c,whiteSpace:"nowrap",lineHeight:"13px"}}>{l}</div>;
    })}
  </div>);
}

// ═══ PITCH SLOT ═════════════════════════════════════════════════════════════
function PitchSlot({slot,pos,player,alt,onDrop,onClick,tColor,stats,kits,cap,numbers={}}){
  const[over,setOver]=useState(false);const th=useContext(ThCtx);const T=TH[th];
  const c=POSITION_COLORS[pos.role]||"#6b7280";const b=tColor||c;const cnt=useRef(0);
  const ds=e=>{if(!player)return;e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",JSON.stringify({id:player.id,slot}));};
  const de=e=>{e.preventDefault();cnt.current++;setOver(true);};
  const dv=e=>{e.preventDefault();};
  const dl=()=>{cnt.current--;if(cnt.current<=0){cnt.current=0;setOver(false);}};
  const dd=e=>{e.preventDefault();cnt.current=0;setOver(false);try{onDrop(slot,JSON.parse(e.dataTransfer.getData("text/plain")));}catch{}};
  // Touch drag
  const timerRef=useRef(null);const ghostRef=useRef(null);
  const tStart=e=>{if(!player)return;const t=e.touches[0];
    timerRef.current=setTimeout(()=>{
      const g=document.createElement("div");g.id="tg";
      g.style.cssText=`position:fixed;pointer-events:none;z-index:9999;width:46px;height:46px;border-radius:50%;background:${b}55;border:3px solid ${b};display:flex;align-items:center;justify-content:center;font:800 13px sans-serif;color:#fff;transform:translate(-50%,-65%);box-shadow:0 4px 16px ${b}99;left:${t.clientX}px;top:${t.clientY}px;`;
      g.textContent=ini(player.name);document.body.appendChild(g);ghostRef.current=g;
      if(navigator.vibrate)navigator.vibrate(30);
    },250);
  };
  const tMove=e=>{
    if(!ghostRef.current){clearTimeout(timerRef.current);return;}
    e.preventDefault();const t=e.touches[0];
    ghostRef.current.style.left=t.clientX+"px";ghostRef.current.style.top=t.clientY+"px";
  };
  const tEnd=e=>{
    clearTimeout(timerRef.current);if(!ghostRef.current)return;
    ghostRef.current.remove();ghostRef.current=null;
    const t=e.changedTouches[0];const el=document.elementFromPoint(t.clientX,t.clientY);
    const slotEl=el?.closest("[data-slot]");
    if(slotEl){onDrop(parseInt(slotEl.dataset.slot),{id:player.id,slot});}
    else{// Drop on pitch bg — free position
      const pitch=el?.closest("[data-pitch]");
      if(pitch){const r=pitch.getBoundingClientRect();
        const xP=Math.max(5,Math.min(95,((t.clientX-r.left)/r.width)*100));
        const yP=Math.max(5,Math.min(95,((t.clientY-r.top)/r.height)*100));
        // Dispatch custom event for pitch to handle
        pitch.dispatchEvent(new CustomEvent("touchdrop",{detail:{slot,x:xP,y:yP}}));
      }
    }
  };
  const S={position:"absolute",left:`${pos.x}%`,top:`${pos.y}%`,transform:"translate(-50%,-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:2,zIndex:over?20:10};
  if(!player)return(
    <div data-slot={slot} style={S} onDragEnter={de} onDragOver={dv} onDragLeave={dl} onDrop={dd}>
      <div onClick={()=>onClick(slot)} style={{width:44,height:44,borderRadius:"50%",border:`2px dashed ${c}`,backgroundColor:over?c+"33":c+"11",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:c+"bb",cursor:"pointer",transform:over?"scale(1.15)":"scale(1)",transition:"all .12s"}}>+</div>
      <div style={{background:T.lb,borderRadius:4,padding:"1px 6px",fontSize:9,color:c,fontWeight:700}}>{pos.role}</div>
    </div>
  );
  return(
    <div data-slot={slot} style={S} onDragEnter={de} onDragOver={dv} onDragLeave={dl} onDrop={dd}>
      <div draggable onDragStart={ds} onTouchStart={tStart} onTouchMove={tMove} onTouchEnd={tEnd}
        onClick={()=>onClick(slot)} style={{position:"relative",cursor:"grab",transform:over?"scale(1.15)":"scale(1)",transition:"transform .12s",userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none",touchAction:"none"}}>
        {kits?<KitSVG color={tColor||c} size={40} isGK={pos.role==="GK"}/>
          :<div style={{width:44,height:44,borderRadius:"50%",backgroundColor:c+"22",border:`3px solid ${b}`,boxShadow:`0 0 10px ${b}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:c,fontFamily:"'Barlow Condensed',sans-serif"}}>{ini(player.name)}</div>}
        {stats.includes("age")&&<div style={{position:"absolute",top:-4,left:-4,background:"#3b82f6",color:"#fff",fontSize:7,fontWeight:800,borderRadius:3,padding:"0 2px",lineHeight:"13px"}}>{player.age}a</div>}
        {stats.includes("foot")&&<div style={{position:"absolute",bottom:-2,left:-2,background:player.foot==="L"?"#ec4899":"#6b7280",color:"#fff",fontSize:6,fontWeight:800,borderRadius:2,padding:"0 2px",lineHeight:"11px"}}>{player.foot==="L"?"✦L":"R"}</div>}
        {numbers[slot]&&<div style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",fontSize:9,fontWeight:900,color:"rgba(255,255,255,0.7)",textShadow:"0 1px 2px rgba(0,0,0,0.5)",pointerEvents:"none"}}>{numbers[slot]}</div>}
        {stats.includes("rating")&&<div style={{position:"absolute",top:-4,right:-4,background:rcol(player.rating),color:"#000",fontSize:8,fontWeight:800,borderRadius:3,padding:"0 2px",lineHeight:"13px",minWidth:13,textAlign:"center"}}>{player.rating}</div>}
      </div>
      <div style={{background:T.lb,borderRadius:5,padding:"1px 5px",maxWidth:82,textAlign:"center"}} onClick={()=>onClick(slot)}>
        <div style={{fontSize:8,color:"#9ca3af",fontWeight:700}}>{pos.role}{pos.y<35&&pos.role!=="ST"&&pos.role!=="RW"&&pos.role!=="LW"?" ↑ATT":""}{pos.y>65&&pos.role!=="GK"&&pos.role!=="CB"&&pos.role!=="RB"&&pos.role!=="LB"?" ↓DIF":""}</div>
        <div style={{fontSize:10,color:"#fff",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {cap===player.id&&<span style={{color:"#ffd700",marginRight:2}}>★</span>}{player.shortName}
        </div>
        {alt&&<div style={{fontSize:8,color:"#16a34a",fontWeight:600,borderTop:"1px solid rgba(22,163,74,0.3)",marginTop:1,paddingTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>↕ {alt.shortName}</div>}
      </div>
      <StatBadges player={player} stats={stats}/>
    </div>
  );
}

// ═══ PITCH ═══════════════════════════════════════════════════════════════════
function PitchView({lineup,alts,form,onDrop,onClick,name,color,stats,kits,cap,customPos={},onPitchDrop,coach,numbers={}}){
  const th=useContext(ThCtx);const T=TH[th];
  const base=FORMATIONS[form]?.positions||[];
  const positions=base.map(p=>customPos[p.slot]?{...p,x:customPos[p.slot].x,y:customPos[p.slot].y}:p);
  const pitchRef=useRef();
  useEffect(()=>{
    const el=pitchRef.current;if(!el)return;
    const handler=e=>{if(onPitchDrop)onPitchDrop(e.detail.slot,e.detail.x,e.detail.y);};
    el.addEventListener("touchdrop",handler);return()=>el.removeEventListener("touchdrop",handler);
  },[onPitchDrop]);
  return(
    <div ref={pitchRef} data-pitch="1" style={{position:"relative",width:"100%",paddingBottom:"150%",userSelect:"none",WebkitUserSelect:"none"}}
      onDragOver={e=>e.preventDefault()}
      onDrop={e=>{e.preventDefault();const tgt=e.target.closest("[data-slot]");if(tgt)return;
        try{const d=JSON.parse(e.dataTransfer.getData("text/plain"));if(d.slot===undefined)return;
          const r=e.currentTarget.getBoundingClientRect();
          const x=Math.max(5,Math.min(95,((e.clientX-r.left)/r.width)*100));
          const y=Math.max(5,Math.min(95,((e.clientY-r.top)/r.height)*100));
          if(onPitchDrop)onPitchDrop(d.slot,x,y);
        }catch{}}}>
      <svg viewBox="0 0 300 450" style={{position:"absolute",inset:0,width:"100%",height:"100%"}}>
        <defs><linearGradient id="gf" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor={T.pD}/><stop offset="100%" stopColor={T.pL}/></linearGradient></defs>
        <rect width="300" height="450" fill="url(#gf)" rx="8"/>
        {[0,1,2,3,4,5,6,7].map(i=><rect key={i} x="0" y={i*57} width="300" height="28" fill={i%2===0?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.02)"}/>)}
        <g fill="none" stroke={T.ln} strokeWidth="1.3">
          <rect x="10" y="10" width="280" height="430" rx="2"/><line x1="10" y1="225" x2="290" y2="225"/>
          <circle cx="150" cy="225" r="36"/><circle cx="150" cy="225" r="2.5" fill={T.ln} stroke="none"/>
          <rect x="56" y="350" width="188" height="80"/><rect x="100" y="390" width="100" height="40"/>
          <rect x="56" y="20" width="188" height="80"/><rect x="100" y="20" width="100" height="40"/>
          <path d="M 100 122 A 36 36 0 0 0 200 122"/><path d="M 100 328 A 36 36 0 0 1 200 328"/>
        </g>
        {name&&<text x="150" y="226" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.04)" fontSize="19" fontFamily="'Barlow Condensed',sans-serif" fontWeight="900" letterSpacing="3">{name.toUpperCase()}</text>}
      </svg>
      {/* Coach name top-right */}
      {coach&&<div style={{position:"absolute",top:6,right:8,background:"rgba(0,0,0,0.5)",borderRadius:6,padding:"3px 8px",fontSize:10,color:"#fff",fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:"0.5px"}}>🧑💼 {coach}</div>}
      {positions.map(p=>(
        <PitchSlot key={p.slot} slot={p.slot} pos={p} player={lineup[p.slot]||null}
          alt={alts[p.slot]?PLAYERS.find(x=>x.id===alts[p.slot])||null:null}
          onDrop={onDrop} onClick={onClick} tColor={color} stats={stats} kits={kits} cap={cap} numbers={numbers}/>
      ))}
    </div>
  );
}

// ═══ EXPORT CANVAS ══════════════════════════════════════════════════════════
function ExportCanvas({lineup,form,name,color,stats,coach,onDone,customPos={},numbers={}}){
  const ref=useRef();
  useEffect(()=>{
    const c=ref.current,ctx=c.getContext("2d");const W=800,H=1100;c.width=W;c.height=H;
    // Background gradient
    const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#0a0e1a");bg.addColorStop(0.15,"#111827");bg.addColorStop(1,"#0a0e1a");
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    // Header bar
    const hg=ctx.createLinearGradient(0,0,W,0);hg.addColorStop(0,color||"#16a34a");hg.addColorStop(1,(color||"#16a34a")+"cc");
    ctx.fillStyle=hg;ctx.beginPath();ctx.roundRect(0,0,W,80,0);ctx.fill();
    // Team name
    ctx.fillStyle="#fff";ctx.font="900 38px 'Barlow Condensed',sans-serif";ctx.textAlign="center";ctx.fillText(name.toUpperCase(),W/2,42);
    // Coach + formation
    ctx.font="400 16px sans-serif";ctx.fillStyle="rgba(255,255,255,0.75)";
    ctx.fillText(coach?coach+" · "+form:form,W/2,66);
    // Field
    const FY=95,FH=780;
    const fg=ctx.createLinearGradient(40,FY,40,FY+FH);fg.addColorStop(0,"#1a5c35");fg.addColorStop(1,"#1a4d2e");
    ctx.fillStyle=fg;ctx.beginPath();ctx.roundRect(40,FY,W-80,FH,10);ctx.fill();
    // Field stripes
    for(let i=0;i<8;i++){ctx.fillStyle=i%2===0?"rgba(0,0,0,0.04)":"rgba(255,255,255,0.015)";ctx.fillRect(40,FY+i*(FH/8),W-80,FH/8);}
    // Field lines
    ctx.strokeStyle="rgba(255,255,255,0.25)";ctx.lineWidth=1.5;
    ctx.strokeRect(60,FY+10,W-120,FH-20);
    ctx.beginPath();ctx.moveTo(60,FY+FH/2);ctx.lineTo(W-60,FY+FH/2);ctx.stroke();
    ctx.beginPath();ctx.arc(W/2,FY+FH/2,50,0,Math.PI*2);ctx.stroke();
    ctx.strokeRect(120,FY+10,W-240,120);ctx.strokeRect(120,FY+FH-130,W-240,120);
    // Players
    const base=FORMATIONS[form]?.positions||[];
    const positions=base.map(p=>customPos[p.slot]?{...p,x:customPos[p.slot].x,y:customPos[p.slot].y}:p);
    positions.forEach(pos=>{const pl=lineup[pos.slot];if(!pl)return;
      const px=60+(pos.x/100)*(W-120),py=FY+10+(pos.y/100)*(FH-20);
      const col=POSITION_COLORS[pos.role]||"#6b7280";
      // Draw kit on canvas
      const kc=color||col;
      const kr=parseInt(kc.slice(1,3),16)||80,kg=parseInt(kc.slice(3,5),16)||80,kb=parseInt(kc.slice(5,7),16)||80;
      const klt=`rgb(${Math.min(255,kr+35)},${Math.min(255,kg+35)},${Math.min(255,kb+35)})`;
      const kdk=`rgb(${Math.max(0,kr-25)},${Math.max(0,kg-25)},${Math.max(0,kb-25)})`;
      const isGK=pos.role==="GK";
      const sc=isGK?"#d4a017":kc;const slt=isGK?"#e6b422":klt;const sdk=isGK?"#b8860b":kdk;
      // Body
      const kg2=ctx.createLinearGradient(px-18,py-22,px+18,py+20);kg2.addColorStop(0,slt);kg2.addColorStop(1,sdk);
      ctx.fillStyle=kg2;
      ctx.beginPath();ctx.moveTo(px-14,py-18);ctx.quadraticCurveTo(px,py-24,px+14,py-18);ctx.lineTo(px+16,py+20);ctx.lineTo(px-16,py+20);ctx.closePath();ctx.fill();
      // Sleeves
      ctx.fillStyle=sdk;
      ctx.beginPath();ctx.moveTo(px-14,py-18);ctx.lineTo(px-24,py-10);ctx.lineTo(px-20,py-2);ctx.lineTo(px-14,py-8);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(px+14,py-18);ctx.lineTo(px+24,py-10);ctx.lineTo(px+20,py-2);ctx.lineTo(px+14,py-8);ctx.closePath();ctx.fill();
      // Collar
      ctx.strokeStyle="rgba(255,255,255,0.3)";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(px-6,py-18);ctx.lineTo(px,py-14);ctx.lineTo(px+6,py-18);ctx.stroke();
      // Number on kit
      const num=customPos[pos.slot]?"":(numbers||{})[pos.slot]||"";
      if(num){ctx.fillStyle="rgba(255,255,255,0.6)";ctx.font="bold 12px sans-serif";ctx.textAlign="center";ctx.fillText(num,px,py+6);}
      else{ctx.fillStyle="rgba(255,255,255,0.7)";ctx.font="800 14px sans-serif";ctx.textAlign="center";ctx.fillText(ini(pl.name),px,py+4);}
      // Rating
      ctx.fillStyle=rcol(pl.rating);ctx.beginPath();ctx.roundRect(px+16,py-36,26,18,4);ctx.fill();
      ctx.fillStyle="#000";ctx.font="bold 12px sans-serif";ctx.fillText(pl.rating,px+29,py-23);
      // Name tag
      ctx.fillStyle="rgba(0,0,0,0.8)";ctx.beginPath();ctx.roundRect(px-40,py+30,80,24,5);ctx.fill();
      ctx.fillStyle="#aaa";ctx.font="bold 8px sans-serif";ctx.fillText(pos.role,px,py+40);
      ctx.fillStyle="#fff";ctx.font="bold 11px sans-serif";
      ctx.fillText(pl.shortName.length>10?pl.shortName.slice(0,9)+"..":pl.shortName,px,py+51);
    });
    // Stats bar
    const filled=lineup.filter(Boolean);
    if(filled.length){
      const SY=FY+FH+15;
      ctx.fillStyle="rgba(255,255,255,0.03)";ctx.beginPath();ctx.roundRect(40,SY,W-80,90,10);ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,0.06)";ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(40,SY,W-80,90,10);ctx.stroke();
      const avgR=(filled.reduce((a,p)=>a+p.rating,0)/filled.length).toFixed(1);
      const avgA=(filled.reduce((a,p)=>a+(p.age||0),0)/filled.length).toFixed(1);
      const totV=filled.reduce((a,p)=>a+(p.value||0),0);
      const totW=(filled.reduce((a,p)=>a+(p.wage||0),0)/1000).toFixed(1);
      const metrics=[
        {l:"OVR",v:avgR,c:rcol(parseFloat(avgR))},
        {l:"Valore",v:"€"+totV+"M",c:"#16a34a"},
        {l:"Stipendi/a",v:"€"+totW+"M",c:"#f59e0b"},
        {l:"Età media",v:avgA+"a",c:"#3b82f6"},
        {l:"Giocatori",v:filled.length+"/11",c:"#9ca3af"},
      ];
      metrics.forEach((m,i)=>{const x=40+(W-80)/5*i+(W-80)/10;
        ctx.fillStyle=m.c;ctx.font="bold 24px sans-serif";ctx.textAlign="center";ctx.fillText(m.v,x,SY+38);
        ctx.fillStyle="rgba(255,255,255,0.35)";ctx.font="11px sans-serif";ctx.fillText(m.l,x,SY+58);
      });
    }
    // Watermark
    ctx.fillStyle="rgba(255,255,255,0.12)";ctx.font="bold 11px sans-serif";ctx.textAlign="right";
    ctx.fillText("universosportivo.com",W-20,H-10);
    // Download
    const a=document.createElement("a");a.download=(name||"lineup").replace(/\s/g,"-")+"-lineup.png";a.href=c.toDataURL("image/png");a.click();onDone();
  },[]);
  return<canvas ref={ref} style={{display:"none"}}/>;
}
// ═══ TEAM PICKER ════════════════════════════════════════════════════════════
function TeamPicker({onSelect,onClose}){const th=useContext(ThCtx);const T=TH[th];return(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:T.pn,borderRadius:16,width:"100%",maxWidth:500,border:`1px solid ${T.bd}`,maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:T.pn,zIndex:1}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:700,color:T.tx}}>Carica squadra Serie A</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:T.dm,cursor:"pointer",fontSize:20}}>✕</button>
      </div>
      <div style={{padding:14,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {SERIE_A_TEAMS.map(team=>(
          <button key={team.name} onClick={()=>onSelect(team)}
            style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"12px 8px",background:T.ib,border:`1px solid ${team.color}44`,borderRadius:10,cursor:"pointer"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=team.color;e.currentTarget.style.background=team.color+"18";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=team.color+"44";e.currentTarget.style.background=T.ib;}}>
            <KitSVG color={team.color} size={36}/>
            <div style={{fontSize:11,fontWeight:700,color:T.tx,textAlign:"center"}}>{team.name}</div>
            <div style={{fontSize:9,color:T.dm}}>{team.formation} · OVR {team.rating}</div>
          </button>
        ))}
      </div>
    </div>
  </div>
);}

// ═══ PLAYER SEARCH ══════════════════════════════════════════════════════════
function PlayerSearch({onSelect,onClose,role,lineup,isAlt,teamName}){const th=useContext(ThCtx);const T=TH[th];
  const roleToFilter=r=>{if(!r)return"ALL";if(r==="GK")return"GK";if(["CB","RB","LB"].includes(r))return"DEF";if(["DM","CM","AM","RM","LM"].includes(r))return"MID";if(["ST","RW","LW"].includes(r))return"ATT";return"ALL";};
  const[q,setQ]=useState("");const[pf,setPf]=useState(()=>roleToFilter(role));const[cf,setCf]=useState("ALL");
  const[minR,setMinR]=useState(60);const[minA,setMinA]=useState(16);const[maxA,setMaxA]=useState(40);
  const[minW,setMinW]=useState(0);const[maxW,setMaxW]=useState(15);const[minV,setMinV]=useState(0);const[maxV,setMaxV]=useState(200);
  const[footF,setFootF]=useState("ALL");const[conF,setConF]=useState("ALL");const[adv,setAdv]=useState(false);
  const ref=useRef();useEffect(()=>{const t=setTimeout(()=>ref.current?.focus(),400);return()=>clearTimeout(t);},[]);
  const PM={DEF:["CB","RB","LB"],MID:["DM","CM","AM","RM","LM"],ATT:["ST","RW","LW"]};
  const clubs=["ALL",...new Set(PLAYERS.map(p=>p.club))];const used=new Set(lineup.filter(Boolean).map(p=>p.id));
  const list=PLAYERS.filter(p=>{
    if(!isAlt&&used.has(p.id))return false;if(q&&!norm(p.name).includes(norm(q))&&!norm(p.club).includes(norm(q)))return false;
    if(pf!=="ALL"&&!(pf==="GK"&&p.position==="GK")&&!(PM[pf]?.includes(p.position)))return false;
    if(cf!=="ALL"&&p.club!==cf)return false;if(p.rating<minR)return false;if(minA>16&&p.age<minA)return false;if(maxA<40&&p.age>maxA)return false;
    const wM=p.wage/1000;if(minW>0&&wM<minW)return false;if(maxW<15&&wM>maxW)return false;
    if(minV>0&&p.value<minV)return false;if(maxV<200&&p.value>maxV)return false;
    if(footF!=="ALL"&&p.foot!==footF)return false;if(conF==="exp"&&p.contract>2026)return false;if(conF==="safe"&&p.contract<=2026)return false;return true;
  }).sort((a,b)=>b.rating-a.rating);
  const pill=(active,fn,label,col="#16a34a")=><button onClick={fn} style={{padding:"3px 9px",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer",border:"1px solid",background:active?col:"transparent",borderColor:active?col:"rgba(128,128,128,0.3)",color:active?"#fff":T.dm}}>{label}</button>;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:12}}>
      <div style={{background:T.pn,borderRadius:16,width:"100%",maxWidth:520,maxHeight:"92vh",display:"flex",flexDirection:"column",border:`1px solid ${T.bd}`}}>
        <div style={{padding:"12px 14px",borderBottom:`1px solid ${T.bd}`,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,fontWeight:700,color:T.tx}}>
              {isAlt?"Scegli riserva":"Scegli giocatore"} {role&&<span style={{marginLeft:7,fontSize:11,color:POSITION_COLORS[role]||"#6b7280",background:(POSITION_COLORS[role]||"#6b7280")+"22",padding:"2px 6px",borderRadius:4,fontWeight:600}}>{role}</span>}
            </div><button onClick={onClose} style={{background:"none",border:"none",color:T.dm,cursor:"pointer",fontSize:20}}>✕</button>
          </div>
          <input ref={ref} value={q} onChange={e=>setQ(e.target.value)} placeholder="Cerca per nome o club..." style={{width:"100%",background:T.ib,border:`1px solid ${T.bd}`,borderRadius:7,padding:"7px 11px",color:T.tx,fontSize:16,outline:"none",boxSizing:"border-box",marginBottom:7}}/>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>
            {["ALL","GK","DEF","MID","ATT"].map(g=>pill(pf===g,()=>setPf(g),g))}
            {teamName&&teamName!=="La mia Squadra"&&pill(cf===teamName,()=>setCf(cf===teamName?"ALL":teamName),teamName,"#d97706")}
            <button onClick={()=>setAdv(s=>!s)} style={{marginLeft:"auto",padding:"3px 9px",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer",border:"1px solid",background:adv?"rgba(99,102,241,0.2)":"transparent",borderColor:adv?"#6366f1":"rgba(128,128,128,0.3)",color:adv?"#6366f1":T.dm}}>⚙ {adv?"▲":"▼"}</button>
          </div>
          {adv&&<div style={{background:T.ib,borderRadius:8,padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:10,color:T.dm,width:64}}>Squadra</span>
              <select value={cf} onChange={e=>setCf(e.target.value)} style={{flex:1,background:T.ib,border:`1px solid ${T.bd}`,borderRadius:5,padding:"4px 8px",color:T.dm,fontSize:11,outline:"none"}}>{clubs.map(c=><option key={c} value={c}>{c==="ALL"?"Tutte":c}</option>)}</select></div>
            {[{l:"Rating min",v:minR,s:setMinR,mn:60,mx:90,st:1,cl:"#ffd700",f:v=>v},{l:"Età min",v:minA,s:setMinA,mn:16,mx:40,st:1,cl:"#3b82f6",f:v=>v<=16?"—":v+"a"},{l:"Età max",v:maxA,s:setMaxA,mn:16,mx:40,st:1,cl:"#3b82f6",f:v=>v>=40?"∞":v+"a"},
              {l:"Stip min M€/a",v:minW,s:setMinW,mn:0,mx:15,st:0.5,cl:"#f59e0b",f:v=>v<=0?"—":"€"+v+"M"},{l:"Stip max M€/a",v:maxW,s:setMaxW,mn:0,mx:15,st:0.5,cl:"#f59e0b",f:v=>v>=15?"∞":"€"+v+"M"},
              {l:"Valore min €M",v:minV,s:setMinV,mn:0,mx:200,st:5,cl:"#16a34a",f:v=>v<=0?"—":"€"+v+"M"},{l:"Valore max €M",v:maxV,s:setMaxV,mn:0,mx:200,st:5,cl:"#16a34a",f:v=>v>=200?"∞":"€"+v+"M"},
            ].map(x=><div key={x.l} style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:10,color:T.dm,width:80,flexShrink:0}}>{x.l}</span>
              <input type="range" min={x.mn} max={x.mx} step={x.st} value={x.v} onChange={e=>x.s(+e.target.value)} style={{flex:1,accentColor:x.cl}}/>
              <span style={{fontSize:11,fontWeight:800,color:x.cl,width:40,textAlign:"right"}}>{x.f(x.v)}</span></div>)}
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:10,color:T.dm,width:64}}>Piede</span>{[["ALL","Tutti"],["R","Destro"],["L","Mancino"]].map(([v,l])=>pill(footF===v,()=>setFootF(v),l,"#ec4899"))}</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:10,color:T.dm,width:64}}>Contratto</span>{[["ALL","Tutti"],["exp","In scad."],["safe","Sicuri"]].map(([v,l])=>pill(conF===v,()=>setConF(v),l,"#f97316"))}</div>
          </div>}
          <div style={{fontSize:10,color:T.dm,textAlign:"right",marginTop:4}}>{list.length} giocatori</div>
        </div>
        <div style={{overflowY:"auto",flex:1}}>
          {list.length===0?<div style={{padding:28,textAlign:"center",color:T.dm}}>Nessun giocatore trovato</div>
          :list.map(p=>{const exp=p.contract<=2026;return(
            <div key={p.id} onClick={()=>onSelect(p)} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 14px",cursor:"pointer",borderBottom:`1px solid ${T.bd}`}}
              onMouseEnter={e=>e.currentTarget.style.background=T.ib} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <KitSVG color={TEAM_COLORS[p.club]||"#555"} size={26} isGK={p.position==="GK"}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:T.tx}}>{p.name} <span style={{fontSize:11}}>{NATION_FLAGS[p.nation]||""}</span>{p.foot==="L"&&<span style={{fontSize:9,color:"#ec4899",marginLeft:4}}>✦</span>}</div>
                <div style={{fontSize:10,color:T.dm}}>{p.club} · {p.age}a · €{p.value}M · €{(p.wage/1000).toFixed(1)}M/a{exp&&<span style={{color:"#ef4444",marginLeft:5}}>⚠{p.contract}</span>}</div>
              </div>
              <div style={{fontSize:9,color:POSITION_COLORS[p.position]||"#6b7280",background:(POSITION_COLORS[p.position]||"#6b7280")+"22",padding:"1px 5px",borderRadius:3,fontWeight:700}}>{p.position}</div>
              <div style={{fontSize:13,fontWeight:800,color:rcol(p.rating),width:24,textAlign:"right"}}>{p.rating}</div>
            </div>);})}
        </div>
      </div>
    </div>);
}

// ═══ PANELS ═════════════════════════════════════════════════════════════════
function Settings({name,setName,color,setColor,form,setForm,kits,setKits,onPick,alt,setAlt,coach,setCoach}){const th=useContext(ThCtx);const T=TH[th];
  const colors=["#16a34a","#2563eb","#dc2626","#d97706","#7c3aed","#db2777","#0891b2","#e5e7eb","#000","#8B2500","#8B0000","#003399"];
  const cats=[...new Set(Object.values(FORMATIONS).map(f=>f.category))];
  return(<div style={{background:T.pn,borderRadius:12,border:`1px solid ${T.bd}`,overflow:"hidden"}}>
    <button onClick={onPick} style={{width:"100%",padding:"10px 12px",background:"rgba(22,163,74,0.12)",border:"none",borderBottom:`1px solid ${T.bd}`,color:"#16a34a",fontSize:12,fontWeight:700,cursor:"pointer"}}>🏟️ Carica squadra Serie A</button>
    <div style={{padding:"9px 12px",borderBottom:`1px solid ${T.bd}`}}>
      <div style={{fontSize:9,fontWeight:700,color:T.dm,letterSpacing:"1px",textTransform:"uppercase",marginBottom:4}}>Nome squadra</div>
      <input value={name} onChange={e=>setName(e.target.value)} maxLength={24} style={{width:"100%",background:T.ib,border:`1px solid ${T.bd}`,borderRadius:7,padding:"6px 9px",color:T.tx,fontSize:16,outline:"none",boxSizing:"border-box"}}/>
    </div>
    <div style={{padding:"9px 12px",borderBottom:`1px solid ${T.bd}`}}>
      <div style={{fontSize:9,fontWeight:700,color:T.dm,letterSpacing:"1px",textTransform:"uppercase",marginBottom:4}}>Allenatore</div>
      <input value={coach} onChange={e=>setCoach(e.target.value)} maxLength={24} placeholder="Nome allenatore..." style={{width:"100%",background:T.ib,border:`1px solid ${T.bd}`,borderRadius:7,padding:"6px 9px",color:T.tx,fontSize:16,outline:"none",boxSizing:"border-box"}}/>
    </div>
    <div style={{padding:"9px 12px",borderBottom:`1px solid ${T.bd}`}}>
      <div style={{fontSize:9,fontWeight:700,color:T.dm,letterSpacing:"1px",textTransform:"uppercase",marginBottom:4}}>Colore</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{colors.map(c=><div key={c} onClick={()=>setColor(c)} style={{width:18,height:18,borderRadius:"50%",backgroundColor:c,cursor:"pointer",border:color===c?`2.5px solid ${th==="dark"?"#fff":"#333"}`:"2px solid rgba(128,128,128,0.3)"}}/>)}</div>
    </div>
    <div style={{padding:"9px 12px",borderBottom:`1px solid ${T.bd}`}}>
      <div style={{fontSize:9,fontWeight:700,color:T.dm,letterSpacing:"1px",textTransform:"uppercase",marginBottom:4}}>Modulo</div>
      {cats.map(cat=><div key={cat} style={{marginBottom:6}}>
        <div style={{fontSize:8,color:T.ft,fontWeight:700,marginBottom:3,textTransform:"uppercase"}}>{cat}</div>
        <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{Object.entries(FORMATIONS).filter(([,f])=>f.category===cat).map(([k])=>(
          <button key={k} onClick={()=>setForm(k)} style={{padding:"2px 6px",borderRadius:4,fontSize:9,fontWeight:700,cursor:"pointer",border:"1px solid",background:form===k?color:"transparent",borderColor:form===k?color:"rgba(128,128,128,0.3)",color:form===k?(color==="#e5e7eb"?"#000":"#fff"):T.dm}}>{k}</button>
        ))}</div>
      </div>)}
    </div>
    <div style={{padding:"8px 12px"}}>
      <button onClick={()=>setKits(s=>!s)} style={{width:"100%",padding:"6px",borderRadius:6,border:`1px solid ${kits?"#16a34a":"rgba(128,128,128,0.3)"}`,background:kits?"rgba(22,163,74,0.1)":"transparent",color:kits?"#16a34a":T.dm,fontSize:11,fontWeight:600,cursor:"pointer"}}>{kits?"✓ Kit abilitati":"⚽ Mostra kit"}</button>
      <button onClick={()=>setAlt(!alt)} style={{width:"100%",padding:"6px",borderRadius:6,border:`1px solid ${alt?"#16a34a":"rgba(128,128,128,0.3)"}`,background:alt?"rgba(22,163,74,0.1)":"transparent",color:alt?"#16a34a":T.dm,fontSize:11,fontWeight:600,cursor:"pointer",marginTop:4}}>{alt?"✓ Riserve attive":"↕ Riserve"}</button>
    </div>
  </div>);
}

function StatSel({stats,setStats}){const th=useContext(ThCtx);const T=TH[th];const toggle=id=>setStats(p=>p.includes(id)?p.filter(s=>s!==id):[...p,id]);const nr=stats.filter(s=>s!=="rating").length;
  return(<div style={{background:T.pn,borderRadius:12,border:`1px solid ${T.bd}`,padding:"9px 12px"}}>
    <div style={{fontSize:9,fontWeight:700,color:T.dm,letterSpacing:"1px",textTransform:"uppercase",marginBottom:6}}>Info visibili</div>
    {STAT_VIEWS.map(sv=>{const a=stats.includes(sv.id);const bl=!a&&sv.id!=="rating"&&nr>=2;return(
      <button key={sv.id} onClick={()=>{if(!bl)toggle(sv.id);}} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 9px",borderRadius:6,border:`1px solid ${a?sv.color:T.bd}`,background:a?sv.color+"18":"transparent",cursor:bl?"not-allowed":"pointer",width:"100%",marginBottom:3,opacity:bl?0.4:1}}>
        <span style={{fontSize:12}}>{sv.icon}</span><span style={{fontSize:10,fontWeight:600,color:a?sv.color:T.dm,flex:1}}>{sv.label}</span>
        <div style={{width:13,height:13,borderRadius:3,background:a?sv.color:"transparent",border:`1.5px solid ${a?sv.color:T.ft}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#000"}}>{a?"✓":""}</div>
      </button>);})}
  </div>);
}

function LineupList({lineup,alts,form,onRemove,onRemoveAlt,onSlot,stats,cap,setCap,numbers={},setNumbers}){const th=useContext(ThCtx);const T=TH[th];const positions=FORMATIONS[form]?.positions||[];const sh=STAT_VIEWS.filter(s=>stats.includes(s.id)&&s.id!=="rating");
  return(<div style={{background:T.pn,borderRadius:12,border:`1px solid ${T.bd}`,overflow:"hidden"}}>
    <div style={{padding:"9px 12px",borderBottom:`1px solid ${T.bd}`}}><span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:700,color:T.tx}}>XI ({lineup.filter(Boolean).length}/11)</span></div>
    <div style={{maxHeight:480,overflowY:"auto"}}>{positions.map(pos=>{const p=lineup[pos.slot];const alt=alts[pos.slot]?PLAYERS.find(x=>x.id===alts[pos.slot]):null;const rc2=POSITION_COLORS[pos.role]||"#6b7280";
      return(<div key={pos.slot} style={{borderBottom:`1px solid ${T.bd}`}}>
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",cursor:"pointer",minHeight:34}} onClick={()=>onSlot(pos.slot)}>
          <div style={{width:24,fontSize:8,fontWeight:700,color:rc2,background:rc2+"22",borderRadius:3,textAlign:"center",padding:"2px",flexShrink:0}}>{pos.role}</div>
          {p?<><KitSVG color={TEAM_COLORS[p.club]||"#555"} size={22} isGK={p.position==="GK"}/><div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:700,color:T.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cap===p.id&&<span style={{color:"#ffd700",marginRight:2}}>★</span>}{p.shortName}{p.foot==="L"&&<span style={{fontSize:8,color:"#ec4899",marginLeft:2}}>✦</span>}{p.contract<=2026&&<span style={{fontSize:8,color:"#ef4444",marginLeft:2}}>⚠</span>}</div>
            {sh.length>0&&<div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{sh.map(sv=>p[sv.id]!==undefined&&<span key={sv.id} style={{fontSize:8,color:sv.id==="contract"&&p.contract<=2026?"#ef4444":sv.color,fontWeight:700}}>{sv.id==="nation"?NATION_FLAGS[p.nation]||p.nation:sv.id==="foot"?(p.foot==="L"?"✦":"Dx"):`${sv.icon}${sv.format(p[sv.id])}`}</span>)}</div>}
          </div>{stats.includes("rating")&&<div style={{fontSize:10,fontWeight:800,color:rcol(p.rating),flexShrink:0}}>{p.rating}</div>}
            <input value={numbers[pos.slot]||""} onClick={e=>e.stopPropagation()} onChange={e=>{e.stopPropagation();setNumbers(prev=>({...prev,[pos.slot]:e.target.value.slice(0,2)}));}} placeholder="#" maxLength={2}
              style={{width:22,background:T.ib,border:`1px solid ${T.bd}`,borderRadius:3,padding:"1px 2px",color:T.tx,fontSize:9,textAlign:"center",outline:"none",flexShrink:0}}/>
            <button onClick={e=>{e.stopPropagation();setCap(p.id);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:cap===p.id?"#ffd700":T.ft,padding:2,flexShrink:0}}>★</button>
            <button onClick={e=>{e.stopPropagation();onRemove(pos.slot);}} style={{background:"none",border:"none",color:T.ft,cursor:"pointer",fontSize:11,padding:2,flexShrink:0}}>✕</button>
          </>:<div style={{fontSize:10,color:T.ft,fontStyle:"italic"}}>+ Aggiungi {pos.role}</div>}
        </div>
        {alt&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"3px 10px 4px 36px",background:"rgba(22,163,74,0.06)"}}>
          <span style={{fontSize:9,color:"#16a34a",fontWeight:700}}>↕</span><KitSVG color={TEAM_COLORS[alt.club]||"#555"} size={18}/>
          <div style={{flex:1,fontSize:10,color:"#16a34a",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{alt.shortName}</div>
          <button onClick={()=>onRemoveAlt(pos.slot)} style={{background:"none",border:"none",color:T.ft,cursor:"pointer",fontSize:10}}>✕</button>
        </div>}
      </div>);})}</div>
  </div>);
}

function BenchPanel({bench,lineup,alts,onSetAlt,stats,cap,setCap}){const th=useContext(ThCtx);const T=TH[th];const[sort,setSort]=useState("rating");
  const ids=new Set(lineup.filter(Boolean).map(p=>p.id));const list=bench.filter(p=>!ids.has(p.id)).sort((a,b)=>sort==="rating"?b.rating-a.rating:sort==="age"?a.age-b.age:sort==="value"?b.value-a.value:b.wage-a.wage);
  return(<div style={{background:T.pn,borderRadius:12,border:`1px solid ${T.bd}`,overflow:"hidden"}}>
    <div style={{padding:"9px 12px",borderBottom:`1px solid ${T.bd}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,color:T.tx}}>Rosa ({list.length})</div>
        <select value={sort} onChange={e=>setSort(e.target.value)} style={{background:T.ib,border:`1px solid ${T.bd}`,borderRadius:5,padding:"2px 6px",color:T.dm,fontSize:10,outline:"none"}}><option value="rating">Rating ↓</option><option value="age">Età ↑</option><option value="value">Valore ↓</option><option value="wage">Stipendio ↓</option></select></div>
      <div style={{fontSize:9,color:T.ft,marginTop:2}}>Clicca → alternativa ↕</div>
    </div>
    <div style={{overflowY:"auto",maxHeight:500}}>{list.length===0&&<div style={{padding:20,color:T.ft,fontSize:12,textAlign:"center"}}>Carica una squadra</div>}
      {list.map(p=>{const isA=Object.values(alts).includes(p.id);return(
        <div key={p.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderBottom:`1px solid ${T.bd}`,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=T.ib} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <div style={{width:22,fontSize:8,fontWeight:700,color:POSITION_COLORS[p.position]||"#6b7280",background:(POSITION_COLORS[p.position]||"#6b7280")+"22",borderRadius:3,textAlign:"center",padding:"2px",flexShrink:0}}>{p.position}</div>
          <div onClick={()=>onSetAlt(p)} style={{flex:1,display:"flex",alignItems:"center",gap:6,minWidth:0}}>
            <KitSVG color={TEAM_COLORS[p.club]||"#555"} size={22} isGK={p.position==="GK"}/>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:700,color:isA?"#16a34a":T.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cap===p.id&&<span style={{color:"#ffd700",marginRight:2}}>★</span>}{p.shortName}{isA&&<span style={{fontSize:8,color:"#16a34a",marginLeft:2}}>↕</span>}</div></div>
          </div>
          <button onClick={()=>setCap(p.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:cap===p.id?"#ffd700":T.ft,padding:2,flexShrink:0}}>★</button>
          <div style={{fontSize:10,fontWeight:800,color:rcol(p.rating),flexShrink:0}}>{p.rating}</div>
        </div>);})}
    </div>
  </div>);
}

function SquadStats({lineup}){const th=useContext(ThCtx);const T=TH[th];const f=lineup.filter(Boolean);if(!f.length)return null;
  const avg=k=>{const v=f.map(p=>p[k]).filter(x=>x!==undefined);return v.length?v.reduce((a,b)=>a+b,0)/v.length:0;};const sum=k=>f.reduce((a,p)=>a+(p[k]||0),0);
  return(<div style={{background:T.pn,borderRadius:12,border:`1px solid ${T.bd}`,overflow:"hidden"}}>
    <div style={{padding:"9px 12px",borderBottom:`1px solid ${T.bd}`}}><div style={{fontSize:9,fontWeight:700,color:T.dm,letterSpacing:"1px",textTransform:"uppercase"}}>Statistiche</div></div>
    <div style={{padding:"2px 0"}}>{[
      {l:"Rating medio",v:avg("rating").toFixed(1),c:rcol(avg("rating"))},{l:"Età media",v:`${avg("age").toFixed(1)}a`},
      {l:"Valore totale",v:`€${sum("value")}M`,c:"#16a34a"},{l:"Stipendi/anno",v:`€${(sum("wage")/1000).toFixed(1)}M`,c:"#f59e0b"},
      {l:"Mancini",v:`${f.filter(p=>p.foot==="L").length}/${f.length}`,c:"#ec4899"},
      {l:"In scadenza ⚠",v:`${f.filter(p=>p.contract<=2026).length}`,c:f.some(p=>p.contract<=2026)?"#ef4444":T.dm},
    ].map(s=><div key={s.l} style={{display:"flex",justifyContent:"space-between",padding:"4px 12px",borderBottom:`1px solid ${T.bd}`}}>
      <span style={{fontSize:10,color:T.dm}}>{s.l}</span><span style={{fontSize:11,fontWeight:700,color:s.c||T.tx}}>{s.v}</span></div>)}</div>
  </div>);
}

function ConfirmModal({team,onOk,onNo}){const th=useContext(ThCtx);const T=TH[th];return(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{background:T.pn,borderRadius:14,width:"100%",maxWidth:360,border:`1px solid ${T.bd}`,padding:24,textAlign:"center"}}>
      <div style={{fontSize:32,marginBottom:12}}>⚠️</div>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:700,color:T.tx,marginBottom:8}}>Sovrascrivere?</div>
      <div style={{fontSize:13,color:T.dm,marginBottom:20}}>Caricare <strong style={{color:T.tx}}>{team.name}</strong> sostituirà i titolari attuali.</div>
      <div style={{display:"flex",gap:10}}><button onClick={onNo} style={{flex:1,padding:10,borderRadius:8,border:`1px solid ${T.bd}`,background:"transparent",color:T.dm,cursor:"pointer",fontSize:13}}>Annulla</button>
        <button onClick={onOk} style={{flex:1,padding:10,borderRadius:8,border:"none",background:"#16a34a",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>Carica</button></div>
    </div>
  </div>);}

function AltPicker({player,lineup,positions,onSelect,onClose}){const th=useContext(ThCtx);const T=TH[th];return(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:T.pn,borderRadius:14,width:"100%",maxWidth:340,border:`1px solid ${T.bd}`}}>
      <div style={{padding:"11px 14px",borderBottom:`1px solid ${T.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700,color:T.tx}}>Alternativa per?</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:T.dm,cursor:"pointer",fontSize:18}}>✕</button></div>
      <div style={{maxHeight:340,overflowY:"auto"}}>{positions.map(pos=>{const s=lineup[pos.slot];if(!s)return null;return(
        <div key={pos.slot} onClick={()=>onSelect(pos.slot)} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 14px",cursor:"pointer",borderBottom:`1px solid ${T.bd}`}}
          onMouseEnter={e=>e.currentTarget.style.background=T.ib} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <KitSVG color={TEAM_COLORS[s.club]||"#555"} size={24} isGK={s.position==="GK"}/><div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:T.tx}}>{s.name}</div><div style={{fontSize:10,color:T.dm}}>→ {player.name}</div></div>
        </div>);})}</div>
    </div>
  </div>);}

function Toast({msg,onDone}){useEffect(()=>{const t=setTimeout(onDone,2500);return()=>clearTimeout(t);},[onDone]);
  return<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#16a34a",color:"#fff",padding:"10px 20px",borderRadius:10,fontWeight:700,fontSize:14,zIndex:999,whiteSpace:"nowrap"}}>{msg}</div>;}

function CompareHeader({t1,t2,lu1,lu2}){const th=useContext(ThCtx);const T=TH[th];
  const avg=(lu,k)=>{const f=lu.filter(Boolean);return f.length?f.reduce((a,p)=>a+(p[k]||0),0)/f.length:0;};
  const sum=(lu,k)=>lu.filter(Boolean).reduce((a,p)=>a+(p[k]||0),0);
  const ms=[{l:"OVR",a:avg(lu1,"rating").toFixed(1),b:avg(lu2,"rating").toFixed(1),nA:avg(lu1,"rating"),nB:avg(lu2,"rating"),hi:true},
    {l:"Età",a:avg(lu1,"age").toFixed(1)+"a",b:avg(lu2,"age").toFixed(1)+"a",nA:avg(lu1,"age"),nB:avg(lu2,"age"),hi:false},
    {l:"Valore",a:"€"+sum(lu1,"value")+"M",b:"€"+sum(lu2,"value")+"M",nA:sum(lu1,"value"),nB:sum(lu2,"value"),hi:true},
    {l:"Stip/a",a:"€"+(sum(lu1,"wage")/1000).toFixed(1)+"M",b:"€"+(sum(lu2,"wage")/1000).toFixed(1)+"M",nA:sum(lu1,"wage"),nB:sum(lu2,"wage"),hi:true}];
  return(<div style={{background:T.pn,borderRadius:12,border:`1px solid ${T.bd}`,padding:"12px 14px",marginBottom:10}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:6,alignItems:"center",marginBottom:8}}>
      <div style={{textAlign:"center"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:900,color:t1.color}}>{t1.name}</div><div style={{fontSize:9,color:T.dm}}>{lu1.filter(Boolean).length}/11</div></div>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,fontWeight:900,color:T.ft}}>VS</div>
      <div style={{textAlign:"center"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:900,color:t2.color}}>{t2.name}</div><div style={{fontSize:9,color:T.dm}}>{lu2.filter(Boolean).length}/11</div></div>
    </div>
    {ms.map(m=>{const aW=m.hi?m.nA>m.nB:m.nA<m.nB,bW=m.hi?m.nB>m.nA:m.nB<m.nA;
      return(<div key={m.l} style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:4,alignItems:"center",marginBottom:4}}>
        <div style={{textAlign:"right",fontSize:11,fontWeight:700,color:aW?t1.color:T.dm}}>{m.a}</div>
        <div style={{fontSize:9,color:T.dm,textAlign:"center",minWidth:50}}>{m.l}</div>
        <div style={{textAlign:"left",fontSize:11,fontWeight:700,color:bW?t2.color:T.dm}}>{m.b}</div>
      </div>);})}
  </div>);
}

// ═══ APP ═════════════════════════════════════════════════════════════════════
export default function App(){
  const[theme,setTheme]=useState("dark");const T=TH[theme];
  const[mode,setMode]=useState("single"); // single | compare
  const[activeTeam,setActiveTeam]=useState(0);
  const[lineup,setLineup]=useState(Array(11).fill(null));
  const[lineup2,setLineup2]=useState(Array(11).fill(null));
  const[form2,setForm2Raw]=useState("4-3-3");
  const[name2,setName2]=useState("Squadra B");const[color2,setColor2]=useState("#2563eb");
  const[coach2,setCoach2]=useState("");
  const[form,setFormRaw]=useState("4-3-3");
  const[name,setName]=useState("La mia Squadra");const[color,setColor]=useState("#16a34a");
  const[alts,setAlts]=useState({});const[bench,setBench]=useState([]);const[cap,setCap]=useState(null);
  const[coach,setCoach]=useState("");const[numbers,setNumbers]=useState({});// {slot: "10"}const[customPos,setCustomPos]=useState({});
  const[stats,setStats]=useState(["rating"]);const[kits,setKits]=useState(true);const[altMode,setAltMode]=useState(false);
  const[picking,setPicking]=useState(null);const[teamPicker,setTeamPicker]=useState(false);
  const[altPick,setAltPick]=useState(null);const[pending,setPending]=useState(null);
  const[exporting,setExporting]=useState(false);const[toast,setToast]=useState(null);
  const[saved,setSaved]=useState([]);const[showSaved,setShowSaved]=useState(false);
  // Undo
  const past=useRef([]);const future=useRef([]);
  const pushUndo=lu=>{past.current=[...past.current.slice(-19),lu];future.current=[];};
  const undo=()=>{if(!past.current.length)return;const prev=past.current.pop();future.current.unshift(lineup);setLineup(prev);};
  const redo=()=>{if(!future.current.length)return;const next=future.current.shift();past.current.push(lineup);setLineup(next);};
  const setLU=updater=>{setLineup(prev=>{pushUndo(prev);return typeof updater==="function"?updater(prev):updater;});};

  useEffect(()=>{
    const hash=window.location.hash.slice(1);if(hash){const d=dec(hash);if(d){setLineup(d.l.map(id=>id?PLAYERS.find(p=>p.id===id)||null:null));if(d.f)setFormRaw(d.f);if(d.n)setName(d.n);if(d.c)setColor(d.c);if(d.a)setAlts(d.a);if(d.cp)setCustomPos(d.cp);if(d.co)setCoach(d.co);if(d.nm)setNumbers(d.nm);}}
    setSaved(JSON.parse(localStorage.getItem(SK)||"[]"));
  },[]);

  const setForm=useCallback(f=>{setFormRaw(f);setCustomPos({});},[]);

  const autoFill=()=>{
    const pool=bench.length>0?bench:PLAYERS;const positions=FORMATIONS[form]?.positions||[];
    setLU(prev=>{const next=[...prev];const used=new Set(next.filter(Boolean).map(p=>p.id));const sorted=[...pool].sort((a,b)=>b.rating-a.rating);
      positions.forEach(pos=>{if(next[pos.slot])return;const p=sorted.find(p=>p.position===pos.role&&!used.has(p.id));if(p){next[pos.slot]=p;used.add(p.id);}});
      positions.forEach(pos=>{if(next[pos.slot])return;const p=sorted.find(p=>!used.has(p.id));if(p){next[pos.slot]=p;used.add(p.id);}});return next;});
    setToast("Auto-fill! 🤖");
  };

  const doLoad=useCallback(team=>{
    const tf=team.formation||"4-3-3";const positions=FORMATIONS[tf]?.positions||[];const newLU=Array(11).fill(null);const used=new Set();
    const starters=(team.starters||[]).map(s=>({...s,p:s.playerId?PLAYERS.find(x=>x.id===s.playerId):null})).filter(s=>s.p);
    positions.forEach(pos=>{if(newLU[pos.slot])return;const c=starters.find(s=>XLR[s.xlRole]===pos.role&&!used.has(s.p.id))||starters.find(s=>s.p.position===pos.role&&!used.has(s.p.id));if(c){newLU[pos.slot]=c.p;used.add(c.p.id);}});
    const roster=PLAYERS.filter(p=>p.club===team.name).sort((a,b)=>b.rating-a.rating);
    positions.forEach(pos=>{if(newLU[pos.slot])return;const c=roster.find(p=>p.position===pos.role&&!used.has(p.id));if(c){newLU[pos.slot]=c;used.add(c.id);}});
    positions.forEach(pos=>{if(newLU[pos.slot])return;const c=roster.find(p=>!used.has(p.id));if(c){newLU[pos.slot]=c;used.add(c.id);}});
    setLineup(newLU);setFormRaw(tf);setName(team.name);setColor(team.color);setAlts({});setBench(PLAYERS.filter(p=>p.club===team.name));setCustomPos({});setTeamPicker(false);setPending(null);setToast(`${team.name} caricata! ⚽`);
  },[]);

  const loadTeam=team=>{if(lineup.some(Boolean)){setPending(team);setTeamPicker(false);}else doLoad(team);};
  const slotClick=slot=>{const pos=(FORMATIONS[form]?.positions||[]).find(p=>p.slot===slot);if(altMode&&lineup[slot])setPicking({slot,role:pos?.role||null,isAlt:true});else setPicking({slot,role:pos?.role||null,isAlt:false});};
  const selectPlayer=player=>{if(!picking)return;if(picking.team===2){setLineup2(prev=>{const n=[...prev];n[picking.slot]=player;return n;});setPicking(null);return;}if(picking.isAlt)setAlts(prev=>({...prev,[picking.slot]:player.id}));else setLU(prev=>{const n=[...prev];n[picking.slot]=player;return n;});setPicking(null);};
  const handleDrop=useCallback((targetSlot,data)=>{setLU(prev=>{const next=[...prev];if(data.slot!==undefined&&data.slot!==null&&data.slot!==targetSlot){[next[data.slot],next[targetSlot]]=[next[targetSlot],next[data.slot]];}else if(data.id){const p=PLAYERS.find(x=>x.id===data.id);if(p)next[targetSlot]=p;}return next;});},[]);
  const handlePitchDrop=useCallback((slotIdx,xP,yP)=>{setCustomPos(prev=>({...prev,[slotIdx]:{x:xP,y:yP}}));},[]);
  const removePlayer=slot=>setLU(prev=>{const n=[...prev];n[slot]=null;return n;});
  const removeAlt=slot=>setAlts(prev=>{const n={...prev};delete n[slot];return n;});
  const benchClick=player=>setAltPick(player);
  const altSlotSelect=slot=>{if(!altPick)return;setAlts(prev=>({...prev,[slot]:altPick.id}));setAltPick(null);setToast(`${altPick.shortName} → ↕`);};
  const share=()=>{const code=enc(lineup,form,name,color,alts,customPos,coach,numbers);const url=`${location.origin}${location.pathname}#${code}`;navigator.clipboard.writeText(url).then(()=>setToast("Link copiato! 🔗")).catch(()=>{});};
  const save=()=>{const s=JSON.parse(localStorage.getItem(SK)||"[]");const e={id:Date.now(),name,formation:form,color,lineup:lineup.map(p=>p?.id??null),alts,customPos,coach,numbers,date:new Date().toLocaleDateString("it-IT")};const u=[e,...s].slice(0,10);localStorage.setItem(SK,JSON.stringify(u));setSaved(u);setToast("Salvata! 💾");};
  const load=entry=>{setLineup(entry.lineup.map(id=>id?PLAYERS.find(p=>p.id===id)||null:null));setFormRaw(entry.formation);setName(entry.name);setColor(entry.color);setAlts(entry.alts||{});setCustomPos(entry.customPos||{});setCoach(entry.coach||"");setNumbers(entry.numbers||{});setShowSaved(false);setToast("Caricata! ✅");};
  const positions=FORMATIONS[form]?.positions||[];
  const[mobile,setMobile]=useState(window.innerWidth<900);
  useEffect(()=>{const h=()=>setMobile(window.innerWidth<900);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);

  return(
    <ThCtx.Provider value={theme}>
      <div style={{minHeight:"100vh",background:T.bg,color:T.tx,fontFamily:"'Inter',sans-serif"}}>
        <style>{`*{box-sizing:border-box;}html,body{margin:0;padding:0;overflow-x:hidden;width:100%;max-width:100vw;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:rgba(128,128,128,0.2);border-radius:2px;}input[type=range]{accent-color:#ffd700;}`}</style>
        <header style={{background:T.hd,backdropFilter:"blur(12px)",borderBottom:`1px solid ${T.bd}`,padding:"0 14px",height:50,boxShadow:"0 2px 20px rgba(0,0,0,0.3)",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:26,height:26,background:"linear-gradient(135deg,#16a34a,#059669)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>⚽</div>
            <div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:900,lineHeight:1,color:T.tx}}>LINEUP BUILDER</div><div style={{fontSize:8,color:T.dm,letterSpacing:"1.5px"}}>UNIVERSO SPORTIVO</div></div>
          </div>
          <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{display:"flex",background:T.ib,borderRadius:7,border:`1px solid ${T.bd}`,overflow:"hidden"}}>
              <button onClick={()=>setMode("single")} style={{padding:"5px 10px",border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:mode==="single"?"#16a34a":"transparent",color:mode==="single"?"#fff":T.dm}}>Builder</button>
              <button onClick={()=>setMode("compare")} style={{padding:"5px 10px",border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:mode==="compare"?"#16a34a":"transparent",color:mode==="compare"?"#fff":T.dm}}>⚔️ VS</button>
            </div>
            <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} style={{background:T.ib,border:`1px solid ${T.bd}`,color:T.tx,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:13}}>{theme==="dark"?"☀️":"🌙"}</button>
            <button onClick={undo} disabled={!past.current.length} title="Annulla" style={{background:T.ib,border:`1px solid ${T.bd}`,color:past.current.length?T.tx:T.ft,borderRadius:6,padding:"5px 8px",cursor:past.current.length?"pointer":"default",fontSize:12}}>↩</button>
            <button onClick={redo} disabled={!future.current.length} title="Ripristina" style={{background:T.ib,border:`1px solid ${T.bd}`,color:future.current.length?T.tx:T.ft,borderRadius:6,padding:"5px 8px",cursor:future.current.length?"pointer":"default",fontSize:12}}>↪</button>
            <button onClick={autoFill} title="Auto-fill" style={{background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.4)",color:"#818cf8",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:12}}>🤖</button>
            <button onClick={()=>setExporting(true)} title="Esporta PNG" style={{background:T.ib,border:`1px solid ${T.bd}`,color:T.tx,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:12}}>📸</button>
            <button onClick={save} style={{background:T.ib,border:`1px solid ${T.bd}`,color:T.tx,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:12}}>💾</button>
            <button onClick={()=>setShowSaved(s=>!s)} style={{background:showSaved?"#16a34a18":T.ib,border:`1px solid ${showSaved?"#16a34a":T.bd}`,color:showSaved?"#16a34a":T.tx,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:11}}>📁{saved.length>0&&` (${saved.length})`}</button>
            <button onClick={share} style={{background:"#16a34a",border:"none",color:"#fff",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>🔗</button>
          </div>
        </header>
        {showSaved&&<div style={{background:T.pn,borderBottom:`1px solid ${T.bd}`,padding:"9px 14px"}}>
          {saved.length===0?<div style={{color:T.dm,fontSize:11}}>Nessuna salvata</div>
          :<div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{saved.map(e=>(<div key={e.id} onClick={()=>load(e)} style={{background:T.ib,border:`1px solid ${e.color}44`,borderRadius:8,padding:"6px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:7}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:e.color}}/><div><div style={{fontSize:11,fontWeight:700,color:T.tx}}>{e.name}</div><div style={{fontSize:9,color:T.dm}}>{e.formation} · {e.date}</div></div></div>))}</div>}
        </div>}
        <main style={{maxWidth:1160,margin:"0 auto",padding:"12px 10px",display:"grid",gridTemplateColumns:mobile?"1fr":mode==="compare"?"180px 1fr 1fr 180px":"200px 1fr 200px 180px",gap:12,alignItems:"start"}}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <Settings name={name} setName={setName} color={color} setColor={setColor} form={form} setForm={setForm} kits={kits} setKits={setKits} onPick={()=>setTeamPicker(true)} alt={altMode} setAlt={setAltMode} coach={coach} setCoach={setCoach}/>
            <StatSel stats={stats} setStats={setStats}/>
            <div style={{background:T.pn,borderRadius:10,border:`1px solid ${T.bd}`,padding:"8px 12px"}}>
              <button onClick={()=>{setLU(Array(11).fill(null));setAlts({});setBench([]);setCustomPos({});setNumbers({});}} style={{width:"100%",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",color:"#f87171",borderRadius:6,padding:"6px",cursor:"pointer",fontSize:11,fontWeight:600}}>🗑 Svuota</button></div>
          </div>
          <div>
            {mode==="compare"&&<CompareHeader t1={{name,color}} t2={{name:name2,color:color2}} lu1={lineup} lu2={lineup2}/>}
            <PitchView lineup={lineup} alts={alts} form={form} onDrop={handleDrop} onClick={slotClick} name={name} color={color} stats={stats} kits={kits} cap={cap} customPos={customPos} onPitchDrop={handlePitchDrop} coach={coach} numbers={numbers}/>
          </div>
          {mode==="compare"?
            <PitchView lineup={lineup2} alts={{}} form={form2} onDrop={(s,d)=>{setLineup2(prev=>{const n=[...prev];if(d.slot!==undefined&&d.slot!==null&&d.slot!==s){[n[d.slot],n[s]]=[n[s],n[d.slot]];}else if(d.id){const p=PLAYERS.find(x=>x.id===d.id);if(p)n[s]=p;}return n;});}} onClick={s=>{const pos=(FORMATIONS[form2]?.positions||[]).find(p=>p.slot===s);setPicking({slot:s,role:pos?.role||null,isAlt:false,team:2});}} name={name2} color={color2} stats={stats} kits={kits} cap={null} customPos={{}} onPitchDrop={()=>{}} coach={coach2}/>
          :<div style={{display:"flex",flexDirection:"column",gap:10}}>
            <LineupList lineup={lineup} alts={alts} form={form} onRemove={removePlayer} onRemoveAlt={removeAlt} onSlot={slotClick} stats={stats} cap={cap} setCap={setCap} numbers={numbers} setNumbers={setNumbers}/>
            <BenchPanel bench={bench} lineup={lineup} alts={alts} onSetAlt={benchClick} stats={stats} cap={cap} setCap={setCap}/>
          </div>}
          {!mobile&&<div style={{display:"flex",flexDirection:"column",gap:10}}><SquadStats lineup={lineup}/></div>}
        </main>
        {teamPicker&&<TeamPicker onSelect={loadTeam} onClose={()=>setTeamPicker(false)}/>}
        {picking&&<PlayerSearch onSelect={selectPlayer} onClose={()=>setPicking(null)} role={picking.role} lineup={lineup} isAlt={picking.isAlt||false} teamName={name}/>}
        {altPick&&<AltPicker player={altPick} lineup={lineup} positions={positions} onSelect={altSlotSelect} onClose={()=>setAltPick(null)}/>}
        {pending&&<ConfirmModal team={pending} onOk={()=>doLoad(pending)} onNo={()=>setPending(null)}/>}
        {exporting&&<ExportCanvas lineup={lineup} form={form} name={name} color={color} stats={stats} coach={coach} customPos={customPos} numbers={numbers} onDone={()=>{setExporting(false);setToast("PNG scaricato! 📸");}}/>}
        {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
      </div>
    </ThCtx.Provider>);
}

