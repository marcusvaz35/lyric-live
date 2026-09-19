import type { SongSearchResult } from '@shared/types/song'

interface ITunesResult {
  trackName?: string
  artistName?: string
}

/**
 * Busca título/artista via API pública do iTunes (sem chave, sem scraping) —
 * só pra identificar a música, igual a lista de resultados do Holyrics.
 * A letra em si vem depois, por fetchLyrics, de uma fonte separada.
 */
export async function searchSongsOnline(query: string): Promise<SongSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&media=music&entity=song&limit=15`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Falha na busca (HTTP ${res.status})`)
  const data = (await res.json()) as { results?: ITunesResult[] }

  const seen = new Set<string>()
  const results: SongSearchResult[] = []
  for (const r of data.results ?? []) {
    if (!r.trackName || !r.artistName) continue
    const key = `${r.trackName.toLowerCase()}::${r.artistName.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    results.push({ title: r.trackName, artist: r.artistName })
  }
  return results
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

interface LrclibTrack {
  trackName?: string
  artistName?: string
  plainLyrics?: string | null
}

/** lrclib.net: base aberta de letras, sem chave, com boa cobertura de música brasileira. */
async function fromLrclib(artist: string, title: string): Promise<string | null> {
  const queries = [
    `track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`,
    `q=${encodeURIComponent(`${artist} ${title}`)}`,
    `q=${encodeURIComponent(title)}`
  ]
  const artistKey = artist.toLowerCase()
  for (const query of queries) {
    const tracks = await getJson<LrclibTrack[]>(`https://lrclib.net/api/search?${query}`)
    if (!tracks?.length) continue
    const withLyrics = tracks.filter((t) => t.plainLyrics?.trim())
    // prefere resultado do mesmo artista; senão aceita o primeiro com letra
    const best =
      withLyrics.find((t) => t.artistName?.toLowerCase().includes(artistKey)) ??
      withLyrics.find((t) => artistKey.includes((t.artistName ?? '').toLowerCase()) && t.artistName) ??
      withLyrics[0]
    if (best?.plainLyrics) return best.plainLyrics.trim()
  }
  return null
}

async function fromLyricsOvh(artist: string, title: string): Promise<string | null> {
  const data = await getJson<{ lyrics?: string }>(
    `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
  )
  return data?.lyrics?.trim() || null
}

/**
 * Busca o texto da letra em fontes públicas (lrclib.net e lyrics.ovh, sem
 * chave). O iTunes devolve títulos como "Música (Ao Vivo em BH)" ou "Música -
 * Ao Vivo", que não batem com o título "limpo" dessas bases — então tenta o
 * original e depois versões simplificadas. Retorna null se nenhuma tiver.
 */
export async function fetchLyrics(artist: string, title: string): Promise<string | null> {
  const cleanTitle = title
    .replace(/\s*[([].*?[)\]]/g, '')
    .replace(/\s+-\s+.*$/, '')
    .trim()
  const primaryArtist = artist.split(/\s*(?:&|,|feat\.?|ft\.?|\/)\s*/i)[0].trim()

  const titles = [...new Set([cleanTitle, title].filter(Boolean))]
  const artists = [...new Set([primaryArtist, artist].filter(Boolean))]

  for (const t of titles) {
    for (const a of artists) {
      const lyrics = (await fromLrclib(a, t)) ?? (await fromLyricsOvh(a, t))
      if (lyrics) return lyrics
    }
  }
  return null
}
