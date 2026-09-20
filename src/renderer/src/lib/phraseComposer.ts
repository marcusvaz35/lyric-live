import { nanoid } from 'nanoid'
import type { EffectId, Layer, ShapeLayer, TextLayer } from '@shared/types/project'
import type { PhraseLayout } from '@shared/types/phrase'
import { createShapeLayer, createTextLayer } from './factories'

export interface PhrasePreset {
  id: string
  label: string
  description: string
}

export const PHRASE_PRESETS: PhrasePreset[] = [
  { id: 'gold', label: 'Destaque dourado', description: 'Palavra forte grande em cor de destaque, resto pequeno espaçado e uma manuscrita.' },
  { id: 'red-strip', label: 'Tira vermelha', description: 'Letras itálicas inclinadas sobre uma tira rasgada.' },
  { id: 'cinema', label: 'Cinema espaçado', description: 'Letras finas, bem espaçadas e discretas.' },
  { id: 'script', label: 'Manuscrito', description: 'Letras de pincel grandes e inclinadas.' },
  { id: 'block', label: 'Bloco moderno', description: 'Palavras em negrito empilhadas, tamanhos diferentes.' },
  { id: 'script-lead', label: 'Manuscrita + bloco', description: 'Primeira palavra manuscrita e o resto em caixa alta condensada, do lado.' },
  { id: 'serif-destaque', label: 'Serifa em destaque', description: 'Palavra forte em serifa itálica gigante e o resto pequeno e espaçado.' },
  { id: 'condensada', label: 'Condensada inclinada', description: 'Tudo em caixa alta condensada e inclinada, bem apertado.' },
  { id: 'pincel', label: 'Pincel empilhado', description: 'Letras de marcador em caixa alta, linhas empilhadas e tortas.' },
  { id: 'serif-espacada', label: 'Serifa espaçada', description: 'Caixa alta serifada bem espaçada e a última palavra manuscrita.' },
  { id: 'bloco-gigante', label: 'Bloco gigante', description: 'Palavra principal enorme e inclinada, o resto pequeno ao redor.' }
]

/** Ajustes manuais de uma palavra, por cima do que o estilo escolhido gerou. */
export interface WordOverride {
  /** Texto digitado no lugar da palavra (pode ter qualquer coisa, inclusive espaços). */
  text?: string
  fontFamily?: string
  fontSize?: number
  color?: string
  italic?: boolean
  rotation?: number
  /** Posição manual (px a partir do centro do palco); vale no lugar da automática. */
  x?: number
  y?: number
  /** Efeito só desta palavra: undefined = o da frase, 'none' = sem efeito. */
  effect?: EffectId | 'none'
  /** Posição escolhida à mão (não entra na reorganização ao mudar o tamanho da letra). */
  moved?: boolean
}

export interface ComposeParams {
  /** Ajustes por palavra (índice na frase). */
  overrides?: Record<number, WordOverride>
  phrase: string
  presetId: string
  accent: string
  effect: EffectId | undefined
  /** Início na cena, em segundos. */
  start: number
  /** Quanto tempo a frase fica na tela (a partir do início). */
  duration: number
  /** Atraso entre uma palavra e a próxima, em segundos. */
  stagger: number
  sceneDuration: number
}

interface WordStyle {
  fontFamily: string
  fontSize: number
  fontWeight: number
  italic: boolean
  color: string
  letterSpacing: number
  rotation: number
  upper: boolean
  /** Deslocamento vertical extra (px) pra dar a sensação de sobreposição. */
  dy?: number
}

/** Largura média de um caractere como fração do tamanho da fonte (pra estimar o layout). */
const CHAR_WIDTH: Record<string, number> = {
  Anton: 0.46,
  'Bebas Neue': 0.4,
  Oswald: 0.5,
  Montserrat: 0.7,
  'Permanent Marker': 0.56,
  'Caveat Brush': 0.42,
  'Playfair Display': 0.52
}

let measureCtx: CanvasRenderingContext2D | null = null

