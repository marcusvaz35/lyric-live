import { useEffect, useRef } from 'react'
import { computeEffectPhase, type EffectDef, type EffectOverlay } from '../../lib/effects'

const PREVIEW_TEXT = 'Efeito'
const HOLD = 0.9 // segundos parado no meio, totalmente visível
const PAUSE = 0.5 // pausa em branco antes de repetir o ciclo

function applyOverlay(el: HTMLElement, overlay: EffectOverlay): void {
  el.style.opacity = String(overlay.opacity)
  el.style.filter = overlay.blur > 0 ? `blur(${overlay.blur}px)` : 'none'
  el.style.clipPath = overlay.clipPath ?? 'none'
  el.style.color = overlay.color ?? ''
  el.style.textShadow = overlay.textShadow ?? 'none'
  el.style.transform = `translate(${overlay.x}px, ${overlay.y}px) scale(${overlay.scale}) rotate(${overlay.rotation}deg)`
}

/** Mostra o efeito tocando em loop (entra, segura, sai, pausa) pra dar pra ver antes de aplicar. */
export function EffectPreview({ effect }: { effect: EffectDef }) {
  const blockRef = useRef<HTMLDivElement>(null)
  const charRefs = useRef<(HTMLSpanElement | null)[]>([])
  const chars = [...PREVIEW_TEXT]

  useEffect(() => {
    const cycle = effect.duration * 2 + HOLD
    const total = cycle + PAUSE
    const start = performance.now()
    let raf = 0

    const tick = (now: number): void => {
      const t = ((now - start) / 1000) % total
      const phase = t > cycle ? 0 : computeEffectPhase(t, 0, cycle, effect.duration)

      if (effect.mode === 'block' && effect.overlay && blockRef.current) {
        applyOverlay(blockRef.current, effect.overlay(phase))
      } else if (effect.mode === 'chars' && effect.charOverlay) {
        chars.forEach((char, i) => {
          const span = charRefs.current[i]
          if (!span) return
          const { overlay, charOverride } = effect.charOverlay!(phase, i, chars.length, char)
          applyOverlay(span, overlay)
          span.textContent = charOverride ?? char
        })
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effect])

  return (
    <div className="flex h-10 items-center justify-center overflow-hidden rounded-md bg-surface-950">
      {effect.mode === 'chars' ? (
        <div className="text-sm font-medium text-neutral-100">
          {chars.map((char, i) => (
            <span
              key={i}
              ref={(el) => {
                charRefs.current[i] = el
              }}
              className="inline-block"
            >
              {char}
            </span>
          ))}
        </div>
      ) : (
        <div ref={blockRef} className="text-sm font-medium text-neutral-100">
          {PREVIEW_TEXT}
        </div>
      )}
    </div>
  )
}
