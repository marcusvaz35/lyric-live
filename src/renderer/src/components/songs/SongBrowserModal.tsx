import { useEffect, useMemo, useRef, useState } from 'react'
import { nanoid } from 'nanoid'
import type { Song, SongSummary, SlideFx } from '@shared/types/song'
import { splitIntoBlocks } from '../../lib/songBlocks'
import { EFFECTS } from '../../lib/effects'
import { SongSearchOnlineModal } from './SongSearchOnlineModal'
import { LiveToggleButton } from '../common/LiveToggleButton'

type Mode = 'list' | 'create' | 'reading'

interface DraftSong {
  title: string
  artist: string
  author: string
  lyrics: string
}

const EMPTY_DRAFT: DraftSong = { title: '', artist: '', author: '', lyrics: '' }

export function SongBrowserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [songs, setSongs] = useState<SongSummary[] | null>(null)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<Mode>('list')
  const [draft, setDraft] = useState<DraftSong>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [onlineSearchOpen, setOnlineSearchOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [blockIndex, setBlockIndex] = useState(0)
  const loadingSongRef = useRef<string | null>(null)
  const overlayKeyRef = useRef(0)
  const blockRefs = useRef<(HTMLDivElement | null)[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [editIsNew, setEditIsNew] = useState(false)

  const refreshSongs = (): void => {
    window.api?.song.list().then(setSongs)
  }

  useEffect(() => {
    if (!open) return
    refreshSongs()
  }, [open])

  useEffect(() => {
    if (!open) {
      setMode('list')
      setSelectedSong(null)
      setOnlineSearchOpen(false)
      window.api?.live.pushOverlay(null)
    }
  }, [open])

  const filteredSongs = useMemo(() => {
    if (!songs) return []
    const q = query.trim().toLowerCase()
    if (!q) return songs
    return songs.filter((s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q))
  }, [songs, query])

  /** Manda o slide pro LIVE com o efeito/destaques dele. `replay` refaz a
   * animação de entrada; sem replay (ex.: marcar uma palavra) só atualiza o destaque. */
  const pushBlock = (song: Song, index: number, replay = true): void => {
    const text = song.blocks[index]
    if (text === undefined) return
    const fx = song.blockFx?.[index]
    if (replay) overlayKeyRef.current = Date.now()
    window.api?.live.pushOverlay({
      text,
      reference: '',
      effect: fx?.effect ?? null,
      highlights: fx?.highlights ?? [],
      key: overlayKeyRef.current
    })
  }

  const openReading = async (id: string): Promise<void> => {
    if (!window.api) return
    loadingSongRef.current = id
    const song = await window.api.song.read(id)
    if (loadingSongRef.current !== id) return
    // re-divide em blocos de 2 linhas (músicas salvas antes tinham blocos maiores)
    const newBlocks = splitIntoBlocks(song.blocks.join('\n\n'))
    const blockFx =
      song.blockFx && song.blockFx.length === newBlocks.length ? song.blockFx : newBlocks.map(() => null)
    const normalized: Song = { ...song, blocks: newBlocks, blockFx }
    setSelectedSong(normalized)
    setBlockIndex(0)
    setMode('reading')
    pushBlock(normalized, 0)
  }

  const exitReading = (): void => {
    setMode('list')
    setSelectedSong(null)
    window.api?.live.pushOverlay(null)
  }

  const stepBlock = (direction: 1 | -1): void => {
    if (!selectedSong) return
    const next = blockIndex + direction
    if (next < 0 || next >= selectedSong.blocks.length) return
    setBlockIndex(next)
    pushBlock(selectedSong, next)
  }

  /** Grava a lista de blocos editada (texto, novo slide, exclusão) na música salva. */
  const persistBlocks = async (
    song: Song,
    newBlocks: string[],
    newFx: (SlideFx | null)[] = song.blockFx ?? newBlocks.map(() => null)
  ): Promise<Song> => {
    const updated: Song = { ...song, blocks: newBlocks, blockFx: newFx }
    setSelectedSong(updated)
    await window.api?.song.save(updated)
    return updated
  }

  const startEdit = (i: number, isNew = false): void => {
    if (!selectedSong) return
    setBlockIndex(i)
    setEditingIndex(i)
    setEditIsNew(isNew)
    setEditText(isNew ? '' : selectedSong.blocks[i])
  }

  const cancelEdit = (): void => {
    if (editingIndex === null || !selectedSong) return
    // slide novo cancelado sem texto: descarta (nada foi salvo ainda)
    if (editIsNew) {
      const remaining = selectedSong.blocks.filter((_, idx) => idx !== editingIndex)
      const remainingFx = (selectedSong.blockFx ?? []).filter((_, idx) => idx !== editingIndex)
      setSelectedSong({ ...selectedSong, blocks: remaining, blockFx: remainingFx })
      setBlockIndex(Math.max(0, Math.min(editingIndex - 1, remaining.length - 1)))
    }
    setEditingIndex(null)
    setEditIsNew(false)
  }

  const commitEdit = async (): Promise<void> => {
    if (editingIndex === null || !selectedSong) return
    const text = editText
      .split('\n')
      .map((l) => l.trim())
      .join('\n')
      .trim()
    const index = editingIndex
    setEditingIndex(null)
    setEditIsNew(false)
    if (!text) {
      if (editIsNew) cancelEditNew(index)
      else await deleteBlock(index)
      return
    }
    const newBlocks = selectedSong.blocks.map((b, idx) => (idx === index ? text : b))
    // palavras mudaram de lugar: mantém o efeito do slide, limpa os destaques
    const newFx = (selectedSong.blockFx ?? newBlocks.map(() => null)).map((fx, idx) =>
      idx === index && fx ? { ...fx, highlights: [] } : fx
    )
    const updated = await persistBlocks(selectedSong, newBlocks, newFx)
    pushBlock(updated, index)
  }

  const cancelEditNew = (index: number): void => {
    if (!selectedSong) return
    const remaining = selectedSong.blocks.filter((_, idx) => idx !== index)
    const remainingFx = (selectedSong.blockFx ?? []).filter((_, idx) => idx !== index)
    setSelectedSong({ ...selectedSong, blocks: remaining, blockFx: remainingFx })
    setBlockIndex(Math.max(0, Math.min(index - 1, remaining.length - 1)))
  }

  const deleteBlock = async (i: number): Promise<void> => {
    if (!selectedSong || selectedSong.blocks.length <= 1) return
    const newBlocks = selectedSong.blocks.filter((_, idx) => idx !== i)
    const newFx = (selectedSong.blockFx ?? []).filter((_, idx) => idx !== i)
    const nextIndex = Math.min(i, newBlocks.length - 1)
    const updated = await persistBlocks(selectedSong, newBlocks, newFx)
    setBlockIndex(nextIndex)
    pushBlock(updated, nextIndex)
  }

  const addBlock = (): void => {
    if (!selectedSong) return
    const at = blockIndex + 1
    const newBlocks = [...selectedSong.blocks.slice(0, at), '', ...selectedSong.blocks.slice(at)]
    const fx = selectedSong.blockFx ?? selectedSong.blocks.map(() => null)
    const newFx = [...fx.slice(0, at), null, ...fx.slice(at)]
    setSelectedSong({ ...selectedSong, blocks: newBlocks, blockFx: newFx })
    startEdit(at, true)
  }

  /** Atualiza efeito/destaques do slide atual, salva na música e manda pro LIVE. */
  const updateSlideFx = async (patch: Partial<SlideFx>, replay: boolean): Promise<void> => {
    if (!selectedSong) return
    const fxList = selectedSong.blockFx ?? selectedSong.blocks.map(() => null)
    const current: SlideFx = fxList[blockIndex] ?? { effect: null, highlights: [] }
    const next: SlideFx = { ...current, ...patch }
    const cleaned = next.effect === null && next.highlights.length === 0 ? null : next
    const newFx = fxList.map((fx, idx) => (idx === blockIndex ? cleaned : fx))
    const updated = await persistBlocks(selectedSong, selectedSong.blocks, newFx)
    pushBlock(updated, blockIndex, replay)
  }

  const toggleHighlight = (wordIdx: number): void => {
    const current = selectedSong?.blockFx?.[blockIndex]?.highlights ?? []
    const next = current.includes(wordIdx) ? current.filter((w) => w !== wordIdx) : [...current, wordIdx].sort((a, b) => a - b)
    updateSlideFx({ highlights: next }, false)
  }

  const handleDelete = async (id: string, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    if (!window.api) return
    await window.api.song.delete(id)
    refreshSongs()
  }

  const handleSaveDraft = async (): Promise<void> => {
    if (!window.api || !draft.title.trim() || !draft.lyrics.trim()) return
    setSaving(true)
    try {
      const song: Song = {
        id: nanoid(),
        title: draft.title.trim(),
        artist: draft.artist.trim() || 'Desconhecido',
        author: draft.author.trim() || undefined,
        blocks: splitIntoBlocks(draft.lyrics),
        createdAt: Date.now()
      }
      await window.api.song.save(song)
      setDraft(EMPTY_DRAFT)
      setMode('list')
      refreshSongs()
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (mode === 'reading') blockRefs.current[blockIndex]?.scrollIntoView({ block: 'nearest' })
  }, [mode, blockIndex])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent): void => {
      if (editingIndex !== null) {
        if (e.key === 'Escape') {
          e.preventDefault()
          if (editIsNew && !editText.trim()) cancelEdit()
          else setEditingIndex(null)
        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          commitEdit()
        }
        return
      }

      if (mode === 'reading' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault()
        stepBlock(e.key === 'ArrowRight' ? 1 : -1)
        return
      }

      if (mode === 'reading' && e.key === 'Enter') {
        e.preventDefault()
        startEdit(blockIndex)
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        if (onlineSearchOpen) setOnlineSearchOpen(false)
        else if (mode === 'reading') exitReading()
        else if (mode === 'create') setMode('list')
        else onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, onlineSearchOpen, blockIndex, selectedSong, onClose, editingIndex, editText, editIsNew])

  if (!open) return null

  const blocks = selectedSong?.blocks ?? []
  const slideWords = (blocks[blockIndex] ?? '').split(/\s+/).filter(Boolean)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-surface-700 bg-surface-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-800 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
            <span>🎵</span>
            <span>
              {mode === 'create' ? 'Nova música' : mode === 'reading' ? selectedSong?.title : 'Músicas'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LiveToggleButton />
            <button onClick={onClose} className="icon-btn h-8 w-8 text-lg" title="Fechar">
              ×
            </button>
          </div>
        </div>

        {mode === 'list' && (
          <>
            <div className="flex items-center gap-2 border-b border-surface-800 px-4 py-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar na sua biblioteca..."
                className="field-input flex-1"
              />
              <button
                onClick={() => setOnlineSearchOpen(true)}
                className="rounded-md border border-surface-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-surface-800"
              >
                Pesquisar na internet
              </button>
              <button
                onClick={() => {
                  setDraft(EMPTY_DRAFT)
                  setNotice(null)
                  setMode('create')
                }}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
              >
                + Nova música
              </button>
            </div>

            <div className="flex-1 overflow-y-scroll p-2">
              {!songs ? (
                <div className="flex h-full items-center justify-center text-sm text-neutral-600">
                  {window.api ? 'Carregando…' : 'API do Electron indisponível neste ambiente.'}
                </div>
              ) : filteredSongs.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-neutral-600">
                  Nenhuma música salva ainda.
                </div>
              ) : (
                filteredSongs.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => openReading(s.id)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left hover:bg-surface-800"
                  >
                    <div>
                      <div className="text-sm text-neutral-100">{s.title}</div>
                      <div className="text-xs text-neutral-500">{s.artist}</div>
                    </div>
                    <span
                      role="button"
                      onClick={(e) => handleDelete(s.id, e)}
                      title="Excluir"
                      className="icon-btn h-7 w-7 shrink-0 text-sm opacity-50 hover:!opacity-100"
                    >
                      🗑
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {mode === 'create' && (
          <div className="flex flex-1 flex-col gap-3 overflow-y-scroll p-5">
            {notice && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {notice}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="field-label mb-1">Título</div>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  className="field-input w-full"
                  autoFocus
                />
              </div>
              <div>
                <div className="field-label mb-1">Artista</div>
                <input
                  value={draft.artist}
                  onChange={(e) => setDraft((d) => ({ ...d, artist: e.target.value }))}
                  className="field-input w-full"
                />
              </div>
            </div>
            <div>
              <div className="field-label mb-1">Autor (opcional)</div>
              <input
                value={draft.author}
                onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))}
                className="field-input w-full"
              />
            </div>
            <div className="flex flex-1 flex-col">
              <div className="field-label mb-1">
                Letra — separe as estrofes com uma linha em branco (cada slide mostra 2 linhas por vez)
              </div>
              <textarea
                value={draft.lyrics}
                onChange={(e) => setDraft((d) => ({ ...d, lyrics: e.target.value }))}
                className="field-input min-h-[220px] flex-1 resize-none font-mono text-sm leading-relaxed"
                placeholder={'Primeira estrofe...\n\nSegunda estrofe...'}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setMode('list')}
                className="rounded-md px-3 py-1.5 text-sm text-neutral-400 hover:bg-surface-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={saving || !draft.title.trim() || !draft.lyrics.trim()}
                className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
              >
                {saving ? 'Salvando…' : 'Criar música'}
              </button>
            </div>
          </div>
        )}

        {mode === 'reading' && selectedSong && (
          <>
            <div className="flex items-center justify-between border-b border-surface-800 px-4 py-2 text-xs text-neutral-500">
              <span>
                <span className="font-medium text-accent">{selectedSong.title}</span> — {selectedSong.artist}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={addBlock}
                  className="rounded-md border border-surface-700 px-2 py-1 text-neutral-300 hover:bg-surface-800"
                >
                  + Novo slide
                </button>
                <span>
                  Slide {blockIndex + 1}/{blocks.length}
                </span>
              </div>
            </div>
            <div className="grid flex-1 grid-cols-3 content-start gap-3 overflow-y-scroll p-4">
              {blocks.map((text, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    blockRefs.current[i] = el
                  }}
                  onClick={() => {
                    if (editingIndex !== null) return
                    setBlockIndex(i)
                    pushBlock(selectedSong, i)
                  }}
                  onDoubleClick={() => editingIndex === null && startEdit(i)}
                  className={`group relative flex aspect-video cursor-pointer items-center justify-center whitespace-pre-line rounded-lg border-2 bg-black p-3 text-center text-sm font-semibold leading-snug text-white transition-colors ${
                    i === blockIndex ? 'border-accent' : 'border-surface-700 hover:border-surface-600'
                  }`}
                >
                  {editingIndex === i ? (
                    <div className="flex h-full w-full flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                      <textarea
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="field-input min-h-0 flex-1 resize-none text-center text-sm font-semibold"
                        placeholder="Texto do slide..."
                      />
                      <div className="flex justify-end gap-2 text-xs font-normal">
                        <button
                          onClick={() => (editIsNew && !editText.trim() ? cancelEdit() : setEditingIndex(null))}
                          className="rounded px-2 py-1 text-neutral-400 hover:bg-surface-800"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={commitEdit}
                          className="rounded bg-accent px-2 py-1 text-white hover:bg-accent-hover"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {text}
                      {(selectedSong.blockFx?.[i]?.effect || selectedSong.blockFx?.[i]?.highlights.length) && (
                        <span className="absolute bottom-1.5 left-2 text-xs" title="Slide com efeito">
                          ✨
                        </span>
                      )}
                      <div className="absolute right-1.5 top-1.5 hidden gap-1 group-hover:flex">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            startEdit(i)
                          }}
                          title="Editar texto"
                          className="icon-btn h-6 w-6 bg-surface-800 text-xs"
                        >
                          ✎
                        </button>
                        {blocks.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteBlock(i)
                            }}
                            title="Excluir slide"
                            className="icon-btn h-6 w-6 bg-surface-800 text-xs"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
              <button
                onClick={addBlock}
                className="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed border-surface-700 text-sm text-neutral-500 hover:border-surface-600 hover:text-neutral-300"
              >
                + Novo slide
              </button>
            </div>
            {editingIndex === null && blocks[blockIndex] !== undefined && (
              <div className="flex items-start gap-4 border-t border-surface-800 bg-surface-950/60 px-4 py-3">
                <div className="w-56 shrink-0">
                  <div className="field-label mb-1">Efeito de entrada do slide {blockIndex + 1}</div>
                  <select
                    value={selectedSong.blockFx?.[blockIndex]?.effect ?? ''}
                    onChange={(e) =>
                      updateSlideFx({ effect: (e.target.value || null) as SlideFx['effect'] }, true)
                    }
                    className="field-input w-full"
                  >
                    <option value="">Sem efeito</option>
                    {EFFECTS.map((fx) => (
                      <option key={fx.id} value={fx.id}>
                        {fx.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => pushBlock(selectedSong, blockIndex, true)}
                    className="mt-2 w-full rounded-md border border-surface-700 px-2 py-1 text-xs text-neutral-300 hover:bg-surface-800"
                  >
                    ▶ Repetir no LIVE
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="field-label mb-1">
                    Clique nas palavras para destacar (brilho pulsante). Some sozinho ao passar pro próximo slide.
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {slideWords.map((word, wi) => {
                      const on = selectedSong.blockFx?.[blockIndex]?.highlights.includes(wi)
                      return (
                        <button
                          key={`${wi}-${word}`}
                          onClick={() => toggleHighlight(wi)}
                          className={`rounded-md border px-2 py-1 text-sm transition-colors ${
                            on
                              ? 'border-amber-400 bg-amber-400/20 font-semibold text-amber-200'
                              : 'border-surface-700 text-neutral-300 hover:bg-surface-800'
                          }`}
                        >
                          {word}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center justify-center gap-8 border-t border-surface-800 px-3 py-1.5 text-[11px] text-neutral-600">
              <span>← → trocam de slide</span>
              <span>Enter ou duplo clique edita · ⌘/Ctrl+Enter salva</span>
              <span>Esc sai do modo leitura</span>
            </div>
          </>
        )}

        {onlineSearchOpen && (
          <SongSearchOnlineModal
            onCancel={() => setOnlineSearchOpen(false)}
            onUseResult={({ title, artist, lyrics }) => {
              setDraft({ title, artist, author: '', lyrics })
              setNotice(
                lyrics
                  ? null
                  : 'Não achei a letra automaticamente pra essa música — cole a letra abaixo (separe as estrofes com uma linha em branco).'
              )
              setOnlineSearchOpen(false)
              setMode('create')
            }}
          />
        )}
      </div>
    </div>
  )
}
