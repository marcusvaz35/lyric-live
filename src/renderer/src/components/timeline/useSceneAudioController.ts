import { useEffect, useRef, useState } from 'react'
import type { Scene } from '@shared/types/project'
import { useProjectStore } from '../../state/projectStore'
import { decodeAudio } from '../../lib/waveform'

const RESYNC_THRESHOLD = 0.2 // segundos de deriva tolerados antes de reajustar o áudio

/** Carrega o áudio da cena atual (bytes -> blob + picos da forma de onda) e mantém
 * um <audio> tocando em sincronia com o play/pause/playhead do projeto. */
export function useSceneAudioController(scene: Scene): { peaks: Float32Array | null } {
  const isPlaying = useProjectStore((s) => s.isPlaying)
  const playhead = useProjectStore((s) => s.playhead)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  if (!audioRef.current) audioRef.current = new Audio()

  const [peaks, setPeaks] = useState<Float32Array | null>(null)
  const loadedPathRef = useRef<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    const filePath = scene.audio?.filePath ?? null
    if (filePath === loadedPathRef.current) return
    loadedPathRef.current = filePath

    const audio = audioRef.current!
    audio.pause()
    audio.removeAttribute('src')
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setPeaks(null)

    if (!filePath || !window.api) return

    let cancelled = false
    window.api.media
      .readFile(filePath)
      .then((buffer) => decodeAudio(buffer))
      .then((decoded) => {
        if (cancelled || loadedPathRef.current !== filePath) {
          URL.revokeObjectURL(decoded.blobUrl)
          return
        }
        blobUrlRef.current = decoded.blobUrl
        audio.src = decoded.blobUrl
        setPeaks(decoded.peaks)
      })
      .catch((err) => console.error('Falha ao carregar áudio da cena', err))

    return () => {
      cancelled = true
    }
  }, [scene.audio?.filePath])

  useEffect(() => {
    const audio = audioRef.current!
    if (!audio.src) return
    if (isPlaying) {
      audio.currentTime = useProjectStore.getState().playhead
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [isPlaying])

  useEffect(() => {
    const audio = audioRef.current!
    if (!audio.src) return
    if (!isPlaying || Math.abs(audio.currentTime - playhead) > RESYNC_THRESHOLD) {
      audio.currentTime = playhead
    }
  }, [playhead, isPlaying])

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  return { peaks }
}
