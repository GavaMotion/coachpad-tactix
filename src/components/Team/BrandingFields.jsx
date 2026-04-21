import { useRef } from 'react'

const PRESETS = [
  '#ef4444', '#991b1b', '#3b82f6', '#1e3a8a', '#38bdf8',
  '#22c55e', '#1a5c2e', '#facc15', '#f97316', '#a855f7',
  '#111827', '#f9fafb',
]

const labelStyle = {
  display:       'block',
  fontSize:      11,
  fontWeight:    600,
  color:         '#9ca3af',
  marginBottom:  5,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

function ColorPicker({ label, value, onChange, required }) {
  const nativeRef = useRef(null)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <label style={labelStyle}>{label}</label>
        {value && (
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            background: value, border: '1.5px solid rgba(255,255,255,0.2)', flexShrink: 0,
          }} />
        )}
        {!required && value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}
            title="Clear color"
          >✕</button>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
        {PRESETS.map(hex => (
          <button
            key={hex}
            type="button"
            onClick={() => onChange(hex)}
            style={{
              width: 22, height: 22, borderRadius: '50%', background: hex,
              border: value === hex ? '2.5px solid #fff' : '1.5px solid rgba(255,255,255,0.12)',
              cursor: 'pointer', flexShrink: 0,
              boxShadow: value === hex ? `0 0 0 2px ${hex}` : 'none',
              transition: 'transform 0.08s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.18)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            title={hex}
          />
        ))}

        <div style={{ position: 'relative', width: 22, height: 22 }}>
          <div
            onClick={() => nativeRef.current?.click()}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              background: value && !PRESETS.includes(value)
                ? value
                : 'conic-gradient(red,yellow,lime,aqua,blue,magenta,red)',
              border: '1.5px solid rgba(255,255,255,0.12)',
              cursor: 'pointer', flexShrink: 0,
              boxShadow: value && !PRESETS.includes(value) ? `0 0 0 2px ${value}` : 'none',
            }}
            title="Custom color"
          />
          <input
            ref={nativeRef}
            type="color"
            value={value || '#1a5c2e'}
            onChange={e => onChange(e.target.value)}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0, top: 0, left: 0 }}
          />
        </div>
      </div>
    </div>
  )
}

export default function BrandingFields({ colorPrimary, colorSecondary, colorAccent, onChange }) {
  function setColor(field, val) {
    onChange({ colorPrimary, colorSecondary, colorAccent, [field]: val })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ColorPicker
        label="Primary color"
        value={colorPrimary}
        onChange={val => setColor('colorPrimary', val)}
        required
      />
      <ColorPicker
        label="Secondary color (optional)"
        value={colorSecondary}
        onChange={val => setColor('colorSecondary', val)}
        required={false}
      />
      <ColorPicker
        label="Accent color (optional)"
        value={colorAccent}
        onChange={val => setColor('colorAccent', val)}
        required={false}
      />
    </div>
  )
}
