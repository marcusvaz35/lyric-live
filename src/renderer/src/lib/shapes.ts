/** Polígono de borda irregular ("papel rasgado") determinístico a partir do id da camada. */
export function tornPolygon(seed: string): string {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  const rand = (): number => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }
  const steps = 22
  const top: string[] = []
  const bottom: string[] = []
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * 100
    top.push(`${x.toFixed(1)}% ${(rand() * 14).toFixed(1)}%`)
    bottom.push(`${(100 - x).toFixed(1)}% ${(86 + rand() * 14).toFixed(1)}%`)
  }
  return `polygon(${[...top, ...bottom].join(', ')})`
}
