import { useState, useEffect, useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { DRILLS, CATEGORY_META, PHASE_META, DIVISIONS_ORDER, matchesDivision } from '../../lib/drills'
import { useApp } from '../../contexts/AppContext'
import { supabase } from '../../lib/supabase'
import CustomDrillForm from './CustomDrillForm'
import theme from '../../theme'

// ── Generation algorithm ─────────────────────────────────────────
const FOCUS_CAT_IDS = ['dribbling', 'passing', 'shooting', 'defending', 'teamwork']

/**
 * Structure: one warm-up → one or more skill drills (fill budget) → one game drill.
 * Each slot prefers selectedCategories; falls back to any drill of that phase/division.
 * Returns { plan, usedMinutes, exceeds } where exceeds=true means budget was tight and
 * a minimum skill drill was forced in despite going slightly over.
 */
function generatePlan(totalMins, selectedCategories, teamDivision) {
  const usedIds   = new Set()
  const divFilter = d => matchesDivision(d, teamDivision || 'all')
  const catFilter = d =>
    selectedCategories.length === 0 || selectedCategories.includes(d.category)

  function pickOne(primaryFilters, fallbackFilters) {
    const primaryPool = DRILLS.filter(d => !usedIds.has(d.id) && primaryFilters.every(f => f(d)))
    if (primaryPool.length) {
      const chosen = primaryPool[Math.floor(Math.random() * primaryPool.length)]
      usedIds.add(chosen.id)
      return chosen
    }
    const fallbackPool = DRILLS.filter(d => !usedIds.has(d.id) && fallbackFilters.every(f => f(d)))
    if (!fallbackPool.length) return null
    const chosen = fallbackPool[Math.floor(Math.random() * fallbackPool.length)]
    usedIds.add(chosen.id)
    return chosen
  }

  let usedMinutes = 0
  const plan = []

  // Step 1: warm-up
  const warmup = pickOne(
    [d => d.phase === 'warm-up', catFilter, divFilter],
    [d => d.phase === 'warm-up', divFilter]
  )
  if (warmup) { plan.push(warmup); usedMinutes += warmup.duration }

  // Step 2: pick the game drill now so we know how much time to reserve
  const game = pickOne(
    [d => d.phase === 'small-sided-game', catFilter, divFilter],
    [d => d.phase === 'small-sided-game', divFilter]
  )
  let skillBudget = totalMins - usedMinutes - (game ? game.duration : 0)

  // Step 3: fill skill drills until budget runs out
  let safety = 0
  while (skillBudget > 0 && safety < 20) {
    safety++
    const next = pickOne(
      [d => d.phase === 'skill-work', catFilter, divFilter, d => d.duration <= skillBudget],
      [d => d.phase === 'skill-work', divFilter,             d => d.duration <= skillBudget]
    )
    if (!next) break
    plan.push(next); usedMinutes += next.duration; skillBudget -= next.duration
  }

  // Edge case: no skill drill fit — force one anyway (plan will slightly exceed budget)
  let exceeds = false
  const skillCount = plan.filter(d => d.phase === 'skill-work').length
  if (skillCount === 0) {
    const forced = pickOne(
      [d => d.phase === 'skill-work', catFilter, divFilter],
      [d => d.phase === 'skill-work', divFilter]
    )
    if (forced) { plan.push(forced); usedMinutes += forced.duration; exceeds = true }
  }

  // Step 4: append game drill last
  if (game) { plan.push(game); usedMinutes += game.duration }

  return { plan, usedMinutes, exceeds }
}

// ── Inline suggester panel ────────────────────────────────────────
const PRESETS = [45, 60, 75, 90]
const FOCUS_CATS = FOCUS_CAT_IDS.map(id => ({ id, label: CATEGORY_META[id]?.label || id }))

function SuggesterPanel({ teamDivision, onGenerate, onClose, panelRef }) {
  const [preset,     setPreset]     = useState(null)   // null = nothing selected yet
  const [customVal,  setCustomVal]  = useState('')
  const [useCustom,  setUseCustom]  = useState(false)
  const [focusCats,  setFocusCats]  = useState([])
  const [error,      setError]      = useState('')

  const effectiveMins = useCustom ? (parseInt(customVal) || 0) : (preset ?? 0)
  const canGenerate   = effectiveMins >= 10

  function toggleCat(id) {
    setError('')
    setFocusCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  function handleGenerate() {
    if (!canGenerate) return
    const { plan, usedMinutes, exceeds } = generatePlan(effectiveMins, focusCats, teamDivision)

    if (plan.length === 0) {
      setError('No drills found for this division — try a different selection.')
      return
    }

    setError('')
    const focusLbl = focusCats.length
      ? focusCats.map(id => CATEGORY_META[id]?.label || id).join(' & ')
      : 'All Skills'
    const gap  = Math.abs(usedMinutes - effectiveMins)
    const note = exceeds
      ? `Suggested plan — ${usedMinutes} min (slightly over ${effectiveMins}m) · ${focusLbl}`
      : gap <= 5
        ? `Suggested plan — ${usedMinutes} min · ${focusLbl}`
        : `Suggested plan — ${usedMinutes} of ${effectiveMins} min filled · ${focusLbl}`
    onGenerate(plan, note)
  }

  return (
    <div
      ref={panelRef}
      style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', padding: '10px 12px', flexShrink: 0 }}
    >
      {/* Duration row */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, flexShrink: 0, marginRight: 2 }}>Duration</span>
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => { setPreset(p); setUseCustom(false); setCustomVal('') }}
            style={{
              padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', border: 'none',
              background: !useCustom && preset === p ? 'var(--team-primary, #1a5c2e)' : '#1f2937',
              color:      !useCustom && preset === p ? '#fff'    : '#9ca3af',
            }}
          >{p}m</button>
        ))}
        <input
          type="number" min="10" max="180" placeholder="other"
          value={customVal}
          onChange={e => { setCustomVal(e.target.value); setUseCustom(true); setPreset(null) }}
          onFocus={() => { setUseCustom(true); setPreset(null) }}
          style={{
            width: 52, padding: '3px 6px', borderRadius: 6, fontSize: 11,
            background: useCustom ? 'rgba(26,92,46,0.15)' : '#1f2937',
            border:     useCustom ? '1px solid var(--team-primary, #1a5c2e)'   : '1px solid #374151',
            color: '#fff', outline: 'none',
          }}
        />
      </div>

      {/* Focus category row */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, flexShrink: 0, marginRight: 2 }}>Focus</span>
        {FOCUS_CATS.map(({ id, label }) => {
          const active = focusCats.includes(id)
          const color  = CATEGORY_META[id]?.color || '#6b7280'
          return (
            <button key={id} onClick={() => toggleCat(id)}
              style={{
                padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: active ? color + '33' : '#1f2937',
                color:      active ? color        : '#9ca3af',
                border:     `1px solid ${active ? color : '#374151'}`,
              }}
            >{label}</button>
          )
        })}
        {focusCats.length === 0 && (
          <span style={{ fontSize: 10, color: '#4b5563', fontStyle: 'italic' }}>all skills</span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          marginBottom: 8, padding: '5px 10px', borderRadius: 6,
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
          fontSize: 11, color: '#fca5a5', lineHeight: 1.4,
        }}>{error}</div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          style={{
            flex: 1, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: canGenerate ? 'linear-gradient(135deg, var(--team-primary, #1a5c2e), #6366f1)' : '#374151',
            color: '#fff', border: 'none', cursor: canGenerate ? 'pointer' : 'not-allowed',
          }}
        >
          {canGenerate ? `Generate ${effectiveMins}m Plan` : 'Select Duration'}
        </button>
        <button onClick={onClose}
          style={{
            padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: 'transparent', color: '#9ca3af',
            border: '1px solid #374151', cursor: 'pointer',
          }}
        >Cancel</button>
      </div>
    </div>
  )
}

