/** Quando uma janela de edição (ex.: compositor de frase) está aberta, Ctrl/⌘+Z e Refazer
 * valem pra ela, e não pro projeto que está por trás. */
interface UndoScope {
  undo: () => void
  redo: () => void
}

let current: UndoScope | null = null

export function setUndoScope(scope: UndoScope | null): void {
  current = scope
}

export function getUndoScope(): UndoScope | null {
  return current
}
