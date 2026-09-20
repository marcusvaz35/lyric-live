import { ipcMain } from 'electron'
import { IPC } from '@shared/types/ipc'
import type { Playlist, Song } from '@shared/types/song'
import { deleteSong, listSongs, readPlaylist, readSong, savePlaylist, saveSong } from '../persistence/songLibrary'
import { fetchLyrics, searchSongsOnline } from '../persistence/lyricsSearch'

export function registerSongHandlers(): void {
  ipcMain.handle(IPC.songList, () => listSongs())
  ipcMain.handle(IPC.songSave, (_event, song: Song) => saveSong(song))
  ipcMain.handle(IPC.songRead, (_event, id: string) => readSong(id))
  ipcMain.handle(IPC.songDelete, (_event, id: string) => deleteSong(id))
  ipcMain.handle(IPC.playlistGet, () => readPlaylist())
  ipcMain.handle(IPC.playlistSave, (_event, playlist: Playlist) => savePlaylist(playlist))
  ipcMain.handle(IPC.songSearchOnline, (_event, query: string) => searchSongsOnline(query))
  ipcMain.handle(IPC.songFetchLyrics, (_event, artist: string, title: string) => fetchLyrics(artist, title))
}
