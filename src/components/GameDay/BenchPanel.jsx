import { useDroppable } from '@dnd-kit/core'
import DraggablePlayer from './DraggablePlayer'

export default function BenchPanel({ players }) {
  const { isOver, setNodeRef } = useDroppable({ id: 'bench' })

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col"
      style={{
        minHeight: 100,
        background: isOver ? 'rgba(26,92,46,0.35)' : 'rgba(17,24,39,0.95)',
        borderTop: `2px solid ${isOver ? 'var(--team-primary, #1a5c2e)' : '#1f2937'}`,
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {/* Label row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
          Bench
        </span>
        <span className="text-xs text-gray-500">
          {players.length} player{players.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Scrollable player tray */}
      <div
        className="flex gap-2 px-3 pb-3 overflow-x-auto"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
      >
        {players.length === 0 ? (
          <p className="text-gray-600 text-sm italic self-center px-1 py-2">
            All players are on the field
          </p>
        ) : (
          players.map(player => (
            <DraggablePlayer
              key={player.id}
              player={player}
              fromSlot="bench"
              variant="bench"
            />
          ))
        )}
      </div>
    </div>
  )
}
