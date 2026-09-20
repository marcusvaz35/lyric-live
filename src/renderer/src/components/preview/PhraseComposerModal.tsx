import { useEffect, useMemo, useRef, useState } from 'react'
import type { EffectId, TextLayer } from '@shared/types/project'
import { useProjectStore } from '../../state/projectStore'
import { composePhrase, PHRASE_PRESETS, toPhraseLayout, type WordOverride } from '../../lib/phraseComposer'
import type { PhraseLayout } from '@shared/types/phrase'
import { FontPicker } from '../common/FontPicker'
import { FONT_OPTIONS } from '../../lib/fonts'
import { EffectPicker } from './EffectPicker'
import { setUndoScope } from '../../lib/undoScope'
import { PhraseStage } from './LiveTextOverlay'
import { Icon } from '../common/Icon'

/** Resume quais palavras têm efeito próprio (pra detectar mudança de efeito). */
const effectSig = (o: Record<number, WordOverride>): string =>
  Object.entries(o)
    .filter(([, v]) => v.effect !== undefined)
    .map(([k, v]) => `${k}:${v.effect}`)
    .join('|')

/** Monta uma frase pronta: digita, escolhe o estilo, e vira uma camada por palavra
 * (mistura de fontes/tamanhos/inclinação) entrando em cascata na timeline. */
