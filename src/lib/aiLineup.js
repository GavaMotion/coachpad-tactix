// Maps formation slot labels → player position IDs (ordered by preference)
const SLOT_COMPAT = {
  GK:  ['GK'],
  DEF: ['CB', 'RB/LB'],
  CB:  ['CB', 'RB/LB'],
  RB:  ['RB/LB', 'CB'],
  LB:  ['RB/LB', 'CB'],
  SW:  ['CB', 'RB/LB'],
  CDM: ['CDM', 'CM'],
  DM:  ['CDM', 'CM'],
  MID: ['CM', 'CDM', 'CAM', 'RM/LM'],
  CM:  ['CM', 'CDM', 'CAM', 'RM/LM'],
  CAM: ['CAM', 'CM', 'RM/LM', 'RW/LW'],
  AM:  ['CAM', 'CM'],
  RM:  ['RM/LM', 'CM', 'RW/LW'],
  LM:  ['RM/LM', 'CM', 'RW/LW'],
  RW:  ['RW/LW', 'RM/LM', 'ST'],
  LW:  ['RW/LW', 'RM/LM', 'ST'],
  FWD: ['ST', 'RW/LW', 'CAM'],
  ST:  ['ST', 'RW/LW', 'CAM'],
  SS:  ['ST', 'RW/LW'],
  CF:  ['ST', 'CAM', 'RW/LW'],
}

function getEffectiveRating(player, slotLabel) {
  const ratings   = player.position_ratings || {}
  const positions = player.positions || []
  const compat    = SLOT_COMPAT[slotLabel] || [slotLabel]

  for (let i = 0; i < compat.length; i++) {
    const pos = compat[i]
    if (positions.includes(pos)) {
      if (ratings[pos] !== undefined && ratings[pos] > 0) {
        return i === 0 ? ratings[pos] : ratings[pos] * 0.7
      }
      return i === 0
        ? Math.floor(Math.random() * 3) + 1
        : Math.floor(Math.random() * 2) + 1
    }
  }
  return 0 // no position match — handled by Pass 2
}

function scorePlayerForSlot(player, slotLabel) {
  return getEffectiveRating(player, slotLabel) * 10
}

const MIN_QUARTERS = 3

// Sort order for slot labels — GK first, then defenders, midfielders, forwards
const POSITION_ORDER = ['GK', 'CB', 'RB', 'LB', 'SW', 'CDM', 'DM', 'CM', 'CAM', 'AM', 'RM', 'LM', 'RW', 'LW', 'FWD', 'ST', 'SS', 'CF', 'DEF', 'MID']

export function generateAILineup({
  players,
  absentPlayerIds,
  absentQuarters = {},
  formation,
  quarters = [1, 2, 3, 4],
}) {
  const available = players.filter(p => !absentPlayerIds.has(p.id))
  const slots = formation.slots || []

  const sortedSlots = [...slots].sort((a, b) => {
    const ai = POSITION_ORDER.indexOf(a.label)
    const bi = POSITION_ORDER.indexOf(b.label)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  const quarterCount = {}
  available.forEach(p => { quarterCount[p.id] = 0 })

  const result = {}
  const allOutOfPosition = []
  const allWarnings = []

  function generateQuarterLineup(quarterNum) {
    const assignment   = {}
    const outOfPosition = []
    const usedPlayerIds = new Set()

    const quarterAvailable = available.filter(p => {
      const restricted = absentQuarters[p.id] || []
      return !restricted.includes(quarterNum)
    })

    // PASS 1 — fill slots with position-compatible players
    for (const slot of sortedSlots) {
      let bestPlayer = null
      let bestScore  = -1

      for (const player of quarterAvailable) {
        if (usedPlayerIds.has(player.id)) continue
        const score = scorePlayerForSlot(player, slot.label)
        if (score <= 0) continue // no position match — skip in pass 1

        const minuteBonus = Math.max(0, MIN_QUARTERS - quarterCount[player.id]) * 3
        const total = score + minuteBonus

        if (total > bestScore) {
          bestScore  = total
          bestPlayer = player
        }
      }

      if (bestPlayer) {
        assignment[slot.id] = bestPlayer.id
        usedPlayerIds.add(bestPlayer.id)
      }
    }

    // PASS 2 — fill any remaining empty slots with whoever is available
    for (const slot of sortedSlots) {
      if (assignment[slot.id]) continue

      let bestPlayer = null
      let bestScore  = -1

      for (const player of quarterAvailable) {
        if (usedPlayerIds.has(player.id)) continue
        const minuteBonus = Math.max(0, MIN_QUARTERS - quarterCount[player.id]) * 5
        const score = minuteBonus + 1

        if (score > bestScore) {
          bestScore  = score
          bestPlayer = player
        }
      }

      if (bestPlayer) {
        assignment[slot.id] = bestPlayer.id
        usedPlayerIds.add(bestPlayer.id)
        outOfPosition.push({
          playerId:     bestPlayer.id,
          playerName:   bestPlayer.name,
          jerseyNumber: bestPlayer.jersey_number,
          slotLabel:    slot.label,
          quarter:      quarterNum,
        })
      }
      // No player available at all — slot stays empty (squad too small)
    }

    return { assignment, outOfPosition }
  }

  for (const q of quarters) {
    const { assignment, outOfPosition } = generateQuarterLineup(q)

    Object.values(assignment).forEach(pid => {
      if (pid && quarterCount[pid] !== undefined) quarterCount[pid]++
    })

    result[q] = assignment
    allOutOfPosition.push(...outOfPosition)

    const filledCount = Object.keys(assignment).length
    if (filledCount < slots.length) {
      allWarnings.push(
        `Q${q}: ${slots.length - filledCount} position(s) could not be filled — not enough players`
      )
    }
  }

  // 3-quarter rule warnings (only when planning all 4)
  if (quarters.length === 4) {
    available.forEach(p => {
      const restricted = (absentQuarters[p.id] || []).length
      if (quarterCount[p.id] < MIN_QUARTERS && restricted < 2) {
        allWarnings.push(`${p.name.split(' ')[0]} only plays ${quarterCount[p.id]} quarter(s)`)
      }
    })
  }

  return {
    lineup:        result,
    quarterCount,
    warnings:      allWarnings,
    outOfPosition: allOutOfPosition,
  }
}
