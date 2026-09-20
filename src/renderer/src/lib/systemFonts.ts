let cache: string[] = []
let inflight: Promise<string[]> | null = null

/** Última lista lida (vazia até a primeira leitura terminar). */
export function getCachedSystemFonts(): string[] {
  return cache
}

/** Lê as fontes instaladas no computador. Chamadas ao mesmo tempo dividem a mesma leitura. */
export function loadSystemFonts(): Promise<string[]> {
  if (!window.api) return Promise.resolve(cache)
  inflight ??= window.api.fonts
    .list()
    .then((list) => {
      cache = list
      return list
    })
    .catch(() => cache)
    .finally(() => {
      inflight = null
    })
  return inflight
}
