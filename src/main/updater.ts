import { app, ipcMain, net, shell, type BrowserWindow } from 'electron'
import { createWriteStream, promises as fs } from 'node:fs'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { IPC, type UpdateCheckResult, type UpdateInfo, type UpdateProgress } from '@shared/types/ipc'

// Os instaladores ficam em releases de um repositório público. O app não é assinado, então a
// atualização automática "silenciosa" não vale (o macOS exige assinatura): o app avisa, baixa o
// instalador novo e o abre, e a pessoa só confirma.
const REPO = 'marcusvaz35/lyric-live-downloads'
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000
const HEADERS = { 'User-Agent': 'LyricLive-Updater', Accept: 'application/vnd.github+json' }

interface GithubAsset {
  name: string
  browser_download_url: string
  size: number
}

let pending: UpdateInfo | null = null
let downloadedPath: string | null = null
let downloading = false

function isNewer(remote: string, local: string): boolean {
  const a = remote.split('.').map((n) => parseInt(n, 10) || 0)
  const b = local.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) return diff > 0
  }
  return false
}

function pickAsset(assets: GithubAsset[]): GithubAsset | null {
  if (process.platform === 'darwin') {
    const dmgs = assets.filter((x) => x.name.toLowerCase().endsWith('.dmg'))
    const wantArm = process.arch === 'arm64'
    return dmgs.find((x) => x.name.toLowerCase().includes('arm64') === wantArm) ?? null
  }
  if (process.platform === 'win32') return assets.find((x) => x.name.toLowerCase().endsWith('.exe')) ?? null
  return null
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  try {
    const res = await net.fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: HEADERS })
    if (!res.ok) return { info: null, error: `O GitHub respondeu ${res.status}.` }
    const release = (await res.json()) as {
      tag_name?: string
      body?: string
      html_url?: string
      assets?: GithubAsset[]
    }
    const version = String(release.tag_name ?? '').replace(/^v/i, '')
    if (!version || !isNewer(version, app.getVersion())) return { info: null }
    const asset = pickAsset(release.assets ?? [])
    const info: UpdateInfo = {
      version,
      notes: (release.body ?? '').trim().slice(0, 600),
      assetName: asset?.name ?? null,
      assetUrl: asset?.browser_download_url ?? null,
      size: asset?.size ?? 0,
      pageUrl: release.html_url ?? `https://github.com/${REPO}/releases/latest`
    }
    if (pending?.version !== info.version) downloadedPath = null
    pending = info
    return { info }
  } catch (err) {
    return { info: null, error: err instanceof Error ? err.message : 'Sem conexão.' }
  }
}

async function downloadUpdate(win: BrowserWindow | null): Promise<void> {
  if (!pending?.assetUrl || !pending.assetName) throw new Error('Não há instalador pra este sistema.')
  if (downloading) return
  downloading = true
  const dest = join(app.getPath('downloads'), pending.assetName)
  const partial = `${dest}.part`
  try {
    const res = await net.fetch(pending.assetUrl, { headers: { 'User-Agent': HEADERS['User-Agent'] } })
    if (!res.ok || !res.body) throw new Error(`Falha ao baixar (${res.status}).`)
    const total = Number(res.headers.get('content-length')) || pending.size
    let received = 0
    let lastSent = 0
    const send = (): void => {
      const p: UpdateProgress = { received, total }
      win?.webContents.send(IPC.updateProgress, p)
    }
    const source = Readable.fromWeb(res.body as never)
    source.on('data', (chunk: Buffer) => {
      received += chunk.length
      if (Date.now() - lastSent > 150) {
        lastSent = Date.now()
        send()
      }
    })
    await pipeline(source, createWriteStream(partial))
    await fs.rename(partial, dest)
    send()
    downloadedPath = dest
  } catch (err) {
    await fs.rm(partial, { force: true })
    throw err
  } finally {
    downloading = false
  }
}

async function installUpdate(): Promise<void> {
  if (!downloadedPath) throw new Error('Baixe a atualização primeiro.')
  const error = await shell.openPath(downloadedPath)
  if (error) throw new Error(error)
  // no Windows o instalador precisa do app fechado; no macOS abre o .dmg e a pessoa arrasta
  if (process.platform === 'win32') setTimeout(() => app.quit(), 1200)
}

export function registerUpdateHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IPC.appVersion, () => app.getVersion())
  ipcMain.handle(IPC.updateCheck, () => checkForUpdate())
  ipcMain.handle(IPC.updateDownload, () => downloadUpdate(getMainWindow()))
  ipcMain.handle(IPC.updateInstall, () => installUpdate())
  ipcMain.handle(IPC.updateOpenPage, () => {
    if (pending) return shell.openExternal(pending.pageUrl)
  })
}

/** Confere ao abrir e a cada poucas horas; se houver versão nova, avisa a janela principal. */
export function startUpdateChecks(getMainWindow: () => BrowserWindow | null): void {
  if (!app.isPackaged) return
  const run = async (): Promise<void> => {
    const { info } = await checkForUpdate()
    if (info) getMainWindow()?.webContents.send(IPC.updateAvailable, info)
  }
  setTimeout(run, 8000)
  setInterval(run, CHECK_EVERY_MS)
}
