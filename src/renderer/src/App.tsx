import { useEffect } from 'react'
import { MainLayout } from './components/layout/MainLayout'
import { usePlaybackClock } from './state/usePlaybackClock'
import { useLiveBroadcast } from './state/useLiveBroadcast'
import { useProjectStore } from './state/projectStore'
import { saveProject, saveProjectAs, openProject } from './lib/projectIO'

export default function App() {
  usePlaybackClock()
  useLiveBroadcast()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const mod = e.metaKey || e.ctrlKey
      const target = e.target as HTMLElement
      const isTyping = ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable

      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        e.shiftKey ? saveProjectAs() : saveProject()
        return
      }
      if (mod && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        openProject()
        return
      }
      if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        useProjectStore.getState().newProject()
        return
      }
      const isSpace = e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar'
      if (!isTyping && isSpace) {
        e.preventDefault()
        // evita que o navegador também "clique" um botão que esteja com foco (ex.: o
        // próprio botão de play, ou qualquer botão da timeline) ao soltar a tecla
        if (target instanceof HTMLElement && target.tagName === 'BUTTON') target.blur()
        const { isPlaying, play, pause } = useProjectStore.getState()
        isPlaying ? pause() : play()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return <MainLayout />
}
