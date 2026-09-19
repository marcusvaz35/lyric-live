import type { BibleBook } from '@shared/types/bible'

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** Candidatos de texto pro nome de um livro: abreviação, nome completo,
 * (pros livros numerados, tipo "1 Pedro"/"2 João") o nome completo colado
 * sem espaço depois do número — "1pedro", "2joao" — e também o nome "pelado"
 * sem o número — "pedro", "joao" — pra quem não sabe/não digita o número;
 * nesse caso o livro "1" vence o empate (ver comentário em matchBookPrefix). */
function candidatesFor(book: BibleBook): string[] {
  const abbrev = normalize(book.abbrev)
  const name = normalize(book.name)
  const glued = name.replace(/^(\d+)\s+/, '$1')
  const bare = name.replace(/^\d+\s+/, '')
  const candidates = [abbrev, name]
  if (glued !== name) candidates.push(glued)
  if (bare !== name) candidates.push(bare)
  return candidates
}

/** Acha o livro cujo nome/abreviação é o maior prefixo do texto digitado
 * (ex.: "1 samuel 2 10" -> livro "1 Samuel", resto "2 10"; também aceita
 * sem espaço antes do número, tipo "jo3 16", livros numerados colados,
 * tipo "1pedro" ou "2joao", e o nome sem o número, tipo "pedro" — nesse
 * último caso empata entre livros com o mesmo nome pelado (ex.: "1 Pedro"
 * e "2 Pedro"), e como os livros são percorridos em ordem canônica e só
 * troca o melhor candidato quando é estritamente maior, o primeiro da
 * ordem (o "1") fica valendo por padrão). */
function matchBookPrefix(books: BibleBook[], query: string): { book: BibleBook | null; rest: string } {
  const normQuery = normalize(query)
  let best: { book: BibleBook; len: number } | null = null

  for (const book of books) {
    for (const candidate of candidatesFor(book)) {
      if (!candidate || !normQuery.startsWith(candidate)) continue
      const nextChar = normQuery[candidate.length]
      const validBoundary = nextChar === undefined || /[\s\d]/.test(nextChar)
      if (validBoundary && (!best || candidate.length > best.len)) {
        best = { book, len: candidate.length }
      }
    }
  }

  if (!best) return { book: null, rest: '' }
  return { book: best.book, rest: normQuery.slice(best.len) }
}

export interface VerseResult {
  book: BibleBook
  chapter: number
  verse: number
  text: string
}

/** Livros cujo nome/abreviação bate com o que já foi digitado (autocompletar). */
export function suggestBooks(books: BibleBook[], query: string, limit = 8): BibleBook[] {
  const q = normalize(query)
  if (!q) return []
  return books
    .filter((b) => normalize(b.name).startsWith(q) || normalize(b.abbrev).startsWith(q))
    .slice(0, limit)
}

/**
 * Busca "estilo Holyrics": digita o nome do livro + capítulo (+ versículo opcional).
 * "jo 3 16", "joão 3:16", "1 samuel 2 10-12", "sl 23" (lista o capítulo inteiro).
 */
export function searchVerses(books: BibleBook[], query: string, limit = 120): VerseResult[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const { book, rest } = matchBookPrefix(books, trimmed)
  if (!book) return []

  const numbers = rest.match(/\d+/g)
  if (!numbers || numbers.length === 0) return []

  const chapter = Number(numbers[0])
  const chapterVerses = book.chapters[chapter - 1]
  if (!chapterVerses) return []

  if (numbers.length === 1) {
    return chapterVerses
      .map((text, i) => ({ book, chapter, verse: i + 1, text }))
      .slice(0, limit)
  }

  const start = Number(numbers[1])
  const end = numbers[2] ? Number(numbers[2]) : start
  const results: VerseResult[] = []
  for (let v = start; v <= end && results.length < limit; v++) {
    const text = chapterVerses[v - 1]
    if (text) results.push({ book, chapter, verse: v, text })
  }
  return results
}

export function formatReference(result: VerseResult): string {
  return `${result.book.name} ${result.chapter}:${result.verse}`
}

export interface QuickLocateState {
  /** O que foi digitado até agora, sem alterações. */
  raw: string
  book: BibleBook | null
  chapter: number | null
  /** Ainda como string (pode estar incompleto, ex.: "1" enquanto digita "16"). */
  verseRaw: string | null
  /** Total de versículos do capítulo resolvido, pra mostrar "Versículos: 36". */
  verseCount: number | null
}

/** Quando capítulo e versículo saem colados num bloco só de dígitos (ex.:
 * digitou "53" sem espaço, pra "capítulo 5 versículo 3"), acha o maior
 * prefixo que é um capítulo válido do livro e trata o resto como o
 * versículo — sem isso, "53" só dava pra virar "capítulo 53". */
function splitChapterVerse(digits: string, maxChapter: number): { chapter: number; verseRaw: string | null } {
  for (let len = digits.length; len >= 1; len--) {
    const candidate = Number(digits.slice(0, len))
    if (candidate >= 1 && candidate <= maxChapter) {
      return { chapter: candidate, verseRaw: digits.slice(len) || null }
    }
  }
  return { chapter: Number(digits), verseRaw: null }
}

/** Versão "ao vivo" do parser, pro popup tipo Holyrics (Livro / Capítulo / Versículo).
 * Aceita tanto "1 pedro 5 3" (espaço separando capítulo e versículo) quanto
 * "1 pedro 53" (colado, resolvido via splitChapterVerse acima). */
export function parseQuickLocate(books: BibleBook[], buffer: string): QuickLocateState {
  const { book, rest } = matchBookPrefix(books, buffer)
  const numberGroups = rest.match(/\d+/g) ?? []

  let chapter: number | null = null
  let verseRaw: string | null = null

  if (numberGroups.length === 1 && book) {
    ;({ chapter, verseRaw } = splitChapterVerse(numberGroups[0], book.chapters.length))
  } else if (numberGroups.length > 0) {
    chapter = Number(numberGroups[0])
    verseRaw = numberGroups[1] ?? null
  }

  const chapterVerses = book && chapter ? (book.chapters[chapter - 1] ?? null) : null

  return {
    raw: buffer,
    book,
    chapter,
    verseRaw,
    verseCount: chapterVerses ? chapterVerses.length : null
  }
}
