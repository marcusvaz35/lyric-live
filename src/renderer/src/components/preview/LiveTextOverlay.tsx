import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import type { LiveOverlayPayload } from '@shared/types/ipc'
import type { PhraseLayout } from '@shared/types/phrase'
import type { WordFontStyle } from '@shared/types/song'
import type { EffectId } from '@shared/types/project'
import { getEffect, IDENTITY_OVERLAY, type EffectOverlay } from '../../lib/effects'
import { tornPolygon } from '../../lib/shapes'
import { ScaledStage } from './ScaledStage'

const HIGHLIGHT_COLOR = '#ffd54a'

/** Texto do slide com efeito de entrada (phase 0→1 pelo tempo do preset) e
 * palavras destacadas com brilho pulsante. Sem efeito, mostra direto. */
export function useEntrancePhase(effectId: LiveOverlayPayload['effect'], replayKey: unknown): number {
  const effect = getEffect(effectId ?? undefined)
  const [phase, setPhase] = useState(effect ? 0 : 1)

  useEffect(() => {
    if (!effect) {
      setPhase(1)
      return
    }
    let raf = 0
    const start = performance.now()
    setPhase(0)
    const tick = (now: number): void => {
      const p = Math.min(1, (now - start) / (effect.duration * 1000))
      setPhase(p)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectId, replayKey])

  return phase
}

/** Renderiza o texto quebrando em palavras (índice = só as não-vazias) e, se o
 * efeito for por letra, aplicando o overlay em cada caractere. */
export function EffectText({
  text,
  effectId,
  phase,
  highlights = [],
  highlightDelayMs = 0,
  wordStyles,
  wordEffects,
  elapsed = 0,
  wordEffectDelay = 0
}: {
  text: string
  effectId?: LiveOverlayPayload['effect']
  phase: number
  highlights?: number[]
  highlightDelayMs?: number
  wordStyles?: Record<number, WordFontStyle>
  /** Efeito só de certas palavras, com o tempo (s) desde a entrada do slide. */
  wordEffects?: Record<number, EffectId>
  elapsed?: number
  wordEffectDelay?: number
}) {
  const effect = getEffect(effectId ?? undefined)
  const charMode = effect?.mode === 'chars' && effect.charOverlay
  const totalChars = [...text].length
  let wordIndex = -1
  let charIndex = 0

  const renderChars = (word: string): React.ReactNode =>
    [...word].map((ch, i) => {
      const idx = charIndex++
      if (!charMode) return ch
      const { overlay, charOverride } = effect!.charOverlay!(phase, idx, totalChars, ch)
      const style: CSSProperties = {
        display: 'inline-block',
        opacity: overlay.opacity,
        filter: overlay.blur > 0 ? `blur(${overlay.blur}px)` : undefined,
        clipPath: overlay.clipPath,
        color: overlay.color,
        textShadow: overlay.textShadow,
        transform: `translate(${overlay.x}px, ${overlay.y}px) scale(${overlay.scale}) rotate(${overlay.rotation}deg)`
      }
      return (
        <span key={i} style={style}>
          {charOverride ?? ch}
        </span>
      )
    })

  return (
    <>
      {text.split('\n').map((line, li, lines) => (
        <span key={li}>
          {line.split(/(\s+)/).map((token, ti) => {
            if (!token) return null
            if (/^\s+$/.test(token)) {
              charIndex += token.length
              return <span key={ti}>{token}</span>
            }
            wordIndex++
            const highlighted = highlights.includes(wordIndex)
            const ws = wordStyles?.[wordIndex]
            const custom: CSSProperties = ws
              ? {
                  fontFamily: ws.fontFamily,
                  fontStyle: ws.italic === undefined ? undefined : ws.italic ? 'italic' : 'normal',
                  color: ws.color,
                  fontSize: ws.scale ? `${ws.scale}em` : undefined
                }
              : {}
            const style: CSSProperties = highlighted
              ? {
                  display: 'inline-block',
                  ...custom,
                  color: ws?.color ?? HIGHLIGHT_COLOR,
                  animation: `lyric-highlight 1.6s ease-in-out ${highlightDelayMs}ms infinite`
                }
              : { display: charMode ? 'inline-block' : 'inline', ...custom }
            const wfx = getEffect(wordEffects?.[wordIndex])
            if (wfx) {
              const wp = clamp01((elapsed - wordEffectDelay) / wfx.duration)
              const wordChars = [...token]
              charIndex += wordChars.length // mantém a contagem global de letras
              const blockOv = wfx.mode === 'block' && wfx.overlay ? wfx.overlay(wp) : IDENTITY_OVERLAY
              // o brilho pulsante anima `transform`; num elemento só ele apagaria o transform do
              // efeito da palavra, então o pulso vai num invólucro interno
              const { animation: pulse, ...baseStyle } = style
              return (
                <span
                  key={ti}
                  style={{
                    ...baseStyle,
                    display: 'inline-block',
                    opacity: blockOv.opacity,
                    filter: blockOv.blur > 0 ? `blur(${blockOv.blur}px)` : undefined,
                    clipPath: blockOv.clipPath,
                    letterSpacing: blockOv.letterSpacing ? `${blockOv.letterSpacing}px` : undefined,
                    transform: `translate(${blockOv.x}px, ${blockOv.y}px) scale(${blockOv.scale}) rotate(${blockOv.rotation}deg)`
                  }}
                >
                  <span style={{ display: 'inline-block', animation: pulse }}>
                  {wfx.mode === 'chars' && wfx.charOverlay
                    ? wordChars.map((ch, k) => {
                        const { overlay: co, charOverride } = wfx.charOverlay!(wp, k, wordChars.length, ch)
                        return (
                          <span
                            key={k}
                            style={{
                              display: 'inline-block',
                              opacity: co.opacity,
                              filter: co.blur > 0 ? `blur(${co.blur}px)` : undefined,
                              clipPath: co.clipPath,
                              color: co.color,
                              textShadow: co.textShadow,
                              transform: `translate(${co.x}px, ${co.y}px) scale(${co.scale}) rotate(${co.rotation}deg)`
                            }}
                          >
                            {charOverride ?? ch}
                          </span>
                        )
                      })
                    : token}
                  </span>
                </span>
              )
            }
            return (
              <span key={ti} style={style}>
                {renderChars(token)}
              </span>
            )
          })}
          {li < lines.length - 1 && (charIndex++, <br />)}
        </span>
      ))}
    </>
  )
}

/** Tela cheia com o texto em exibição (versículo ou slide de música) — igual
 * o Holyrics, some a cena de fundo e só mostra o texto. */
export function LiveTextOverlay({
  overlay,
  embedded = false
}: {
  overlay: LiveOverlayPayload
  /** Prévia dentro de uma caixa 16:9 (fonte em cqw, relativa à caixa) em vez de tela cheia. */
  embedded?: boolean
}) {
  const effect = getEffect(overlay.effect ?? undefined)
  const fontScale = overlay.fontScale && overlay.fontScale > 0 ? overlay.fontScale : 1
  const phase = useEntrancePhase(overlay.effect, overlay.key)
  const blockOverlay = effect?.mode === 'block' && effect.overlay ? effect.overlay(phase) : IDENTITY_OVERLAY

  // efeitos só de certas palavras: tocam depois da entrada do slide
  const wordFxList = Object.values(overlay.wordEffects ?? {}).map((id) => getEffect(id))
  const wordEffectDelay = (effect?.duration ?? 0) + 0.2
  const wordFxEnd = wordFxList.length ? wordEffectDelay + Math.max(...wordFxList.map((f) => f?.duration ?? 0)) + 0.1 : 0.01
  const elapsed = useElapsed(overlay.key, wordFxEnd)

  const textStyle: CSSProperties = {
    fontSize: embedded ? `calc(4.4cqw * ${fontScale})` : `calc(clamp(28px, 4.4vw, 96px) * ${fontScale})`,
    whiteSpace: 'pre-line',
    opacity: blockOverlay.opacity,
    filter: blockOverlay.blur > 0 ? `blur(${blockOverlay.blur}px)` : undefined,
    clipPath: blockOverlay.clipPath,
    letterSpacing: blockOverlay.letterSpacing ? `${blockOverlay.letterSpacing}px` : undefined,
    transform: `translate(${blockOverlay.x}px, ${blockOverlay.y}px) scale(${blockOverlay.scale}) rotate(${blockOverlay.rotation}deg)`
  }

  if (overlay.phrase) {
    return (
      <div className={`${embedded ? 'absolute' : 'fixed'} inset-0`}>
        <PhraseStage phrase={overlay.phrase} replayKey={overlay.key} highlights={overlay.highlights} zoom={fontScale} />
      </div>
    )
  }

  return (
    <div
      className={`${embedded ? 'absolute' : 'fixed'} inset-0 flex flex-col items-center justify-center bg-black text-center ${
        embedded ? 'gap-[3cqw] px-[8cqw]' : 'gap-[3vw] px-[8vw]'
      }`}
    >
      <p className="font-semibold leading-[1.3] text-white" style={textStyle}>
        <EffectText
          text={overlay.text}
          effectId={overlay.effect}
          phase={phase}
          highlights={overlay.highlights}
          wordStyles={overlay.wordStyles}
          wordEffects={overlay.wordEffects}
          elapsed={elapsed}
          wordEffectDelay={wordEffectDelay}
          highlightDelayMs={effect ? Math.round(effect.duration * 1000) : 0}
        />
      </p>
      {overlay.reference && (
        <p
          className="font-medium text-accent"
          style={{ fontSize: embedded ? '2cqw' : 'clamp(16px, 2vw, 40px)' }}
        >
          {overlay.reference}
        </p>
      )}
    </div>
  )
}

const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))

