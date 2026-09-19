import { useEffect, useRef, useState } from 'react'
import { useProjectStore } from '../../state/projectStore'
import { formatTime, formatDuration, parseDuration } from '../../lib/time'
import { TimelineLayerRow } from './TimelineLayerRow'
import { TimelineKeyframeTrack } from './TimelineKeyframeTrack'
import { TimelineRuler } from './TimelineRuler'
import { TimelineAudioGutterRow, TimelineAudioWaveform, AUDIO_ROW_HEIGHT } from './TimelineAudioTrack'
import { useSceneAudioController } from './useSceneAudioController'

const DEFAULT_PPS = 90 // pixels por segundo
const MIN_PPS = 15
const MAX_PPS = 500
const ZOOM_SENSITIVITY = 0.0025
const RULER_HEIGHT = 24
const ROW_HEIGHT = 36

export type TimelineTool = 'select' | 'erase'

const TOOLS: { id: TimelineTool; icon: string; label: string }[] = [
  { id: 'select', icon: '🖱️', label: 'Mouse (selecionar e mover playhead)' },
  { id: 'erase', icon: '🗑️', label: 'Apagar (clique num clipe para excluir)' }
]

export function Timeline() {
  const scene = useProjectStore((s) => s.currentScene())
  const playhead = useProjectStore((s) => s.playhead)
  const isPlaying = useProjectStore((s) => s.isPlaying)
  const play = useProjectStore((s) => s.play)
  const pause = useProjectStore((s) => s.pause)
  const setPlayhead = useProjectStore((s) => s.setPlayhead)
  const setSceneDuration = useProjectStore((s) => s.setSceneDuration)
  const splitLayerClip = useProjectStore((s) => s.splitLayerClip)
  const eraseSegment = useProjectStore((s) => s.eraseSegment)

  const [pps, setPps] = useState(DEFAULT_PPS)
  const [tool, setTool] = useState<TimelineTool>('select')
  const trackAreaRef = useRef<HTMLDivElement>(null)
  const { peaks } = useSceneAudioController(scene)

  useEffect(() => {
    const container = trackAreaRef.current
    if (!container) return

    const onWheel = (e: WheelEvent): void => {
      // Ctrl+scroll (mouse) e pinch de trackpad (o navegador já marca ctrlKey nesse gesto)
      if (!e.ctrlKey) return
      e.preventDefault()

      const cursorX = e.clientX - container.getBoundingClientRect().left
      const deltaY = Math.max(-200, Math.min(200, e.deltaY))

      setPps((prevPps) => {
        const timeAtCursor = (container.scrollLeft + cursorX) / prevPps
        const nextPps = Math.min(MAX_PPS, Math.max(MIN_PPS, prevPps * Math.exp(-deltaY * ZOOM_SENSITIVITY)))
        requestAnimationFrame(() => {
          container.scrollLeft = timeAtCursor * nextPps - cursorX
        })
        return nextPps
      })
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [])

  const handlePlayheadDragStart = (e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    if (isPlaying) pause()
    const container = trackAreaRef.current
    if (!container) return

    const onMouseMove = (moveEvent: MouseEvent): void => {
      const rect = container.getBoundingClientRect()
      setPlayhead((container.scrollLeft + moveEvent.clientX - rect.left) / pps)
    }
    const onMouseUp = (): void => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const layers = [...scene.layers].sort((a, b) => b.order - a.order)
  const bodyHeight = RULER_HEIGHT + AUDIO_ROW_HEIGHT + layers.length * ROW_HEIGHT

  // Ação instantânea: corta no playhead atual e não vira um "modo" — cada clique corta uma vez só.
  // (splitLayerClip não faz nada se o playhead não estiver dentro de um segmento do layer)
  const handleCutClick = (): void => {
    for (const layer of layers) {
      splitLayerClip(layer.id, playhead)
    }
  }

  return (
    <div className="flex min-w-0 flex-col overflow-hidden border-t border-surface-800 bg-surface-900">
      <div className="flex items-center gap-3 border-b border-surface-800 px-3 py-1.5">
        <button
          onClick={() => (isPlaying ? pause() : play())}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white hover:bg-accent-hover"
          title="Espaço"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="icon-btn" title="Ir para o início" onClick={() => setPlayhead(0)}>
          ⏮
        </button>

        <div className="h-5 w-px bg-surface-700" />

        <div className="flex items-center gap-0.5">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.label}
              className={`flex h-7 w-7 items-center justify-center rounded-md text-sm transition-colors ${
                tool === t.id
                  ? 'bg-accent/20 text-neutral-100 ring-1 ring-accent'
                  : 'text-neutral-400 hover:bg-surface-700 hover:text-neutral-100'
              }`}
            >
              {t.icon}
            </button>
          ))}
          <button
            onClick={handleCutClick}
            title="Corte (corta no playhead atual; não fica selecionado, funciona só no clique)"
            className="flex h-7 w-7 items-center justify-center rounded-md text-sm text-neutral-400 transition-colors hover:bg-surface-700 hover:text-neutral-100"
          >
            ✂️
          </button>
        </div>

        <div className="h-5 w-px bg-surface-700" />

        <span className="font-mono text-xs text-neutral-400">
          {formatTime(playhead)} / {formatTime(scene.duration)}
        </span>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-neutral-500">
          Duração da cena
          <SceneDurationInput
            sceneId={scene.id}
            duration={scene.duration}
            onCommit={setSceneDuration}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 shrink-0 overflow-y-auto border-r border-surface-800">
          <div className="h-6 border-b border-surface-800 bg-surface-850" />
          <TimelineAudioGutterRow scene={scene} />
          {layers.map((layer) => (
            <TimelineLayerRow key={layer.id} layer={layer} />
          ))}
        </div>

        <div ref={trackAreaRef} className="relative flex-1 overflow-auto">
          <TimelineRuler pps={pps} duration={scene.duration} />
          <TimelineAudioWaveform
            peaks={peaks}
            pps={pps}
            duration={scene.duration}
            hasAudio={!!scene.audio}
          />
          {layers.map((layer) => (
            <TimelineKeyframeTrack
              key={layer.id}
              layer={layer}
              pps={pps}
              duration={scene.duration}
              tool={tool}
              onErase={eraseSegment}
            />
          ))}
          <div className="absolute top-0 w-px" style={{ left: playhead * pps, height: bodyHeight }}>
            <div className="pointer-events-none absolute inset-0 bg-accent" />
            <div
              onMouseDown={handlePlayheadDragStart}
              title="Arraste para mover o playhead"
              className="absolute -left-2.5 top-0 h-3 w-5 cursor-ew-resize rounded-sm bg-accent hover:bg-accent-hover"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function SceneDurationInput({
  sceneId,
  duration,
  onCommit
}: {
  sceneId: string
  duration: number
  onCommit: (sceneId: string, duration: number) => void
}) {
  const [value, setValue] = useState(() => formatDuration(duration))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setValue(formatDuration(duration))
  }, [duration, focused])

  const commit = (): void => {
    const parsed = parseDuration(value)
    if (parsed !== null && parsed > 0) {
      onCommit(sceneId, parsed)
    } else {
      setValue(formatDuration(duration))
    }
    setFocused(false)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      placeholder="mm:ss"
      title="Formato mm:ss (ex.: 02:35)"
      onFocus={() => setFocused(true)}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      className="field-input h-6 w-16 py-0 text-center font-mono"
    />
  )
}
