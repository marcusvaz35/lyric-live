import { getFonts } from 'font-list'

/** Famílias de fonte instaladas no computador (Mac, Windows ou Linux), sem duplicadas, em ordem alfabética. */
export async function listSystemFonts(): Promise<string[]> {
  const raw = await getFonts({ disableQuoting: true })
  const seen = new Set<string>()
  const result: string[] = []
  for (const name of raw) {
    const family = name.trim()
    if (!family || family.startsWith('.')) continue
    const key = family.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(family)
  }
  return result.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
}
