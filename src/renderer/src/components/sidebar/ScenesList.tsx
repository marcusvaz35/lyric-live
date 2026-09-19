import { useState } from 'react'
import { useProjectStore } from '../../state/projectStore'

export function ScenesList() {
  const scenes = useProjectStore((s) => s.project.scenes)
  const currentSceneId = useProjectStore((s) => s.currentSceneId)
  const selectScene = useProjectStore((s) => s.selectScene)
  const renameScene = useProjectStore((s) => s.renameScene)
  const deleteScene = useProjectStore((s) => s.deleteScene)
  const addScene = useProjectStore((s) => s.addScene)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="panel-label">Cenas do culto</span>
        <button className="icon-btn" title="Adicionar cena" onClick={addScene}>
          +
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {scenes.map((scene, i) => (
          <div
            key={scene.id}
            onClick={() => selectScene(scene.id)}
            className={`group mb-1 flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm ${
              scene.id === currentSceneId
                ? 'bg-accent/20 text-neutral-50 ring-1 ring-accent'
                : 'text-neutral-300 hover:bg-surface-800'
            }`}
          >
            <span className="w-5 shrink-0 text-center text-xs text-neutral-500">
              {String(i + 1).padStart(2, '0')}
            </span>
            {editingId === scene.id ? (
              <input
                autoFocus
                className="field-input h-6 flex-1 py-0"
                defaultValue={scene.name}
                onBlur={(e) => {
                  renameScene(scene.id, e.target.value || scene.name)
                  setEditingId(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="flex-1 truncate"
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  setEditingId(scene.id)
                }}
              >
                {scene.name}
              </span>
            )}
            <button
              className="icon-btn opacity-0 group-hover:opacity-100"
              title="Excluir cena"
              onClick={(e) => {
                e.stopPropagation()
                deleteScene(scene.id)
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
