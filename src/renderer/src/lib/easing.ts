import type { EasingType } from '@shared/types/project'

type EasingFn = (t: number) => number

const easings: Record<EasingType, EasingFn> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
}

export function applyEasing(easing: EasingType, t: number): number {
  const clamped = Math.min(1, Math.max(0, t))
  return easings[easing](clamped)
}

export const EASING_OPTIONS: { value: EasingType; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'easeIn', label: 'Ease In' },
  { value: 'easeOut', label: 'Ease Out' },
  { value: 'easeInOut', label: 'Ease In Out' }
]
