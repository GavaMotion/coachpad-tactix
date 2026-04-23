// Position compatibility — slot label → player position IDs (ordered by preference)
// Player position IDs come from AddPlayerModal: GK, CB, RB/LB, CDM, CM, CAM, RM/LM, RW/LW, ST
const SLOT_COMPAT = {
  GK:    ['GK'],
  CB:    ['CB', 'RB/LB'],
  RB:    ['RB/LB', 'CB'],
  LB:    ['RB/LB', 'CB'],
  'RB/LB': ['RB/LB', 'CB'],
  DEF:   ['CB', 'RB/LB'],
  SW:    ['CB', 'RB/LB'],
  CDM:   ['CDM', 'CM', 'CB'],
  DM:    ['CDM', 'CM'],
  CM:    ['CM', 'CDM', 'CAM'],
  MID:   ['CM', 'CDM', 'CAM', 'RM/LM'],
  CAM:   ['CAM', 'CM', 'RM/LM', 'RW/LW'],
  AM:    ['CAM', 'CM'],
  RM:    ['RM/LM', 'RW/LW', 'CM'],
  LM:    ['RM/LM', 'RW/LW', 'CM'],
  'RM/LM': ['RM/LM', 'RW/LW', 'CM'],
  RW:    ['RW/LW', 'RM/LM', 'ST', 'CAM'],
  LW:    ['RW/LW', 'RM/LM', 'ST', 'CAM'],
  'RW/LW': ['RW/LW', 'RM/LM', 'ST', 'CAM'],
  ST:    ['ST', 'RW/LW', 'CAM'],
  FWD:   ['ST', 'RW/LW', 'CAM'],
  SS:    ['ST', 'RW/LW'],
  CF:    ['ST', 'CAM', 'RW/LW'],
}

function getRating(player, slotLabel) {
  const ratings   = player.position_ratings || {}
  const positions = player.positions        || []
  const compat    = SLOT_COMPAT[slotLabel]  || [slotLabel]

  for (let i = 0; i < compat.length; i++) {
    const pos = compat[i]
    if (positions.includes(pos)) {
      const rating  = ratings[pos] > 0 ? ratings[pos] : (Math.floor(Math.random() * 3) + 1)
      const penalty = i === 0 ? 1 : 0.7
      return rating * penalty
    }
  }
  return 0 // no match at all
}

const MIN_QUARTERS = 3

const POS_ORDER = ['GK', 'CB', 'RB', 'LB', 'RB/LB', 'SW', 'CDM', 'DM', 'CM', 'CAM', 'AM', 'RM', 'LM', 'RM/LM', 'RW', 'LW', 'RW/LW', 'FWD', 'ST', 'SS', 'CF', 'DEF', 'MID']

export function generateAILineup({
  players,
  absentPlayerIds = new Set(),
  absentQuarters  = {},
  formation,
  quarters        = [1, 2, 3, 4],
}) {
  const slots        = formation.slots || []
  const allAvailable = players.filter(p => !absentPlayerIds.has(p.id))

  const sortedSlots = [...slots].sort((a, b) => {
    const ai = POS_ORDER.indexOf(a.label)
    const bi = POS_ORDER.indexOf(b.label)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  const quarterCount = {}
  allAvailable.forEach(p => { quarterCount[p.id] = 0 })

  const lineup        = {}
  const outOfPosition = []
  const warnings      = []

  for (const q of quarters) {
    const available = allAvailable.filter(p => {
      const restricted = absentQuarters[p.id] || []
      return !restricted.includes(q)
    })

    const assignment = {}
    const usedIds    = new Set()

    function pickBest(candidates) {
      let best      = null
      let bestScore = -Infinity
      for (const p of candidates) {
        if (usedIds.has(p.id)) continue
        // score already incorporates rating; add minute-fairness bonus
        const minuteBonus = Math.max(0, MIN_QUARTERS - quarterCount[p.id]) * 2
        const total = minuteBonus // caller pre-scores for position; just rank by minutes here
        if (total > bestScore) { bestScore = total; best = p }
      }
      return best
    }

    function pickBestForSlot(slot, candidates) {
      let best      = null
      let bestScore = -Infinity
      for (const p of candidates) {
        if (usedIds.has(p.id)) continue
        const rating      = getRating(p, slot.label)
        const minuteBonus = Math.max(0, MIN_QUARTERS - quarterCount[p.id]) * 2
        const total       = rating * 10 + minuteBonus
        if (total > bestScore) { bestScore = total; best = p }
      }
      return best
    }

    // PASS 1 — assign players with a position match
    for (const slot of sortedSlots) {
      const matched = available.filter(p => getRating(p, slot.label) > 0)
      const best    = pickBestForSlot(slot, matched)
      if (best) {
        assignment[slot.id] = best.id
        usedIds.add(best.id)
      }
    }

    // PASS 2 — fill remaining slots with whoever is left (out-of-position)
    for (const slot of sortedSlots) {
      if (assignment[slot.id]) continue

      const remaining = available.filter(p => !usedIds.has(p.id))
      if (remaining.length === 0) {
        warnings.push(`Q${q}: not enough players to fill ${slot.label}`)
        continue
      }

      // Pick player who needs the most minutes
      const best = remaining.sort((a, b) => quarterCount[a.id] - quarterCount[b.id])[0]

      assignment[slot.id] = best.id
      usedIds.add(best.id)

      outOfPosition.push({
        playerId:     best.id,
        playerName:   best.name,
        jerseyNumber: best.jersey_number,
        slotLabel:    slot.label,
        quarter:      q,
      })
    }

    // Update quarter counts after filling this quarter
    Object.values(assignment).forEach(pid => {
      if (quarterCount[pid] !== undefined) quarterCount[pid]++
    })

    lineup[q] = assignment
  }

  // Warn about players with fewer than 3 quarters (all-4 mode only)
  if (quarters.length === 4) {
    allAvailable.forEach(p => {
      const restricted   = (absentQuarters[p.id] || []).length
      const maxPossible  = 4 - restricted
      if (quarterCount[p.id] < Math.min(MIN_QUARTERS, maxPossible)) {
        warnings.push(`${p.name} only plays ${quarterCount[p.id]} quarter(s)`)
      }
    })
  }

  return { lineup, quarterCount, warnings, outOfPosition }
}