/** Largura real do texto (medida com a fonte de verdade); cai na estimativa se não der pra medir. */
function measureWidth(text: string, st: WordStyle): number {
  if (typeof document !== 'undefined') {
    measureCtx ??= document.createElement('canvas').getContext('2d')
    if (measureCtx) {
      measureCtx.font = `${st.italic ? 'italic ' : ''}${st.fontWeight} ${st.fontSize}px "${st.fontFamily}"`
      return measureCtx.measureText(text).width + text.length * st.letterSpacing
    }
  }
  return text.length * st.fontSize * (CHAR_WIDTH[st.fontFamily] ?? 0.55) + text.length * st.letterSpacing
}

function styleWords(words: string[], presetId: string, accent: string): WordStyle[] {
  const longest = words.reduce((best, w, i) => (w.length > words[best].length ? i : best), 0)

  return words.map((_word, i): WordStyle => {
    switch (presetId) {
      case 'red-strip':
        return { fontFamily: 'Anton', fontSize: 120, fontWeight: 400, italic: true, color: '#ffffff', letterSpacing: 2, rotation: -3, upper: true }
      case 'cinema':
        return { fontFamily: 'Bebas Neue', fontSize: 84, fontWeight: 400, italic: false, color: '#ffffff', letterSpacing: 16, rotation: 0, upper: true }
      case 'script':
        return { fontFamily: 'Caveat Brush', fontSize: 150, fontWeight: 400, italic: false, color: '#ffffff', letterSpacing: 0, rotation: i % 2 ? 4 : -5, upper: false }
      case 'block': {
        const size = Math.max(70, 150 - i * 22)
        return { fontFamily: 'Montserrat', fontSize: size, fontWeight: 900, italic: false, color: i === 0 ? accent : '#ffffff', letterSpacing: 0, rotation: 0, upper: true }
      }
      case 'script-lead':
        // primeira palavra manuscrita puxando a frase, resto em condensada alta
        return i === 0
          ? { fontFamily: 'Caveat Brush', fontSize: 132, fontWeight: 400, italic: false, color: '#ffffff', letterSpacing: 0, rotation: -4, upper: false, dy: 10 }
          : { fontFamily: 'Oswald', fontSize: 92, fontWeight: 700, italic: false, color: '#ffffff', letterSpacing: 1, rotation: 0, upper: true }
      case 'serif-destaque':
        return i === longest
          ? { fontFamily: 'Playfair Display', fontSize: 168, fontWeight: 700, italic: true, color: '#ffffff', letterSpacing: 0, rotation: 0, upper: true }
          : { fontFamily: 'Oswald', fontSize: 54, fontWeight: 700, italic: false, color: '#ffffff', letterSpacing: 6, rotation: 0, upper: true }
      case 'condensada':
        return { fontFamily: 'Anton', fontSize: 118, fontWeight: 400, italic: true, color: '#ffffff', letterSpacing: 1, rotation: -4, upper: true }
      case 'pincel':
        return { fontFamily: 'Permanent Marker', fontSize: 104, fontWeight: 400, italic: false, color: '#ffffff', letterSpacing: 0, rotation: i % 2 ? 2 : -3, upper: true }
      case 'serif-espacada':
        // caixa alta serifada e espaçada, fechando com a última palavra manuscrita
        return i === words.length - 1 && words.length > 1
          ? { fontFamily: 'Caveat Brush', fontSize: 124, fontWeight: 400, italic: false, color: accent, letterSpacing: 0, rotation: -3, upper: false }
          : { fontFamily: 'Georgia', fontSize: 62, fontWeight: 700, italic: false, color: '#ffffff', letterSpacing: 14, rotation: 0, upper: true }
      case 'bloco-gigante':
        return i === longest
          ? { fontFamily: 'Anton', fontSize: 224, fontWeight: 400, italic: false, color: accent, letterSpacing: 0, rotation: -7, upper: true }
          : { fontFamily: 'Anton', fontSize: 88, fontWeight: 400, italic: false, color: '#ffffff', letterSpacing: 2, rotation: -7, upper: true }
      default: {
        if (i === longest) {
          return { fontFamily: 'Anton', fontSize: 170, fontWeight: 400, italic: false, color: accent, letterSpacing: 2, rotation: -3, upper: true }
        }
        if (i === 0 && words.length > 2) {
          return { fontFamily: 'Caveat Brush', fontSize: 100, fontWeight: 400, italic: false, color: accent, letterSpacing: 0, rotation: -8, upper: false, dy: 20 }
        }
        return { fontFamily: 'Montserrat', fontSize: 46, fontWeight: 800, italic: false, color: '#ffffff', letterSpacing: 9, rotation: -3, upper: true }
      }
    }
  })
}

