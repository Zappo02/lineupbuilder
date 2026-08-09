import React, { useState, useRef, useEffect, useCallback } from "react";
import { PLAYERS, FORMATIONS, POSITION_COLORS, NATION_FLAGS, STAT_VIEWS } from "./data/players.js";

// ─── UTILITY ─────────────────────────────────────────────────────────────────

const encodeLineup = (lineup, formation, teamName, color) => {
  const data = { f: formation, n: teamName, c: color, l: lineup.map(s => s?.id ?? null) };
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(data)))); } catch { return ""; }
};

const decodeLineup = (str) => {
  try { return JSON.parse(decodeURIComponent(escape(atob(str)))); } catch { return null; }
};

const getInitials = (name) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

const getRatingColor = (r) =>
  r >= 90 ? "#ffd700" : r >= 85 ? "#e5e7eb" : r >= 80 ? "#cd7f32" : "#6b7280";

const formatVal = (statId, value) => {
  const s = STAT_VIEWS.find(s => s.id === statId);
  return s ? s.format(value) : value;
};

const SAVED_KEY = "lineup_builder_saved_v2";

// ─── AVATAR ──────────────────────────────────────────────────────────────────

function Avatar({ player, size = 40, showRating = false }) {
  const [err, setErr] = useState(false);
  const color = POSITION_COLORS[player.position] || "#6b7280";
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {!err ? (
        <img src={player.photo || ""} alt={player.shortName}
          onError={() => setErr(true)}
          style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `2px solid ${color}` }} />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: "50%", backgroundColor: color + "22",
          border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size * 0.32, fontWeight: 700, color, fontFamily: "'Barlow Condensed', sans-serif",
        }}>{getInitials(player.name)}</div>
      )}
      {showRating && (
        <div style={{
          position: "absolute", bottom: -3, right: -3, background: getRatingColor(player.rating),
          color: "#000", fontSize: 9, fontWeight: 800, borderRadius: 3,
          padding: "0 3px", lineHeight: "14px", minWidth: 14, textAlign: "center"
        }}>{player.rating}</div>
      )}
    </div>
  );
}

// ─── STAT BADGE ON PITCH ─────────────────────────────────────────────────────

