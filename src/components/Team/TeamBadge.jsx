import { getContrastTextColor } from '../../lib/utils'

export default function TeamBadge({ team, size = 48, style }) {
  const primary = team?.color_primary || 'var(--team-primary, #1a5c2e)'
  const textColor = team?.color_primary
    ? getContrastTextColor(team.color_primary)
    : 'var(--team-primary-text, #fff)'
  const initials = team?.name
    ? team.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?'

  return (
    <div style={{
      width:          size,
      height:         size,
      borderRadius:   '50%',
      flexShrink:     0,
      background:     primary,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      ...style,
    }}>
      <span style={{
        color:         textColor,
        fontWeight:    800,
        fontSize:      size * 0.33,
        letterSpacing: '-0.02em',
        userSelect:    'none',
        lineHeight:    1,
      }}>
        {initials}
      </span>
    </div>
  )
}
