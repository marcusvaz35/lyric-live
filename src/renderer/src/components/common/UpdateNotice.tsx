import { useEffect, useRef, useState } from 'react'
import type { UpdateInfo } from '@shared/types/ipc'

type Phase = 'idle' | 'downloading' | 'ready' | 'error'

const SKIP_KEY = 'lyriclive.skipUpdate'

function readSkipped(): string | null {
  try {
    return localStorage.getItem(SKIP_KEY)
  } catch {
    return null
  }
}

function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`
}

/** Aviso de versão nova: aparece no canto quando há atualização publicada e guia o download. */
export function UpdateNotice() {
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [hidden, setHidden] = useState(false)
  const infoRef = useRef<UpdateInfo | null>(null)
  infoRef.current = info

  useEffect(() => {
    const api = window.api
    if (!api) return
    const offAvailable = api.update.onAvailable((next) => {
      if (readSkipped() === next.version || infoRef.current?.version === next.version) return
      setInfo(next)
      setPhase('idle')
      setHidden(false)
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
          setHidden(false)
        } else {
          api.app
            .version()
            .catch(() => '')
            .then((current) => {
              setMessage(
                error
                  ? `Não consegui verificar: ${error}`
                  : `Você está na versão ${current} e ela é a mais recente.`
              )
              setTimeout(() => setMessage(null), 4000)
            })
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
      setMessage(err instanceof Error ? err.message : 'Não consegui abrir o instalador.')
      setPhase('error')
    }
  }

  const skip = (): void => {
    if (info) {
      try {
        localStorage.setItem(SKIP_KEY, info.version)
      } catch {
        // sem armazenamento: volta a avisar na próxima vez
      }
    }
    setHidden(true)
  }

  const isMac = navigator.userAgent.includes('Mac')
  const visible = info !== null && !hidden

  return (
    <>
      {message && !visible && (
        <div className="fixed bottom-4 right-4 z-[70] rounded-lg border border-surface-700 bg-surface-900 px-4 py-2.5 text-sm text-neutral-200 shadow-2xl">
          {message}
        </div>
      )}
      {visible && info && (
        <div className="fixed bottom-4 right-4 z-[70] w-[340px] rounded-xl border border-accent/60 bg-surface-900 p-4 shadow-2xl">
          <div className="text-sm font-semibold text-neutral-100">Nova versão disponível: {info.version}</div>
          {info.notes && <div className="mt-1 line-clamp-3 text-xs text-neutral-400">{info.notes}</div>}

          {phase === 'idle' && (
            <>
              <div className="mt-3 flex gap-2">
                {info.assetUrl ? (
                  <button
                    onClick={download}
                    className="flex-1 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
                  >
                    Baixar atualização{info.size ? ` (${formatMb(info.size)})` : ''}
                  </button>
                ) : (
                  <button
                    onClick={() => window.api?.update.openPage()}
                    className="flex-1 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
                  >
                    Abrir página de download
                  </button>
                )}
                <button
                  onClick={() => setHidden(true)}
                  className="rounded-md border border-surface-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-surface-800"
                >
                  Depois
                </button>
              </div>
              <button onClick={skip} className="mt-2 text-[11px] text-neutral-500 hover:text-neutral-300">
                Não avisar sobre esta versão
              </button>
            </>
          )}

          {phase === 'downloading' && (
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-surface-800">
                <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <div className="mt-1 text-[11px] text-neutral-500">Baixando… {Math.round(progress * 100)}%</div>
            </div>
          )}

          {phase === 'ready' && (
            <>
              <div className="mt-2 text-xs text-neutral-400">
                {isMac
                  ? 'Baixada. Feche o Lyric Live, abra o instalador e arraste o app para Aplicativos, substituindo o atual.'
                  : 'Baixada. Ao instalar, o programa será fechado — salve seu projeto e só instale fora do culto.'}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={install}
                  className="flex-1 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
                >
                  {isMac ? 'Abrir instalador' : 'Instalar agora'}
                </button>
                <button
                  onClick={() => setHidden(true)}
                  className="rounded-md border border-surface-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-surface-800"
                >
                  Depois
                </button>
              </div>
            </>
          )}

          {phase === 'error' && (
            <>
              <div className="mt-2 text-xs text-red-300">{message}</div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={download}
                  className="flex-1 rounded-md border border-surface-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-surface-800"
                >
                  Tentar de novo
                </button>
                <button
                  onClick={() => window.api?.update.openPage()}
                  className="rounded-md border border-surface-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-surface-800"
                >
                  Abrir página
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