function StatBadge({ player, statId, maxVal }) {
  const stat = STAT_VIEWS.find(s => s.id === statId);
  if (!stat || !player) return null;
  const val = player[statId];
  if (val === undefined) return null;
  const pct = maxVal > 0 ? Math.min(val / maxVal, 1) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginTop: 2 }}>
      {/* Mini bar */}
      <div style={{ width: 44, height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct * 100}%`, height: "100%", background: stat.color, borderRadius: 2 }} />
      </div>
      <div style={{
        background: `${stat.color}22`, border: `1px solid ${stat.color}66`,
        borderRadius: 4, padding: "1px 6px", fontSize: 9, fontWeight: 800, color: stat.color,
        whiteSpace: "nowrap",
      }}>
        {stat.format(val)}
      </div>
    </div>
  );
}

// ─── PITCH SLOT ──────────────────────────────────────────────────────────────

function PitchSlot({ slot, posData, player, onDrop, onClick, teamColor, statView, maxStatVal }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const color = POSITION_COLORS[posData.role] || "#6b7280";
  const borderColor = teamColor || color;

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      onDrop(slot, data);
    } catch {}
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => onClick(slot)}
      style={{
        position: "absolute", left: `${posData.x}%`, top: `${posData.y}%`,
        transform: "translate(-50%, -50%)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
        cursor: "pointer", zIndex: 10,
        filter: isDragOver ? "brightness(1.4)" : "none",
        transition: "filter 0.15s",
      }}
    >
      {player ? (
        <>
          <div
            draggable
            onDragStart={e => e.dataTransfer.setData("application/json", JSON.stringify({ player, fromSlot: slot }))}
            style={{
              position: "relative",
              transform: isDragOver ? "scale(1.2)" : "scale(1)",
              transition: "transform 0.15s",
            }}
          >
            {!imgErr ? (
              <img src={player.photo || ""} alt={player.shortName} onError={() => setImgErr(true)}
                style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover",
                  border: `3px solid ${borderColor}`, boxShadow: `0 0 10px ${borderColor}66` }} />
            ) : (
              <div style={{
                width: 46, height: 46, borderRadius: "50%", backgroundColor: color + "22",
                border: `3px solid ${borderColor}`, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 13, fontWeight: 800, color,
                fontFamily: "'Barlow Condensed', sans-serif", boxShadow: `0 0 10px ${borderColor}55`,
              }}>{getInitials(player.name)}</div>
            )}
            {statView === "rating" && (
              <div style={{
                position: "absolute", top: -4, right: -4,
                background: getRatingColor(player.rating), color: "#000",
                fontSize: 8, fontWeight: 800, borderRadius: 3,
                padding: "0 2px", lineHeight: "13px", minWidth: 13, textAlign: "center"
              }}>{player.rating}</div>
            )}
          </div>

          <div style={{
            background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)",
            borderRadius: 5, padding: "1px 6px", maxWidth: 78, textAlign: "center",
          }}>
            <div style={{ fontSize: 8, color: "#9ca3af", fontWeight: 700, letterSpacing: "0.5px" }}>{posData.role}</div>
            <div style={{ fontSize: 10, color: "#fff", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {player.shortName}
            </div>
          </div>

          {statView !== "rating" && (
            <StatBadge player={player} statId={statView} maxVal={maxStatVal} />
          )}
        </>
      ) : (
        <>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            border: `2px dashed ${color}`,
            backgroundColor: isDragOver ? color + "33" : color + "11",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: color + "bb",
            transform: isDragOver ? "scale(1.15)" : "scale(1)", transition: "all 0.15s",
          }}>+</div>
          <div style={{
            background: "rgba(0,0,0,0.7)", borderRadius: 4, padding: "1px 6px",
            fontSize: 9, color, fontWeight: 700, letterSpacing: "0.5px"
          }}>{posData.role}</div>
        </>
      )}
    </div>
  );
}

// ─── PITCH ───────────────────────────────────────────────────────────────────

function Pitch({ lineup, formation, onSlotDrop, onSlotClick, teamName, teamColor, statView }) {
  const positions = FORMATIONS[formation]?.positions || [];
  const maxStatVal = Math.max(...lineup.filter(Boolean).map(p => p[statView] ?? 0), 1);

  return (
    <div style={{ position: "relative", width: "100%", paddingBottom: "148%", userSelect: "none" }}>
      <svg viewBox="0 0 300 445" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gfield" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a4d2e"/>
            <stop offset="100%" stopColor="#1d5c35"/>
          </linearGradient>
        </defs>
        <rect width="300" height="445" fill="url(#gfield)" rx="8"/>
        {[0,1,2,3,4,5,6,7].map(i => (
          <rect key={i} x="0" y={i*56} width="300" height="28" fill={i%2===0?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.02)"}/>
        ))}
        <g fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="1.4">
          <rect x="10" y="10" width="280" height="425" rx="2"/>
          <line x1="10" y1="222" x2="290" y2="222"/>
          <circle cx="150" cy="222" r="36"/>
          <circle cx="150" cy="222" r="2.5" fill="rgba(255,255,255,0.32)" stroke="none"/>
          <rect x="56" y="348" width="188" height="78"/>
          <rect x="100" y="386" width="100" height="40"/>
          <rect x="126" y="427" width="48" height="8"/>
          <rect x="56" y="19" width="188" height="78"/>
          <rect x="100" y="19" width="100" height="40"/>
          <rect x="126" y="10" width="48" height="9"/>
          <path d="M 100 118 A 36 36 0 0 0 200 118"/>
          <path d="M 100 326 A 36 36 0 0 1 200 326"/>
          <circle cx="150" cy="374" r="2" fill="rgba(255,255,255,0.32)" stroke="none"/>
          <circle cx="150" cy="70" r="2" fill="rgba(255,255,255,0.32)" stroke="none"/>
        </g>
        {teamName && (
          <text x="150" y="223" textAnchor="middle" dominantBaseline="middle"
            fill="rgba(255,255,255,0.04)" fontSize="20"
            fontFamily="'Barlow Condensed',sans-serif" fontWeight="900" letterSpacing="3">
            {teamName.toUpperCase()}
          </text>
        )}
      </svg>

      {positions.map(posData => (
        <PitchSlot
          key={posData.slot}
          slot={posData.slot}
          posData={posData}
          player={lineup[posData.slot] || null}
          onDrop={onSlotDrop}
          onClick={onSlotClick}
          teamColor={teamColor}
          statView={statView}
          maxStatVal={maxStatVal}
        />
      ))}
    </div>
  );
}

// ─── PLAYER SEARCH ───────────────────────────────────────────────────────────

function PlayerSearch({ onSelectPlayer, onClose, selectedSlotRole, currentLineup }) {
  const [query, setQuery] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");
  const inputRef = useRef();
  useEffect(() => { inputRef.current?.focus(); }, []);

  const posMap = { DEF: ["CB","RB","LB"], MID: ["DM","CM","AM","RM","LM"], ATT: ["ST","RW","LW"] };
  const usedIds = new Set(currentLineup.filter(Boolean).map(p => p.id));

  const filtered = PLAYERS.filter(p => {
    const q = query.toLowerCase();
    const matchQ = !query || p.name.toLowerCase().includes(q) || p.club.toLowerCase().includes(q);
    const matchP = posFilter === "ALL" || (posFilter === "GK" && p.position === "GK") ||
      (posMap[posFilter] && posMap[posFilter].includes(p.position));
    return matchQ && matchP;
  }).sort((a, b) => b.rating - a.rating);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#111827", borderRadius: 16, width: "100%", maxWidth: 500,
        maxHeight: "88vh", display: "flex", flexDirection: "column",
        border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 30px 70px rgba(0,0,0,0.9)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 700, color: "#fff" }}>
              Scegli giocatore
              {selectedSlotRole && (
                <span style={{ marginLeft: 8, fontSize: 12, color: POSITION_COLORS[selectedSlotRole] || "#6b7280",
                  background: (POSITION_COLORS[selectedSlotRole] || "#6b7280") + "22",
                  padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                  {selectedSlotRole}
                </span>
              )}
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 20 }}>✕</button>
          </div>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Cerca per nome o club..."
            style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8, padding: "9px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {["ALL","GK","DEF","MID","ATT"].map(pg => (
              <button key={pg} onClick={() => setPosFilter(pg)} style={{
                padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "1px solid",
                background: posFilter === pg ? "#16a34a" : "transparent",
                borderColor: posFilter === pg ? "#16a34a" : "rgba(255,255,255,0.15)",
                color: posFilter === pg ? "#fff" : "#9ca3af",
              }}>{pg}</button>
            ))}
          </div>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "6px 0" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#6b7280", fontSize: 14 }}>Nessun giocatore trovato</div>
          ) : filtered.map(player => {
            const isUsed = usedIds.has(player.id);
            return (
              <div key={player.id} onClick={() => !isUsed && onSelectPlayer(player)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 20px",
                  cursor: isUsed ? "default" : "pointer", opacity: isUsed ? 0.4 : 1,
                  borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                onMouseEnter={e => { if (!isUsed) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                <Avatar player={player} size={42} showRating />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                    {player.name} <span style={{ fontSize: 13 }}>{NATION_FLAGS[player.nation] || ""}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{player.club} · {player.age} anni</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>€{player.value}M</div>
                  <div style={{ fontSize: 10, color: POSITION_COLORS[player.position] || "#6b7280",
                    background: (POSITION_COLORS[player.position] || "#6b7280") + "22",
                    padding: "1px 6px", borderRadius: 4, fontWeight: 700, marginTop: 2 }}>{player.position}</div>
                </div>
                {isUsed && <div style={{ fontSize: 11, color: "#6b7280" }}>In uso</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── TEAM SETTINGS ───────────────────────────────────────────────────────────

function TeamSettings({ teamName, setTeamName, teamColor, setTeamColor, formation, setFormation }) {
  const colors = ["#16a34a","#2563eb","#dc2626","#d97706","#7c3aed","#db2777","#0891b2","#e5e7eb"];
  const categories = [...new Set(Object.values(FORMATIONS).map(f => f.category))];

  return (
    <div style={{ background: "#111827", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#4b5563", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Nome squadra</div>
        <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="La tua squadra..." maxLength={20}
          style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 7, padding: "7px 10px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
      </div>

      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#4b5563", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Colore kit</div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {colors.map(c => (
            <div key={c} onClick={() => setTeamColor(c)} style={{
              width: 22, height: 22, borderRadius: "50%", backgroundColor: c, cursor: "pointer",
              border: teamColor === c ? "2.5px solid #fff" : "2px solid transparent",
              boxShadow: teamColor === c ? `0 0 6px ${c}` : "none", transition: "all 0.15s",
            }}/>
          ))}
        </div>
      </div>

      <div style={{ padding: "10px 14px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#4b5563", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Modulo</div>
        {categories.map(cat => (
          <div key={cat} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, color: "#374151", fontWeight: 700, letterSpacing: "0.8px", marginBottom: 4, textTransform: "uppercase" }}>{cat}</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {Object.entries(FORMATIONS).filter(([, f]) => f.category === cat).map(([key]) => (
                <button key={key} onClick={() => setFormation(key)} style={{
                  padding: "4px 9px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "1px solid",
                  background: formation === key ? teamColor : "transparent",
                  borderColor: formation === key ? teamColor : "rgba(255,255,255,0.12)",
                  color: formation === key ? "#000" : "#9ca3af", transition: "all 0.15s",
                }}>{key}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── STAT VIEW SELECTOR ──────────────────────────────────────────────────────

function StatViewSelector({ statView, setStatView }) {
  return (
    <div style={{ background: "#111827", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", padding: "10px 14px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#4b5563", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>
        Visualizza sul campo
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {STAT_VIEWS.map(sv => (
          <button key={sv.id} onClick={() => setStatView(sv.id)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7,
            border: `1px solid ${statView === sv.id ? sv.color : "rgba(255,255,255,0.08)"}`,
            background: statView === sv.id ? sv.color + "18" : "transparent",
            cursor: "pointer", textAlign: "left", transition: "all 0.15s",
          }}>
            <span style={{ fontSize: 14 }}>{sv.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: statView === sv.id ? sv.color : "#6b7280" }}>{sv.label}</span>
            {statView === sv.id && <span style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: sv.color }} />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── SQUAD STATS PANEL ───────────────────────────────────────────────────────

function SquadStats({ lineup, statView }) {
  const filled = lineup.filter(Boolean);
  if (filled.length === 0) return null;

  const avg = key => {
    const vals = filled.map(p => p[key]).filter(v => v !== undefined);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  };
  const sum = key => filled.reduce((a, p) => a + (p[key] || 0), 0);
  const max = (key) => Math.max(...filled.map(p => p[key] || 0));
  const min = (key) => Math.min(...filled.map(p => p[key] || 0));

  const currentStat = STAT_VIEWS.find(s => s.id === statView);

  const stats = [
    { label: "Giocatori", value: `${filled.length}/11` },
    { label: "Rating medio", value: avg("rating").toFixed(1), color: getRatingColor(avg("rating")) },
    { label: "Età media", value: `${avg("age").toFixed(1)} anni` },
    { label: "Valore totale", value: `€${sum("value")}M`, color: "#16a34a" },
    { label: "Stipendi/sett", value: `€${sum("wage")}K`, color: "#f59e0b" },
    { label: "Altezza media", value: `${avg("height").toFixed(0)} cm` },
  ];

  if (currentStat && statView !== "rating") {
    stats.push({ label: `${currentStat.label} (max)`, value: currentStat.format(max(statView)), color: currentStat.color });
    stats.push({ label: `${currentStat.label} (min)`, value: currentStat.format(min(statView)), color: currentStat.color + "99" });
  }

  // Distribuzione per età
  const ageGroups = { "≤21": 0, "22-25": 0, "26-29": 0, "30+": 0 };
  filled.forEach(p => {
    if (p.age <= 21) ageGroups["≤21"]++;
    else if (p.age <= 25) ageGroups["22-25"]++;
    else if (p.age <= 29) ageGroups["26-29"]++;
    else ageGroups["30+"]++;
  });

  return (
    <div style={{ background: "#111827", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#4b5563", letterSpacing: "1px", textTransform: "uppercase" }}>
          Statistiche rosa
        </div>
      </div>
      <div style={{ padding: "6px 0" }}>
        {stats.map(s => (
          <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "5px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize: 11, color: "#6b7280" }}>{s.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: s.color || "#f9fafb" }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Distribuzione età */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#4b5563", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 8 }}>
          Distribuzione età
        </div>
        {Object.entries(ageGroups).map(([label, count]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: "#6b7280", width: 36, flexShrink: 0 }}>{label}</span>
            <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${(count / filled.length) * 100}%`, height: "100%",
                background: label === "≤21" ? "#3b82f6" : label === "22-25" ? "#16a34a" : label === "26-29" ? "#f59e0b" : "#ef4444",
                borderRadius: 3, transition: "width 0.4s ease" }}/>
            </div>
            <span style={{ fontSize: 10, color: "#9ca3af", width: 12, textAlign: "right" }}>{count}</span>
          </div>
        ))}
      </div>

      {/* Distribuzione nazionalità */}
      {filled.length > 0 && (() => {
        const nations = {};
        filled.forEach(p => { nations[p.nation] = (nations[p.nation] || 0) + 1; });
        const sorted = Object.entries(nations).sort((a, b) => b[1] - a[1]).slice(0, 4);
        return (
          <div style={{ padding: "8px 14px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#4b5563", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 8 }}>
              Nazionalità
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {sorted.map(([nat, cnt]) => (
                <div key={nat} style={{
                  background: "rgba(255,255,255,0.06)", borderRadius: 6,
                  padding: "3px 8px", fontSize: 11, color: "#d1d5db",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <span>{NATION_FLAGS[nat] || nat}</span>
                  <span style={{ fontWeight: 700 }}>{cnt}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── LINEUP LIST PANEL ───────────────────────────────────────────────────────

function LineupPanel({ lineup, formation, onRemovePlayer, statView }) {
  const positions = FORMATIONS[formation]?.positions || [];
  const stat = STAT_VIEWS.find(s => s.id === statView);

  return (
    <div style={{ background: "#111827", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700, color: "#fff" }}>
          Formazione ({lineup.filter(Boolean).length}/11)
        </span>
        {stat && (
          <span style={{ fontSize: 10, color: stat.color, fontWeight: 700, background: stat.color + "18",
            padding: "2px 7px", borderRadius: 4 }}>{stat.icon} {stat.label}</span>
        )}
      </div>
      <div style={{ maxHeight: 440, overflowY: "auto" }}>
        {positions.map(pos => {
          const player = lineup[pos.slot];
          const roleColor = POSITION_COLORS[pos.role] || "#6b7280";
          return (
            <div key={pos.slot} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ width: 28, fontSize: 8, fontWeight: 700, color: roleColor,
                background: roleColor + "22", borderRadius: 3, textAlign: "center", padding: "2px 3px", flexShrink: 0 }}>
                {pos.role}
              </div>
              {player ? (
                <>
                  <Avatar player={player} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {player.shortName}
                    </div>
                    <div style={{ fontSize: 9, color: "#6b7280" }}>{player.club}</div>
                  </div>
                  {stat && player[statView] !== undefined && (
                    <div style={{ fontSize: 10, fontWeight: 800, color: stat.color, flexShrink: 0 }}>
                      {stat.format(player[statView])}
                    </div>
                  )}
                  <button onClick={() => onRemovePlayer(pos.slot)}
                    style={{ background: "none", border: "none", color: "#374151", cursor: "pointer", fontSize: 12, padding: 2 }}>✕</button>
                </>
              ) : (
                <div style={{ fontSize: 11, color: "#1f2937", fontStyle: "italic" }}>Slot libero</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TOAST ───────────────────────────────────────────────────────────────────

function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: "#16a34a", color: "#fff", padding: "10px 20px", borderRadius: 10,
      fontWeight: 700, fontSize: 14, zIndex: 999, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
      {message}
    </div>
  );
}

// ─── COMPARE HEADER ──────────────────────────────────────────────────────────

function CompareHeader({ team1, team2, lineup1, lineup2 }) {
  const avg = (lu, key) => {
    const f = lu.filter(Boolean);
    if (!f.length) return 0;
    return f.reduce((a, p) => a + (p[key] || 0), 0) / f.length;
  };
  const sum = (lu, key) => lu.filter(Boolean).reduce((a, p) => a + (p[key] || 0), 0);

  const metrics = [
    { label: "Rating medio", a: avg(lineup1, "rating").toFixed(1), b: avg(lineup2, "rating").toFixed(1), higherIsBetter: true },
    { label: "Età media", a: avg(lineup1, "age").toFixed(1), b: avg(lineup2, "age").toFixed(1), higherIsBetter: false },
    { label: "Valore totale", a: `€${sum(lineup1,"value")}M`, b: `€${sum(lineup2,"value")}M`, higherIsBetter: true, numA: sum(lineup1,"value"), numB: sum(lineup2,"value") },
    { label: "Stipendi/sett", a: `€${sum(lineup1,"wage")}K`, b: `€${sum(lineup2,"wage")}K`, higherIsBetter: true, numA: sum(lineup1,"wage"), numB: sum(lineup2,"wage") },
  ];

  return (
    <div style={{ background: "#111827", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", padding: "12px 16px", marginBottom: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 900, color: team1.color }}>
            {team1.name || "Squadra A"}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>{lineup1.filter(Boolean).length}/11</div>
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 900, color: "#374151" }}>VS</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 900, color: team2.color }}>
            {team2.name || "Squadra B"}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>{lineup2.filter(Boolean).length}/11</div>
        </div>
      </div>
      {metrics.map(m => {
        const numA = m.numA !== undefined ? m.numA : parseFloat(m.a);
        const numB = m.numB !== undefined ? m.numB : parseFloat(m.b);
        const aWins = m.higherIsBetter ? numA > numB : numA < numB;
        const bWins = m.higherIsBetter ? numB > numA : numB < numA;
        return (
          <div key={m.label} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 6, alignItems: "center", marginBottom: 6 }}>
            <div style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: aWins ? team1.color : "#9ca3af" }}>{m.a}</div>
            <div style={{ fontSize: 10, color: "#4b5563", textAlign: "center", minWidth: 80 }}>{m.label}</div>
            <div style={{ textAlign: "left", fontSize: 12, fontWeight: 700, color: bWins ? team2.color : "#9ca3af" }}>{m.b}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [mode, setMode] = useState("single");
  const [activeTeam, setActiveTeam] = useState(0);

  const [lineup1, setLineup1] = useState(Array(11).fill(null));
  const [formation1, setFormation1] = useState("4-3-3");
  const [teamName1, setTeamName1] = useState("Squadra A");
  const [teamColor1, setTeamColor1] = useState("#16a34a");

  const [lineup2, setLineup2] = useState(Array(11).fill(null));
  const [formation2, setFormation2] = useState("4-4-2");
  const [teamName2, setTeamName2] = useState("Squadra B");
  const [teamColor2, setTeamColor2] = useState("#2563eb");

  const [statView, setStatView] = useState("rating");
  const [selectingSlot, setSelectingSlot] = useState(null);
  const [selectedSlotRole, setSelectedSlotRole] = useState(null);
  const [toast, setToast] = useState(null);
  const [savedLineups, setSavedLineups] = useState([]);
  const [showSaved, setShowSaved] = useState(false);

  const currentLineup = activeTeam === 0 ? lineup1 : lineup2;
  const currentFormation = activeTeam === 0 ? formation1 : formation2;

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const data = decodeLineup(hash);
      if (data) {
        const players = data.l.map(id => id ? PLAYERS.find(p => p.id === id) || null : null);
        setLineup1(players);
        if (data.f) setFormation1(data.f);
        if (data.n) setTeamName1(data.n);
        if (data.c) setTeamColor1(data.c);
      }
    }
    setSavedLineups(JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"));
  }, []);

  const handleSlotClick = (slot) => {
    const positions = FORMATIONS[currentFormation]?.positions || [];
    const posData = positions.find(p => p.slot === slot);
    setSelectedSlotRole(posData?.role || null);
    setSelectingSlot({ slot, team: activeTeam });
  };

  const handlePlayerSelect = (player) => {
    if (selectingSlot === null) return;
    const { slot, team } = selectingSlot;
    const setter = team === 0 ? setLineup1 : setLineup2;
    setter(prev => { const next = [...prev]; next[slot] = player; return next; });
    setSelectingSlot(null);
  };

  const handleSlotDrop = useCallback((slot, { player, fromSlot }) => {
    const team = activeTeam;
    const setter = team === 0 ? setLineup1 : setLineup2;
    setter(prev => {
      const next = [...prev];
      if (fromSlot !== undefined && fromSlot !== null) {
        [next[fromSlot], next[slot]] = [next[slot], next[fromSlot]];
      } else {
        next[slot] = player;
      }
      return next;
    });
  }, [activeTeam]);

  const handleRemovePlayer = (slot) => {
    const setter = activeTeam === 0 ? setLineup1 : setLineup2;
    setter(prev => { const next = [...prev]; next[slot] = null; return next; });
  };

  const handleShare = () => {
    const code = encodeLineup(lineup1, formation1, teamName1, teamColor1);
    const url = `${window.location.origin}${window.location.pathname}#${code}`;
    navigator.clipboard.writeText(url).then(() => setToast("Link copiato negli appunti! 🔗")).catch(() => setToast("Copia: " + url));
  };

  const handleSave = () => {
    const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
    const entry = {
      id: Date.now(), name: teamName1, formation: formation1, color: teamColor1,
      lineup: lineup1.map(p => p?.id ?? null), date: new Date().toLocaleDateString("it-IT"),
    };
    const updated = [entry, ...saved].slice(0, 10);
    localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
    setSavedLineups(updated);
    setToast("Formazione salvata! 💾");
  };

  const handleLoadSaved = (entry) => {
    const players = entry.lineup.map(id => id ? PLAYERS.find(p => p.id === id) || null : null);
    setLineup1(players);
    setFormation1(entry.formation);
    setTeamName1(entry.name);
    setTeamColor1(entry.color);
    setShowSaved(false);
    setToast("Formazione caricata! ✅");
  };

  const handleClear = () => {
    const setter = activeTeam === 0 ? setLineup1 : setLineup2;
    setter(Array(11).fill(null));
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", color: "#fff", fontFamily: "'Inter',sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      {/* HEADER */}
      <header style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 20px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, background: "linear-gradient(135deg,#16a34a,#059669)",
            borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>⚽</div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, fontWeight: 900, letterSpacing: "0.5px", lineHeight: 1 }}>LINEUP BUILDER</div>
            <div style={{ fontSize: 8, color: "#4b5563", letterSpacing: "1.5px", fontWeight: 600 }}>UNIVERSO SPORTIVO</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 7,
            border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>
            {[{ id: "single", label: "Builder" }, { id: "compare", label: "Comparazione" }].map(m => (
              <button key={m.id} onClick={() => { setMode(m.id); setActiveTeam(0); }} style={{
                padding: "5px 12px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                background: mode === m.id ? "#16a34a" : "transparent",
                color: mode === m.id ? "#fff" : "#9ca3af",
              }}>{m.label}</button>
            ))}
          </div>
          <button onClick={handleSave} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 13 }}>💾</button>
          <button onClick={() => setShowSaved(s => !s)} style={{
            background: showSaved ? "#16a34a18" : "rgba(255,255,255,0.07)",
            border: `1px solid ${showSaved ? "#16a34a" : "rgba(255,255,255,0.1)"}`,
            color: showSaved ? "#16a34a" : "#fff", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600,
          }}>📁 {savedLineups.length > 0 && savedLineups.length}</button>
          <button onClick={handleShare} style={{ background: "#16a34a", border: "none",
            color: "#fff", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>🔗 Condividi</button>
        </div>
      </header>

      {/* SAVED DRAWER */}
      {showSaved && (
        <div style={{ background: "#0d1117", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "12px 20px" }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 10, color: "#fff" }}>
            Formazzioni salvate
          </div>
          {savedLineups.length === 0
            ? <div style={{ color: "#4b5563", fontSize: 12 }}>Nessuna formazione salvata</div>
            : <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {savedLineups.map(e => (
                  <div key={e.id} onClick={() => handleLoadSaved(e)}
                    style={{ background: "#111827", border: `1px solid ${e.color}44`, borderRadius: 9,
                      padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                    onMouseEnter={el => el.currentTarget.style.borderColor = e.color}
                    onMouseLeave={el => el.currentTarget.style.borderColor = e.color + "44"}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: e.color }}/>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{e.name}</div>
                      <div style={{ fontSize: 10, color: "#4b5563" }}>{e.formation} · {e.date}</div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* MAIN */}
      <main style={{ maxWidth: mode === "compare" ? 1300 : 1080, margin: "0 auto", padding: "18px 16px",
        display: "grid",
        gridTemplateColumns: mode === "compare" ? "220px 1fr 1fr 220px" : "220px 1fr 220px",
        gap: 16, alignItems: "start" }}>

        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <TeamSettings
            teamName={activeTeam === 0 ? teamName1 : teamName2}
            setTeamName={activeTeam === 0 ? setTeamName1 : setTeamName2}
            teamColor={activeTeam === 0 ? teamColor1 : teamColor2}
            setTeamColor={activeTeam === 0 ? setTeamColor1 : setTeamColor2}
            formation={currentFormation}
            setFormation={activeTeam === 0 ? setFormation1 : setFormation2}
          />
          <StatViewSelector statView={statView} setStatView={setStatView} />
          <div style={{ background: "#111827", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", padding: "10px 14px" }}>
            <button onClick={handleClear} style={{ width: "100%", background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", borderRadius: 7, padding: "7px",
              cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🗑 Svuota formazione</button>
          </div>
        </div>

        {/* PITCH 1 */}
        <div>
          {mode === "compare" && (
            <CompareHeader
              team1={{ name: teamName1, color: teamColor1 }}
              team2={{ name: teamName2, color: teamColor2 }}
              lineup1={lineup1} lineup2={lineup2}
            />
          )}
          {mode === "compare" && (
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {[{ i: 0, n: teamName1, c: teamColor1 }, { i: 1, n: teamName2, c: teamColor2 }].map(t => (
                <button key={t.i} onClick={() => setActiveTeam(t.i)} style={{
                  flex: 1, padding: "7px 10px", borderRadius: 7, border: `2px solid ${t.c}`,
                  background: activeTeam === t.i ? t.c + "22" : "transparent",
                  color: activeTeam === t.i ? t.c : "#4b5563",
                  cursor: "pointer", fontWeight: 700, fontSize: 12,
                }}>{t.n || `Squadra ${t.i + 1}`}</button>
              ))}
            </div>
          )}
          <Pitch
            lineup={lineup1} formation={formation1}
            onSlotDrop={(slot, data) => { setActiveTeam(0); handleSlotDrop(slot, data); }}
            onSlotClick={(slot) => { setActiveTeam(0); handleSlotClick(slot); }}
            teamName={teamName1} teamColor={teamColor1} statView={statView}
          />
        </div>

        {/* PITCH 2 (compare) */}
        {mode === "compare" && (
          <Pitch
            lineup={lineup2} formation={formation2}
            onSlotDrop={(slot, data) => { setActiveTeam(1); handleSlotDrop(slot, data); }}
            onSlotClick={(slot) => { setActiveTeam(1); handleSlotClick(slot); }}
            teamName={teamName2} teamColor={teamColor2} statView={statView}
          />
        )}

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <LineupPanel lineup={currentLineup} formation={currentFormation}
            onRemovePlayer={handleRemovePlayer} statView={statView} />
          <SquadStats lineup={currentLineup} statView={statView} />
        </div>
      </main>

      {selectingSlot !== null && (
        <PlayerSearch
          onSelectPlayer={handlePlayerSelect}
          onClose={() => setSelectingSlot(null)}
          selectedSlotRole={selectedSlotRole}
          currentLineup={currentLineup}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
