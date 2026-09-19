import type { BackgroundLayer } from '@shared/types/project'
import { useProjectStore } from '../../state/projectStore'

export function BackgroundLayerProperties({
  layer
}: {
  layer: BackgroundLayer
}) {
  const updateBackgroundFill = useProjectStore((s) => s.updateBackgroundFill)
  const fill = layer.fill

  return (
    <div className="space-y-3">
      <div className="panel-label">Fundo</div>

      <div className="flex gap-2">
        <button
          onClick={() => updateBackgroundFill(layer.id, { kind: 'color', color: '#0a0a0d' })}
          className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${
            fill.kind === 'color'
              ? 'border-accent bg-accent/10 text-neutral-100'
              : 'border-surface-600 text-neutral-400'
          }`}
        >
          Cor sólida
        </button>
        <button
          onClick={() =>
            updateBackgroundFill(layer.id, {
              kind: 'gradient',
              from: '#1d1d24',
              to: '#6d5efc',
              angle: 135
            })
          }
          className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${
            fill.kind === 'gradient'
              ? 'border-accent bg-accent/10 text-neutral-100'
              : 'border-surface-600 text-neutral-400'
          }`}
        >
          Gradiente
        </button>
      </div>

      {fill.kind === 'color' ? (
        <div>
          <div className="field-label mb-1">Cor</div>
          <input
            type="color"
            value={fill.color}
            onChange={(e) => updateBackgroundFill(layer.id, { kind: 'color', color: e.target.value })}
            className="field-input h-8 p-0.5"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="field-label mb-1">De</div>
            <input
              type="color"
              value={fill.from}
              onChange={(e) => updateBackgroundFill(layer.id, { ...fill, from: e.target.value })}
              className="field-input h-8 p-0.5"
            />
          </div>
          <div>
            <div className="field-label mb-1">Para</div>
            <input
              type="color"
              value={fill.to}
              onChange={(e) => updateBackgroundFill(layer.id, { ...fill, to: e.target.value })}
              className="field-input h-8 p-0.5"
            />
          </div>
          <div className="col-span-2">
            <div className="field-label mb-1">Ângulo</div>
            <input
              type="number"
              value={fill.angle}
              onChange={(e) =>
                updateBackgroundFill(layer.id, { ...fill, angle: Number(e.target.value) })
              }
              className="field-input"
            />
          </div>
        </div>
      )}
    </div>
  )
}
