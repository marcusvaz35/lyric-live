export interface BibleVersionMeta {
  id: string
  label: string
  license: string
  downloaded: boolean
  /** Sem download automático (texto com direitos reservados): o usuário importa o próprio arquivo licenciado. */
  importOnly?: boolean
}

export interface BibleBook {
  abbrev: string
  name: string
  /** chapters[capítulo][versículo] = texto (índices começando em 0). */
  chapters: string[][]
}
