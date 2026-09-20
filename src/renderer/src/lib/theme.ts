export interface ThemeDef {
  id: string
  label: string
  description: string
  /** Cores da miniatura na lista: fundo, painel, texto, acento. */
  swatch: [string, string, string, string]
}

export const THEMES: ThemeDef[] = [
  { id: 'classico', label: 'Clássico', description: 'O visual atual.', swatch: ['#0a0a0d', '#17171d', '#e5e5e5', '#6d5efc'] },
  { id: 'grafite', label: 'Grafite', description: 'Escuro neutro, linhas finas, acento roxo suave.', swatch: ['#0f0f11', '#1a1a1e', '#dedee3', '#8a7cf0'] },
  { id: 'ambar', label: 'Âmbar', description: 'Carvão quente com acento âmbar.', swatch: ['#110f0d', '#1e1a16', '#e4ded4', '#e0a95a'] },
  { id: 'agua', label: 'Verde-água', description: 'Ardósia fria com acento verde-água.', swatch: ['#0b1012', '#151e22', '#d6e2e4', '#4fb99f'] },
  { id: 'porcelana', label: 'Porcelana', description: 'Claro e limpo, para ambientes iluminados.', swatch: ['#f3f3f6', '#ffffff', '#28282e', '#4f46e5'] },
  { id: 'mono', label: 'Monocromático', description: 'Preto e cinza, sem cor. O mais discreto.', swatch: ['#000000', '#101010', '#e0e0e0', '#ebebeb'] }
]

const STORAGE_KEY = 'lyric-live-theme'
const DEFAULT_THEME = 'classico'

export function getSavedTheme(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved && THEMES.some((t) => t.id === saved) ? saved : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function applyTheme(id: string): void {
  document.documentElement.dataset.theme = id
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // sem armazenamento (janela privada etc.): vale só até fechar
  }
}
