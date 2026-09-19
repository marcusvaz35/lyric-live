import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC,
  type DisplayInfo,
  type ImportedAudioFile,
  type LiveOverlayPayload,
  type LiveStatePayload,
  type ProjectFileResult
} from '@shared/types/ipc'
import type { Project } from '@shared/types/project'
import type { BibleBook, BibleVersionMeta } from '@shared/types/bible'
import type { Song, SongSearchResult, SongSummary } from '@shared/types/song'

const api = {
  project: {
    save: (project: Project, filePath: string): Promise<void> =>
      ipcRenderer.invoke(IPC.projectSave, project, filePath),
    saveAs: (project: Project): Promise<string | null> =>
      ipcRenderer.invoke(IPC.projectSaveAs, project),
    open: (): Promise<ProjectFileResult | null> => ipcRenderer.invoke(IPC.projectOpen)
  },
  media: {
    importAudio: (): Promise<ImportedAudioFile | null> => ipcRenderer.invoke(IPC.mediaImportAudio),
    readFile: (filePath: string): Promise<ArrayBuffer> => ipcRenderer.invoke(IPC.mediaReadFile, filePath)
  },
  live: {
    open: (): Promise<void> => ipcRenderer.invoke(IPC.liveOpen),
    close: (): Promise<void> => ipcRenderer.invoke(IPC.liveClose),
    isOpen: (): Promise<boolean> => ipcRenderer.invoke(IPC.liveIsOpen),
    listDisplays: (): Promise<DisplayInfo[]> => ipcRenderer.invoke(IPC.liveListDisplays),
    moveToDisplay: (displayId: number): Promise<void> =>
      ipcRenderer.invoke(IPC.liveMoveToDisplay, displayId),
    exitFullscreen: (): Promise<void> => ipcRenderer.invoke(IPC.liveExitFullscreen),
    pushState: (payload: LiveStatePayload): void => {
      ipcRenderer.send(IPC.livePushState, payload)
    },
    onState: (callback: (payload: LiveStatePayload) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: LiveStatePayload): void =>
        callback(payload)
      ipcRenderer.on(IPC.liveState, listener)
      return () => ipcRenderer.removeListener(IPC.liveState, listener)
    },
    pushOverlay: (payload: LiveOverlayPayload | null): void => {
      ipcRenderer.send(IPC.livePushOverlay, payload)
    },
    onOverlay: (callback: (payload: LiveOverlayPayload | null) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: LiveOverlayPayload | null): void =>
        callback(payload)
      ipcRenderer.on(IPC.liveOverlay, listener)
      return () => ipcRenderer.removeListener(IPC.liveOverlay, listener)
    }
  },
  bible: {
    listVersions: (): Promise<BibleVersionMeta[]> => ipcRenderer.invoke(IPC.bibleListVersions),
    downloadVersion: (versionId: string): Promise<void> =>
      ipcRenderer.invoke(IPC.bibleDownloadVersion, versionId),
    readVersion: (versionId: string): Promise<BibleBook[]> =>
      ipcRenderer.invoke(IPC.bibleReadVersion, versionId),
    deleteVersion: (versionId: string): Promise<void> =>
      ipcRenderer.invoke(IPC.bibleDeleteVersion, versionId)
  },
  song: {
    list: (): Promise<SongSummary[]> => ipcRenderer.invoke(IPC.songList),
    save: (song: Song): Promise<void> => ipcRenderer.invoke(IPC.songSave, song),
    read: (id: string): Promise<Song> => ipcRenderer.invoke(IPC.songRead, id),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC.songDelete, id),
    searchOnline: (query: string): Promise<SongSearchResult[]> =>
      ipcRenderer.invoke(IPC.songSearchOnline, query),
    fetchLyrics: (artist: string, title: string): Promise<string | null> =>
      ipcRenderer.invoke(IPC.songFetchLyrics, artist, title)
  }
}

export type PresenterApi = typeof api

contextBridge.exposeInMainWorld('api', api)
