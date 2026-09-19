import { useEffect, useState } from 'react'

/** Abre/fecha a janela LIVE (resultado final pro telão) sem sair da tela atual. */
export function LiveToggleButton() {
  const [liveOpen, setLiveOpen] = useState(false)

  useEffect(() => {
    if (!window.api) return
    const refresh = (): void => {
      window.api.live.isOpen().then(setLiveOpen)
    }
    refresh()
    const interval = setInterval(refresh, 1500)
    return () => clearInterval(interval)
  }, [])

  const toggle = async (): Promise<void> => {
    if (!window.api) return
    if (liveOpen) await window.api.live.close()
    else await window.api.live.open()
    setLiveOpen(await window.api.live.isOpen())
  }

  return (
    <button
      onClick={toggle}
      title={liveOpen ? 'Fechar janela LIVE' : 'Abrir janela LIVE (resultado final pro telão)'}
      className={`flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-semibold transition-colors ${
        liveOpen
          ? 'border-accent bg-accent/20 text-accent'
          : 'border-surface-700 text-neutral-300 hover:bg-surface-800'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${liveOpen ? 'bg-accent' : 'bg-neutral-600'}`} />
      LIVE
    </button>
  )
}
