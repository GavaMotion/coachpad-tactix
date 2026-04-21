import { useDroppable } from '@dnd-kit/core'
import DraggablePlayer from './DraggablePlayer'

const POSITION_RING = {
  GK:  '#f59e0b', // amber
  DEF: '#3b82f6', // blue
  MID: '#a855f7', // purple
  FWD: '#ef4444', // red
}

export default function FieldSlot({ slot, player, slotSizePct, isOver: parentIsOver }) {
  const { isOver, setNodeRef } = useDroppable({ id: `slot-${slot.id}` })

  const active = isOver || parentIsOver

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        left: `${slot.x}%`,
        top: `${slot.y}%`,
        width: `${slotSizePct}%`,
        aspectRatio: '1',
        transform: 'translate(-50%, -50%)',
      }}
    >
      {player ? (
        /* Filled slot – show the player chip */
        <div
          className="w-full h-full rounded-full transition-all"
          style={{
            boxShadow: active
              ? `0 0 0 3px white, 0 0 0 5px ${POSITION_RING[slot.label] || '#fff'}`
              : `0 0 0 2px ${POSITION_RING[slot.label] || '#4b5563'}`,
          }}
        >
          <DraggablePlayer player={player} fromSlot={slot.id} variant="field" />
        </div>
      ) : (
        /* Empty slot – dashed ring with position label */
        <div
          className="w-full h-full rounded-full flex flex-col items-center justify-center transition-all"
          style={{
            border: `2px dashed ${active ? 'white' : (POSITION_RING[slot.label] || 'rgba(255,255,255,0.4)')}`,
            background: active ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.25)',
          }}
        >
          <span
            className="font-bold text-white select-none"
            style={{ fontSize: `clamp(8px, ${slotSizePct * 0.3}%, 13px)`, opacity: active ? 1 : 0.7 }}
          >
            {slot.label}
          </span>
        </div>
      )}
    </div>
  )
}