export function PhraseComposerModal({
  onClose,
  initialPhrase,
  onCreated,
  onApply,
  onApplyAll
}: {
  onClose: () => void
  /** Texto que já vem preenchido (ex.: o slide de uma música). */
  initialPhrase?: string
  /** Chamado depois de criar as camadas na timeline. */
  onCreated?: () => void
  /** Modo ao vivo: em vez de criar camadas na timeline, devolve a frase estilizada pra aplicar no slide. */
  onApply?: (layout: PhraseLayout, effect: EffectId | null) => void
  /** Modo ao vivo: aplica o mesmo estilo em todos os slides. `build` refaz o layout pro texto de cada slide
   * (estilo, cor, efeito e atraso valem; ajustes manuais de palavras específicas ficam só neste slide). */
  onApplyAll?: (build: (text: string) => PhraseLayout, current: PhraseLayout) => void
}) {
  const scene = useProjectStore((s) => s.currentScene())
  const playhead = useProjectStore((s) => s.playhead)
  const addLayers = useProjectStore((s) => s.addLayers)

  const [phrase, setPhrase] = useState(initialPhrase?.replace(/\s*\n\s*/g, ' ').trim() || 'Deus é fiel para sempre')
  const [presetId, setPresetId] = useState(PHRASE_PRESETS[0].id)
  const [accent, setAccent] = useState('#ffd54a')
  const [effect, setEffect] = useState<EffectId | ''>('slide-y-overshoot')
  const [duration, setDuration] = useState(3)
  const [stagger, setStagger] = useState(0.25)
  const [overrides, setOverrides] = useState<Record<number, WordOverride>>({})
  const [selectedWord, setSelectedWord] = useState<number | null>(null)
  /** Palavras que a pessoa arrastou com o mouse: só elas ficam paradas quando o tamanho
   * da letra da música muda (as outras se reorganizam em linhas). */
  const [movedWords, setMovedWords] = useState<Record<number, true>>({})
  /** Muda pra refazer a animação da prévia (ao trocar efeito/estilo/atraso ou no botão). */
  const [previewKey, setPreviewKey] = useState(0)

  // ---- Desfazer/refazer do estilo (Ctrl/⌘+Z enquanto esta janela está aberta) ----
  interface StyleState {
    overrides: Record<number, WordOverride>
    presetId: string
    effect: EffectId | ''
    accent: string
    stagger: number
  }
  const currentStyle: StyleState = { overrides, presetId, effect, accent, stagger }
  const currentStyleRef = useRef(currentStyle)
  currentStyleRef.current = currentStyle
  const pastRef = useRef<StyleState[]>([])
  const futureRef = useRef<StyleState[]>([])
  const groupRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Guarda o estado atual antes de uma mudança. Mudanças seguidas (`grouped`) viram um passo só. */
  const record = (grouped = false): void => {
    if (grouped && groupRef.current) {
      clearTimeout(groupRef.current)
      groupRef.current = setTimeout(() => (groupRef.current = null), 600)
      return
    }
    pastRef.current.push(currentStyleRef.current)
    if (pastRef.current.length > 100) pastRef.current.shift()
    futureRef.current = []
    if (grouped) groupRef.current = setTimeout(() => (groupRef.current = null), 600)
  }

  const restoreStyle = (st: StyleState): void => {
    const cur = currentStyleRef.current
    // se algo que normalmente reinicia a prévia vai mudar, avisa pra não reiniciar dessa vez
    skipRestartRef.current =
      cur.effect !== st.effect ||
      cur.presetId !== st.presetId ||
      cur.stagger !== st.stagger ||
      effectSig(cur.overrides) !== effectSig(st.overrides)
    setOverrides(st.overrides)
    setPresetId(st.presetId)
    setEffect(st.effect)
    setAccent(st.accent)
    setStagger(st.stagger)
  }

  useEffect(() => {
    setUndoScope({
      undo: () => {
        if (groupRef.current) clearTimeout(groupRef.current)
        groupRef.current = null
        const prev = pastRef.current.pop()
        if (!prev) return
        futureRef.current.push(currentStyleRef.current)
        restoreStyle(prev)
      },
      redo: () => {
        const next = futureRef.current.pop()
        if (!next) return
        pastRef.current.push(currentStyleRef.current)
        restoreStyle(next)
      }
    })
    return () => setUndoScope(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // se a quantidade de palavras muda, as posições manuais não valem mais
  const wordCount = phrase.trim().split(/\s+/).filter(Boolean).length
  useEffect(() => {
    setOverrides((o) =>
      Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { ...v, x: undefined, y: undefined }]))
    )
  }, [wordCount])

  // recomeça a prévia quando muda algum efeito (o geral ou o de uma palavra)
  const effectSignature = effectSig(overrides)
  /** Desfazer/refazer não deve reiniciar o movimento da prévia (só reposicionar). */
  const skipRestartRef = useRef(false)
  useEffect(() => {
    if (skipRestartRef.current) {
      skipRestartRef.current = false
      return
    }
    setPreviewKey((k) => k + 1)
  }, [effect, presetId, stagger, phrase, effectSignature])

  // as fontes só carregam quando usadas; recalcula o layout (que mede o texto) quando ficarem prontas
  const [fontsTick, setFontsTick] = useState(0)
  useEffect(() => {
    let cancelled = false
    Promise.all(
      FONT_OPTIONS.flatMap((f) =>
        [400, 700, 800, 900].flatMap((w) => [
          document.fonts.load(`${w} 40px "${f}"`).catch(() => []),
          document.fonts.load(`italic ${w} 40px "${f}"`).catch(() => [])
        ])
      )
    ).then(() => {
      if (!cancelled) setFontsTick((n) => n + 1)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const layers = useMemo(
    () =>
      composePhrase({
        phrase,
        overrides,
        presetId,
        accent,
        effect: effect || undefined,
        start: onApply ? 0 : playhead,
        duration: onApply ? 60 : duration,
        stagger,
        sceneDuration: onApply ? 120 : scene.duration
      }),
    [phrase, overrides, presetId, accent, effect, playhead, duration, stagger, scene.duration, onApply, fontsTick]
  )

  const previewLayout = useMemo(() => toPhraseLayout(layers, onApply ? 0 : playhead), [layers, onApply, playhead])
  // ao mexer numa palavra com o mouse, congela a posição de todas (senão as outras se
  // reorganizariam sozinhas a cada mudança de tamanho)
  const freezeLayout = (): void =>
    setOverrides((o) => {
      const next = { ...o }
      wordLayers.forEach((l, i) => {
        next[i] = { ...next[i], x: next[i]?.x ?? l.transform.position.x, y: next[i]?.y ?? l.transform.position.y }
      })
      return next
    })

  const wordLayers = layers.filter((l): l is TextLayer => l.type === 'text')
  const selected = selectedWord !== null ? wordLayers[selectedWord] : undefined

  const patchWord = (patch: WordOverride): void => {
    if (selectedWord === null) return
    record(true)
    setOverrides((o) => ({ ...o, [selectedWord]: { ...o[selectedWord], ...patch } }))
  }

  /** Marca quais palavras foram postas no lugar à mão, pro layout saber o que não reorganizar. */
  const markMoved = (layout: PhraseLayout): PhraseLayout => ({
    ...layout,
    items: layout.items.map((it, i) => (movedWords[i] ? { ...it, moved: true } : it))
  })

  const handleApplyAll = (): void => {
    if (!onApplyAll) return
    const build = (text: string): PhraseLayout =>
      toPhraseLayout(
        composePhrase({
          phrase: text,
          overrides: {},
          presetId,
          accent,
          effect: effect || undefined,
          start: 0,
          duration: 60,
          stagger,
          sceneDuration: 120
        }),
        0
      )
    onApplyAll(build, markMoved(toPhraseLayout(layers, 0)))
    onClose()
  }

  const handleCreate = (): void => {
    if (onApply) {
      onApply(markMoved(toPhraseLayout(layers, 0)), effect || null)
      onClose()
      return
    }
    addLayers(layers)
    onClose()
    onCreated?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-surface-700 bg-surface-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-800 px-4 py-3">
          <div className="text-sm font-semibold text-neutral-100">{onApply ? 'Estilizar slide ao vivo' : 'Nova frase'}</div>
          <button onClick={onClose} className="icon-btn h-8 w-8 text-lg" title="Fechar">
            ×
          </button>
        </div>

        <div className="flex flex-1 gap-4 overflow-y-auto p-4">
          <div className="w-72 shrink-0 space-y-3">
            <div>
              <div className="field-label mb-1">Frase</div>
              <input
                autoFocus
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && layers.length > 0 && handleCreate()}
                className="field-input"
              />
            </div>
            <div>
              <div className="field-label mb-1">Estilo</div>
              <div className="space-y-1.5">
                {PHRASE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      record()
                      setPresetId(p.id)
                      setOverrides({})
                      setMovedWords({})
                    }}
                    className={`block w-full rounded-md border px-3 py-2 text-left transition-colors ${
                      presetId === p.id ? 'border-accent bg-accent/10' : 'border-surface-700 hover:bg-surface-800'
                    }`}
                  >
                    <div className="text-sm text-neutral-100">{p.label}</div>
                    <div className="text-[11px] leading-snug text-neutral-500">{p.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="relative w-full overflow-hidden rounded-md bg-black" style={{ aspectRatio: '16 / 9' }}>
              <PhraseStage
                phrase={previewLayout}
                replayKey={previewKey}
                selectedIndex={selectedWord}
                onSelectItem={setSelectedWord}
                onEditText={(i, text) => {
                  const original = phrase.trim().split(/\s+/).filter(Boolean)[i] ?? ''
                  const clean = text.trim()
                  record()
                  // vazio (ou igual à palavra original) volta ao texto da frase
                  setOverrides((o) => ({ ...o, [i]: { ...o[i], text: clean && clean !== original ? clean : undefined } }))
                }}
                onBeginEdit={() => {
                  record()
                  freezeLayout()
                }}
                onEditItem={(i, edit) => {
                  if (edit.moved) setMovedWords((m) => ({ ...m, [i]: true }))
                  setOverrides((o) => ({ ...o, [i]: { ...o[i], ...edit } }))
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-neutral-500">
              <span>O movimento toca uma vez quando você muda o efeito; use “Ver de novo” para rever.</span>
              <button
                onClick={() => setPreviewKey((k) => k + 1)}
                className="rounded-md border border-surface-700 px-2 py-1 text-neutral-300 hover:bg-surface-800"
              >
                <Icon name="replay" size={12} className="mr-1 inline" />Ver de novo
              </button>
            </div>

            <div>
              <div className="field-label mb-1">Clique numa palavra (aqui ou na prévia) para ajustá-la; dois cliques na prévia deixam digitar outro texto</div>
              <div className="flex flex-wrap gap-1.5">
                {wordLayers.map((l, i) => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedWord(i === selectedWord ? null : i)}
                    className={`rounded-md border px-2 py-1 text-sm transition-colors ${
                      i === selectedWord
                        ? 'border-accent bg-accent/15 text-neutral-100'
                        : overrides[i]
                          ? 'border-amber-400/60 text-amber-200 hover:bg-surface-800'
                          : 'border-surface-700 text-neutral-300 hover:bg-surface-800'
                    }`}
                  >
                    {l.text}
                  </button>
                ))}
              </div>
              {selected && (
                <div className="mt-2 grid grid-cols-2 gap-2 rounded-md border border-surface-800 bg-surface-950/60 p-2.5 sm:grid-cols-5">
                  <div className="col-span-2">
                    <div className="field-label mb-1">Fonte de “{selected.text}”</div>
                    <FontPicker value={selected.fontFamily} onChange={(f) => patchWord({ fontFamily: f })} />
                  </div>
                  <div>
                    <div className="field-label mb-1">Tamanho</div>
                    <input
                      type="number"
                      value={selected.fontSize}
                      onChange={(e) => patchWord({ fontSize: Math.max(10, Number(e.target.value)) })}
                      className="field-input"
                    />
                  </div>
                  <div>
                    <div className="field-label mb-1">Inclinação (°)</div>
                    <input
                      type="number"
                      value={selected.transform.rotation}
                      onChange={(e) => patchWord({ rotation: Number(e.target.value) })}
                      className="field-input"
                    />
                  </div>
                  <div>
                    <div className="field-label mb-1">Cor</div>
                    <input
                      type="color"
                      value={selected.color}
                      onChange={(e) => patchWord({ color: e.target.value })}
                      className="h-8 w-full cursor-pointer rounded-md border border-surface-600 bg-surface-800"
                    />
                  </div>
                  <label className="col-span-2 flex items-center gap-2 text-xs text-neutral-400 sm:col-span-4">
                    <input
                      type="checkbox"
                      checked={selected.italic}
                      onChange={(e) => patchWord({ italic: e.target.checked })}
                    />
                    Itálico
                  </label>
                  <div className="col-span-2 sm:col-span-5">
                    <div className="field-label mb-1">Efeito só de “{selected.text}”</div>
                    <EffectPicker
                      value={overrides[selectedWord as number]?.effect ?? 'inherit'}
                      onChange={(v) => patchWord({ effect: v === 'inherit' ? undefined : (v as EffectId | 'none') })}
                      leading={[
                        { value: 'inherit', label: 'Igual à frase' },
                        { value: 'none', label: 'Sem efeito' }
                      ]}
                    />
                  </div>
                  <button
                    onClick={() => {
                      record()
                      setOverrides((o) => {
                        const { [selectedWord as number]: _removed, ...rest } = o
                        return rest
                      })
                    }}
                    className="rounded-md border border-surface-700 px-2 py-1 text-xs text-neutral-300 hover:bg-surface-800"
                  >
                    Restaurar estilo
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="field-label mb-1">Cor de destaque</div>
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => {
                    record(true)
                    setAccent(e.target.value)
                  }}
                  className="h-8 w-full cursor-pointer rounded-md border border-surface-600 bg-surface-800"
                />
              </div>
              <div className={onApply ? 'hidden' : ''}>
                <div className="field-label mb-1">Duração na tela (s)</div>
                <input
                  type="number"
                  min={1}
                  step={0.5}
                  value={duration}
                  onChange={(e) => setDuration(Math.max(0.5, Number(e.target.value)))}
                  className="field-input"
                />
              </div>
              <div>
                <div className="field-label mb-1">Atraso entre palavras (s)</div>
                <input
                  type="number"
                  min={0}
                  step={0.05}
                  value={stagger}
                  onChange={(e) => setStagger(Math.max(0, Number(e.target.value)))}
                  className="field-input"
                />
              </div>
            </div>
            <div>
              <div className="field-label mb-1">Efeito de entrada da frase (todas as palavras)</div>
              <EffectPicker
                value={effect || 'none'}
                onChange={(v) => {
                  record()
                  setEffect(v === 'none' ? '' : (v as EffectId))
                }}
                leading={[{ value: 'none', label: 'Sem efeito' }]}
              />
            </div>
            <p className="text-[11px] text-neutral-600">
              {onApply
                ? 'Não vai pra timeline. “Só neste slide” aplica aqui, com os ajustes que você fez palavra por palavra. “Em todos os slides” usa o estilo, a cor, o efeito e o atraso em cada slide (os ajustes manuais de palavras ficam só neste).'
                : `A frase começa onde está a agulha da timeline (agora em ${playhead.toFixed(1)}s). Depois de criar, cada
              palavra é uma camada que você pode mover, trocar de fonte ou de efeito.`}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-surface-800 px-4 py-3">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-neutral-400 hover:bg-surface-800">
            Cancelar
          </button>
          {onApply && onApplyAll && (
            <button
              onClick={handleApplyAll}
              disabled={layers.length === 0}
              title="Usa este estilo, cor, efeito e atraso em todos os slides da música"
              className="rounded-md border border-accent px-4 py-1.5 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-40"
            >
              Aplicar em todos os slides
            </button>
          )}
          <button
            onClick={handleCreate}
            disabled={layers.length === 0}
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {onApply ? (onApplyAll ? 'Aplicar só neste slide' : 'Aplicar ao slide') : 'Criar na timeline'}
          </button>
        </div>
      </div>
    </div>
  )
}
