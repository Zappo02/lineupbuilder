import React, { useState, useRef, useEffect, useCallback, useContext, createContext } from "react";
import { PLAYERS, FORMATIONS, POSITION_COLORS, STAT_VIEWS, SERIE_A_TEAMS, NATION_FLAGS } from "./data/players.js";

// ─── THEME ───────────────────────────────────────────────────────────────────
const ThemeCtx = createContext("dark");
const useTheme = () => useContext(ThemeCtx);

const DARK = {
  bg: "#0a0e1a", panel: "#111827", panelBorder: "rgba(255,255,255,0.08)",
  text: "#f9fafb", textMuted: "#6b7280", textFaint: "#374151",
  inputBg: "rgba(255,255,255,0.07)", inputBorder: "rgba(255,255,255,0.12)",
  headerBg: "rgba(0,0,0,0.65)", pitchDark: "#1a4d2e", pitchLight: "#1d5c35",
  fieldLine: "rgba(255,255,255,0.28)", labelBg: "rgba(0,0,0,0.88)",
  stripeShadow: "rgba(255,255,255,0.18)", kitStroke: "rgba(255,255,255,0.15)",
};
const LIGHT = {
  bg: "#f0f4f8", panel: "#ffffff", panelBorder: "rgba(0,0,0,0.1)",
  text: "#111827", textMuted: "#4b5563", textFaint: "#9ca3af",
  inputBg: "rgba(0,0,0,0.05)", inputBorder: "rgba(0,0,0,0.15)",
  headerBg: "rgba(255,255,255,0.9)", pitchDark: "#2d6a4f", pitchLight: "#40916c",
  fieldLine: "rgba(255,255,255,0.5)", labelBg: "rgba(0,0,0,0.75)",
  stripeShadow: "rgba(0,0,0,0.2)", kitStroke: "rgba(0,0,0,0.15)",
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const SAVED_KEY = "lineup_builder_v6";
const MAX_FIELD_STATS = 2;

// ─── UTILITY ─────────────────────────────────────────────────────────────────
const enc = (lineup, formation, teamName, color, altPlayers) => {
  try { return btoa(unescape(encodeURIComponent(JSON.stringify({f:formation,n:teamName,c:color,l:lineup.map(s=>s?.id??null),a:altPlayers})))); } catch { return ""; }
};
const dec = str => { try { return JSON.parse(decodeURIComponent(escape(atob(str)))); } catch { return null; } };
const initials = name => name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
const ratingColor = r => r>=90?"#ffd700":r>=85?"#c8c8c8":r>=80?"#cd7f32":"#6b7280";

// ─── UNDO/REDO ────────────────────────────────────────────────────────────────
function useUndoRedo(init) {
  const [hist, setHist] = useState([init]);
  const [idx, setIdx] = useState(0);
  const set = useCallback(val => {
    setHist(prev => {
      const next = typeof val === "function" ? val(prev[idx]) : val;
      return [...prev.slice(0, idx + 1), next];
    });
    setIdx(i => i + 1);
  }, [idx]);
  const undo = useCallback(() => setIdx(i => Math.max(0, i - 1)), []);
  const redo = useCallback(() => setIdx(i => Math.min(hist.length - 1, i + 1)), [hist.length]);
  const reset = useCallback(val => { setHist([val]); setIdx(0); }, []);
  return [hist[idx], set, undo, redo, idx > 0, idx < hist.length - 1, reset];
}

// ─── AUTO-FILL ────────────────────────────────────────────────────────────────
function autoFill(formation, existing, pool) {
  const positions = FORMATIONS[formation]?.positions || [];
  const next = [...existing];
  const used = new Set(next.filter(Boolean).map(p => p.id));
  const sorted = [...pool].sort((a,b) => b.rating - a.rating);
  // Pass 1: match exact role
  positions.forEach(pos => {
    if (next[pos.slot]) return;
    const p = sorted.find(p => p.position === pos.role && !used.has(p.id));
    if (p) { next[pos.slot] = p; used.add(p.id); }
  });
  // Pass 2: fill remaining
  positions.forEach(pos => {
    if (next[pos.slot]) return;
    const p = sorted.find(p => !used.has(p.id));
    if (p) { next[pos.slot] = p; used.add(p.id); }
  });
  return next;
}

// ─── REMAP LINEUP on formation change ────────────────────────────────────────
function remapToFormation(newFormation, currentLineup) {
  const positions = FORMATIONS[newFormation]?.positions || [];
  const players = currentLineup.filter(Boolean);
  if (!players.length) return Array(11).fill(null);
  const next = Array(11).fill(null);
  const used = new Set();
  // Pass 1: exact role match
  positions.forEach(pos => {
    const p = players.find(p => p.position === pos.role && !used.has(p.id));
    if (p) { next[pos.slot] = p; used.add(p.id); }
  });
  // Pass 2: fill remaining slots
  const remaining = players.filter(p => !used.has(p.id));
  positions.forEach(pos => {
    if (next[pos.slot]) return;
    const p = remaining.shift();
    if (p) { next[pos.slot] = p; used.add(p.id); }
  });
  return next;
}

// ─── KIT SVG ─────────────────────────────────────────────────────────────────
// Uses a fixed internal 100×120 coordinate system rendered via viewBox.
// Stripes use rect+clipPath to guarantee the pattern stays inside the shirt shape.
// Each club gets unique IDs based on club name to avoid cross-instance conflicts.
const TEAM_KIT = {
  "Juventus":   { p:"#1a1a1a", s:"#ffffff", style:"stripes-v" },
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

// Static SVG paths in 100×120 coordinate space
const SHIRT_BODY   = "M22,16 Q50,4 78,16 L97,38 L80,46 L80,118 L20,118 L20,46 L3,38 Z";
const SHIRT_SLV_L  = "M22,16 L3,38 L20,46 L28,28 Z";
const SHIRT_SLV_R  = "M78,16 L97,38 L80,46 L72,28 Z";

function KitSVG({ club, size = 32 }) {
  const kit = TEAM_KIT[club] || { p:"#374151", s:"#6b7280", style:"solid" };
  const { p: pri, s: sec, style } = kit;
  const th = useTheme();
  const stroke = th === "dark" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.2)";

  // Unique prefix per club — no size in ID so same club reuses defs
  const u = `kit_${club.replace(/\W/g,"_")}`;

  const stripeW = 25; // 4 stripes in 100px width

  return (
    <svg width={size} height={Math.round(size * 1.2)}
      viewBox="0 0 100 120"
      style={{ flexShrink:0, display:"block" }}>
      <defs>
        {/* Body clip */}
        <clipPath id={`${u}_body`}><path d={SHIRT_BODY}/></clipPath>
        {/* Sleeve clips */}
        <clipPath id={`${u}_sl`}><path d={SHIRT_SLV_L}/></clipPath>
        <clipPath id={`${u}_sr`}><path d={SHIRT_SLV_R}/></clipPath>

        {/* Vertical stripes pattern (100×120 space) */}
        {style === "stripes-v" && (
          <pattern id={`${u}_pat`} x="0" y="0"
            width={stripeW * 2} height="120"
            patternUnits="userSpaceOnUse">
            <rect x="0"         width={stripeW} height="120" fill={pri}/>
            <rect x={stripeW}   width={stripeW} height="120" fill={sec}/>
          </pattern>
        )}
        {/* Horizontal stripes */}
        {style === "stripes-h" && (
          <pattern id={`${u}_pat`} x="0" y="0"
            width="100" height="20"
            patternUnits="userSpaceOnUse">
            <rect width="100" height="10" fill={pri}/>
            <rect y="10" width="100" height="10" fill={sec}/>
          </pattern>
        )}
      </defs>

      {/* ── BODY ── */}
      {/* 1. solid base */}
      <path d={SHIRT_BODY} fill={pri}/>
      {/* 2. stripes overlaid via rect+clipPath */}
      {(style === "stripes-v" || style === "stripes-h") && (
        <rect x="0" y="0" width="100" height="120"
          fill={`url(#${u}_pat)`}
          clipPath={`url(#${u}_body)`}/>
      )}
      {/* 3. halves */}
      {style === "halves" && (
        <rect x="50" y="0" width="50" height="120"
          fill={sec}
          clipPath={`url(#${u}_body)`}/>
      )}
      {/* outline */}
      <path d={SHIRT_BODY} fill="none" stroke={stroke} strokeWidth="1"/>

      {/* ── SLEEVES ── */}
      <path d={SHIRT_SLV_L} fill={sec}/>
      {style === "stripes-v" && (
        <rect x="0" y="0" width="100" height="120"
          fill={`url(#${u}_pat)`}
          clipPath={`url(#${u}_sl)`}/>
      )}
      <path d={SHIRT_SLV_R} fill={sec}/>
      {style === "stripes-v" && (
        <rect x="0" y="0" width="100" height="120"
          fill={`url(#${u}_pat)`}
          clipPath={`url(#${u}_sr)`}/>
      )}
      <path d={SHIRT_SLV_L} fill="none" stroke={stroke} strokeWidth="0.8"/>
      <path d={SHIRT_SLV_R} fill="none" stroke={stroke} strokeWidth="0.8"/>

      {/* ── COLLAR ── */}
      <ellipse cx="50" cy="11" rx="9" ry="5" fill={sec} stroke={stroke} strokeWidth="0.5"/>
    </svg>
  );
}

// ─── DRAG STATE (module-level, not React state to avoid re-renders) ─────────
const drag = { active:false, player:null, fromSlot:null, ghost:null };

// ─── PITCH SLOT ──────────────────────────────────────────────────────────────
function PitchSlot({ slot, posData, player, altPlayer, onDrop, onClick, teamColor, activeStats, showKits, captain }) {
  const [over, setOver] = useState(false);
  const th = useTheme();
  const T = th === "dark" ? DARK : LIGHT;
  const color  = POSITION_COLORS[posData.role] || "#6b7280";
  const border = teamColor || color;
  const showRating = activeStats.includes("rating");
  const timerRef = useRef(null);

  // ── Desktop HTML5 drag ───────────────────────────────────────────────────
  const onDragStart = e => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify({ player, fromSlot: slot }));
  };
  const onDragOver  = e => { e.preventDefault(); e.dataTransfer.dropEffect="move"; setOver(true); };
  const onDragLeave = e => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false); };
  const handleDrop  = e => {
    e.preventDefault(); setOver(false);
    try { onDrop(slot, JSON.parse(e.dataTransfer.getData("application/json"))); } catch {}
  };

  // ── Touch / Pointer long-press drag ─────────────────────────────────────
  const startDrag = (clientX, clientY) => {
    if (!player) return;
    drag.active = true;
    drag.player = player;
    drag.fromSlot = slot;
    const g = document.createElement("div");
    g.id = "drag-ghost";
    g.style.cssText = `position:fixed;pointer-events:none;z-index:9999;width:48px;height:48px;border-radius:50%;background:${border}55;border:3px solid ${border};display:flex;align-items:center;justify-content:center;font:800 14px 'Barlow Condensed',sans-serif;color:${color};transform:translate(-50%,-60%);box-shadow:0 4px 20px ${border}99;left:${clientX}px;top:${clientY}px;`;
    g.textContent = initials(player.name);
    document.body.appendChild(g);
    drag.ghost = g;
    if (navigator.vibrate) navigator.vibrate(35);
  };

  const moveDrag = (clientX, clientY) => {
    if (!drag.active) return;
    if (drag.ghost) { drag.ghost.style.left = clientX+"px"; drag.ghost.style.top = clientY+"px"; }
    document.querySelectorAll("[data-slot]").forEach(el => el.style.outline = "");
    const target = document.elementFromPoint(clientX, clientY)?.closest("[data-slot]");
    if (target) target.style.outline = `2px solid ${border}`;
  };

  const endDrag = (clientX, clientY) => {
    clearTimeout(timerRef.current);
    if (drag.ghost) { drag.ghost.remove(); drag.ghost = null; }
    document.querySelectorAll("[data-slot]").forEach(el => el.style.outline = "");
    if (!drag.active) return;
    const target = document.elementFromPoint(clientX, clientY)?.closest("[data-slot]");
    if (target) {
      onDrop(parseInt(target.dataset.slot), { player: drag.player, fromSlot: drag.fromSlot });
    }
    drag.active = false; drag.player = null; drag.fromSlot = null;
  };

  const onPointerDown = e => {
    if (!player || e.button === 2) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const cx = e.clientX, cy = e.clientY;
    timerRef.current = setTimeout(() => startDrag(cx, cy), 300);
  };
  const onPointerMove = e => {
    if (!drag.active) { clearTimeout(timerRef.current); return; }
    e.preventDefault();
    moveDrag(e.clientX, e.clientY);
  };
  const onPointerUp = e => {
    clearTimeout(timerRef.current);
    if (drag.active) endDrag(e.clientX, e.clientY);
  };

  const slotStyle = {
    position:"absolute", left:`${posData.x}%`, top:`${posData.y}%`,
    transform:"translate(-50%,-50%)",
    display:"flex", flexDirection:"column", alignItems:"center", gap:2,
    zIndex: over ? 20 : 10,
  };

  if (!player) return (
    <div data-slot={slot} style={slotStyle}
      onDragOver={onDragOver} onDragLeave={onDragLeave}
      onDrop={handleDrop}>
      <div onClick={() => onClick(slot)} style={{
        width:44, height:44, borderRadius:"50%",
        border:`2px dashed ${color}`,
        backgroundColor: over ? color+"33" : color+"11",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:18, color:color+"bb", cursor:"pointer",
        transform: over ? "scale(1.15)" : "scale(1)", transition:"all 0.12s",
      }}>+</div>
      <div style={{ background:T.labelBg, borderRadius:4, padding:"1px 6px", fontSize:9, color, fontWeight:700 }}>{posData.role}</div>
    </div>
  );

  return (
    <div data-slot={slot} style={slotStyle}
      onDragOver={onDragOver} onDragLeave={onDragLeave}
      onDrop={handleDrop}>
      {/* Avatar / Kit */}
      <div
        draggable
        onDragStart={onDragStart}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => onClick(slot)}
        style={{
          position:"relative", cursor:"grab",
          transform: over ? "scale(1.15)" : "scale(1)", transition:"transform 0.12s",
          userSelect:"none", WebkitUserSelect:"none", touchAction:"none",
        }}>
        {showKits ? (
          <KitSVG club={player.club} size={40}/>
        ) : (
          <div style={{
            width:44, height:44, borderRadius:"50%",
            backgroundColor:color+"22", border:`3px solid ${border}`,
            boxShadow:`0 0 10px ${border}55`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:13, fontWeight:800, color,
            fontFamily:"'Barlow Condensed',sans-serif",
          }}>{initials(player.name)}</div>
        )}
        {showRating && (
          <div style={{
            position:"absolute", top:-4, right:-4,
            background:ratingColor(player.rating), color:"#000",
            fontSize:8, fontWeight:800, borderRadius:3,
            padding:"0 2px", lineHeight:"13px", minWidth:13, textAlign:"center",
          }}>{player.rating}</div>
        )}
      </div>

      {/* Label */}
      <div style={{ background:T.labelBg, borderRadius:5, padding:"1px 5px", maxWidth:82, textAlign:"center" }}
        onClick={() => onClick(slot)}>
        <div style={{ fontSize:8, color:"#9ca3af", fontWeight:700 }}>{posData.role}</div>
        <div style={{ fontSize:10, color:"#fff", fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {captain === player.id && <span style={{ color:"#ffd700", marginRight:2 }}>★</span>}
          {player.shortName}
        </div>
        {altPlayer && (
          <div style={{ fontSize:8, color:"#16a34a", fontWeight:600, borderTop:"1px solid rgba(22,163,74,0.3)", marginTop:1, paddingTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            ↕ {altPlayer.shortName}
          </div>
        )}
      </div>

      {/* Stat badges */}
      <StatBadges player={player} activeStats={activeStats}/>
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
      {stats.slice(0, MAX_FIELD_STATS).map(sv => {
        const exp = sv.id === "contract" && player.contract <= 2026;
        const col = exp ? "#ef4444" : sv.color;
        let label = sv.id === "nation" ? (NATION_FLAGS[player.nation] || player.nation)
                  : sv.id === "foot"   ? (player.foot === "L" ? "✦ Sin" : "Dx")
                  : `${sv.icon} ${sv.format(player[sv.id])}`;
        return (
          <div key={sv.id} style={{ background:col+"22", border:`1px solid ${col}66`, borderRadius:3, padding:"0 4px", fontSize:7.5, fontWeight:800, color:col, whiteSpace:"nowrap", lineHeight:"14px" }}>
            {label}
          </div>
        );
      })}
    </div>
  );
}

// ─── PITCH ───────────────────────────────────────────────────────────────────
function Pitch({ lineup, altPlayers, formation, onSlotDrop, onSlotClick, teamName, teamColor, activeStats, showKits, captain }) {
  const th = useTheme();
  const T  = th === "dark" ? DARK : LIGHT;
  const positions = FORMATIONS[formation]?.positions || [];
  return (
    <div style={{ position:"relative", width:"100%", paddingBottom:"150%", userSelect:"none", WebkitUserSelect:"none" }}>
      <svg viewBox="0 0 300 450" style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}>
        <defs>
          <linearGradient id="gf" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={T.pitchDark}/>
            <stop offset="100%" stopColor={T.pitchLight}/>
          </linearGradient>
        </defs>
        <rect width="300" height="450" fill="url(#gf)" rx="8"/>
        {[0,1,2,3,4,5,6,7].map(i=>(
          <rect key={i} x="0" y={i*57} width="300" height="28"
            fill={i%2===0?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.02)"}/>
        ))}
        <g fill="none" stroke={T.fieldLine} strokeWidth="1.3">
          <rect x="10" y="10" width="280" height="430" rx="2"/>
          <line x1="10" y1="225" x2="290" y2="225"/>
          <circle cx="150" cy="225" r="36"/>
          <circle cx="150" cy="225" r="2.5" fill={T.fieldLine} stroke="none"/>
          <rect x="56" y="350" width="188" height="80"/>
          <rect x="100" y="390" width="100" height="40"/>
          <rect x="56" y="20" width="188" height="80"/>
          <rect x="100" y="20" width="100" height="40"/>
          <path d="M 100 122 A 36 36 0 0 0 200 122"/>
          <path d="M 100 328 A 36 36 0 0 1 200 328"/>
        </g>
        {teamName && (
          <text x="150" y="226" textAnchor="middle" dominantBaseline="middle"
            fill="rgba(255,255,255,0.04)" fontSize="19"
            fontFamily="'Barlow Condensed',sans-serif" fontWeight="900" letterSpacing="3">
            {teamName.toUpperCase()}
          </text>
        )}
      </svg>
      {positions.map(pd => (
        <PitchSlot key={pd.slot} slot={pd.slot} posData={pd}
          player={lineup[pd.slot] || null}
          altPlayer={altPlayers[pd.slot] ? PLAYERS.find(p=>p.id===altPlayers[pd.slot]) || null : null}
          onDrop={onSlotDrop} onClick={onSlotClick}
          teamColor={teamColor} activeStats={activeStats}
          showKits={showKits} captain={captain}/>
      ))}
    </div>
  );
}

// ─── EXPORT CANVAS ───────────────────────────────────────────────────────────
function ExportCanvas({ lineup, formation, teamName, teamColor, activeStats, onDone }) {
  const ref = useRef();
  useEffect(() => {
    const c = ref.current, ctx = c.getContext("2d");
    const W=800, H=1000; c.width=W; c.height=H;
    const bg = ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,"#0a0e1a"); bg.addColorStop(1,"#111827");
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
    ctx.fillStyle=teamColor||"#16a34a"; ctx.fillRect(0,0,W,70);
    ctx.fillStyle="#fff"; ctx.font="bold 36px sans-serif"; ctx.textAlign="center";
    ctx.fillText(teamName.toUpperCase(),W/2,46);
    ctx.font="16px sans-serif"; ctx.fillStyle="rgba(255,255,255,0.7)";
    ctx.fillText(formation,W/2,65);
    const fg=ctx.createLinearGradient(40,90,40,840);
    fg.addColorStop(0,"#1a4d2e"); fg.addColorStop(1,"#1d5c35");
    ctx.fillStyle=fg; ctx.beginPath(); ctx.roundRect(40,90,W-80,750,8); ctx.fill();
    const positions=FORMATIONS[formation]?.positions||[];
    positions.forEach(pos=>{
      const pl=lineup[pos.slot]; if(!pl)return;
      const px=60+(pos.x/100)*(W-120), py=100+(pos.y/100)*730;
      const col=POSITION_COLORS[pos.role]||"#6b7280";
      ctx.beginPath(); ctx.arc(px,py,26,0,Math.PI*2);
      ctx.fillStyle=col+"33"; ctx.fill();
      ctx.strokeStyle=teamColor||col; ctx.lineWidth=3; ctx.stroke();
      ctx.fillStyle=col; ctx.font="bold 16px sans-serif"; ctx.textAlign="center";
      ctx.fillText(initials(pl.name),px,py+6);
      const rc=ratingColor(pl.rating);
      ctx.fillStyle=rc; ctx.beginPath(); ctx.roundRect(px+14,py-34,24,16,3); ctx.fill();
      ctx.fillStyle="#000"; ctx.font="bold 11px sans-serif"; ctx.fillText(pl.rating,px+26,py-22);
      ctx.fillStyle="rgba(0,0,0,0.85)"; ctx.beginPath(); ctx.roundRect(px-36,py+29,72,22,4); ctx.fill();
      ctx.fillStyle="#9ca3af"; ctx.font="bold 8px sans-serif"; ctx.fillText(pos.role,px,py+38);
      ctx.fillStyle="#fff"; ctx.font="bold 10px sans-serif";
      ctx.fillText(pl.shortName.length>10?pl.shortName.slice(0,10)+".":pl.shortName,px,py+49);
    });
    const filled=lineup.filter(Boolean);
    if(filled.length){
      const avgR=(filled.reduce((a,p)=>a+p.rating,0)/filled.length).toFixed(1);
      ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillRect(0,H-90,W,90);
      [{label:"Rating medio",v:avgR,c:ratingColor(parseFloat(avgR))},
       {label:"Valore",v:`€${filled.reduce((a,p)=>a+(p.value||0),0)}M`,c:"#16a34a"},
       {label:"Età media",v:`${(filled.reduce((a,p)=>a+(p.age||0),0)/filled.length).toFixed(1)}a`,c:"#3b82f6"},
       {label:"Giocatori",v:`${filled.length}/11`,c:"#9ca3af"},
      ].forEach((s,i)=>{
        const x=W/4*i+W/8;
        ctx.fillStyle=s.c; ctx.font="bold 22px sans-serif"; ctx.textAlign="center"; ctx.fillText(s.v,x,H-52);
        ctx.fillStyle="rgba(255,255,255,0.4)"; ctx.font="11px sans-serif"; ctx.fillText(s.label,x,H-32);
      });
    }
    ctx.fillStyle="rgba(255,255,255,0.15)"; ctx.font="bold 13px sans-serif"; ctx.textAlign="right";
    ctx.fillText("universosportivo.com",W-20,H-12);
    const a=document.createElement("a"); a.download=`${teamName.replace(/\s/g,"-")}-lineup.png`;
    a.href=c.toDataURL("image/png"); a.click(); onDone();
  },[]);
  return <canvas ref={ref} style={{display:"none"}}/>;
}