/** Segundos desde que `replayKey` mudou, até `endSeconds` (depois disso para de atualizar). */
function useElapsed(replayKey: unknown, endSeconds: number): number {
  const [t, setT] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    setT(0)
    const tick = (now: number): void => {
      const elapsed = (now - start) / 1000
      setT(Math.min(elapsed, endSeconds))
      if (elapsed < endSeconds) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [replayKey, endSeconds])
  return t
}

/** Alterações feitas com o mouse numa palavra (só na janela de edição). */
export interface ItemEdit {
  x?: number
  y?: number
  fontSize?: number
  rotation?: number
}

const HANDLE = 12

/** Frase estilizada (uma palavra por item, cada uma com sua fonte/posição/entrada em cascata).
 * Com `onEditItem`, a palavra selecionada ganha caixa com alças: arrastar move, cantos
 * mudam o tamanho e a alça de cima gira. */
export function PhraseStage({
  phrase,
  replayKey,
  highlights = [],
  zoom = 1,
  selectedIndex,
  onSelectItem,
  onEditItem,
  onBeginEdit,
  onEndEdit,
  onEditText
}: {
  phrase: PhraseLayout
  replayKey: unknown
  highlights?: number[]
  /** Aumenta/diminui a frase inteira (tamanho da letra da música), mantendo as proporções. */
  zoom?: number
  /** Só na janela de edição: destaca e permite clicar numa palavra. */
  selectedIndex?: number | null
  onSelectItem?: (index: number | null) => void
  onEditItem?: (index: number, edit: ItemEdit) => void
  /** Chamado antes da primeira alteração de um gesto (pra congelar o layout das outras palavras). */
  onBeginEdit?: () => void
  /** Chamado ao soltar o mouse no fim de um gesto (pra gravar o resultado). */
  onEndEdit?: () => void
  /** Duplo clique numa palavra abre a digitação; devolve o novo texto ao confirmar. */
  onEditText?: (index: number, text: string) => void
}) {
  const end = Math.max(0.5, ...phrase.items.map((it) => it.delay + (getEffect(it.effect ?? undefined)?.duration ?? 0))) + 0.1
  const t = useElapsed(replayKey, end)
  const rootRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const uiScale = scale * zoom
  const editable = Boolean(onEditItem)
  const [editingText, setEditingText] = useState<{ index: number; draft: string } | null>(null)
  const lastDown = useRef<{ index: number; time: number }>({ index: -1, time: 0 })

  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const update = (): void => setScale(el.clientWidth / 1280)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const motion = (o: EffectOverlay, x: number, y: number, rotation: number): CSSProperties => ({
    opacity: o.opacity,
    filter: o.blur > 0 ? `blur(${o.blur}px)` : undefined,
    clipPath: o.clipPath,
    transform: `translate(-50%, -50%) translate(${x + o.x}px, ${y + o.y}px) scale(${o.scale}) rotate(${rotation + o.rotation}deg)`
  })

  const stripEffect = getEffect('mask-x')
  const stripOverlay = stripEffect?.overlay ? stripEffect.overlay(clamp01(t / stripEffect.duration)) : IDENTITY_OVERLAY

  /** Gesto de arrastar com o ponteiro capturado: chama `onMove` a cada movimento. */
  const startGesture = (
    e: ReactPointerEvent,
    itemEl: HTMLElement,
    onMove: (ev: PointerEvent, center: { x: number; y: number }) => void
  ): void => {
    e.stopPropagation()
    e.preventDefault()
    // preventDefault no ponteiro impede o foco de sair de um campo de texto; sem tirar o foco,
    // Ctrl/⌘+Z iria pro desfazer do campo e não pro do estilo
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    const rect = itemEl.getBoundingClientRect()
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    onBeginEdit?.()
    const move = (ev: PointerEvent): void => onMove(ev, center)
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      onEndEdit?.()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const beginMove = (e: ReactPointerEvent, i: number): void => {
    const item = phrase.items[i]
    onSelectItem?.(i)
    if (!editable) return
    // duplo clique (dois cliques rápidos na mesma palavra) abre a digitação do texto
    const now = performance.now()
    if (onEditText && lastDown.current.index === i && now - lastDown.current.time < 400) {
      e.stopPropagation()
      e.preventDefault()
      lastDown.current = { index: -1, time: 0 }
      setEditingText({ index: i, draft: item.text })
      return
    }
    lastDown.current = { index: i, time: now }
    const startX = e.clientX
    const startY = e.clientY
    startGesture(e, e.currentTarget as HTMLElement, (ev) => {
      onEditItem?.(i, {
        x: Math.round(item.x + (ev.clientX - startX) / uiScale),
        y: Math.round(item.y + (ev.clientY - startY) / uiScale)
      })
    })
  }

  const beginScale = (e: ReactPointerEvent, i: number, itemEl: HTMLElement): void => {
    const item = phrase.items[i]
    const rect = itemEl.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const startDist = Math.hypot(e.clientX - cx, e.clientY - cy) || 1
    startGesture(e, itemEl, (ev) => {
      const dist = Math.hypot(ev.clientX - cx, ev.clientY - cy)
      onEditItem?.(i, { fontSize: Math.round(Math.min(700, Math.max(12, (item.fontSize * dist) / startDist))) })
    })
  }

  const beginRotate = (e: ReactPointerEvent, i: number, itemEl: HTMLElement): void => {
    const item = phrase.items[i]
    const rect = itemEl.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx)
    startGesture(e, itemEl, (ev) => {
      const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx)
      let rotation = item.rotation + ((angle - startAngle) * 180) / Math.PI
      if (ev.shiftKey) rotation = Math.round(rotation / 15) * 15
      onEditItem?.(i, { rotation: Math.round(rotation * 10) / 10 })
    })
  }

  const handleStyle = (extra: CSSProperties): CSSProperties => ({
    position: 'absolute',
    width: HANDLE / uiScale,
    height: HANDLE / uiScale,
    background: '#fff',
    border: `${2 / uiScale}px solid #6c5ce7`,
    borderRadius: 2 / uiScale,
    ...extra
  })

  return (
    <div ref={rootRef} className="absolute inset-0 bg-black" onPointerDown={editable ? () => onSelectItem?.(null) : undefined}>
      <ScaledStage>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${zoom})`, transformOrigin: 'center' }}>
        {phrase.strip && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: phrase.strip.width,
              height: phrase.strip.height,
              backgroundColor: phrase.strip.color,
              ...motion(stripOverlay, 0, 0, phrase.strip.rotation),
              clipPath: tornPolygon(phrase.strip.seed)
            }}
          />
        )}
        {phrase.items.map((item, i) => {
          const fx = getEffect(item.effect ?? undefined)
          const phase = fx ? clamp01((t - item.delay) / fx.duration) : t >= item.delay ? 1 : 0
          const blockOv: EffectOverlay = fx?.mode === 'block' && fx.overlay ? fx.overlay(phase) : IDENTITY_OVERLAY
          const visible = fx ? true : phase > 0
          const highlighted = highlights.includes(i)
          const selected = editable && selectedIndex === i
          return (
            <div
              key={i}
              onPointerDown={editable ? (e) => beginMove(e, i) : undefined}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                whiteSpace: 'pre',
                cursor: editable ? 'move' : undefined,
                touchAction: 'none',
                fontFamily: item.fontFamily,
                fontSize: item.fontSize,
                fontWeight: item.fontWeight,
                fontStyle: item.italic ? 'italic' : 'normal',
                color: highlighted ? '#ffd54a' : item.color,
                letterSpacing: item.letterSpacing,
                lineHeight: 1,
                ...motion(blockOv, item.x, item.y, item.rotation),
                ...(visible ? {} : { opacity: 0 })
              }}
            >
              {/* o pulso do destaque anima `transform`; aqui dentro ele não desfaz o posicionamento da palavra */}
              <span
                style={{
                  display: 'inline-block',
                  animation: highlighted
                    ? `lyric-highlight 1.6s ease-in-out ${Math.round(item.delay * 1000 + 400)}ms infinite`
                    : undefined
                }}
              >
              {editingText?.index === i ? (
                <input
                  autoFocus
                  value={editingText.draft}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => setEditingText({ index: i, draft: e.target.value })}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Enter') {
                      onEditText?.(i, editingText.draft)
                      setEditingText(null)
                    } else if (e.key === 'Escape') {
                      setEditingText(null)
                    }
                  }}
                  onBlur={() => {
                    if (editingText) onEditText?.(i, editingText.draft)
                    setEditingText(null)
                  }}
                  style={{
                    font: 'inherit',
                    color: 'inherit',
                    letterSpacing: 'inherit',
                    textAlign: 'center',
                    background: 'rgba(0,0,0,0.6)',
                    border: 'none',
                    outline: 'none',
                    padding: 0,
                    width: `${Math.max(3, editingText.draft.length + 1)}ch`,
                    cursor: 'text'
                  }}
                />
              ) : (
                <EffectText text={item.text} effectId={fx?.mode === 'chars' ? item.effect : null} phase={phase} />
              )}
              </span>
              {selected && (
                <div
                  style={{
                    position: 'absolute',
                    inset: -8,
                    border: `${2 / uiScale}px solid #6c5ce7`,
                    pointerEvents: 'none'
                  }}
                >
                  {(
                    [
                      { left: -HANDLE / 2 / uiScale, top: -HANDLE / 2 / uiScale, cursor: 'nwse-resize' },
                      { right: -HANDLE / 2 / uiScale, top: -HANDLE / 2 / uiScale, cursor: 'nesw-resize' },
                      { left: -HANDLE / 2 / uiScale, bottom: -HANDLE / 2 / uiScale, cursor: 'nesw-resize' },
                      { right: -HANDLE / 2 / uiScale, bottom: -HANDLE / 2 / uiScale, cursor: 'nwse-resize' }
                    ] as CSSProperties[]
                  ).map((pos, k) => (
                    <div
                      key={k}
                      onPointerDown={(e) => beginScale(e, i, e.currentTarget.parentElement!.parentElement as HTMLElement)}
                      style={{ ...handleStyle(pos), pointerEvents: 'auto', touchAction: 'none' }}
                    />
                  ))}
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: -26 / uiScale,
                      width: 1 / uiScale,
                      height: 26 / uiScale,
                      background: '#6c5ce7'
                    }}
                  />
                  <div
                    title="Girar (Shift = de 15 em 15°)"
                    onPointerDown={(e) => beginRotate(e, i, e.currentTarget.parentElement!.parentElement as HTMLElement)}
                    style={{
                      ...handleStyle({ left: '50%', top: -26 / uiScale - HANDLE / uiScale, marginLeft: -HANDLE / 2 / uiScale }),
                      borderRadius: '50%',
                      cursor: 'grab',
                      pointerEvents: 'auto',
                      touchAction: 'none'
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
        </div>
      </ScaledStage>
    </div>
  )
}
