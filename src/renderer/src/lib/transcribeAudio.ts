import type { TranscribedSegment } from '@shared/types/transcribe'

const WHISPER_SAMPLE_RATE = 16000

/** Lê o arquivo da música e devolve áudio mono 16 kHz (o formato que o Whisper espera). */
async function decodeToWhisperInput(filePath: string): Promise<Float32Array> {
  const file = await window.api.media.readFile(filePath)
  const ctx = new AudioContext()
  try {
    const decoded = await ctx.decodeAudioData(file.slice(0))
    const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * WHISPER_SAMPLE_RATE), WHISPER_SAMPLE_RATE)
    const source = offline.createBufferSource()
    source.buffer = decoded
    source.connect(offline.destination)
    source.start()
    const rendered = await offline.startRendering()
    return rendered.getChannelData(0)
  } finally {
    ctx.close()
  }
}

export async function transcribeSceneAudio(filePath: string): Promise<TranscribedSegment[]> {
  const audio = await decodeToWhisperInput(filePath)
  return window.api.transcribe.run(audio)
}
