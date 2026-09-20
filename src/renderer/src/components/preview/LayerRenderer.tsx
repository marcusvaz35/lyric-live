import type { CSSProperties } from 'react'
import type { AnimatableProps, ClipSegment, Layer } from '@shared/types/project'
import { useEffect, useRef } from 'react'
import { useProjectStore } from '../../state/projectStore'
import { mediaUrl } from '../../lib/mediaUrl'
import { tornPolygon } from '../../lib/shapes'
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

  if (layer.type === 'shape' || layer.type === 'media') {
    const fx = getEffect(layer.effect)
    const fxPhase = fx ? computeEffectPhase(playhead, segment.start, segment.duration, fx.duration) : 1
    const ov: EffectOverlay = fx?.mode === 'block' && fx.overlay ? fx.overlay(fxPhase) : IDENTITY_OVERLAY
    const opacity = transform.opacity * ov.opacity
    const blur = transform.blur + ov.blur
    const common: CSSProperties = {
      opacity,
      filter: blur > 0 ? `blur(${blur}px)` : undefined,
      clipPath: ov.clipPath
    }
    const motion = `translate(${transform.position.x + ov.x}px, ${transform.position.y + ov.y}px) scale(${
      transform.scale * ov.scale
    }) rotate(${transform.rotation + ov.rotation}deg)`

    if (layer.type === 'shape') {
      return (
        <div
          onMouseDown={handleSelect}
          className={`absolute ${selected ? 'outline outline-2 outline-accent' : ''}`}
          style={{
            left: '50%',
            top: '50%',
            width: layer.width,
            height: layer.height,
            backgroundColor: layer.color,
            ...common,
            clipPath: layer.kind === 'torn' ? tornPolygon(layer.id) : common.clipPath,
            transform: `translate(-50%, -50%) ${motion}`
          }}
        />
      )
    }

    const src = mediaUrl(layer.filePath)
    const mediaStyle: CSSProperties = {
      ...common,
      mixBlendMode: layer.blendMode,
      objectFit: layer.fit,
      transform: motion
    }
    return (
      <div
        onMouseDown={handleSelect}
        className={`absolute inset-0 ${selected ? 'outline outline-2 outline-accent -outline-offset-2' : ''}`}
      >
        {layer.mediaKind === 'video' ? (
          <SyncedVideo src={src} time={playhead - segment.start} style={mediaStyle} />
        ) : (
          <img src={src} alt="" draggable={false} className="h-full w-full" style={mediaStyle} />
        )}
      </div>
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
            clipPath: overlay.clipPath,
            color: overlay.color,
            textShadow: overlay.textShadow,
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

/** Vídeo que segue o playhead: procura o quadro certo e só toca enquanto o tempo anda. */
function SyncedVideo({ src, time, style }: { src: string; time: number; style: CSSProperties }) {
  const ref = useRef<HTMLVideoElement>(null)
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null
    const target = duration ? ((time % duration) + duration) % duration : Math.max(0, time)
    if (Math.abs(video.currentTime - target) > 0.3) video.currentTime = target
    video.play().catch(() => {})
    if (idle.current) clearTimeout(idle.current)
    idle.current = setTimeout(() => video.pause(), 250)
  }, [time])

  useEffect(
    () => () => {
      if (idle.current) clearTimeout(idle.current)
    },
    []
  )

  return <video ref={ref} src={src} muted loop playsInline preload="auto" className="h-full w-full" style={style} />
}
