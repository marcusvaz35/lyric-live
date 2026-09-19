import type { Layer } from '@shared/types/project'
import { useProjectStore } from '../../state/projectStore'

const TYPE_ICON: Record<Layer['type'], string> = {
  text: '📝',
  background: '🎨'
}

export function TimelineLayerRow({ layer }: { layer: Layer }) {
  const selectedLayerId = useProjectStore((s) => s.selectedLayerId)
  const selectLayer = useProjectStore((s) => s.selectLayer)
  const toggleVisible = useProjectStore((s) => s.toggleVisible)
  const toggleLocked = useProjectStore((s) => s.toggleLocked)
  const reorderLayer = useProjectStore((s) => s.reorderLayer)
  const duplicateLayer = useProjectStore((s) => s.duplicateLayer)
  const deleteLayer = useProjectStore((s) => s.deleteLayer)

  const selected = layer.id === selectedLayerId

  return (
    <div
      onClick={() => selectLayer(layer.id)}
      className={`group flex h-9 items-center gap-1 border-b border-surface-800 px-2 text-xs ${
        selected ? 'bg-accent/10' : 'hover:bg-surface-800/60'
      }`}
    >
      <button
        className="icon-btn h-6 w-6"
        title={layer.visible ? 'Ocultar' : 'Mostrar'}
        onClick={(e) => {
          e.stopPropagation()
          toggleVisible(layer.id)
        }}
      >
        {layer.visible ? '👁' : '🚫'}
      </button>
      <button
        className="icon-btn h-6 w-6"
        title={layer.locked ? 'Destravar' : 'Travar'}
        onClick={(e) => {
          e.stopPropagation()
          toggleLocked(layer.id)
        }}
      >
        {layer.locked ? '🔒' : '🔓'}
      </button>
      <span>{TYPE_ICON[layer.type]}</span>
      <span className="flex-1 truncate text-neutral-300">{layer.name}</span>
      <div className="hidden items-center gap-0.5 group-hover:flex">
        <button
          className="icon-btn h-6 w-6"
          title="Mover para frente"
          onClick={(e) => {
            e.stopPropagation()
            reorderLayer(layer.id, 'up')
          }}
        >
          ↑
        </button>
        <button
          className="icon-btn h-6 w-6"
          title="Mover para trás"
          onClick={(e) => {
            e.stopPropagation()
            reorderLayer(layer.id, 'down')
          }}
        >
          ↓
        </button>
        <button
          className="icon-btn h-6 w-6"
          title="Duplicar"
          onClick={(e) => {
            e.stopPropagation()
            duplicateLayer(layer.id)
          }}
        >
          ⧉
        </button>
        <button
          className="icon-btn h-6 w-6"
          title="Excluir"
          onClick={(e) => {
            e.stopPropagation()
            deleteLayer(layer.id)
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
