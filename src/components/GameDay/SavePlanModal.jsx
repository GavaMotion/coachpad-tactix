import { useState } from 'react'
import theme from '../../theme'

/**
 * Modal for naming and saving the current game plan.
 * Props:
 *   onSave   (name: string) => void
 *   onCancel () => void
 */
export default function SavePlanModal({ onSave, onCancel }) {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const [name, setName] = useState(`vs. — ${today}`)

  function handleSubmit(e) {
    e.preventDefault()
    const n = name.trim()
    if (n) onSave(n)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onCancel}
    >
      <div
        className="rounded-2xl p-5 w-full max-w-sm shadow-2xl mx-4 mb-4 sm:mb-0"
        style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-purple)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-white font-bold text-base mb-1">Save Game Plan</h3>
        <p className="text-gray-500 text-xs mb-4">Saves the formation and quarter assignments for reuse.</p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="vs. Lakers — Apr 12"
            className="w-full text-sm rounded-lg px-3 py-2.5 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-green-700 transition mb-4"
            autoFocus
            onFocus={e => e.target.select()}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 text-sm font-semibold py-2.5 rounded-xl text-white transition"
              style={{ background: name.trim() ? 'var(--team-primary, #1a5c2e)' : '#374151', cursor: name.trim() ? 'pointer' : 'not-allowed' }}
            >
              Save Plan
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 text-sm py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