/** Cria uma camada de texto por palavra, dispostas em linhas centralizadas, mais a
 * tira de fundo (no preset "Tira vermelha"). Cada palavra entra `stagger` depois da anterior. */
function wordEffect(override: EffectId | 'none' | undefined, fallback: EffectId | undefined): EffectId | undefined {
  if (override === 'none') return undefined
  return override ?? fallback
}

export function composePhrase(params: ComposeParams): Layer[] {
  const words = params.phrase.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []

  const styles = styleWords(words, params.presetId, params.accent).map((st, i) => ({
    ...st,
    ...params.overrides?.[i]
  }))
  const texts = words.map((w, i) => {
    const raw = params.overrides?.[i]?.text ?? w
    return styles[i].upper ? raw.toLocaleUpperCase('pt-BR') : raw
  })
  const widths = texts.map((t, i) => measureWidth(t, styles[i]))

  const MAX_ROW = 1000
  const GAP = 26
  const rows: number[][] = []
  let rowWidth = 0
  for (let i = 0; i < words.length; i++) {
    const needed = widths[i] + (rows.length && rowWidth ? GAP : 0)
    if (rows.length === 0 || (rowWidth + needed > MAX_ROW && rows[rows.length - 1].length > 0)) {
      rows.push([i])
      rowWidth = widths[i]
    } else {
      rows[rows.length - 1].push(i)
      rowWidth += needed
    }
  }

  const rowHeights = rows.map((r) => Math.max(...r.map((i) => styles[i].fontSize)) * 1.02)
  const totalHeight = rowHeights.reduce((a, b) => a + b, 0)
  let cursorY = -totalHeight / 2
  let maxRowWidth = 0

  const positions: { x: number; y: number }[] = new Array(words.length)
  rows.forEach((row, ri) => {
    const rowW = row.reduce((sum, i, k) => sum + widths[i] + (k ? GAP : 0), 0)
    maxRowWidth = Math.max(maxRowWidth, rowW)
    let x = -rowW / 2
    const y = cursorY + rowHeights[ri] / 2
    for (const i of row) {
      positions[i] = { x: x + widths[i] / 2, y: y + (styles[i].dy ?? 0) }
      x += widths[i] + GAP
    }
    cursorY += rowHeights[ri]
  })

  words.forEach((_, i) => {
    const ov = params.overrides?.[i]
    if (ov?.x !== undefined || ov?.y !== undefined) {
      positions[i] = { x: ov.x ?? positions[i].x, y: ov.y ?? positions[i].y }
    }
  })

  const end = Math.min(params.sceneDuration, params.start + params.duration)
  const layers: Layer[] = []

  if (params.presetId === 'red-strip') {
    const strip: ShapeLayer = {
      ...createShapeLayer('torn', 0, params.sceneDuration),
      color: '#e10600',
      width: Math.round(Math.min(1240, maxRowWidth + 160)),
      height: Math.round(totalHeight + 70),
      transform: { position: { x: 0, y: 0 }, scale: 1, rotation: -3, opacity: 1, blur: 0 },
      effect: 'mask-x',
      segments: [{ id: nanoid(), start: params.start, duration: Math.max(0.5, end - params.start) }]
    }
    layers.push(strip)
  }

  words.forEach((_, i) => {
    const st = styles[i]
    const wordStart = Math.min(params.start + i * params.stagger, Math.max(params.start, end - 0.5))
    const base = createTextLayer(texts[i], 0, params.sceneDuration)
    const layer: TextLayer = {
      ...base,
      name: texts[i],
      fontFamily: st.fontFamily,
      fontSize: st.fontSize,
      fontWeight: st.fontWeight,
      italic: st.italic,
      color: st.color,
      letterSpacing: st.letterSpacing,
      lineHeight: 1,
      transform: {
        position: { x: Math.round(positions[i].x), y: Math.round(positions[i].y) },
        scale: 1,
        rotation: st.rotation,
        opacity: 1,
        blur: 0
      },
      effect: wordEffect(params.overrides?.[i]?.effect, params.effect),
      segments: [{ id: nanoid(), start: wordStart, duration: Math.max(0.5, end - wordStart) }]
    }
    layers.push(layer)
  })

  return layers
}

