import { promises as fs } from 'node:fs'
import { app } from 'electron'
import { join } from 'node:path'
import type { VerseList, VerseListEntry } from '@shared/types/song'

function versesPath(): string {
  return join(app.getPath('userData'), 'verses.json')
}

export async function readVerseList(): Promise<VerseList> {
  try {
    const raw = await fs.readFile(versesPath(), 'utf-8')
    const data = JSON.parse(raw) as VerseList
    return { entries: Array.isArray(data.entries) ? data.entries : [] }
  } catch {
    return { entries: [] }
  }
}

export async function saveVerseList(list: VerseList): Promise<void> {
  await fs.writeFile(versesPath(), JSON.stringify(list, null, 2), 'utf-8')
}

/** Recebe versículos que estavam salvos junto das músicas (formato antigo) e os põe nesta lista. */
export async function appendVerses(entries: VerseListEntry[]): Promise<void> {
  if (entries.length === 0) return
  const list = await readVerseList()
  const known = new Set(list.entries.map((e) => e.uid))
  const novos = entries.filter((e) => !known.has(e.uid))
  if (novos.length === 0) return
  await saveVerseList({ entries: [...list.entries, ...novos] })
}
