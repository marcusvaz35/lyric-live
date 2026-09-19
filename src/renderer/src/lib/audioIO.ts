import { useProjectStore } from '../state/projectStore'

function readAudioDuration(blobUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    audio.addEventListener('loadedmetadata', () => resolve(audio.duration), { once: true })
    audio.addEventListener('error', () => reject(new Error('Não foi possível ler o áudio')), { once: true })
    audio.src = blobUrl
  })
}

/** Abre o diálogo nativo, copia o arquivo escolhido e associa a música à cena. */
export async function importSceneAudio(sceneId: string): Promise<void> {
  if (!window.api) {
    console.warn('API do Electron indisponível neste ambiente (preview no navegador).')
    return
  }
  try {
    const picked = await window.api.media.importAudio()
    if (!picked) return

    const buffer = await window.api.media.readFile(picked.filePath)
    const blobUrl = URL.createObjectURL(new Blob([buffer]))
    try {
      const duration = await readAudioDuration(blobUrl)
      useProjectStore.getState().setSceneAudio(sceneId, {
        filePath: picked.filePath,
        fileName: picked.fileName,
        duration
      })
    } finally {
      URL.revokeObjectURL(blobUrl)
    }
  } catch (err) {
    console.error('Falha ao importar música:', err)
    alert(`Não foi possível importar a música.\n\n${err instanceof Error ? err.message : String(err)}`)
  }
}

export function removeSceneAudio(sceneId: string): void {
  useProjectStore.getState().setSceneAudio(sceneId, null)
}
