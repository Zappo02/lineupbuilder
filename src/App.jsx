import React, { useState, useRef, useEffect, useCallback } from "react";
import { PLAYERS, FORMATIONS, POSITION_COLORS, STAT_VIEWS, SERIE_A_TEAMS, NATION_FLAGS } from "./data/players.js";

// ─── UTILITY ─────────────────────────────────────────────────────────────────
const encodeLineup = (lineup, formation, teamName, color, altPlayers) => {
  try { return btoa(unescape(encodeURIComponent(JSON.stringify({ f:formation,n:teamName,c:color,l:lineup.map(s=>s?.id??null),a:altPlayers })))); } catch { return ""; }
};
const decodeLineup = str => { try { return JSON.parse(decodeURIComponent(escape(atob(str)))); } catch { return null; } };
const getInitials = name => name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
const getRatingColor = r => r>=90?"#ffd700":r>=85?"#c8c8c8":r>=80?"#cd7f32":"#6b7280";
const SAVED_KEY = "lineup_builder_v5";
const MAX_FIELD_STATS = 2;

// ─── UNDO / REDO HOOK ────────────────────────────────────────────────────────
function useUndoRedo(initial) {
  const [states, setStates] = useState([initial]);
  const [idx, setIdx] = useState(0);
  const current = states[idx];
  const canUndo = idx > 0;
  const canRedo = idx < states.length - 1;
  const set = useCallback(val => {
    const next = typeof val === 'function' ? val(states[idx]) : val;
    setStates(prev => [...prev.slice(0, idx + 1), next]);
    setIdx(i => i + 1);
  }, [states, idx]);
  const undo = useCallback(() => { if (canUndo) setIdx(i => i - 1); }, [canUndo]);
  const redo = useCallback(() => { if (canRedo) setIdx(i => i + 1); }, [canRedo]);
  const reset = useCallback(val => { setStates([val]); setIdx(0); }, []);
  return [current, set, undo, redo, canUndo, canRedo, reset];
}

// ─── AUTO-FILL helper ────────────────────────────────────────────────────────
function autoFillLineup(formation, existingLineup, pool) {
  const positions = FORMATIONS[formation]?.positions || [];
  const newLineup = [...existingLineup];
  const usedIds = new Set(newLineup.filter(Boolean).map(p => p.id));
  const sorted = [...pool].sort((a, b) => b.rating - a.rating);
  positions.forEach(pos => {
    if (newLineup[pos.slot]) return;
    const best = sorted.find(p => p.position === pos.role && !usedIds.has(p.id));
    if (best) { newLineup[pos.slot] = best; usedIds.add(best.id); }
  });
  // second pass: fill remaining with any player
  positions.forEach(pos => {
    if (newLineup[pos.slot]) return;
    const best = sorted.find(p => !usedIds.has(p.id));
    if (best) { newLineup[pos.slot] = best; usedIds.add(best.id); }
  });
  return newLineup;
}

// ─── KIT SVG (fixed, no pattern IDs clashing) ─────────────────────────────────
const TEAM_KIT = {
  "Juventus":   { p:"#1a1a1a", s:"#ffffff", style:"stripes-h" },
  "Inter":      { p:"#003399", s:"#000000", style:"stripes-v" },
  "Milan":      { p:"#C0392B", s:"#1a1a1a", style:"stripes-v" },
  "Roma":       { p:"#8B0000", s:"#e8b84b", style:"solid" },
  "Lazio":      { p:"#89CFF0", s:"#ffffff", style:"solid" },
  "Napoli":     { p:"#009FD4", s:"#ffffff", style:"solid" },
  "Atalanta":   { p:"#1A3A6B", s:"#000000", style:"stripes-v" },
  "Bologna":    { p:"#C0392B", s:"#1a1a1a", style:"halves" },
  "Fiorentina": { p:"#6A0DAD", s:"#ffffff", style:"solid" },
  "Como":       { p:"#0047AB", s:"#ffffff", style:"solid" },
  "Genoa":      { p:"#8B0000", s:"#1B4F72", style:"halves" },
  "Torino":     { p:"#8B2500", s:"#ffffff", style:"solid" },
};

function KitSVG({ club, size = 32 }) {
  const kit = TEAM_KIT[club] || { p:"#374151", s:"#6b7280", style:"solid" };
  const { p: primary, s: secondary, style } = kit;
  const w = size, h = Math.round(size * 1.15);
  // Safe pattern ID (no spaces, no special chars)
  const pid = `kit_${club.replace(/[^a-zA-Z0-9]/g, "_")}_${size}`;

  // Shirt path
  const body = `M${w*.22},${h*.14} L${w*.02},${h*.38} L${w*.19},${h*.45} L${w*.19},${h*.98} L${w*.81},${h*.98} L${w*.81},${h*.45} L${w*.98},${h*.38} L${w*.78},${h*.14} Q${w*.65},${h*.02} ${w*.5},${h*.09} Q${w*.35},${h*.02} ${w*.22},${h*.14}Z`;
  const lsleeve = `M${w*.22},${h*.14} L${w*.02},${h*.38} L${w*.19},${h*.45} L${w*.26},${h*.28}Z`;
  const rsleeve = `M${w*.78},${h*.14} L${w*.98},${h*.38} L${w*.81},${h*.45} L${w*.74},${h*.28}Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ flexShrink:0, display:"block" }}>
      <defs>
        {style==="stripes-v" && (
          <pattern id={pid} x="0" y="0" width={w*.25} height={h} patternUnits="userSpaceOnUse">
            <rect width={w*.125} height={h} fill={primary}/>
            <rect x={w*.125} width={w*.125} height={h} fill={secondary}/>
          </pattern>
        )}
        {style==="stripes-h" && (
          <pattern id={pid} x="0" y="0" width={w} height={h*.16} patternUnits="userSpaceOnUse">
            <rect width={w} height={h*.08} fill={primary}/>
            <rect y={h*.08} width={w} height={h*.08} fill={secondary}/>
          </pattern>
        )}
        <clipPath id={`cp_${pid}`}>
          <path d={body}/>
        </clipPath>
      </defs>

      {/* Body fill */}
      <path d={body} fill={
        style==="stripes-v" || style==="stripes-h" ? `url(#${pid})` : primary
      } stroke="rgba(255,255,255,0.2)" strokeWidth="0.6"/>

      {/* Halves: right side different color */}
      {style==="halves" && (
        <path d={`M${w*.5},${h*.09} L${w*.78},${h*.14} L${w*.98},${h*.38} L${w*.81},${h*.45} L${w*.81},${h*.98} L${w*.5},${h*.98}Z`}
          fill={secondary} clipPath={`url(#cp_${pid})`} opacity="0.9"/>
      )}

      {/* Sleeves */}
      <path d={lsleeve} fill={secondary} opacity="0.75"/>
      <path d={rsleeve} fill={secondary} opacity="0.75"/>

      {/* Collar */}
      <ellipse cx={w*.5} cy={h*.11} rx={w*.1} ry={h*.05} fill={secondary} opacity="0.95"/>
    </svg>
  );
}

// ─── AVATAR ──────────────────────────────────────────────────────────────────
function Avatar({ player, size = 36 }) {
  const color = POSITION_COLORS[player.position] || "#6b7280";
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", flexShrink:0, backgroundColor:color+"22", border:`2px solid ${color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*.31, fontWeight:800, color, fontFamily:"'Barlow Condensed',sans-serif" }}>
      {getInitials(player.name)}
    </div>
  );
}

// ─── STAT BADGES ON PITCH ─────────────────────────────────────────────────────
function StatBadges({ player, activeStats }) {
  if (!player) return null;
  const stats = STAT_VIEWS.filter(s => activeStats.includes(s.id) && s.id !== "rating" && player[s.id] !== undefined);
  if (!stats.length) return null;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:2, alignItems:"center", marginTop:2 }}>
      {stats.slice(0, MAX_FIELD_STATS).map(sv => {
        const isExpiring = sv.id==="contract" && player.contract <= 2026;
        let label;
        if (sv.id === "nation") label = NATION_FLAGS[player.nation] || player.nation;
        else if (sv.id === "foot") label = player.foot === "L" ? "✦ Sin" : "Dx";
        else label = `${sv.icon} ${sv.format(player[sv.id])}`;
        return (
          <div key={sv.id} style={{ background:sv.color+"22", border:`1px solid ${isExpiring?"#ef4444":sv.color}66`, borderRadius:3, padding:"0px 4px", fontSize:7.5, fontWeight:800, color:isExpiring?"#ef4444":sv.color, whiteSpace:"nowrap", lineHeight:"14px" }}>
            {label}
          </div>
        );
      })}
    </div>
  );
}

