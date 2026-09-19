import type { CSSProperties } from 'react'
import type { AnimatableProps, ClipSegment, Layer } from '@shared/types/project'
import { useProjectStore } from '../../state/projectStore'
import { computeEffectPhase, getEffect, IDENTITY_OVERLAY, type EffectOverlay } from '../../lib/effects'

interface Props {
  layer: Layer
  transform: AnimatableProps
  selected: boolean
  playhead: number
  segment: ClipSegment
}

export function LayerRenderer({ layer, transform, selected, playhead, segment }: Props) {
  const selectLayer = useProjectStore((s) => s.selectLayer)

  if (!layer.visible) return null

  const handleSelect = (e: React.MouseEvent): void => {
    e.stopPropagation()
    if (!layer.locked) selectLayer(layer.id)
  }

  if (layer.type === 'background') {
    const filter = transform.blur > 0 ? `blur(${transform.blur}px)` : undefined
    const style: CSSProperties = {
      opacity: transform.opacity,
      filter,
      transform: `scale(${transform.scale})`,
      ...(layer.fill.kind === 'color'
        ? { backgroundColor: layer.fill.color }
        : {
            backgroundImage: `linear-gradient(${layer.fill.angle}deg, ${layer.fill.from}, ${layer.fill.to})`
          })
    }
    return (
      <div
        onMouseDown={handleSelect}
        className={`absolute inset-0 ${selected ? 'outline outline-2 outline-accent -outline-offset-2' : ''}`}
        style={style}
      />
    )
  }

  const effect = getEffect(layer.effect)
  const phase = effect ? computeEffectPhase(playhead, segment.start, segment.duration, effect.duration) : 1

  const baseTextStyle: CSSProperties = {
    left: '50%',
    top: '50%',
    fontFamily: layer.fontFamily,
    fontSize: layer.fontSize,
    fontWeight: layer.fontWeight,
    fontStyle: layer.italic ? 'italic' : 'normal',
    textAlign: layer.align,
    color: layer.color,
    letterSpacing: layer.letterSpacing,
    lineHeight: layer.lineHeight,
    whiteSpace: 'pre-wrap'
  }

  if (effect?.mode === 'chars' && effect.charOverlay) {
    const chars = [...layer.text]
    const wrapperTransform = `translate(-50%, -50%) translate(${transform.position.x}px, ${transform.position.y}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`
    return (
      <div
        onMouseDown={handleSelect}
        className={`absolute max-w-[90%] cursor-move select-none px-2 ${
          selected ? 'outline outline-2 outline-accent' : ''
        }`}
        style={{
          ...baseTextStyle,
          opacity: transform.opacity,
          filter: transform.blur > 0 ? `blur(${transform.blur}px)` : undefined,
          transform: wrapperTransform
        }}
      >
        {chars.map((char, i) => {
          if (char === '\n') return <br key={i} />
          const { overlay, charOverride } = effect.charOverlay!(phase, i, chars.length, char)
          const charStyle: CSSProperties = {
            display: 'inline-block',
            opacity: overlay.opacity,
            filter: overlay.blur > 0 ? `blur(${overlay.blur}px)` : undefined,
            transform: `translate(${overlay.x}px, ${overlay.y}px) scale(${overlay.scale}) rotate(${overlay.rotation}deg)`
          }
          return (
            <span key={i} style={charStyle}>
              {char === ' ' ? ' ' : (charOverride ?? char)}
            </span>
          )
        })}
      </div>
    )
  }

  const overlay: EffectOverlay = effect?.overlay ? effect.overlay(phase) : IDENTITY_OVERLAY
  const finalOpacity = transform.opacity * overlay.opacity
  const finalBlur = transform.blur + overlay.blur
  const style: CSSProperties = {
    ...baseTextStyle,
    letterSpacing: layer.letterSpacing + (overlay.letterSpacing ?? 0),
    opacity: finalOpacity,
    filter: finalBlur > 0 ? `blur(${finalBlur}px)` : undefined,
    clipPath: overlay.clipPath,
    transform: `translate(-50%, -50%) translate(${transform.position.x + overlay.x}px, ${
      transform.position.y + overlay.y
    }px) scale(${transform.scale * overlay.scale}) rotate(${transform.rotation + overlay.rotation}deg)`
  }

  return (
    <div
      onMouseDown={handleSelect}
      className={`absolute max-w-[90%] cursor-move select-none px-2 ${
        selected ? 'outline outline-2 outline-accent' : ''
      }`}
      style={style}
    >
      {layer.text}
    </div>
  )
}
