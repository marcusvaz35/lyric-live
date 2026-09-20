import type { EffectId } from './project'

/** Uma palavra já posicionada e estilizada (saída do compositor de frase). */
export interface PhraseItem {
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  italic: boolean
  color: string
  letterSpacing: number
  rotation: number
  /** Deslocamento do centro do palco 1280×720, em px. */
  x: number
  y: number
  /** Atraso da entrada desta palavra, em segundos (efeito cascata). */
  delay: number
  effect: EffectId | null
}

export interface PhraseStrip {
  width: number
  height: number
  color: string
  rotation: number
  /** Semente do contorno rasgado. */
  seed: string
}

/** Frase estilizada pronta pra ser exibida ao vivo no lugar do texto simples do slide. */
export interface PhraseLayout {
  items: PhraseItem[]
  strip?: PhraseStrip
}
