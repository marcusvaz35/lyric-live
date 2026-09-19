import type { EffectId, Project, Scene } from './project'

/** Nomes de canal IPC centralizados para evitar strings soltas nos dois lados. */
export const IPC = {
  projectSave: 'project:save',
  projectSaveAs: 'project:saveAs',
  projectOpen: 'project:open',
  mediaImportAudio: 'media:importAudio',
  mediaReadFile: 'media:readFile',
  liveOpen: 'live:open',
  liveClose: 'live:close',
  liveIsOpen: 'live:isOpen',
  liveListDisplays: 'live:listDisplays',
  liveMoveToDisplay: 'live:moveToDisplay',
  liveExitFullscreen: 'live:exitFullscreen',
  livePushState: 'live:pushState',
  liveState: 'live:state',
  livePushOverlay: 'live:pushOverlay',
  liveOverlay: 'live:overlay',
  bibleListVersions: 'bible:listVersions',
  bibleDownloadVersion: 'bible:downloadVersion',
  bibleReadVersion: 'bible:readVersion',
  bibleDeleteVersion: 'bible:deleteVersion',
  songList: 'song:list',
  songSave: 'song:save',
  songRead: 'song:read',
  songDelete: 'song:delete',
  songSearchOnline: 'song:searchOnline',
  songFetchLyrics: 'song:fetchLyrics'
} as const

export interface ProjectFileResult {
  project: Project
  filePath: string
}

/** Resultado de escolher e copiar um arquivo de áudio para a pasta de mídia do app.
 * A duração é calculada depois, no renderer, ao decodificar o arquivo. */
export interface ImportedAudioFile {
  filePath: string
  fileName: string
}

/** O que o editor manda pra janela LIVE mostrar. */
export interface LiveStatePayload {
  scene: Scene
  playhead: number
}

/** Texto em exibição ao vivo direto da Bíblia ou de uma música — não faz parte
 * da cena/timeline do projeto, é só um overlay temporário que a janela LIVE
 * mostra por cima (tela cheia, sem UI do editor). */
export interface LiveOverlayPayload {
  text: string
  reference: string
  /** Animação de entrada do texto (mesmos presets da aba Efeitos). */
  effect?: EffectId | null
  /** Palavras (índice entre as não-vazias) destacadas com brilho pulsante. */
  highlights?: number[]
  /** Muda a cada "replay" — é o que faz a animação de entrada tocar de novo. */
  key?: number
}

export interface DisplayInfo {
  id: number
  label: string
  isPrimary: boolean
  width: number
  height: number
}
