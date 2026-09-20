import type { EffectId } from '@shared/types/project'

/**
 * Presets de animação de entrada/saída pra texto (aba Efeitos). Cada preset é
 * uma função pura de "phase" (0 = escondido na borda do clipe, 1 = totalmente
 * visível no meio dele) — nada de keyframe manual, o efeito já toca sozinho
 * perto do início e do fim do segmento.
 */

export interface EffectOverlay {
  x: number
  y: number
  scale: number
  rotation: number
  opacity: number
  blur: number
  /** Recorte tipo "cortina" revelando o texto (efeitos de máscara). */
  clipPath?: string
  /** Tracking extra somado ao letterSpacing normal do texto, em px. */
  letterSpacing?: number
  /** Cor que substitui a do texto enquanto o efeito está agindo (ex.: ponta da caneta). */
  color?: string
  textShadow?: string
}

export const IDENTITY_OVERLAY: EffectOverlay = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, blur: 0 }

export interface CharResult {
  overlay: EffectOverlay
  /** Só efeitos tipo "decode" substituem o caractere exibido (glitch/scramble). */
  charOverride?: string
}

export interface EffectDef {
  id: EffectId
  label: string
  description: string
  mode: 'block' | 'chars'
  /** Duração da transição de entrada (e de saída, espelhada), em segundos. */
  duration: number
  overlay?: (phase: number) => EffectOverlay
  charOverlay?: (phase: number, charIndex: number, charCount: number, char: string) => CharResult
}

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t))
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/** "Back ease": passa um pouco do alvo e volta — a molinha do overshoot. */
function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  const x = clamp01(t)
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}

/**
 * Calcula a phase (0-1) de um layer dentro do segmento atual: sobe de 0 a 1
 * ao entrar, fica em 1 no meio, desce de volta a 0 ao sair.
 */
export function computeEffectPhase(
  playhead: number,
  segmentStart: number,
  segmentDuration: number,
  transitionDuration: number
): number {
  if (transitionDuration <= 0) return 1
  const segmentEnd = segmentStart + segmentDuration
  const inPhase = clamp01((playhead - segmentStart) / transitionDuration)
  const outPhase = clamp01((segmentEnd - playhead) / transitionDuration)
  return Math.min(inPhase, outPhase)
}

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+='

function scrambleChar(seed: number): string {
  const x = Math.sin(seed * 999.7) * 10000
  const frac = x - Math.floor(x)
  return SCRAMBLE_CHARS[Math.floor(frac * SCRAMBLE_CHARS.length)]
}

/** Divide a phase "do bloco" numa phase local por caractere, com atraso em cascata. */
function staggeredCharPhase(phase: number, charIndex: number, charCount: number, staggerFraction = 0.6): number {
  if (charCount <= 1) return phase
  const delay = (charIndex / charCount) * staggerFraction
  return clamp01((phase - delay) / (1 - staggerFraction))
}

