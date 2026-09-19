import type { QuickLocateState } from '../../lib/bibleSearch'

export function QuickLocatePopup({
  state,
  onCancel
}: {
  state: QuickLocateState
  onCancel: () => void
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div
        className="relative w-72 rounded-xl border border-surface-700 bg-surface-850 p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="absolute right-3 top-3 text-[10px] text-neutral-500">Esc para cancelar</span>

        <div className="mb-4">
          <div className="field-label mb-1">Livro</div>
          <div className="text-xl font-semibold text-neutral-100">
            {state.book ? state.book.name : state.raw.match(/^\D*/)?.[0] || ' '}
          </div>
        </div>

        <div className="mb-4">
          <div className="field-label mb-1">Capítulo</div>
          <div className="text-xl font-semibold text-neutral-100">
            {state.chapter ?? ' '}
          </div>
        </div>

        <div>
          <div className="field-label mb-1">Versículo</div>
          <div className="text-xl font-semibold text-neutral-100">
            {state.verseRaw !== null ? `${state.verseRaw}_` : ' '}
          </div>
          {state.verseCount !== null && (
            <div className="mt-1 text-[11px] text-neutral-500">Versículos: {state.verseCount}</div>
          )}
        </div>
      </div>
    </div>
  )
}
