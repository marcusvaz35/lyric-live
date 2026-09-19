import { useProjectStore } from '../../state/projectStore'
import { EFFECTS } from '../../lib/effects'
import { EffectPreview } from './EffectPreview'

export function EffectsList() {
  const layer = useProjectStore((s) => s.selectedLayer())
  const updateTextLayer = useProjectStore((s) => s.updateTextLayer)

  if (!layer || layer.type !== 'text') {
    return (
      <div className="mt-8 px-3 text-center text-sm text-neutral-600">
        Selecione uma camada de texto para aplicar um efeito
      </div>
    )
  }

  const current = layer.effect

  return (
    <div className="flex h-full flex-col overflow-y-scroll p-2">
      <div className="panel-label mb-1 px-1">Efeitos de texto</div>

      <button
        onClick={() => updateTextLayer(layer.id, { effect: undefined })}
        className={`mb-1 flex h-10 w-full items-center justify-center rounded-md text-sm transition-colors ${
          !current ? 'bg-accent/20 text-neutral-100 ring-1 ring-accent' : 'text-neutral-500 hover:bg-surface-800'
        }`}
      >
        Nenhum
      </button>

      {EFFECTS.map((effect) => (
        <button
          key={effect.id}
          onClick={() => updateTextLayer(layer.id, { effect: effect.id })}
          title={effect.description}
          className={`mb-1 w-full space-y-1 rounded-md p-1.5 text-left transition-colors ${
            current === effect.id ? 'bg-accent/20 ring-1 ring-accent' : 'hover:bg-surface-800'
          }`}
        >
          <EffectPreview effect={effect} />
          <div
            className={`px-0.5 text-center text-xs ${
              current === effect.id ? 'text-neutral-100' : 'text-neutral-400'
            }`}
          >
            {effect.label}
          </div>
        </button>
      ))}
    </div>
  )
}
