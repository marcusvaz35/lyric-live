import { app } from 'electron'
import { join } from 'node:path'
import type { TranscribedSegment, TranscribeProgress } from '@shared/types/transcribe'

const MODEL = 'Xenova/whisper-small'

type Asr = (audio: Float32Array, options: Record<string, unknown>) => Promise<{
  text: string
  chunks?: { timestamp: [number, number | null]; text: string }[]
}>

let asrPromise: Promise<Asr> | null = null

/** Carrega o Whisper local; o modelo é baixado uma vez para a pasta de dados do app. */
function loadModel(onProgress: (p: TranscribeProgress) => void): Promise<Asr> {
  if (asrPromise) return asrPromise
  asrPromise = (async () => {
    const { pipeline, env } = await import('@huggingface/transformers')
    env.cacheDir = join(app.getPath('userData'), 'models')

    const fileProgress = new Map<string, { loaded: number; total: number }>()
    onProgress({ stage: 'download', percent: 0 })
    const asr = await pipeline('automatic-speech-recognition', MODEL, {
      dtype: 'q8',
      progress_callback: (info: { status: string; file?: string; loaded?: number; total?: number }) => {
        if (info.status === 'progress' && info.file && info.total) {
          fileProgress.set(info.file, { loaded: info.loaded ?? 0, total: info.total })
          let loaded = 0
          let total = 0
          for (const f of fileProgress.values()) {
            loaded += f.loaded
            total += f.total
          }
          onProgress({ stage: 'download', percent: Math.round((loaded / total) * 100) })
        }
      }
    })
    return asr as unknown as Asr
  })().catch((err) => {
    asrPromise = null
    throw err
  })
  return asrPromise
}

/** Transcreve áudio mono 16 kHz. Devolve trechos com tempo (o Whisper agrupa por frase). */
export async function transcribeAudio(
  audio: Float32Array,
  onProgress: (p: TranscribeProgress) => void
): Promise<TranscribedSegment[]> {
  const asr = await loadModel(onProgress)
  onProgress({ stage: 'transcribing' })

  const result = await asr(audio, {
    language: 'portuguese',
    task: 'transcribe',
    return_timestamps: true,
    chunk_length_s: 30,
    stride_length_s: 5
  })

  const duration = audio.length / 16000
  const segments: TranscribedSegment[] = []
  for (const chunk of result.chunks ?? []) {
    const text = chunk.text.trim()
    if (!text) continue
    const start = chunk.timestamp[0] ?? 0
    const end = chunk.timestamp[1] ?? Math.min(duration, start + 4)
    segments.push({ start, end, text })
  }
  return segments
}
