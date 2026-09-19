import { promises as fs } from 'node:fs'
import { app } from 'electron'
import { join } from 'node:path'
import type { BibleBook, BibleVersionMeta } from '@shared/types/bible'

/**
 * Fonte: thiagobodruk/biblia (github.com/thiagobodruk/biblia), compilação sob
 * CC BY-NC. Os textos em si pertencem às respectivas sociedades bíblicas —
 * ACF e AA são de uso livre corrente para fins ministeriais; a NVI tem
 * direitos ativamente reservados pela Sociedade Bíblica Internacional, então
 * fica disponível mas com aviso explícito antes de baixar.
 */
const CATALOG: Omit<BibleVersionMeta, 'downloaded'>[] = [
  {
    id: 'acf',
    label: 'Almeida Corrigida Fiel (ACF)',
    license: 'Uso ministerial livre — Sociedade Bíblica Trinitariana do Brasil.'
  },
  {
    id: 'aa',
    label: 'Almeida Revisada Imprensa Bíblica (AA)',
    license: 'Uso ministerial livre — Imprensa Bíblica Brasileira.'
  },
  {
    id: 'nvi',
    label: 'Nova Versão Internacional (NVI)',
    license: 'Direitos reservados à Sociedade Bíblica Internacional — confirme a licença antes de usar comercialmente.'
  }
]

function sourceUrl(versionId: string): string {
  return `https://raw.githubusercontent.com/thiagobodruk/biblia/master/json/${versionId}.json`
}

function bibleDir(): string {
  return join(app.getPath('userData'), 'bible')
}

function filePathFor(versionId: string): string {
  return join(bibleDir(), `${versionId}.json`)
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

export async function listBibleVersions(): Promise<BibleVersionMeta[]> {
  const results: BibleVersionMeta[] = []
  for (const v of CATALOG) {
    results.push({ ...v, downloaded: await fileExists(filePathFor(v.id)) })
  }
  return results
}

export async function downloadBibleVersion(versionId: string): Promise<void> {
  if (!CATALOG.some((v) => v.id === versionId)) throw new Error('Versão desconhecida')
  const res = await fetch(sourceUrl(versionId))
  if (!res.ok) throw new Error(`Falha ao baixar (HTTP ${res.status})`)
  const text = await res.text()
  await fs.mkdir(bibleDir(), { recursive: true })
  await fs.writeFile(filePathFor(versionId), text, 'utf-8')
}

export async function readBibleVersion(versionId: string): Promise<BibleBook[]> {
  const raw = await fs.readFile(filePathFor(versionId), 'utf-8')
  return JSON.parse(raw.replace(/^﻿/, ''))
}

export async function deleteBibleVersion(versionId: string): Promise<void> {
  await fs.rm(filePathFor(versionId), { force: true })
}
