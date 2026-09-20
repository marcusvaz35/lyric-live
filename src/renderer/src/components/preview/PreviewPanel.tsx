import { useState } from 'react'
import { useProjectStore } from '../../state/projectStore'
import { PhraseComposerModal } from './PhraseComposerModal'
import { SceneCanvas } from './SceneCanvas'

export function PreviewPanel() {
  const scene = useProjectStore((s) => s.currentScene())
  const addTextLayer = useProjectStore((s) => s.addTextLayer)
  const addBackgroundLayer = useProjectStore((s) => s.addBackgroundLayer)
  const addShapeLayer = useProjectStore((s) => s.addShapeLayer)
  const addMediaLayer = useProjectStore((s) => s.addMediaLayer)
  const [composerOpen, setComposerOpen] = useState(false)

  const handleImportVisual = async (): Promise<void> => {
    if (!window.api) return
    const file = await window.api.media.importVisual()
    if (file) addMediaLayer(file)
  }

  return (
    <div className="flex flex-col overflow-hidden bg-surface-950">
      <div className="flex items-center justify-between border-b border-surface-800 px-4 py-2">
        <span className="text-sm text-neutral-300">{scene.name}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setComposerOpen(true)}
            className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-accent-hover"
          >
            + Frase
          </button>
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
          <button onClick={handleImportVisual} className="rounded-md bg-surface-800 px-2.5 py-1 text-xs text-neutral-200 hover:bg-surface-700">
            + Imagem/Vídeo
          </button>
          <button onClick={() => addShapeLayer('torn')} className="rounded-md bg-surface-800 px-2.5 py-1 text-xs text-neutral-200 hover:bg-surface-700">
            + Tira
          </button>
          <button onClick={() => addShapeLayer('rect')} className="rounded-md bg-surface-800 px-2.5 py-1 text-xs text-neutral-200 hover:bg-surface-700">
            + Forma
          </button>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-4xl">
          <SceneCanvas />
        </div>
      </div>
      {composerOpen && <PhraseComposerModal onClose={() => setComposerOpen(false)} />}
    </div>
  )
}
