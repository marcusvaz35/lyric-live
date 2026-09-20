import type { EffectId } from '@shared/types/project'
import { EffectPicker } from '../preview/EffectPicker'

/** Só efeitos de bloco — formas e imagens não têm "letras" pra animar. */
export function EffectSelect({
  value,
  onChange
}: {
  value: EffectId | undefined
  onChange: (effect: EffectId | undefined) => void
}) {
  return (
    <div>
      <div className="field-label mb-1">Efeito de entrada</div>
      <EffectPicker
        blockOnly
        columns={2}
        value={value ?? 'none'}
        onChange={(v) => onChange(v === 'none' ? undefined : (v as EffectId))}
        leading={[{ value: 'none', label: 'Sem efeito' }]}
      />
    </div>
  )
}
