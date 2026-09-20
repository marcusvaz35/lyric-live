import type { BlendMode, MediaLayer } from '@shared/types/project'
import { useProjectStore } from '../../state/projectStore'
import { EffectSelect } from './EffectSelect'

const BLEND_OPTIONS: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'screen', label: 'Tela (clarear textura)' },
  { value: 'multiply', label: 'Multiplicar (escurecer)' },
  { value: 'overlay', label: 'Sobrepor' },
  { value: 'soft-light', label: 'Luz suave' },
  { value: 'lighten', label: 'Clarear' },
  { value: 'darken', label: 'Escurecer' },
  { value: 'color-dodge', label: 'Subexposição de cor' }
]

export function MediaLayerProperties({ layer }: { layer: MediaLayer }) {
  const updateLayer = useProjectStore((s) => s.updateLayer)

  return (
    <div className="space-y-3">
      <div className="panel-label">{layer.mediaKind === 'video' ? 'Vídeo' : 'Imagem'}</div>
      <div className="truncate text-xs text-neutral-500" title={layer.fileName}>
        {layer.fileName}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="field-label mb-1">Ajuste</div>
          <select
            value={layer.fit}
            onChange={(e) => updateLayer(layer.id, { fit: e.target.value })}
            className="field-input"
          >
            <option value="cover">Preencher</option>
            <option value="contain">Caber inteira</option>
          </select>
        </div>
        <div>
          <div className="field-label mb-1">Mistura</div>
          <select
            value={layer.blendMode}
            onChange={(e) => updateLayer(layer.id, { blendMode: e.target.value })}
            className="field-input"
          >
            {BLEND_OPTIONS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <EffectSelect value={layer.effect} onChange={(effect) => updateLayer(layer.id, { effect })} />
      <p className="text-[11px] leading-snug text-neutral-600">
        Dica: para textura por cima do texto, coloque a camada acima e use mistura "Tela" ou "Sobrepor" com opacidade
        baixa.
      </p>
    </div>
  )
}