// ─── TEAM PICKER ─────────────────────────────────────────────────────────────
function TeamPicker({ onSelect, onClose }) {
  const th = useTheme(); const T = th==="dark"?DARK:LIGHT;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:T.panel, borderRadius:16, width:"100%", maxWidth:500, border:`1px solid ${T.panelBorder}`, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.panelBorder}`, display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:T.panel, zIndex:1 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:700, color:T.text }}>Carica squadra Serie A</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:T.textMuted, cursor:"pointer", fontSize:20 }}>✕</button>
        </div>
        <div style={{ padding:14, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {SERIE_A_TEAMS.map(team=>(
            <button key={team.name} onClick={()=>onSelect(team)}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"12px 8px", background:T.inputBg, border:`1px solid ${team.color}44`, borderRadius:10, cursor:"pointer" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=team.color; e.currentTarget.style.background=team.color+"18";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=team.color+"44"; e.currentTarget.style.background=T.inputBg;}}>
              <KitSVG club={team.name} size={36}/>
              <div style={{ fontSize:11, fontWeight:700, color:T.text, textAlign:"center" }}>{team.name}</div>
              <div style={{ fontSize:9, color:T.textMuted }}>{team.formation} · OVR {team.rating}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PLAYER SEARCH ───────────────────────────────────────────────────────────
function PlayerSearch({ onSelectPlayer, onClose, selectedSlotRole, currentLineup, isAlt, slotPlayer }) {
  const th = useTheme(); const T = th==="dark"?DARK:LIGHT;
  const [query, setQuery]   = useState("");
  const [posF,  setPosF]    = useState("ALL");
  const [clubF, setClubF]   = useState("ALL");
  const [minR,  setMinR]    = useState(60);
  const [maxA,  setMaxA]    = useState(40);
  const [maxW,  setMaxW]    = useState(10000);
  const [maxV,  setMaxV]    = useState(300);
  const [footF, setFootF]   = useState("ALL");
  const [conF,  setConF]    = useState("ALL");
  const [adv,   setAdv]     = useState(false);
  const inputRef = useRef();

  // Delayed focus to prevent mobile zoom
  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 350); return () => clearTimeout(t); }, []);

  const posMap = { DEF:["CB","RB","LB"], MID:["DM","CM","AM","RM","LM"], ATT:["ST","RW","LW"] };
  const clubs  = ["ALL", ...Array.from(new Set(PLAYERS.map(p=>p.club))).sort()];
  const usedIds = new Set(currentLineup.filter(Boolean).map(p=>p.id));

  const filtered = PLAYERS.filter(p => {
    if (!isAlt && usedIds.has(p.id)) return false;
    const q = query.toLowerCase();
    if (query && !p.name.toLowerCase().includes(q) && !p.club.toLowerCase().includes(q)) return false;
    if (posF !== "ALL" && !(posF==="GK"&&p.position==="GK") && !(posMap[posF]?.includes(p.position))) return false;
    if (clubF !== "ALL" && p.club !== clubF) return false;
    if (p.rating < minR) return false;
    if (p.age > maxA) return false;
    if (p.wage > maxW) return false;
    if (p.value > maxV) return false;
    if (footF !== "ALL" && p.foot !== footF) return false;
    if (conF === "expiring" && p.contract > 2026) return false;
    if (conF === "safe"     && p.contract <= 2026) return false;
    return true;
  }).sort((a,b) => b.rating - a.rating);

  const inp = { background:T.inputBg, border:`1px solid ${T.inputBorder}`, color:T.text, borderRadius:6, padding:"5px 8px", fontSize:16, outline:"none" };
  const pill = (active, onClick, label, color="#16a34a") => (
    <button onClick={onClick} style={{ padding:"3px 9px", borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer", border:"1px solid", background:active?color:"transparent", borderColor:active?color:"rgba(128,128,128,0.3)", color:active?"#fff":T.textMuted }}>{label}</button>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:12 }}>
      <div style={{ background:T.panel, borderRadius:16, width:"100%", maxWidth:520, maxHeight:"92vh", display:"flex", flexDirection:"column", border:`1px solid ${T.panelBorder}` }}>
        {/* Header */}
        <div style={{ padding:"12px 14px", borderBottom:`1px solid ${T.panelBorder}`, flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:17, fontWeight:700, color:T.text }}>
              {isAlt ? "Alternativa" : "Scegli giocatore"}
              {selectedSlotRole && <span style={{ marginLeft:7, fontSize:11, color:POSITION_COLORS[selectedSlotRole]||"#6b7280", background:(POSITION_COLORS[selectedSlotRole]||"#6b7280")+"22", padding:"2px 6px", borderRadius:4, fontWeight:600 }}>{selectedSlotRole}</span>}
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", color:T.textMuted, cursor:"pointer", fontSize:20 }}>✕</button>
          </div>
          {isAlt && slotPlayer && <div style={{ background:"rgba(22,163,74,0.1)", border:"1px solid rgba(22,163,74,0.3)", borderRadius:7, padding:"5px 10px", marginBottom:8, fontSize:11, color:"#16a34a" }}>Per: <strong>{slotPlayer.name}</strong></div>}
          <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cerca per nome o club..."
            style={{ ...inp, width:"100%", boxSizing:"border-box", marginBottom:7 }}/>
          <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:6 }}>
            {["ALL","GK","DEF","MID","ATT"].map(g => pill(posF===g, ()=>setPosF(g), g))}
            <button onClick={()=>setAdv(s=>!s)} style={{ marginLeft:"auto", padding:"3px 9px", borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer", border:"1px solid", background:adv?"rgba(99,102,241,0.2)":"transparent", borderColor:adv?"#6366f1":"rgba(128,128,128,0.3)", color:adv?"#6366f1":T.textMuted }}>⚙ Filtri {adv?"▲":"▼"}</button>
          </div>
          {adv && (
            <div style={{ background:T.inputBg, borderRadius:8, padding:"10px 12px", display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:10, color:T.textMuted, width:64 }}>Squadra</span>
                <select value={clubF} onChange={e=>setClubF(e.target.value)} style={{ ...inp, flex:1, fontSize:11 }}>
                  {clubs.map(c=><option key={c} value={c}>{c==="ALL"?"Tutte":c}</option>)}
                </select>
              </div>
              {[
                {label:"Rating min",val:minR,set:setMinR,min:60,max:90,step:1,color:"#ffd700",fmt:v=>v},
                {label:"Età max",val:maxA,set:setMaxA,min:18,max:40,step:1,color:"#3b82f6",fmt:v=>v>=40?"∞":v+"a"},
                {label:"Stip. max",val:maxW,set:setMaxW,min:0,max:10000,step:500,color:"#f59e0b",fmt:v=>v>=10000?"∞":`€${v}K`},
                {label:"Valore max",val:maxV,set:setMaxV,min:0,max:300,step:10,color:"#16a34a",fmt:v=>v>=300?"∞":`€${v}M`},
              ].map(s=>(
                <div key={s.label} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:10, color:T.textMuted, width:64, flexShrink:0 }}>{s.label}</span>
                  <input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={e=>s.set(+e.target.value)} style={{ flex:1, accentColor:s.color }}/>
                  <span style={{ fontSize:11, fontWeight:800, color:s.color, width:44, textAlign:"right" }}>{s.fmt(s.val)}</span>
                </div>
              ))}
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:10, color:T.textMuted, width:64 }}>Piede</span>
                <div style={{ display:"flex", gap:4 }}>
                  {[["ALL","Tutti"],["R","Destro"],["L","Mancino"]].map(([v,l])=>pill(footF===v,()=>setFootF(v),l,"#ec4899"))}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:10, color:T.textMuted, width:64 }}>Contratto</span>
                <div style={{ display:"flex", gap:4 }}>
                  {[["ALL","Tutti"],["expiring","In scadenza"],["safe","Sicuri"]].map(([v,l])=>pill(conF===v,()=>setConF(v),l,"#f97316"))}
                </div>
              </div>
            </div>
          )}
          <div style={{ fontSize:10, color:T.textMuted, textAlign:"right", marginTop:4 }}>{filtered.length} giocatori</div>
        </div>
        {/* List */}
        <div style={{ overflowY:"auto", flex:1 }}>
          {filtered.length === 0
            ? <div style={{ padding:28, textAlign:"center", color:T.textMuted }}>Nessun giocatore trovato</div>
            : filtered.map(p => {
              const exp = p.contract <= 2026;
              return (
                <div key={p.id} onClick={()=>onSelectPlayer(p)}
                  style={{ display:"flex", alignItems:"center", gap:9, padding:"7px 14px", cursor:"pointer", borderBottom:`1px solid ${T.panelBorder}` }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.inputBg}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <KitSVG club={p.club} size={26}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:T.text }}>
                      {p.name} <span style={{ fontSize:11 }}>{NATION_FLAGS[p.nation]||""}</span>
                      {p.foot==="L"&&<span style={{ fontSize:9, color:"#ec4899", marginLeft:4 }}>✦</span>}
                    </div>
                    <div style={{ fontSize:10, color:T.textMuted }}>
                      {p.club} · {p.age}a · €{p.value}M
                      {exp&&<span style={{ color:"#ef4444", marginLeft:5 }}>⚠{p.contract}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize:9, color:POSITION_COLORS[p.position]||"#6b7280", background:(POSITION_COLORS[p.position]||"#6b7280")+"22", padding:"1px 5px", borderRadius:3, fontWeight:700 }}>{p.position}</div>
                  <div style={{ fontSize:13, fontWeight:800, color:ratingColor(p.rating), width:24, textAlign:"right" }}>{p.rating}</div>
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
  const th = useTheme(); const T = th==="dark"?DARK:LIGHT;
  const colors = ["#16a34a","#2563eb","#dc2626","#d97706","#7c3aed","#db2777","#0891b2","#e5e7eb","#000000","#8B2500"];
  const categories = [...new Set(Object.values(FORMATIONS).map(f=>f.category))];
  const p = (style) => ({ ...style });
  return (
    <div style={{ background:T.panel, borderRadius:12, border:`1px solid ${T.panelBorder}`, overflow:"hidden" }}>
      <button onClick={onOpenTeamPicker} style={{ width:"100%", padding:"10px 12px", background:"rgba(22,163,74,0.12)", border:"none", borderBottom:`1px solid ${T.panelBorder}`, color:"#16a34a", fontSize:12, fontWeight:700, cursor:"pointer" }}>
        🏟️ Carica squadra Serie A
      </button>
      <div style={{ padding:"9px 12px", borderBottom:`1px solid ${T.panelBorder}` }}>
        <div style={{ fontSize:9, fontWeight:700, color:T.textMuted, letterSpacing:"1px", textTransform:"uppercase", marginBottom:4 }}>Nome squadra</div>
        <input value={teamName} onChange={e=>setTeamName(e.target.value)} placeholder="La tua squadra..." maxLength={24}
          style={{ width:"100%", background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:7, padding:"6px 9px", color:T.text, fontSize:16, outline:"none", boxSizing:"border-box" }}/>
      </div>
      <div style={{ padding:"9px 12px", borderBottom:`1px solid ${T.panelBorder}` }}>
        <div style={{ fontSize:9, fontWeight:700, color:T.textMuted, letterSpacing:"1px", textTransform:"uppercase", marginBottom:4 }}>Colore kit</div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {colors.map(c=><div key={c} onClick={()=>setTeamColor(c)} style={{ width:18, height:18, borderRadius:"50%", backgroundColor:c, cursor:"pointer", border:teamColor===c?"2.5px solid "+(th==="dark"?"#fff":"#333"):"2px solid rgba(128,128,128,0.3)", boxShadow:teamColor===c?`0 0 5px ${c}`:"none" }}/>)}
        </div>
      </div>
      <div style={{ padding:"9px 12px", borderBottom:`1px solid ${T.panelBorder}` }}>
        <div style={{ fontSize:9, fontWeight:700, color:T.textMuted, letterSpacing:"1px", textTransform:"uppercase", marginBottom:4 }}>Modulo</div>
        {categories.map(cat=>(
          <div key={cat} style={{ marginBottom:6 }}>
            <div style={{ fontSize:8, color:T.textFaint, fontWeight:700, letterSpacing:"0.8px", marginBottom:3, textTransform:"uppercase" }}>{cat}</div>
            <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
              {Object.entries(FORMATIONS).filter(([,f])=>f.category===cat).map(([key])=>(
                <button key={key} onClick={()=>setFormation(key)} style={{ padding:"2px 6px", borderRadius:4, fontSize:9, fontWeight:700, cursor:"pointer", border:"1px solid", background:formation===key?teamColor:"transparent", borderColor:formation===key?teamColor:"rgba(128,128,128,0.3)", color:formation===key?(teamColor==="#e5e7eb"?"#000":"#fff"):T.textMuted }}>{key}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding:"8px 12px" }}>
        <button onClick={()=>setShowKits(s=>!s)} style={{ width:"100%", padding:"6px", borderRadius:6, border:`1px solid ${showKits?"#16a34a":"rgba(128,128,128,0.3)"}`, background:showKits?"rgba(22,163,74,0.1)":"transparent", color:showKits?"#16a34a":T.textMuted, fontSize:11, fontWeight:600, cursor:"pointer" }}>
          {showKits ? "✓ Kit abilitati" : "⚽ Mostra kit squadre"}
        </button>
      </div>
    </div>
  );
}

// ─── STAT SELECTOR ───────────────────────────────────────────────────────────
function StatSelector({ activeStats, setActiveStats }) {
  const th = useTheme(); const T = th==="dark"?DARK:LIGHT;
  const toggle = id => setActiveStats(prev => prev.includes(id) ? prev.filter(s=>s!==id) : [...prev, id]);
  const nonRating = activeStats.filter(s=>s!=="rating").length;
  return (
    <div style={{ background:T.panel, borderRadius:12, border:`1px solid ${T.panelBorder}`, padding:"9px 12px" }}>
      <div style={{ fontSize:9, fontWeight:700, color:T.textMuted, letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 }}>
        Info visibili <span style={{ fontSize:8, fontWeight:400 }}>(max {MAX_FIELD_STATS} extra)</span>
      </div>
      {STAT_VIEWS.map(sv => {
        const active = activeStats.includes(sv.id);
        const blocked = !active && sv.id !== "rating" && nonRating >= MAX_FIELD_STATS;
        return (
          <button key={sv.id} onClick={()=>{ if (!blocked) toggle(sv.id); }}
            style={{ display:"flex", alignItems:"center", gap:7, padding:"5px 9px", borderRadius:6, border:`1px solid ${active?sv.color:T.panelBorder}`, background:active?sv.color+"18":"transparent", cursor:blocked?"not-allowed":"pointer", textAlign:"left", width:"100%", marginBottom:3, opacity:blocked?0.4:1 }}>
            <span style={{ fontSize:12 }}>{sv.icon}</span>
            <span style={{ fontSize:10, fontWeight:600, color:active?sv.color:T.textMuted, flex:1 }}>{sv.label}</span>
            <div style={{ width:13, height:13, borderRadius:3, background:active?sv.color:"transparent", border:`1.5px solid ${active?sv.color:T.textFaint}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"#000" }}>{active?"✓":""}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── COMPARE HEADER ──────────────────────────────────────────────────────────
