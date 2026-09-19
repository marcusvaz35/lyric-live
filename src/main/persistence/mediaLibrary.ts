import { promises as fs } from 'node:fs'
import { app, dialog, BrowserWindow } from 'electron'
import { join, extname, relative, isAbsolute } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { ImportedAudioFile } from '@shared/types/ipc'

const AUDIO_FILTERS = [{ name: 'Áudio', extensions: ['mp3', 'wav', 'm4a', 'aac', 'ogg'] }]

function mediaDir(): string {
  return join(app.getPath('userData'), 'media')
}

/** Abre o diálogo de escolha de arquivo e copia o áudio escolhido para a pasta de mídia do app. */
export async function importAudioFile(): Promise<ImportedAudioFile | null> {
  const win = BrowserWindow.getFocusedWindow()
  const options = { title: 'Importar música', properties: ['openFile' as const], filters: AUDIO_FILTERS }
  const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
  if (result.canceled || result.filePaths.length === 0) return null

  const sourcePath = result.filePaths[0]
  const fileName = sourcePath.split(/[/\\]/).pop() ?? 'audio'
  const destDir = mediaDir()
  await fs.mkdir(destDir, { recursive: true })
  const destPath = join(destDir, `${randomUUID()}${extname(sourcePath)}`)
  await fs.copyFile(sourcePath, destPath)

  return { filePath: destPath, fileName }
}

/** Só lê arquivos de dentro da pasta de mídia do app — evita que o renderer peça
 * qualquer caminho arbitrário do disco via IPC. */
export async function readMediaFile(filePath: string): Promise<Buffer> {
  const rel = relative(mediaDir(), filePath)
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error('Caminho fora da pasta de mídia do app')
  }
  return fs.readFile(filePath)
}
