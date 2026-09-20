import { ipcMain } from 'electron'
import { IPC } from '@shared/types/ipc'
import { transcribeAudio } from '../persistence/transcriber'

export function registerTranscribeHandlers(): void {
  ipcMain.handle(IPC.transcribeRun, (event, audio: Float32Array) =>
    transcribeAudio(audio, (p) => event.sender.send(IPC.transcribeProgress, p))
  )
}
