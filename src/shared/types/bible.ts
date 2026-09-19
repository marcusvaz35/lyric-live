export interface BibleVersionMeta {
  id: string
  label: string
  license: string
  downloaded: boolean
}

export interface BibleBook {
  abbrev: string
  name: string
  /** chapters[capítulo][versículo] = texto (índices começando em 0). */
  chapters: string[][]
}
