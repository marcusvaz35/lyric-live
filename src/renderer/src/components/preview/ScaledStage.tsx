import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export const STAGE_WIDTH = 1280
export const STAGE_HEIGHT = 720

/** Palco lógico fixo de 1280×720 escalado pra caber no espaço disponível — assim
 * tamanho de fonte/posição ficam iguais no editor, na janela LIVE e no telão. */
export function ScaledStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = (): void => setScale(el.clientWidth / STAGE_WIDTH)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <div
        style={{
          position: 'relative',
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }}
      >
        {children}
      </div>
    </div>
  )
}
