import { useId, type ReactNode } from 'react'
import { resolveMaterialVisual, type MaterialFinish, type MaterialVisualFamily } from './materialCatalog'
import './material-visual.css'

type Props = {
  code: string
  description?: string | null
  compact?: boolean
}

function threadLines(start: number, end: number) {
  return Array.from({ length: Math.max(4, Math.floor((end - start) / 8)) }, (_, index) => {
    const x = start + index * 8
    return <path key={x} d={`M${x} 72l7 12M${x} 84l7-12`} className="material-thread" />
  })
}

function finishFill(finish: MaterialFinish, metalId: string, goldId: string) {
  return finish === 'bichromate' ? `url(#${goldId})` : `url(#${metalId})`
}

function washer(family: MaterialVisualFamily, fill: string, maskId: string) {
  if (family === 'spring-washer') {
    return <g transform="rotate(-12 80 60)">
      <ellipse cx="80" cy="60" rx="45" ry="28" fill="none" stroke={fill} strokeWidth="15" strokeDasharray="210 75" strokeLinecap="butt"/>
      <path d="M38 42l12 10M107 83l13 9" className="material-edge"/>
    </g>
  }
  if (family === 'serrated-washer') {
    const points = Array.from({ length: 40 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 40
      const radiusX = index % 2 ? 49 : 57
      const radiusY = index % 2 ? 30 : 35
      return `${80 + Math.cos(angle) * radiusX},${60 + Math.sin(angle) * radiusY}`
    }).join(' ')
    return <g mask={`url(#${maskId})`}><polygon points={points} fill={fill}/><ellipse cx="80" cy="58" rx="49" ry="30" fill="none" className="material-highlight"/></g>
  }
  return <g mask={`url(#${maskId})`}>
    <ellipse cx="80" cy="61" rx="55" ry="34" fill={fill}/>
    <ellipse cx="80" cy="56" rx="48" ry="27" fill="none" className="material-highlight"/>
    <path d="M27 61c7 25 33 34 53 34s47-9 53-34" className="material-shadow-line"/>
  </g>
}

function screw(family: MaterialVisualFamily, fill: string) {
  const countersunk = family.includes('countersunk')
  const selfTapping = family.includes('self-tapping')
  const socket = family === 'socket-screw' || family === 'button-socket-screw'
  const button = family === 'button-socket-screw'
  const hex = family === 'hex-bolt'
  const cylindricalPhillips = family === 'cylindrical-phillips-screw'
  return <g>
    <path d={selfTapping ? 'M61 71H136L150 78 136 86H61Z' : 'M58 71H144V86H58Z'} fill={fill} className="material-outline"/>
    {threadLines(64, 140)}
    {hex ? <path d="M22 55l14-10h25l13 10v40L61 105H36L22 95Z" fill={fill} className="material-outline"/> :
      countersunk ? <path d="M20 53h47l-9 33H29Z" fill={fill} className="material-outline"/> :
      (socket && !button) || cylindricalPhillips ? <path d="M24 44h40v52H24Z" rx="5" fill={fill} className="material-outline"/> :
      <path d={button ? 'M18 71c1-23 13-32 29-32s28 9 29 32v15H18Z' : 'M16 65c2-22 15-31 31-31s29 9 31 31v21H16Z'} fill={fill} className="material-outline"/>}
    {hex ? <path d="M29 57h38M29 92h38" className="material-highlight"/> :
      socket ? <path d="M34 57l10-7 10 7v13l-10 7-10-7Z" className="material-drive"/> :
      <path d="M32 57h30M47 44v27" className="material-drive"/>}
    <path d="M65 75h74" className="material-highlight"/>
  </g>
}

function nut(fill: string, maskId: string) {
  return <g mask={`url(#${maskId})`}>
    <path d="M33 42l29-18h37l28 18v36L99 96H62L33 78Z" fill={fill} className="material-outline"/>
    <path d="M42 44h76M42 77h76" className="material-highlight"/>
  </g>
}

