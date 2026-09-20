import { useMemo } from 'react'
import type { Scene } from '@shared/types/project'
import { resolveTransform } from '../../lib/animate'
import { LayerRenderer } from './LayerRenderer'
import { ScaledStage } from './ScaledStage'

export const CANVAS_WIDTH = 1280
export const CANVAS_HEIGHT = 720

/**
 * Mesma renderização do SceneCanvas do editor, mas sem depender da store —
 * recebe a cena e o playhead prontos (a janela LIVE só recebe estado via IPC).
 * Preenche a tela inteira mantendo a proporção 16:9 (letterbox se precisar).
 */
export function LiveCanvas({ scene, playhead }: { scene: Scene | null; playhead: number }) {
  const sortedLayers = useMemo(
    () => (scene ? [...scene.layers].sort((a, b) => a.order - b.order) : []),
    [scene]
  )

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <div
        className="relative h-full max-h-full w-full max-w-full overflow-hidden bg-black"
        style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
      >
        <ScaledStage>
        {sortedLayers.flatMap((layer) => {
          const segment = layer.segments.find(
            (seg) => playhead >= seg.start && playhead <= seg.start + seg.duration
          )
          if (!segment) return []
          return (
            <LayerRenderer
              key={layer.id}
              layer={layer}
              transform={resolveTransform(layer, playhead)}
              selected={false}
              playhead={playhead}
              segment={segment}
            />
          )
        })}
        </ScaledStage>
      </div>
    </div>
  )
}
