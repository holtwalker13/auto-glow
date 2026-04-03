import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Ban, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  buildCustomerConfirmationMessage,
  parseCalendarBookingLabel,
} from '../lib/adminConfirmationMessage'
import { buildSmsMessagesUrl } from '../lib/smsHref'
import {
  PREFERRED_TIME_OPTIONS,
  labelPreferredTime,
  type PreferredTimeSlot,
} from '../types/request'

type SlotState = { status: string; label?: string }

type Row = {
  date: string
  dateLabel?: string
  row: number
  slots: Record<string, SlotState>
}

const SLOT_KEYS: PreferredTimeSlot[] = ['10:00', '14:00', '16:00']

type SelectedBooking = {
  row: Row
  label: string
  slots: PreferredTimeSlot[]
}

function openBookingSelection(row: Row, slot: PreferredTimeSlot): SelectedBooking | null {
  const cell = row.slots[slot]
  if (cell?.status !== 'booked' || !cell.label?.trim()) return null
  const label = cell.label.trim()
  const slots = SLOT_KEYS.filter(
    (k) => row.slots[k]?.status === 'booked' && row.slots[k]?.label?.trim() === label,
  )
  return { row, label, slots }
}

function slotStyle(s: SlotState | undefined) {
  if (!s || s.status === 'free') return 'bg-white/[0.04] text-slate-500'
  if (s.status === 'block') return 'bg-amber-500/20 text-amber-100 border border-amber-500/40'
  return 'bg-cyan-500/15 text-cyan-100 border border-cyan-500/30'
}

type SlotCellProps = {
  row: Row
  slot: PreferredTimeSlot
  busyKey: string | null
  onOpenBooking: (sel: SelectedBooking) => void
  onSlotAction: (
    date: string,
    slot: PreferredTimeSlot | 'all',
    action: 'blockout' | 'clear',
  ) => void | Promise<void>
  /** Mobile card: tighter single-row layout (time label sits beside this in parent) */
  compact?: boolean
  /** Mobile: horizontal row [slot | block | trash] */
  compactRow?: boolean
}

function SlotCell({
  row: r,
  slot,
  busyKey,
  onOpenBooking,
  onSlotAction,
  compact,
  compactRow,
}: SlotCellProps) {
  const s = r.slots[slot]
  const bookedText = s?.status === 'booked' && s.label ? s.label : null
  const isBooked = s?.status === 'booked' && Boolean(s.label?.trim())
  const isBlock = s?.status === 'block'
  const cellWidth = compact && !compactRow ? 'mx-auto w-[80%] max-w-full' : 'min-w-0 w-full flex-1'
  const cellClass = compact
    ? compactRow
      ? 'min-h-10 px-2 py-1.5 text-xs'
      : 'min-h-[52px] px-3 py-2.5 text-sm'
    : 'px-2 py-2 text-xs'
  const btnRowClass =
    compact && compactRow
      ? 'flex shrink-0 gap-1'
      : compact
        ? 'mt-2 flex w-full gap-2'
        : 'mt-1 flex flex-wrap gap-1'
  const actionBtnClass = compact
    ? 'min-h-10 flex-1 rounded-lg border px-3 text-xs font-medium disabled:opacity-40'
    : 'rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-100 hover:bg-amber-500/20 disabled:opacity-40'

  const iconBtn =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border disabled:opacity-40'

  function slotInner() {
    if (isBlock) {
      return (
        <span className="flex min-h-[1em] items-center justify-center" aria-label="Blocked time">
          <X
            className={compactRow ? 'h-5 w-5 text-amber-100' : compact ? 'h-6 w-6 text-amber-100' : 'h-4 w-4 text-amber-100'}
            strokeWidth={2.5}
          />
        </span>
      )
    }
    if (bookedText) {
      return (
        <span
          className={
            compactRow ? 'line-clamp-2 break-words text-left' : compact ? 'line-clamp-4 break-words text-left' : 'line-clamp-3 break-words'
          }
        >
          {bookedText}
        </span>
      )
    }
    return <span className="text-slate-500">—</span>
  }

  const slotBody =
    isBooked ? (
      <button
        type="button"
        onClick={() => {
          const sel = openBookingSelection(r, slot)
          if (sel) onOpenBooking(sel)
        }}
        className={`min-w-0 rounded-lg text-left transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${cellWidth} ${cellClass} ${slotStyle(s)}`}
        title="View booking details & confirmation message"
      >
        {slotInner()}
      </button>
    ) : (
      <div className={`min-w-0 rounded-lg ${cellWidth} ${cellClass} ${slotStyle(s)}`}>{slotInner()}</div>
    )

  const actionButtons = (
    <>
      <button
        type="button"
        disabled={busyKey !== null}
        onClick={() => void onSlotAction(r.date, slot, 'blockout')}
        className={
          compact && compactRow
            ? `${iconBtn} border-amber-500/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25`
            : compact
              ? `${actionBtnClass} flex items-center justify-center gap-1.5 border-amber-500/40 bg-amber-500/15 text-amber-100`
              : actionBtnClass
        }
        aria-label="Block this slot"
        title="Block"
      >
        {compact && compactRow ? (
          <Ban className="h-4 w-4" strokeWidth={2} aria-hidden />
        ) : (
          <>
            <X className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2.5} aria-hidden />
            Block
          </>
        )}
      </button>
      {compact && compactRow ? (
        <button
          type="button"
          disabled={busyKey !== null}
          onClick={() => void onSlotAction(r.date, slot, 'clear')}
          className={`${iconBtn} border-white/15 text-slate-300 hover:bg-white/5`}
          aria-label="Clear slot"
          title="Clear slot"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      ) : compact ? (
        <button
          type="button"
          disabled={busyKey !== null}
          onClick={() => void onSlotAction(r.date, slot, 'clear')}
          className="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 text-slate-300 hover:bg-white/5 disabled:opacity-40"
          aria-label="Remove block or clear this slot"
          title="Remove block or clear this slot"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          disabled={busyKey !== null}
          onClick={() => void onSlotAction(r.date, slot, 'clear')}
          className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-slate-400 hover:bg-white/5 disabled:opacity-40"
        >
          Clear
        </button>
      )}
    </>
  )

  if (compact && compactRow) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {slotBody}
        <div className={btnRowClass}>{actionButtons}</div>
      </div>
    )
  }

  return (
    <div className={compact ? 'flex flex-col items-stretch' : undefined}>
      {slotBody}
      <div className={btnRowClass}>{actionButtons}</div>
    </div>
  )
}