function retainingRing(fill: string) {
  return <g transform="rotate(-8 80 60)">
    <path d="M113 83A43 29 0 1 1 113 37" fill="none" stroke={fill} strokeWidth="14" strokeLinecap="round"/>
    <circle cx="116" cy="34" r="7" fill={fill}/><circle cx="116" cy="86" r="7" fill={fill}/>
    <circle cx="116" cy="34" r="2.6" className="material-hole"/><circle cx="116" cy="86" r="2.6" className="material-hole"/>
  </g>
}

function terminal(family: MaterialVisualFamily, finish: MaterialFinish, metalId: string) {
  const sleeve = finish === 'yellow' ? '#f2c84b' : '#2878cf'
  if (family === 'ring-terminal') return <g>
    <path d="M19 45h48l25 12v24L67 93H19Z" fill={`url(#${metalId})`} className="material-outline"/>
    <circle cx="43" cy="69" r="14" className="material-hole"/>
    <path d="M84 51h51c7 0 11 6 11 14v8c0 8-4 14-11 14H84Z" fill={sleeve} className="material-outline"/>
    <path d="M94 56v26M132 56v26" className="material-sleeve-line"/>
  </g>
  if (family === 'spade-terminal') return <g>
    <path d="M17 43h53v15H38v22h32v15H17Z" fill={`url(#${metalId})`} className="material-outline"/>
    <path d="M63 50h69c9 0 14 7 14 17v5c0 10-5 17-14 17H63Z" fill={sleeve} className="material-outline"/>
    <path d="M83 55v29M130 55v29" className="material-sleeve-line"/>
  </g>
  return <g>
    <path d="M17 64l69-9v28l-69-8Z" fill={`url(#${metalId})`} className="material-outline"/>
    <path d="M73 49h60c9 0 14 7 14 17v6c0 10-5 17-14 17H73Z" fill={sleeve} className="material-outline"/>
    <path d="M91 55v28M132 55v28" className="material-sleeve-line"/>
  </g>
}

function rivnut(closed: boolean, fill: string, serrated = true) {
  return <g>
    <ellipse cx="38" cy="61" rx="25" ry="20" fill={fill} className="material-outline"/>
    <ellipse cx="38" cy="61" rx="12" ry="9" className="material-hole"/>
    <path d="M39 41h75c13 0 24 9 24 20s-11 20-24 20H39Z" fill={fill} className="material-outline"/>
    {serrated && <path d="M59 44v34M68 44v34M77 44v34M86 44v34M95 44v34" className="material-knurl"/>}
    {closed ? <path d="M116 42c28 1 33 37 0 39Z" fill={fill} className="material-outline"/> : <ellipse cx="117" cy="61" rx="13" ry="10" className="material-hole"/>}
  </g>
}

function groundingStud(fill: string) {
  return <g>
    <path d="M16 72h80v16H16Z" fill={fill} className="material-outline"/>{threadLines(20, 92)}
    <path d="M96 49h18v62H96Z" fill={fill} className="material-outline"/>
    <path d="M105 42l8 7H97Z" fill={fill}/><path d="M91 111h28l8 8H83Z" fill={fill}/>
    <path d="M104 54v50" className="material-highlight"/>
  </g>
}

function screwWasherSet(fill: string, maskId: string) {
  return <g>
    <g transform="translate(0 -4)">{screw('pan-screw', fill)}</g>
    <g transform="translate(11 13) scale(.45)" mask={`url(#${maskId})`}><ellipse cx="80" cy="61" rx="55" ry="34" fill={fill}/></g>
    <g transform="translate(26 25) scale(.28)">{washer('spring-washer', fill, maskId)}</g>
  </g>
}

function rivetPack() {
  return <g>
    <path d="M34 21h92l10 83c1 8-5 13-14 13H38c-9 0-15-5-14-13Z" fill="rgba(134,151,174,.16)" className="material-pack"/>
    <path d="M39 35h82" className="material-pack-seal"/>
    {Array.from({ length: 12 }, (_, index) => <g key={index} transform={`translate(${45 + (index % 4) * 22} ${49 + Math.floor(index / 4) * 22}) scale(.22)`}>{screw('self-tapping-pan-screw', '#aeb7c3')}</g>)}
    <text x="80" y="109" textAnchor="middle" className="material-pack-label">20 UN</text>
  </g>
}

