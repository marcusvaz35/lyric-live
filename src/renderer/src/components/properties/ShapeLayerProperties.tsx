import type { ShapeLayer } from '@shared/types/project'
import { useProjectStore } from '../../state/projectStore'
import { EffectSelect } from './EffectSelect'

export function ShapeLayerProperties({ layer }: { layer: ShapeLayer }) {
  const updateLayer = useProjectStore((s) => s.updateLayer)

  return (
    <div className="space-y-3">
      <div className="panel-label">Forma</div>
      <div className="flex gap-2">
        {(['rect', 'torn'] as const).map((kind) => (
          <button
            key={kind}
            onClick={() => updateLayer(layer.id, { kind })}
            className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${
              layer.kind === kind ? 'border-accent bg-accent/10 text-neutral-100' : 'border-surface-600 text-neutral-400'
            }`}
          >
            {kind === 'rect' ? 'Retângulo' : 'Rasgada'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="field-label mb-1">Largura</div>
          <input
            type="number"
            value={layer.width}
            onChange={(e) => updateLayer(layer.id, { width: Number(e.target.value) })}
            className="field-input"
          />
        </div>
        <div>
          <div className="field-label mb-1">Altura</div>
          <input
            type="number"
            value={layer.height}
            onChange={(e) => updateLayer(layer.id, { height: Number(e.target.value) })}
            className="field-input"
          />
        </div>
      </div>
      <div>
        <div className="field-label mb-1">Cor</div>
        <input
          type="color"
          value={layer.color}
          onChange={(e) => updateLayer(layer.id, { color: e.target.value })}
          className="h-8 w-full cursor-pointer rounded-md border border-surface-600 bg-surface-800"
        />
      </div>
      <EffectSelect value={layer.effect} onChange={(effect) => updateLayer(layer.id, { effect })} />
    </div>
  )
}
