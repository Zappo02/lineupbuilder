import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  PLAYERS, FORMATIONS, POSITION_COLORS, NATION_FLAGS, STAT_VIEWS,
  SERIE_A_TEAMS, PLAYERS_BY_TEAM, TEAM_COLORS
} from "./data/players.js";

const encodeLineup = (lineup, formation, teamName, color, customNames) => {
  const data = { f: formation, n: teamName, c: color, l: lineup.map(s => s?.id ?? null), cn: customNames };
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(data)))); } catch { return ""; }
};
const decodeLineup = (str) => {
  try { return JSON.parse(decodeURIComponent(escape(atob(str)))); } catch { return null; }
};
const getInitials = (name) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
const getRatingColor = (r) => r >= 90 ? "#ffd700" : r >= 85 ? "#e5e7eb" : r >= 80 ? "#cd7f32" : "#6b7280";
const SAVED_KEY = "lineup_builder_saved_v3";

function Avatar({ player, size = 40, showRating = false }) {
  const color = POSITION_COLORS[player.position] || "#6b7280";
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: "50%", backgroundColor: color + "22", border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.32, fontWeight: 700, color, fontFamily: "'Barlow Condensed', sans-serif" }}>
        {getInitials(player.name)}
      </div>
      {showRating && (
        <div style={{ position: "absolute", bottom: -3, right: -3, background: getRatingColor(player.rating), color: "#000", fontSize: 9, fontWeight: 800, borderRadius: 3, padding: "0 3px", lineHeight: "14px", minWidth: 14, textAlign: "center" }}>
          {player.rating}
        </div>
      )}
    </div>
  );
}

function StatBadges({ player, activeStats }) {
  if (!player || activeStats.length === 0) return null;
  const stats = STAT_VIEWS.filter(s => activeStats.includes(s.id) && s.id !== "rating" && player[s.id] !== undefined);
  if (stats.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center", marginTop: 2 }}>
      {stats.slice(0, 2).map(sv => (
        <div key={sv.id} style={{ background: `${sv.color}22`, border: `1px solid ${sv.color}55`, borderRadius: 4, padding: "1px 5px", fontSize: 8, fontWeight: 800, color: sv.color, whiteSpace: "nowrap" }}>
          {sv.icon} {sv.format(player[sv.id])}
        </div>
      ))}
    </div>
  );
}

