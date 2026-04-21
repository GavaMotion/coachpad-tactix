import { useDroppable } from '@dnd-kit/core'
import SortablePlayerRow from './SortablePlayerRow'

/**
 * Bench / sub queue panel for quarter-based game day.
 *
 * • Droppable (id='bench') — field players can be dragged here to bench them.
 * • Shows each bench player's quarter dots (played/planned/none).
 * • Absent players shown in a grayed section at the bottom.
 *
 * Props:
 *   activeBench           [playerId, ...]  non-absent bench players, ordered by fewest quarters played
 *   absentBench           [playerId, ...]  absent bench players
 *   playerMap             { playerId → Player }
 *   quarterDotsByPlayer   { playerId → ['played'|'planned'|'none', ...] }
 *   quartersPlayedByPlayer { playerId → number }
 *   totalPlannedByPlayer  { playerId → number }
 *   subPreview            { inPlayer, outPlayer } | null
 *   onMakeSub             () => void
 *   onToggleAbsent        (playerId) => void
 */
export default function SubQueuePanel({
  activeBench,
  absentBench,
  playerMap,
  quarterDotsByPlayer,
  quartersPlayedByPlayer,
  totalPlannedByPlayer,
  subPreview,
  onMakeSub,
  onToggleAbsent,
}) {
  const { isOver, setNodeRef } = useDroppable({ id: 'bench' })

  const totalBench = (activeBench?.length ?? 0) + (absentBench?.length ?? 0)

  return (
    <div
      ref={setNodeRef}
      style={{
        flexShrink: 0,
        background: isOver ? 'rgba(26,92,46,0.2)' : '#0d1117',
        borderTop: `2px solid ${isOver ? 'var(--team-primary, #1a5c2e)' : '#1f2937'}`,
        transition: 'background 0.15s, border-color 0.15s',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 220,
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
            Bench
          </span>
          <span className="text-gray-600 text-xs">{totalBench} players</span>

          {/* Dot legend */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />
              played
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
              planned
            </span>
          </div>
        </div>

        {/* Make Sub button */}
        <div className="flex items-center gap-2">
          {subPreview && (
            <span className="text-xs text-gray-400 hidden sm:block">
              <span style={{ color: '#86efac' }}>
                #{subPreview.inPlayer.jersey_number} {subPreview.inPlayer.name.split(' ')[0]}
              </span>
              {' '}→ on &nbsp;|&nbsp;
              <span style={{ color: '#fca5a5' }}>
                #{subPreview.outPlayer.jersey_number} {subPreview.outPlayer.name.split(' ')[0]}
              </span>
              {' '}→ off
            </span>
          )}
          <button
            onClick={onMakeSub}
            disabled={!subPreview}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition flex-shrink-0"
            style={
              subPreview
                ? { background: 'var(--team-primary, #1a5c2e)', color: 'white' }
                : { background: '#1f2937', color: '#4b5563', cursor: 'not-allowed' }
            }
            onMouseEnter={e => subPreview && (e.currentTarget.style.background = '#236b38')}
            onMouseLeave={e => subPreview && (e.currentTarget.style.background = 'var(--team-primary, #1a5c2e)')}
          >
            Sub ↑
          </button>
        </div>
      </div>

      {/* Scrollable bench list */}
      <div className="overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Active bench players */}
        {activeBench?.length === 0 && absentBench?.length === 0 ? (
          <p className="text-gray-600 text-xs italic px-3 pb-2">
            {isOver ? 'Drop here to bench' : 'All players assigned to this quarter'}
          </p>
        ) : (
          <>
            {activeBench?.length === 0 && (
              <p className="text-gray-600 text-xs italic px-3 py-1.5">
                {isOver ? 'Drop here to bench' : 'All active players on field'}
              </p>
            )}
            {activeBench?.map((playerId, idx) => {
              const player = playerMap[playerId]
              if (!player) return null
              return (
                <SortablePlayerRow
                  key={playerId}
                  player={player}
                  quarterDots={quarterDotsByPlayer[playerId] || ['none','none','none','none']}
                  quartersPlayed={quartersPlayedByPlayer[playerId] || 0}
                  totalPlanned={totalPlannedByPlayer[playerId] ?? 0}
                  isFirst={idx === 0}
                  onToggleAbsent={onToggleAbsent}
                />
              )
            })}

            {/* Absent bench players */}
            {absentBench?.length > 0 && (
              <>
                <div
                  className="px-3 py-1 text-xs font-bold uppercase tracking-widest border-t border-gray-800"
                  style={{ color: '#6b7280', background: '#0d1117' }}
                >
                  Absent ({absentBench.length})
                </div>
                {absentBench.map(playerId => {
                  const player = playerMap[playerId]
                  if (!player) return null
                  return (
                    <div
                      key={playerId}
                      className="flex items-center gap-2 px-3 py-2 border-b border-gray-800/40 last:border-0"
                      style={{ opacity: 0.45 }}
                    >
                      <div className="w-3.5" /> {/* spacer for grip */}
                      <div
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ fontSize: 11, background: '#374151' }}
                      >
                        {player.jersey_number}
                      </div>
                      <span className="flex-1 text-gray-500 text-sm truncate line-through">
                        {player.name}
                      </span>
                      <span className="text-gray-600 text-xs flex-shrink-0">absent</span>
                      <button
                        onClick={() => onToggleAbsent(playerId)}
                        className="w-6 h-6 rounded flex items-center justify-center transition text-green-700 hover:text-green-400 hover:bg-green-900/30"
                        title="Mark present"
                        style={{ opacity: 1 }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
