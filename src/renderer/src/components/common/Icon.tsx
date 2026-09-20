import type { CSSProperties } from 'react'

/** Ícones de linha (traço fino, 24×24) no lugar dos emojis — herdam a cor do texto. */
const PATHS: Record<string, string[]> = {
  film: ['M3 4h18v16H3z', 'M7 4v16', 'M17 4v16', 'M3 9h4', 'M3 15h4', 'M17 9h4', 'M17 15h4'],
  music: ['M9 18V5l12-2v13', 'M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  book: ['M4 19.5V5a2 2 0 0 1 2-2h14v14H6.5A2.5 2.5 0 0 0 4 19.5z', 'M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5'],
  sparkles: ['M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z', 'M19 15v4', 'M17 17h4'],
  play: ['M7 4l13 8-13 8z'],
  pause: ['M8 5v14', 'M16 5v14'],
  'skip-back': ['M19 20L9 12l10-8z', 'M5 19V5'],
  pointer: ['M5 3l14 7-6 2-2 6z'],
  trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
  scissors: ['M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M8.1 8.1L20 20', 'M14.5 9.5L20 4', 'M8.1 15.9L12 12'],
  eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  'eye-off': ['M3 3l18 18', 'M10.6 6.1A9.7 9.7 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9', 'M6.5 6.7C3.7 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1'],
  lock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  unlock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 7.5-2'],
  type: ['M4 7V4h16v3', 'M9 20h6', 'M12 4v16'],
  palette: ['M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.8 0-.5-.2-.9-.5-1.3-.3-.3-.5-.7-.5-1.2 0-1 .8-1.7 1.7-1.7H17a4 4 0 0 0 4-4c0-4.3-4-8-9-8z', 'M7.5 11.5h.01', 'M10 7.5h.01', 'M15 7.5h.01'],
  square: ['M4 4h16v16H4z'],
  image: ['M3 4h18v16H3z', 'M9 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', 'M21 16l-5-5-9 9'],
  x: ['M6 6l12 12', 'M18 6L6 18'],
  plus: ['M12 5v14', 'M5 12h14'],
  pencil: ['M4 20l4-1 11-11-3-3L5 16z', 'M14 6l3 3'],
  radio: ['M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M8.5 8.5a5 5 0 0 0 0 7', 'M15.5 8.5a5 5 0 0 1 0 7', 'M5.6 5.6a9 9 0 0 0 0 12.8', 'M18.4 5.6a9 9 0 0 1 0 12.8'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
  check: ['M5 12l5 5 10-10'],
  chevron: ['M6 9l6 6 6-6'],
  'chevron-up': ['M6 15l6-6 6 6'],
  grip: ['M9 6h.01', 'M15 6h.01', 'M9 12h.01', 'M15 12h.01', 'M9 18h.01', 'M15 18h.01'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  'arrow-right': ['M5 12h14', 'M13 6l6 6-6 6'],
  replay: ['M4 12a8 8 0 1 0 2.5-5.8', 'M4 4v5h5']
}

export type IconName = keyof typeof PATHS

export function Icon({
  name,
  size = 16,
  className,
  style
}: {
  name: IconName
  size?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ flexShrink: 0, ...style }}
    >
      {PATHS[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}
