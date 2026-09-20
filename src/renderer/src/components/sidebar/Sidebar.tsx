import { useState } from 'react'
import { ScenesList } from './ScenesList'
import { EffectsList } from './EffectsList'
import { Icon } from '../common/Icon'

const TABS = [
  { id: 'scenes', icon: 'film', label: 'Cenas', enabled: true },
  { id: 'songs', icon: 'music', label: 'Músicas', enabled: true },
  { id: 'bible', icon: 'book', label: 'Bíblia', enabled: true },
  { id: 'effects', icon: 'sparkles', label: 'Efeitos', enabled: true }
] as const

const MODAL_TABS = new Set(['bible', 'songs'])

export function Sidebar({
  onOpenBible,
  onOpenSongs
}: {
  onOpenBible: () => void
  onOpenSongs: () => void
}) {
  const [active, setActive] = useState<(typeof TABS)[number]['id']>('scenes')

  const handleTabClick = (id: (typeof TABS)[number]['id']): void => {
    if (id === 'bible') {
      onOpenBible()
      return
    }
    if (id === 'songs') {
      onOpenSongs()
      return
    }
    setActive(id)
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden border-r border-surface-800 bg-surface-900">
      <div className="flex h-full w-14 flex-col items-center gap-1 border-r border-surface-800 py-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            disabled={!tab.enabled}
            title={tab.enabled ? tab.label : `${tab.label} (em breve)`}
            onClick={() => handleTabClick(tab.id)}
            className={`flex h-11 w-11 flex-col items-center justify-center rounded-lg text-lg transition-colors ${
              active === tab.id && !MODAL_TABS.has(tab.id) ? 'bg-accent/20 ring-1 ring-accent' : 'hover:bg-surface-800'
            } ${!tab.enabled ? 'opacity-30' : ''}`}
          >
            <Icon name={tab.icon} size={19} />
          </button>
        ))}
      </div>
      <div className="h-full w-[204px] overflow-hidden">
        {active === 'scenes' && <ScenesList />}
        {active === 'effects' && <EffectsList />}
      </div>
    </div>
  )
}
