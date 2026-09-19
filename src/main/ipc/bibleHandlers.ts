import { ipcMain } from 'electron'
import { IPC } from '@shared/types/ipc'
import {
  deleteBibleVersion,
  downloadBibleVersion,
  listBibleVersions,
  readBibleVersion
} from '../persistence/bibleLibrary'

export function registerBibleHandlers(): void {
  ipcMain.handle(IPC.bibleListVersions, () => listBibleVersions())
  ipcMain.handle(IPC.bibleDownloadVersion, (_event, versionId: string) => downloadBibleVersion(versionId))
  ipcMain.handle(IPC.bibleReadVersion, (_event, versionId: string) => readBibleVersion(versionId))
  ipcMain.handle(IPC.bibleDeleteVersion, (_event, versionId: string) => deleteBibleVersion(versionId))
}
