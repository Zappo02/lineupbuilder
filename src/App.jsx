import React, { useState, useRef, useEffect, useCallback } from "react";
import { PLAYERS, FORMATIONS, POSITION_COLORS, STAT_VIEWS, SERIE_A_TEAMS, NATION_FLAGS } from "./data/players.js";

// ─── UTILITY ─────────────────────────────────────────────────────────────────
const encodeLineup = (lineup, formation, teamName, color, altPlayers) => {
  try { return btoa(unescape(encodeURIComponent(JSON.stringify({ f:formation,n:teamName,c:color,l:lineup.map(s=>s?.id??null),a:altPlayers })))); } catch { return ""; }
};
const decodeLineup = str => { try { return JSON.parse(decodeURIComponent(escape(atob(str)))); } catch { return null; } };
const getInitials = name => name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
const getRatingColor = r => r>=90?"#ffd700":r>=85?"#c8c8c8":r>=80?"#cd7f32":"#6b7280";
const getContractColor = y => { const d=y-2025; return d<=0?"#ef4444":d===1?"#f97316":d===2?"#f59e0b":"#6b7280"; };
const SAVED_KEY = "lineup_builder_v5";

// ─── KIT SVG ──────────────────────────────────────────────────────────────────
// Generates a mini football shirt in SVG for each team
const TEAM_KIT = {
  "Juventus":    { primary:"#000000", secondary:"#ffffff", style:"stripes" },
  "Inter":       { primary:"#010E80", secondary:"#000000", style:"stripes-v" },
  "Milan":       { primary:"#AC0000", secondary:"#000000", style:"stripes-v" },
  "Roma":        { primary:"#8B0000", secondary:"#f5c040", style:"solid" },
  "Lazio":       { primary:"#87CEEB", secondary:"#ffffff", style:"solid" },
  "Napoli":      { primary:"#009FD4", secondary:"#ffffff", style:"solid" },
  "Atalanta":    { primary:"#1C4CA6", secondary:"#000000", style:"stripes-v" },
  "Bologna":     { primary:"#C8102E", secondary:"#1a1a1a", style:"halves" },
  "Fiorentina":  { primary:"#4B0082", secondary:"#ffffff", style:"solid" },
  "Como":        { primary:"#0047AB", secondary:"#ffffff", style:"solid" },
  "Genoa":       { primary:"#8B0000", secondary:"#1a5276", style:"halves" },
  "Torino":      { primary:"#8B2500", secondary:"#ffffff", style:"solid" },
};

function KitSVG({ club, size=32 }) {
  const kit = TEAM_KIT[club] || { primary:"#374151", secondary:"#6b7280", style:"solid" };
  const { primary, secondary, style } = kit;
  const s = size;
  const w = s, h = s*1.1;

  const stripeCount = 4;
  const stripeW = w / stripeCount;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ flexShrink:0 }}>
      <defs>
        {style==="stripes-v" && (
          <pattern id={`sv-${club.replace(/\s/g,'')}`} x="0" y="0" width={stripeW*2} height={h} patternUnits="userSpaceOnUse">
            <rect width={stripeW} height={h} fill={primary}/>
            <rect x={stripeW} width={stripeW} height={h} fill={secondary}/>
          </pattern>
        )}
        {style==="stripes" && (
          <pattern id={`sh-${club.replace(/\s/g,'')}`} x="0" y="0" width={w} height={8} patternUnits="userSpaceOnUse">
            <rect width={w} height={4} fill={primary}/>
            <rect y={4} width={w} height={4} fill={secondary}/>
          </pattern>
        )}
      </defs>
      {/* Shirt body */}
      <path d={`M${w*.2},${h*.12} L0,${h*.35} L${w*.18},${h*.42} L${w*.18},${h} L${w*.82},${h} L${w*.82},${h*.42} L${w},${h*.35} L${w*.8},${h*.12} Q${w*.65},0 ${w*.5},${h*.08} Q${w*.35},0 ${w*.2},${h*.12}Z`}
        fill={style==="stripes-v"?`url(#sv-${club.replace(/\s/g,'')})`:style==="stripes"?`url(#sh-${club.replace(/\s/g,'')})`:primary}
        stroke="rgba(255,255,255,0.15)" strokeWidth="0.5"/>
      {/* Collar */}
      <ellipse cx={w*.5} cy={h*.1} rx={w*.12} ry={h*.05} fill={secondary} opacity="0.9"/>
      {/* Halves style: right half different color */}
      {style==="halves" && <path d={`M${w*.5},${h*.08} L${w*.8},${h*.12} L${w},${h*.35} L${w*.82},${h*.42} L${w*.82},${h} L${w*.5},${h}Z`} fill={secondary} opacity="0.85"/>}
      {/* Sleeves */}
      <path d={`M${w*.2},${h*.12} L0,${h*.35} L${w*.18},${h*.42} L${w*.25},${h*.25}Z`} fill={secondary} opacity="0.7"/>
      <path d={`M${w*.8},${h*.12} L${w},${h*.35} L${w*.82},${h*.42} L${w*.75},${h*.25}Z`} fill={secondary} opacity="0.7"/>
    </svg>
  );
}

// ─── AVATAR ──────────────────────────────────────────────────────────────────
function Avatar({ player, size=36, showKit=false }) {
  const color = POSITION_COLORS[player.position] || "#6b7280";
  if (showKit) return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <KitSVG club={player.club} size={size}/>
      <div style={{ position:"absolute", bottom:-2, right:-2, background:"#0a0e1a", borderRadius:"50%", width:size*.45, height:size*.45, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*.16, fontWeight:800, color, fontFamily:"'Barlow Condensed',sans-serif", border:`1px solid ${color}` }}>
        {getInitials(player.name)}
      </div>
    </div>
  );
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", flexShrink:0, backgroundColor:color+"22", border:`2px solid ${color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*.31, fontWeight:800, color, fontFamily:"'Barlow Condensed',sans-serif" }}>
      {getInitials(player.name)}
    </div>
  );
}

// ─── STAT BADGES ─────────────────────────────────────────────────────────────
function StatBadges({ player, activeStats }) {
  if (!player) return null;
  const stats = STAT_VIEWS.filter(s => activeStats.includes(s.id) && s.id !== "rating" && player[s.id] !== undefined);
  if (!stats.length) return null;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:2, alignItems:"center", marginTop:2 }}>
      {stats.slice(0,2).map(sv => {
        const isExpiring = sv.id==="contract" && player.contract <= 2026;
        return (
          <div key={sv.id} style={{ background:sv.color+"22", border:`1px solid ${isExpiring?"#ef4444":sv.color}55`, borderRadius:4, padding:"1px 5px", fontSize:8, fontWeight:800, color:isExpiring?"#ef4444":sv.color, whiteSpace:"nowrap" }}>
            {sv.id==="nation" ? (NATION_FLAGS[player.nation]||player.nation) : `${sv.icon} ${sv.format(player[sv.id])}`}
          </div>
        );
      })}
    </div>
  );
}

