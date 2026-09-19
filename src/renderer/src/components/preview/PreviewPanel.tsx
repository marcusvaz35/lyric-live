import { useProjectStore } from '../../state/projectStore'
import { SceneCanvas } from './SceneCanvas'

export function PreviewPanel() {
  const scene = useProjectStore((s) => s.currentScene())
  const addTextLayer = useProjectStore((s) => s.addTextLayer)
  const addBackgroundLayer = useProjectStore((s) => s.addBackgroundLayer)

  return (
    <div className="flex flex-col overflow-hidden bg-surface-950">
      <div className="flex items-center justify-between border-b border-surface-800 px-4 py-2">
        <span className="text-sm text-neutral-300">{scene.name}</span>
        <div className="flex gap-2">
          <button
            onClick={() => addTextLayer()}
            className="rounded-md bg-surface-800 px-2.5 py-1 text-xs text-neutral-200 hover:bg-surface-700"
          >
            + Texto
          </button>
          <button
            onClick={addBackgroundLayer}
            className="rounded-md bg-surface-800 px-2.5 py-1 text-xs text-neutral-200 hover:bg-surface-700"
          >
            + Fundo
          </button>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-4xl">
          <SceneCanvas />
        </div>
      </div>
    </div>
  )
}
