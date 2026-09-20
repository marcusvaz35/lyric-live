import { useEffect, useState } from 'react'
import type { Scene } from '@shared/types/project'
import type { TranscribeProgress } from '@shared/types/transcribe'
import { useProjectStore } from '../../state/projectStore'
import { transcribeSceneAudio } from '../../lib/transcribeAudio'
import { Icon } from '../common/Icon'

interface Row {
  id: number
  start: number
  end: number
  text: string
}

const fmt = (t: number): string => {
  const m = Math.floor(t / 60)
  const s = t - m * 60
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`
}

/**
 * Transcreve a música da cena (Whisper local) e deixa revisar as linhas antes
 * de criar as camadas de texto na timeline, já com o tempo de cada trecho.
 */
export function TranscribeModal({ scene, onClose }: { scene: Scene; onClose: () => void }) {
  const addTextLayersFromSegments = useProjectStore((s) => s.addTextLayersFromSegments)
  const [progress, setProgress] = useState<TranscribeProgress | null>(null)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!scene.audio || !window.api) return
    let cancelled = false
    const unsubscribe = window.api.transcribe.onProgress(setProgress)
    transcribeSceneAudio(scene.audio.filePath)
      .then((segments) => {
        if (!cancelled) setRows(segments.map((s, i) => ({ id: i, ...s })))
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [scene.audio])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const updateRow = (id: number, patch: Partial<Row>): void =>
    setRows((r) => r?.map((row) => (row.id === id ? { ...row, ...patch } : row)) ?? null)

  const handleCreate = (): void => {
    if (!rows) return
    addTextLayersFromSegments(rows.filter((r) => r.text.trim()).map((r) => ({ ...r, text: r.text.trim() })))
    onClose()
  }

  const handleCopy = async (): Promise<void> => {
    if (!rows) return
    await navigator.clipboard.writeText(rows.map((r) => r.text.trim()).filter(Boolean).join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const status =
    progress?.stage === 'download'
      ? `Baixando o modelo de transcrição (só na primeira vez)… ${progress.percent ?? 0}%`
      : progress?.stage === 'transcribing'
        ? 'Transcrevendo a música… pode levar alguns minutos.'
        : 'Preparando…'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="flex h-full max-h-[640px] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-surface-700 bg-surface-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-800 px-4 py-3">
          <div className="text-sm font-semibold text-neutral-100">Transcrever letra — {scene.audio?.fileName}</div>
          <button onClick={onClose} className="icon-btn h-8 w-8 text-lg" title="Fechar">
            ×
          </button>
        </div>

        {error ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-red-400">
            Não foi possível transcrever: {error}
          </div>
        ) : !rows ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="h-1.5 w-64 overflow-hidden rounded-full bg-surface-800">
              <div
                className={`h-full bg-accent ${progress?.stage === 'download' ? '' : 'animate-pulse w-full'}`}
                style={progress?.stage === 'download' ? { width: `${progress.percent ?? 0}%` } : undefined}
              />
            </div>
            <p className="text-sm text-neutral-400">{status}</p>
          </div>
        ) : (
          <>
            <div className="border-b border-surface-800 px-4 py-2 text-xs text-neutral-500">
              Revise e corrija o texto (a transcrição de música cantada pode errar palavras). Cada linha vira uma
              camada na timeline no tempo indicado.
            </div>
            <div className="flex-1 space-y-1.5 overflow-y-scroll p-3">
              {rows.length === 0 && <p className="p-4 text-sm text-neutral-600">Nenhum texto reconhecido.</p>}
              {rows.map((row) => (
                <div key={row.id} className="flex items-center gap-2">
                  <span className="w-40 shrink-0 whitespace-nowrap text-center font-mono text-[11px] text-neutral-500">
                    {fmt(row.start)} → {fmt(row.end)}
                  </span>
                  <input
                    value={row.text}
                    onChange={(e) => updateRow(row.id, { text: e.target.value })}
                    className="field-input flex-1"
                  />
                  <button
                    onClick={() => setRows((r) => r?.filter((x) => x.id !== row.id) ?? null)}
                    title="Remover linha"
                    className="icon-btn h-7 w-7 shrink-0"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-surface-800 px-4 py-3">
              <button
                onClick={handleCopy}
                className="rounded-md border border-surface-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-surface-800"
              >
                {copied ? 'Copiado!' : 'Copiar texto'}
              </button>
              <button onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-neutral-400 hover:bg-surface-800">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={rows.length === 0}
                className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
              >
                Criar na timeline
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
