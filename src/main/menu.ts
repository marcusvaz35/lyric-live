import { Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'
import { IPC, type AppCommand } from '@shared/types/ipc'
import { is } from './lib/env'

/** Menu do app: os atalhos (Ctrl/⌘+Z, S, O, N…) passam por aqui e viram comandos pro editor.
 * Também é o que faz copiar/colar funcionar nos campos de texto no macOS. */
export function buildAppMenu(getMainWindow: () => BrowserWindow | null): void {
  const send = (command: AppCommand) => (): void => {
    getMainWindow()?.webContents.send(IPC.appCommand, command)
  }
  const isMac = process.platform === 'darwin'

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: 'Lyric Live',
            submenu: [
              { role: 'about' as const, label: 'Sobre o Lyric Live' },
              { type: 'separator' as const },
              { role: 'hide' as const, label: 'Ocultar Lyric Live' },
              { role: 'hideOthers' as const, label: 'Ocultar outros' },
              { role: 'unhide' as const, label: 'Mostrar tudo' },
              { type: 'separator' as const },
              { role: 'quit' as const, label: 'Sair do Lyric Live' }
            ]
          }
        ]
      : []),
    {
      label: 'Arquivo',
      submenu: [
        { label: 'Novo projeto', accelerator: 'CmdOrCtrl+N', click: send('new') },
        { label: 'Abrir…', accelerator: 'CmdOrCtrl+O', click: send('open') },
        { type: 'separator' },
        { label: 'Salvar', accelerator: 'CmdOrCtrl+S', click: send('save') },
        { label: 'Salvar como…', accelerator: 'Shift+CmdOrCtrl+S', click: send('saveAs') },
        ...(isMac ? [] : [{ type: 'separator' as const }, { role: 'quit' as const, label: 'Sair' }])
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { label: 'Desfazer', accelerator: 'CmdOrCtrl+Z', click: send('undo') },
        { label: 'Refazer', accelerator: 'Shift+CmdOrCtrl+Z', click: send('redo') },
        { label: 'Refazer (Ctrl+Y)', accelerator: 'Ctrl+Y', visible: false, click: send('redo') },
        { type: 'separator' },
        { role: 'cut', label: 'Recortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Colar' },
        { role: 'selectAll', label: 'Selecionar tudo' }
      ]
    },
    {
      label: 'Janela',
      submenu: [
        { role: 'minimize', label: 'Minimizar' },
        { role: 'zoom', label: 'Zoom' },
        ...(is.dev ? [{ type: 'separator' as const }, { role: 'toggleDevTools' as const }] : [])
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