function CompareHeader({ team1, team2, lineup1, lineup2 }) {
  const th = useTheme(); const T = th==="dark"?DARK:LIGHT;
  const avg=(lu,k)=>{const f=lu.filter(Boolean);return f.length?f.reduce((a,p)=>a+(p[k]||0),0)/f.length:0;};
  const sum=(lu,k)=>lu.filter(Boolean).reduce((a,p)=>a+(p[k]||0),0);
  const metrics=[
    {label:"Rating",a:avg(lineup1,"rating").toFixed(1),b:avg(lineup2,"rating").toFixed(1),nA:avg(lineup1,"rating"),nB:avg(lineup2,"rating"),hib:true},
    {label:"Età media",a:avg(lineup1,"age").toFixed(1)+"a",b:avg(lineup2,"age").toFixed(1)+"a",nA:avg(lineup1,"age"),nB:avg(lineup2,"age"),hib:false},
    {label:"Valore",a:`€${sum(lineup1,"value")}M`,b:`€${sum(lineup2,"value")}M`,nA:sum(lineup1,"value"),nB:sum(lineup2,"value"),hib:true},
    {label:"Stipendi/a",a:`€${sum(lineup1,"wage").toLocaleString("it-IT")}K`,b:`€${sum(lineup2,"wage").toLocaleString("it-IT")}K`,nA:sum(lineup1,"wage"),nB:sum(lineup2,"wage"),hib:true},
  ];
  return (
    <div style={{ background:T.panel, borderRadius:12, border:`1px solid ${T.panelBorder}`, padding:"11px 14px", marginBottom:10 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:6, alignItems:"center", marginBottom:9 }}>
        <div style={{ textAlign:"center" }}><div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:900, color:team1.color }}>{team1.name||"A"}</div><div style={{ fontSize:9, color:T.textMuted }}>{lineup1.filter(Boolean).length}/11</div></div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:17, fontWeight:900, color:T.textFaint }}>VS</div>
        <div style={{ textAlign:"center" }}><div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:900, color:team2.color }}>{team2.name||"B"}</div><div style={{ fontSize:9, color:T.textMuted }}>{lineup2.filter(Boolean).length}/11</div></div>
      </div>
      {metrics.map(m=>{
        const aW=m.hib?m.nA>m.nB:m.nA<m.nB, bW=m.hib?m.nB>m.nA:m.nB<m.nA;
        return(<div key={m.label} style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:4, alignItems:"center", marginBottom:4 }}>
          <div style={{ textAlign:"right", fontSize:11, fontWeight:700, color:aW?team1.color:T.textMuted }}>{m.a}</div>
          <div style={{ fontSize:9, color:T.textMuted, textAlign:"center", minWidth:60 }}>{m.label}</div>
          <div style={{ textAlign:"left", fontSize:11, fontWeight:700, color:bW?team2.color:T.textMuted }}>{m.b}</div>
        </div>);
      })}
    </div>
  );
}

