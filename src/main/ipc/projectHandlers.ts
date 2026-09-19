import { ipcMain } from 'electron'
import { IPC } from '@shared/types/ipc'
import type { Project } from '@shared/types/project'
import type { ProjectRepository } from '../persistence/projectRepository'

export function registerProjectHandlers(repository: ProjectRepository): void {
  ipcMain.handle(IPC.projectSave, async (_event, project: Project, filePath: string) => {
    await repository.save(project, filePath)
  })

  ipcMain.handle(IPC.projectSaveAs, async (_event, project: Project) => {
    return repository.saveAs(project)
  })

  ipcMain.handle(IPC.projectOpen, async () => {
    return repository.open()
  })
}
