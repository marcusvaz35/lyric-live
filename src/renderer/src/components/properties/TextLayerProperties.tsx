import type { TextLayer } from '@shared/types/project'
import { useProjectStore } from '../../state/projectStore'

const FONT_OPTIONS = ['Inter', 'Poppins', 'Montserrat', 'Playfair Display', 'Georgia', 'Arial']

export function TextLayerProperties({ layer }: { layer: TextLayer }) {
  const updateTextLayer = useProjectStore((s) => s.updateTextLayer)

  return (
    <div className="space-y-3">
      <div className="panel-label">Texto</div>
      <textarea
        value={layer.text}
        onChange={(e) => updateTextLayer(layer.id, { text: e.target.value })}
        rows={3}
        className="field-input resize-none"
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="field-label mb-1">Fonte</div>
          <select
            value={layer.fontFamily}
            onChange={(e) => updateTextLayer(layer.id, { fontFamily: e.target.value })}
            className="field-input"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="field-label mb-1">Tamanho</div>
          <input
            type="number"
            value={layer.fontSize}
            onChange={(e) => updateTextLayer(layer.id, { fontSize: Number(e.target.value) })}
            className="field-input"
          />
        </div>

        <div>
          <div className="field-label mb-1">Peso</div>
          <select
            value={layer.fontWeight}
            onChange={(e) => updateTextLayer(layer.id, { fontWeight: Number(e.target.value) })}
            className="field-input"
          >
            {[300, 400, 500, 600, 700, 800, 900].map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="field-label mb-1">Alinhamento</div>
          <select
            value={layer.align}
            onChange={(e) =>
              updateTextLayer(layer.id, { align: e.target.value as TextLayer['align'] })
            }
            className="field-input"
          >
            <option value="left">Esquerda</option>
            <option value="center">Centro</option>
            <option value="right">Direita</option>
          </select>
        </div>

        <div>
          <div className="field-label mb-1">Cor</div>
          <input
            type="color"
            value={layer.color}
            onChange={(e) => updateTextLayer(layer.id, { color: e.target.value })}
            className="field-input h-8 p-0.5"
          />
        </div>
        <label className="mt-5 flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={layer.italic}
            onChange={(e) => updateTextLayer(layer.id, { italic: e.target.checked })}
          />
          Itálico
        </label>

        <div>
          <div className="field-label mb-1">Tracking</div>
          <input
            type="number"
            step={0.1}
            value={layer.letterSpacing}
            onChange={(e) => updateTextLayer(layer.id, { letterSpacing: Number(e.target.value) })}
            className="field-input"
          />
        </div>
        <div>
          <div className="field-label mb-1">Leading</div>
          <input
            type="number"
            step={0.05}
            value={layer.lineHeight}
            onChange={(e) => updateTextLayer(layer.id, { lineHeight: Number(e.target.value) })}
            className="field-input"
          />
        </div>
      </div>
    </div>
  )
}