// ─── PITCH SLOT ──────────────────────────────────────────────────────────────
function PitchSlot({ slot, posData, player, altPlayer, onDrop, onClick, teamColor, activeStats, showKits }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const color = POSITION_COLORS[posData.role] || "#6b7280";
  const border = teamColor || color;
  const showRating = activeStats.includes("rating");
  const handleDrop = e => { e.preventDefault(); setIsDragOver(false); try { onDrop(slot, JSON.parse(e.dataTransfer.getData("application/json"))); } catch {} };
  return (
    <div onDragOver={e=>{e.preventDefault();setIsDragOver(true);}} onDragLeave={()=>setIsDragOver(false)} onDrop={handleDrop}
      style={{ position:"absolute", left:`${posData.x}%`, top:`${posData.y}%`, transform:"translate(-50%,-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:2, zIndex:10 }}>
      {player ? (
        <>
          <div draggable onDragStart={e=>e.dataTransfer.setData("application/json",JSON.stringify({player,fromSlot:slot}))} onClick={()=>onClick(slot)}
            style={{ position:"relative", cursor:"pointer", transform:isDragOver?"scale(1.18)":"scale(1)", transition:"transform 0.12s" }}>
            {showKits ? (
              <div style={{ position:"relative" }}>
                <KitSVG club={player.club} size={40}/>
                {showRating && <div style={{ position:"absolute", top:-4, right:-4, background:getRatingColor(player.rating), color:"#000", fontSize:8, fontWeight:800, borderRadius:3, padding:"0 2px", lineHeight:"13px", minWidth:13, textAlign:"center" }}>{player.rating}</div>}
              </div>
            ) : (
              <div style={{ width:44, height:44, borderRadius:"50%", backgroundColor:color+"22", border:`3px solid ${border}`, boxShadow:`0 0 10px ${border}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color, fontFamily:"'Barlow Condensed',sans-serif", position:"relative" }}>
                {getInitials(player.name)}
                {showRating && <div style={{ position:"absolute", top:-4, right:-4, background:getRatingColor(player.rating), color:"#000", fontSize:8, fontWeight:800, borderRadius:3, padding:"0 2px", lineHeight:"13px", minWidth:13, textAlign:"center" }}>{player.rating}</div>}
              </div>
            )}
          </div>
          <div style={{ background:"rgba(0,0,0,0.85)", borderRadius:5, padding:"1px 5px", maxWidth:80, textAlign:"center" }} onClick={()=>onClick(slot)}>
            <div style={{ fontSize:8, color:"#9ca3af", fontWeight:700 }}>{posData.role}</div>
            <div style={{ fontSize:10, color:"#fff", fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{player.shortName}</div>
            {altPlayer && <div style={{ fontSize:8, color:"#16a34a", fontWeight:600, borderTop:"1px solid rgba(22,163,74,0.3)", marginTop:1, paddingTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>↕ {altPlayer.shortName}</div>}
          </div>
          <StatBadges player={player} activeStats={activeStats}/>
        </>
      ) : (
        <>
          <div onClick={()=>onClick(slot)} style={{ width:44, height:44, borderRadius:"50%", border:`2px dashed ${color}`, backgroundColor:isDragOver?color+"33":color+"11", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:color+"bb", cursor:"pointer", transform:isDragOver?"scale(1.15)":"scale(1)", transition:"all 0.12s" }}>+</div>
          <div style={{ background:"rgba(0,0,0,0.7)", borderRadius:4, padding:"1px 6px", fontSize:9, color, fontWeight:700 }}>{posData.role}</div>
        </>
      )}
    </div>
  );
}

// ─── PITCH ───────────────────────────────────────────────────────────────────
function Pitch({ lineup, altPlayers, formation, onSlotDrop, onSlotClick, teamName, teamColor, activeStats, showKits, pitchRef }) {
  const positions = FORMATIONS[formation]?.positions || [];
  return (
    <div ref={pitchRef} style={{ position:"relative", width:"100%", paddingBottom:"150%", userSelect:"none" }}>
      <svg viewBox="0 0 300 450" style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}>
        <defs>
          <linearGradient id="gf" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a4d2e"/><stop offset="100%" stopColor="#1d5c35"/></linearGradient>
        </defs>
        <rect width="300" height="450" fill="url(#gf)" rx="8"/>
        {[0,1,2,3,4,5,6,7].map(i=><rect key={i} x="0" y={i*57} width="300" height="28" fill={i%2===0?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.02)"}/>)}
        <g fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.3">
          <rect x="10" y="10" width="280" height="430" rx="2"/>
          <line x1="10" y1="225" x2="290" y2="225"/>
          <circle cx="150" cy="225" r="36"/>
          <circle cx="150" cy="225" r="2.5" fill="rgba(255,255,255,0.28)" stroke="none"/>
          <rect x="56" y="350" width="188" height="80"/>
          <rect x="100" y="390" width="100" height="40"/>
          <rect x="126" y="432" width="48" height="8"/>
          <rect x="56" y="20" width="188" height="80"/>
          <rect x="100" y="20" width="100" height="40"/>
          <rect x="126" y="10" width="48" height="10"/>
          <path d="M 100 122 A 36 36 0 0 0 200 122"/>
          <path d="M 100 328 A 36 36 0 0 1 200 328"/>
        </g>
        {teamName && <text x="150" y="226" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.04)" fontSize="19" fontFamily="'Barlow Condensed',sans-serif" fontWeight="900" letterSpacing="3">{teamName.toUpperCase()}</text>}
      </svg>
      {positions.map(pd=>(
        <PitchSlot key={pd.slot} slot={pd.slot} posData={pd}
          player={lineup[pd.slot]||null}
          altPlayer={altPlayers[pd.slot]?PLAYERS.find(p=>p.id===altPlayers[pd.slot])||null:null}
          onDrop={onSlotDrop} onClick={onSlotClick}
          teamColor={teamColor} activeStats={activeStats} showKits={showKits}/>
      ))}
    </div>
  );
}

// ─── EXPORT IMAGE ─────────────────────────────────────────────────────────────
function ExportCanvas({ lineup, formation, teamName, teamColor, activeStats, onDone }) {
  const canvasRef = useRef();
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = 800, H = 1000;
    canvas.width = W; canvas.height = H;

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#0a0e1a"); bgGrad.addColorStop(1, "#111827");
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);

    // Header
    ctx.fillStyle = teamColor || "#16a34a";
    ctx.fillRect(0, 0, W, 70);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 36px 'Barlow Condensed', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(teamName.toUpperCase(), W/2, 46);
    ctx.font = "16px 'Barlow Condensed', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(formation, W/2, 65);

    // Field background
    const fieldGrad = ctx.createLinearGradient(40, 90, 40, 840);
    fieldGrad.addColorStop(0, "#1a4d2e"); fieldGrad.addColorStop(1, "#1d5c35");
    ctx.fillStyle = fieldGrad;
    ctx.beginPath(); ctx.roundRect(40, 90, W-80, 750, 8); ctx.fill();

    // Field stripes
    for(let i=0;i<8;i++){
      ctx.fillStyle = i%2===0?"rgba(0,0,0,0.05)":"rgba(255,255,255,0.02)";
      ctx.fillRect(40, 90+i*94, W-80, 94);
    }

    // Field lines
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1.5;
    ctx.strokeRect(60, 100, W-120, 730);
    ctx.beginPath(); ctx.moveTo(60, 465); ctx.lineTo(W-60, 465); ctx.stroke();
    ctx.beginPath(); ctx.arc(W/2, 465, 60, 0, Math.PI*2); ctx.stroke();
    // Penalty areas
    ctx.strokeRect(140, 100, W-280, 130); ctx.strokeRect(140, 610, W-280, 120);

    // Players
    const positions = FORMATIONS[formation]?.positions || [];
    positions.forEach(pos => {
      const player = lineup[pos.slot];
      if (!player) return;
      const px = 60 + (pos.x/100)*(W-120);
      const py = 100 + (pos.y/100)*730;
      const roleColor = POSITION_COLORS[pos.role] || "#6b7280";
      const border = teamColor || roleColor;

      // Circle
      ctx.beginPath(); ctx.arc(px, py, 26, 0, Math.PI*2);
      ctx.fillStyle = roleColor+"33"; ctx.fill();
      ctx.strokeStyle = border; ctx.lineWidth = 3; ctx.stroke();

      // Initials
      ctx.fillStyle = roleColor;
      ctx.font = "bold 16px 'Barlow Condensed', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(getInitials(player.name), px, py+6);

      // Rating badge
      if (activeStats.includes("rating")) {
        const rc = getRatingColor(player.rating);
        ctx.fillStyle = rc;
        ctx.beginPath(); ctx.roundRect(px+14, py-34, 24, 16, 3); ctx.fill();
        ctx.fillStyle = "#000";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText(player.rating, px+26, py-22);
      }

      // Name tag
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.beginPath(); ctx.roundRect(px-36, py+29, 72, 22, 4); ctx.fill();
      ctx.fillStyle = "#9ca3af"; ctx.font = "bold 8px sans-serif";
      ctx.fillText(pos.role, px, py+38);
      ctx.fillStyle = "#fff"; ctx.font = "bold 10px sans-serif";
      const sn = player.shortName.length>10 ? player.shortName.slice(0,10)+"." : player.shortName;
      ctx.fillText(sn, px, py+49);
    });

    // Stats bar at bottom
    const filled = lineup.filter(Boolean);
    if (filled.length > 0) {
      const avgRating = (filled.reduce((a,p)=>a+p.rating,0)/filled.length).toFixed(1);
      const totalValue = filled.reduce((a,p)=>a+(p.value||0),0);
      const avgAge = (filled.reduce((a,p)=>a+(p.age||0),0)/filled.length).toFixed(1);
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, H-90, W, 90);
      const stats = [
        {label:"Rating medio", value:avgRating, color:getRatingColor(parseFloat(avgRating))},
        {label:"Valore totale", value:`€${totalValue}M`, color:"#16a34a"},
        {label:"Età media", value:`${avgAge} anni`, color:"#3b82f6"},
        {label:"Giocatori", value:`${filled.length}/11`, color:"#9ca3af"},
      ];
      stats.forEach((s,i)=>{
        const x = W/4*i + W/8;
        ctx.fillStyle = s.color; ctx.font = "bold 22px 'Barlow Condensed',sans-serif";
        ctx.textAlign = "center"; ctx.fillText(s.value, x, H-52);
        ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "11px sans-serif";
        ctx.fillText(s.label, x, H-32);
      });
    }

    // Watermark
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.font = "bold 14px 'Barlow Condensed',sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("universosportivo.com", W-20, H-12);

    // Download
    const link = document.createElement("a");
    link.download = `${teamName.replace(/\s/g,"-")}-lineup.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    onDone();
  }, []);
  return <canvas ref={canvasRef} style={{ display:"none" }}/>;
}

// ─── TEAM PICKER ─────────────────────────────────────────────────────────────
function TeamPicker({ onSelect, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#111827", borderRadius:16, width:"100%", maxWidth:480, border:"1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:700, color:"#fff" }}>Carica squadra Serie A</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:20 }}>✕</button>
        </div>
        <div style={{ padding:14, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {SERIE_A_TEAMS.map(team => (
            <button key={team.name} onClick={()=>onSelect(team)}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"12px 8px", background:"rgba(255,255,255,0.04)", border:`1px solid ${team.color}44`, borderRadius:10, cursor:"pointer" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=team.color;e.currentTarget.style.background=team.color+"18";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=team.color+"44";e.currentTarget.style.background="rgba(255,255,255,0.04)";}}>
              <KitSVG club={team.name} size={36}/>
              <div style={{ fontSize:11, fontWeight:700, color:"#fff", textAlign:"center" }}>{team.name}</div>
              <div style={{ fontSize:9, color:"#6b7280" }}>{team.formation} · OVR {team.rating}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PLAYER SEARCH ───────────────────────────────────────────────────────────
function PlayerSearch({ onSelectPlayer, onClose, selectedSlotRole, currentLineup, isAlt, slotPlayer }) {
  const [query, setQuery] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");
  const [clubFilter, setClubFilter] = useState("ALL");
  const [minRating, setMinRating] = useState(60);
  const inputRef = useRef();
  useEffect(() => { inputRef.current?.focus(); }, []);
  const posMap = { DEF:["CB","RB","LB"], MID:["DM","CM","AM","RM","LM"], ATT:["ST","RW","LW"] };
  const clubs = ["ALL",...Array.from(new Set(PLAYERS.map(p=>p.club))).sort()];
  const usedIds = new Set(currentLineup.filter(Boolean).map(p=>p.id));
  const filtered = PLAYERS.filter(p => {
    const q = query.toLowerCase();
    const matchQ = !query||p.name.toLowerCase().includes(q)||p.club.toLowerCase().includes(q);
    const matchP = posFilter==="ALL"||(posFilter==="GK"&&p.position==="GK")||(posMap[posFilter]?.includes(p.position));
    const matchC = clubFilter==="ALL"||p.club===clubFilter;
    const matchR = p.rating >= minRating;
    return matchQ&&matchP&&matchC&&matchR;
  }).sort((a,b)=>b.rating-a.rating);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#111827", borderRadius:16, width:"100%", maxWidth:520, maxHeight:"90vh", display:"flex", flexDirection:"column", border:"1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:17, fontWeight:700, color:"#fff" }}>
              {isAlt?"Scegli alternativa":"Scegli giocatore"}
              {selectedSlotRole && <span style={{ marginLeft:8, fontSize:11, color:POSITION_COLORS[selectedSlotRole]||"#6b7280", background:(POSITION_COLORS[selectedSlotRole]||"#6b7280")+"22", padding:"2px 7px", borderRadius:4, fontWeight:600 }}>{selectedSlotRole}</span>}
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:20 }}>✕</button>
          </div>
          {isAlt&&slotPlayer && <div style={{ background:"rgba(22,163,74,0.1)", border:"1px solid rgba(22,163,74,0.3)", borderRadius:7, padding:"5px 10px", marginBottom:8, fontSize:11, color:"#16a34a" }}>Alternativa per: <strong>{slotPlayer.name}</strong></div>}
          <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cerca per nome o club..."
            style={{ width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:7, padding:"7px 11px", color:"#fff", fontSize:13, outline:"none", boxSizing:"border-box", marginBottom:7 }}/>
          <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:6 }}>
            {["ALL","GK","DEF","MID","ATT"].map(pg=>(
              <button key={pg} onClick={()=>setPosFilter(pg)} style={{ padding:"3px 9px", borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer", border:"1px solid", background:posFilter===pg?"#16a34a":"transparent", borderColor:posFilter===pg?"#16a34a":"rgba(255,255,255,0.15)", color:posFilter===pg?"#fff":"#9ca3af" }}>{pg}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:6 }}>
            <select value={clubFilter} onChange={e=>setClubFilter(e.target.value)} style={{ flex:1, background:"#1f2937", border:"1px solid rgba(255,255,255,0.12)", borderRadius:6, padding:"5px 9px", color:"#9ca3af", fontSize:11, outline:"none" }}>
              {clubs.map(c=><option key={c} value={c}>{c==="ALL"?"Tutte le squadre":c}</option>)}
            </select>
            <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
              <span style={{ fontSize:10, color:"#6b7280" }}>Min</span>
              <input type="range" min="60" max="90" value={minRating} onChange={e=>setMinRating(+e.target.value)} style={{ width:70 }}/>
              <span style={{ fontSize:11, fontWeight:700, color:"#ffd700", width:20 }}>{minRating}</span>
            </div>
          </div>
        </div>
        <div style={{ overflowY:"auto", flex:1 }}>
          {filtered.length===0
            ? <div style={{ padding:28, textAlign:"center", color:"#6b7280" }}>Nessun giocatore trovato</div>
            : filtered.map(player=>{
              const inLineup = !isAlt && usedIds.has(player.id);
              const isExpiring = player.contract <= 2026;
              return (
                <div key={player.id} onClick={()=>!inLineup&&onSelectPlayer(player)}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 14px", cursor:inLineup?"default":"pointer", opacity:inLineup?0.3:1, borderBottom:"1px solid rgba(255,255,255,0.04)", pointerEvents:inLineup?"none":"auto" }}
                  onMouseEnter={e=>{if(!inLineup)e.currentTarget.style.background="rgba(255,255,255,0.05)";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                  <KitSVG club={player.club} size={28}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>
                      {player.name} <span style={{ fontSize:11 }}>{NATION_FLAGS[player.nation]||""}</span>
                    </div>
                    <div style={{ fontSize:10, color:"#6b7280" }}>{player.club} · {player.age}a · {player.foot==="L"?"✦ Sinistro":"Destro"} {isExpiring&&<span style={{ color:"#ef4444" }}>· scad.{player.contract}</span>}</div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:"#16a34a" }}>€{player.value}M</div>
                    <div style={{ fontSize:9, color:POSITION_COLORS[player.position]||"#6b7280", background:(POSITION_COLORS[player.position]||"#6b7280")+"22", padding:"1px 5px", borderRadius:3, fontWeight:700, marginTop:2 }}>{player.position}</div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:800, color:getRatingColor(player.rating), width:26, textAlign:"right", flexShrink:0 }}>{player.rating}</div>
                </div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}

// ─── TEAM SETTINGS ───────────────────────────────────────────────────────────
function TeamSettings({ teamName, setTeamName, teamColor, setTeamColor, formation, setFormation, onOpenTeamPicker, showKits, setShowKits }) {
  const colors = ["#16a34a","#2563eb","#dc2626","#d97706","#7c3aed","#db2777","#0891b2","#e5e7eb","#000000","#8B2500"];
  const categories = [...new Set(Object.values(FORMATIONS).map(f=>f.category))];
  return (
    <div style={{ background:"#111827", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", overflow:"hidden" }}>
      <button onClick={onOpenTeamPicker} style={{ width:"100%", padding:"10px 12px", background:"rgba(22,163,74,0.1)", border:"none", borderBottom:"1px solid rgba(255,255,255,0.08)", color:"#16a34a", fontSize:12, fontWeight:700, cursor:"pointer" }}>🏟️ Carica squadra Serie A</button>
      <div style={{ padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize:9, fontWeight:700, color:"#4b5563", letterSpacing:"1px", textTransform:"uppercase", marginBottom:5 }}>Nome squadra</div>
        <input value={teamName} onChange={e=>setTeamName(e.target.value)} placeholder="La tua squadra..." maxLength={24}
          style={{ width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:7, padding:"6px 9px", color:"#fff", fontSize:12, outline:"none", boxSizing:"border-box" }}/>
      </div>
      <div style={{ padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize:9, fontWeight:700, color:"#4b5563", letterSpacing:"1px", textTransform:"uppercase", marginBottom:5 }}>Colore kit</div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {colors.map(c=><div key={c} onClick={()=>setTeamColor(c)} style={{ width:18, height:18, borderRadius:"50%", backgroundColor:c, cursor:"pointer", border:teamColor===c?"2.5px solid #fff":"2px solid rgba(255,255,255,0.15)", boxShadow:teamColor===c?`0 0 5px ${c}`:"none", transition:"all 0.12s" }}/>)}
        </div>
      </div>
      <div style={{ padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize:9, fontWeight:700, color:"#4b5563", letterSpacing:"1px", textTransform:"uppercase", marginBottom:5 }}>Modulo</div>
        {categories.map(cat=>(
          <div key={cat} style={{ marginBottom:6 }}>
            <div style={{ fontSize:8, color:"#374151", fontWeight:700, letterSpacing:"0.8px", marginBottom:3, textTransform:"uppercase" }}>{cat}</div>
            <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
              {Object.entries(FORMATIONS).filter(([,f])=>f.category===cat).map(([key])=>(
                <button key={key} onClick={()=>setFormation(key)} style={{ padding:"3px 7px", borderRadius:4, fontSize:10, fontWeight:700, cursor:"pointer", border:"1px solid", background:formation===key?teamColor:"transparent", borderColor:formation===key?teamColor:"rgba(255,255,255,0.12)", color:formation===key?(teamColor==="#e5e7eb"?"#000":"#fff"):"#9ca3af" }}>{key}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding:"8px 12px" }}>
        <button onClick={()=>setShowKits(s=>!s)} style={{ width:"100%", padding:"6px", borderRadius:6, border:`1px solid ${showKits?"#16a34a":"rgba(255,255,255,0.12)"}`, background:showKits?"rgba(22,163,74,0.12)":"transparent", color:showKits?"#16a34a":"#6b7280", fontSize:11, fontWeight:600, cursor:"pointer" }}>
          {showKits?"✓ Kit abilitati":"⚽ Mostra kit squadre"}
        </button>
      </div>
    </div>
  );
}

// ─── STAT SELECTOR ───────────────────────────────────────────────────────────
function StatSelector({ activeStats, setActiveStats }) {
  const toggle = id => setActiveStats(prev => prev.includes(id)?prev.filter(s=>s!==id):[...prev,id]);
  return (
    <div style={{ background:"#111827", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", padding:"10px 12px" }}>
      <div style={{ fontSize:9, fontWeight:700, color:"#4b5563", letterSpacing:"1px", textTransform:"uppercase", marginBottom:7 }}>Info visibili sul campo</div>
      {STAT_VIEWS.map(sv=>{
        const active = activeStats.includes(sv.id);
        return (
          <button key={sv.id} onClick={()=>toggle(sv.id)} style={{ display:"flex", alignItems:"center", gap:7, padding:"5px 9px", borderRadius:6, border:`1px solid ${active?sv.color:"rgba(255,255,255,0.08)"}`, background:active?sv.color+"18":"transparent", cursor:"pointer", textAlign:"left", width:"100%", marginBottom:4 }}>
            <span style={{ fontSize:12 }}>{sv.icon}</span>
            <span style={{ fontSize:11, fontWeight:600, color:active?sv.color:"#6b7280", flex:1 }}>{sv.label}</span>
            <div style={{ width:13, height:13, borderRadius:3, background:active?sv.color:"transparent", border:`1.5px solid ${active?sv.color:"#374151"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"#000" }}>{active?"✓":""}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── COMPARE HEADER ──────────────────────────────────────────────────────────
function CompareHeader({ team1, team2, lineup1, lineup2 }) {
  const avg = (lu,key) => { const f=lu.filter(Boolean); return f.length?f.reduce((a,p)=>a+(p[key]||0),0)/f.length:0; };
  const sum = (lu,key) => lu.filter(Boolean).reduce((a,p)=>a+(p[key]||0),0);
  const metrics = [
    {label:"Rating medio", a:avg(lineup1,"rating").toFixed(1), b:avg(lineup2,"rating").toFixed(1), numA:avg(lineup1,"rating"), numB:avg(lineup2,"rating"), hib:true},
    {label:"Età media", a:avg(lineup1,"age").toFixed(1)+"a", b:avg(lineup2,"age").toFixed(1)+"a", numA:avg(lineup1,"age"), numB:avg(lineup2,"age"), hib:false},
    {label:"Valore", a:`€${sum(lineup1,"value")}M`, b:`€${sum(lineup2,"value")}M`, numA:sum(lineup1,"value"), numB:sum(lineup2,"value"), hib:true},
    {label:"Stipendi/a", a:`€${sum(lineup1,"wage").toLocaleString("it-IT")}K`, b:`€${sum(lineup2,"wage").toLocaleString("it-IT")}K`, numA:sum(lineup1,"wage"), numB:sum(lineup2,"wage"), hib:true},
  ];
  return (
    <div style={{ background:"#111827", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", padding:"12px 14px", marginBottom:10 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:6, alignItems:"center", marginBottom:10 }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:900, color:team1.color }}>{team1.name||"Squadra A"}</div>
          <div style={{ fontSize:10, color:"#6b7280" }}>{lineup1.filter(Boolean).length}/11</div>
        </div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:900, color:"#374151" }}>VS</div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:900, color:team2.color }}>{team2.name||"Squadra B"}</div>
          <div style={{ fontSize:10, color:"#6b7280" }}>{lineup2.filter(Boolean).length}/11</div>
        </div>
      </div>
      {metrics.map(m=>{
        const aWins = m.hib?m.numA>m.numB:m.numA<m.numB;
        const bWins = m.hib?m.numB>m.numA:m.numB<m.numA;
        return (
          <div key={m.label} style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:4, alignItems:"center", marginBottom:5 }}>
            <div style={{ textAlign:"right", fontSize:12, fontWeight:700, color:aWins?team1.color:"#9ca3af" }}>{m.a}</div>
            <div style={{ fontSize:9, color:"#4b5563", textAlign:"center", minWidth:65 }}>{m.label}</div>
            <div style={{ textAlign:"left", fontSize:12, fontWeight:700, color:bWins?team2.color:"#9ca3af" }}>{m.b}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── LINEUP PANEL ────────────────────────────────────────────────────────────
function LineupPanel({ lineup, altPlayers, formation, onRemovePlayer, onRemoveAlt, activeStats }) {
  const positions = FORMATIONS[formation]?.positions||[];
  const shownStats = STAT_VIEWS.filter(s=>activeStats.includes(s.id)&&s.id!=="rating");
  return (
    <div style={{ background:"#111827", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", overflow:"hidden" }}>
      <div style={{ padding:"9px 12px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, color:"#fff" }}>XI ({lineup.filter(Boolean).length}/11)</span>
      </div>
      <div style={{ maxHeight:440, overflowY:"auto" }}>
        {positions.map(pos=>{
          const player = lineup[pos.slot];
          const alt = altPlayers[pos.slot]?PLAYERS.find(p=>p.id===altPlayers[pos.slot]):null;
          const rc = POSITION_COLORS[pos.role]||"#6b7280";
          return (
            <div key={pos.slot} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px" }}>
                <div style={{ width:24, fontSize:8, fontWeight:700, color:rc, background:rc+"22", borderRadius:3, textAlign:"center", padding:"2px", flexShrink:0 }}>{pos.role}</div>
                {player ? (
                  <>
                    <KitSVG club={player.club} size={22}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {player.shortName} {player.foot==="L"&&<span style={{ fontSize:8, color:"#ec4899" }}>✦</span>}
                        {player.contract<=2026&&<span style={{ fontSize:8, color:"#ef4444", marginLeft:3 }}>⚠{player.contract}</span>}
                      </div>
                      {shownStats.length>0&&<div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                        {shownStats.map(sv=>player[sv.id]!==undefined&&<span key={sv.id} style={{ fontSize:8, color:sv.id==="contract"&&player.contract<=2026?"#ef4444":sv.color, fontWeight:700 }}>{sv.id==="nation"?NATION_FLAGS[player.nation]||player.nation:`${sv.icon}${sv.format(player[sv.id])}`}</span>)}
                      </div>}
                    </div>
                    {activeStats.includes("rating")&&<div style={{ fontSize:10, fontWeight:800, color:getRatingColor(player.rating), flexShrink:0 }}>{player.rating}</div>}
                    <button onClick={()=>onRemovePlayer(pos.slot)} style={{ background:"none", border:"none", color:"#374151", cursor:"pointer", fontSize:11, padding:2, flexShrink:0 }}>✕</button>
                  </>
                ) : <div style={{ fontSize:10, color:"#1f2937", fontStyle:"italic" }}>Slot libero</div>}
              </div>
              {alt&&<div style={{ display:"flex", alignItems:"center", gap:6, padding:"3px 10px 4px 36px", background:"rgba(22,163,74,0.05)" }}>
                <span style={{ fontSize:9, color:"#16a34a", fontWeight:700, width:24, textAlign:"center" }}>↕</span>
                <KitSVG club={alt.club} size={18}/>
                <div style={{ flex:1, fontSize:10, color:"#16a34a", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{alt.shortName}</div>
                <div style={{ fontSize:9, fontWeight:800, color:getRatingColor(alt.rating) }}>{alt.rating}</div>
                <button onClick={()=>onRemoveAlt(pos.slot)} style={{ background:"none", border:"none", color:"#374151", cursor:"pointer", fontSize:10 }}>✕</button>
              </div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── BENCH PANEL ─────────────────────────────────────────────────────────────
function BenchPanel({ benchPlayers, lineup, altPlayers, onSetAlt, activeStats }) {
  const shownStats = STAT_VIEWS.filter(s=>activeStats.includes(s.id)&&s.id!=="rating");
  const starterIds = new Set(lineup.filter(Boolean).map(p=>p.id));
  const bench = benchPlayers.filter(p=>!starterIds.has(p.id));
  return (
    <div style={{ background:"#111827", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", overflow:"hidden", flex:1 }}>
      <div style={{ padding:"9px 12px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, color:"#fff" }}>Rosa ({bench.length})</div>
        <div style={{ fontSize:9, color:"#4b5563", marginTop:1 }}>Clicca → imposta come alternativa</div>
      </div>
      <div style={{ overflowY:"auto", maxHeight:500 }}>
        {bench.length===0&&<div style={{ padding:20, color:"#374151", fontSize:12, textAlign:"center" }}>Carica una squadra</div>}
        {bench.map(player=>{
          const rc = POSITION_COLORS[player.position]||"#6b7280";
          const isAltFor = Object.values(altPlayers).includes(player.id);
          const isExpiring = player.contract<=2026;
          return (
            <div key={player.id} onClick={()=>onSetAlt(player)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", borderBottom:"1px solid rgba(255,255,255,0.04)", cursor:"pointer" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.04)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ width:22, fontSize:8, fontWeight:700, color:rc, background:rc+"22", borderRadius:3, textAlign:"center", padding:"2px", flexShrink:0 }}>{player.position}</div>
              <KitSVG club={player.club} size={22}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:700, color:isAltFor?"#16a34a":"#f9fafb", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {player.shortName}
                  {player.foot==="L"&&<span style={{ fontSize:8, color:"#ec4899", marginLeft:3 }}>✦</span>}
                  {isExpiring&&<span style={{ fontSize:8, color:"#ef4444", marginLeft:3 }}>⚠{player.contract}</span>}
                  {isAltFor&&<span style={{ fontSize:8, color:"#16a34a", marginLeft:3 }}>↕</span>}
                </div>
                {shownStats.length>0&&<div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                  {shownStats.map(sv=>player[sv.id]!==undefined&&<span key={sv.id} style={{ fontSize:8, color:sv.id==="contract"&&isExpiring?"#ef4444":sv.color, fontWeight:700 }}>{sv.id==="nation"?NATION_FLAGS[player.nation]||player.nation:`${sv.icon}${sv.format(player[sv.id])}`}</span>)}
                </div>}
              </div>
              <div style={{ fontSize:10, fontWeight:800, color:getRatingColor(player.rating), flexShrink:0 }}>{player.rating}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SQUAD STATS ─────────────────────────────────────────────────────────────
function SquadStats({ lineup }) {
  const filled = lineup.filter(Boolean);
  if (!filled.length) return null;
  const avg = key => { const v=filled.map(p=>p[key]).filter(x=>x!==undefined); return v.length?v.reduce((a,b)=>a+b,0)/v.length:0; };
  const sum = key => filled.reduce((a,p)=>a+(p[key]||0),0);
  const ageGroups = {"≤21":0,"22-25":0,"26-29":0,"30+":0};
  filled.forEach(p=>{ if(p.age<=21)ageGroups["\u226421"]++; else if(p.age<=25)ageGroups["22-25"]++; else if(p.age<=29)ageGroups["26-29"]++; else ageGroups["30+"]++; });
  const expiringCount = filled.filter(p=>p.contract<=2026).length;
  const leftFootCount = filled.filter(p=>p.foot==="L").length;
  return (
    <div style={{ background:"#111827", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", overflow:"hidden" }}>
      <div style={{ padding:"9px 12px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize:9, fontWeight:700, color:"#4b5563", letterSpacing:"1px", textTransform:"uppercase" }}>Statistiche rosa</div>
      </div>
      <div style={{ padding:"3px 0" }}>
        {[
          {label:"Giocatori",value:`${filled.length}/11`},
          {label:"Rating medio",value:avg("rating").toFixed(1),color:getRatingColor(avg("rating"))},
          {label:"Età media",value:`${avg("age").toFixed(1)} anni`},
          {label:"Valore totale",value:`€${sum("value")}M`,color:"#16a34a"},
          {label:"Stipendi/anno",value:`€${sum("wage").toLocaleString("it-IT")}K`,color:"#f59e0b"},
          {label:"Altezza media",value:`${avg("height").toFixed(0)} cm`},
          {label:"Mancini",value:`${leftFootCount}`,color:"#ec4899"},
          {label:"In scadenza",value:`${expiringCount}`,color:expiringCount>0?"#ef4444":"#6b7280"},
        ].map(s=>(
          <div key={s.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 12px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize:11, color:"#6b7280" }}>{s.label}</span>
            <span style={{ fontSize:11, fontWeight:700, color:s.color||"#f9fafb" }}>{s.value}</span>
          </div>
        ))}
      </div>
      <div style={{ padding:"8px 12px 10px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize:9, fontWeight:700, color:"#4b5563", textTransform:"uppercase", marginBottom:6 }}>Distribuzione età</div>
        {Object.entries(ageGroups).map(([label,count])=>(
          <div key={label} style={{ display:"flex", alignItems:"center", gap:5, marginBottom:4 }}>
            <span style={{ fontSize:9, color:"#6b7280", width:34, flexShrink:0 }}>{label}</span>
            <div style={{ flex:1, height:4, background:"rgba(255,255,255,0.07)", borderRadius:2, overflow:"hidden" }}>
              <div style={{ width:`${filled.length?(count/filled.length)*100:0}%`, height:"100%", background:label==="≤21"?"#3b82f6":label==="22-25"?"#16a34a":label==="26-29"?"#f59e0b":"#ef4444", borderRadius:2 }}/>
            </div>
            <span style={{ fontSize:9, color:"#9ca3af", width:10, textAlign:"right" }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ALT SLOT PICKER ─────────────────────────────────────────────────────────
function AltSlotPicker({ player, lineup, positions, onSelect, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#111827", borderRadius:14, width:"100%", maxWidth:360, border:"1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700, color:"#fff" }}>Alternativa per quale slot?</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:18 }}>✕</button>
        </div>
        <div style={{ padding:"6px 0", maxHeight:340, overflowY:"auto" }}>
          {positions.map(pos=>{
            const starter = lineup[pos.slot];
            if (!starter) return null;
            const rc = POSITION_COLORS[pos.role]||"#6b7280";
            return (
              <div key={pos.slot} onClick={()=>onSelect(pos.slot)}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px", cursor:"pointer", borderBottom:"1px solid rgba(255,255,255,0.04)" }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{ width:26, fontSize:8, fontWeight:700, color:rc, background:rc+"22", borderRadius:3, textAlign:"center", padding:"2px 3px", flexShrink:0 }}>{pos.role}</div>
                <KitSVG club={starter.club} size={26}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{starter.name}</div>
                  <div style={{ fontSize:10, color:"#6b7280" }}>→ {player.name}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toast({ message, onDone }) {
  useEffect(()=>{const t=setTimeout(onDone,2500);return()=>clearTimeout(t);},[onDone]);
  return <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#16a34a", color:"#fff", padding:"10px 20px", borderRadius:10, fontWeight:700, fontSize:14, zIndex:999, boxShadow:"0 8px 24px rgba(0,0,0,0.4)" }}>{message}</div>;
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState("single"); // single | compare
  const [activeTeam, setActiveTeam] = useState(0);

  // Team 1
  const [lineup1, setLineup1] = useState(Array(11).fill(null));
  const [formation1, setFormation1] = useState("4-3-3");
  const [teamName1, setTeamName1] = useState("Squadra A");
  const [teamColor1, setTeamColor1] = useState("#16a34a");
  const [altPlayers1, setAltPlayers1] = useState({});
  const [bench1, setBench1] = useState([]);

  // Team 2
  const [lineup2, setLineup2] = useState(Array(11).fill(null));
  const [formation2, setFormation2] = useState("4-3-3");
  const [teamName2, setTeamName2] = useState("Squadra B");
  const [teamColor2, setTeamColor2] = useState("#2563eb");
  const [altPlayers2, setAltPlayers2] = useState({});
  const [bench2, setBench2] = useState([]);

  // UI
  const [activeStats, setActiveStats] = useState(["rating"]);
  const [showKits, setShowKits] = useState(false);
  const [selectingSlot, setSelectingSlot] = useState(null);
  const [selectedSlotRole, setSelectedSlotRole] = useState(null);
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [altPickerPlayer, setAltPickerPlayer] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null);
  const [savedLineups, setSavedLineups] = useState([]);
  const [showSaved, setShowSaved] = useState(false);
  const pitchRef = useRef();

  const lineup = activeTeam===0?lineup1:lineup2;
  const formation = activeTeam===0?formation1:formation2;
  const teamName = activeTeam===0?teamName1:teamName2;
  const teamColor = activeTeam===0?teamColor1:teamColor2;
  const altPlayers = activeTeam===0?altPlayers1:altPlayers2;
  const bench = activeTeam===0?bench1:bench2;
  const setLineup = activeTeam===0?setLineup1:setLineup2;
  const setFormation = activeTeam===0?setFormation1:setFormation2;
  const setTeamName = activeTeam===0?setTeamName1:setTeamName2;
  const setTeamColor = activeTeam===0?setTeamColor1:setTeamColor2;
  const setAltPlayers = activeTeam===0?setAltPlayers1:setAltPlayers2;
  const setBench = activeTeam===0?setBench1:setBench2;

  useEffect(()=>{
    const hash = window.location.hash.slice(1);
    if (hash) {
      const data = decodeLineup(hash);
      if (data) {
        const players = data.l.map(id=>id?PLAYERS.find(p=>p.id===id)||null:null);
        setLineup1(players);
        if(data.f)setFormation1(data.f);
        if(data.n)setTeamName1(data.n);
        if(data.c)setTeamColor1(data.c);
        if(data.a)setAltPlayers1(data.a);
      }
    }
    setSavedLineups(JSON.parse(localStorage.getItem(SAVED_KEY)||"[]"));
  },[]);

  const XL_ROLE_MAP = {
    'GK':'GK','ST':'ST','LS':'ST','RS':'ST','CF':'ST',
    'LCB':'CB','RCB':'CB','CB':'CB','MCB':'CB',
    'LB':'LB','LWB':'LB','RB':'RB','RWB':'RB',
    'CDM':'DM','LCDM':'DM','RCDM':'DM',
    'LCM':'CM','RCM':'CM','CM':'CM',
    'CAM':'AM','LAM':'LW','RAM':'RW',
    'LM':'LM','RM':'RM','LW':'LW','RW':'RW',
  };

  const loadTeam = (teamData) => {
    const targetFormation = teamData.formation || "4-3-3";
    setFormation(targetFormation);
    const positions = FORMATIONS[targetFormation]?.positions || [];
    const newLineup = Array(11).fill(null);
    const usedIds = new Set();
    const starterObjs = (teamData.starters||[]).map(s=>({...s,player:s.playerId?PLAYERS.find(p=>p.id===s.playerId):null})).filter(s=>s.player);
    positions.forEach(pos=>{
      if(newLineup[pos.slot])return;
      const candidate = starterObjs.find(s=>XL_ROLE_MAP[s.xlRole]===pos.role&&!usedIds.has(s.player.id))
        || starterObjs.find(s=>!usedIds.has(s.player.id)&&s.player.position===pos.role);
      if(candidate){newLineup[pos.slot]=candidate.player;usedIds.add(candidate.player.id);}
    });
    const teamPlayers = PLAYERS.filter(p=>p.club===teamData.name).sort((a,b)=>b.rating-a.rating);
    positions.forEach(pos=>{
      if(newLineup[pos.slot])return;
      const c=teamPlayers.find(p=>p.position===pos.role&&!usedIds.has(p.id));
      if(c){newLineup[pos.slot]=c;usedIds.add(c.id);}
    });
    positions.forEach(pos=>{
      if(newLineup[pos.slot])return;
      const c=teamPlayers.find(p=>!usedIds.has(p.id));
      if(c){newLineup[pos.slot]=c;usedIds.add(c.id);}
    });
    setLineup(newLineup);
    setTeamName(teamData.name);
    setTeamColor(teamData.color);
    setAltPlayers({});
    setBench(PLAYERS.filter(p=>p.club===teamData.name));
    setShowTeamPicker(false);
    setToast(`${teamData.name} caricata! ⚽`);
  };

  const handleSlotClick = (slot) => {
    const positions = FORMATIONS[formation]?.positions||[];
    const posData = positions.find(p=>p.slot===slot);
    setSelectedSlotRole(posData?.role||null);
    setSelectingSlot({slot,isAlt:false});
  };

  const handlePlayerSelect = (player) => {
    if(!selectingSlot)return;
    const {slot,isAlt} = selectingSlot;
    if(isAlt){setAltPlayers(prev=>({...prev,[slot]:player.id}));}
    else{setLineup(prev=>{const next=[...prev];next[slot]=player;return next;});}
    setSelectingSlot(null);
  };

  const handleSlotDrop = useCallback((slot,{player,fromSlot})=>{
    setLineup(prev=>{
      const next=[...prev];
      if(fromSlot!==undefined&&fromSlot!==null){[next[fromSlot],next[slot]]=[next[slot],next[fromSlot]];}
      else{next[slot]=player;}
      return next;
    });
  },[activeTeam,setLineup1,setLineup2]);

  const handleBenchPlayerClick = (player) => setAltPickerPlayer(player);
  const handleAltSlotSelect = (slot) => {
    if(!altPickerPlayer)return;
    setAltPlayers(prev=>({...prev,[slot]:altPickerPlayer.id}));
    setAltPickerPlayer(null);
    setToast(`${altPickerPlayer.shortName} → alternativa ↕`);
  };

  const handleRemovePlayer = slot => setLineup(prev=>{const next=[...prev];next[slot]=null;return next;});
  const handleRemoveAlt = slot => setAltPlayers(prev=>{const next={...prev};delete next[slot];return next;});

  const handleShare = () => {
    const code = encodeLineup(lineup1,formation1,teamName1,teamColor1,altPlayers1);
    const url = `${window.location.origin}${window.location.pathname}#${code}`;
    navigator.clipboard.writeText(url).then(()=>setToast("Link copiato! 🔗")).catch(()=>{});
  };

  const handleSave = () => {
    const saved = JSON.parse(localStorage.getItem(SAVED_KEY)||"[]");
    const entry = {id:Date.now(),name:teamName1,formation:formation1,color:teamColor1,lineup:lineup1.map(p=>p?.id??null),altPlayers:altPlayers1,date:new Date().toLocaleDateString("it-IT")};
    const updated = [entry,...saved].slice(0,10);
    localStorage.setItem(SAVED_KEY,JSON.stringify(updated));
    setSavedLineups(updated);
    setToast("Salvata! 💾");
  };

  const handleLoadSaved = entry => {
    const players = entry.lineup.map(id=>id?PLAYERS.find(p=>p.id===id)||null:null);
    setLineup1(players);setFormation1(entry.formation);setTeamName1(entry.name);
    setTeamColor1(entry.color);setAltPlayers1(entry.altPlayers||{});
    setShowSaved(false);setToast("Caricata! ✅");
  };

  const positions = FORMATIONS[formation]?.positions||[];

  // Responsive: detect narrow screen
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  useEffect(()=>{
    const h = ()=>setIsMobile(window.innerWidth<900);
    window.addEventListener("resize",h); return ()=>window.removeEventListener("resize",h);
  },[]);

  const gridCols = mode==="compare"
    ? (isMobile?"1fr":"200px 1fr 1fr 200px")
    : (isMobile?"1fr":"200px 1fr 200px 180px");

  return (
    <div style={{ minHeight:"100vh", background:"#0a0e1a", color:"#fff", fontFamily:"'Inter',sans-serif" }}>
      <style>{`*{box-sizing:border-box;}body{margin:0;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px;} input[type=range]{accent-color:#16a34a;}`}</style>

      {/* HEADER */}
      <header style={{ background:"rgba(0,0,0,0.65)", backdropFilter:"blur(12px)", borderBottom:"1px solid rgba(255,255,255,0.08)", padding:"0 16px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:26, height:26, background:"linear-gradient(135deg,#16a34a,#059669)", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>⚽</div>
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:900, lineHeight:1 }}>LINEUP BUILDER</div>
            <div style={{ fontSize:8, color:"#4b5563", letterSpacing:"1.5px", fontWeight:600 }}>UNIVERSO SPORTIVO</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:5, alignItems:"center", flexWrap:"wrap" }}>
          {/* Mode toggle */}
          <div style={{ display:"flex", background:"rgba(255,255,255,0.06)", borderRadius:7, border:"1px solid rgba(255,255,255,0.1)", overflow:"hidden" }}>
            {[{id:"single",label:"Builder"},{id:"compare",label:"⚔️ VS"}].map(m=>(
              <button key={m.id} onClick={()=>{setMode(m.id);setActiveTeam(0);}} style={{ padding:"5px 10px", border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background:mode===m.id?"#16a34a":"transparent", color:mode===m.id?"#fff":"#9ca3af" }}>{m.label}</button>
            ))}
          </div>
          <button onClick={()=>setExporting(true)} title="Esporta immagine" style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", color:"#fff", borderRadius:6, padding:"5px 9px", cursor:"pointer", fontSize:12 }}>📸</button>
          <button onClick={handleSave} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", color:"#fff", borderRadius:6, padding:"5px 9px", cursor:"pointer", fontSize:12 }}>💾</button>
          <button onClick={()=>setShowSaved(s=>!s)} style={{ background:showSaved?"#16a34a18":"rgba(255,255,255,0.07)", border:`1px solid ${showSaved?"#16a34a":"rgba(255,255,255,0.1)"}`, color:showSaved?"#16a34a":"#fff", borderRadius:6, padding:"5px 9px", cursor:"pointer", fontSize:11, fontWeight:600 }}>📁{savedLineups.length>0&&` (${savedLineups.length})`}</button>
          <button onClick={handleShare} style={{ background:"#16a34a", border:"none", color:"#fff", borderRadius:6, padding:"5px 11px", cursor:"pointer", fontSize:11, fontWeight:700 }}>🔗</button>
        </div>
      </header>

      {showSaved && (
        <div style={{ background:"#0d1117", borderBottom:"1px solid rgba(255,255,255,0.07)", padding:"10px 16px" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, marginBottom:8, color:"#fff" }}>Formazzioni salvate</div>
          {savedLineups.length===0?<div style={{ color:"#4b5563", fontSize:11 }}>Nessuna salvata</div>
          :<div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
            {savedLineups.map(e=>(
              <div key={e.id} onClick={()=>handleLoadSaved(e)} style={{ background:"#111827", border:`1px solid ${e.color}44`, borderRadius:8, padding:"6px 10px", cursor:"pointer", display:"flex", alignItems:"center", gap:7 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:e.color }}/>
                <div><div style={{ fontSize:11, fontWeight:700, color:"#fff" }}>{e.name}</div><div style={{ fontSize:9, color:"#4b5563" }}>{e.formation} · {e.date}</div></div>
              </div>
            ))}
          </div>}
        </div>
      )}

      {/* MAIN */}
      <main style={{ maxWidth:mode==="compare"?1320:1160, margin:"0 auto", padding:"12px 10px", display:"grid", gridTemplateColumns:gridCols, gap:12, alignItems:"start" }}>

        {/* COL 1: Settings */}
        {(!isMobile||true) && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {mode==="compare" && (
              <div style={{ display:"flex", gap:6 }}>
                {[{i:0,n:teamName1,c:teamColor1},{i:1,n:teamName2,c:teamColor2}].map(t=>(
                  <button key={t.i} onClick={()=>setActiveTeam(t.i)} style={{ flex:1, padding:"6px 8px", borderRadius:7, border:`2px solid ${t.c}`, background:activeTeam===t.i?t.c+"22":"transparent", color:activeTeam===t.i?t.c:"#4b5563", cursor:"pointer", fontWeight:700, fontSize:11 }}>{t.n||`Squadra ${t.i+1}`}</button>
                ))}
              </div>
            )}
            <TeamSettings teamName={teamName} setTeamName={setTeamName} teamColor={teamColor} setTeamColor={setTeamColor}
              formation={formation} setFormation={setFormation} onOpenTeamPicker={()=>setShowTeamPicker(true)}
              showKits={showKits} setShowKits={setShowKits}/>
            <StatSelector activeStats={activeStats} setActiveStats={setActiveStats}/>
            <div style={{ background:"#111827", borderRadius:10, border:"1px solid rgba(255,255,255,0.08)", padding:"9px 12px" }}>
              <button onClick={()=>{setLineup(Array(11).fill(null));setAltPlayers({});setBench([]);}}
                style={{ width:"100%", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", color:"#f87171", borderRadius:6, padding:"6px", cursor:"pointer", fontSize:11, fontWeight:600 }}>🗑 Svuota</button>
            </div>
          </div>
        )}

        {/* COL 2: Pitch 1 */}
        <div>
          {mode==="compare" && <CompareHeader team1={{name:teamName1,color:teamColor1}} team2={{name:teamName2,color:teamColor2}} lineup1={lineup1} lineup2={lineup2}/>}
          <Pitch lineup={lineup1} altPlayers={altPlayers1} formation={formation1}
            onSlotDrop={(slot,data)=>{setActiveTeam(0);if(activeTeam===1){setActiveTeam(0);} const s=setLineup1;s(prev=>{const next=[...prev];if(data.fromSlot!==undefined&&data.fromSlot!==null){[next[data.fromSlot],next[slot]]=[next[slot],next[data.fromSlot]];}else{next[slot]=data.player;}return next;});}}
            onSlotClick={(slot)=>{setActiveTeam(0);handleSlotClick(slot);}}
            teamName={teamName1} teamColor={teamColor1} activeStats={activeStats} showKits={showKits} pitchRef={pitchRef}/>
        </div>

        {/* COL 3: Pitch 2 (compare) or Lineup+Bench */}
        {mode==="compare" ? (
          <Pitch lineup={lineup2} altPlayers={altPlayers2} formation={formation2}
            onSlotDrop={(slot,data)=>{setActiveTeam(1);const s=setLineup2;s(prev=>{const next=[...prev];if(data.fromSlot!==undefined&&data.fromSlot!==null){[next[data.fromSlot],next[slot]]=[next[slot],next[data.fromSlot]];}else{next[slot]=data.player;}return next;});}}
            onSlotClick={(slot)=>{setActiveTeam(1);const positions=FORMATIONS[formation2]?.positions||[];const posData=positions.find(p=>p.slot===slot);setSelectedSlotRole(posData?.role||null);setSelectingSlot({slot,isAlt:false});}}
            teamName={teamName2} teamColor={teamColor2} activeStats={activeStats} showKits={showKits}/>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <LineupPanel lineup={lineup} altPlayers={altPlayers} formation={formation}
              onRemovePlayer={handleRemovePlayer} onRemoveAlt={handleRemoveAlt} activeStats={activeStats}/>
            <BenchPanel benchPlayers={bench} lineup={lineup} altPlayers={altPlayers}
              onSetAlt={handleBenchPlayerClick} activeStats={activeStats}/>
          </div>
        )}

        {/* COL 4: Stats */}
        {!isMobile && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <SquadStats lineup={lineup}/>
            {mode==="compare" && (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <LineupPanel lineup={lineup} altPlayers={altPlayers} formation={formation}
                  onRemovePlayer={handleRemovePlayer} onRemoveAlt={handleRemoveAlt} activeStats={activeStats}/>
                <BenchPanel benchPlayers={bench} lineup={lineup} altPlayers={altPlayers}
                  onSetAlt={handleBenchPlayerClick} activeStats={activeStats}/>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODALS */}
      {showTeamPicker && <TeamPicker onSelect={loadTeam} onClose={()=>setShowTeamPicker(false)}/>}
      {selectingSlot!==null && (
        <PlayerSearch onSelectPlayer={handlePlayerSelect} onClose={()=>setSelectingSlot(null)}
          selectedSlotRole={selectedSlotRole} currentLineup={lineup}
          isAlt={selectingSlot.isAlt} slotPlayer={lineup[selectingSlot.slot]}/>
      )}
      {altPickerPlayer && (
        <AltSlotPicker player={altPickerPlayer} lineup={lineup} positions={positions}
          onSelect={handleAltSlotSelect} onClose={()=>setAltPickerPlayer(null)}/>
      )}
      {exporting && (
        <ExportCanvas lineup={activeTeam===0?lineup1:lineup2} formation={activeTeam===0?formation1:formation2}
          teamName={activeTeam===0?teamName1:teamName2} teamColor={activeTeam===0?teamColor1:teamColor2}
          activeStats={activeStats} onDone={()=>{setExporting(false);setToast("Immagine scaricata! 📸");}}/>
      )}
      {toast && <Toast message={toast} onDone={()=>setToast(null)}/>}
    </div>
  );
}

