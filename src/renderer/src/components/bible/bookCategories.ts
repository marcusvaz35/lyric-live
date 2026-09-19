/**
 * Cor por categoria de livro, pela posição no array de 66 livros (a ordem já
 * vem canônica nos arquivos baixados: Lei, Históricos, Poéticos, Profetas
 * Maiores, Profetas Menores, Evangelhos, Atos, Cartas Paulinas, Cartas
 * Gerais, Apocalipse).
 */
const CATEGORY_RANGES: { end: number; color: string }[] = [
  { end: 4, color: 'bg-amber-800' }, // Lei (Gn-Dt)
  { end: 16, color: 'bg-orange-800' }, // Históricos (Js-Et)
  { end: 21, color: 'bg-purple-800' }, // Poéticos (Jó-Ct)
  { end: 26, color: 'bg-sky-800' }, // Profetas Maiores (Is-Dn)
  { end: 38, color: 'bg-indigo-800' }, // Profetas Menores (Os-Ml)
  { end: 42, color: 'bg-rose-800' }, // Evangelhos (Mt-Jo)
  { end: 43, color: 'bg-teal-800' }, // Atos
  { end: 56, color: 'bg-emerald-800' }, // Cartas Paulinas (Rm-Fm)
  { end: 64, color: 'bg-lime-800' }, // Cartas Gerais (Hb-Jd)
  { end: 65, color: 'bg-yellow-700' } // Apocalipse
]

export function categoryColorForIndex(index: number): string {
  return CATEGORY_RANGES.find((range) => index <= range.end)?.color ?? 'bg-surface-700'
}