/** Refaz a frase noutro tamanho: as fontes crescem/diminuem e as palavras são redistribuídas
 * em linhas que cabem no palco — igual o texto simples se reorganiza ao mudar de tamanho.
 * Palavras que a pessoa posicionou à mão continuam onde estavam, só acompanhando a escala. */
export function rescalePhrase(layout: PhraseLayout, zoom: number): PhraseLayout {
  if (!Number.isFinite(zoom) || zoom === 1 || layout.items.length === 0) return layout

  const items = layout.items.map((it) => ({
    ...it,
    fontSize: it.fontSize * zoom,
    letterSpacing: it.letterSpacing * zoom
  }))
  const widths = items.map((it) =>
    measureWidth(it.text, {
      fontFamily: it.fontFamily,
      fontSize: it.fontSize,
      fontWeight: it.fontWeight,
      italic: it.italic,
      color: it.color,
      letterSpacing: it.letterSpacing,
      rotation: it.rotation,
      upper: false
    })
  )

  const MAX_ROW = 1000
  const GAP = 26 * zoom
  const rows: number[][] = []
  let rowWidth = 0
  for (let i = 0; i < items.length; i++) {
    const needed = widths[i] + (rows.length && rowWidth ? GAP : 0)
    if (rows.length === 0 || (rowWidth + needed > MAX_ROW && rows[rows.length - 1].length > 0)) {
      rows.push([i])
      rowWidth = widths[i]
    } else {
      rows[rows.length - 1].push(i)
      rowWidth += needed
    }
  }

  const rowHeights = rows.map((r) => Math.max(...r.map((i) => items[i].fontSize)) * 1.02)
  const totalHeight = rowHeights.reduce((a, b) => a + b, 0)
  let cursorY = -totalHeight / 2
  let maxRowWidth = 0

  rows.forEach((row, ri) => {
    const rowW = row.reduce((sum, i, k) => sum + widths[i] + (k ? GAP : 0), 0)
    maxRowWidth = Math.max(maxRowWidth, rowW)
    let x = -rowW / 2
    const y = cursorY + rowHeights[ri] / 2
    for (const i of row) {
      items[i] = { ...items[i], x: Math.round(x + widths[i] / 2), y: Math.round(y) }
      x += widths[i] + GAP
    }
    cursorY += rowHeights[ri]
  })

  // quem foi arrastado à mão mantém o lugar, só acompanhando a escala
  layout.items.forEach((original, i) => {
    if (original.moved) items[i] = { ...items[i], x: Math.round(original.x * zoom), y: Math.round(original.y * zoom) }
  })

  const strip = layout.strip
    ? {
        ...layout.strip,
        width: Math.round(Math.min(1240, maxRowWidth + 160 * zoom)),
        height: Math.round(totalHeight + 70 * zoom)
      }
    : undefined

  return { items, strip }
}

/** Converte as camadas geradas em um layout independente da timeline (pra exibir ao vivo). */
export function toPhraseLayout(layers: Layer[], startTime: number): PhraseLayout {
  const items: PhraseLayout['items'] = []
  let strip: PhraseLayout['strip']
  for (const l of layers) {
    if (l.type === 'shape') {
      strip = { width: l.width, height: l.height, color: l.color, rotation: l.transform.rotation, seed: l.id }
    } else if (l.type === 'text') {
      items.push({
        text: l.text,
        fontFamily: l.fontFamily,
        fontSize: l.fontSize,
        fontWeight: l.fontWeight,
        italic: l.italic,
        color: l.color,
        letterSpacing: l.letterSpacing,
        rotation: l.transform.rotation,
        x: l.transform.position.x,
        y: l.transform.position.y,
        delay: Math.max(0, (l.segments[0]?.start ?? startTime) - startTime),
        effect: l.effect ?? null
      })
    }
  }
  return { items, strip }
}
