import { useEffect, useRef } from 'react'
import { useProjectStore } from './projectStore'

/** Avança o playhead enquanto isPlaying=true, usando requestAnimationFrame. */
export function usePlaybackClock(): void {
  const isPlaying = useProjectStore((s) => s.isPlaying)
  const lastFrame = useRef<number | null>(null)
  const rafId = useRef<number | null>(null)

  useEffect(() => {
    if (!isPlaying) {
      lastFrame.current = null
      return
    }

    const tick = (now: number): void => {
      const { playhead, currentScene, pause, setPlayhead } = useProjectStore.getState()
      const duration = currentScene().duration
      const last = lastFrame.current ?? now
      const delta = (now - last) / 1000
      lastFrame.current = now
      const next = playhead + delta
      if (next >= duration) {
        setPlayhead(duration)
        pause()
        return
      }
      setPlayhead(next)
      rafId.current = requestAnimationFrame(tick)
    }

    rafId.current = requestAnimationFrame(tick)
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [isPlaying])
}