function unavailable() {
  return <g>
    <rect x="24" y="22" width="112" height="76" rx="13" className="material-unavailable-frame"/>
    <path d="M43 80l22-21 14 13 15-18 23 26" className="material-unavailable-line"/>
    <circle cx="111" cy="43" r="7" className="material-unavailable-line"/>
    <text x="80" y="113" textAnchor="middle" className="material-unavailable-label">SEM REFERÊNCIA</text>
  </g>
}

function visualFor(family: MaterialVisualFamily, finish: MaterialFinish, fill: string, metalId: string, maskId: string): ReactNode {
  if (family === 'flat-washer' || family === 'spring-washer' || family === 'serrated-washer') return washer(family, fill, maskId)
  if (family === 'retaining-ring') return retainingRing(fill)
  if (family === 'hex-nut') return nut(fill, maskId)
  if (family === 'ring-terminal' || family === 'spade-terminal' || family === 'pin-terminal') return terminal(family, finish, metalId)
  if (family === 'rivnut-open' || family === 'rivnut-closed' || family === 'rivnut-smooth-open' || family === 'rivnut-smooth-closed') {
    const closed = family === 'rivnut-closed' || family === 'rivnut-smooth-closed'
    const serrated = family === 'rivnut-open' || family === 'rivnut-closed'
    return rivnut(closed, fill, serrated)
  }
  if (family === 'grounding-stud') return groundingStud(fill)
  if (family === 'screw-washer-set') return screwWasherSet(fill, maskId)
  if (family === 'rivet-pack') return rivetPack()
  if (family === 'unavailable') return unavailable()
  return screw(family, fill)
}

export function MaterialVisual({ code, description, compact = false }: Props) {
  const spec = resolveMaterialVisual(code, description)
  const unique = useId().replace(/:/g, '')
  if (!spec) return null
  const metalId = `metal-${unique}`
  const goldId = `gold-${unique}`
  const cutoutId = `cutout-${unique}`
  const fill = finishFill(spec.finish, metalId, goldId)
  const label = spec.verified
    ? `Modelo técnico de ${spec.sizeLabel ?? code}, ${spec.finishLabel}, baseado no descritivo cadastrado`
    : spec.family === 'rivet-pack'
      ? 'Representação da embalagem; a geometria da peça não está definida no descritivo'
      : 'Sem imagem: o descritivo não informa geometria ou dimensões suficientes'

  return <figure className={`material-visual ${compact ? 'material-visual--compact' : ''} ${spec.verified ? '' : 'material-visual--uncertain'}`} title={label}>
    <svg viewBox="0 0 160 130" role="img" aria-label={label}>
      <defs>
        <linearGradient id={metalId} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f8fafc"/><stop offset=".22" stopColor="#9ea8b4"/><stop offset=".48" stopColor="#eef2f6"/><stop offset=".72" stopColor="#737f8c"/><stop offset="1" stopColor="#c8d0d8"/></linearGradient>
        <linearGradient id={goldId} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1a8"/><stop offset=".25" stopColor="#c89f33"/><stop offset=".52" stopColor="#f4dc76"/><stop offset=".78" stopColor="#9a7022"/><stop offset="1" stopColor="#d7b94d"/></linearGradient>
        <mask id={cutoutId}><rect width="160" height="130" fill="white"/><ellipse cx="80" cy="60" rx="23" ry="14" fill="black"/></mask>
      </defs>
      {visualFor(spec.family, spec.finish, fill, metalId, cutoutId)}
    </svg>
    <figcaption><span>{spec.sizeLabel ?? (spec.verified ? 'Modelo técnico' : 'Referência insuficiente')}</span><small>{spec.finishLabel}</small></figcaption>
  </figure>
}
