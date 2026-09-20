import { ipcMain } from 'electron'
import { IPC } from '@shared/types/ipc'
import { importAudioFile, importVisualFile, readMediaFile } from '../persistence/mediaLibrary'

export function registerMediaHandlers(): void {
  ipcMain.handle(IPC.mediaImportAudio, async () => {
    return importAudioFile()
  })

  ipcMain.handle(IPC.mediaImportVisual, async () => importVisualFile())

  ipcMain.handle(IPC.mediaReadFile, async (_event, filePath: string) => {
    const buffer = await readMediaFile(filePath)
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  })
}
