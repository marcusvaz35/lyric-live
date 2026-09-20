/** URL (protocolo lyricmedia, servido pelo processo principal) de um arquivo da pasta de mídia. */
export function mediaUrl(filePath: string): string {
  const name = filePath.split(/[/\\]/).pop() ?? filePath
  return `lyricmedia://media/${encodeURIComponent(name)}`
}