// ─── LINEUP PANEL ────────────────────────────────────────────────────────────
function LineupPanel({ lineup, altPlayers, formation, onRemovePlayer, onRemoveAlt, onClickSlot, activeStats, captain, onSetCaptain }) {
  const th = useTheme(); const T = th==="dark"?DARK:LIGHT;
  const positions = FORMATIONS[formation]?.positions || [];
  const shownStats = STAT_VIEWS.filter(s=>activeStats.includes(s.id)&&s.id!=="rating");
  return (
    <div style={{ background:T.panel, borderRadius:12, border:`1px solid ${T.panelBorder}`, overflow:"hidden" }}>
      <div style={{ padding:"9px 12px", borderBottom:`1px solid ${T.panelBorder}` }}>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, color:T.text }}>XI ({lineup.filter(Boolean).length}/11)</span>
      </div>
      <div style={{ maxHeight:480, overflowY:"auto" }}>
        {positions.map(pos=>{
          const player=lineup[pos.slot];
          const alt=altPlayers[pos.slot]?PLAYERS.find(p=>p.id===altPlayers[pos.slot]):null;
          const rc=POSITION_COLORS[pos.role]||"#6b7280";
          const exp=player&&player.contract<=2026;
          return(
            <div key={pos.slot} style={{ borderBottom:`1px solid ${T.panelBorder}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", cursor:player?"default":"pointer", minHeight:34 }}
                onClick={()=>{ if (!player) onClickSlot(pos.slot); }}>
                <div style={{ width:24, fontSize:8, fontWeight:700, color:rc, background:rc+"22", borderRadius:3, textAlign:"center", padding:"2px", flexShrink:0 }}>{pos.role}</div>
                {player ? (
                  <>
                    <KitSVG club={player.club} size={22}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {captain===player.id&&<span style={{ color:"#ffd700", marginRight:2 }}>★</span>}
                        {player.shortName}
                        {player.foot==="L"&&<span style={{ fontSize:8, color:"#ec4899", marginLeft:2 }}>✦</span>}
                        {exp&&<span style={{ fontSize:8, color:"#ef4444", marginLeft:2 }}>⚠{player.contract}</span>}
                      </div>
                      {shownStats.length>0&&<div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                        {shownStats.map(sv=>player[sv.id]!==undefined&&<span key={sv.id} style={{ fontSize:8, color:sv.id==="contract"&&exp?"#ef4444":sv.color, fontWeight:700 }}>{sv.id==="nation"?NATION_FLAGS[player.nation]||player.nation:sv.id==="foot"?(player.foot==="L"?"✦":"Dx"):`${sv.icon}${sv.format(player[sv.id])}`}</span>)}
                      </div>}
                    </div>
                    {activeStats.includes("rating")&&<div style={{ fontSize:10, fontWeight:800, color:ratingColor(player.rating), flexShrink:0 }}>{player.rating}</div>}
                    <button onClick={e=>{e.stopPropagation();onSetCaptain(player.id);}} style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:captain===player.id?"#ffd700":T.textFaint, padding:2, flexShrink:0 }}>★</button>
                    <button onClick={e=>{e.stopPropagation();onRemovePlayer(pos.slot);}} style={{ background:"none", border:"none", color:T.textFaint, cursor:"pointer", fontSize:11, padding:2, flexShrink:0 }}>✕</button>
                  </>
                ) : <div style={{ fontSize:10, color:T.textFaint, fontStyle:"italic", display:"flex", alignItems:"center", gap:5 }}><span style={{ fontSize:14, color:rc+"66" }}>+</span>Aggiungi {pos.role}</div>}
              </div>
              {alt&&<div style={{ display:"flex", alignItems:"center", gap:6, padding:"3px 10px 4px 36px", background:"rgba(22,163,74,0.06)" }}>
                <span style={{ fontSize:9, color:"#16a34a", fontWeight:700, width:24, textAlign:"center" }}>↕</span>
                <KitSVG club={alt.club} size={18}/>
                <div style={{ flex:1, fontSize:10, color:"#16a34a", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{alt.shortName}</div>
                <div style={{ fontSize:9, fontWeight:800, color:ratingColor(alt.rating) }}>{alt.rating}</div>
                <button onClick={()=>onRemoveAlt(pos.slot)} style={{ background:"none", border:"none", color:T.textFaint, cursor:"pointer", fontSize:10 }}>✕</button>
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
  const th = useTheme(); const T = th==="dark"?DARK:LIGHT;
  const [sortBy, setSortBy] = useState("rating");
  const shownStats = STAT_VIEWS.filter(s=>activeStats.includes(s.id)&&s.id!=="rating");
  const starterIds = new Set(lineup.filter(Boolean).map(p=>p.id));
  const bench = benchPlayers.filter(p=>!starterIds.has(p.id)).sort((a,b)=>{
    if(sortBy==="rating")return b.rating-a.rating;
    if(sortBy==="age")return a.age-b.age;
    if(sortBy==="value")return b.value-a.value;
    if(sortBy==="wage")return b.wage-a.wage;
    return 0;
  });
  return (
    <div style={{ background:T.panel, borderRadius:12, border:`1px solid ${T.panelBorder}`, overflow:"hidden" }}>
      <div style={{ padding:"9px 12px", borderBottom:`1px solid ${T.panelBorder}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, color:T.text }}>Rosa ({bench.length})</div>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ background:T.inputBg, border:`1px solid ${T.inputBorder}`, borderRadius:5, padding:"2px 6px", color:T.textMuted, fontSize:10, outline:"none" }}>
            <option value="rating">Rating ↓</option>
            <option value="age">Età ↑</option>
            <option value="value">Valore ↓</option>
            <option value="wage">Stipendio ↓</option>
          </select>
        </div>
        <div style={{ fontSize:9, color:T.textFaint, marginTop:2 }}>Clicca → alt ↕ · ★ → capitano</div>
      </div>
      <div style={{ overflowY:"auto", maxHeight:500 }}>
        {bench.length===0&&<div style={{ padding:20, color:T.textFaint, fontSize:12, textAlign:"center" }}>Carica una squadra</div>}
        {bench.map(p=>{
          const rc=POSITION_COLORS[p.position]||"#6b7280";
          const isAlt=Object.values(altPlayers).includes(p.id);
          const exp=p.contract<=2026;
          return(
            <div key={p.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", borderBottom:`1px solid ${T.panelBorder}`, cursor:"pointer" }}
              onMouseEnter={e=>e.currentTarget.style.background=T.inputBg}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ width:22, fontSize:8, fontWeight:700, color:rc, background:rc+"22", borderRadius:3, textAlign:"center", padding:"2px", flexShrink:0 }}>{p.position}</div>
              <div onClick={()=>onSetAlt(p)} style={{ flexShrink:0 }}><KitSVG club={p.club} size={22}/></div>
              <div onClick={()=>onSetAlt(p)} style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:700, color:isAlt?"#16a34a":T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {captain===p.id&&<span style={{ color:"#ffd700", marginRight:2 }}>★</span>}
                  {p.shortName}
                  {p.foot==="L"&&<span style={{ fontSize:8, color:"#ec4899", marginLeft:2 }}>✦</span>}
                  {exp&&<span style={{ fontSize:8, color:"#ef4444", marginLeft:2 }}>⚠{p.contract}</span>}
                  {isAlt&&<span style={{ fontSize:8, color:"#16a34a", marginLeft:2 }}>↕</span>}
                </div>
                {shownStats.length>0&&<div style={{ display:"flex", gap:3 }}>
                  {shownStats.map(sv=>p[sv.id]!==undefined&&<span key={sv.id} style={{ fontSize:8, color:sv.id==="contract"&&exp?"#ef4444":sv.color, fontWeight:700 }}>{sv.id==="nation"?NATION_FLAGS[p.nation]||p.nation:sv.id==="foot"?(p.foot==="L"?"✦":"Dx"):`${sv.icon}${sv.format(p[sv.id])}`}</span>)}
                </div>}
              </div>
              <button onClick={()=>onSetCaptain(p.id)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:captain===p.id?"#ffd700":T.textFaint, padding:2, flexShrink:0 }}>★</button>
              <div style={{ fontSize:10, fontWeight:800, color:ratingColor(p.rating), flexShrink:0 }}>{p.rating}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SQUAD STATS ─────────────────────────────────────────────────────────────
function SquadStats({ lineup }) {
  const th = useTheme(); const T = th==="dark"?DARK:LIGHT;
  const filled=lineup.filter(Boolean);
  if(!filled.length)return null;
  const avg=k=>{const v=filled.map(p=>p[k]).filter(x=>x!==undefined);return v.length?v.reduce((a,b)=>a+b,0)/v.length:0;};
  const sum=k=>filled.reduce((a,p)=>a+(p[k]||0),0);
  const ag={"≤21":0,"22-25":0,"26-29":0,"30+":0};
  filled.forEach(p=>{if(p.age<=21)ag["≤21"]++;else if(p.age<=25)ag["22-25"]++;else if(p.age<=29)ag["26-29"]++;else ag["30+"]++;});
  const exp=filled.filter(p=>p.contract<=2026).length;
  const lf=filled.filter(p=>p.foot==="L").length;
  return(
    <div style={{ background:T.panel, borderRadius:12, border:`1px solid ${T.panelBorder}`, overflow:"hidden" }}>
      <div style={{ padding:"9px 12px", borderBottom:`1px solid ${T.panelBorder}` }}>
        <div style={{ fontSize:9, fontWeight:700, color:T.textMuted, letterSpacing:"1px", textTransform:"uppercase" }}>Statistiche rosa</div>
      </div>
      <div style={{ padding:"2px 0" }}>
        {[
          {label:"Rating medio",value:avg("rating").toFixed(1),color:ratingColor(avg("rating"))},
          {label:"Età media",value:`${avg("age").toFixed(1)} anni`},
          {label:"Valore totale",value:`€${sum("value")}M`,color:"#16a34a"},
          {label:"Stipendi/anno",value:`€${sum("wage").toLocaleString("it-IT")}K`,color:"#f59e0b"},
          {label:"Altezza media",value:`${avg("height").toFixed(0)} cm`},
          {label:"Mancini",value:`${lf}/${filled.length}`,color:"#ec4899"},
          {label:"In scadenza ⚠",value:`${exp}`,color:exp>0?"#ef4444":T.textMuted},
        ].map(s=>(
          <div key={s.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 12px", borderBottom:`1px solid ${T.panelBorder}` }}>
            <span style={{ fontSize:10, color:T.textMuted }}>{s.label}</span>
            <span style={{ fontSize:11, fontWeight:700, color:s.color||T.text }}>{s.value}</span>
          </div>
        ))}
      </div>
      <div style={{ padding:"7px 12px 10px", borderTop:`1px solid ${T.panelBorder}` }}>
        <div style={{ fontSize:9, fontWeight:700, color:T.textMuted, textTransform:"uppercase", marginBottom:5 }}>Distribuzione età</div>
        {Object.entries(ag).map(([l,c])=>(
          <div key={l} style={{ display:"flex", alignItems:"center", gap:5, marginBottom:4 }}>
            <span style={{ fontSize:9, color:T.textMuted, width:34, flexShrink:0 }}>{l}</span>
            <div style={{ flex:1, height:4, background:T.inputBg, borderRadius:2, overflow:"hidden" }}>
              <div style={{ width:`${filled.length?(c/filled.length)*100:0}%`, height:"100%", background:l==="≤21"?"#3b82f6":l==="22-25"?"#16a34a":l==="26-29"?"#f59e0b":"#ef4444", borderRadius:2 }}/>
            </div>
            <span style={{ fontSize:9, color:T.textMuted, width:10, textAlign:"right" }}>{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ALT SLOT PICKER ─────────────────────────────────────────────────────────
function AltSlotPicker({ player, lineup, positions, onSelect, onClose }) {
  const th = useTheme(); const T = th==="dark"?DARK:LIGHT;
  return(
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:T.panel, borderRadius:14, width:"100%", maxWidth:340, border:`1px solid ${T.panelBorder}` }}>
        <div style={{ padding:"11px 14px", borderBottom:`1px solid ${T.panelBorder}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:700, color:T.text }}>Alternativa per quale slot?</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:T.textMuted, cursor:"pointer", fontSize:18 }}>✕</button>
        </div>
        <div style={{ padding:"5px 0", maxHeight:340, overflowY:"auto" }}>
          {positions.map(pos=>{
            const starter=lineup[pos.slot]; if(!starter)return null;
            const rc=POSITION_COLORS[pos.role]||"#6b7280";
            return(
              <div key={pos.slot} onClick={()=>onSelect(pos.slot)}
                style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 14px", cursor:"pointer", borderBottom:`1px solid ${T.panelBorder}` }}
                onMouseEnter={e=>e.currentTarget.style.background=T.inputBg}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{ width:24, fontSize:8, fontWeight:700, color:rc, background:rc+"22", borderRadius:3, textAlign:"center", padding:"2px 3px" }}>{pos.role}</div>
                <KitSVG club={starter.club} size={24}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:T.text }}>{starter.name}</div>
                  <div style={{ fontSize:10, color:T.textMuted }}>→ {player.name}</div>
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
  return <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#16a34a", color:"#fff", padding:"10px 20px", borderRadius:10, fontWeight:700, fontSize:14, zIndex:999, boxShadow:"0 8px 24px rgba(0,0,0,0.4)", whiteSpace:"nowrap" }}>{message}</div>;
}

// ─── XL ROLE MAP ─────────────────────────────────────────────────────────────
const XLR = {'GK':'GK','ST':'ST','LS':'ST','RS':'ST','CF':'ST','LCB':'CB','RCB':'CB','CB':'CB','MCB':'CB','LB':'LB','LWB':'LB','RB':'RB','RWB':'RB','CDM':'DM','LCDM':'DM','RCDM':'DM','LCM':'CM','RCM':'CM','CM':'CM','CAM':'AM','LAM':'LW','RAM':'RW','LM':'LM','RM':'RM','LW':'LW','RW':'RW'};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme] = useState("dark");
  const T = theme === "dark" ? DARK : LIGHT;

  const [mode, setMode] = useState("single");
  const [activeTeam, setActiveTeam] = useState(0);

  const [lineup1, setLineup1, undo1, redo1, canUndo1, canRedo1] = useUndoRedo(Array(11).fill(null));
  const [lineup2, setLineup2, undo2, redo2, canUndo2, canRedo2] = useUndoRedo(Array(11).fill(null));
  const [formation1, setFormation1Raw] = useState("4-3-3");
  const [formation2, setFormation2Raw] = useState("4-3-3");
  const [teamName1, setTeamName1] = useState("Squadra A");
  const [teamName2, setTeamName2] = useState("Squadra B");
  const [teamColor1, setTeamColor1] = useState("#16a34a");
  const [teamColor2, setTeamColor2] = useState("#2563eb");
  const [altPlayers1, setAltPlayers1] = useState({});
  const [altPlayers2, setAltPlayers2] = useState({});
  const [bench1, setBench1] = useState([]);
  const [bench2, setBench2] = useState([]);
  const [captain1, setCaptain1] = useState(null);
  const [captain2, setCaptain2] = useState(null);

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

  // Current team aliases
  const lineup      = activeTeam===0?lineup1:lineup2;
  const setLineup   = activeTeam===0?setLineup1:setLineup2;
  const formation   = activeTeam===0?formation1:formation2;
  const teamName    = activeTeam===0?teamName1:teamName2;
  const teamColor   = activeTeam===0?teamColor1:teamColor2;
  const altPlayers  = activeTeam===0?altPlayers1:altPlayers2;
  const bench       = activeTeam===0?bench1:bench2;
  const captain     = activeTeam===0?captain1:captain2;
  const setTeamName  = activeTeam===0?setTeamName1:setTeamName2;
  const setTeamColor = activeTeam===0?setTeamColor1:setTeamColor2;
  const setAltPlayers = activeTeam===0?setAltPlayers1:setAltPlayers2;
  const setBench     = activeTeam===0?setBench1:setBench2;
  const setCaptain   = activeTeam===0?setCaptain1:setCaptain2;
  const undoLineup   = activeTeam===0?undo1:undo2;
  const redoLineup   = activeTeam===0?redo1:redo2;
  const canUndo      = activeTeam===0?canUndo1:canUndo2;
  const canRedo      = activeTeam===0?canRedo1:canRedo2;

  // Formation change with remap
  const setFormation = useCallback((f) => {
    if (activeTeam === 0) {
      setFormation1Raw(f);
      setLineup1(prev => remapToFormation(f, prev));
    } else {
      setFormation2Raw(f);
      setLineup2(prev => remapToFormation(f, prev));
    }
  }, [activeTeam]);

  useEffect(()=>{
    const hash=window.location.hash.slice(1);
    if(hash){const d=dec(hash);if(d){const pl=d.l.map(id=>id?PLAYERS.find(p=>p.id===id)||null:null);setLineup1(pl);if(d.f)setFormation1Raw(d.f);if(d.n)setTeamName1(d.n);if(d.c)setTeamColor1(d.c);if(d.a)setAltPlayers1(d.a);}}
    setSavedLineups(JSON.parse(localStorage.getItem(SAVED_KEY)||"[]"));
  },[]);

  const loadTeam = useCallback(teamData => {
    const tf = teamData.formation || "4-3-3";
    const positions = FORMATIONS[tf]?.positions || [];
    const newLineup = Array(11).fill(null);
    const usedIds = new Set();
    const starters = (teamData.starters||[])
      .map(s => ({ ...s, player: s.playerId ? PLAYERS.find(p=>p.id===s.playerId)||null : null }))
      .filter(s => s.player);

    positions.forEach(pos => {
      if (newLineup[pos.slot]) return;
      const c = starters.find(s => XLR[s.xlRole]===pos.role && !usedIds.has(s.player.id))
             || starters.find(s => s.player.position===pos.role && !usedIds.has(s.player.id));
      if (c) { newLineup[pos.slot]=c.player; usedIds.add(c.player.id); }
    });
    const tp = PLAYERS.filter(p=>p.club===teamData.name).sort((a,b)=>b.rating-a.rating);
    positions.forEach(pos => {
      if (newLineup[pos.slot]) return;
      const c = tp.find(p=>p.position===pos.role&&!usedIds.has(p.id));
      if (c) { newLineup[pos.slot]=c; usedIds.add(c.id); }
    });
    positions.forEach(pos => {
      if (newLineup[pos.slot]) return;
      const c = tp.find(p=>!usedIds.has(p.id));
      if (c) { newLineup[pos.slot]=c; usedIds.add(c.id); }
    });

    if (activeTeam === 0) {
      setLineup1(newLineup); setFormation1Raw(tf);
      setTeamName1(teamData.name); setTeamColor1(teamData.color);
      setAltPlayers1({}); setBench1(PLAYERS.filter(p=>p.club===teamData.name));
    } else {
      setLineup2(newLineup); setFormation2Raw(tf);
      setTeamName2(teamData.name); setTeamColor2(teamData.color);
      setAltPlayers2({}); setBench2(PLAYERS.filter(p=>p.club===teamData.name));
    }
    setShowTeamPicker(false);
    setToast(`${teamData.name} caricata! ⚽`);
  }, [activeTeam]);

  const handleAutoFill = () => {
    const pool = bench.length > 0 ? bench : PLAYERS;
    setLineup(prev => autoFill(formation, prev, pool));
    setToast("Auto-fill completato! 🤖");
  };

  const openSlot = (slot, isAlt=false) => {
    const pd = (FORMATIONS[formation]?.positions||[]).find(p=>p.slot===slot);
    setSelectedSlotRole(pd?.role||null);
    setSelectingSlot({slot, isAlt});
  };

  const handlePlayerSelect = player => {
    if (!selectingSlot) return;
    const {slot, isAlt} = selectingSlot;
    if (isAlt) setAltPlayers(prev=>({...prev,[slot]:player.id}));
    else setLineup(prev=>{const n=[...prev];n[slot]=player;return n;});
    setSelectingSlot(null);
  };

  const handleSlotDrop = useCallback((slot, {player, fromSlot}, teamIdx) => {
    const setter = teamIdx===0 ? setLineup1 : setLineup2;
    setter(prev => {
      const next = [...prev];
      if (fromSlot !== undefined && fromSlot !== null) {
        [next[fromSlot], next[slot]] = [next[slot], next[fromSlot]];
      } else {
        next[slot] = player;
      }
      return next;
    });
  }, []);

  const handleBenchClick = player => setAltPickerPlayer(player);
  const handleAltSlotSelect = slot => {
    if (!altPickerPlayer) return;
    setAltPlayers(prev=>({...prev,[slot]:altPickerPlayer.id}));
    setAltPickerPlayer(null);
    setToast(`${altPickerPlayer.shortName} → alternativa ↕`);
  };

  const handleRemovePlayer = slot => setLineup(prev=>{const n=[...prev];n[slot]=null;return n;});
  const handleRemoveAlt = slot => setAltPlayers(prev=>{const n={...prev};delete n[slot];return n;});

  const handleShare = () => {
    const code = enc(lineup1,formation1,teamName1,teamColor1,altPlayers1);
    const url = `${window.location.origin}${window.location.pathname}#${code}`;
    navigator.clipboard.writeText(url).then(()=>setToast("Link copiato! 🔗")).catch(()=>{});
  };

  const handleSave = () => {
    const saved=JSON.parse(localStorage.getItem(SAVED_KEY)||"[]");
    const entry={id:Date.now(),name:teamName1,formation:formation1,color:teamColor1,lineup:lineup1.map(p=>p?.id??null),altPlayers:altPlayers1,date:new Date().toLocaleDateString("it-IT")};
    const updated=[entry,...saved].slice(0,10);
    localStorage.setItem(SAVED_KEY,JSON.stringify(updated));
    setSavedLineups(updated);
    setToast("Salvata! 💾");
  };

  const handleLoadSaved = entry => {
    const pl=entry.lineup.map(id=>id?PLAYERS.find(p=>p.id===id)||null:null);
    setLineup1(pl);setFormation1Raw(entry.formation);setTeamName1(entry.name);
    setTeamColor1(entry.color);setAltPlayers1(entry.altPlayers||{});
    setShowSaved(false);setToast("Caricata! ✅");
  };

  const positions = FORMATIONS[formation]?.positions||[];
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  useEffect(()=>{const h=()=>setIsMobile(window.innerWidth<900);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);

  const gridCols = mode==="compare"
    ? (isMobile?"1fr":"200px 1fr 1fr 200px")
    : (isMobile?"1fr":"200px 1fr 200px 180px");

  return (
    <ThemeCtx.Provider value={theme}>
      <div style={{ minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"'Inter',sans-serif" }}>
        <style>{`
          *{box-sizing:border-box;}
          html,body{margin:0;padding:0;overflow-x:hidden;width:100%;max-width:100vw;}
          ::-webkit-scrollbar{width:4px;}
          ::-webkit-scrollbar-thumb{background:rgba(128,128,128,0.2);border-radius:2px;}
          input[type=range]{accent-color:#ffd700;}
        `}</style>

        {/* HEADER */}
        <header style={{ background:T.headerBg, backdropFilter:"blur(12px)", borderBottom:`1px solid ${T.panelBorder}`, padding:"0 14px", height:50, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:26, height:26, background:"linear-gradient(135deg,#16a34a,#059669)", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>⚽</div>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:900, lineHeight:1, color:T.text }}>LINEUP BUILDER</div>
              <div style={{ fontSize:8, color:T.textMuted, letterSpacing:"1.5px" }}>UNIVERSO SPORTIVO</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:4, alignItems:"center", flexWrap:"wrap" }}>
            {/* Mode */}
            <div style={{ display:"flex", background:T.inputBg, borderRadius:7, border:`1px solid ${T.panelBorder}`, overflow:"hidden" }}>
              {[{id:"single",label:"Builder"},{id:"compare",label:"⚔️ VS"}].map(m=>(
                <button key={m.id} onClick={()=>{setMode(m.id);setActiveTeam(0);}} style={{ padding:"5px 10px", border:"none", cursor:"pointer", fontSize:11, fontWeight:700, background:mode===m.id?"#16a34a":"transparent", color:mode===m.id?"#fff":T.textMuted }}>{m.label}</button>
              ))}
            </div>
            {/* Theme */}
            <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} title="Cambia tema" style={{ background:T.inputBg, border:`1px solid ${T.panelBorder}`, color:T.text, borderRadius:6, padding:"5px 8px", cursor:"pointer", fontSize:13 }}>{theme==="dark"?"☀️":"🌙"}</button>
            <button onClick={()=>{undoLineup();}} disabled={!canUndo} style={{ background:T.inputBg, border:`1px solid ${T.panelBorder}`, color:canUndo?T.text:T.textFaint, borderRadius:6, padding:"5px 8px", cursor:canUndo?"pointer":"default", fontSize:12 }}>↩</button>
            <button onClick={()=>{redoLineup();}} disabled={!canRedo} style={{ background:T.inputBg, border:`1px solid ${T.panelBorder}`, color:canRedo?T.text:T.textFaint, borderRadius:6, padding:"5px 8px", cursor:canRedo?"pointer":"default", fontSize:12 }}>↪</button>
            <button onClick={handleAutoFill} title="Auto-fill" style={{ background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.4)", color:"#818cf8", borderRadius:6, padding:"5px 8px", cursor:"pointer", fontSize:12 }}>🤖</button>
            <button onClick={()=>setExporting(true)} style={{ background:T.inputBg, border:`1px solid ${T.panelBorder}`, color:T.text, borderRadius:6, padding:"5px 8px", cursor:"pointer", fontSize:12 }}>📸</button>
            <button onClick={handleSave} style={{ background:T.inputBg, border:`1px solid ${T.panelBorder}`, color:T.text, borderRadius:6, padding:"5px 8px", cursor:"pointer", fontSize:12 }}>💾</button>
            <button onClick={()=>setShowSaved(s=>!s)} style={{ background:showSaved?"#16a34a18":T.inputBg, border:`1px solid ${showSaved?"#16a34a":T.panelBorder}`, color:showSaved?"#16a34a":T.text, borderRadius:6, padding:"5px 8px", cursor:"pointer", fontSize:11 }}>📁{savedLineups.length>0&&` (${savedLineups.length})`}</button>
            <button onClick={handleShare} style={{ background:"#16a34a", border:"none", color:"#fff", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontSize:11, fontWeight:700 }}>🔗</button>
          </div>
        </header>

        {/* SAVED DRAWER */}
        {showSaved && (
          <div style={{ background:T.panel, borderBottom:`1px solid ${T.panelBorder}`, padding:"9px 14px" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, marginBottom:7, color:T.text }}>Formazzioni salvate</div>
            {savedLineups.length===0
              ? <div style={{ color:T.textMuted, fontSize:11 }}>Nessuna</div>
              : <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                  {savedLineups.map(e=>(
                    <div key={e.id} onClick={()=>handleLoadSaved(e)} style={{ background:T.inputBg, border:`1px solid ${e.color}44`, borderRadius:8, padding:"6px 10px", cursor:"pointer", display:"flex", alignItems:"center", gap:7 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:e.color }}/>
                      <div><div style={{ fontSize:11, fontWeight:700, color:T.text }}>{e.name}</div><div style={{ fontSize:9, color:T.textMuted }}>{e.formation} · {e.date}</div></div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* MAIN */}
        <main style={{ maxWidth:mode==="compare"?1320:1160, margin:"0 auto", padding:"12px 10px", display:"grid", gridTemplateColumns:gridCols, gap:12, alignItems:"start" }}>

          {/* COL 1: Settings */}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {mode==="compare" && (
              <div style={{ display:"flex", gap:5 }}>
                {[{i:0,n:teamName1,c:teamColor1},{i:1,n:teamName2,c:teamColor2}].map(t=>(
                  <button key={t.i} onClick={()=>setActiveTeam(t.i)} style={{ flex:1, padding:"5px 8px", borderRadius:7, border:`2px solid ${t.c}`, background:activeTeam===t.i?t.c+"22":"transparent", color:activeTeam===t.i?t.c:T.textMuted, cursor:"pointer", fontWeight:700, fontSize:10 }}>{t.n||`Sqd ${t.i+1}`}</button>
                ))}
              </div>
            )}
            <TeamSettings teamName={teamName} setTeamName={setTeamName} teamColor={teamColor} setTeamColor={setTeamColor} formation={formation} setFormation={setFormation} onOpenTeamPicker={()=>setShowTeamPicker(true)} showKits={showKits} setShowKits={setShowKits}/>
            <StatSelector activeStats={activeStats} setActiveStats={setActiveStats}/>
            <div style={{ background:T.panel, borderRadius:10, border:`1px solid ${T.panelBorder}`, padding:"8px 12px" }}>
              <button onClick={()=>{setLineup(Array(11).fill(null));setAltPlayers({});setBench([]);}} style={{ width:"100%", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", color:"#f87171", borderRadius:6, padding:"6px", cursor:"pointer", fontSize:11, fontWeight:600 }}>🗑 Svuota</button>
            </div>
          </div>

          {/* COL 2: Pitch 1 */}
          <div>
            {mode==="compare" && <CompareHeader team1={{name:teamName1,color:teamColor1}} team2={{name:teamName2,color:teamColor2}} lineup1={lineup1} lineup2={lineup2}/>}
            <Pitch lineup={lineup1} altPlayers={altPlayers1} formation={formation1}
              onSlotDrop={(slot,data)=>handleSlotDrop(slot,data,0)}
              onSlotClick={slot=>{setActiveTeam(0);openSlot(slot);}}
              teamName={teamName1} teamColor={teamColor1} activeStats={activeStats} showKits={showKits} captain={captain1}/>
          </div>

          {/* COL 3 */}
          {mode==="compare" ? (
            <Pitch lineup={lineup2} altPlayers={altPlayers2} formation={formation2}
              onSlotDrop={(slot,data)=>handleSlotDrop(slot,data,1)}
              onSlotClick={slot=>{setActiveTeam(1);openSlot(slot);}}
              teamName={teamName2} teamColor={teamColor2} activeStats={activeStats} showKits={showKits} captain={captain2}/>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <LineupPanel lineup={lineup} altPlayers={altPlayers} formation={formation} onRemovePlayer={handleRemovePlayer} onRemoveAlt={handleRemoveAlt} onClickSlot={slot=>openSlot(slot)} activeStats={activeStats} captain={captain} onSetCaptain={setCaptain}/>
              <BenchPanel benchPlayers={bench} lineup={lineup} altPlayers={altPlayers} onSetAlt={handleBenchClick} activeStats={activeStats} captain={captain} onSetCaptain={setCaptain}/>
            </div>
          )}

          {/* COL 4: Stats */}
          {!isMobile && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <SquadStats lineup={lineup}/>
              {mode==="compare" && (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <LineupPanel lineup={lineup} altPlayers={altPlayers} formation={formation} onRemovePlayer={handleRemovePlayer} onRemoveAlt={handleRemoveAlt} onClickSlot={slot=>openSlot(slot)} activeStats={activeStats} captain={captain} onSetCaptain={setCaptain}/>
                  <BenchPanel benchPlayers={bench} lineup={lineup} altPlayers={altPlayers} onSetAlt={handleBenchClick} activeStats={activeStats} captain={captain} onSetCaptain={setCaptain}/>
                </div>
              )}
            </div>
          )}
        </main>

        {/* MODALS */}
        {showTeamPicker && <TeamPicker onSelect={loadTeam} onClose={()=>setShowTeamPicker(false)}/>}
        {selectingSlot !== null && <PlayerSearch onSelectPlayer={handlePlayerSelect} onClose={()=>setSelectingSlot(null)} selectedSlotRole={selectedSlotRole} currentLineup={lineup} isAlt={selectingSlot.isAlt} slotPlayer={lineup[selectingSlot.slot]}/>}
        {altPickerPlayer && <AltSlotPicker player={altPickerPlayer} lineup={lineup} positions={positions} onSelect={handleAltSlotSelect} onClose={()=>setAltPickerPlayer(null)}/>}
        {exporting && <ExportCanvas lineup={lineup} formation={formation} teamName={teamName} teamColor={teamColor} activeStats={activeStats} onDone={()=>{setExporting(false);setToast("PNG scaricato! 📸");}}/>}
        {toast && <Toast message={toast} onDone={()=>setToast(null)}/>}
      </div>
    </ThemeCtx.Provider>
  );
}

