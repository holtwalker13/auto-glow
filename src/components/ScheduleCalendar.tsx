import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

export type CalendarDayInfo = {
  date: string
  slots: Record<string, { status: string }>
  bookableStandard: boolean
  bookableCeramic: boolean
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function monthKeyFromIso(iso: string) {
  return iso.slice(0, 7)
}

function monthBounds(yymm: string): { from: string; to: string } {
  const [ys, ms] = yymm.split('-')
  const y = Number(ys)
  const m = Number(ms)
  const from = `${y}-${pad2(m)}-01`
  const last = new Date(y, m, 0).getDate()
  const to = `${y}-${pad2(m)}-${pad2(last)}`
  return { from, to }
}

function clampRange(from: string, to: string, min: string, max: string) {
  const a = from < min ? min : from
  const b = to > max ? max : to
  if (a > b) return null
  return { from: a, to: b }
}

export function ScheduleCalendar({
  minDate,
  maxDate,
  selectedDate,
  hasCeramic,
  onSelectDay,
}: {
  minDate: string
  maxDate: string
  selectedDate: string
  hasCeramic: boolean
  onSelectDay: (date: string, slots: CalendarDayInfo['slots']) => void
}) {
  const initialMonth = useMemo(
    () => monthKeyFromIso(selectedDate || minDate),
    [selectedDate, minDate],
  )
  const [viewMonth, setViewMonth] = useState(initialMonth)
  const [days, setDays] = useState<CalendarDayInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setViewMonth(monthKeyFromIso(selectedDate || minDate))
  }, [selectedDate, minDate])

  const { from: monthFrom, to: monthTo } = useMemo(() => monthBounds(viewMonth), [viewMonth])
  const fetchRange = useMemo(() => clampRange(monthFrom, monthTo, minDate, maxDate), [monthFrom, monthTo, minDate, maxDate])

  const loadMonth = useCallback(async () => {
    if (!fetchRange) {
      setDays([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const u = `/api/calendar?from=${encodeURIComponent(fetchRange.from)}&to=${encodeURIComponent(fetchRange.to)}`
      const r = await fetch(u, { credentials: 'omit' })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Could not load calendar')
      setDays(Array.isArray(data.days) ? data.days : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Calendar error')
      setDays([])
    } finally {
      setLoading(false)
    }
  }, [fetchRange])

  useEffect(() => {
    void loadMonth()
  }, [loadMonth, hasCeramic])

  const dayMap = useMemo(() => new Map(days.map((d) => [d.date, d])), [days])

  const minMonth = monthKeyFromIso(minDate)
  const maxMonth = monthKeyFromIso(maxDate)
  const canPrev = viewMonth > minMonth
  const canNext = viewMonth < maxMonth

  const [vy, vm] = viewMonth.split('-').map(Number)
  const firstWeekday = new Date(vy, vm - 1, 1).getDay()
  const daysInMonth = new Date(vy, vm, 0).getDate()

  const title = new Date(vy, vm - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  function goPrev() {
    if (!canPrev) return
    const d = new Date(vy, vm - 2, 1)
    setViewMonth(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`)
  }

  function goNext() {
    if (!canNext) return
    const d = new Date(vy, vm, 1)
    setViewMonth(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`)
  }

  const cells: { iso: string | null; inMonth: boolean }[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push({ iso: null, inMonth: false })
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ iso: `${vy}-${pad2(vm)}-${pad2(d)}`, inMonth: true })
  }
  while (cells.length % 7 !== 0) cells.push({ iso: null, inMonth: false })

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={!canPrev}
          className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="font-display text-base font-semibold italic text-white">{title}</h3>
        <button
          type="button"
          onClick={goNext}
          disabled={!canNext}
          className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <p className="mb-2 text-xs leading-relaxed text-slate-500">
        {hasCeramic
          ? 'Ceramic uses the full day — only days with all three slots open are selectable.'
          : 'Blue = at least one time slot is open. Dimmed days are fully booked or blocked.'}
      </p>

      {error ? (
        <p className="mb-2 text-xs text-red-300">{error}</p>
      ) : null}

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wider text-slate-500 sm:text-xs">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell.iso) {
            return <div key={`e-${idx}`} className="aspect-square min-h-[2.25rem] sm:min-h-[2.5rem]" />
          }
          const iso = cell.iso
          const beforeMin = iso < minDate
          const afterMax = iso > maxDate
          const info = dayMap.get(iso)
          const bookable = info
            ? hasCeramic
              ? info.bookableCeramic
              : info.bookableStandard
            : false
          const disabled = beforeMin || afterMax || loading || !bookable
          const selected = selectedDate === iso
          const showBlue = bookable && !beforeMin && !afterMax

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (!info || disabled) return
                onSelectDay(iso, info.slots)
              }}
              className={`flex aspect-square min-h-[2.25rem] items-center justify-center rounded-lg text-xs font-medium transition sm:min-h-[2.5rem] sm:text-sm ${
                selected
                  ? 'bg-gradient-to-br from-cyan-400/30 to-blue-600/30 text-white ring-2 ring-cyan-400/70'
                  : showBlue
                    ? 'border border-cyan-500/40 bg-cyan-500/15 text-cyan-50 hover:bg-cyan-500/25'
                    : beforeMin || afterMax
                      ? 'cursor-default text-slate-700'
                      : 'cursor-not-allowed bg-white/[0.02] text-slate-600 opacity-45'
              }`}
            >
              {Number(iso.slice(8, 10))}
            </button>
          )
        })}
      </div>

      {loading ? <p className="mt-2 text-center text-xs text-slate-500">Loading availability…</p> : null}
    </div>
  )
}