// ─── PITCH SLOT ──────────────────────────────────────────────────────────────
// Global touch drag state (shared between all PitchSlots)
const touchDrag = { active: false, player: null, fromSlot: null, ghost: null };

function PitchSlot({ slot, posData, player, altPlayer, onDrop, onClick, teamColor, activeStats, showKits, captain }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const color = POSITION_COLORS[posData.role] || "#6b7280";
  const border = teamColor || color;
  const showRating = activeStats.includes("rating");

  const handleDrop = e => {
    e.preventDefault(); setIsDragOver(false);
    try { onDrop(slot, JSON.parse(e.dataTransfer.getData("application/json"))); } catch {}
  };

  // Touch drag handlers
  const handleTouchStart = e => {
    if (!player) return;
    const touch = e.touches[0];
    touchDrag.active = true;
    touchDrag.player = player;
    touchDrag.fromSlot = slot;
    // Create ghost element
    const ghost = document.createElement("div");
    ghost.id = "touch-drag-ghost";
    ghost.style.cssText = `position:fixed;pointer-events:none;z-index:9999;width:44px;height:44px;border-radius:50%;background:${border}33;border:3px solid ${border};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:${color};font-family:'Barlow Condensed',sans-serif;transform:translate(-50%,-50%);box-shadow:0 0 20px ${border}88;`;
    ghost.textContent = player.shortName.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
    ghost.style.left = touch.clientX + "px";
    ghost.style.top  = touch.clientY + "px";
    document.body.appendChild(ghost);
    touchDrag.ghost = ghost;
    e.preventDefault();
  };

  const handleTouchMove = e => {
    if (!touchDrag.active) return;
    const touch = e.touches[0];
    if (touchDrag.ghost) {
      touchDrag.ghost.style.left = touch.clientX + "px";
      touchDrag.ghost.style.top  = touch.clientY + "px";
    }
    e.preventDefault();
  };

  const handleTouchEnd = e => {
    if (!touchDrag.active) return;
    if (touchDrag.ghost) { touchDrag.ghost.remove(); touchDrag.ghost = null; }
    // Find which slot we're over by touch position
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const slotEl = el?.closest("[data-slot]");
    if (slotEl) {
      const targetSlot = parseInt(slotEl.dataset.slot);
      if (targetSlot !== touchDrag.fromSlot) {
        onDrop(targetSlot, { player: touchDrag.player, fromSlot: touchDrag.fromSlot });
      }
    }
    touchDrag.active = false;
    touchDrag.player = null;
    touchDrag.fromSlot = null;
  };

  return (
    <div
      data-slot={slot}
      onDragOver={e=>{e.preventDefault();setIsDragOver(true);}} onDragLeave={()=>setIsDragOver(false)} onDrop={handleDrop}
      onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      style={{ position:"absolute", left:`${posData.x}%`, top:`${posData.y}%`, transform:"translate(-50%,-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:2, zIndex:10, touchAction:"none" }}>
      {player ? (
        <>
          <div draggable
            onDragStart={e=>e.dataTransfer.setData("application/json",JSON.stringify({player,fromSlot:slot}))}
            onTouchStart={handleTouchStart}
            onClick={()=>onClick(slot)}
            style={{ position:"relative", cursor:"grab", transform:isDragOver?"scale(1.18)":"scale(1)", transition:"transform 0.12s", userSelect:"none" }}>
            {showKits ? (
              <>
                <KitSVG club={player.club} size={38}/>
                {showRating && <div style={{ position:"absolute", top:-4, right:-4, background:getRatingColor(player.rating), color:"#000", fontSize:8, fontWeight:800, borderRadius:3, padding:"0 2px", lineHeight:"13px", minWidth:13, textAlign:"center" }}>{player.rating}</div>}
              </>
            ) : (
              <div style={{ width:44, height:44, borderRadius:"50%", backgroundColor:color+"22", border:`3px solid ${border}`, boxShadow:`0 0 10px ${border}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color, fontFamily:"'Barlow Condensed',sans-serif" }}>
                {getInitials(player.name)}
                {showRating && <div style={{ position:"absolute", top:-4, right:-4, background:getRatingColor(player.rating), color:"#000", fontSize:8, fontWeight:800, borderRadius:3, padding:"0 2px", lineHeight:"13px", minWidth:13, textAlign:"center" }}>{player.rating}</div>}
              </div>
            )}
          </div>
          <div style={{ background:"rgba(0,0,0,0.88)", borderRadius:5, padding:"1px 5px", maxWidth:82, textAlign:"center" }} onClick={()=>onClick(slot)}>
            <div style={{ fontSize:8, color:"#9ca3af", fontWeight:700 }}>{posData.role}</div>
            <div style={{ fontSize:10, color:"#fff", fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {captain===player?.id && <span style={{ color:"#ffd700", marginRight:2 }}>★</span>}
              {player.shortName}
            </div>
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
function Pitch({ lineup, altPlayers, formation, onSlotDrop, onSlotClick, teamName, teamColor, activeStats, showKits, captain }) {
  const positions = FORMATIONS[formation]?.positions || [];
  return (
    <div style={{ position:"relative", width:"100%", paddingBottom:"150%", userSelect:"none" }}>
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
          teamColor={teamColor} activeStats={activeStats} showKits={showKits} captain={captain}/>
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
    const bgGrad = ctx.createLinearGradient(0,0,0,H);
    bgGrad.addColorStop(0,"#0a0e1a"); bgGrad.addColorStop(1,"#111827");
    ctx.fillStyle = bgGrad; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = teamColor||"#16a34a"; ctx.fillRect(0,0,W,70);
    ctx.fillStyle = "#fff"; ctx.font = "bold 36px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(teamName.toUpperCase(), W/2, 46);
    ctx.font = "16px sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(formation, W/2, 65);
    const fg = ctx.createLinearGradient(40,90,40,840);
    fg.addColorStop(0,"#1a4d2e"); fg.addColorStop(1,"#1d5c35");
    ctx.fillStyle = fg; ctx.beginPath(); ctx.roundRect(40,90,W-80,750,8); ctx.fill();
    for(let i=0;i<8;i++){ctx.fillStyle=i%2===0?"rgba(0,0,0,0.05)":"rgba(255,255,255,0.02)";ctx.fillRect(40,90+i*94,W-80,94);}
    ctx.strokeStyle="rgba(255,255,255,0.3)";ctx.lineWidth=1.5;
    ctx.strokeRect(60,100,W-120,730);ctx.beginPath();ctx.moveTo(60,465);ctx.lineTo(W-60,465);ctx.stroke();
    ctx.beginPath();ctx.arc(W/2,465,60,0,Math.PI*2);ctx.stroke();
    const positions = FORMATIONS[formation]?.positions||[];
    positions.forEach(pos=>{
      const player=lineup[pos.slot];if(!player)return;
      const px=60+(pos.x/100)*(W-120), py=100+(pos.y/100)*730;
      const roleColor=POSITION_COLORS[pos.role]||"#6b7280";
      ctx.beginPath();ctx.arc(px,py,26,0,Math.PI*2);
      ctx.fillStyle=roleColor+"33";ctx.fill();
      ctx.strokeStyle=teamColor||roleColor;ctx.lineWidth=3;ctx.stroke();
      ctx.fillStyle=roleColor;ctx.font="bold 16px sans-serif";ctx.textAlign="center";
      ctx.fillText(getInitials(player.name),px,py+6);
      if(activeStats.includes("rating")){
        const rc=getRatingColor(player.rating);
        ctx.fillStyle=rc;ctx.beginPath();ctx.roundRect(px+14,py-34,24,16,3);ctx.fill();
        ctx.fillStyle="#000";ctx.font="bold 11px sans-serif";ctx.fillText(player.rating,px+26,py-22);
      }
      ctx.fillStyle="rgba(0,0,0,0.85)";ctx.beginPath();ctx.roundRect(px-36,py+29,72,22,4);ctx.fill();
      ctx.fillStyle="#9ca3af";ctx.font="bold 8px sans-serif";ctx.fillText(pos.role,px,py+38);
      ctx.fillStyle="#fff";ctx.font="bold 10px sans-serif";
      const sn=player.shortName.length>10?player.shortName.slice(0,10)+".":player.shortName;
      ctx.fillText(sn,px,py+49);
    });
    const filled=lineup.filter(Boolean);
    if(filled.length>0){
      const avgR=(filled.reduce((a,p)=>a+p.rating,0)/filled.length).toFixed(1);
      const totV=filled.reduce((a,p)=>a+(p.value||0),0);
      const avgA=(filled.reduce((a,p)=>a+(p.age||0),0)/filled.length).toFixed(1);
      ctx.fillStyle="rgba(0,0,0,0.6)";ctx.fillRect(0,H-90,W,90);
      [{label:"Rating medio",value:avgR,color:getRatingColor(parseFloat(avgR))},
       {label:"Valore totale",value:`€${totV}M`,color:"#16a34a"},
       {label:"Età media",value:`${avgA} anni`,color:"#3b82f6"},
       {label:"Giocatori",value:`${filled.length}/11`,color:"#9ca3af"}
      ].forEach((s,i)=>{
        const x=W/4*i+W/8;
        ctx.fillStyle=s.color;ctx.font="bold 22px sans-serif";ctx.textAlign="center";ctx.fillText(s.value,x,H-52);
        ctx.fillStyle="rgba(255,255,255,0.4)";ctx.font="11px sans-serif";ctx.fillText(s.label,x,H-32);
      });
    }
    ctx.fillStyle="rgba(255,255,255,0.15)";ctx.font="bold 13px sans-serif";ctx.textAlign="right";
    ctx.fillText("universosportivo.com",W-20,H-12);
    const link=document.createElement("a");link.download=`${teamName.replace(/\s/g,"-")}-lineup.png`;
    link.href=canvas.toDataURL("image/png");link.click();onDone();
  },[]);
  return <canvas ref={canvasRef} style={{display:"none"}}/>;
}

// ─── TEAM PICKER ─────────────────────────────────────────────────────────────
function TeamPicker({ onSelect, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#111827", borderRadius:16, width:"100%", maxWidth:500, border:"1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:700, color:"#fff" }}>Carica squadra Serie A</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:20 }}>✕</button>
        </div>
        <div style={{ padding:14, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {SERIE_A_TEAMS.map(team=>(
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

// ─── PLAYER SEARCH (con filtri avanzati) ──────────────────────────────────────
function PlayerSearch({ onSelectPlayer, onClose, selectedSlotRole, currentLineup, isAlt, slotPlayer }) {
  const [query, setQuery]       = useState("");
  const [posFilter, setPosFilter] = useState("ALL");
  const [clubFilter, setClubFilter] = useState("ALL");
  const [minRating, setMinRating] = useState(60);
  const [maxAge, setMaxAge]       = useState(40);
  const [maxWage, setMaxWage]     = useState(10000);
  const [maxValue, setMaxValue]   = useState(300);
  const [footFilter, setFootFilter] = useState("ALL");
  const [contractFilter, setContractFilter] = useState("ALL");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const inputRef = useRef();
  useEffect(()=>{ inputRef.current?.focus(); },[]);

  const posMap = { DEF:["CB","RB","LB"], MID:["DM","CM","AM","RM","LM"], ATT:["ST","RW","LW"] };
  const clubs = ["ALL",...Array.from(new Set(PLAYERS.map(p=>p.club))).sort()];
  const usedIds = new Set(currentLineup.filter(Boolean).map(p=>p.id));

  const filtered = PLAYERS.filter(p=>{
    const q = query.toLowerCase();
    if (!isAlt && usedIds.has(p.id)) return false;
    if (query && !p.name.toLowerCase().includes(q) && !p.club.toLowerCase().includes(q)) return false;
    if (posFilter!=="ALL" && !(posFilter==="GK"&&p.position==="GK") && !(posMap[posFilter]?.includes(p.position))) return false;
    if (clubFilter!=="ALL" && p.club!==clubFilter) return false;
    if (p.rating < minRating) return false;
    if (p.age > maxAge) return false;
    if (p.wage > maxWage) return false;
    if (p.value > maxValue) return false;
    if (footFilter!=="ALL" && p.foot!==footFilter) return false;
    if (contractFilter==="expiring" && p.contract > 2026) return false;
    if (contractFilter==="safe" && p.contract <= 2026) return false;
    return true;
  }).sort((a,b)=>b.rating-a.rating);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#111827", borderRadius:16, width:"100%", maxWidth:520, maxHeight:"92vh", display:"flex", flexDirection:"column", border:"1px solid rgba(255,255,255,0.1)" }}>
        {/* Header */}
        <div style={{ padding:"12px 14px", borderBottom:"1px solid rgba(255,255,255,0.08)", flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:17, fontWeight:700, color:"#fff" }}>
              {isAlt?"Alternativa":"Scegli giocatore"}
              {selectedSlotRole && <span style={{ marginLeft:7, fontSize:11, color:POSITION_COLORS[selectedSlotRole]||"#6b7280", background:(POSITION_COLORS[selectedSlotRole]||"#6b7280")+"22", padding:"2px 6px", borderRadius:4, fontWeight:600 }}>{selectedSlotRole}</span>}
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:20 }}>✕</button>
          </div>
          {isAlt&&slotPlayer && <div style={{ background:"rgba(22,163,74,0.1)", border:"1px solid rgba(22,163,74,0.3)", borderRadius:7, padding:"5px 10px", marginBottom:8, fontSize:11, color:"#16a34a" }}>Per: <strong>{slotPlayer.name}</strong></div>}

          {/* Search */}
          <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cerca per nome o club..."
            style={{ width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:7, padding:"7px 11px", color:"#fff", fontSize:13, outline:"none", boxSizing:"border-box", marginBottom:7 }}/>

          {/* Position pills */}
          <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:7 }}>
            {["ALL","GK","DEF","MID","ATT"].map(pg=>(
              <button key={pg} onClick={()=>setPosFilter(pg)} style={{ padding:"3px 9px", borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer", border:"1px solid", background:posFilter===pg?"#16a34a":"transparent", borderColor:posFilter===pg?"#16a34a":"rgba(255,255,255,0.15)", color:posFilter===pg?"#fff":"#9ca3af" }}>{pg}</button>
            ))}
            <button onClick={()=>setShowAdvanced(s=>!s)} style={{ marginLeft:"auto", padding:"3px 9px", borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer", border:"1px solid", background:showAdvanced?"rgba(99,102,241,0.2)":"transparent", borderColor:showAdvanced?"#6366f1":"rgba(255,255,255,0.15)", color:showAdvanced?"#6366f1":"#9ca3af" }}>
              ⚙ Filtri {showAdvanced?"▲":"▼"}
            </button>
          </div>

          {/* Advanced filters */}
          {showAdvanced && (
            <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:8, padding:"10px 12px", marginBottom:6, display:"flex", flexDirection:"column", gap:8 }}>
              {/* Club */}
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:10, color:"#6b7280", width:60, flexShrink:0 }}>Squadra</span>
                <select value={clubFilter} onChange={e=>setClubFilter(e.target.value)} style={{ flex:1, background:"#1f2937", border:"1px solid rgba(255,255,255,0.12)", borderRadius:5, padding:"4px 8px", color:"#9ca3af", fontSize:11, outline:"none" }}>
                  {clubs.map(c=><option key={c} value={c}>{c==="ALL"?"Tutte":c}</option>)}
                </select>
              </div>
              {/* Rating slider */}
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:10, color:"#6b7280", width:60, flexShrink:0 }}>Rating min</span>
                <input type="range" min="60" max="90" value={minRating} onChange={e=>setMinRating(+e.target.value)} style={{ flex:1, accentColor:"#ffd700" }}/>
                <span style={{ fontSize:12, fontWeight:800, color:"#ffd700", width:22, textAlign:"right" }}>{minRating}</span>
              </div>
              {/* Foot */}
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:10, color:"#6b7280", width:60, flexShrink:0 }}>Piede</span>
                <div style={{ display:"flex", gap:5 }}>
                  {[["ALL","Tutti"],["R","Destro"],["L","Mancino"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setFootFilter(v)} style={{ padding:"3px 10px", borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer", border:"1px solid", background:footFilter===v?"#ec4899":"transparent", borderColor:footFilter===v?"#ec4899":"rgba(255,255,255,0.15)", color:footFilter===v?"#fff":"#9ca3af" }}>{l}</button>
                  ))}
                </div>
              </div>
              {/* Contract */}
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:10, color:"#6b7280", width:60, flexShrink:0 }}>Contratto</span>
                <div style={{ display:"flex", gap:5 }}>
                  {[["ALL","Tutti"],["expiring","In scadenza ⚠"],["safe","Sicuri"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setContractFilter(v)} style={{ padding:"3px 10px", borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer", border:"1px solid", background:contractFilter===v?"#f97316":"transparent", borderColor:contractFilter===v?"#f97316":"rgba(255,255,255,0.15)", color:contractFilter===v?"#fff":"#9ca3af" }}>{l}</button>
                  ))}
                </div>
              </div>
              {/* Age */}
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:10, color:"#6b7280", width:60, flexShrink:0 }}>Età max</span>
                <input type="range" min="18" max="40" value={maxAge} onChange={e=>setMaxAge(+e.target.value)} style={{ flex:1, accentColor:"#3b82f6" }}/>
                <span style={{ fontSize:12, fontWeight:800, color:"#3b82f6", width:30, textAlign:"right" }}>{maxAge===40?"∞":maxAge+"a"}</span>
              </div>
              {/* Wage */}
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:10, color:"#6b7280", width:60, flexShrink:0 }}>Stip. max</span>
                <input type="range" min="0" max="10000" step="500" value={maxWage} onChange={e=>setMaxWage(+e.target.value)} style={{ flex:1, accentColor:"#f59e0b" }}/>
                <span style={{ fontSize:11, fontWeight:800, color:"#f59e0b", width:42, textAlign:"right" }}>{maxWage>=10000?"∞":`€${maxWage}K`}</span>
              </div>
              {/* Value */}
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:10, color:"#6b7280", width:60, flexShrink:0 }}>Valore max</span>
                <input type="range" min="0" max="300" step="10" value={maxValue} onChange={e=>setMaxValue(+e.target.value)} style={{ flex:1, accentColor:"#16a34a" }}/>
                <span style={{ fontSize:11, fontWeight:800, color:"#16a34a", width:42, textAlign:"right" }}>{maxValue>=300?"∞":`€${maxValue}M`}</span>
              </div>
            </div>
          )}

          <div style={{ fontSize:10, color:"#4b5563", textAlign:"right" }}>{filtered.length} giocatori</div>
        </div>

        {/* List */}
        <div style={{ overflowY:"auto", flex:1 }}>
          {filtered.length===0
            ? <div style={{ padding:28, textAlign:"center", color:"#6b7280" }}>Nessun giocatore trovato</div>
            : filtered.map(player=>{
              const isExpiring = player.contract<=2026;
              return (
                <div key={player.id} onClick={()=>onSelectPlayer(player)}
                  style={{ display:"flex", alignItems:"center", gap:9, padding:"7px 14px", cursor:"pointer", borderBottom:"1px solid rgba(255,255,255,0.04)" }}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <KitSVG club={player.club} size={26}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>
                      {player.name}
                      <span style={{ marginLeft:5, fontSize:11 }}>{NATION_FLAGS[player.nation]||""}</span>
                      {player.foot==="L" && <span style={{ marginLeft:4, fontSize:9, color:"#ec4899", fontWeight:700 }}>✦</span>}
                    </div>
                    <div style={{ fontSize:10, color:"#6b7280" }}>
                      {player.club} · {player.age}a · €{player.value}M
                      {isExpiring && <span style={{ color:"#ef4444", marginLeft:5 }}>⚠{player.contract}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize:9, color:POSITION_COLORS[player.position]||"#6b7280", background:(POSITION_COLORS[player.position]||"#6b7280")+"22", padding:"1px 5px", borderRadius:3, fontWeight:700 }}>{player.position}</div>
                  <div style={{ fontSize:13, fontWeight:800, color:getRatingColor(player.rating), width:24, textAlign:"right", flexShrink:0 }}>{player.rating}</div>
                </div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function TeamSettings({ teamName, setTeamName, teamColor, setTeamColor, formation, setFormation, onOpenTeamPicker, showKits, setShowKits }) {
  const colors = ["#16a34a","#2563eb","#dc2626","#d97706","#7c3aed","#db2777","#0891b2","#e5e7eb","#000000","#8B2500"];
  const categories = [...new Set(Object.values(FORMATIONS).map(f=>f.category))];
  return (
    <div style={{ background:"#111827", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", overflow:"hidden" }}>
      <button onClick={onOpenTeamPicker} style={{ width:"100%", padding:"10px 12px", background:"rgba(22,163,74,0.1)", border:"none", borderBottom:"1px solid rgba(255,255,255,0.08)", color:"#16a34a", fontSize:12, fontWeight:700, cursor:"pointer" }}>🏟️ Carica squadra Serie A</button>
      <div style={{ padding:"9px 12px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize:9, fontWeight:700, color:"#4b5563", letterSpacing:"1px", textTransform:"uppercase", marginBottom:4 }}>Nome squadra</div>
        <input value={teamName} onChange={e=>setTeamName(e.target.value)} placeholder="La tua squadra..." maxLength={24}
          style={{ width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:7, padding:"6px 9px", color:"#fff", fontSize:12, outline:"none", boxSizing:"border-box" }}/>
      </div>
      <div style={{ padding:"9px 12px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize:9, fontWeight:700, color:"#4b5563", letterSpacing:"1px", textTransform:"uppercase", marginBottom:4 }}>Colore kit</div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {colors.map(c=><div key={c} onClick={()=>setTeamColor(c)} style={{ width:18, height:18, borderRadius:"50%", backgroundColor:c, cursor:"pointer", border:teamColor===c?"2.5px solid #fff":"2px solid rgba(255,255,255,0.15)", boxShadow:teamColor===c?`0 0 5px ${c}`:"none", transition:"all 0.12s" }}/>)}
        </div>
      </div>
      <div style={{ padding:"9px 12px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize:9, fontWeight:700, color:"#4b5563", letterSpacing:"1px", textTransform:"uppercase", marginBottom:4 }}>Modulo</div>
        {categories.map(cat=>(
          <div key={cat} style={{ marginBottom:6 }}>
            <div style={{ fontSize:8, color:"#374151", fontWeight:700, letterSpacing:"0.8px", marginBottom:3, textTransform:"uppercase" }}>{cat}</div>
            <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
              {Object.entries(FORMATIONS).filter(([,f])=>f.category===cat).map(([key])=>(
                <button key={key} onClick={()=>setFormation(key)} style={{ padding:"2px 6px", borderRadius:4, fontSize:9, fontWeight:700, cursor:"pointer", border:"1px solid", background:formation===key?teamColor:"transparent", borderColor:formation===key?teamColor:"rgba(255,255,255,0.12)", color:formation===key?(teamColor==="#e5e7eb"?"#000":"#fff"):"#9ca3af" }}>{key}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding:"8px 12px" }}>
        <button onClick={()=>setShowKits(s=>!s)} style={{ width:"100%", padding:"6px", borderRadius:6, border:`1px solid ${showKits?"#16a34a":"rgba(255,255,255,0.12)"}`, background:showKits?"rgba(22,163,74,0.1)":"transparent", color:showKits?"#16a34a":"#6b7280", fontSize:11, fontWeight:600, cursor:"pointer" }}>
          {showKits?"✓ Kit abilitati":"⚽ Mostra kit squadre"}
        </button>
      </div>
    </div>
  );
}

// ─── STAT SELECTOR ───────────────────────────────────────────────────────────
function StatSelector({ activeStats, setActiveStats }) {
  const toggle = id => setActiveStats(prev => prev.includes(id)?prev.filter(s=>s!==id):[...prev,id]);
  const nonRatingActive = activeStats.filter(s=>s!=="rating").length;
  return (
    <div style={{ background:"#111827", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", padding:"9px 12px" }}>
      <div style={{ fontSize:9, fontWeight:700, color:"#4b5563", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 }}>
        Info visibili <span style={{ fontSize:8, fontWeight:400, color:"#374151" }}>(max {MAX_FIELD_STATS} sul campo oltre rating)</span>
      </div>
      {STAT_VIEWS.map(sv=>{
        const active = activeStats.includes(sv.id);
        const isRating = sv.id==="rating";
        const wouldExceed = !isRating && !active && nonRatingActive >= MAX_FIELD_STATS;
        return (
          <button key={sv.id} onClick={()=>{ if(!wouldExceed||active) toggle(sv.id); }}
            title={wouldExceed?"Max "+MAX_FIELD_STATS+" info extra sul campo":""}
            style={{ display:"flex", alignItems:"center", gap:7, padding:"5px 9px", borderRadius:6, border:`1px solid ${active?sv.color:wouldExceed?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.08)"}`, background:active?sv.color+"18":"transparent", cursor:wouldExceed&&!active?"not-allowed":"pointer", textAlign:"left", width:"100%", marginBottom:3, opacity:wouldExceed&&!active?0.4:1 }}>
            <span style={{ fontSize:12 }}>{sv.icon}</span>
            <span style={{ fontSize:10, fontWeight:600, color:active?sv.color:"#6b7280", flex:1 }}>{sv.label}</span>
            {!isRating && <span style={{ fontSize:9, color:"#4b5563" }}>campo</span>}
            <div style={{ width:13, height:13, borderRadius:3, background:active?sv.color:"transparent", border:`1.5px solid ${active?sv.color:"#374151"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"#000" }}>{active?"✓":""}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── COMPARE HEADER ──────────────────────────────────────────────────────────
function CompareHeader({ team1, team2, lineup1, lineup2 }) {
  const avg=(lu,k)=>{const f=lu.filter(Boolean);return f.length?f.reduce((a,p)=>a+(p[k]||0),0)/f.length:0;};
  const sum=(lu,k)=>lu.filter(Boolean).reduce((a,p)=>a+(p[k]||0),0);
  const metrics=[
    {label:"Rating",a:avg(lineup1,"rating").toFixed(1),b:avg(lineup2,"rating").toFixed(1),nA:avg(lineup1,"rating"),nB:avg(lineup2,"rating"),hib:true},
    {label:"Età media",a:avg(lineup1,"age").toFixed(1)+"a",b:avg(lineup2,"age").toFixed(1)+"a",nA:avg(lineup1,"age"),nB:avg(lineup2,"age"),hib:false},
    {label:"Valore",a:`€${sum(lineup1,"value")}M`,b:`€${sum(lineup2,"value")}M`,nA:sum(lineup1,"value"),nB:sum(lineup2,"value"),hib:true},
    {label:"Stipendi/a",a:`€${sum(lineup1,"wage").toLocaleString("it-IT")}K`,b:`€${sum(lineup2,"wage").toLocaleString("it-IT")}K`,nA:sum(lineup1,"wage"),nB:sum(lineup2,"wage"),hib:true},
  ];
  return (
    <div style={{ background:"#111827", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", padding:"11px 14px", marginBottom:10 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:6, alignItems:"center", marginBottom:9 }}>
        <div style={{ textAlign:"center" }}><div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:900, color:team1.color }}>{team1.name||"A"}</div><div style={{ fontSize:9, color:"#6b7280" }}>{lineup1.filter(Boolean).length}/11</div></div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:17, fontWeight:900, color:"#374151" }}>VS</div>
        <div style={{ textAlign:"center" }}><div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:900, color:team2.color }}>{team2.name||"B"}</div><div style={{ fontSize:9, color:"#6b7280" }}>{lineup2.filter(Boolean).length}/11</div></div>
      </div>
      {metrics.map(m=>{
        const aW=m.hib?m.nA>m.nB:m.nA<m.nB,bW=m.hib?m.nB>m.nA:m.nB<m.nA;
        return(<div key={m.label} style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:4, alignItems:"center", marginBottom:4 }}>
          <div style={{ textAlign:"right", fontSize:11, fontWeight:700, color:aW?team1.color:"#9ca3af" }}>{m.a}</div>
          <div style={{ fontSize:9, color:"#4b5563", textAlign:"center", minWidth:60 }}>{m.label}</div>
          <div style={{ textAlign:"left", fontSize:11, fontWeight:700, color:bW?team2.color:"#9ca3af" }}>{m.b}</div>
        </div>);
      })}
    </div>
  );
}

// ─── LINEUP PANEL (click slot libero → apri search) ──────────────────────────
function LineupPanel({ lineup, altPlayers, formation, onRemovePlayer, onRemoveAlt, onClickSlot, activeStats, captain, onSetCaptain }) {
  const positions = FORMATIONS[formation]?.positions||[];
  const shownStats = STAT_VIEWS.filter(s=>activeStats.includes(s.id)&&s.id!=="rating");
  return (
    <div style={{ background:"#111827", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", overflow:"hidden" }}>
      <div style={{ padding:"9px 12px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, color:"#fff" }}>XI ({lineup.filter(Boolean).length}/11)</span>
      </div>
      <div style={{ maxHeight:460, overflowY:"auto" }}>
        {positions.map(pos=>{
          const player=lineup[pos.slot];
          const alt=altPlayers[pos.slot]?PLAYERS.find(p=>p.id===altPlayers[pos.slot]):null;
          const rc=POSITION_COLORS[pos.role]||"#6b7280";
          const isExpiring=player&&player.contract<=2026;
          return (
            <div key={pos.slot} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", cursor:player?"default":"pointer", minHeight:36 }}
                onClick={()=>{ if(!player) onClickSlot(pos.slot); }}>
                <div style={{ width:24, fontSize:8, fontWeight:700, color:rc, background:rc+"22", borderRadius:3, textAlign:"center", padding:"2px", flexShrink:0 }}>{pos.role}</div>
                {player ? (
                  <>
                    <KitSVG club={player.club} size={22}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:3 }}>
                        {captain===player.id && <span style={{ color:"#ffd700", fontSize:10 }}>★</span>}
                        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{player.shortName}</span>
                        {player.foot==="L"&&<span style={{ fontSize:8, color:"#ec4899" }}>✦</span>}
                        {isExpiring&&<span style={{ fontSize:8, color:"#ef4444" }}>⚠{player.contract}</span>}
                      </div>
                      {shownStats.length>0&&<div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                        {shownStats.map(sv=>player[sv.id]!==undefined&&<span key={sv.id} style={{ fontSize:8, color:sv.id==="contract"&&isExpiring?"#ef4444":sv.color, fontWeight:700 }}>{sv.id==="nation"?NATION_FLAGS[player.nation]||player.nation:sv.id==="foot"?(player.foot==="L"?"✦ Mancino":"Destro"):`${sv.icon}${sv.format(player[sv.id])}`}</span>)}
                      </div>}
                    </div>
                    {activeStats.includes("rating")&&<div style={{ fontSize:10, fontWeight:800, color:getRatingColor(player.rating), flexShrink:0 }}>{player.rating}</div>}
                    <button onClick={e=>{e.stopPropagation();onSetCaptain(player.id);}} title="Capitano"
                      style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:captain===player.id?"#ffd700":"#374151", padding:2, flexShrink:0 }}>★</button>
                    <button onClick={e=>{e.stopPropagation();onRemovePlayer(pos.slot);}} style={{ background:"none", border:"none", color:"#374151", cursor:"pointer", fontSize:11, padding:2, flexShrink:0 }}>✕</button>
                  </>
                ) : (
                  <div style={{ fontSize:10, color:"#374151", fontStyle:"italic", display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ fontSize:14, color:rc+"66" }}>+</span> Aggiungi {pos.role}
                  </div>
                )}
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
function BenchPanel({ benchPlayers, lineup, altPlayers, onSetAlt, activeStats, captain, onSetCaptain }) {
  const [sortBy, setSortBy] = useState("rating");
  const shownStats = STAT_VIEWS.filter(s=>activeStats.includes(s.id)&&s.id!=="rating");
  const starterIds = new Set(lineup.filter(Boolean).map(p=>p.id));
  const bench = benchPlayers.filter(p=>!starterIds.has(p.id)).sort((a,b)=>{
    if(sortBy==="rating") return b.rating-a.rating;
    if(sortBy==="age") return a.age-b.age;
    if(sortBy==="value") return b.value-a.value;
    if(sortBy==="wage") return b.wage-a.wage;
    if(sortBy==="role") return (POSITION_COLORS[a.position]||"z").localeCompare(POSITION_COLORS[b.position]||"z");
    return 0;
  });
  return (
    <div style={{ background:"#111827", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", overflow:"hidden" }}>
      <div style={{ padding:"9px 12px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, color:"#fff" }}>Rosa ({bench.length})</div>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:5, padding:"2px 6px", color:"#9ca3af", fontSize:10, outline:"none" }}>
            <option value="rating">Rating ↓</option>
            <option value="age">Età ↑</option>
            <option value="value">Valore ↓</option>
            <option value="wage">Stipendio ↓</option>
            <option value="role">Ruolo</option>
          </select>
        </div>
        <div style={{ fontSize:9, color:"#4b5563", marginTop:2 }}>Clicca → alternativa ↕ · ★ → capitano</div>
      </div>
      <div style={{ overflowY:"auto", maxHeight:500 }}>
        {bench.length===0&&<div style={{ padding:20, color:"#374151", fontSize:12, textAlign:"center" }}>Carica una squadra</div>}
        {bench.map(player=>{
          const rc=POSITION_COLORS[player.position]||"#6b7280";
          const isAltFor=Object.values(altPlayers).includes(player.id);
          const isExpiring=player.contract<=2026;
          return (
            <div key={player.id}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", borderBottom:"1px solid rgba(255,255,255,0.04)", cursor:"pointer" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.04)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ width:22, fontSize:8, fontWeight:700, color:rc, background:rc+"22", borderRadius:3, textAlign:"center", padding:"2px", flexShrink:0 }}>{player.position}</div>
              <div style={{ flexShrink:0 }} onClick={()=>onSetAlt(player)}><KitSVG club={player.club} size={22}/></div>
              <div style={{ flex:1, minWidth:0 }} onClick={()=>onSetAlt(player)}>
                <div style={{ fontSize:11, fontWeight:700, color:isAltFor?"#16a34a":"#f9fafb", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {captain===player.id && <span style={{ color:"#ffd700", marginRight:3 }}>★</span>}
                  {player.shortName}
                  {player.foot==="L"&&<span style={{ fontSize:8, color:"#ec4899", marginLeft:3 }}>✦</span>}
                  {isExpiring&&<span style={{ fontSize:8, color:"#ef4444", marginLeft:3 }}>⚠{player.contract}</span>}
                  {isAltFor&&<span style={{ fontSize:8, color:"#16a34a", marginLeft:3 }}>↕</span>}
                </div>
                {shownStats.length>0&&<div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                  {shownStats.map(sv=>player[sv.id]!==undefined&&<span key={sv.id} style={{ fontSize:8, color:sv.id==="contract"&&isExpiring?"#ef4444":sv.color, fontWeight:700 }}>{sv.id==="nation"?NATION_FLAGS[player.nation]||player.nation:sv.id==="foot"?(player.foot==="L"?"✦":"Dx"):`${sv.icon}${sv.format(player[sv.id])}`}</span>)}
                </div>}
              </div>
              <button onClick={e=>{e.stopPropagation();onSetCaptain(player.id);}} title="Imposta capitano"
                style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:captain===player.id?"#ffd700":"#374151", padding:2, flexShrink:0 }}>★</button>
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
  const avg = k=>{const v=filled.map(p=>p[k]).filter(x=>x!==undefined);return v.length?v.reduce((a,b)=>a+b,0)/v.length:0;};
  const sum = k=>filled.reduce((a,p)=>a+(p[k]||0),0);
  const ageGroups={"≤21":0,"22-25":0,"26-29":0,"30+":0};
  filled.forEach(p=>{if(p.age<=21)ageGroups["≤21"]++;else if(p.age<=25)ageGroups["22-25"]++;else if(p.age<=29)ageGroups["26-29"]++;else ageGroups["30+"]++;});
  const expiring=filled.filter(p=>p.contract<=2026).length;
  const leftFoot=filled.filter(p=>p.foot==="L").length;
  return (
    <div style={{ background:"#111827", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", overflow:"hidden" }}>
      <div style={{ padding:"9px 12px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize:9, fontWeight:700, color:"#4b5563", letterSpacing:"1px", textTransform:"uppercase" }}>Statistiche rosa</div>
      </div>
      <div style={{ padding:"2px 0" }}>
        {[
          {label:"Rating medio",value:avg("rating").toFixed(1),color:getRatingColor(avg("rating"))},
          {label:"Età media",value:`${avg("age").toFixed(1)} anni`},
          {label:"Valore totale",value:`€${sum("value")}M`,color:"#16a34a"},
          {label:"Stipendi/anno",value:`€${sum("wage").toLocaleString("it-IT")}K`,color:"#f59e0b"},
          {label:"Altezza media",value:`${avg("height").toFixed(0)} cm`},
          {label:"Mancini",value:`${leftFoot}/${filled.length}`,color:"#ec4899"},
          {label:"In scadenza ⚠",value:`${expiring}`,color:expiring>0?"#ef4444":"#6b7280"},
        ].map(s=>(
          <div key={s.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 12px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize:10, color:"#6b7280" }}>{s.label}</span>
            <span style={{ fontSize:11, fontWeight:700, color:s.color||"#f9fafb" }}>{s.value}</span>
          </div>
        ))}
      </div>
      <div style={{ padding:"7px 12px 10px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize:9, fontWeight:700, color:"#4b5563", textTransform:"uppercase", marginBottom:5 }}>Distribuzione età</div>
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
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#111827", borderRadius:14, width:"100%", maxWidth:340, border:"1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ padding:"11px 14px", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:700, color:"#fff" }}>Alternativa per quale slot?</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:18 }}>✕</button>
        </div>
        <div style={{ padding:"5px 0", maxHeight:340, overflowY:"auto" }}>
          {positions.map(pos=>{
            const starter=lineup[pos.slot];if(!starter)return null;
            const rc=POSITION_COLORS[pos.role]||"#6b7280";
            return (
              <div key={pos.slot} onClick={()=>onSelect(pos.slot)}
                style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 14px", cursor:"pointer", borderBottom:"1px solid rgba(255,255,255,0.04)" }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{ width:24, fontSize:8, fontWeight:700, color:rc, background:rc+"22", borderRadius:3, textAlign:"center", padding:"2px 3px", flexShrink:0 }}>{pos.role}</div>
                <KitSVG club={starter.club} size={24}/>
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
const XL_ROLE_MAP = {'GK':'GK','ST':'ST','LS':'ST','RS':'ST','CF':'ST','LCB':'CB','RCB':'CB','CB':'CB','MCB':'CB','LB':'LB','LWB':'LB','RB':'RB','RWB':'RB','CDM':'DM','LCDM':'DM','RCDM':'DM','LCM':'CM','RCM':'CM','CM':'CM','CAM':'AM','LAM':'LW','RAM':'RW','LM':'LM','RM':'RM','LW':'LW','RW':'RW'};

export default function App() {
  const [mode, setMode]  = useState("single");
  const [activeTeam, setActiveTeam] = useState(0);

  const [lineup1, setLineup1Raw, undoLineup1, redoLineup1, canUndo1, canRedo1, resetLineup1] = useUndoRedo(Array(11).fill(null));
  const setLineup1 = setLineup1Raw;
  const [formation1,setFormation1] = useState("4-3-3");
  const [teamName1,setTeamName1]  = useState("Squadra A");
  const [teamColor1,setTeamColor1] = useState("#16a34a");
  const [altPlayers1,setAltPlayers1] = useState({});
  const [bench1,setBench1]        = useState([]);

  const [lineup2, setLineup2Raw, undoLineup2, redoLineup2, canUndo2, canRedo2, resetLineup2] = useUndoRedo(Array(11).fill(null));
  const setLineup2 = setLineup2Raw;
  const [formation2,setFormation2] = useState("4-3-3");
  const [teamName2,setTeamName2]  = useState("Squadra B");
  const [teamColor2,setTeamColor2] = useState("#2563eb");
  const [altPlayers2,setAltPlayers2] = useState({});
  const [bench2,setBench2]        = useState([]);

  const [captain1, setCaptain1] = useState(null);  // player id
  const [captain2, setCaptain2] = useState(null);
  const [activeStats,setActiveStats] = useState(["rating"]);
  const [showKits,setShowKits]    = useState(false);
  const [selectingSlot,setSelectingSlot] = useState(null);
  const [selectedSlotRole,setSelectedSlotRole] = useState(null);
  const [showTeamPicker,setShowTeamPicker] = useState(false);
  const [altPickerPlayer,setAltPickerPlayer] = useState(null);
  const [exporting,setExporting]  = useState(false);
  const [toast,setToast]          = useState(null);
  const [savedLineups,setSavedLineups] = useState([]);
  const [showSaved,setShowSaved]  = useState(false);

  // Current team aliases
  const lineup     = activeTeam===0?lineup1:lineup2;
  const formation  = activeTeam===0?formation1:formation2;
  const teamName   = activeTeam===0?teamName1:teamName2;
  const teamColor  = activeTeam===0?teamColor1:teamColor2;
  const altPlayers = activeTeam===0?altPlayers1:altPlayers2;
  const bench      = activeTeam===0?bench1:bench2;
  const setLineup  = activeTeam===0?setLineup1:setLineup2;
  // Quando si cambia modulo, riordina i giocatori per ruolo
  const changeFormation = useCallback((newFormation) => {
    const setF = activeTeam===0?setFormation1:setFormation2;
    const currentLineup = activeTeam===0?lineup1:lineup2;
    const setL = activeTeam===0?setLineup1:setLineup2;
    setF(newFormation);
    const newPositions = FORMATIONS[newFormation]?.positions || [];
    const players = currentLineup.filter(Boolean);
    if (!players.length) return;
    const newLineup = Array(11).fill(null);
    const usedIds = new Set();
    // Prima passa: assegna ogni giocatore allo slot corrispondente al suo ruolo
    newPositions.forEach(pos => {
      const match = players.find(p => p.position === pos.role && !usedIds.has(p.id));
      if (match) { newLineup[pos.slot] = match; usedIds.add(match.id); }
    });
    // Seconda passa: metti i rimanenti nei slot vuoti
    const remaining = players.filter(p => !usedIds.has(p.id));
    newPositions.forEach(pos => {
      if (newLineup[pos.slot]) return;
      const p = remaining.shift();
      if (p) { newLineup[pos.slot] = p; usedIds.add(p.id); }
    });
    setL(newLineup);
  }, [activeTeam, lineup1, lineup2]);
  const setFormation = changeFormation;
  const setTeamName  = activeTeam===0?setTeamName1:setTeamName2;
  const setTeamColor = activeTeam===0?setTeamColor1:setTeamColor2;
  const setAltPlayers = activeTeam===0?setAltPlayers1:setAltPlayers2;
  const setBench   = activeTeam===0?setBench1:setBench2;
  const captain    = activeTeam===0?captain1:captain2;
  const setCaptain = activeTeam===0?setCaptain1:setCaptain2;
  const canUndo    = activeTeam===0?canUndo1:canUndo2;
  const canRedo    = activeTeam===0?canRedo1:canRedo2;
  const undoLineup = activeTeam===0?undoLineup1:undoLineup2;
  const redoLineup = activeTeam===0?redoLineup1:redoLineup2;

  useEffect(()=>{
    const hash=window.location.hash.slice(1);
    if(hash){const data=decodeLineup(hash);if(data){const players=data.l.map(id=>id?PLAYERS.find(p=>p.id===id)||null:null);setLineup1(players);if(data.f)setFormation1(data.f);if(data.n)setTeamName1(data.n);if(data.c)setTeamColor1(data.c);if(data.a)setAltPlayers1(data.a);}}
    setSavedLineups(JSON.parse(localStorage.getItem(SAVED_KEY)||"[]"));
  },[]);

  const loadTeam = teamData => {
    const tf=teamData.formation||"4-3-3";
    setFormation(tf);
    const positions=FORMATIONS[tf]?.positions||[];
    const newLineup=Array(11).fill(null);
    const usedIds=new Set();
    const starterObjs=(teamData.starters||[]).map(s=>({...s,player:s.playerId?PLAYERS.find(p=>p.id===s.playerId):null})).filter(s=>s.player);
    positions.forEach(pos=>{
      if(newLineup[pos.slot])return;
      const c=starterObjs.find(s=>XL_ROLE_MAP[s.xlRole]===pos.role&&!usedIds.has(s.player.id))||starterObjs.find(s=>!usedIds.has(s.player.id)&&s.player.position===pos.role);
      if(c){newLineup[pos.slot]=c.player;usedIds.add(c.player.id);}
    });
    const tp=PLAYERS.filter(p=>p.club===teamData.name).sort((a,b)=>b.rating-a.rating);
    positions.forEach(pos=>{if(newLineup[pos.slot])return;const c=tp.find(p=>p.position===pos.role&&!usedIds.has(p.id));if(c){newLineup[pos.slot]=c;usedIds.add(c.id);}});
    positions.forEach(pos=>{if(newLineup[pos.slot])return;const c=tp.find(p=>!usedIds.has(p.id));if(c){newLineup[pos.slot]=c;usedIds.add(c.id);}});
    setLineup(newLineup);setTeamName(teamData.name);setTeamColor(teamData.color);
    setAltPlayers({});setBench(PLAYERS.filter(p=>p.club===teamData.name));
    setShowTeamPicker(false);setToast(`${teamData.name} caricata! ⚽`);
  };

  const handleAutoFill = () => {
    const pool = bench.length > 0 ? bench : PLAYERS;
    const filled = autoFillLineup(formation, lineup, pool);
    setLineup(filled);
    setToast("Auto-fill completato! 🤖");
  };

  const openSlot = (slot, isAlt=false) => {
    const positions=FORMATIONS[formation]?.positions||[];
    const pd=positions.find(p=>p.slot===slot);
    setSelectedSlotRole(pd?.role||null);
    setSelectingSlot({slot,isAlt});
  };

  const handlePlayerSelect = player => {
    if(!selectingSlot)return;
    const{slot,isAlt}=selectingSlot;
    if(isAlt){setAltPlayers(prev=>({...prev,[slot]:player.id}));}
    else{setLineup(prev=>{const next=[...prev];next[slot]=player;return next;});}
    setSelectingSlot(null);
  };

  const handleSlotDrop = useCallback((slot,{player,fromSlot},teamIdx)=>{
    const setter = teamIdx===0?setLineup1:setLineup2;
    setter(prev=>{
      const next=[...prev];
      if (fromSlot !== undefined && fromSlot !== null) {
        // Drag da slot a slot → scambia sempre (anche se destinazione è occupata)
        [next[fromSlot], next[slot]] = [next[slot], next[fromSlot]];
      } else {
        // Drag dalla bench: se lo slot è già occupato, metti il nuovo e togli il vecchio
        next[slot] = player;
      }
      return next;
    });
  },[]);

  const handleBenchClick = player => setAltPickerPlayer(player);
  const handleAltSlotSelect = slot => {
    if(!altPickerPlayer)return;
    setAltPlayers(prev=>({...prev,[slot]:altPickerPlayer.id}));
    setAltPickerPlayer(null);setToast(`${altPickerPlayer.shortName} → alternativa ↕`);
  };
  const handleRemovePlayer = slot=>setLineup(prev=>{const n=[...prev];n[slot]=null;return n;});
  const handleRemoveAlt = slot=>setAltPlayers(prev=>{const n={...prev};delete n[slot];return n;});

  const handleShare=()=>{
    const code=encodeLineup(lineup1,formation1,teamName1,teamColor1,altPlayers1);
    const url=`${window.location.origin}${window.location.pathname}#${code}`;
    navigator.clipboard.writeText(url).then(()=>setToast("Link copiato! 🔗")).catch(()=>{});
  };
  const handleSave=()=>{
    const saved=JSON.parse(localStorage.getItem(SAVED_KEY)||"[]");
    const entry={id:Date.now(),name:teamName1,formation:formation1,color:teamColor1,lineup:lineup1.map(p=>p?.id??null),altPlayers:altPlayers1,date:new Date().toLocaleDateString("it-IT")};
    const updated=[entry,...saved].slice(0,10);
    localStorage.setItem(SAVED_KEY,JSON.stringify(updated));setSavedLineups(updated);setToast("Salvata! 💾");
  };
  const handleLoadSaved=entry=>{
    const players=entry.lineup.map(id=>id?PLAYERS.find(p=>p.id===id)||null:null);
    setLineup1(players);setFormation1(entry.formation);setTeamName1(entry.name);
    setTeamColor1(entry.color);setAltPlayers1(entry.altPlayers||{});
    setShowSaved(false);setToast("Caricata! ✅");
  };

  const positions=FORMATIONS[formation]?.positions||[];
  const [isMobile,setIsMobile]=useState(window.innerWidth<900);
  useEffect(()=>{const h=()=>setIsMobile(window.innerWidth<900);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);

  return (
    <div style={{ minHeight:"100vh", background:"#0a0e1a", color:"#fff", fontFamily:"'Inter',sans-serif" }}>
      <style>{`*{box-sizing:border-box;}body{margin:0;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px;}input[type=range]{accent-color:#ffd700;}`}</style>

      <header style={{ background:"rgba(0,0,0,0.65)", backdropFilter:"blur(12px)", borderBottom:"1px solid rgba(255,255,255,0.08)", padding:"0 14px", height:50, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:26, height:26, background:"linear-gradient(135deg,#16a34a,#059669)", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>⚽</div>
          <div><div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:900, lineHeight:1 }}>LINEUP BUILDER</div><div style={{ fontSize:8, color:"#4b5563", letterSpacing:"1.5px" }}>UNIVERSO SPORTIVO</div></div>
        </div>
        <div style={{ display:"flex", gap:4, alignItems:"center" }}>
          <div style={{ display:"flex", background:"rgba(255,255,255,0.06)", borderRadius:7, border:"1px solid rgba(255,255,255,0.1)", overflow:"hidden" }}>
            {[{id:"single",label:"Builder"},{id:"compare",label:"⚔️ VS"}].map(m=>(
              <button key={m.id} onClick={()=>{setMode(m.id);setActiveTeam(0);}} style={{ padding:"5px 10px", border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background:mode===m.id?"#16a34a":"transparent", color:mode===m.id?"#fff":"#9ca3af" }}>{m.label}</button>
            ))}
          </div>
          <button onClick={undoLineup} disabled={!canUndo} title="Annulla (Undo)" style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", color:canUndo?"#fff":"#374151", borderRadius:6, padding:"5px 8px", cursor:canUndo?"pointer":"default", fontSize:12 }}>↩</button>
          <button onClick={redoLineup} disabled={!canRedo} title="Ripristina (Redo)" style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", color:canRedo?"#fff":"#374151", borderRadius:6, padding:"5px 8px", cursor:canRedo?"pointer":"default", fontSize:12 }}>↪</button>
          <button onClick={handleAutoFill} title="Auto-fill migliori giocatori" style={{ background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.4)", color:"#818cf8", borderRadius:6, padding:"5px 8px", cursor:"pointer", fontSize:12 }}>🤖</button>
          <button onClick={()=>setExporting(true)} title="Esporta PNG" style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", color:"#fff", borderRadius:6, padding:"5px 8px", cursor:"pointer", fontSize:12 }}>📸</button>
          <button onClick={handleSave} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", color:"#fff", borderRadius:6, padding:"5px 8px", cursor:"pointer", fontSize:12 }}>💾</button>
          <button onClick={()=>setShowSaved(s=>!s)} style={{ background:showSaved?"#16a34a18":"rgba(255,255,255,0.07)", border:`1px solid ${showSaved?"#16a34a":"rgba(255,255,255,0.1)"}`, color:showSaved?"#16a34a":"#fff", borderRadius:6, padding:"5px 8px", cursor:"pointer", fontSize:11 }}>📁{savedLineups.length>0&&`(${savedLineups.length})`}</button>
          <button onClick={handleShare} style={{ background:"#16a34a", border:"none", color:"#fff", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontSize:11, fontWeight:700 }}>🔗</button>
        </div>
      </header>

      {showSaved&&(
        <div style={{ background:"#0d1117", borderBottom:"1px solid rgba(255,255,255,0.07)", padding:"9px 14px" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, marginBottom:7, color:"#fff" }}>Formazzioni salvate</div>
          {savedLineups.length===0?<div style={{ color:"#4b5563", fontSize:11 }}>Nessuna</div>
          :<div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>{savedLineups.map(e=>(
            <div key={e.id} onClick={()=>handleLoadSaved(e)} style={{ background:"#111827", border:`1px solid ${e.color}44`, borderRadius:8, padding:"6px 10px", cursor:"pointer", display:"flex", alignItems:"center", gap:7 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:e.color }}/>
              <div><div style={{ fontSize:11, fontWeight:700, color:"#fff" }}>{e.name}</div><div style={{ fontSize:9, color:"#4b5563" }}>{e.formation} · {e.date}</div></div>
            </div>
          ))}</div>}
        </div>
      )}

      <main style={{ maxWidth:mode==="compare"?1320:1160, margin:"0 auto", padding:"12px 10px", display:"grid", gridTemplateColumns:isMobile?"1fr":mode==="compare"?"200px 1fr 1fr 200px":"200px 1fr 200px 180px", gap:12, alignItems:"start" }}>

        {/* COL 1 */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {mode==="compare"&&<div style={{ display:"flex", gap:5 }}>{[{i:0,n:teamName1,c:teamColor1},{i:1,n:teamName2,c:teamColor2}].map(t=><button key={t.i} onClick={()=>setActiveTeam(t.i)} style={{ flex:1, padding:"5px 8px", borderRadius:7, border:`2px solid ${t.c}`, background:activeTeam===t.i?t.c+"22":"transparent", color:activeTeam===t.i?t.c:"#4b5563", cursor:"pointer", fontWeight:700, fontSize:10 }}>{t.n||`Sqd ${t.i+1}`}</button>)}</div>}
          <TeamSettings teamName={teamName} setTeamName={setTeamName} teamColor={teamColor} setTeamColor={setTeamColor} formation={formation} setFormation={setFormation} onOpenTeamPicker={()=>setShowTeamPicker(true)} showKits={showKits} setShowKits={setShowKits}/>
          <StatSelector activeStats={activeStats} setActiveStats={setActiveStats}/>
          <div style={{ background:"#111827", borderRadius:10, border:"1px solid rgba(255,255,255,0.08)", padding:"8px 12px" }}>
            <button onClick={()=>{setLineup(Array(11).fill(null));setAltPlayers({});setBench([]);}} style={{ width:"100%", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", color:"#f87171", borderRadius:6, padding:"6px", cursor:"pointer", fontSize:11, fontWeight:600 }}>🗑 Svuota</button>
          </div>
        </div>

        {/* COL 2: Pitch 1 */}
        <div>
          {mode==="compare"&&<CompareHeader team1={{name:teamName1,color:teamColor1}} team2={{name:teamName2,color:teamColor2}} lineup1={lineup1} lineup2={lineup2}/>}
          <Pitch lineup={lineup1} altPlayers={altPlayers1} formation={formation1}
            onSlotDrop={(slot,data)=>handleSlotDrop(slot,data,0)}
            onSlotClick={slot=>{setActiveTeam(0);openSlot(slot);}}
            teamName={teamName1} teamColor={teamColor1} activeStats={activeStats} showKits={showKits} captain={captain1}/>
        </div>

        {/* COL 3: Pitch 2 or Lineup+Bench */}
        {mode==="compare" ? (
          <Pitch lineup={lineup2} altPlayers={altPlayers2} formation={formation2}
            onSlotDrop={(slot,data)=>handleSlotDrop(slot,data,1)}
            onSlotClick={slot=>{setActiveTeam(1);openSlot(slot);}}
            teamName={teamName2} teamColor={teamColor2} activeStats={activeStats} showKits={showKits} captain={captain2}/>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <LineupPanel lineup={lineup} altPlayers={altPlayers} formation={formation}
              onRemovePlayer={handleRemovePlayer} onRemoveAlt={handleRemoveAlt}
              onClickSlot={slot=>openSlot(slot)}
              activeStats={activeStats} captain={captain} onSetCaptain={setCaptain}/>
            <BenchPanel benchPlayers={bench} lineup={lineup} altPlayers={altPlayers} onSetAlt={handleBenchClick} activeStats={activeStats} captain={captain} onSetCaptain={setCaptain}/>
          </div>
        )}

        {/* COL 4 */}
        {!isMobile&&(
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <SquadStats lineup={lineup}/>
            {mode==="compare"&&<div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <LineupPanel lineup={lineup} altPlayers={altPlayers} formation={formation} onRemovePlayer={handleRemovePlayer} onRemoveAlt={handleRemoveAlt} onClickSlot={slot=>openSlot(slot)} activeStats={activeStats}/>
              <BenchPanel benchPlayers={bench} lineup={lineup} altPlayers={altPlayers} onSetAlt={handleBenchClick} activeStats={activeStats} captain={captain} onSetCaptain={setCaptain}/>
            </div>}
          </div>
        )}
      </main>

      {showTeamPicker&&<TeamPicker onSelect={loadTeam} onClose={()=>setShowTeamPicker(false)}/>}
      {selectingSlot!==null&&<PlayerSearch onSelectPlayer={handlePlayerSelect} onClose={()=>setSelectingSlot(null)} selectedSlotRole={selectedSlotRole} currentLineup={lineup} isAlt={selectingSlot.isAlt} slotPlayer={lineup[selectingSlot.slot]}/>}
      {altPickerPlayer&&<AltSlotPicker player={altPickerPlayer} lineup={lineup} positions={positions} onSelect={handleAltSlotSelect} onClose={()=>setAltPickerPlayer(null)}/>}
      {exporting&&<ExportCanvas lineup={lineup} formation={formation} teamName={teamName} teamColor={teamColor} activeStats={activeStats} onDone={()=>{setExporting(false);setToast("PNG scaricato! 📸");}}/>}
      {toast&&<Toast message={toast} onDone={()=>setToast(null)}/>}
    </div>
  );
}

