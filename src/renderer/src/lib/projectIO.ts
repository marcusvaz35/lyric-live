import { useProjectStore } from '../state/projectStore'

/** Envelopa as chamadas de IPC; funciona também fora do Electron (preview no navegador). */
export async function saveProject(): Promise<void> {
  const { project, filePath, markSaved } = useProjectStore.getState()
  if (!window.api) {
    console.warn('API do Electron indisponível neste ambiente (preview no navegador).')
    return
  }
  if (filePath) {
    await window.api.project.save(project, filePath)
    markSaved(filePath)
    return
  }
  const savedPath = await window.api.project.saveAs(project)
  if (savedPath) markSaved(savedPath)
}

export async function saveProjectAs(): Promise<void> {
  const { project, markSaved } = useProjectStore.getState()
  if (!window.api) return
  const savedPath = await window.api.project.saveAs(project)
  if (savedPath) markSaved(savedPath)
}

export async function openProject(): Promise<void> {
  const { loadProject } = useProjectStore.getState()
  if (!window.api) return
  const result = await window.api.project.open()
  if (result) loadProject(result.project, result.filePath)
}
