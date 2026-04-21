import { useState, useRef, useEffect } from 'react'
import theme from '../../theme'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { CATEGORY_META, CATEGORY_ORDER } from '../../lib/drills'
import { fmtTime } from '../../lib/utils'
import DrillLinks from './DrillLinks'
import { useApp } from '../../contexts/AppContext'

// ── Star icon (shared) ────────────────────────────────────────────
function StarIcon({ filled }) {
  return filled ? (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

// ── Per-row timer ─────────────────────────────────────────────────
function useTimer(totalSec) {
  const [secsLeft, setSecsLeft] = useState(totalSec)
  const [running, setRunning]   = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    setSecsLeft(totalSec)
    setRunning(false)
    clearInterval(intervalRef.current)
  }, [totalSec])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecsLeft(prev => {
          if (prev <= 1) { setRunning(false); clearInterval(intervalRef.current); return 0 }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  return { secsLeft, running, setRunning, reset: () => { setSecsLeft(totalSec); setRunning(false) } }
}

// ── Category summary bar ──────────────────────────────────────────
function CategorySummaryBar({ drills, totalMins, onScrollTo }) {
  const counts = {}
  for (const d of drills) counts[d.skill_category] = (counts[d.skill_category] || 0) + 1
  const activeCats = CATEGORY_ORDER.filter(cat => counts[cat] > 0)
  if (activeCats.length === 0) return null

  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  const totalLabel = h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`

  return (
    <div
      style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-subtle)', overflowX: 'auto',
        scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
      }}
    >
      {activeCats.map(cat => {
        const meta = CATEGORY_META[cat]
        return (
          <button key={cat} onClick={() => onScrollTo(cat)}
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
              padding: '2px 8px 2px 5px', borderRadius: 999,
              background: meta.color + '1a', border: `1px solid ${meta.color}44`,
              cursor: 'pointer', transition: 'background 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = meta.color + '33' }}
            onMouseLeave={e => { e.currentTarget.style.background = meta.color + '1a' }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: meta.color, whiteSpace: 'nowrap' }}>
              {meta.label} {counts[cat]}
            </span>
          </button>
        )
      })}
      {totalMins > 0 && (
        <span style={{ marginLeft: 'auto', flexShrink: 0, paddingLeft: 6, fontSize: 11, fontWeight: 600, color: '#22c55e' }}>
          {totalLabel} total
        </span>
      )}
    </div>
  )
}

// ── Category drop zone ────────────────────────────────────────────
function CategoryDropZone({ category, count, compact = false }) {
  const { setNodeRef, isOver } = useDroppable({ id: category })
  const catMeta = CATEGORY_META[category] || { label: category, color: '#6b7280' }

  if (compact) {
    // Horizontal pill used in the library-drag strip
    return (
      <div
        ref={setNodeRef}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', borderRadius: 999, flexShrink: 0,
          border: `1.5px ${isOver ? 'solid' : 'dashed'} ${isOver ? catMeta.color : catMeta.color + '66'}`,
          background: isOver ? catMeta.color + '28' : catMeta.color + '0e',
          transition: 'all 0.12s', cursor: 'copy',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: catMeta.color, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: isOver ? catMeta.color : catMeta.color + 'bb', whiteSpace: 'nowrap' }}>
          {catMeta.label}
        </span>
        {count > 0 && (
          <span style={{ fontSize: 10, color: isOver ? catMeta.color : '#4b5563' }}>·{count}</span>
        )}
      </div>
    )
  }

  // Full tile used in the plan-card-drag grid
  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 4, padding: '14px 8px', borderRadius: 10,
        border: `2px ${isOver ? 'solid' : 'dashed'} ${isOver ? catMeta.color : catMeta.color + '55'}`,
        background: isOver ? catMeta.color + '28' : catMeta.color + '0d',
        transition: 'all 0.12s', cursor: 'copy', minHeight: 64,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: isOver ? catMeta.color : catMeta.color + 'bb' }}>
        {catMeta.label}
      </span>
      {count > 0 && <span style={{ fontSize: 10, color: '#4b5563' }}>{count} drill{count !== 1 ? 's' : ''}</span>}
      {isOver && <span style={{ fontSize: 10, color: catMeta.color, marginTop: 2 }}>Drop here</span>}
    </div>
  )
}

// ── Sortable drill card (used in flat plan list) ──────────────────
function DrillCard({ drill, teamId, onRemove, onSelect }) {
  const { favoriteDrillNames, toggleFavorite } = useApp()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id:   drill.id,
    data: { type: 'plan', skill_category: drill.skill_category, drill_name: drill.drill_name, duration_minutes: drill.duration_minutes },
  })

  const [expanded, setExpanded] = useState(false)
  const totalSec = (drill.duration_minutes || 0) * 60
  const { secsLeft, running, setRunning, reset } = useTimer(totalSec)
  const isFavorite = favoriteDrillNames.has(drill.drill_name)

  const catMeta = drill.is_custom
    ? { color: '#6b7280', label: 'Custom' }
    : (CATEGORY_META[drill.skill_category] || { color: '#6b7280', label: 'Drill' })

  const done    = secsLeft <= 0
  const started = secsLeft < totalSec
  const noPropagate = e => e.stopPropagation()

  return (
    <div
      ref={setNodeRef}
      data-category={drill.skill_category}
      {...attributes}
      {...listeners}
      style={{
        transform:    CSS.Transform.toString(transform),
        transition,
        touchAction:  'none',
        userSelect:   'none',
        cursor:       isDragging ? 'grabbing' : 'grab',
        opacity:      isDragging ? 0.2 : 1,
        background:   'var(--bg-panel)',
        borderLeft:   `3px solid ${catMeta.color}`,
        borderBottom: '1px solid var(--border-subtle)',
        position:     'relative',
      }}
    >
      <div className="flex items-center gap-2 px-2 py-2.5">

        {/* Drag handle dots (visual cue — whole card drags) */}
        <div style={{ color: '#374151', flexShrink: 0, padding: '2px 4px', pointerEvents: 'none' }}>
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
            <circle cx="3" cy="2"  r="1.4" /><circle cx="7" cy="2"  r="1.4" />
            <circle cx="3" cy="7"  r="1.4" /><circle cx="7" cy="7"  r="1.4" />
            <circle cx="3" cy="12" r="1.4" /><circle cx="7" cy="12" r="1.4" />
          </svg>
        </div>

        {/* Name + badge */}
        <div className="flex-1 min-w-0 pr-1" style={{ pointerEvents: 'none' }}>
          <div className="text-white text-sm font-semibold truncate">{drill.drill_name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span style={{ background: catMeta.color + '22', color: catMeta.color, fontSize: 10, lineHeight: '16px', padding: '0 6px', borderRadius: 999, fontWeight: 600 }}>
              {catMeta.label}
            </span>
            <span className="text-gray-600 text-xs">{drill.duration_minutes}m</span>
          </div>
        </div>

        {/* Timer controls */}
        <div className="flex items-center gap-1 flex-shrink-0" onPointerDown={noPropagate}>
          {started && (
            <button onClick={reset} style={{ color: '#4b5563', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Reset timer">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
              </svg>
            </button>
          )}
          <span className="font-mono font-bold tabular-nums" style={{ fontSize: 14, color: done ? '#22c55e' : started ? catMeta.color : '#4b5563', minWidth: 36, textAlign: 'right' }}>
            {done ? '✓' : fmtTime(secsLeft)}
          </span>
          {!done && (
            <button onClick={() => setRunning(r => !r)}
              style={{ width: 24, height: 24, borderRadius: '50%', background: running ? '#374151' : catMeta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              title={running ? 'Pause' : 'Start'}
            >
              {running ? (
                <svg width="7" height="9" viewBox="0 0 7 9" fill="white"><rect x="0" y="0" width="2.5" height="9" rx="0.8" /><rect x="4.5" y="0" width="2.5" height="9" rx="0.8" /></svg>
              ) : (
                <svg width="7" height="9" viewBox="0 0 7 9" fill="white"><polygon points="0,0 7,4.5 0,9" /></svg>
              )}
            </button>
          )}
        </div>

        {/* ★ Favorite toggle */}
        <button
          onPointerDown={noPropagate}
          onClick={() => toggleFavorite(drill.drill_name)}
          style={{
            color: isFavorite ? '#f59e0b' : '#4b5563',
            width: 24, height: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            background: 'none', border: 'none', cursor: 'pointer',
            transition: 'color 0.12s',
          }}
          onMouseEnter={e => { if (!isFavorite) e.currentTarget.style.color = '#d97706' }}
          onMouseLeave={e => { if (!isFavorite) e.currentTarget.style.color = '#4b5563' }}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <StarIcon filled={isFavorite} />
        </button>

        {/* ⓘ Info button */}
        {onSelect && (
          <button onPointerDown={noPropagate} onClick={() => onSelect(drill)}
            style={{ color: '#4b5563', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = '#9ca3af' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#4b5563' }}
            title="Drill details"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="8" strokeWidth="2.5" />
              <line x1="12" y1="12" x2="12" y2="16" />
            </svg>
          </button>
        )}

        {/* Links toggle */}
        <button onPointerDown={noPropagate} onClick={() => setExpanded(e => !e)}
          style={{ color: expanded ? catMeta.color : '#4b5563', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          title={expanded ? 'Hide links' : 'Links / notes'}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>

        {/* Remove */}
        <button onPointerDown={noPropagate} onClick={() => onRemove(drill.id)}
          style={{ color: '#4b5563', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderRadius = '4px' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.background = 'none' }}
          title="Remove from plan"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 1l8 8M9 1L1 9" />
          </svg>
        </button>
      </div>

      {/* Expanded: links */}
      {expanded && (
        <div onPointerDown={noPropagate}>
          {drill.is_custom && drill.drill_description && (
            <div className="px-10 pb-2">
              <p className="text-gray-400 text-xs leading-relaxed">{drill.drill_description}</p>
            </div>
          )}
          <DrillLinks teamId={teamId} drillName={drill.drill_name} color={catMeta.color} />
        </div>
      )}
    </div>
  )
}

// ── Main plan view ────────────────────────────────────────────────
export default function PracticePlanView({ drills, teamId, totalMins, planNote, scrollToTop, isDraggingLibrary, onRemove, onRequestAdd, onDrillSelect }) {
  const scrollRef = useRef(null)
  // Drop target for library drags — id must match the check in handleDragEnd
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: 'practice-plan' })

  function setListRef(el) {
    scrollRef.current = el
    setDropRef(el)
  }

  // Scroll to top whenever a generated plan is loaded
  useEffect(() => {
    if (scrollToTop && scrollRef.current) scrollRef.current.scrollTop = 0
  }, [scrollToTop])

  function scrollToCategory(cat) {
    const el = scrollRef.current?.querySelector(`[data-category="${cat}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  // Visual feedback while a library drill is in flight
  const dropBorder = isDraggingLibrary
    ? `2px dashed ${isOver ? '#4ade80' : '#22c55e'}`
    : 'none'
  const dropBg = isDraggingLibrary && isOver ? 'rgba(34,197,94,0.07)' : undefined

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0d1117' }}>

      {/* Plan header */}
      <div className="flex items-center gap-3 px-3 py-2 flex-shrink-0"
        style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">My Plan</span>
        <span className="text-gray-600 text-xs">{drills.length} drill{drills.length !== 1 ? 's' : ''}</span>
        {isDraggingLibrary && (
          <span className="text-xs italic ml-auto" style={{ color: isOver ? '#4ade80' : '#6b7280' }}>
            {isOver ? '✓ Release to add' : 'Drop here to add'}
          </span>
        )}
      </div>

      {/* AI plan note banner */}
      {planNote && (
        <div style={{
          flexShrink: 0, padding: '4px 12px',
          background: 'rgba(26,92,46,0.18)', borderBottom: '1px solid rgba(74,222,128,0.2)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="10" height="10" fill="none" stroke="#4ade80" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 500 }}>{planNote}</span>
        </div>
      )}

      {/* Category summary bar */}
      <CategorySummaryBar drills={drills} totalMins={totalMins} onScrollTo={scrollToCategory} />

      {/* Drill list — registered as 'practice-plan' drop target, min 300px so empty plan is droppable */}
      <div
        ref={setListRef}
        className="flex-1 overflow-y-auto"
        style={{
          WebkitOverflowScrolling: 'touch',
          minHeight: 300,
          border: dropBorder,
          background: dropBg,
          transition: 'border-color 0.1s, background 0.1s',
        }}
      >
        {drills.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-6">
            {isDraggingLibrary ? (
              <p style={{ color: '#4ade80', fontSize: 13, fontWeight: 600 }}>Drop here to add drill</p>
            ) : (
              <>
                <p className="text-gray-600 text-sm">No drills yet.</p>
                <p className="text-gray-700 text-xs mt-1">Add drills from the library →</p>
              </>
            )}
          </div>
        ) : (
          <SortableContext items={drills.map(d => d.id)} strategy={verticalListSortingStrategy}>
            {drills.map(drill => (
              <DrillCard key={drill.id} drill={drill} teamId={teamId} onRemove={onRemove} onSelect={onDrillSelect ? d => onDrillSelect(d, 'plan') : undefined} />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  )
}
