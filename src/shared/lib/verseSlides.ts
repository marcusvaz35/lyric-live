export const MAX_CHARS_PER_LINE = 32

/** Quebra um texto em linhas de até `maxChars`, cortando só nos espaços (nunca no meio de uma palavra). */
function wrapLines(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

/** Em maiúsculas cada letra ocupa mais, então cabe menos por linha. */
export const UPPER_WIDTH_FACTOR = 1.2

/** Quantas linhas cabem em cada trecho, quando a pessoa não escolheu outro valor. */
export const DEFAULT_LINES_PER_SLIDE = 2

/** Corta o texto nos fins de frase e de oração (vírgula, ponto e vírgula, ponto, etc.). */
function splitAtPunctuation(text: string): string[] {
  return text
    .split(/(?<=[,;:.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

/** Agrupa linhas de `n` em `n`. */
function groupLines(lines: string[], n: number): string[][] {
  const slides: string[][] = []
  for (let i = 0; i < lines.length; i += n) slides.push(lines.slice(i, i + n))
  return slides
}

/** Monta os trechos respeitando a pontuação: junta orações enquanto couberem no mesmo
 * trecho, e nunca começa um trecho no meio de uma oração. */
function slidesByPunctuation(text: string, maxCharsPerLine: number, linesPerSlide: number): string[][] {
  const slides: string[][] = []
  let buffer: string[] = []

  for (const part of splitAtPunctuation(text)) {
    const lines = wrapLines(part, maxCharsPerLine)
    if (buffer.length > 0 && buffer.length + lines.length > linesPerSlide) {
      slides.push(buffer)
      buffer = []
    }
    if (lines.length >= linesPerSlide) {
      // oração maior que um trecho: sai em pedaços cheios e a sobra abre o próximo
      const cheios = groupLines(lines, linesPerSlide)
      const resto = cheios[cheios.length - 1]
      if (resto.length < linesPerSlide) cheios.pop()
      slides.push(...cheios)
      buffer = resto.length < linesPerSlide ? resto : []
    } else {
      buffer = [...buffer, ...lines]
    }
  }

  if (buffer.length > 0) slides.push(buffer)
  return slides
}

/** Versículos não têm quebra de linha própria (ao contrário de letras de música), então
 * quebramos pelo tamanho da linha e agrupamos em trechos do tamanho escolhido. Com
 * `breakOnPunctuation`, o trecho termina na vírgula ou no ponto em vez de no fim da linha. */
export function splitVerseIntoSlides(
  text: string,
  maxCharsPerLine = MAX_CHARS_PER_LINE,
  linesPerSlide = DEFAULT_LINES_PER_SLIDE,
  breakOnPunctuation = false
): string[] {
  const porTrecho = Math.max(1, Math.round(linesPerSlide))

  if (breakOnPunctuation) {
    const slides = slidesByPunctuation(text, maxCharsPerLine, porTrecho)
    return slides.length > 0 ? slides.map((l) => l.join('\n')) : ['']
  }

  let lines = wrapLines(text, maxCharsPerLine)
  if (lines.length === 0) return ['']

  // sobrar uma linha solta no último trecho fica feio (às vezes uma palavra só);
  // estreitar um pouco as linhas costuma fechar a conta e equilibrar os trechos
  if (lines.length > porTrecho && lines.length % porTrecho === 1) {
    const narrowest = Math.max(12, Math.floor(maxCharsPerLine * 0.75))
    for (let width = maxCharsPerLine - 1; width >= narrowest; width--) {
      const candidate = wrapLines(text, width)
      if (candidate.length % porTrecho !== 1) {
        lines = candidate
        break
      }
    }
  }

  return groupLines(lines, porTrecho).map((l) => l.join('\n'))
}
