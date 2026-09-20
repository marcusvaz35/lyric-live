import { EFFECTS } from '../../lib/effects'
import { EffectPreview } from '../sidebar/EffectPreview'

interface Option {
  value: string
  label: string
}

/** Grade com os efeitos já existentes, cada um tocando em loop pra ver o movimento antes de escolher.
 * Clicar de novo no efeito escolhido tira o efeito. */
export function EffectPicker({
  value,
  onChange,
  leading,
  columns = 3,
  blockOnly = false,
  onToggleOff
}: {
  value: string
  onChange: (value: string) => void
  /** Opções de texto antes dos efeitos (ex.: "Sem efeito", "Igual à frase"). */
  leading: Option[]
  columns?: 2 | 3
  /** Só efeitos que animam o bloco todo (formas e imagens não têm letras). */
  blockOnly?: boolean
  /** Se informado, é chamado (no lugar de voltar à primeira opção) ao clicar de novo no efeito escolhido. */
  onToggleOff?: () => void
}) {
  return (
    <div className={`grid max-h-60 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-1.5 overflow-y-scroll rounded-md border border-surface-800 bg-surface-950/60 p-1.5`}>
      {leading.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex min-h-[3.75rem] items-center justify-center rounded-md px-1 text-center text-xs transition-colors ${
            value === opt.value ? 'bg-accent/20 text-neutral-100 ring-1 ring-accent' : 'text-neutral-500 hover:bg-surface-800'
          }`}
        >
          {opt.label}
        </button>
      ))}
      {EFFECTS.filter((fx) => !blockOnly || fx.mode === 'block').map((effect) => (
        <button
          key={effect.id}
          // clicar no efeito já escolhido tira ele (volta pra primeira opção: "Sem efeito"/"Igual à frase")
          onClick={() => {
            if (value !== effect.id) onChange(effect.id)
            else if (onToggleOff) onToggleOff()
            else onChange(leading[0]?.value ?? 'none')
          }}
          title={effect.description}
          className={`space-y-1 rounded-md p-1 text-left transition-colors ${
            value === effect.id ? 'bg-accent/20 ring-1 ring-accent' : 'hover:bg-surface-800'
          }`}
        >
          <EffectPreview effect={effect} />
          <div className={`px-0.5 text-center text-[11px] ${value === effect.id ? 'text-neutral-100' : 'text-neutral-400'}`}>
            {effect.label}
          </div>
        </button>
      ))}
    </div>
  )
}