export const EFFECTS: EffectDef[] = [
  {
    id: 'fade',
    label: 'Fade suave',
    description: 'Aparece e some com um fade lento, sem mexer na posição.',
    mode: 'block',
    duration: 0.6,
    overlay: (phase) => ({ ...IDENTITY_OVERLAY, opacity: phase })
  },
  {
    id: 'fade-fast',
    label: 'Fade rápido',
    description: 'Mesmo fade, só que mais rápido — bom pra cortes curtos.',
    mode: 'block',
    duration: 0.3,
    overlay: (phase) => ({ ...IDENTITY_OVERLAY, opacity: phase })
  },
  {
    id: 'scale-up',
    label: 'Crescer',
    description: 'Cresce de pequeno até o tamanho normal enquanto aparece.',
    mode: 'block',
    duration: 0.5,
    overlay: (phase) => {
      const e = easeOutCubic(phase)
      return { ...IDENTITY_OVERLAY, opacity: phase, scale: 0.85 + 0.15 * e }
    }
  },
  {
    id: 'slide-x',
    label: 'Deslizar horizontal',
    description: 'Entra deslizando da esquerda com um leve borrão de movimento.',
    mode: 'block',
    duration: 0.5,
    overlay: (phase) => {
      const e = easeOutCubic(phase)
      return {
        ...IDENTITY_OVERLAY,
        x: -(1 - e) * 90,
        opacity: phase,
        blur: (1 - phase) * 10
      }
    }
  },
  {
    id: 'slide-x-overshoot',
    label: 'Deslizar horizontal (mola)',
    description: 'Igual o deslizar horizontal, mas passa do ponto e volta com uma molinha.',
    mode: 'block',
    duration: 0.6,
    overlay: (phase) => {
      const e = easeOutBack(phase)
      return {
        ...IDENTITY_OVERLAY,
        x: -(1 - e) * 90,
        opacity: clamp01(phase * 2.5),
        blur: (1 - clamp01(phase * 2)) * 14
      }
    }
  },
  {
    id: 'slide-y',
    label: 'Deslizar vertical',
    description: 'Entra deslizando de baixo com um leve borrão de movimento.',
    mode: 'block',
    duration: 0.5,
    overlay: (phase) => {
      const e = easeOutCubic(phase)
      return {
        ...IDENTITY_OVERLAY,
        y: (1 - e) * 70,
        opacity: phase,
        blur: (1 - phase) * 10
      }
    }
  },
  {
    id: 'slide-y-overshoot',
    label: 'Deslizar vertical (mola)',
    description: 'Igual o deslizar vertical, mas passa do ponto e volta com uma molinha.',
    mode: 'block',
    duration: 0.6,
    overlay: (phase) => {
      const e = easeOutBack(phase)
      return {
        ...IDENTITY_OVERLAY,
        y: (1 - e) * 70,
        opacity: clamp01(phase * 2.5),
        blur: (1 - clamp01(phase * 2)) * 14
      }
    }
  },
  {
    id: 'mask-x',
    label: 'Cortina horizontal',
    description: 'Revela o texto da esquerda pra direita, como uma cortina deslizando.',
    mode: 'block',
    duration: 0.6,
    overlay: (phase) => {
      const e = easeOutCubic(phase)
      const hiddenRight = (1 - e) * 100
      return {
        ...IDENTITY_OVERLAY,
        x: -(1 - e) * 20,
        clipPath: `inset(0 ${hiddenRight}% 0 0)`
      }
    }
  },
  {
    id: 'mask-y',
    label: 'Cortina vertical',
    description: 'Revela o texto de baixo pra cima, como uma cortina deslizando.',
    mode: 'block',
    duration: 0.6,
    overlay: (phase) => {
      const e = easeOutCubic(phase)
      const hiddenTop = (1 - e) * 100
      return {
        ...IDENTITY_OVERLAY,
        y: (1 - e) * 15,
        clipPath: `inset(${hiddenTop}% 0 0 0)`
      }
    }
  },
  {
    id: 'mask-y-overshoot',
    label: 'Cortina vertical (mola)',
    description: 'Igual a cortina vertical, mas com uma molinha na posição ao assentar.',
    mode: 'block',
    duration: 0.7,
    overlay: (phase) => {
      const eClip = easeOutCubic(phase)
      const eBounce = easeOutBack(phase)
      const hiddenTop = (1 - eClip) * 100
      return {
        ...IDENTITY_OVERLAY,
        y: (1 - eBounce) * 25,
        clipPath: `inset(${hiddenTop}% 0 0 0)`
      }
    }
  },
  {
    id: 'fade-scale-tracking',
    label: 'Crescer com tracking',
    description: 'Cresce e aparece enquanto o espaçamento entre as letras fecha até o normal.',
    mode: 'block',
    duration: 0.8,
    overlay: (phase) => {
      const e = easeOutCubic(phase)
      return {
        ...IDENTITY_OVERLAY,
        opacity: phase,
        scale: 0.92 + 0.08 * e,
        letterSpacing: (1 - e) * 18
      }
    }
  },
  {
    id: 'chars-fade',
    label: 'Letras em cascata',
    description: 'Cada letra aparece em fade, uma depois da outra.',
    mode: 'chars',
    duration: 0.9,
    charOverlay: (phase, i, n) => ({
      overlay: { ...IDENTITY_OVERLAY, opacity: staggeredCharPhase(phase, i, n) }
    })
  },
  {
    id: 'chars-slide-x',
    label: 'Letras deslizando',
    description: 'Cada letra desliza e aparece em cascata, uma depois da outra.',
    mode: 'chars',
    duration: 0.9,
    charOverlay: (phase, i, n) => {
      const local = staggeredCharPhase(phase, i, n)
      const e = easeOutCubic(local)
      return {
        overlay: { ...IDENTITY_OVERLAY, x: -(1 - e) * 30, opacity: local, blur: (1 - local) * 6 }
      }
    }
  },
  {
    id: 'chars-decode',
    label: 'Decodificar',
    description: 'Cada letra "decodifica" a partir de caracteres aleatórios até acertar a letra certa.',
    mode: 'chars',
    duration: 1.1,
    charOverlay: (phase, i, n, char) => {
      const local = staggeredCharPhase(phase, i, n, 0.7)
      if (local <= 0) return { overlay: { ...IDENTITY_OVERLAY, opacity: 0 } }
      if (local >= 1 || char === ' ') return { overlay: IDENTITY_OVERLAY }
      const seed = i * 13.37 + Math.floor(local * 10)
      return { overlay: IDENTITY_OVERLAY, charOverride: scrambleChar(seed) }
    }
  },
  {
    id: 'chars-slide-x-blur',
    label: 'Varredura por letra',
    description: 'Cada letra entra deslizando com bastante borrão, uma varredura rápida.',
    mode: 'chars',
    duration: 0.8,
    charOverlay: (phase, i, n) => {
      const local = staggeredCharPhase(phase, i, n, 0.75)
      const e = easeOutCubic(local)
      return {
        overlay: {
          ...IDENTITY_OVERLAY,
          x: -(1 - e) * 120,
          opacity: clamp01(local * 2),
          blur: (1 - local) * 18
        }
      }
    }
  },
  {
    id: 'chars-arc',
    label: 'Letras em arco',
    description: 'Cada letra entra girando, seguindo uma curva, até alinhar na horizontal.',
    mode: 'chars',
    duration: 0.9,
    charOverlay: (phase, i, n) => {
      const local = staggeredCharPhase(phase, i, n, 0.6)
      const e = easeOutCubic(local)
      return {
        overlay: {
          ...IDENTITY_OVERLAY,
          x: -(1 - e) * 35,
          y: (1 - e) * 45,
          rotation: (1 - e) * -50,
          opacity: local,
          blur: (1 - local) * 5
        }
      }
    }
  },
  {
    id: 'chars-arc-overshoot',
    label: 'Letras em arco (mola)',
    description: 'Igual letras em arco, mas com uma molinha ao assentar em cada letra.',
    mode: 'chars',
    duration: 1,
    charOverlay: (phase, i, n) => {
      const local = staggeredCharPhase(phase, i, n, 0.6)
      const e = easeOutBack(local)
      return {
        overlay: {
          ...IDENTITY_OVERLAY,
          x: -(1 - e) * 35,
          y: (1 - e) * 45,
          rotation: (1 - e) * -50,
          opacity: clamp01(local * 2),
          blur: (1 - clamp01(local * 2)) * 5
        }
      }
    }
  },
  {
    id: 'chars-tumble',
    label: 'Letras tombando',
    description: 'Cada letra cai e gira, tombando até ficar em pé, uma depois da outra.',
    mode: 'chars',
    duration: 1,
    charOverlay: (phase, i, n) => {
      const local = staggeredCharPhase(phase, i, n, 0.65)
      const e = easeOutBack(local)
      return {
        overlay: {
          ...IDENTITY_OVERLAY,
          x: -(1 - e) * 60,
          y: (1 - e) * 70,
          rotation: (1 - e) * -160,
          opacity: clamp01(local * 2.5),
          blur: (1 - clamp01(local * 2)) * 8
        }
      }
    }
  },
  {
    id: 'chars-tumble-scale',
    label: 'Letras tombando e crescendo',
    description: 'Igual letras tombando, mas cada letra também cresce do zero até o tamanho normal.',
    mode: 'chars',
    duration: 1.1,
    charOverlay: (phase, i, n) => {
      const local = staggeredCharPhase(phase, i, n, 0.65)
      const e = easeOutBack(local)
      return {
        overlay: {
          ...IDENTITY_OVERLAY,
          x: -(1 - e) * 60,
          y: (1 - e) * 70,
          rotation: (1 - e) * -160,
          scale: Math.max(0.001, e),
          opacity: clamp01(local * 2.5),
          blur: (1 - clamp01(local * 2)) * 8
        }
      }
    }
  },
  {
    id: 'write',
    label: 'Escrita',
    description: 'O texto vai sendo escrito da esquerda pra direita, com uma ponta branca brilhando na frente.',
    mode: 'chars',
    duration: 1.6,
    charOverlay: (phase, charIndex, charCount) => {
      // cada letra é "escrita" em sequência; enquanto está sendo escrita fica branca com brilho
      const pos = phase * charCount
      const u = clamp01(pos - charIndex)
      const writing = u > 0 && u < 1 && phase < 1
      const revealed = 1 - u
      return {
        overlay: {
          ...IDENTITY_OVERLAY,
          opacity: u > 0 ? 1 : 0,
          clipPath: u >= 1 ? undefined : `inset(-15% ${(revealed * 100).toFixed(1)}% -15% -5%)`,
          color: writing ? '#ffffff' : undefined,
          textShadow: writing ? '0 0 14px rgba(255,255,255,0.95), 0 0 30px rgba(255,255,255,0.6)' : undefined
        }
      }
    }
  }
]

export function getEffect(id: EffectId | undefined): EffectDef | undefined {
  return id ? EFFECTS.find((e) => e.id === id) : undefined
}
