import type { AnimatablePropKey, Layer } from '@shared/types/project'
import { useProjectStore } from '../../state/projectStore'
import { resolveTransform } from '../../lib/animate'
import { Icon } from '../common/Icon'

interface Props {
  layer: Layer
  propKey: Exclude<AnimatablePropKey, 'position'>
  label: string
  playhead: number
  step?: number
  min?: number
  max?: number
}

const EPSILON = 0.05

export function NumberKeyframeField({
  layer,
  propKey,
  label,
  playhead,
  step = 1,
  min,
  max
}: Props) {
  const setTransformBase = useProjectStore((s) => s.setTransformBase)
  const setKeyframe = useProjectStore((s) => s.setKeyframe)
  const removeKeyframesForProp = useProjectStore((s) => s.removeKeyframesForProp)

  const track = layer.keyframes[propKey]
  const animated = !!track && track.length > 0
  const resolved = resolveTransform(layer, playhead)[propKey] as number
  const hasKeyframeHere = animated && track!.some((k) => Math.abs(k.time - playhead) < EPSILON)

  const handleChange = (value: number): void => {
    if (Number.isNaN(value)) return
    if (animated) {
      setKeyframe(layer.id, propKey, playhead, value)
    } else {
      setTransformBase(layer.id, propKey, value)
    }
  }

  const toggleAnimation = (): void => {
    if (animated) {
      removeKeyframesForProp(layer.id, propKey)
      setTransformBase(layer.id, propKey, resolved)
    } else {
      setKeyframe(layer.id, propKey, playhead, resolved)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="field-label w-14 shrink-0">{label}</span>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={Math.round(resolved * 1000) / 1000}
        onChange={(e) => handleChange(parseFloat(e.target.value))}
        className="field-input"
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
