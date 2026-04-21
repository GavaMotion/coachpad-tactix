/** Formats integer seconds → "M:SS" or "MM:SS" */
export function fmtTime(totalSec) {
  const s = Math.floor(Math.max(0, totalSec))
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m}:${ss.toString().padStart(2, '0')}`
}
