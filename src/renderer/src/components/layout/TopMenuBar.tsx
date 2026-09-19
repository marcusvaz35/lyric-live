import { useState, useRef, useEffect } from 'react'
import type { DisplayInfo } from '@shared/types/ipc'
import { useProjectStore } from '../../state/projectStore'
import { saveProject, saveProjectAs, openProject } from '../../lib/projectIO'
import logoMark from '../../assets/logo-mark.png'

const COMING_SOON_MENUS = ['Editar', 'Conteúdo', 'Exibir']

export function TopMenuBar() {
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const project = useProjectStore((s) => s.project)
  const dirty = useProjectStore((s) => s.dirty)
  const filePath = useProjectStore((s) => s.filePath)
  const newProject = useProjectStore((s) => s.newProject)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setProjectMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="flex h-12 items-center gap-1 border-b border-surface-800 bg-surface-900 pl-20 pr-3 text-sm drag-region">
      <span className="mr-3 flex shrink-0 items-center gap-1.5 whitespace-nowrap font-semibold tracking-tight text-neutral-100">
        <img src={logoMark} alt="" className="h-5 w-5 shrink-0 rounded-[5px]" />
        Lyric Live
      </span>

      <div className="relative" ref={menuRef}>
        <button
          className="rounded-md px-3 py-1.5 text-neutral-300 hover:bg-surface-700 hover:text-neutral-100"
          onClick={() => setProjectMenuOpen((v) => !v)}
        >
          Projeto
        </button>
        {projectMenuOpen && (
          <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-surface-700 bg-surface-850 p-1 shadow-xl">
            <MenuItem
              label="Novo projeto"
              shortcut="⌘N"
              onClick={() => {
                newProject()
                setProjectMenuOpen(false)
              }}
            />
            <MenuItem
              label="Abrir..."
              shortcut="⌘O"
              onClick={() => {
                openProject()
                setProjectMenuOpen(false)
              }}
            />
            <MenuItem
              label="Salvar"
              shortcut="⌘S"
              onClick={() => {
                saveProject()
                setProjectMenuOpen(false)
              }}
            />
            <MenuItem
              label="Salvar como..."
              shortcut="⇧⌘S"
              onClick={() => {
                saveProjectAs()
                setProjectMenuOpen(false)
              }}
            />
          </div>
        )}
      </div>

      {COMING_SOON_MENUS.map((label) => (
        <button
          key={label}
          disabled
          title="Em breve"
          className="cursor-not-allowed rounded-md px-3 py-1.5 text-neutral-600"
        >
          {label}
        </button>
      ))}

      <LiveMenu />

      <div className="ml-auto flex items-center gap-2 text-xs text-neutral-500">
        <span>{project.name}</span>
        {dirty && <span className="h-1.5 w-1.5 rounded-full bg-accent" title="Alterações não salvas" />}
        {filePath && <span className="max-w-[240px] truncate text-neutral-600">{filePath}</span>}
      </div>
    </div>
  )
}

function MenuItem({
  label,
  shortcut,
  onClick
}: {
  label: string
  shortcut?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-neutral-200 hover:bg-surface-700"
    >
      <span>{label}</span>
      {shortcut && <span className="text-xs text-neutral-500">{shortcut}</span>}
    </button>
  )
}

function LiveMenu() {
  const [open, setOpen] = useState(false)
  const [liveOpen, setLiveOpen] = useState(false)
  const [displays, setDisplays] = useState<DisplayInfo[]>([])
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const refresh = async (): Promise<void> => {
    if (!window.api) return
    setLiveOpen(await window.api.live.isOpen())
    setDisplays(await window.api.live.listDisplays())
  }

  const handleToggleOpen = (): void => {
    setOpen((v) => {
      if (!v) refresh()
      return !v
    })
  }

  const handleToggleLive = async (): Promise<void> => {
    if (!window.api) return
    if (liveOpen) await window.api.live.close()
    else await window.api.live.open()
    await refresh()
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleToggleOpen}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:bg-surface-700 hover:text-neutral-100 ${
          liveOpen ? 'text-accent' : 'text-neutral-300'
        }`}
      >
        LIVE
        {liveOpen && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-surface-700 bg-surface-850 p-1 shadow-xl">
          <MenuItem
            label={liveOpen ? 'Fechar janela LIVE' : 'Abrir janela LIVE'}
            onClick={handleToggleLive}
          />
          {liveOpen && (
            <>
              <div className="my-1 h-px bg-surface-700" />
              <div className="px-2.5 py-1 text-[11px] uppercase tracking-wide text-neutral-500">
                Tela cheia em
              </div>
              {displays.length === 0 && (
                <div className="px-2.5 py-1.5 text-xs text-neutral-500">Nenhuma tela detectada</div>
              )}
              {displays.map((d) => (
                <MenuItem
                  key={d.id}
                  label={d.label}
                  onClick={() => {
                    window.api?.live.moveToDisplay(d.id)
                    setOpen(false)
                  }}
                />
              ))}
              <MenuItem
                label="Sair da tela cheia"
                shortcut="Esc"
                onClick={() => {
                  window.api?.live.exitFullscreen()
                  setOpen(false)
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
