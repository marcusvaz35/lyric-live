import { useEffect, useRef, useState } from 'react'
import type { UpdateInfo } from '@shared/types/ipc'

type Phase = 'idle' | 'downloading' | 'ready' | 'error'

function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`
}

/**
 * Aviso de versão nova. Quando há atualização publicada, a versão em uso deixa de valer:
 * a tela fica bloqueada até atualizar (se não houver internet, o programa funciona normal,
 * porque aí não dá pra saber se existe versão nova).
 */
export function UpdateNotice() {
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const infoRef = useRef<UpdateInfo | null>(null)
  infoRef.current = info

  useEffect(() => {
    const api = window.api
    if (!api) return
    const offAvailable = api.update.onAvailable((next) => {
      if (infoRef.current?.version === next.version) return
      setInfo(next)
      setPhase('idle')
    })
    const offProgress = api.update.onProgress((p) => setProgress(p.total > 0 ? p.received / p.total : 0))
    const offCommand = api.app.onCommand((command) => {
      if (command !== 'checkUpdates') return
      setMessage('Procurando atualizações…')
      api.update.check().then(({ info: found, error }) => {
        if (found) {
          setMessage(null)
          setInfo(found)
          setPhase('idle')
        } else {
          setMessage(error ? `Não consegui verificar: ${error}` : 'Você já está na versão mais recente.')
          setTimeout(() => setMessage(null), 4000)
        }
      })
    })
    return () => {
      offAvailable()
      offProgress()
      offCommand()
    }
  }, [])

  const download = async (): Promise<void> => {
    if (!window.api) return
    setPhase('downloading')
    setProgress(0)
    try {
      await window.api.update.download()
      setPhase('ready')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Falha ao baixar a atualização.')
      setPhase('error')
    }
  }

  const install = async (): Promise<void> => {
    try {
      await window.api?.update.install()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não consegui instalar a atualização.')
      setPhase('error')
    }
  }

  if (!info) {
    return message ? (
      <div className="fixed bottom-4 right-4 z-[70] rounded-lg border border-surface-700 bg-surface-900 px-4 py-2.5 text-sm text-neutral-200 shadow-2xl">
        {message}
      </div>
    ) : null
  }

  const emPlace = info.canInstallInPlace

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-6">
      <div className="w-full max-w-md rounded-xl border border-accent/60 bg-surface-900 p-6 shadow-2xl">
        <div className="text-lg font-semibold text-neutral-100">Atualize para continuar</div>
        <div className="mt-1 text-sm text-neutral-400">
          Saiu a versão {info.version}. Esta versão do programa não é mais usada — atualize para
          continuar.
        </div>
        {info.notes && (
          <div className="mt-3 max-h-24 overflow-y-auto rounded-md bg-surface-950/60 p-2.5 text-xs leading-relaxed text-neutral-400">
            {info.notes}
          </div>
        )}

        {phase === 'idle' && (
          <div className="mt-5">
            {info.assetUrl ? (
              <button
                onClick={download}
                className="w-full rounded-md bg-accent px-3 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                Atualizar agora{info.size ? ` (${formatMb(info.size)})` : ''}
              </button>
            ) : (
              <button
                onClick={() => window.api?.update.openPage()}
                className="w-full rounded-md bg-accent px-3 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                Abrir página de download
              </button>
            )}
            <div className="mt-2 text-center text-[11px] text-neutral-500">
              {emPlace
                ? 'O programa baixa e instala sozinho; no fim você clica para reabrir.'
                : 'O programa baixa o instalador e abre pra você arrastar o app para Aplicativos.'}
            </div>
          </div>
        )}

        {phase === 'downloading' && (
          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-surface-800">
              <div
                className="h-full bg-accent transition-[width]"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <div className="mt-1.5 text-center text-xs text-neutral-500">
              Baixando… {Math.round(progress * 100)}% — pode continuar usando o programa até terminar.
            </div>
          </div>
        )}

        {phase === 'ready' && (
          <div className="mt-5">
            <button
              onClick={install}
              className="w-full rounded-md bg-accent px-3 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              {emPlace ? 'Fechar e abrir na versão nova' : 'Abrir instalador'}
            </button>
            <div className="mt-2 text-center text-[11px] text-neutral-500">
              {emPlace
                ? 'O programa fecha, instala a versão nova e abre de novo sozinho.'
                : 'Feche o Lyric Live, arraste o app para Aplicativos substituindo o atual e abra de novo.'}
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="mt-5">
            <div className="rounded-md border border-red-400/40 bg-red-400/10 p-2.5 text-xs text-red-300">
              {message}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={download}
                className="flex-1 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
              >
                Tentar de novo
              </button>
              <button
                onClick={() => window.api?.update.openPage()}
                className="rounded-md border border-surface-700 px-3 py-2 text-sm text-neutral-300 hover:bg-surface-800"
              >
                Abrir página
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
