import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useApp, applyTeamCSSVars } from '../../contexts/AppContext'
import theme from '../../theme'
import PlayerCard from './PlayerCard'
import AddPlayerModal from './AddPlayerModal'
import BrandingFields from './BrandingFields'

const DIVISIONS = ['8U', '10U', '12U', '14U', '16U', '19U']

// ── Delete confirmation dialog ────────────────────────────────────
function DeleteTeamDialog({ teamName, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onCancel}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        style={{ background: 'var(--bg-panel)', border: '1px solid rgba(153,27,27,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-white font-bold text-base mb-2">Delete team?</h3>
        <p className="text-gray-400 text-sm mb-5">
          This will permanently delete <strong className="text-white">{teamName}</strong> and all its players,
          game plans, and practice plans. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl font-semibold text-white transition"
            style={{ background: '#991b1b' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#b91c1c')}
            onMouseLeave={e => (e.currentTarget.style.background = '#991b1b')}
          >
            Delete
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 transition font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function MyTeamPage({ onSignOut }) {
  const {
    teams,     setTeams,
    team,      setTeam,
    players,   setPlayers,
    setPlayerCount,
    dataLoaded,
    userId,
    deleteTeam: ctxDeleteTeam,
  } = useApp()

  // Team edit state
  const [teamName,    setTeamName]    = useState('')
  const [division,    setDivision]    = useState('10U')
  const [branding,    setBranding]    = useState({
    colorPrimary: null, colorSecondary: null, colorAccent: null,
  })
  const [savingTeam,   setSavingTeam]   = useState(false)
  const [editingTeam,  setEditingTeam]  = useState(false)
  const [showDelete,   setShowDelete]   = useState(false)
  const [deletingTeam, setDeletingTeam] = useState(false)

  // Player modal
  const [showModal,     setShowModal]     = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null)

  const [error, setError] = useState('')

  // ── Derived values (before any early return) ──────────────────
  const teamColors = [team?.color_primary, team?.color_secondary, team?.color_accent].filter(Boolean)

  // Sync edit form when team changes
  function openEditTeam() {
    setTeamName(team?.name || '')
    setDivision(team?.division || '10U')
    setBranding({
      colorPrimary:   team?.color_primary   || null,
      colorSecondary: team?.color_secondary || null,
      colorAccent:    team?.color_accent    || null,
    })
    setEditingTeam(true)
  }

  const noTeam = dataLoaded && !team

  if (!dataLoaded) {
    return (
      <div className="flex items-center justify-center flex-1 bg-gray-950">
        <div className="w-8 h-8 border-4 rounded-full animate-spin"
          style={{ borderColor: 'var(--team-primary, #1a5c2e)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (dataLoaded && !team) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.4)', fontSize: 14, flexDirection: 'column', gap: 8 }}>
        <div>No team found</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Tap the team switcher above to create one</div>
      </div>
    )
  }

  // ── Handlers ─────────────────────────────────────────────────

  async function handleSaveTeam(e) {
    e.preventDefault()
    if (!teamName.trim()) return
    setSavingTeam(true)
    setError('')
    try {
      const { error: saveError } = await supabase
        .from('teams')
        .update({
          name:            teamName.trim(),
          division,
          color_primary:   branding.colorPrimary   || null,
          color_secondary: branding.colorSecondary || null,
          color_accent:    branding.colorAccent    || null,
        })
        .eq('id', team.id)

      if (saveError) throw saveError

      const freshTeam = {
        ...team,
        name:            teamName.trim(),
        division,
        color_primary:   branding.colorPrimary   || null,
        color_secondary: branding.colorSecondary || null,
        color_accent:    branding.colorAccent    || null,
      }
      setTeam(freshTeam)
      setTeams(prev => prev.map(t => t.id === freshTeam.id ? freshTeam : t))
      applyTeamCSSVars(freshTeam)
      setEditingTeam(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingTeam(false)
    }
  }

  async function handleDeleteTeam() {
    setDeletingTeam(true)
    try {
      await ctxDeleteTeam(team.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingTeam(false)
      setShowDelete(false)
    }
  }

  async function handleSavePlayer(playerData) {
    setError('')
    try {
      if (editingPlayer) {
        const { data, error: err } = await supabase
          .from('players').update(playerData).eq('id', editingPlayer.id).select().single()
        if (err) throw err
        setPlayers(prev => prev.map(p => p.id === data.id ? data : p))
      } else {
        const { data, error: err } = await supabase
          .from('players').insert({ ...playerData, team_id: team.id }).select().single()
        if (err) throw err
        setPlayers(prev => [...prev, data].sort((a, b) => a.jersey_number - b.jersey_number))
        setPlayerCount(prev => prev + 1)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setShowModal(false)
      setEditingPlayer(null)
    }
  }

  async function handleDeletePlayer(playerId) {
    setError('')
    try {
      const { error: err } = await supabase.from('players').delete().eq('id', playerId)
      if (err) throw err
      setPlayers(prev => prev.filter(p => p.id !== playerId))
      setPlayerCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      setError(err.message)
    }
  }

  function openEdit(player) {
    setEditingPlayer(player)
    setShowModal(true)
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto bg-gray-950 pb-6">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">

        {error && (
          <div className="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* ── No team ── */}
        {noTeam && (
          <div className="text-center py-16 rounded-2xl border-dashed" style={{ background: 'var(--bg-panel)', border: '1px dashed var(--border-purple)' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--team-primary, #1a5c2e)' }}>
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-white font-semibold text-base mb-1">No team yet</p>
            <p className="text-gray-500 text-sm">Tap the team name in the header to create your first team.</p>
          </div>
        )}

        {/* ── Team section ── */}
        {team && (
          <>
            {editingTeam ? (
              /* ── Edit form ── */
              <div className="rounded-2xl p-6" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-purple)' }}>
                <h2 className="text-xl font-bold text-white mb-1">Edit Team</h2>
                <p className="text-gray-400 text-sm mb-5">Update your team details and branding.</p>
                <form onSubmit={handleSaveTeam} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Team Name</label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                      placeholder="e.g. Green Dragons"
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none transition"
                      onFocus={e => (e.target.style.boxShadow = '0 0 0 2px var(--team-primary, #1a5c2e)')}
                      onBlur={e => (e.target.style.boxShadow = '')}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Division</label>
                    <select
                      value={division}
                      onChange={e => setDivision(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none transition appearance-none"
                      onFocus={e => (e.target.style.boxShadow = '0 0 0 2px var(--team-primary, #1a5c2e)')}
                      onBlur={e => (e.target.style.boxShadow = '')}
                    >
                      {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  {/* Branding fields */}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                      Team Branding
                    </p>
                    <BrandingFields
                      colorPrimary={branding.colorPrimary}
                      colorSecondary={branding.colorSecondary}
                      colorAccent={branding.colorAccent}
                      onChange={b => setBranding(prev => ({ ...prev, ...b }))}
                    />
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingTeam(false)}
                      className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white transition font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingTeam}
                      className="flex-1 py-2.5 rounded-lg font-semibold text-white transition disabled:opacity-60"
                      style={{ backgroundColor: 'var(--team-primary, #1a5c2e)' }}
                    >
                      {savingTeam ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* ── Team banner ── */
              <div className="rounded-2xl overflow-hidden"
                style={{ background: `linear-gradient(135deg, var(--team-primary, #1a5c2e) 0%, color-mix(in srgb, var(--team-primary, #1a5c2e) 70%, #000) 100%)` }}>

                {/* Badge + name row */}
                <div className="flex flex-col items-center pt-8 pb-5 px-5">
                  {/* Initials circle */}
                  <div style={{
                    marginBottom: 12,
                    width: 80, height: 80, borderRadius: '50%',
                    background: team?.color_primary || '#1a5c2e',
                    border: '2px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 32, fontWeight: 700, color: '#fff',
                  }}>
                    {team?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <p className="text-green-200 text-xs font-medium uppercase tracking-widest mb-1">
                    {team.division} Division
                  </p>
                  <h2 className="text-2xl font-bold text-white text-center">{team.name}</h2>
                  <p className="text-green-300 text-sm mt-1">
                    {players.length} player{players.length !== 1 ? 's' : ''}
                  </p>

                  {/* Color swatches */}
                  {teamColors.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      {teamColors.map((c, i) => (
                        <div key={i} style={{
                          width: 16, height: 16, borderRadius: '50%', background: c,
                          border: '1.5px solid rgba(255,255,255,0.35)',
                        }} title={c} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Edit + Delete buttons row */}
                <div style={{ display: 'flex', gap: 0, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                  <button
                    onClick={openEditTeam}
                    style={{
                      flex: 1, padding: '10px', background: 'none', border: 'none',
                      color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      borderRight: '1px solid rgba(255,255,255,0.12)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Team
                  </button>
                  {teams.length > 0 && (
                    <button
                      onClick={() => setShowDelete(true)}
                      style={{
                        flex: 1, padding: '10px', background: 'none', border: 'none',
                        color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; e.currentTarget.style.color = '#fca5a5' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Team
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Roster ── */}
            {!editingTeam && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-white">Roster</h3>
                  <button
                    onClick={() => { setEditingPlayer(null); setShowModal(true) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition"
                    style={{ backgroundColor: 'var(--team-primary, #1a5c2e)' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Player
                  </button>
                </div>

                {players.length === 0 ? (
                  <div className="text-center py-12 rounded-2xl border-dashed" style={{ background: 'var(--bg-panel)', border: '1px dashed var(--border-purple)' }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-gray-800">
                      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 text-sm">No players yet.</p>
                    <p className="text-gray-500 text-xs mt-1">Tap "Add Player" to build your roster.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {players.map(player => (
                      <PlayerCard
                        key={player.id}
                        player={player}
                        onEdit={openEdit}
                        onDelete={handleDeletePlayer}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
        {onSignOut && (
          <div style={{ paddingTop: 8, paddingBottom: 8, textAlign: 'center' }}>
            <button
              onClick={onSignOut}
              style={{
                fontSize: 13, color: 'rgba(248,113,113,0.6)', background: 'none',
                border: 'none', cursor: 'pointer', padding: '6px 16px', borderRadius: 8,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(248,113,113,0.6)')}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showModal && (
        <AddPlayerModal
          initial={editingPlayer}
          onSave={handleSavePlayer}
          onClose={() => { setShowModal(false); setEditingPlayer(null) }}
        />
      )}

      {showDelete && (
        <DeleteTeamDialog
          teamName={team?.name}
          onConfirm={handleDeleteTeam}
          onCancel={() => setShowDelete(false)}
        />
      )}

      {deletingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-8 h-8 border-4 rounded-full animate-spin"
            style={{ borderColor: 'var(--team-primary, #1a5c2e)', borderTopColor: 'transparent' }} />
        </div>
      )}
    </div>
  )
}
