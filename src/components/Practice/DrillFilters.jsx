import { CATEGORY_META, PHASE_META, DIVISIONS_ORDER } from '../../lib/drills'

function Chip({ label, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full border transition-colors"
      style={
        active
          ? { background: color || 'var(--team-primary, #1a5c2e)', borderColor: color || 'var(--team-primary, #1a5c2e)', color: '#fff' }
          : { background: 'transparent', borderColor: '#374151', color: '#9ca3af' }
      }
    >
      {label}
    </button>
  )
}

export default function DrillFilters({ filters, onChange }) {
  const { category, division, phase } = filters

  return (
    <div className="flex flex-col gap-2 px-4 py-3 border-b border-gray-800 bg-gray-950">
      {/* Category row */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
        <Chip
          label="All"
          active={category === 'all'}
          color="var(--team-primary, #1a5c2e)"
          onClick={() => onChange({ ...filters, category: 'all' })}
        />
        {Object.entries(CATEGORY_META).map(([key, { label, color }]) => (
          <Chip
            key={key}
            label={label}
            active={category === key}
            color={color}
            onClick={() => onChange({ ...filters, category: category === key ? 'all' : key })}
          />
        ))}
      </div>

      {/* Phase + Division row */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
        {/* Phase chips */}
        <Chip
          label="Any Phase"
          active={phase === 'all'}
          color="#6366f1"
          onClick={() => onChange({ ...filters, phase: 'all' })}
        />
        {Object.entries(PHASE_META).map(([key, { label, color }]) => (
          <Chip
            key={key}
            label={label}
            active={phase === key}
            color={color}
            onClick={() => onChange({ ...filters, phase: phase === key ? 'all' : key })}
          />
        ))}

        {/* Divider */}
        <span className="flex-shrink-0 w-px bg-gray-800 mx-1" />

        {/* Division chips */}
        <Chip
          label="All Ages"
          active={division === 'all'}
          color="var(--team-primary, #1a5c2e)"
          onClick={() => onChange({ ...filters, division: 'all' })}
        />
        {DIVISIONS_ORDER.map(div => (
          <Chip
            key={div}
            label={div}
            active={division === div}
            color="var(--team-primary, #1a5c2e)"
            onClick={() => onChange({ ...filters, division: division === div ? 'all' : div })}
          />
        ))}
      </div>
    </div>
  )
}
