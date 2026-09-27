import { useEffect, useState } from 'react'
import type { Scene } from '@shared/types/project'
import type { LiveOverlayPayload } from '@shared/types/ipc'
import { LiveCanvas } from './components/preview/LiveCanvas'
import { LiveTextOverlay } from './components/preview/LiveTextOverlay'

export default function LiveApp() {
  const [scene, setScene] = useState<Scene | null>(null)
  const [playhead, setPlayhead] = useState(0)
  const [overlay, setOverlay] = useState<LiveOverlayPayload | null>(null)

  useEffect(() => {
    const unsubscribe = window.api?.live.onState((payload) => {
      setScene(payload.scene)
      setPlayhead(payload.playhead)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribe = window.api?.live.onOverlay(setOverlay)
    return unsubscribe
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        // mesmo fade de saída usado quando o editor fecha a janela
        document.documentElement.classList.add('live-leaving')
        setTimeout(() => window.close(), 280)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (overlay) return <LiveTextOverlay overlay={overlay} />
  return <LiveCanvas scene={scene} playhead={playhead} />
}
