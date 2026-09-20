import { ipcMain } from 'electron'
import { IPC } from '@shared/types/ipc'
import { listSystemFonts } from '../persistence/systemFonts'

export function registerFontHandlers(): void {
  ipcMain.handle(IPC.fontsList, () => listSystemFonts())
}
