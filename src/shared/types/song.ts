import type { EffectId } from './project'

/** Efeito marcado num slide: animação de entrada + palavras em destaque
 * (índices das palavras do slide, contando só as não-vazias, em ordem). */
export interface SlideFx {
  effect: EffectId | null
  highlights: number[]
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
