import { useEffect, useRef, useState } from 'react'
import type { Scene } from '@shared/types/project'
import { useProjectStore } from '../../state/projectStore'
import { importSceneAudio, removeSceneAudio } from '../../lib/audioIO'
import { TranscribeModal } from './TranscribeModal'
import { Icon } from '../common/Icon'

export const AUDIO_ROW_HEIGHT = 48

export function TimelineAudioGutterRow({ scene }: { scene: Scene }) {
  const [transcribing, setTranscribing] = useState(false)
  return (
    <div
      className="flex items-center gap-1.5 border-b border-surface-800 px-2 text-xs"
      style={{ height: AUDIO_ROW_HEIGHT }}
    >
      <Icon name="music" size={14} className="text-neutral-400" />
      {scene.audio ? (
        <>
          <span className="flex-1 truncate text-neutral-300" title={scene.audio.fileName}>
            {scene.audio.fileName}
          </span>
          <button
            className="flex h-6 shrink-0 items-center rounded-md border border-surface-600 px-1.5 text-[11px] text-neutral-300 transition-colors hover:border-accent hover:text-neutral-100"
            title="Transcrever a letra da música e criar as linhas na timeline"
            onClick={() => setTranscribing(true)}
          >
            Transcrever
          </button>
          <button
            className="icon-btn h-6 w-6"
            title="Trocar música"
            onClick={() => importSceneAudio(scene.id)}
          >
            ⟳
          </button>
          <button
            className="icon-btn h-6 w-6"
            title="Remover música"
            onClick={() => removeSceneAudio(scene.id)}
          >
            ×
          </button>
        </>
      ) : (
        <button
          onClick={() => importSceneAudio(scene.id)}
          className="flex-1 truncate rounded-md border border-dashed border-surface-600 px-2 py-1 text-left text-neutral-500 transition-colors hover:border-accent hover:text-neutral-300"
        >
          + Importar música
        </button>
      )}
      {transcribing && <TranscribeModal scene={scene} onClose={() => setTranscribing(false)} />}
    </div>
  )
}

export function TimelineAudioWaveform({
  peaks,
  pps,
  duration,
  hasAudio
}: {
  peaks: Float32Array | null
  pps: number
  duration: number
  hasAudio: boolean
}) {
  const setPlayhead = useProjectStore((s) => s.setPlayhead)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const width = Math.max(1, Math.round(duration * pps))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = AUDIO_ROW_HEIGHT * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, AUDIO_ROW_HEIGHT)
    if (!peaks || peaks.length === 0) return

    const mid = AUDIO_ROW_HEIGHT / 2
    ctx.fillStyle = '#38bdf8'
    for (let x = 0; x < width; x++) {
      const amp = peaks[Math.floor((x / width) * peaks.length)] ?? 0
      const barHeight = Math.max(1, amp * (AUDIO_ROW_HEIGHT - 6))
      ctx.fillRect(x, mid - barHeight / 2, 1, barHeight)
    }
  }, [peaks, width])

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect()
    setPlayhead((e.clientX - rect.left) / pps)
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      className="relative cursor-text border-b border-surface-800 bg-surface-950/40"
      style={{ width, height: AUDIO_ROW_HEIGHT }}
    >
      {!peaks && hasAudio && (
        <div className="pointer-events-none absolute inset-0 flex items-center px-2 text-[11px] text-neutral-600">
          Carregando forma de onda…
        </div>
      )}
      <canvas ref={canvasRef} className="absolute inset-0" style={{ width, height: AUDIO_ROW_HEIGHT }} />
    </div>
  )
}