// ── Compact filter chip ───────────────────────────────────────────
function Chip({ label, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink:  0,
        fontSize:    11,
        fontWeight:  600,
        padding:     '3px 10px',
        borderRadius: 999,
        border:      `1px solid ${active ? (color || 'var(--team-primary, #1a5c2e)') : '#374151'}`,
        background:  active ? (color || 'var(--team-primary, #1a5c2e)') : 'transparent',
        color:       active ? '#fff' : '#9ca3af',
        cursor:      'pointer',
        whiteSpace:  'nowrap',
        transition:  'all 0.1s',
      }}
    >
      {label}
    </button>
  )
}

// ── Mobile detection ─────────────────────────────────────────────
function useMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  useEffect(() => {
    const mq = window.matchMedia('(max-width:767px)')
    setM(mq.matches)
    const h = e => setM(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return m
}

// ── Star icon ─────────────────────────────────────────────────────
function StarIcon({ filled, size = 13 }) {
  return filled ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#EF9F27" stroke="#EF9F27" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

// ── Single drill row (draggable) ─────────────────────────────────
function DrillPickerRow({ drill, isFavorite, onToggleFavorite, onAdd, onSelect, onEdit, onDelete }) {
  const isMobile = useMobile()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id:   `lib-${drill.id}`,
    data: { source: 'library', drill },
  })

  const iconBtnStyle = isMobile ? {
    flexShrink: 0, width: 44, height: 44, borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  } : {
    flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
    background: 'none', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
  const iconSize = isMobile ? 22 : 13

  const catMeta = CATEGORY_META[drill.category] || { color: '#6b7280', label: drill.category }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform:    CSS.Transform.toString(transform),
        touchAction:  'none',
        userSelect:   'none',
        cursor:       isDragging ? 'grabbing' : 'grab',
        opacity:      isDragging ? 0.25 : 1,
        display:      'flex',
        alignItems:   'center',
        gap:          8,
        padding:      '8px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        borderLeft:   `3px solid ${catMeta.color}`,
        background:   'var(--bg-primary)',
      }}
    >
      {/* Drag handle dots */}
      <div style={{ color: '#2d3748', flexShrink: 0, padding: '1px 2px', pointerEvents: 'none' }}>
        <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
          <circle cx="2" cy="2"  r="1.2" /><circle cx="6" cy="2"  r="1.2" />
          <circle cx="2" cy="6"  r="1.2" /><circle cx="6" cy="6"  r="1.2" />
          <circle cx="2" cy="10" r="1.2" /><circle cx="6" cy="10" r="1.2" />
        </svg>
      </div>

      <div className="flex-1 min-w-0" style={{ pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className="text-sm text-white font-medium truncate">{drill.name}</span>
          {drill.isCustom && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
              background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
              border: '1px solid rgba(245,158,11,0.3)', flexShrink: 0,
            }}>MY DRILL</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span style={{ color: catMeta.color, fontSize: 10, fontWeight: 600 }}>{catMeta.label}</span>
          <span className="text-gray-700 text-xs">·</span>
          <span className="text-gray-500 text-xs">{drill.duration}m</span>
          <span className="text-gray-700 text-xs">·</span>
          <span className="text-gray-600 text-xs">{(PHASE_META[drill.phase] || { label: drill.phase }).label}</span>
        </div>
      </div>

      {/* ★ Favorite toggle */}
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={() => onToggleFavorite(drill.name)}
        style={{
          ...iconBtnStyle,
          color: isFavorite ? '#EF9F27' : (isMobile ? 'rgba(255,255,255,0.6)' : '#4b5563'),
          transition: 'color 0.12s, background 0.12s',
        }}
        onMouseEnter={e => { if (!isMobile && !isFavorite) e.currentTarget.style.color = '#d97706' }}
        onMouseLeave={e => { if (!isMobile && !isFavorite) e.currentTarget.style.color = '#4b5563' }}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <StarIcon filled={isFavorite} size={iconSize} />
      </button>

      {/* Custom drill: edit + delete buttons */}
      {drill.isCustom ? (
        <>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={() => onEdit(drill)}
            style={{
              flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
              background: '#1f2937', color: '#6b7280',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', transition: 'all 0.12s', border: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#374151'; e.currentTarget.style.color = '#9ca3af' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1f2937'; e.currentTarget.style.color = '#6b7280' }}
            title={`Edit "${drill.name}"`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={() => onDelete(drill.id)}
            style={{
              flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
              background: '#1f2937', color: '#6b7280',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', transition: 'all 0.12s', border: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#f87171' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1f2937'; e.currentTarget.style.color = '#6b7280' }}
            title={`Delete "${drill.name}"`}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          </button>
        </>
      ) : (
        /* ⓘ Info button (library drills only) */
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => onSelect(drill)}
          style={{
            ...iconBtnStyle,
            background: isMobile ? 'rgba(255,255,255,0.08)' : '#1f2937',
            color: isMobile ? 'rgba(255,255,255,0.7)' : '#6b7280',
            transition: 'all 0.12s',
          }}
          onMouseEnter={e => { if (!isMobile) { e.currentTarget.style.background = '#374151'; e.currentTarget.style.color = '#9ca3af' } else { e.currentTarget.style.background = 'rgba(255,255,255,0.18)' } }}
          onMouseLeave={e => { if (!isMobile) { e.currentTarget.style.background = '#1f2937'; e.currentTarget.style.color = '#6b7280' } else { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' } }}
          title={`Details: "${drill.name}"`}
        >
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="8" strokeWidth="2.5" />
            <line x1="12" y1="12" x2="12" y2="16" />
          </svg>
        </button>
      )}

      {/* + Add button */}
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={() => onAdd(drill)}
        style={{
          flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
          background: '#1f2937', color: '#9ca3af',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', transition: 'all 0.12s', border: 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--team-primary, #1a5c2e)'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#1f2937'; e.currentTarget.style.color = '#9ca3af' }}
        title={`Add "${drill.name}"`}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 1v10M1 6h10" />
        </svg>
      </button>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────
/**
 * Props:
 *   teamDivision    string       — pre-select division filter
 *   defaultCategory string|null  — pre-select category filter
 *   addedNames      Set<string>  — drill names already in the plan
 *   onAdd           (drill) => void
 *   team            object       — team record (for division)
 *   onAddDrills     (drills, note) => void — called with generated plan
 */
export default function DrillPickerPanel({ teamDivision, defaultCategory, addedNames, onAdd, team, onAddDrills, onDrillSelect, pendingEditDrill, onPendingEditDone }) {
  const { favoriteDrillNames, toggleFavorite, customDrills, addCustomDrill, updateCustomDrill, deleteCustomDrill } = useApp()

  const [filters, setFilters] = useState({
    category: defaultCategory || 'all',
    division: teamDivision || 'all',
    phase:    'all',
  })
  const [showFavs,      setShowFavs]      = useState(false)
  const [showSuggester, setShowSuggester] = useState(false)
  const [formDrill,     setFormDrill]     = useState(null) // null | 'new' | drillObject
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const panelRef = useRef(null)
  const btnRef   = useRef(null)

  // Sync when defaultCategory changes
  useEffect(() => {
    if (defaultCategory) setFilters(f => ({ ...f, category: defaultCategory }))
  }, [defaultCategory])

  // Open edit form when parent signals a pending edit
  useEffect(() => {
    if (pendingEditDrill) {
      setFormDrill(pendingEditDrill)
      onPendingEditDone?.()
    }
  }, [pendingEditDrill]) // eslint-disable-line react-hooks/exhaustive-deps

  // Click-outside to close suggester
  useEffect(() => {
    if (!showSuggester) return
    function onMouseDown(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current   && !btnRef.current.contains(e.target)
      ) {
        setShowSuggester(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [showSuggester])

  const allDrills = [...DRILLS, ...customDrills]

  const visible = allDrills.filter(drill => {
    if (showFavs && !favoriteDrillNames.has(drill.name))                      return false
    if (filters.category !== 'all' && drill.category !== filters.category) return false
    if (filters.phase     !== 'all' && drill.phase     !== filters.phase)    return false
    if (!matchesDivision(drill, filters.division))                            return false
    return true
  })

  function handleGenerate(drills, note) {
    setShowSuggester(false)
    onAddDrills(drills, note)
  }

  async function handleConfirmDelete() {
    if (!confirmDeleteId) return
    try {
      await supabase.from('custom_drills').delete().eq('id', confirmDeleteId)
      deleteCustomDrill(confirmDeleteId)
    } catch { /* silent */ }
    setConfirmDeleteId(null)
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0d1117' }}>

      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{ background: 'linear-gradient(90deg, var(--bg-purple, #2d1b69) 0%, var(--bg-secondary, #13131f) 100%)', borderBottom: '1px solid var(--border-purple)' }}
      >
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Library</span>
        {!formDrill && <span className="text-gray-600 text-xs">{visible.length}</span>}

        {/* + Add my drill button */}
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => { setFormDrill('new'); setShowSuggester(false) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 9px', borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: formDrill === 'new' ? 'var(--team-primary, #1a5c2e)' : 'transparent',
            color: formDrill === 'new' ? '#fff' : '#6b7280',
            border: `1px solid ${formDrill === 'new' ? 'var(--team-primary, #1a5c2e)' : '#374151'}`,
            cursor: 'pointer', transition: 'all 0.12s',
          }}
          onMouseEnter={e => { if (formDrill !== 'new') { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = '#4b5563' } }}
          onMouseLeave={e => { if (formDrill !== 'new') { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = '#374151' } }}
          title="Create a custom drill"
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 1v10M1 6h10" />
          </svg>
          Add drill
        </button>

        {/* AI Plan button */}
        <button
          ref={btnRef}
          onMouseDown={e => e.stopPropagation()}
          onClick={() => { setShowSuggester(s => !s); setFormDrill(null) }}
          className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold text-white"
          style={{
            background: showSuggester
              ? 'linear-gradient(135deg, #6366f1, var(--team-primary, #1a5c2e))'
              : 'linear-gradient(135deg, var(--team-primary, #1a5c2e), #6366f1)',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI Plan
        </button>
      </div>

      {/* Inline custom drill form */}
      {formDrill !== null && (
        <CustomDrillForm
          initial={formDrill === 'new' ? null : formDrill}
          onSaved={dbRow => {
            if (formDrill === 'new') addCustomDrill(dbRow)
            else updateCustomDrill(formDrill.id, dbRow)
            setFormDrill(null)
          }}
          onCancel={() => setFormDrill(null)}
        />
      )}

      {/* Filter strips + drill list — hidden while form is open */}
      {formDrill === null && (
        <>
          {/* Inline suggester panel */}
          {showSuggester && (
            <SuggesterPanel
              panelRef={panelRef}
              teamDivision={team?.division || teamDivision}
              onGenerate={handleGenerate}
              onClose={() => setShowSuggester(false)}
            />
          )}

          {/* Compact filter strips */}
          <div
            className="flex-shrink-0 px-3 py-2 flex flex-col gap-1.5"
            style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)' }}
          >
            {/* Category row — includes Favorites toggle */}
            <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <Chip
                label="★ Favs"
                active={showFavs}
                color="#f59e0b"
                onClick={() => setShowFavs(f => !f)}
              />
              <span style={{ width: 1, background: '#374151', flexShrink: 0, margin: '2px 0' }} />
              <Chip label="All" active={!showFavs && filters.category === 'all'} color="var(--team-primary, #1a5c2e)" onClick={() => { setShowFavs(false); setFilters(f => ({ ...f, category: 'all' })) }} />
              {Object.entries(CATEGORY_META).map(([k, { label, color }]) => (
                <Chip key={k} label={label} active={!showFavs && filters.category === k} color={color}
                  onClick={() => { setShowFavs(false); setFilters(f => ({ ...f, category: f.category === k ? 'all' : k })) }} />
              ))}
            </div>
            {/* Phase + division row */}
            <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <Chip label="Any Phase" active={filters.phase === 'all'} color="#6366f1" onClick={() => setFilters(f => ({ ...f, phase: 'all' }))} />
              {Object.entries(PHASE_META).map(([k, { label, color }]) => (
                <Chip key={k} label={label} active={filters.phase === k} color={color}
                  onClick={() => setFilters(f => ({ ...f, phase: f.phase === k ? 'all' : k }))} />
              ))}
              <span style={{ width: 1, background: '#374151', flexShrink: 0, margin: '2px 2px' }} />
              <Chip label="All Ages" active={filters.division === 'all'} color="var(--team-primary, #1a5c2e)" onClick={() => setFilters(f => ({ ...f, division: 'all' }))} />
              {DIVISIONS_ORDER.map(div => (
                <Chip key={div} label={div} active={filters.division === div} color="var(--team-primary, #1a5c2e)"
                  onClick={() => setFilters(f => ({ ...f, division: f.division === div ? 'all' : div }))} />
              ))}
            </div>
          </div>

          {/* Drill list */}
          <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                {showFavs && favoriteDrillNames.size === 0 ? (
                  <>
                    <span style={{ fontSize: 22, marginBottom: 6 }}>☆</span>
                    <p className="text-gray-500 text-xs">No favorites yet — tap the star on any drill to save it here.</p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 text-xs">No drills match.</p>
                    <button
                      className="mt-1.5 text-xs underline"
                      style={{ color: '#4ade80' }}
                      onClick={() => { setShowFavs(false); setFilters({ category: 'all', division: 'all', phase: 'all' }) }}
                    >
                      Clear filters
                    </button>
                  </>
                )}
              </div>
            ) : (
              visible.map(drill => (
                <DrillPickerRow
                  key={drill.id}
                  drill={drill}
                  isFavorite={favoriteDrillNames.has(drill.name)}
                  onToggleFavorite={toggleFavorite}
                  onAdd={onAdd}
                  onSelect={d => onDrillSelect(d, 'library')}
                  onEdit={d => setFormDrill(d)}
                  onDelete={id => setConfirmDeleteId(id)}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Delete confirmation overlay */}
      {confirmDeleteId && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 20,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            style={{
              background: 'var(--bg-panel)', border: '1px solid var(--border-purple)', borderRadius: 14,
              padding: '20px 20px 16px', width: '100%', maxWidth: 280,
            }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Delete this drill?</p>
            <p style={{ color: '#9ca3af', fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
              This will permanently remove the drill from your library. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleConfirmDelete}
                style={{
                  flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: '#991b1b', color: '#fff', border: 'none', cursor: 'pointer',
                }}
              >Delete</button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{
                  flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: 'transparent', color: '#9ca3af', border: '1px solid #374151', cursor: 'pointer',
                }}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
