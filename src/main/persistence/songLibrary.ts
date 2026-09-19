import { promises as fs } from 'node:fs'
import { app } from 'electron'
import { join } from 'node:path'
import type { Song, SongSummary } from '@shared/types/song'

function songsDir(): string {
  return join(app.getPath('userData'), 'songs')
}

function filePathFor(id: string): string {
  return join(songsDir(), `${id}.json`)
}

export async function listSongs(): Promise<SongSummary[]> {
  await fs.mkdir(songsDir(), { recursive: true })
  const files = await fs.readdir(songsDir())
  const summaries: SongSummary[] = []
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    try {
      const raw = await fs.readFile(join(songsDir(), file), 'utf-8')
      const song = JSON.parse(raw) as Song
      summaries.push({ id: song.id, title: song.title, artist: song.artist })
    } catch {
      // ignora arquivo corrompido/ilegível
    }
  }
  return summaries.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
}

export async function saveSong(song: Song): Promise<void> {
  await fs.mkdir(songsDir(), { recursive: true })
  await fs.writeFile(filePathFor(song.id), JSON.stringify(song, null, 2), 'utf-8')
}

export async function readSong(id: string): Promise<Song> {
  const raw = await fs.readFile(filePathFor(id), 'utf-8')
  return JSON.parse(raw)
}

export async function deleteSong(id: string): Promise<void> {
  await fs.rm(filePathFor(id), { force: true })
}
