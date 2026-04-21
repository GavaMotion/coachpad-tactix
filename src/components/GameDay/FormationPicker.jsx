/**
 * Formation picker dropdown.
 * Props:
 *   formations   Array of formation objects for the current division
 *   selectedId   Currently selected formation id
 *   onChange     (id: string) => void
 */
export default function FormationPicker({ formations, selectedId, onChange }) {
  if (!formations || formations.length <= 1) return null
  return (
    <select
      value={selectedId || ''}
      onChange={e => onChange(e.target.value)}
      className="text-xs rounded px-2 py-1 cursor-pointer transition"
      style={{
        background: '#1f2937',
        color: '#d1d5db',
        border: '1px solid #374151',
        maxWidth: 140,
        outline: 'none',
      }}
      title="Change formation"
    >
      {formations.map(f => (
        <option key={f.id} value={f.id}>{f.label}</option>
      ))}
    </select>
  )
}
