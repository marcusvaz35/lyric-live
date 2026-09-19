import { useEffect, useState, type CSSProperties } from 'react'
import type { LiveOverlayPayload } from '@shared/types/ipc'
import { getEffect, IDENTITY_OVERLAY } from '../../lib/effects'

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
  highlightDelayMs = 0
}: {
  text: string
  effectId?: LiveOverlayPayload['effect']
  phase: number
  highlights?: number[]
  highlightDelayMs?: number
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
            const style: CSSProperties = highlighted
              ? {
                  display: 'inline-block',
                  color: HIGHLIGHT_COLOR,
                  animation: `lyric-highlight 1.6s ease-in-out ${highlightDelayMs}ms infinite`
                }
              : { display: charMode ? 'inline-block' : 'inline' }
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
export function LiveTextOverlay({ overlay }: { overlay: LiveOverlayPayload }) {
  const effect = getEffect(overlay.effect ?? undefined)
  const phase = useEntrancePhase(overlay.effect, overlay.key)
  const blockOverlay = effect?.mode === 'block' && effect.overlay ? effect.overlay(phase) : IDENTITY_OVERLAY

  const textStyle: CSSProperties = {
    fontSize: 'clamp(28px, 4.4vw, 96px)',
    whiteSpace: 'pre-line',
    opacity: blockOverlay.opacity,
    filter: blockOverlay.blur > 0 ? `blur(${blockOverlay.blur}px)` : undefined,
    clipPath: blockOverlay.clipPath,
    letterSpacing: blockOverlay.letterSpacing ? `${blockOverlay.letterSpacing}px` : undefined,
    transform: `translate(${blockOverlay.x}px, ${blockOverlay.y}px) scale(${blockOverlay.scale}) rotate(${blockOverlay.rotation}deg)`
  }

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-[3vw] bg-black px-[8vw] text-center">
      <p className="font-semibold leading-[1.3] text-white" style={textStyle}>
        <EffectText
          text={overlay.text}
          effectId={overlay.effect}
          phase={phase}
          highlights={overlay.highlights}
          highlightDelayMs={effect ? Math.round(effect.duration * 1000) : 0}
        />
      </p>
      {overlay.reference && (
        <p className="font-medium text-accent" style={{ fontSize: 'clamp(16px, 2vw, 40px)' }}>
          {overlay.reference}
        </p>
      )}
    </div>
  )
}