function PitchSlot({ slot, posData, player, customName, onDrop, onClick, onNameEdit, teamColor, activeStats }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(customName || "");
  const color = POSITION_COLORS[posData.role] || "#6b7280";
  const borderColor = teamColor || color;
  const showRating = activeStats.includes("rating");

  useEffect(() => { setNameVal(customName || ""); }, [customName]);

  const handleDrop = (e) => {
    e.preventDefault(); setIsDragOver(false);
    try { onDrop(slot, JSON.parse(e.dataTransfer.getData("application/json"))); } catch {}
  };
  const commitName = () => { setEditingName(false); onNameEdit(slot, nameVal); };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      style={{ position: "absolute", left: `${posData.x}%`, top: `${posData.y}%`, transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, zIndex: 10 }}
    >
      {player ? (
        <>
          <div draggable onDragStart={e => e.dataTransfer.setData("application/json", JSON.stringify({ player, fromSlot: slot }))} onClick={() => onClick(slot)}
            style={{ position: "relative", cursor: "pointer", transform: isDragOver ? "scale(1.2)" : "scale(1)", transition: "transform 0.15s" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: color + "22", border: `3px solid ${borderColor}`, boxShadow: `0 0 10px ${borderColor}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color, fontFamily: "'Barlow Condensed', sans-serif" }}>
              {getInitials(player.name)}
            </div>
            {showRating && (
              <div style={{ position: "absolute", top: -4, right: -4, background: getRatingColor(player.rating), color: "#000", fontSize: 8, fontWeight: 800, borderRadius: 3, padding: "0 2px", lineHeight: "13px", minWidth: 13, textAlign: "center" }}>
                {player.rating}
              </div>
            )}
          </div>
          <div style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)", borderRadius: 5, padding: "1px 6px", maxWidth: 82, textAlign: "center" }} onClick={() => onClick(slot)}>
            <div style={{ fontSize: 8, color: "#9ca3af", fontWeight: 700, letterSpacing: "0.5px" }}>{posData.role}</div>
            <div style={{ fontSize: 10, color: "#fff", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {customName || player.shortName}
            </div>
          </div>
          {editingName ? (
            <input value={nameVal} onChange={e => setNameVal(e.target.value)}
              onBlur={commitName} onKeyDown={e => { if (e.key === "Enter") commitName(); if (e.key === "Escape") setEditingName(false); }}
              style={{ width: 72, fontSize: 9, padding: "2px 4px", borderRadius: 4, background: "#1f2937", border: "1px solid #16a34a", color: "#fff", outline: "none", textAlign: "center" }}
              autoFocus onClick={e => e.stopPropagation()} />
          ) : (
            <div onClick={e => { e.stopPropagation(); setEditingName(true); }}
              style={{ fontSize: 8, color: "#4b5563", cursor: "text", borderBottom: "1px dashed #374151", paddingBottom: 1, minWidth: 40, textAlign: "center" }}>
              {customName ? `✏️ ${customName}` : "✏️ nome"}
            </div>
          )}
          <StatBadges player={player} activeStats={activeStats} />
        </>
      ) : (
        <>
          <div onClick={() => onClick(slot)} style={{ width: 44, height: 44, borderRadius: "50%", border: `2px dashed ${color}`, backgroundColor: isDragOver ? color + "33" : color + "11", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: color + "bb", cursor: "pointer", transform: isDragOver ? "scale(1.15)" : "scale(1)", transition: "all 0.15s" }}>+</div>
          <div style={{ background: "rgba(0,0,0,0.7)", borderRadius: 4, padding: "1px 6px", fontSize: 9, color, fontWeight: 700 }}>{posData.role}</div>
        </>
      )}
    </div>
  );
}

function Pitch({ lineup, formation, customNames, onSlotDrop, onSlotClick, onNameEdit, teamName, teamColor, activeStats }) {
  const positions = FORMATIONS[formation]?.positions || [];
  return (
    <div style={{ position: "relative", width: "100%", paddingBottom: "150%", userSelect: "none" }}>
      <svg viewBox="0 0 300 450" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gfield" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a4d2e"/>
            <stop offset="100%" stopColor="#1d5c35"/>
          </linearGradient>
        </defs>
        <rect width="300" height="450" fill="url(#gfield)" rx="8"/>
        {[0,1,2,3,4,5,6,7].map(i => (
          <rect key={i} x="0" y={i*57} width="300" height="28" fill={i%2===0?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.02)"}/>
        ))}
        <g fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="1.4">
          <rect x="10" y="10" width="280" height="430" rx="2"/>
          <line x1="10" y1="225" x2="290" y2="225"/>
          <circle cx="150" cy="225" r="36"/>
          <circle cx="150" cy="225" r="2.5" fill="rgba(255,255,255,0.32)" stroke="none"/>
          <rect x="56" y="350" width="188" height="80"/>
          <rect x="100" y="390" width="100" height="40"/>
          <rect x="126" y="432" width="48" height="8"/>
          <rect x="56" y="20" width="188" height="80"/>
          <rect x="100" y="20" width="100" height="40"/>
          <rect x="126" y="10" width="48" height="10"/>
          <path d="M 100 122 A 36 36 0 0 0 200 122"/>
          <path d="M 100 328 A 36 36 0 0 1 200 328"/>
        </g>
        {teamName && <text x="150" y="226" textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.04)" fontSize="20" fontFamily="'Barlow Condensed',sans-serif" fontWeight="900" letterSpacing="3">{teamName.toUpperCase()}</text>}
      </svg>
      {positions.map(posData => (
        <PitchSlot key={posData.slot} slot={posData.slot} posData={posData}
          player={lineup[posData.slot] || null} customName={customNames[posData.slot] || ""}
          onDrop={onSlotDrop} onClick={onSlotClick} onNameEdit={onNameEdit}
          teamColor={teamColor} activeStats={activeStats} />
      ))}
    </div>
  );
}

function TeamPicker({ onSelect, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#111827", borderRadius: 16, width: "100%", maxWidth: 480, border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 30px 70px rgba(0,0,0,0.9)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 700, color: "#fff" }}>Carica squadra Serie A</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {SERIE_A_TEAMS.map(team => (
            <button key={team.name} onClick={() => onSelect(team)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${team.color}44`, borderRadius: 10, cursor: "pointer", textAlign: "left" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = team.color; e.currentTarget.style.background = team.color + "18"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = team.color + "44"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: team.color, flexShrink: 0 }}/>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{team.name}</div>
                <div style={{ fontSize: 10, color: "#6b7280" }}>OVR {team.rating}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayerSearch({ onSelectPlayer, onClose, selectedSlotRole, currentLineup }) {
  const [query, setQuery] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");
  const [clubFilter, setClubFilter] = useState("ALL");
  const inputRef = useRef();
  useEffect(() => { inputRef.current?.focus(); }, []);

  const posMap = { DEF: ["CB","RB","LB"], MID: ["DM","CM","AM","RM","LM"], ATT: ["ST","RW","LW"] };
  const clubs = ["ALL", ...Array.from(new Set(PLAYERS.map(p => p.club))).sort()];
  const usedIds = new Set(currentLineup.filter(Boolean).map(p => p.id));

  const filtered = PLAYERS.filter(p => {
    const q = query.toLowerCase();
    const matchQ = !query || p.name.toLowerCase().includes(q) || p.club.toLowerCase().includes(q);
    const matchP = posFilter === "ALL" || (posFilter === "GK" && p.position === "GK") || (posMap[posFilter] && posMap[posFilter].includes(p.position));
    const matchC = clubFilter === "ALL" || p.club === clubFilter;
    return matchQ && matchP && matchC;
  }).sort((a, b) => b.rating - a.rating);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#111827", borderRadius: 16, width: "100%", maxWidth: 500, maxHeight: "88vh", display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 700, color: "#fff" }}>
              Scegli giocatore
              {selectedSlotRole && <span style={{ marginLeft: 8, fontSize: 11, color: POSITION_COLORS[selectedSlotRole] || "#6b7280", background: (POSITION_COLORS[selectedSlotRole] || "#6b7280") + "22", padding: "2px 7px", borderRadius: 4, fontWeight: 600 }}>{selectedSlotRole}</span>}
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 20 }}>✕</button>
          </div>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Cerca per nome o club..."
            style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 8 }}/>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
            {["ALL","GK","DEF","MID","ATT"].map(pg => (
              <button key={pg} onClick={() => setPosFilter(pg)} style={{ padding: "3px 10px", borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: "pointer", border: "1px solid", background: posFilter===pg?"#16a34a":"transparent", borderColor: posFilter===pg?"#16a34a":"rgba(255,255,255,0.15)", color: posFilter===pg?"#fff":"#9ca3af" }}>{pg}</button>
            ))}
          </div>
          <select value={clubFilter} onChange={e => setClubFilter(e.target.value)} style={{ width: "100%", background: "#1f2937", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "6px 10px", color: "#9ca3af", fontSize: 12, outline: "none" }}>
            {clubs.map(c => <option key={c} value={c}>{c === "ALL" ? "Tutte le squadre" : c}</option>)}
          </select>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.length === 0
            ? <div style={{ padding: 32, textAlign: "center", color: "#6b7280", fontSize: 13 }}>Nessun giocatore trovato</div>
            : filtered.map(player => {
              const isUsed = usedIds.has(player.id);
              return (
                <div key={player.id} onClick={() => !isUsed && onSelectPlayer(player)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", cursor: isUsed?"default":"pointer", opacity: isUsed?0.35:1, borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  onMouseEnter={e => { if (!isUsed) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                  <Avatar player={player} size={38} showRating/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{player.name}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{player.club} · {player.age} anni</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a" }}>€{player.value}M</div>
                    <div style={{ fontSize: 9, color: POSITION_COLORS[player.position]||"#6b7280", background: (POSITION_COLORS[player.position]||"#6b7280")+"22", padding: "1px 5px", borderRadius: 3, fontWeight: 700, marginTop: 2 }}>{player.position}</div>
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}

function TeamSettings({ teamName, setTeamName, teamColor, setTeamColor, formation, setFormation, onOpenTeamPicker }) {
  const colors = ["#16a34a","#2563eb","#dc2626","#d97706","#7c3aed","#db2777","#0891b2","#e5e7eb","#000000","#8B2500"];
  const categories = [...new Set(Object.values(FORMATIONS).map(f => f.category))];
  return (
    <div style={{ background: "#111827", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
      <button onClick={onOpenTeamPicker} style={{ width: "100%", padding: "10px 14px", background: "rgba(22,163,74,0.1)", border: "none", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#16a34a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
        🏟️ Carica squadra Serie A
      </button>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#4b5563", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Nome squadra</div>
        <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="La tua squadra..." maxLength={24}
          style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "7px 10px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" }}/>
      </div>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#4b5563", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Colore kit</div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {colors.map(c => (
            <div key={c} onClick={() => setTeamColor(c)} style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: c, cursor: "pointer", border: teamColor===c?"2.5px solid #fff":"2px solid rgba(255,255,255,0.15)", boxShadow: teamColor===c?`0 0 6px ${c}`:"none", transition: "all 0.15s" }}/>
          ))}
        </div>
      </div>
      <div style={{ padding: "10px 14px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#4b5563", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>Modulo</div>
        {categories.map(cat => (
          <div key={cat} style={{ marginBottom: 7 }}>
            <div style={{ fontSize: 9, color: "#374151", fontWeight: 700, letterSpacing: "0.8px", marginBottom: 4, textTransform: "uppercase" }}>{cat}</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {Object.entries(FORMATIONS).filter(([,f]) => f.category===cat).map(([key]) => (
                <button key={key} onClick={() => setFormation(key)} style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: "pointer", border: "1px solid", background: formation===key?teamColor:"transparent", borderColor: formation===key?teamColor:"rgba(255,255,255,0.12)", color: formation===key?(teamColor==="#e5e7eb"?"#000":"#fff"):"#9ca3af" }}>{key}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatSelector({ activeStats, setActiveStats }) {
  const toggle = (id) => setActiveStats(prev => prev.includes(id) ? prev.filter(s => s!==id) : [...prev, id]);
  return (
    <div style={{ background: "#111827", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", padding: "10px 14px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#4b5563", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>
        Info visibili <span style={{ fontSize: 8, color: "#374151", fontWeight: 400 }}>(multi-selezione)</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {STAT_VIEWS.map(sv => {
          const active = activeStats.includes(sv.id);
          return (
            <button key={sv.id} onClick={() => toggle(sv.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 7, border: `1px solid ${active?sv.color:"rgba(255,255,255,0.08)"}`, background: active?sv.color+"18":"transparent", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
              <span style={{ fontSize: 13 }}>{sv.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: active?sv.color:"#6b7280", flex: 1 }}>{sv.label}</span>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: active?sv.color:"transparent", border: `1.5px solid ${active?sv.color:"#374151"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#000" }}>{active?"✓":""}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SquadStats({ lineup }) {
  const filled = lineup.filter(Boolean);
  if (filled.length === 0) return null;
  const avg = key => { const v=filled.map(p=>p[key]).filter(x=>x!==undefined); return v.length?v.reduce((a,b)=>a+b,0)/v.length:0; };
  const sum = key => filled.reduce((a,p)=>a+(p[key]||0),0);
  const ageGroups = { "≤21":0,"22-25":0,"26-29":0,"30+":0 };
  filled.forEach(p => { if(p.age<=21)ageGroups["≤21"]++; else if(p.age<=25)ageGroups["22-25"]++; else if(p.age<=29)ageGroups["26-29"]++; else ageGroups["30+"]++; });
  return (
    <div style={{ background: "#111827", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#4b5563", letterSpacing: "1px", textTransform: "uppercase" }}>Statistiche rosa</div>
      </div>
      <div style={{ padding: "4px 0" }}>
        {[
          { label: "Giocatori", value: `${filled.length}/11` },
          { label: "Rating medio", value: avg("rating").toFixed(1), color: getRatingColor(avg("rating")) },
          { label: "Età media", value: `${avg("age").toFixed(1)} anni` },
          { label: "Valore totale", value: `€${sum("value")}M`, color: "#16a34a" },
          { label: "Stipendi/anno", value: `€${sum("wage").toLocaleString("it-IT")}K`, color: "#f59e0b" },
          { label: "Altezza media", value: `${avg("height").toFixed(0)} cm` },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize: 11, color: "#6b7280" }}>{s.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: s.color||"#f9fafb" }}>{s.value}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: "8px 14px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#4b5563", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 7 }}>Distribuzione età</div>
        {Object.entries(ageGroups).map(([label, count]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: "#6b7280", width: 36, flexShrink: 0 }}>{label}</span>
            <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${filled.length?(count/filled.length)*100:0}%`, height: "100%", background: label==="≤21"?"#3b82f6":label==="22-25"?"#16a34a":label==="26-29"?"#f59e0b":"#ef4444", borderRadius: 3 }}/>
            </div>
            <span style={{ fontSize: 10, color: "#9ca3af", width: 12, textAlign: "right" }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineupPanel({ lineup, formation, customNames, onRemovePlayer, activeStats }) {
  const positions = FORMATIONS[formation]?.positions || [];
  const shownStats = STAT_VIEWS.filter(s => activeStats.includes(s.id) && s.id !== "rating");
  return (
    <div style={{ background: "#111827", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700, color: "#fff" }}>
          Formazione ({lineup.filter(Boolean).length}/11)
        </span>
      </div>
      <div style={{ maxHeight: 420, overflowY: "auto" }}>
        {positions.map(pos => {
          const player = lineup[pos.slot];
          const roleColor = POSITION_COLORS[pos.role] || "#6b7280";
          const cname = customNames[pos.slot];
          return (
            <div key={pos.slot} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ width: 26, fontSize: 8, fontWeight: 700, color: roleColor, background: roleColor+"22", borderRadius: 3, textAlign: "center", padding: "2px 3px", flexShrink: 0 }}>{pos.role}</div>
              {player ? (
                <>
                  <Avatar player={player} size={26}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {cname || player.shortName}
                      {cname && <span style={{ fontSize: 9, color: "#4b5563", marginLeft: 4 }}>({player.shortName})</span>}
                    </div>
                    {shownStats.length > 0 && (
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {shownStats.map(sv => player[sv.id] !== undefined && (
                          <span key={sv.id} style={{ fontSize: 8, color: sv.color, fontWeight: 700 }}>{sv.icon} {sv.format(player[sv.id])}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {activeStats.includes("rating") && <div style={{ fontSize: 10, fontWeight: 800, color: getRatingColor(player.rating), flexShrink: 0 }}>{player.rating}</div>}
                  <button onClick={() => onRemovePlayer(pos.slot)} style={{ background: "none", border: "none", color: "#374151", cursor: "pointer", fontSize: 12, padding: 2 }}>✕</button>
                </>
              ) : (
                <div style={{ fontSize: 10, color: "#1f2937", fontStyle: "italic" }}>Slot libero</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompareHeader({ team1, team2, lineup1, lineup2 }) {
  const avg = (lu, key) => { const f=lu.filter(Boolean); return f.length?f.reduce((a,p)=>a+(p[key]||0),0)/f.length:0; };
  const sum = (lu, key) => lu.filter(Boolean).reduce((a,p)=>a+(p[key]||0),0);
  const metrics = [
    { label:"Rating medio", a:avg(lineup1,"rating").toFixed(1), b:avg(lineup2,"rating").toFixed(1), numA:avg(lineup1,"rating"), numB:avg(lineup2,"rating"), hib:true },
    { label:"Età media", a:avg(lineup1,"age").toFixed(1)+"a", b:avg(lineup2,"age").toFixed(1)+"a", numA:avg(lineup1,"age"), numB:avg(lineup2,"age"), hib:false },
    { label:"Valore", a:`€${sum(lineup1,"value")}M`, b:`€${sum(lineup2,"value")}M`, numA:sum(lineup1,"value"), numB:sum(lineup2,"value"), hib:true },
    { label:"Stipendi/a", a:`€${sum(lineup1,"wage").toLocaleString("it-IT")}K`, b:`€${sum(lineup2,"wage").toLocaleString("it-IT")}K`, numA:sum(lineup1,"wage"), numB:sum(lineup2,"wage"), hib:true },
  ];
  return (
    <div style={{ background: "#111827", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", padding: "12px 16px", marginBottom: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, fontWeight: 900, color: team1.color }}>{team1.name||"Squadra A"}</div>
          <div style={{ fontSize: 10, color: "#6b7280" }}>{lineup1.filter(Boolean).length}/11</div>
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 900, color: "#374151" }}>VS</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, fontWeight: 900, color: team2.color }}>{team2.name||"Squadra B"}</div>
          <div style={{ fontSize: 10, color: "#6b7280" }}>{lineup2.filter(Boolean).length}/11</div>
        </div>
      </div>
      {metrics.map(m => {
        const aWins = m.hib?m.numA>m.numB:m.numA<m.numB;
        const bWins = m.hib?m.numB>m.numA:m.numB<m.numA;
        return (
          <div key={m.label} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 6, alignItems: "center", marginBottom: 5 }}>
            <div style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: aWins?team1.color:"#9ca3af" }}>{m.a}</div>
            <div style={{ fontSize: 9, color: "#4b5563", textAlign: "center", minWidth: 70 }}>{m.label}</div>
            <div style={{ textAlign: "left", fontSize: 12, fontWeight: 700, color: bWins?team2.color:"#9ca3af" }}>{m.b}</div>
          </div>
        );
      })}
    </div>
  );
}

function Toast({ message, onDone }) {
  useEffect(() => { const t=setTimeout(onDone,2500); return ()=>clearTimeout(t); }, [onDone]);
  return <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#16a34a", color:"#fff", padding:"10px 20px", borderRadius:10, fontWeight:700, fontSize:14, zIndex:999 }}>{message}</div>;
}

export default function App() {
  const [mode, setMode] = useState("single");
  const [activeTeam, setActiveTeam] = useState(0);
  const [lineup1, setLineup1] = useState(Array(11).fill(null));
  const [formation1, setFormation1] = useState("4-3-3");
  const [teamName1, setTeamName1] = useState("Squadra A");
  const [teamColor1, setTeamColor1] = useState("#16a34a");
  const [customNames1, setCustomNames1] = useState({});
  const [lineup2, setLineup2] = useState(Array(11).fill(null));
  const [formation2, setFormation2] = useState("4-4-2");
  const [teamName2, setTeamName2] = useState("Squadra B");
  const [teamColor2, setTeamColor2] = useState("#2563eb");
  const [customNames2, setCustomNames2] = useState({});
  const [activeStats, setActiveStats] = useState(["rating"]);
  const [selectingSlot, setSelectingSlot] = useState(null);
  const [selectedSlotRole, setSelectedSlotRole] = useState(null);
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [toast, setToast] = useState(null);
  const [savedLineups, setSavedLineups] = useState([]);
  const [showSaved, setShowSaved] = useState(false);

  const currentLineup = activeTeam===0?lineup1:lineup2;
  const currentFormation = activeTeam===0?formation1:formation2;
  const currentCustomNames = activeTeam===0?customNames1:customNames2;

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const data = decodeLineup(hash);
      if (data) {
        const players = data.l.map(id => id ? PLAYERS.find(p => p.id===id)||null : null);
        setLineup1(players);
        if (data.f) setFormation1(data.f);
        if (data.n) setTeamName1(data.n);
        if (data.c) setTeamColor1(data.c);
        if (data.cn) setCustomNames1(data.cn);
      }
    }
    setSavedLineups(JSON.parse(localStorage.getItem(SAVED_KEY)||"[]"));
  }, []);

  const loadTeam = (teamData) => {
    const teamPlayers = PLAYERS.filter(p => p.club===teamData.name).sort((a,b)=>b.rating-a.rating);
    const positions = FORMATIONS[currentFormation]?.positions||[];
    const newLineup = Array(11).fill(null);
    const used = new Set();
    const byPos = {};
    teamPlayers.forEach(p => { if (!byPos[p.position]) byPos[p.position]=p; });
    positions.forEach(pos => {
      const c = byPos[pos.role];
      if (c && !used.has(c.id)) { newLineup[pos.slot]=c; used.add(c.id); }
    });
    const remaining = teamPlayers.filter(p => !used.has(p.id));
    newLineup.forEach((p,i) => { if (!p && remaining.length) { newLineup[i]=remaining.shift(); } });
    if (activeTeam===0) { setLineup1(newLineup); setTeamName1(teamData.name); setTeamColor1(teamData.color); setCustomNames1({}); }
    else { setLineup2(newLineup); setTeamName2(teamData.name); setTeamColor2(teamData.color); setCustomNames2({}); }
    setShowTeamPicker(false);
    setToast(`${teamData.name} caricata! ⚽`);
  };

  const handleSlotClick = (slot) => {
    const positions = FORMATIONS[currentFormation]?.positions||[];
    const posData = positions.find(p=>p.slot===slot);
    setSelectedSlotRole(posData?.role||null);
    setSelectingSlot({ slot, team: activeTeam });
  };

  const handlePlayerSelect = (player) => {
    if (selectingSlot===null) return;
    const {slot,team} = selectingSlot;
    (team===0?setLineup1:setLineup2)(prev => { const next=[...prev]; next[slot]=player; return next; });
    setSelectingSlot(null);
  };

  const handleSlotDrop = useCallback((slot, {player, fromSlot}) => {
    (activeTeam===0?setLineup1:setLineup2)(prev => {
      const next=[...prev];
      if (fromSlot!==undefined&&fromSlot!==null) { [next[fromSlot],next[slot]]=[next[slot],next[fromSlot]]; } else { next[slot]=player; }
      return next;
    });
  }, [activeTeam]);

  const handleNameEdit = useCallback((slot, name) => {
    (activeTeam===0?setCustomNames1:setCustomNames2)(prev => ({...prev,[slot]:name}));
  }, [activeTeam]);

  const handleRemovePlayer = (slot) => {
    (activeTeam===0?setLineup1:setLineup2)(prev => { const next=[...prev]; next[slot]=null; return next; });
  };

  const handleShare = () => {
    const code = encodeLineup(lineup1,formation1,teamName1,teamColor1,customNames1);
    const url = `${window.location.origin}${window.location.pathname}#${code}`;
    navigator.clipboard.writeText(url).then(()=>setToast("Link copiato! 🔗")).catch(()=>setToast("Errore copia"));
  };

  const handleSave = () => {
    const saved = JSON.parse(localStorage.getItem(SAVED_KEY)||"[]");
    const entry = { id:Date.now(), name:teamName1, formation:formation1, color:teamColor1, lineup:lineup1.map(p=>p?.id??null), customNames:customNames1, date:new Date().toLocaleDateString("it-IT") };
    const updated = [entry,...saved].slice(0,10);
    localStorage.setItem(SAVED_KEY,JSON.stringify(updated));
    setSavedLineups(updated);
    setToast("Formazione salvata! 💾");
  };

  const handleLoadSaved = (entry) => {
    const players = entry.lineup.map(id => id?PLAYERS.find(p=>p.id===id)||null:null);
    setLineup1(players); setFormation1(entry.formation); setTeamName1(entry.name);
    setTeamColor1(entry.color); setCustomNames1(entry.customNames||{}); setShowSaved(false);
    setToast("Formazione caricata! ✅");
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0a0e1a", color:"#fff", fontFamily:"'Inter',sans-serif" }}>
      <style>{`*{box-sizing:border-box;}body{margin:0;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px;}`}</style>
      <header style={{ background:"rgba(0,0,0,0.65)", backdropFilter:"blur(12px)", borderBottom:"1px solid rgba(255,255,255,0.08)", padding:"0 20px", height:54, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, background:"linear-gradient(135deg,#16a34a,#059669)", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>⚽</div>
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:900, lineHeight:1 }}>LINEUP BUILDER</div>
            <div style={{ fontSize:8, color:"#4b5563", letterSpacing:"1.5px", fontWeight:600 }}>UNIVERSO SPORTIVO</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <div style={{ display:"flex", background:"rgba(255,255,255,0.06)", borderRadius:7, border:"1px solid rgba(255,255,255,0.1)", overflow:"hidden" }}>
            {[{id:"single",label:"Builder"},{id:"compare",label:"Comparazione"}].map(m=>(
              <button key={m.id} onClick={()=>{setMode(m.id);setActiveTeam(0);}} style={{ padding:"5px 12px", border:"none", cursor:"pointer", fontSize:12, fontWeight:700, background:mode===m.id?"#16a34a":"transparent", color:mode===m.id?"#fff":"#9ca3af" }}>{m.label}</button>
            ))}
          </div>
          <button onClick={handleSave} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", color:"#fff", borderRadius:7, padding:"5px 10px", cursor:"pointer", fontSize:13 }}>💾</button>
          <button onClick={()=>setShowSaved(s=>!s)} style={{ background:showSaved?"#16a34a18":"rgba(255,255,255,0.07)", border:`1px solid ${showSaved?"#16a34a":"rgba(255,255,255,0.1)"}`, color:showSaved?"#16a34a":"#fff", borderRadius:7, padding:"5px 10px", cursor:"pointer", fontSize:12, fontWeight:600 }}>
            📁{savedLineups.length>0&&` (${savedLineups.length})`}
          </button>
          <button onClick={handleShare} style={{ background:"#16a34a", border:"none", color:"#fff", borderRadius:7, padding:"5px 12px", cursor:"pointer", fontSize:12, fontWeight:700 }}>🔗 Condividi</button>
        </div>
      </header>

      {showSaved && (
        <div style={{ background:"#0d1117", borderBottom:"1px solid rgba(255,255,255,0.07)", padding:"12px 20px" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, marginBottom:10, color:"#fff" }}>Formazzioni salvate</div>
          {savedLineups.length===0 ? <div style={{ color:"#4b5563", fontSize:12 }}>Nessuna formazione salvata</div>
          : <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {savedLineups.map(e=>(
                <div key={e.id} onClick={()=>handleLoadSaved(e)} style={{ background:"#111827", border:`1px solid ${e.color}44`, borderRadius:9, padding:"8px 12px", cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:9, height:9, borderRadius:"50%", background:e.color }}/>
                  <div><div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{e.name}</div><div style={{ fontSize:10, color:"#4b5563" }}>{e.formation} · {e.date}</div></div>
                </div>
              ))}
            </div>}
        </div>
      )}

      <main style={{ maxWidth:mode==="compare"?1320:1100, margin:"0 auto", padding:"16px 14px", display:"grid", gridTemplateColumns:mode==="compare"?"210px 1fr 1fr 210px":"210px 1fr 210px", gap:14, alignItems:"start" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <TeamSettings
            teamName={activeTeam===0?teamName1:teamName2} setTeamName={activeTeam===0?setTeamName1:setTeamName2}
            teamColor={activeTeam===0?teamColor1:teamColor2} setTeamColor={activeTeam===0?setTeamColor1:setTeamColor2}
            formation={currentFormation} setFormation={activeTeam===0?setFormation1:setFormation2}
            onOpenTeamPicker={()=>setShowTeamPicker(true)}
          />
          <StatSelector activeStats={activeStats} setActiveStats={setActiveStats}/>
          <div style={{ background:"#111827", borderRadius:10, border:"1px solid rgba(255,255,255,0.08)", padding:"10px 14px" }}>
            <button onClick={()=>{(activeTeam===0?setLineup1:setLineup2)(Array(11).fill(null));(activeTeam===0?setCustomNames1:setCustomNames2)({});}}
              style={{ width:"100%", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", color:"#f87171", borderRadius:7, padding:"7px", cursor:"pointer", fontSize:12, fontWeight:600 }}>
              🗑 Svuota formazione
            </button>
          </div>
        </div>

        <div>
          {mode==="compare" && <CompareHeader team1={{name:teamName1,color:teamColor1}} team2={{name:teamName2,color:teamColor2}} lineup1={lineup1} lineup2={lineup2}/>}
          {mode==="compare" && (
            <div style={{ display:"flex", gap:6, marginBottom:10 }}>
              {[{i:0,n:teamName1,c:teamColor1},{i:1,n:teamName2,c:teamColor2}].map(t=>(
                <button key={t.i} onClick={()=>setActiveTeam(t.i)} style={{ flex:1, padding:"6px 10px", borderRadius:7, border:`2px solid ${t.c}`, background:activeTeam===t.i?t.c+"22":"transparent", color:activeTeam===t.i?t.c:"#4b5563", cursor:"pointer", fontWeight:700, fontSize:11 }}>{t.n||`Squadra ${t.i+1}`}</button>
              ))}
            </div>
          )}
          <Pitch lineup={lineup1} formation={formation1} customNames={customNames1}
            onSlotDrop={(slot,data)=>{setActiveTeam(0);handleSlotDrop(slot,data);}}
            onSlotClick={(slot)=>{setActiveTeam(0);handleSlotClick(slot);}}
            onNameEdit={(slot,name)=>{setActiveTeam(0);handleNameEdit(slot,name);}}
            teamName={teamName1} teamColor={teamColor1} activeStats={activeStats}/>
        </div>

        {mode==="compare" && (
          <Pitch lineup={lineup2} formation={formation2} customNames={customNames2}
            onSlotDrop={(slot,data)=>{setActiveTeam(1);handleSlotDrop(slot,data);}}
            onSlotClick={(slot)=>{setActiveTeam(1);handleSlotClick(slot);}}
            onNameEdit={(slot,name)=>{setActiveTeam(1);handleNameEdit(slot,name);}}
            teamName={teamName2} teamColor={teamColor2} activeStats={activeStats}/>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <LineupPanel lineup={currentLineup} formation={currentFormation} customNames={currentCustomNames} onRemovePlayer={handleRemovePlayer} activeStats={activeStats}/>
          <SquadStats lineup={currentLineup}/>
        </div>
      </main>

      {showTeamPicker && <TeamPicker onSelect={loadTeam} onClose={()=>setShowTeamPicker(false)}/>}
      {selectingSlot!==null && <PlayerSearch onSelectPlayer={handlePlayerSelect} onClose={()=>setSelectingSlot(null)} selectedSlotRole={selectedSlotRole} currentLineup={currentLineup}/>}
      {toast && <Toast message={toast} onDone={()=>setToast(null)}/>}
    </div>
  );
}

