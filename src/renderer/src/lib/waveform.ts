const PEAK_BUCKETS = 2000

export interface DecodedAudio {
  duration: number
  /** Pico de amplitude (0-1) em ~2000 baldes cobrindo o áudio inteiro. */
  peaks: Float32Array
  blobUrl: string
}

/** Decodifica os bytes do áudio uma vez: duração + picos da forma de onda + URL tocável. */
export async function decodeAudio(arrayBuffer: ArrayBuffer): Promise<DecodedAudio> {
  const blobUrl = URL.createObjectURL(new Blob([arrayBuffer.slice(0)]))

  const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const audioContext = new AudioContextCtor()
  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0))
    const peaks = computePeaks(decoded, PEAK_BUCKETS)
    return { duration: decoded.duration, peaks, blobUrl }
  } finally {
    audioContext.close()
  }
}

function computePeaks(buffer: AudioBuffer, bucketCount: number): Float32Array {
  const channelData = buffer.getChannelData(0)
  const samplesPerBucket = Math.max(1, Math.floor(channelData.length / bucketCount))
  const peaks = new Float32Array(bucketCount)

  for (let i = 0; i < bucketCount; i++) {
    const start = i * samplesPerBucket
    const end = Math.min(start + samplesPerBucket, channelData.length)
    let max = 0
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j])
      if (abs > max) max = abs
    }
    peaks[i] = max
  }
  return peaks
}