export function AdminDashboard() {
  const [password, setPassword] = useState('')
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<SelectedBooking | null>(null)
  const [copyHint, setCopyHint] = useState<string | null>(null)
  const [headersBusy, setHeadersBusy] = useState(false)
  const [headersHint, setHeadersHint] = useState<string | null>(null)
  const [backfillBusy, setBackfillBusy] = useState(false)
  const [backfillHint, setBackfillHint] = useState<string | null>(null)
  /** Shown inside booking modal — global `error` sits under the modal and was invisible. */
  const [modalSheetError, setModalSheetError] = useState<string | null>(null)
  const [contactLookup, setContactLookup] = useState<{
    loading: boolean
    data: { phone: string; email: string; name: string } | null
    missing: boolean
    /** Log row matched date + label but Phone/Email columns are blank */
    rowWithoutContact: boolean
  }>({ loading: false, data: null, missing: false, rowWithoutContact: false })

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/schedule', { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 401) {
          setLoggedIn(false)
          return
        }
        throw new Error(data.error || res.statusText)
      }
      setRows(Array.isArray(data.rows) ? data.rows : [])
      setLoggedIn(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch('/api/admin/me', { credentials: 'include' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (r.ok && d.ok) {
          setLoggedIn(true)
          void refresh()
        } else {
          setLoggedIn(false)
        }
      })
      .catch(() => setLoggedIn(false))
  }, [refresh])

  useEffect(() => {
    if (!selectedBooking) return
    setModalSheetError(null)
    setBackfillHint(null)
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedBooking(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedBooking])

  useEffect(() => {
    if (!selectedBooking) {
      setContactLookup({ loading: false, data: null, missing: false, rowWithoutContact: false })
      return
    }
    setContactLookup({ loading: true, data: null, missing: false, rowWithoutContact: false })
    const q = new URLSearchParams({
      date: selectedBooking.row.date,
      label: selectedBooking.label,
    })
    let cancelled = false
    fetch(`/api/admin/booking-contact?${q}`, { credentials: 'include' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (cancelled) return
        if (r.ok && d.matched) {
          const phone = String(d.phone ?? '').trim()
          const email = String(d.email ?? '').trim()
          const name = String(d.name ?? '').trim()
          if (phone || email) {
            setContactLookup({
              loading: false,
              data: { phone, email, name },
              missing: false,
              rowWithoutContact: false,
            })
          } else {
            setContactLookup({
              loading: false,
              data: name ? { phone: '', email: '', name } : null,
              missing: false,
              rowWithoutContact: true,
            })
          }
        } else {
          setContactLookup({ loading: false, data: null, missing: true, rowWithoutContact: false })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setContactLookup({ loading: false, data: null, missing: true, rowWithoutContact: false })
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedBooking])

  const confirmationDraft = useMemo(() => {
    if (!selectedBooking) return null
    return buildCustomerConfirmationMessage({
      calendarLabel: selectedBooking.label,
      datePretty: selectedBooking.row.dateLabel ?? selectedBooking.row.date,
      slots: selectedBooking.slots,
      submittedContactName: contactLookup.data?.name,
    })
  }, [selectedBooking, contactLookup.data?.name])

  const messagesUrl = useMemo(() => {
    if (!confirmationDraft || !contactLookup.data?.phone) return null
    return buildSmsMessagesUrl(contactLookup.data.phone, confirmationDraft)
  }, [confirmationDraft, contactLookup.data?.phone])

  async function login(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Login failed')
      return
    }
    setPassword('')
    setLoggedIn(true)
    void refresh()
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' })
    setLoggedIn(false)
    setRows([])
  }

  async function slotAction(date: string, slot: PreferredTimeSlot | 'all', action: 'blockout' | 'clear') {
    const key = `${date}-${slot}-${action}`
    setBusyKey(key)
    setError(null)
    try {
      const res = await fetch('/api/admin/slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ date, slot, action }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || res.statusText)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusyKey(null)
    }
  }

  async function logCalendarBookingToSheet() {
    if (!selectedBooking) return
    setBackfillBusy(true)
    setBackfillHint(null)
    setModalSheetError(null)
    try {
      const res = await fetch('/api/admin/append-submission-from-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          date: selectedBooking.row.date,
          label: selectedBooking.label,
          slots: selectedBooking.slots,
          phone: contactLookup.data?.phone,
          email: contactLookup.data?.email,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          typeof data.error === 'string'
            ? data.error
            : res.status === 401
              ? 'Not signed in — refresh the page and log in again.'
              : res.statusText
        throw new Error(msg)
      }
      setBackfillHint('Added a row on Submitted Requests (headers written if row 1 was empty).')
      window.setTimeout(() => setBackfillHint(null), 6000)
    } catch (e) {
      setModalSheetError(e instanceof Error ? e.message : 'Could not add row')
    } finally {
      setBackfillBusy(false)
    }
  }

  async function writeSubmissionsHeaders() {
    setHeadersBusy(true)
    setHeadersHint(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/write-submissions-headers', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || res.statusText)
      const tab = typeof data.tab === 'string' ? data.tab : 'Submitted Requests'
      const n = typeof data.columns === 'number' ? data.columns : ''
      setHeadersHint(
        n ? `Wrote header row on “${tab}” (${n} columns). Check your Google Sheet.` : `Wrote header row on “${tab}”.`,
      )
      window.setTimeout(() => setHeadersHint(null), 8000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not write sheet headers')
    } finally {
      setHeadersBusy(false)
    }
  }

  async function copyConfirmationMessage() {
    if (!confirmationDraft) return
    try {
      await navigator.clipboard.writeText(confirmationDraft)
      setCopyHint('Copied to clipboard')
      window.setTimeout(() => setCopyHint(null), 2500)
    } catch {
      setCopyHint('Could not copy — select the text below and copy manually')
      window.setTimeout(() => setCopyHint(null), 4000)
    }
  }

  if (loggedIn === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black text-white">
        <p className="text-slate-400">Loading…</p>
      </div>
    )
  }

  if (!loggedIn) {
    return (
      <div className="min-h-dvh bg-black px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-white sm:py-10">
        <div className="mx-auto max-w-md">
          <Link to="/" className="text-sm text-cyan-400/90 underline-offset-4 hover:underline">
            ← Back to booking
          </Link>
          <h1 className="mt-6 font-display text-2xl font-bold italic text-white">Owner dashboard</h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to view the calendar, block time, or free a slot. Bookings with customer names must be
            cleared in Google Sheets if you need to remove them.
          </p>
          <form onSubmit={login} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-300" htmlFor="admin-pw">
                Password
              </label>
              <input
                id="admin-pw"
                type="password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            <button
              type="submit"
              className="cta-gradient mt-2 w-full min-h-[3rem] rounded-xl text-sm font-semibold sm:min-h-12"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    )
  }

  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="min-h-dvh bg-black px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-white sm:py-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <Link
              to="/"
              className="inline-block text-sm text-cyan-400/90 underline-offset-4 hover:underline"
            >
              ← Booking site
            </Link>
            <h1 className="mt-2 font-display text-lg font-bold italic leading-tight sm:text-xl md:text-2xl">
              Availability & bookings
            </h1>
            <p className="mt-2 max-w-prose text-xs leading-snug text-slate-500 sm:text-sm">
              <span className="hidden sm:inline">
                Cyan = booked · Amber = blockout · Tap a booking for details · Block/Clear under each slot.
              </span>
              <span className="sm:hidden">
                Booked = cyan · Block = amber · Tap booking for message · Use Block/Clear per time.
              </span>
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="min-h-11 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white hover:bg-white/10 disabled:opacity-50 sm:min-h-0 sm:flex-none sm:py-2"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={() => void writeSubmissionsHeaders()}
              disabled={headersBusy}
              title="Writes row 1 on the Submitted Requests tab (full column headers)"
              className="min-h-11 flex-1 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50 sm:min-h-0 sm:flex-none sm:py-2"
            >
              {headersBusy ? 'Writing…' : 'Sheet headers'}
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="min-h-11 flex-1 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 sm:min-h-0 sm:flex-none sm:py-2"
            >
              Log out
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        ) : null}
        {headersHint ? (
          <p className="mt-3 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
            {headersHint}
          </p>
        ) : null}

        <div className="mt-6">
          {/* Mobile: one card per day — no horizontal scroll */}
          <div className="space-y-3 md:hidden">
            {sorted.length === 0 ? (
              <p className="rounded-2xl border border-white/10 px-4 py-10 text-center text-sm text-slate-500">
                No dated rows yet. Bookings add dates automatically, or add a row in Sheets (column A =
                yyyy-mm-dd).
              </p>
            ) : (
              sorted.map((r) => (
                <article
                  key={`${r.date}-${r.row}-mobile`}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
                >
                  <header className="border-b border-white/10 pb-2">
                    <p className="font-display text-sm font-semibold text-white">{r.dateLabel ?? r.date}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-600">
                      {r.date} · row {r.row}
                    </p>
                  </header>
                  <div className="mt-2 space-y-1.5">
                    {SLOT_KEYS.map((slot) => (
                      <div key={slot} className="flex min-w-0 items-center gap-2">
                        <span className="w-10 shrink-0 whitespace-nowrap text-right text-[10px] font-medium text-slate-500">
                          {labelPreferredTime(slot)}
                        </span>
                        <SlotCell
                          row={r}
                          slot={slot}
                          busyKey={busyKey}
                          onOpenBooking={setSelectedBooking}
                          onSlotAction={slotAction}
                          compact
                          compactRow
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-1.5 border-t border-white/10 pt-2">
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      onClick={() => void slotAction(r.date, 'all', 'blockout')}
                      className="min-h-10 flex-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 text-xs font-medium text-amber-100 hover:bg-amber-500/25 disabled:opacity-40"
                    >
                      Block all day
                    </button>
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      onClick={() => void slotAction(r.date, 'all', 'clear')}
                      aria-label="Clear this day — remove all blocks (booked slots stay until edited in Sheets)"
                      title="Remove all blockouts for this day"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 text-slate-400 hover:bg-white/5 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          {/* md+: wide table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-white/10 md:block">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <th className="px-3 py-3 font-display text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Date
                  </th>
                  {PREFERRED_TIME_OPTIONS.map(({ value, label }) => (
                    <th
                      key={value}
                      className="px-2 py-3 font-display text-xs font-semibold uppercase tracking-wider text-slate-400"
                    >
                      {label}
                    </th>
                  ))}
                  <th className="px-2 py-3 font-display text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Day
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      No dated rows yet. Bookings append dates automatically, or add a row in Sheets (column A
                      = yyyy-mm-dd).
                    </td>
                  </tr>
                ) : (
                  sorted.map((r) => (
                    <tr key={`${r.date}-${r.row}`} className="border-b border-white/5">
                      <td className="px-3 py-2 text-xs text-slate-300">
                        <span className="font-medium text-white">{r.dateLabel ?? r.date}</span>
                        <span className="ml-2 font-mono text-[10px] text-slate-600">row {r.row}</span>
                      </td>
                      {SLOT_KEYS.map((slot) => (
                        <td key={slot} className="px-1 py-1 align-top">
                          <SlotCell
                            row={r}
                            slot={slot}
                            busyKey={busyKey}
                            onOpenBooking={setSelectedBooking}
                            onSlotAction={slotAction}
                          />
                        </td>
                      ))}
                      <td className="px-1 py-1 align-top">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            disabled={busyKey !== null}
                            onClick={() => void slotAction(r.date, 'all', 'blockout')}
                            className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-1.5 text-[10px] font-medium text-amber-100 hover:bg-amber-500/25 disabled:opacity-40"
                          >
                            Block all day
                          </button>
                          <button
                            type="button"
                            disabled={busyKey !== null}
                            onClick={() => void slotAction(r.date, 'all', 'clear')}
                            aria-label="Clear day (remove blockouts only; booked slots stay)"
                            title="Clear day"
                            className="flex min-h-9 items-center justify-center rounded-lg border border-white/10 px-2 py-1.5 text-slate-400 hover:bg-white/5 disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-slate-600 sm:text-sm">
          <span className="hidden sm:inline">Legend: </span>
          {SLOT_KEYS.map((k) => `${labelPreferredTime(k)}`).join(' · ')}. “Clear” only removes empty or
          blockout cells; booked slots stay until edited in Sheets. New bookings are logged to the Submitted
          Requests tab. Open a cyan booking → <strong className="text-slate-500">Log to Submitted Requests</strong>{' '}
          copies that calendar row into the log (e.g. Holt Walker). <strong className="text-slate-500">Sheet headers</strong>{' '}
          writes row 1 if needed.
        </p>

        {selectedBooking && confirmationDraft ? (
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/80"
            role="presentation"
            onClick={() => setSelectedBooking(null)}
          >
            <div className="flex min-h-[100dvh] min-h-screen items-center justify-center p-3 py-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 sm:py-6">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="booking-modal-title"
                className="my-auto w-full max-w-lg max-h-[min(88dvh,calc(100dvh-2rem))] overflow-y-auto overscroll-contain rounded-2xl border border-cyan-500/20 bg-zinc-950 p-4 shadow-2xl shadow-cyan-950/40 sm:max-h-[min(90vh,720px)] sm:p-5"
                onClick={(e) => e.stopPropagation()}
              >
              <div className="flex items-start justify-between gap-2">
                <h2
                  id="booking-modal-title"
                  className="font-display text-base font-bold italic text-white sm:text-lg"
                >
                  Booking details
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              <dl className="mt-3 space-y-2 text-xs sm:mt-4 sm:space-y-3 sm:text-sm">
                <div>
                  <dt className="font-medium uppercase tracking-wider text-slate-500">Date</dt>
                  <dd className="mt-0.5 text-slate-200">
                    {selectedBooking.row.dateLabel ?? selectedBooking.row.date}
                    <span className="ml-2 font-mono text-xs text-slate-600">{selectedBooking.row.date}</span>
                  </dd>
                </div>
                <div>
                  <dt className="font-medium uppercase tracking-wider text-slate-500">Time</dt>
                  <dd className="mt-0.5 text-slate-200">
                    {selectedBooking.slots.length >= 3
                      ? 'Full day (all slots)'
                      : selectedBooking.slots.map((k) => labelPreferredTime(k)).join(' · ')}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium uppercase tracking-wider text-slate-500">Phone</dt>
                  <dd className="mt-0.5 text-slate-200">
                    {contactLookup.loading ? (
                      <span className="text-slate-500">Loading from submissions…</span>
                    ) : contactLookup.data?.phone ? (
                      <a
                        href={`tel:${contactLookup.data.phone.replace(/\s/g, '')}`}
                        className="text-cyan-300 underline-offset-2 hover:underline"
                      >
                        {contactLookup.data.phone}
                      </a>
                    ) : contactLookup.rowWithoutContact ? (
                      <span className="text-amber-200/90">
                        Submitted Requests row exists for this booking, but column D (Phone) is empty. Add your
                        number there or in the site form next time — the Booking Calendar cell only holds the
                        short note (name/vehicle), not phone.
                      </span>
                    ) : contactLookup.missing ? (
                      <span className="text-amber-200/90">
                        No matching Submitted Requests row yet (date + calendar note must match that sheet).
                        Use &quot;Log to Submitted Requests&quot; below or book on the site. Typing a phone
                        number only on the calendar tab does not store it for this lookup.
                      </span>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                {contactLookup.data?.email ? (
                  <div>
                    <dt className="font-medium uppercase tracking-wider text-slate-500">Email</dt>
                    <dd className="mt-0.5">
                      <a
                        href={`mailto:${contactLookup.data.email}`}
                        className="break-all text-cyan-300 underline-offset-2 hover:underline"
                      >
                        {contactLookup.data.email}
                      </a>
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="font-medium uppercase tracking-wider text-slate-500">Calendar note</dt>
                  <dd className="mt-0.5 break-words text-slate-300">{selectedBooking.label}</dd>
                  <p className="mt-2 text-[11px] leading-snug text-slate-500">
                    Column titles for the log live in <span className="text-slate-400">server/index.mjs</span>{' '}
                    (<code className="rounded bg-white/5 px-1 text-[10px] text-slate-400">SUBMISSION_HEADERS</code>
                    ). Row 1 of the sheet is filled when you use the buttons below or on new site bookings.
                  </p>
                </div>
                {(() => {
                  const { name, detail } = parseCalendarBookingLabel(selectedBooking.label)
                  if (!name && !detail) return null
                  return (
                    <div>
                      <dt className="font-medium uppercase tracking-wider text-slate-500">
                        Parsed from note
                      </dt>
                      <dd className="mt-0.5 text-slate-300">
                        {name ? <span className="font-medium text-white">{name}</span> : null}
                        {name && detail ? <span className="text-slate-500"> · </span> : null}
                        {detail ? <span>{detail}</span> : null}
                      </dd>
                    </div>
                  )
                })()}
              </dl>

              <div className="mt-4 sm:mt-6">
                <p className="text-xs font-medium uppercase tracking-wider text-cyan-200/80">
                  Message for your customer
                </p>
                <p className="mt-1 text-[11px] leading-snug text-slate-500 sm:text-xs">
                  Confirms their date and thanks them for Jackson Auto Glow. On iPhone or Mac, Open in
                  Messages drafts an SMS to their saved number.
                </p>
                <textarea
                  readOnly
                  value={confirmationDraft}
                  rows={8}
                  className="mt-2 max-h-[40vh] w-full resize-y rounded-xl border border-white/10 bg-black/40 px-2.5 py-2 font-sans text-base leading-snug text-slate-200 outline-none focus:border-cyan-500/40 sm:max-h-none sm:px-3 sm:py-2.5 sm:text-sm sm:leading-relaxed"
                />
                {copyHint ? (
                  <p className="mt-2 text-xs text-cyan-300/90">{copyHint}</p>
                ) : null}
                {modalSheetError ? (
                  <p
                    role="alert"
                    className="mt-2 rounded-lg border border-red-500/35 bg-red-500/10 px-2.5 py-2 text-xs leading-snug text-red-100"
                  >
                    {modalSheetError}
                  </p>
                ) : null}
                {backfillHint ? (
                  <p className="mt-2 text-xs text-emerald-300/90">{backfillHint}</p>
                ) : null}
                <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:flex-wrap sm:items-stretch">
                  <button
                    type="button"
                    disabled={backfillBusy}
                    onClick={() => void logCalendarBookingToSheet()}
                    className="min-h-11 w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/15 disabled:opacity-50 sm:order-first sm:w-auto sm:flex-1"
                  >
                    {backfillBusy ? 'Writing row…' : 'Log to Submitted Requests'}
                  </button>
                  {messagesUrl ? (
                    <a
                      href={messagesUrl}
                      className="cta-gradient flex min-h-11 w-full items-center justify-center rounded-xl px-3 text-center text-sm font-semibold sm:min-h-11 sm:flex-1"
                    >
                      Open in Messages
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void copyConfirmationMessage()}
                    className={`min-h-11 w-full rounded-xl border px-3 text-sm font-semibold sm:w-auto sm:flex-1 ${
                      messagesUrl
                        ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15'
                        : 'cta-gradient border-transparent'
                    }`}
                  >
                    Copy message
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBooking(null)}
                    className="min-h-11 w-full rounded-xl border border-white/15 px-3 text-sm text-slate-300 hover:bg-white/5 sm:w-auto"
                  >
                    Close
                  </button>
                </div>
              </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
