import { promises as fs } from 'node:fs'
import { dialog, BrowserWindow } from 'electron'
import type { Project } from '@shared/types/project'
import type { ProjectRepository } from './projectRepository'

const FILE_FILTERS = [{ name: 'Projeto (Lyric Live)', extensions: ['churchproj'] }]

export class JsonProjectRepository implements ProjectRepository {
  async save(project: Project, filePath: string): Promise<void> {
    const payload = JSON.stringify(project, null, 2)
    await fs.writeFile(filePath, payload, 'utf-8')
  }

  async saveAs(project: Project): Promise<string | null> {
    const win = BrowserWindow.getFocusedWindow()
    const options = {
      title: 'Salvar projeto',
      defaultPath: `${project.name}.churchproj`,
      filters: FILE_FILTERS
    }
    const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return null
    await this.save(project, result.filePath)
    return result.filePath
  }

  async open(): Promise<{ project: Project; filePath: string } | null> {
    const win = BrowserWindow.getFocusedWindow()
    const options = {
      title: 'Abrir projeto',
      properties: ['openFile' as const],
      filters: FILE_FILTERS
    }
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    const raw = await fs.readFile(filePath, 'utf-8')
    const project = JSON.parse(raw) as Project
    return { project, filePath }
  }
}
