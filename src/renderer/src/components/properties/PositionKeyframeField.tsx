import type { Layer, Vec2 } from '@shared/types/project'
import { useProjectStore } from '../../state/projectStore'
import { resolveTransform } from '../../lib/animate'
import { Icon } from '../common/Icon'

interface Props {
  layer: Layer
  playhead: number
}

const EPSILON = 0.05

export function PositionKeyframeField({ layer, playhead }: Props) {
  const setTransformBase = useProjectStore((s) => s.setTransformBase)
  const setKeyframe = useProjectStore((s) => s.setKeyframe)
  const removeKeyframesForProp = useProjectStore((s) => s.removeKeyframesForProp)

  const track = layer.keyframes.position
  const animated = !!track && track.length > 0
  const resolved = resolveTransform(layer, playhead).position
  const hasKeyframeHere = animated && track!.some((k) => Math.abs(k.time - playhead) < EPSILON)

  const handleChange = (axis: keyof Vec2, raw: number): void => {
    if (Number.isNaN(raw)) return
    const value: Vec2 = { ...resolved, [axis]: raw }
    if (animated) {
      setKeyframe(layer.id, 'position', playhead, value)
    } else {
      setTransformBase(layer.id, 'position', value)
    }
  }

  const toggleAnimation = (): void => {
    if (animated) {
      removeKeyframesForProp(layer.id, 'position')
      setTransformBase(layer.id, 'position', resolved)
    } else {
      setKeyframe(layer.id, 'position', playhead, resolved)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="field-label w-14 shrink-0">Posição</span>
      <input
        type="number"
        value={Math.round(resolved.x)}
        onChange={(e) => handleChange('x', parseFloat(e.target.value))}
        className="field-input"
        title="X"
      />
      <input
        type="number"
        value={Math.round(resolved.y)}
        onChange={(e) => handleChange('y', parseFloat(e.target.value))}
        className="field-input"
        title="Y"
      />
      <button
        onClick={toggleAnimation}
        title={animated ? 'Remover animação' : 'Animar propriedade'}
        className={`icon-btn shrink-0 ${animated ? 'text-accent' : ''} ${
          hasKeyframeHere ? 'ring-1 ring-accent' : ''
        }`}
      >
        <Icon name="clock" size={14} />
      </button>
    </div>
  )
}
