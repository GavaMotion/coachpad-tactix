import { useState, useEffect, useRef } from 'react'
import { fmtTime } from '../../lib/utils'
import { CATEGORY_META, PHASE_META } from '../../lib/drills'
import DrillLinks from './DrillLinks'

function Badge({ label, color }) {
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: color + '22', color, border: `1px solid ${color}44` }}
    >
      {label}
    </span>
  )
}

export default function DrillCard({ drill, teamId }) {
  const totalSec = drill.duration * 60
  const [secsLeft, setSecsLeft]   = useState(totalSec)
  const [running, setRunning]     = useState(false)
  const [expanded, setExpanded]   = useState(false)
  const intervalRef = useRef(null)

  const done    = secsLeft <= 0
  const started = secsLeft < totalSec

  const catMeta   = CATEGORY_META[drill.category]
  const phaseMeta = PHASE_META[drill.phase]

  // ── Timer ──
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecsLeft(prev => {
          if (prev <= 1) {
            setRunning(false)
            clearInterval(intervalRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  function reset() {
    setRunning(false)
    setSecsLeft(totalSec)
  }

  const pct = ((totalSec - secsLeft) / totalSec) * 100

  return (
    <div
      className="flex flex-col bg-gray-900 rounded-xl border border-gray-800 overflow-hidden"
      style={{ borderLeft: `4px solid ${catMeta.color}` }}
    >
      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 px-3 pt-3">
        <Badge label={catMeta.label}   color={catMeta.color} />
        <Badge label={phaseMeta.label} color={phaseMeta.color} />
      </div>

      {/* Name + meta */}
      <div className="px-3 mt-2">
        <h3 className="text-white font-bold text-sm leading-snug">{drill.name}</h3>
        <div className="flex items-center gap-3 mt-0.5 text-gray-500" style={{ fontSize: 10 }}>
          <span>{drill.duration} min</span>
          <span>{drill.players} players</span>
          <span>{drill.minDivision}+</span>
        </div>
      </div>

      {/* Description — truncated, expand on tap */}
      <button
        className="text-left px-3 mt-2"
        onClick={() => setExpanded(e => !e)}
      >
        <p
          className="text-gray-400 text-xs leading-relaxed"
          style={expanded ? {} : {
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {drill.description}
        </p>
        <span className="text-xs mt-0.5 block" style={{ color: catMeta.color }}>
          {expanded ? 'Show less ▲' : 'Show more ▼'}
        </span>
      </button>

      {/* Coaching points + links (shown when expanded) */}
      {expanded && (
        <>
          <div className="px-3 mt-2">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-1">Coaching Cues</p>
            <ul className="space-y-0.5">
              {drill.coachingPoints.map((pt, i) => (
                <li key={i} className="text-gray-400 text-xs flex gap-1.5">
                  <span style={{ color: catMeta.color }}>›</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-2 border-t border-gray-800/60">
            <DrillLinks teamId={teamId} drillName={drill.name} color={catMeta.color} />
          </div>
        </>
      )}

      {/* Timer bar + controls */}
      <div className="mt-3 border-t border-gray-800">
        {/* Progress strip */}
        {started && !done && (
          <div className="h-1" style={{ background: '#1f2937' }}>
            <div
              className="h-full transition-all duration-1000"
              style={{ width: `${pct}%`, background: catMeta.color }}
            />
          </div>
        )}

        <div className="flex items-center gap-2 px-3 py-2.5">
          {/* Time display */}
          <span
            className="font-mono font-bold tabular-nums"
            style={{
              fontSize: 18,
              color: done ? '#22c55e' : started ? catMeta.color : '#e5e7eb',
              letterSpacing: '-0.02em',
            }}
          >
            {done ? 'Done ✓' : fmtTime(secsLeft)}
          </span>

          <div className="flex-1" />

          {/* Reset button */}
          {started && (
            <button
              onClick={reset}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition"
              title="Reset"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          )}

          {/* Start / Pause button */}
          {!done && (
            <button
              onClick={() => setRunning(r => !r)}
              className="flex items-center justify-center w-8 h-8 rounded-full transition"
              style={{ background: running ? '#374151' : catMeta.color }}
              title={running ? 'Pause' : 'Start'}
            >
              {running ? (
                <svg width="10" height="12" viewBox="0 0 10 12" fill="white">
                  <rect x="0" y="0" width="3" height="12" rx="1" />
                  <rect x="7" y="0" width="3" height="12" rx="1" />
                </svg>
              ) : (
                <svg width="9" height="11" viewBox="0 0 9 11" fill="white">
                  <polygon points="0,0 9,5.5 0,11" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
