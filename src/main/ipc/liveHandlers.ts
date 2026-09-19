import { ipcMain } from 'electron'
import { IPC, type DisplayInfo, type LiveOverlayPayload, type LiveStatePayload } from '@shared/types/ipc'

export interface LiveWindowController {
  open(): void
  close(): void
  isOpen(): boolean
  pushState(payload: LiveStatePayload): void
  pushOverlay(payload: LiveOverlayPayload | null): void
  listDisplays(): DisplayInfo[]
  moveToDisplay(displayId: number): void
  exitFullscreen(): void
}

export function registerLiveHandlers(controller: LiveWindowController): void {
  ipcMain.handle(IPC.liveOpen, () => controller.open())
  ipcMain.handle(IPC.liveClose, () => controller.close())
  ipcMain.handle(IPC.liveIsOpen, () => controller.isOpen())
  ipcMain.handle(IPC.liveListDisplays, () => controller.listDisplays())
  ipcMain.handle(IPC.liveMoveToDisplay, (_event, displayId: number) => controller.moveToDisplay(displayId))
  ipcMain.handle(IPC.liveExitFullscreen, () => controller.exitFullscreen())
  ipcMain.on(IPC.livePushState, (_event, payload: LiveStatePayload) => controller.pushState(payload))
  ipcMain.on(IPC.livePushOverlay, (_event, payload: LiveOverlayPayload | null) => controller.pushOverlay(payload))
}
