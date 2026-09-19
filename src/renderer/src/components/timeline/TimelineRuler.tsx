import { useProjectStore } from '../../state/projectStore'

export function TimelineRuler({ pps, duration }: { pps: number; duration: number }) {
  const setPlayhead = useProjectStore((s) => s.setPlayhead)
  const marks = Array.from({ length: Math.floor(duration) + 1 }, (_, i) => i)

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect()
    setPlayhead((e.clientX - rect.left) / pps)
  }

  return (
    <div
      onMouseDown={handleSeek}
      className="relative h-6 cursor-text border-b border-surface-800 bg-surface-850"
      style={{ width: duration * pps }}
    >
      {marks.map((s) => (
        <div
          key={s}
          className="absolute top-0 h-full border-l border-surface-700 pl-1 text-[10px] text-neutral-600"
          style={{ left: s * pps }}
        >
          {s}s
        </div>
      ))}
    </div>
  )
}
