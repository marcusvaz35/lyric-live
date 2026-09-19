import type { Project } from '@shared/types/project'

/**
 * Abstração de armazenamento de projetos. A implementação atual grava um
 * arquivo JSON por projeto (`.churchproj`). Quando o módulo de conteúdo
 * (Bíblia/músicas/mídias) precisar de índices e busca relacional, uma
 * implementação em SQLite pode substituir esta sem tocar em quem a consome.
 */
export interface ProjectRepository {
  save(project: Project, filePath: string): Promise<void>
  /** Abre o diálogo "Salvar como" e grava o projeto no caminho escolhido. */
  saveAs(project: Project): Promise<string | null>
  /** Abre o diálogo "Abrir" e carrega o projeto escolhido. */
  open(): Promise<{ project: Project; filePath: string } | null>
}
