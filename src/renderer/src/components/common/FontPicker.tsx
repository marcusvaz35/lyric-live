import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { FONT_OPTIONS } from '../../lib/fonts'
import { getCachedSystemFonts, loadSystemFonts } from '../../lib/systemFonts'

const SAMPLE = 'Deus é fiel'

/** Seletor de fonte: mostra cada opção escrita na própria fonte, com as do programa e todas as
 * instaladas no computador (a lista é relida toda vez que abre, então fonte nova já aparece). */
export function FontPicker({
  value,
  onChange,
  emptyLabel
}: {
  value: string
  onChange: (font: string) => void
  /** Se informado, adiciona a opção vazia (ex.: "Igual ao resto do slide"), com value "". */
  emptyLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [systemFonts, setSystemFonts] = useState<string[]>(getCachedSystemFonts())
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: Event): void => {
      if (listRef.current?.contains(e.target as Node) || buttonRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const closeOnScroll = (e: Event): void => {
      if (listRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const closeOnResize = (): void => setOpen(false)
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', closeOnScroll, true)
    window.addEventListener('resize', closeOnResize)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', closeOnScroll, true)
      window.removeEventListener('resize', closeOnResize)
    }
  }, [open])

  // relê as fontes do computador a cada abertura: instalou uma fonte nova, ela aparece aqui
  useEffect(() => {
    if (!open) return
    setSystemFonts(getCachedSystemFonts())
    setLoading(true)
    let cancelled = false
    loadSystemFonts().then((list) => {
      if (cancelled) return
      setSystemFonts(list)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [open])

  const toggle = (): void => {
    if (!open && buttonRef.current) {
      setRect(buttonRef.current.getBoundingClientRect())
      setQuery('')
    }
    setOpen((v) => !v)
  }

  const pick = (font: string): void => {
    onChange(font)
    setOpen(false)
  }

  const q = query.trim().toLowerCase()
  const bundledLower = useMemo(() => new Set(FONT_OPTIONS.map((f) => f.toLowerCase())), [])
  const bundled = FONT_OPTIONS.filter((f) => f.toLowerCase().includes(q))
  const installed = useMemo(
    () => systemFonts.filter((f) => !bundledLower.has(f.toLowerCase()) && f.toLowerCase().includes(q)),
    [systemFonts, bundledLower, q]
  )

  const current = value || null
  const listHeight = 380
  const openUp = rect ? rect.bottom + listHeight > window.innerHeight && rect.top > listHeight : false

  const row = (font: string): ReactElement => (
    <button
      key={font}
      type="button"
      onClick={() => pick(font)}
      className={`block w-full rounded-md px-3 py-1.5 text-left hover:bg-surface-700 ${
        value === font ? 'bg-accent/20 ring-1 ring-accent' : ''
      }`}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 46px' }}
    >
      <div className="text-[10px] text-neutral-500">{font}</div>
      <div className="truncate text-xl leading-tight text-neutral-100" style={{ fontFamily: `"${font}"` }}>
        {SAMPLE}
      </div>
    </button>
  )

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className="field-input flex w-full items-center justify-between text-left"
        style={current ? { fontFamily: `"${current}"` } : undefined}
      >
        <span className="truncate">{current ?? emptyLabel ?? 'Escolher fonte'}</span>
        <span className="ml-2 text-neutral-500">▾</span>
      </button>
      {open && rect && (
        <div
          ref={listRef}
          className="fixed z-[70] flex flex-col overflow-hidden rounded-lg border border-surface-700 bg-surface-850 shadow-2xl"
          style={{
            left: rect.left,
            width: Math.max(rect.width, 280),
            maxHeight: listHeight,
            ...(openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 })
          }}
        >
          <div className="border-b border-surface-700 p-1.5">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar fonte…"
              className="field-input w-full"
            />
          </div>
          <div className="overflow-y-auto p-1">
            {emptyLabel !== undefined && !q && (
              <button
                type="button"
                onClick={() => pick('')}
                className={`block w-full rounded-md px-3 py-2 text-left text-sm text-neutral-400 hover:bg-surface-700 ${
                  !value ? 'bg-accent/15' : ''
                }`}
              >
                {emptyLabel}
              </button>
            )}
            {bundled.length > 0 && (
              <>
                <div className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  Do programa
                </div>
                {bundled.map(row)}
              </>
            )}
            <div className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Instaladas no computador {loading ? '· atualizando…' : `(${installed.length})`}
            </div>
            {installed.map(row)}
            {!loading && installed.length === 0 && (
              <div className="px-3 py-2 text-xs text-neutral-600">
                {q ? 'Nenhuma fonte encontrada.' : 'Não consegui ler as fontes do computador.'}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
