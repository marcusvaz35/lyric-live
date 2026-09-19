import {
  ANIMATABLE_PROP_KEYS,
  type AnimatableProps,
  type Keyframe,
  type Layer,
  type Vec2
} from '@shared/types/project'
import { applyEasing } from './easing'

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
}

function isVec2(value: unknown): value is Vec2 {
  return typeof value === 'object' && value !== null && 'x' in value && 'y' in value
}

function interpolateValue<T>(a: T, b: T, t: number): T {
  if (isVec2(a) && isVec2(b)) return lerpVec2(a, b, t) as T
  if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, t) as T
  return t < 1 ? a : b
}

function resolveTrack<T>(track: Keyframe<T>[] | undefined, base: T, time: number): T {
  if (!track || track.length === 0) return base
  const sorted = [...track].sort((a, b) => a.time - b.time)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  if (time <= first.time) return first.value
  if (time >= last.time) return last.value

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (time >= a.time && time <= b.time) {
      const span = b.time - a.time
      const t = span === 0 ? 1 : (time - a.time) / span
      return interpolateValue(a.value, b.value, applyEasing(b.easing, t))
    }
  }
  return last.value
}

/** Resolve as propriedades animáveis de um layer num instante da cena. */
export function resolveTransform(layer: Layer, time: number): AnimatableProps {
  const result = { ...layer.transform }
  for (const key of ANIMATABLE_PROP_KEYS) {
    const track = layer.keyframes[key]
    // @ts-expect-error -- união heterogênea por chave, resolvida em runtime
    result[key] = resolveTrack(track, layer.transform[key], time)
  }
  return result
}
