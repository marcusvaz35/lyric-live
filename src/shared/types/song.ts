import type { EffectId } from './project'
import type { PhraseLayout } from './phrase'

/** Estilo de uma palavra do slide (fonte, cor, inclinação, tamanho relativo). */
export interface WordFontStyle {
  fontFamily?: string
  color?: string
  italic?: boolean
  /** Tamanho relativo ao texto do slide (1 = igual). */
  scale?: number
}

/** Efeito marcado num slide: animação de entrada + palavras em destaque
 * (índices das palavras do slide, contando só as não-vazias, em ordem). */
export interface SlideFx {
  effect: EffectId | null
  highlights: number[]
  /** Fonte/cor/tamanho por palavra (índice da palavra no slide). */
  wordStyles?: Record<number, WordFontStyle>
  /** Efeito de entrada só de uma palavra (índice da palavra no slide). */
  wordEffects?: Record<number, EffectId>
  /** Frase estilizada (fonte por palavra, cascata) aplicada a este slide; substitui o texto simples. */
  phrase?: PhraseLayout | null
}

/** Uma música salva na biblioteca local, já dividida em blocos de até 2
 * estrofes — cada bloco é o que aparece de uma vez na tela/no modo leitura. */
export interface Song {
  id: string
  title: string
  artist: string
  author?: string
  blocks: string[]
  /** Efeitos por slide, alinhado com `blocks` (mesmo tamanho); null = sem efeito. */
  blockFx?: (SlideFx | null)[]
  /** Tamanho da letra de toda a música (1 = padrão). */
  fontScale?: number
  createdAt: number
}

export interface SongSummary {
  id: string
  title: string
  artist: string
}

/** Resultado de busca na internet: só título/artista, pra identificar a
 * música antes de trazer a letra (igual a lista do Holyrics). */
export interface SongSearchResult {
  title: string
  artist: string
}

/** Uma música na playlist do culto (a mesma música pode entrar mais de uma vez). */
export interface PlaylistEntry {
  uid: string
  songId: string
}

/** Ordem das músicas do culto e qual está tocando; fica salva entre aberturas do programa. */
export interface Playlist {
  entries: PlaylistEntry[]
  currentUid: string | null
}
