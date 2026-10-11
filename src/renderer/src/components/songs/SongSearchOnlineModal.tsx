import { useEffect, useRef, useState } from 'react'
import type { SongSearchResult } from '@shared/types/song'

/**
 * Busca na internet, igual a janela "Pesquisar - holyrics.com": digita e
 * aparece uma lista de título/artista (via API pública do iTunes, sem abrir
 * navegador nenhum), escolhe um resultado e a letra aparece no preview à
 * direita (via lyrics.ovh — cobertura não é garantida, então também dá pra
 * seguir sem letra e colar manualmente na tela seguinte).
 */
export function SongSearchOnlineModal({
  onCancel,
  onUseResult
}: {
  onCancel: () => void
  onUseResult: (data: { title: string; artist: string; lyrics: string }) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SongSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selected, setSelected] = useState<SongSearchResult | null>(null)
  const [lyrics, setLyrics] = useState<string | null>(null)
  const [lyricsLoading, setLyricsLoading] = useState(false)
  /** Resultado sob o mouse: a letra dele aparece no painel sem precisar clicar. */
  const [hovered, setHovered] = useState<SongSearchResult | null>(null)
  /** Letras já buscadas, por "artista|título", pra não repetir a busca a cada passada do mouse. */
  const lyricsCache = useRef(new Map<string, string | null>())
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Última letra pedida: respostas de buscas antigas são descartadas. */
  const lastRequested = useRef<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  const keyOf = (r: SongSearchResult): string => `${r.artist}|${r.title}`

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed || !window.api) {
      setResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    setSearchError(null)
    const timeout = setTimeout(() => {
      window.api!.song
        .searchOnline(trimmed)
        .then((r) => {
          if (!cancelled) setResults(r)
        })
        .catch((err) => {
          if (!cancelled) setSearchError(err instanceof Error ? err.message : String(err))
        })
        .finally(() => {
          if (!cancelled) setSearching(false)
        })
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [query])

  /** Busca a letra (ou pega a já buscada) e mostra no painel da direita. */
  const showLyrics = async (result: SongSearchResult): Promise<void> => {
    const key = keyOf(result)
    if (lyricsCache.current.has(key)) {
      lastRequested.current = key
      setLyrics(lyricsCache.current.get(key) ?? null)
      setLyricsLoading(false)
      return
    }
    if (!window.api) return
    lastRequested.current = key
    setLyrics(null)
    setLyricsLoading(true)
    try {
      const text = await window.api.song.fetchLyrics(result.artist, result.title)
      lyricsCache.current.set(key, text)
      // o mouse pode ter passado pra outro resultado enquanto a busca ia e voltava
      if (lastRequested.current === key) setLyrics(text)
    } finally {
      if (lastRequested.current === key) setLyricsLoading(false)
    }
  }

  /** Passar o mouse já mostra a letra; espera um instante pra não buscar tudo de uma vez. */
  const handleHover = (result: SongSearchResult | null): void => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    setHovered(result)
    if (!result) return
    hoverTimer.current = setTimeout(() => showLyrics(result), 220)
  }

  const handleSelect = (result: SongSearchResult): void => {
    setSelected(result)
    showLyrics(result)
  }

  const handleUse = (): void => {
    if (!selected) return
    onUseResult({ title: selected.title, artist: selected.artist, lyrics: lyrics ?? '' })
  }

  // o painel segue o mouse; parado, fica no resultado escolhido
  const mostrando = hovered ?? selected

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-6">
      <div className="flex h-full max-h-[600px] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-surface-700 bg-surface-900 shadow-2xl">
        <div className="border-b border-surface-800 px-4 py-3">
          <div className="mb-2 text-sm font-semibold text-neutral-100">Pesquisar letra na internet</div>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome da música ou artista..."
            className="field-input w-full"
          />
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex w-1/2 flex-col overflow-y-scroll border-r border-surface-800">
            {searching && <div className="p-4 text-sm text-neutral-600">Buscando…</div>}
            {searchError && <div className="p-4 text-sm text-red-400">{searchError}</div>}
            {!searching && !searchError && query.trim() && results.length === 0 && (
              <div className="p-4 text-sm text-neutral-600">Nenhum resultado.</div>
            )}
            {results.map((r, i) => (
              <button
                key={`${r.title}-${r.artist}-${i}`}
                onClick={() => handleSelect(r)}
                onMouseEnter={() => handleHover(r)}
                onMouseLeave={() => handleHover(null)}
                title="Passe o mouse para ver a letra; clique para usar esta música"
                className={`border-b border-surface-800/60 px-4 py-2.5 text-left transition-colors ${
                  selected === r ? 'bg-accent/15' : 'hover:bg-surface-800'
                }`}
              >
                <div className="text-sm text-neutral-100">{r.title}</div>
                <div className="text-xs text-neutral-500">{r.artist}</div>
              </button>
            ))}
          </div>

          <div className="flex w-1/2 flex-col overflow-hidden p-4">
            {!mostrando ? (
              <div className="flex flex-1 items-center justify-center text-center text-sm text-neutral-600">
                Passe o mouse num resultado pra ver a letra
              </div>
            ) : (
              <>
                <div className="mb-2">
                  <div className="text-sm font-semibold text-neutral-100">{mostrando.title}</div>
                  <div className="text-xs text-neutral-500">
                    {mostrando.artist}
                    {hovered && selected && hovered !== selected && (
                      <span className="ml-2 text-neutral-600">(só espiando)</span>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-scroll whitespace-pre-line text-sm leading-relaxed text-neutral-300">
                  {lyricsLoading
                    ? 'Buscando letra…'
                    : (lyrics ?? 'Letra não encontrada automaticamente — dá pra criar e colar manualmente.')}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-surface-800 px-4 py-3">
          <p className="max-w-md text-[11px] leading-snug text-neutral-600">
            Letras de música são protegidas por direitos autorais. Use e armazene conforme a
            licença/autorização que sua igreja tiver para exibição.
          </p>
          <div className="flex shrink-0 gap-2">
            <button onClick={onCancel} className="rounded-md px-3 py-1.5 text-sm text-neutral-400 hover:bg-surface-800">
              Cancelar
            </button>
            <button
              onClick={handleUse}
              disabled={!selected}
              className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
            >
              Criar Música
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
