import { useState, useRef, useEffect } from 'react'
import type { DisplayInfo } from '@shared/types/ipc'
import { redo, undo, useProjectStore } from '../../state/projectStore'
import { saveProject, saveProjectAs, openProject } from '../../lib/projectIO'
import logoMark from '../../assets/logo-mark.png'
import { Icon } from '../common/Icon'
import { applyTheme, getSavedTheme, THEMES } from '../../lib/theme'

const COMING_SOON_MENUS = ['Conteúdo']
const IS_MAC = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
const MOD = IS_MAC ? '⌘' : 'Ctrl+'

export function TopMenuBar() {
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.api?.app.version().then(setAppVersion).catch(() => {})
  }, [])
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
        {appVersion && <span className="text-[11px] font-normal text-neutral-500">v{appVersion}</span>}
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
              shortcut={`${MOD}N`}
              onClick={() => {
                newProject()
                setProjectMenuOpen(false)
              }}
            />
            <MenuItem
              label="Abrir..."
              shortcut={`${MOD}O`}
              onClick={() => {
                openProject()
                setProjectMenuOpen(false)
              }}
            />
            <MenuItem
              label="Salvar"
              shortcut={`${MOD}S`}
              onClick={() => {
                saveProject()
                setProjectMenuOpen(false)
              }}
            />
            <MenuItem
              label="Salvar como..."
              shortcut={`⇧${MOD}S`}
              onClick={() => {
                saveProjectAs()
                setProjectMenuOpen(false)
              }}
            />
          </div>
        )}
      </div>

      <EditMenu />

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

      <AppearanceMenu />

      <LiveMenu />

      <div className="ml-auto flex items-center gap-2 text-xs text-neutral-500">
        <SavedFlash />
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
  onClick,
  disabled
}: {
  label: string
  shortcut?: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-neutral-200 hover:bg-surface-700 disabled:cursor-not-allowed disabled:text-neutral-600 disabled:hover:bg-transparent"
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

function EditMenu() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const undoCount = useProjectStore((s) => s.undoCount)
  const redoCount = useProjectStore((s) => s.redoCount)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="rounded-md px-3 py-1.5 text-neutral-300 hover:bg-surface-700 hover:text-neutral-100"
        onClick={() => setOpen((v) => !v)}
      >
        Editar
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-surface-700 bg-surface-850 p-1 shadow-xl">
          <MenuItem
            label={`Desfazer${undoCount ? ` (${undoCount})` : ''}`}
            shortcut={`${MOD}Z`}
            disabled={undoCount === 0}
            onClick={() => {
              undo()
              setOpen(false)
            }}
          />
          <MenuItem
            label="Refazer"
            shortcut={IS_MAC ? '⇧⌘Z' : 'Ctrl+Y'}
            disabled={redoCount === 0}
            onClick={() => {
              redo()
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}

/** Aviso rápido "Salvo" logo depois de salvar. */
function SavedFlash() {
  const savedAt = useProjectStore((s) => s.savedAt)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!savedAt) return
    setVisible(true)
    const timeout = setTimeout(() => setVisible(false), 2000)
    return () => clearTimeout(timeout)
  }, [savedAt])

  return visible ? (
    <span className="flex items-center gap-1 font-medium text-emerald-400">
      <Icon name="check" size={13} />
      Salvo
    </span>
  ) : null
}

/** Troca o visual do programa na hora; a escolha fica guardada pro próximo uso. */
function AppearanceMenu() {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState(getSavedTheme())
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const choose = (id: string): void => {
    setTheme(id)
    applyTheme(id)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="rounded-md px-3 py-1.5 text-neutral-300 hover:bg-surface-700 hover:text-neutral-100"
        onClick={() => setOpen((v) => !v)}
      >
        Aparência
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-surface-700 bg-surface-850 p-1 shadow-xl">
          <div className="px-2.5 pb-1 pt-1.5 text-[11px] uppercase tracking-wide text-neutral-500">Visual do programa</div>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => choose(t.id)}
              className={`flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left hover:bg-surface-700 ${
                theme === t.id ? 'bg-surface-700/60' : ''
              }`}
            >
              <span
                className="flex h-9 w-14 shrink-0 overflow-hidden rounded border border-surface-600"
                style={{ background: t.swatch[0] }}
              >
                <span className="h-full w-4" style={{ background: t.swatch[1] }} />
                <span className="flex flex-1 flex-col justify-center gap-1 px-1.5">
                  <span className="h-1 rounded-full" style={{ background: t.swatch[2], opacity: 0.85 }} />
                  <span className="h-1 w-2/3 rounded-full" style={{ background: t.swatch[3] }} />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-neutral-100">{t.label}</span>
                <span className="block truncate text-[11px] text-neutral-500">{t.description}</span>
              </span>
              {theme === t.id && <Icon name="check" size={14} className="text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
