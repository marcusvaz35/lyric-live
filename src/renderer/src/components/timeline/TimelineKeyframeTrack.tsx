import { useRef, useState } from 'react'
import {
  ANIMATABLE_PROP_KEYS,
  type AnimatablePropKey,
  type ClipSegment,
  type Layer
} from '@shared/types/project'
import { useProjectStore } from '../../state/projectStore'
import type { TimelineTool } from './Timeline'

const PROP_COLOR: Record<AnimatablePropKey, string> = {
  position: '#6d5efc',
  scale: '#31c48d',
  rotation: '#f59e0b',
  opacity: '#38bdf8',
  blur: '#f472b6'
}

const CLIP_STYLE: Record<Layer['type'], string> = {
  text: 'bg-indigo-500/25 border-indigo-400/60',
  background: 'bg-amber-500/20 border-amber-400/50'
}

const HANDLE_WIDTH = 10

const TOOL_CURSOR: Record<TimelineTool, string> = {
  select: 'cursor-text',
  erase: 'cursor-cell'
}

export function TimelineKeyframeTrack({
  layer,
  pps,
  duration,
  tool,
  onErase
}: {
  layer: Layer
  pps: number
  duration: number
  tool: TimelineTool
  onErase: (layerId: string, segmentId: string) => void
}) {
  const setPlayhead = useProjectStore((s) => s.setPlayhead)

  const handleTrackMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect()
    const time = (e.clientX - rect.left) / pps
    const segment = layer.segments.find((seg) => time >= seg.start && time <= seg.start + seg.duration)

    if (segment && tool === 'erase') {
      onErase(layer.id, segment.id)
      return
    }
    setPlayhead(time)
  }

  return (
    <div
      onMouseDown={handleTrackMouseDown}
      className={`relative h-9 border-b border-surface-800 bg-surface-950/40 ${TOOL_CURSOR[tool]}`}
      style={{ width: duration * pps }}
    >
      {layer.segments.map((segment) => (
        <TimelineClipSegment key={segment.id} layer={layer} segment={segment} pps={pps} />
      ))}

      {ANIMATABLE_PROP_KEYS.map((key) =>
        (layer.keyframes[key] ?? []).map((kf) => (
          <div
            key={kf.id}
            title={`${key} @ ${kf.time.toFixed(2)}s`}
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45"
            style={{ left: kf.time * pps, backgroundColor: PROP_COLOR[key] }}
          />
        ))
      )}
    </div>
  )
}

function TimelineClipSegment({
  layer,
  segment,
  pps
}: {
  layer: Layer
  segment: ClipSegment
  pps: number
}) {
  const resizeSegment = useProjectStore((s) => s.resizeSegment)
  const dragRef = useRef<{ startX: number; startDuration: number } | null>(null)
  const [resizing, setResizing] = useState(false)

  const handleResizeStart = (e: React.MouseEvent): void => {
    e.stopPropagation()
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startDuration: segment.duration }
    setResizing(true)

    const onMouseMove = (moveEvent: MouseEvent): void => {
      if (!dragRef.current) return
      const deltaTime = (moveEvent.clientX - dragRef.current.startX) / pps
      resizeSegment(layer.id, segment.id, dragRef.current.startDuration + deltaTime)
    }
    const onMouseUp = (): void => {
      dragRef.current = null
      setResizing(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div
      className={`group absolute inset-y-1.5 rounded-md border ${CLIP_STYLE[layer.type]} ${
        resizing ? 'ring-1 ring-accent' : ''
      }`}
      style={{ left: segment.start * pps, width: segment.duration * pps }}
    >
      <div
        onMouseDown={handleResizeStart}
        title="Arraste para aumentar ou diminuir a duração"
        className="absolute right-0 top-0 flex h-full cursor-col-resize items-center justify-center rounded-r-md border-l border-black/20 bg-white/10 group-hover:bg-accent/70 hover:!bg-accent"
        style={{ width: HANDLE_WIDTH }}
      >
        <div className="h-3 w-0.5 rounded-full bg-white/70" />
      </div>
    </div>
  )
}
