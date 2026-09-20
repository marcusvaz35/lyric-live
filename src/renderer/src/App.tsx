import { useEffect } from 'react'
import { MainLayout } from './components/layout/MainLayout'
import { usePlaybackClock } from './state/usePlaybackClock'
import { useLiveBroadcast } from './state/useLiveBroadcast'
import { redo, undo, useProjectStore } from './state/projectStore'
import type { AppCommand } from '@shared/types/ipc'
import { saveProject, saveProjectAs, openProject } from './lib/projectIO'
import { getUndoScope } from './lib/undoScope'
import { loadSystemFonts } from './lib/systemFonts'
import { UpdateNotice } from './components/common/UpdateNotice'

function confirmDiscard(): boolean {
  return !useProjectStore.getState().dirty || window.confirm('Há alterações não salvas. Continuar mesmo assim?')
}

export default function App() {
  usePlaybackClock()
  useLiveBroadcast()

  // Lê as fontes do computador ao abrir e sempre que a janela volta ao foco (quem instala uma
  // fonte nova costuma voltar pro programa em seguida), assim a lista já está atualizada.
  useEffect(() => {
    loadSystemFonts()
    let last = Date.now()
    const onFocus = (): void => {
      if (Date.now() - last < 10000) return
      last = Date.now()
      loadSystemFonts()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  // Atalhos (Ctrl/⌘+Z, Shift+Z, S, O, N) chegam do menu do app como comandos. Em campo
  // de texto, desfazer/refazer é do próprio campo; fora dele, do projeto.
  useEffect(() => {
    const run = (command: AppCommand): void => {
      const active = document.activeElement
      // só campo onde se digita texto usa o desfazer do próprio campo; número, cor, caixa de
      // seleção etc. já gravam cada mudança no projeto/estilo, então o atalho vale pra eles
      const TEXT_TYPES = ['text', 'search', 'email', 'url', 'tel', 'password']
      const inTextField =
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLInputElement && TEXT_TYPES.includes(active.type))
      switch (command) {
        case 'undo':
          if (inTextField) document.execCommand('undo')
          else (getUndoScope()?.undo ?? undo)()
          break
        case 'redo':
          if (inTextField) document.execCommand('redo')
          else (getUndoScope()?.redo ?? redo)()
          break
        case 'save':
          saveProject()
          break
        case 'saveAs':
          saveProjectAs()
          break
        case 'open':
          if (confirmDiscard()) openProject()
          break
        case 'new':
          if (confirmDiscard()) useProjectStore.getState().newProject()
          break
      }
    }

    if (window.api) return window.api.app.onCommand(run)

    // Sem Electron (prévia no navegador não tem menu): atalhos direto no teclado.
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!(e.metaKey || e.ctrlKey)) return
      const key = e.key.toLowerCase()
      const map: Record<string, AppCommand | undefined> = {
        z: e.shiftKey ? 'redo' : 'undo',
        y: 'redo',
        s: e.shiftKey ? 'saveAs' : 'save',
        o: 'open',
        n: 'new'
      }
      const command = map[key]
      if (command) {
        e.preventDefault()
        run(command)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement
      const isTyping = ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable

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

  return (
    <>
      <MainLayout />
      <UpdateNotice />
    </>
  )
}
