import { promises as fs } from 'node:fs'
import { app } from 'electron'
import { join } from 'node:path'
import type { Playlist, PlaylistEntry, Song, SongSummary } from '@shared/types/song'
import { appendVerses } from './verseList'

function songsDir(): string {
  return join(app.getPath('userData'), 'songs')
}

function filePathFor(id: string): string {
  return join(songsDir(), `${id}.json`)
}

/** Resumo já montado de cada arquivo, guardado entre as listagens: com biblioteca grande,
 * reler e interpretar tudo a cada atualização era o que travava a pesquisa. */
const summaryCache = new Map<string, { mtimeMs: number; summary: SongSummary }>()

/** Lê em grupos pra não abrir arquivos demais de uma vez (o sistema tem limite). */
const READ_BATCH = 40

async function summaryOf(file: string): Promise<SongSummary | null> {
  const full = join(songsDir(), file)
  try {
    const { mtimeMs } = await fs.stat(full)
    const cached = summaryCache.get(file)
    if (cached && cached.mtimeMs === mtimeMs) return cached.summary

    const raw = await fs.readFile(full, 'utf-8')
    const song = JSON.parse(raw) as Song
    const summary: SongSummary = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      text: song.blocks.join('\n')
    }
    summaryCache.set(file, { mtimeMs, summary })
    return summary
  } catch {
    // ignora arquivo corrompido/ilegível
    return null
  }
}

export async function listSongs(): Promise<SongSummary[]> {
  await fs.mkdir(songsDir(), { recursive: true })
  const files = (await fs.readdir(songsDir())).filter((f) => f.endsWith('.json'))

  const summaries: SongSummary[] = []
  for (let i = 0; i < files.length; i += READ_BATCH) {
    const lote = await Promise.all(files.slice(i, i + READ_BATCH).map(summaryOf))
    for (const s of lote) if (s) summaries.push(s)
  }

  // tira do cache o que não existe mais na pasta
  const existing = new Set(files)
  for (const key of summaryCache.keys()) {
    if (!existing.has(key)) summaryCache.delete(key)
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
  summaryCache.delete(`${id}.json`)
  await fs.rm(filePathFor(id), { force: true })
}

function playlistPath(): string {
  return join(app.getPath('userData'), 'playlist.json')
}

/** Entrada como ficava salva na versão em que versículo e música dividiam a mesma lista. */
interface LegacyEntry {
  uid: string
  songId?: string
  verse?: { reference: string; text: string }
}

export async function readPlaylist(): Promise<Playlist> {
  try {
    const raw = await fs.readFile(playlistPath(), 'utf-8')
    const data = JSON.parse(raw) as { entries?: LegacyEntry[]; currentUid?: string | null }
    const saved = Array.isArray(data.entries) ? data.entries : []

    // versículos que tinham sido guardados junto das músicas mudam pra lista própria da Bíblia
    const strays = saved.filter((e) => e?.verse)
    const songs = saved.filter((e): e is PlaylistEntry => Boolean(e?.songId) && !e.verse)
    if (strays.length > 0) {
      await appendVerses(
        strays.map((e) => ({ uid: e.uid, reference: e.verse!.reference, text: e.verse!.text }))
      )
      const movedUids = new Set(strays.map((e) => e.uid))
      const cleaned: Playlist = {
        entries: songs,
        currentUid: data.currentUid && movedUids.has(data.currentUid) ? null : (data.currentUid ?? null)
      }
      await savePlaylist(cleaned)
      return cleaned
    }

    return { entries: songs, currentUid: data.currentUid ?? null }
  } catch {
    return { entries: [], currentUid: null }
  }
}

export async function savePlaylist(playlist: Playlist): Promise<void> {
  await fs.writeFile(playlistPath(), JSON.stringify(playlist, null, 2), 'utf-8')
}
