export { fmtTime } from '../../lib/utils'

/**
 * Quarter indicator bar — shows Q1–Q4 status with no timer.
 *
 * Props:
 *   currentQuarter    1–4, or null if not started
 *   viewedQuarter     1–4 (which tab is being viewed)
 *   completedQuarters number[]
 *   gameStarted       bool
 *   gameOver          bool
 *   saving            bool
 *   onSelectQuarter   (q: number) => void
 *   onStartGame       () => void
 *   onEndQuarter      () => void  (mark current quarter done, advance)
 *   onReset           () => void
 */
export default function TimerBar({
  currentQuarter,
  viewedQuarter,
  completedQuarters,
  gameStarted,
  gameOver,
  saving,
  onSelectQuarter,
  onStartGame,
  onEndQuarter,
  onReset,
}) {
  const quarterLabel = ['Q1', 'Q2', 'Q3', 'Q4']

  return (
    <div
      className="flex items-center gap-2 px-3 border-b border-gray-800"
      style={{ height: 48, background: '#0d1117', flexShrink: 0 }}
    >
      {/* ── Q1–Q4 pills ── */}
      <div className="flex gap-1.5 flex-shrink-0">
        {[1, 2, 3, 4].map(q => {
          const done    = completedQuarters.includes(q)
          const isCurr  = q === currentQuarter && gameStarted && !done
          const isViewed = q === viewedQuarter

          let bg, color, label
          if (done) {
            bg = '#14532d'; color = '#86efac'; label = `Q${q}✓`
          } else if (isCurr) {
            bg = 'var(--team-primary, #1a5c2e)'; color = '#4ade80'; label = `Q${q}●`
          } else {
            bg = 'transparent'; color = '#6b7280'; label = `Q${q}`
          }

          return (
            <button
              key={q}
              onClick={() => onSelectQuarter(q)}
              className="text-xs font-bold px-2 py-1 rounded-md transition"
              style={{
                background:  isViewed ? (done ? '#14532d' : isCurr ? 'var(--team-primary, #1a5c2e)' : '#1f2937') : bg,
                color,
                border:      isViewed ? '1px solid #374151' : '1px solid transparent',
                minWidth: 34,
              }}
              title={`View Q${q} plan`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Quarter length info ── */}
      <div className="flex-1" />

      {saving && <span className="text-green-700 text-xs flex-shrink-0">●</span>}

      {/* ── Controls ── */}
      {!gameStarted ? (
        <button
          onClick={onStartGame}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white flex-shrink-0 transition"
          style={{ background: 'var(--team-primary, #1a5c2e)' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#236b38')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--team-primary, #1a5c2e)')}
        >
          Start Q1
        </button>
      ) : gameOver ? (
        <button
          onClick={onReset}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition flex-shrink-0"
        >
          Reset
        </button>
      ) : (
        <button
          onClick={onEndQuarter}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white flex-shrink-0 transition"
          style={{ background: 'var(--team-primary, #1a5c2e)' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#236b38')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--team-primary, #1a5c2e)')}
          title={`Mark Q${currentQuarter} complete`}
        >
          End {quarterLabel[currentQuarter - 1]}
        </button>
      )}
    </div>
  )
}
