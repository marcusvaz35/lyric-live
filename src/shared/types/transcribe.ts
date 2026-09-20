/** Um trecho transcrito do áudio, com tempo em segundos desde o início da música. */
export interface TranscribedSegment {
  start: number
  end: number
  text: string
}

export interface TranscribeProgress {
  stage: 'download' | 'loading' | 'transcribing'
  /** 0-100, só faz sentido em 'download'. */
  percent?: number
}
