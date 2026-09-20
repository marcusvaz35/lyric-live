import { useMemo } from 'react'
import { useProjectStore } from '../../state/projectStore'
import { resolveTransform } from '../../lib/animate'
import { LayerRenderer } from './LayerRenderer'
import { ScaledStage } from './ScaledStage'

export const CANVAS_WIDTH = 1280
export const CANVAS_HEIGHT = 720

export function SceneCanvas() {
  const scene = useProjectStore((s) => s.currentScene())
  const playhead = useProjectStore((s) => s.playhead)
  const selectedLayerId = useProjectStore((s) => s.selectedLayerId)
  const selectLayer = useProjectStore((s) => s.selectLayer)

  const sortedLayers = useMemo(
    () => [...scene.layers].sort((a, b) => a.order - b.order),
    [scene.layers]
  )

  return (
    <div
      className="relative w-full overflow-hidden bg-black shadow-2xl"
      style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
      onMouseDown={() => selectLayer(null)}
    >
      <ScaledStage>
      {sortedLayers.flatMap((layer) => {
        const segment = layer.segments.find((seg) => playhead >= seg.start && playhead <= seg.start + seg.duration)
        if (!segment) return []
        return (
          <LayerRenderer
            key={layer.id}
            layer={layer}
            transform={resolveTransform(layer, playhead)}
            selected={layer.id === selectedLayerId}
            playhead={playhead}
            segment={segment}
          />
        )
      })}
      </ScaledStage>
    </div>
  )
}
