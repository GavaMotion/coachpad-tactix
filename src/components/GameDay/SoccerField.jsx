import FieldSlot from './FieldSlot'

/**
 * Top-down SVG soccer field with formation slots overlaid.
 * The SVG viewBox is 100×154 (roughly 68m×105m proportions).
 */
function FieldSVG() {
  return (
    <svg
      viewBox="0 0 100 154"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      preserveAspectRatio="none"
    >
      {/* Pitch surface */}
      <rect width="100" height="154" fill="#1e6b35" />

      {/* Alternating mow stripes */}
      <rect x="0" y="3"   width="100" height="37" fill="#1a5c2e" />
      <rect x="0" y="77"  width="100" height="37" fill="#1a5c2e" />

      {/* ── Boundary & markings ── */}
      {/* Outer border */}
      <rect x="3" y="3" width="94" height="148" fill="none" stroke="white" strokeWidth="0.7" />

      {/* Halfway line */}
      <line x1="3" y1="77" x2="97" y2="77" stroke="white" strokeWidth="0.7" />

      {/* Centre circle + spot */}
      <circle cx="50" cy="77" r="13" fill="none" stroke="white" strokeWidth="0.7" />
      <circle cx="50" cy="77" r="0.8" fill="white" />

      {/* ── Top end (opponent) ── */}
      {/* Penalty area */}
      <rect x="22" y="3" width="56" height="23" fill="none" stroke="white" strokeWidth="0.7" />
      {/* Goal area */}
      <rect x="37" y="3" width="26" height="8" fill="none" stroke="white" strokeWidth="0.7" />
      {/* Goal (extends to top edge) */}
      <rect x="44.5" y="0" width="11" height="4.5" fill="rgba(0,0,0,0.4)" stroke="white" strokeWidth="0.8" />
      {/* Penalty spot */}
      <circle cx="50" cy="19" r="0.7" fill="white" />

      {/* ── Bottom end (our goal) ── */}
      {/* Penalty area */}
      <rect x="22" y="128" width="56" height="23" fill="none" stroke="white" strokeWidth="0.7" />
      {/* Goal area */}
      <rect x="37" y="143" width="26" height="8" fill="none" stroke="white" strokeWidth="0.7" />
      {/* Goal */}
      <rect x="44.5" y="149.5" width="11" height="4.5" fill="rgba(0,0,0,0.4)" stroke="white" strokeWidth="0.8" />
      {/* Penalty spot */}
      <circle cx="50" cy="135" r="0.7" fill="white" />

      {/* ── Corner arcs (r=5) ── */}
      <path d="M 3 8 A 5 5 0 0 0 8 3"     fill="none" stroke="white" strokeWidth="0.7" />
      <path d="M 92 3 A 5 5 0 0 0 97 8"   fill="none" stroke="white" strokeWidth="0.7" />
      <path d="M 3 146 A 5 5 0 0 1 8 151" fill="none" stroke="white" strokeWidth="0.7" />
      <path d="M 92 151 A 5 5 0 0 1 97 146" fill="none" stroke="white" strokeWidth="0.7" />

      {/* Direction labels */}
      <text x="50" y="13.5" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="4" fontFamily="sans-serif">OPPONENT</text>
      <text x="50" y="148" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="4" fontFamily="sans-serif">OUR GOAL</text>
    </svg>
  )
}

export default function SoccerField({ formation, slots, players }) {
  // Build a map playerId → player for quick lookup
  const playerMap = Object.fromEntries(players.map(p => [p.id, p]))

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      <FieldSVG />

      {/* Formation slot overlays */}
      {formation.slots.map(slot => (
        <FieldSlot
          key={slot.id}
          slot={slot}
          slotSizePct={formation.slotSizePct}
          player={slots[slot.id] ? playerMap[slots[slot.id]] : null}
        />
      ))}
    </div>
  )
}
