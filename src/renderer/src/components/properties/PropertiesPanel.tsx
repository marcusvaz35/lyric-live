import { useProjectStore } from '../../state/projectStore'
import { TextLayerProperties } from './TextLayerProperties'
import { BackgroundLayerProperties } from './BackgroundLayerProperties'
import { TransformSection } from './TransformSection'

export function PropertiesPanel() {
  const layer = useProjectStore((s) => s.selectedLayer())

  return (
    <div className="overflow-y-auto border-l border-surface-800 bg-surface-900 p-3">
      {!layer ? (
        <div className="mt-8 text-center text-sm text-neutral-600">
          Selecione uma camada para editar suas propriedades
        </div>
      ) : (
        <div className="space-y-5">
          {layer.type === 'text' ? (
            <TextLayerProperties layer={layer} />
          ) : (
            <BackgroundLayerProperties layer={layer} />
          )}
          <div className="h-px bg-surface-800" />
          <TransformSection layer={layer} />
        </div>
      )}
    </div>
  )
}
