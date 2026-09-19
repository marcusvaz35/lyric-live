import { useEffect } from 'react'
import { useProjectStore } from './projectStore'

/** Manda a cena atual + playhead pra janela LIVE sempre que mudar. Sem custo se
 * a janela LIVE estiver fechada — o processo principal só ignora o envio. */
export function useLiveBroadcast(): void {
  const scene = useProjectStore((s) => s.currentScene())
  const playhead = useProjectStore((s) => s.playhead)

  useEffect(() => {
    window.api?.live.pushState({ scene, playhead })
  }, [scene, playhead])
}
