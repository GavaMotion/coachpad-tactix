import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

/**
 * A draggable player chip.
 * variant='field'  → compact circle, fills its slot
 * variant='bench'  → pill card shown in the bench tray
 */
export default function DraggablePlayer({ player, fromSlot, variant = 'bench' }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `player-${player.id}`,
    data: { playerId: player.id, fromSlot },
  })

  const base = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.2 : 1,
    touchAction: 'none',
  }

  if (variant === 'field') {
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className="w-full h-full flex flex-col items-center justify-center rounded-full cursor-grab active:cursor-grabbing select-none"
        style={{
          ...base,
          background: 'linear-gradient(145deg, var(--team-primary, #1a5c2e), #134522)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}
      >
        <span className="text-white font-bold leading-none" style={{ fontSize: 'clamp(9px, 3.2vw, 15px)' }}>
          #{player.jersey_number}
        </span>
        <span
          className="text-green-200 font-medium leading-none mt-0.5 px-1 w-full truncate text-center"
          style={{ fontSize: 'clamp(7px, 2.4vw, 11px)' }}
        >
          {player.name.split(' ')[0]}
        </span>
      </div>
    )
  }

  // bench variant
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl cursor-grab active:cursor-grabbing select-none border border-gray-700 bg-gray-800 hover:border-green-700 transition-colors"
      style={{
        ...base,
        width: 64,
        height: 72,
      }}
    >
      <span className="text-white font-bold" style={{ fontSize: 18 }}>
        {player.jersey_number}
      </span>
      <span
        className="text-gray-300 leading-tight mt-0.5 px-1 w-full truncate text-center"
        style={{ fontSize: 10 }}
      >
        {player.name.split(' ')[0]}
      </span>
    </div>
  )
}
