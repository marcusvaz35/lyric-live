import type { Layer } from '@shared/types/project'
import { useProjectStore } from '../../state/projectStore'
import { PositionKeyframeField } from './PositionKeyframeField'
import { NumberKeyframeField } from './NumberKeyframeField'

export function TransformSection({ layer }: { layer: Layer }) {
  const playhead = useProjectStore((s) => s.playhead)

  return (
    <div className="space-y-2">
      <div className="panel-label">Transformação</div>
      <PositionKeyframeField layer={layer} playhead={playhead} />
      <NumberKeyframeField layer={layer} propKey="scale" label="Escala" playhead={playhead} step={0.05} />
      <NumberKeyframeField
        layer={layer}
        propKey="rotation"
        label="Rotação"
        playhead={playhead}
        step={1}
      />
      <NumberKeyframeField
        layer={layer}
        propKey="opacity"
        label="Opacidade"
        playhead={playhead}
        step={0.05}
        min={0}
        max={1}
      />
      <NumberKeyframeField
        layer={layer}
        propKey="blur"
        label="Blur"
        playhead={playhead}
        step={1}
        min={0}
      />
    </div>
  )
}
