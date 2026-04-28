import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Ban,
  CalendarClock,
  CarFront,
  Clock3,
  FileText,
  LayoutGrid,
  LayoutList,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  buildCustomerConfirmationMessage,
  parseCalendarBookingLabel,
} from '../lib/adminConfirmationMessage'
import { buildSmsMessagesUrl } from '../lib/smsHref'
import { getAddonById, getPackageById, premiumUpsells, resolvePackagePrice } from '../data/services'
import {
  PREFERRED_TIME_OPTIONS,
  labelPreferredTime,
  vehicleTypeFromSheetLabel,
  type PreferredTimeSlot,
} from '../types/request'

type QueuePendingItem = {
  sheetRow: number
  clientReferenceId: string
  submittedAt: string
  name: string
  phone: string
  email: string
  preferredDate: string
  timeSummary: string
  fullDayCeramic: string
  packageId: string
  packageLabel: string
  packagePrice?: number | null
  addonsLineTotal?: number
  vehicleDescription: string
  vehicleTypeLabel: string
  selectedAddonIds: string[]
  locationMode: string
  address: string
  parkingNotes: string
  contactNotes: string
  grandTotal: number | null | undefined
}

type SlotState = { status: string; label?: string }

type Row = {
  date: string
  dateLabel?: string
  row: number
  slots: Record<string, SlotState>
}

type PremiumImageState = {
  byAddon: Record<string, string[]>
  maxPerAddon: number
}

const PREMIUM_IMAGE_OPTIONS = premiumUpsells.map((u) => ({
  addonId: u.addonId,
  title: u.title,
  fallbackImage: u.image,
}))

const SLOT_KEYS: PreferredTimeSlot[] = ['10:00', '14:00', '16:00']

function queuePackageDisplayName(q: QueuePendingItem): string {
  const fromApi = (q.packageLabel || '').trim()
  if (fromApi) return fromApi
  return getPackageById(q.packageId)?.name || q.packageId || '—'
}

function queueResolvedPackagePrice(q: QueuePendingItem): number | null {
  if (q.packagePrice != null && Number.isFinite(q.packagePrice)) return q.packagePrice
  const vt = vehicleTypeFromSheetLabel(q.vehicleTypeLabel)
  return resolvePackagePrice(q.packageId, vt)
}

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

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Sunday–Saturday week containing `d` (local). */
function startOfWeekSunday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0)
  x.setDate(x.getDate() - x.getDay())
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0)
  x.setDate(x.getDate() + n)
  return x
}

function buildWeekDates(weekStart: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => formatLocalYmd(addDays(weekStart, i)))
}

function slotStyle(s: SlotState | undefined) {
  if (!s || s.status === 'free') return 'bg-white/[0.04] text-slate-500'
  if (s.status === 'block')
    return 'bg-amber-950/40 text-amber-200/70 border border-amber-800/30'
  return 'bg-cyan-500/15 text-cyan-100 border border-cyan-500/30'
}

function AdminCalendarGridSlot({
  row,
  slot,
  busyKey,
  onOpenBooking,
  onSlotAction,
}: {
  row: Row | undefined
  slot: PreferredTimeSlot
  busyKey: string | null
  onOpenBooking: (sel: SelectedBooking) => void
  onSlotAction: (date: string, slot: PreferredTimeSlot | 'all', action: 'blockout' | 'clear') => void | Promise<void>
}) {
  if (!row) {
    return (
      <div className="flex min-h-[4.5rem] flex-col rounded-md border border-dashed border-white/10 bg-black/25 p-1">
        <span className="text-[9px] font-medium text-slate-600">{labelPreferredTime(slot)}</span>
        <span className="flex flex-1 items-center justify-center text-[10px] text-slate-600">—</span>
      </div>
    )
  }

  const s = row.slots[slot]
  const bookedText = s?.status === 'booked' && s.label ? s.label : null
  const isBooked = s?.status === 'booked' && Boolean(s.label?.trim())
  const isBlock = s?.status === 'block'

  const iconBtn =
    'flex h-6 w-6 shrink-0 items-center justify-center rounded border disabled:opacity-40 border-white/10 text-slate-400 hover:bg-white/5'

  function inner() {
    if (isBlock) {
      return (
        <span className="flex min-h-[2.25rem] items-center justify-center" aria-label="Blocked">
          <X className="h-4 w-4 text-amber-200/75" strokeWidth={2.5} />
        </span>
      )
    }
    if (bookedText) {
      return (
        <span className="line-clamp-3 break-words text-left text-[10px] leading-snug text-cyan-50 max-[749px]:line-clamp-1 max-[749px]:text-[8px] max-[749px]:leading-none max-[749px]:text-center">
          {bookedText}
        </span>
      )
    }
    return <span className="text-[10px] text-slate-600 max-[749px]:text-[8px]">—</span>
  }

  const body = isBooked ? (
    <button
      type="button"
      onClick={() => {
        const sel = openBookingSelection(row, slot)
        if (sel) onOpenBooking(sel)
      }}
      className={`min-h-[2.75rem] w-full rounded-md px-1 py-0.5 text-left transition hover:brightness-110 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/60 max-[749px]:min-h-[1.2rem] max-[749px]:px-0 max-[749px]:py-0 ${slotStyle(s)}`}
      title="Booking details"
    >
      {inner()}
    </button>
  ) : (
    <div className={`min-h-[2.75rem] w-full rounded-md px-1 py-0.5 max-[749px]:min-h-[1.2rem] max-[749px]:px-0 max-[749px]:py-0 ${slotStyle(s)}`}>{inner()}</div>
  )

  return (
    <div className="flex min-h-[4.75rem] flex-col gap-0.5 rounded-md border border-white/10 bg-white/[0.02] p-1 max-[749px]:min-h-[2.25rem] max-[749px]:p-0.5">
      <div className="flex items-center justify-between gap-0.5 max-[749px]:justify-center">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 max-[749px]:hidden">
          {labelPreferredTime(slot)}
        </span>
        <div className="flex shrink-0 gap-0.5 max-[749px]:hidden">
          <button
            type="button"
            disabled={busyKey !== null}
            onClick={() => void onSlotAction(row.date, slot, 'blockout')}
            className={`${iconBtn} border-amber-800/40 bg-amber-950/35 text-amber-200/80 hover:bg-amber-950/50`}
            aria-label="Block slot"
            title="Block"
          >
            <Ban className="h-3 w-3" strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            disabled={busyKey !== null}
            onClick={() => void onSlotAction(row.date, slot, 'clear')}
            className={iconBtn}
            aria-label="Clear slot"
            title="Clear"
          >
            <Trash2 className="h-3 w-3" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 max-[749px]:flex max-[749px]:items-center max-[749px]:justify-center">
        {body}
      </div>
    </div>
  )
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
    : 'rounded-md border border-amber-800/35 bg-amber-950/30 px-2 py-0.5 text-[10px] text-amber-200/75 hover:bg-amber-950/45 disabled:opacity-40'

  const iconBtn =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border disabled:opacity-40'

  function slotInner() {
    if (isBlock) {
      return (
        <span className="flex min-h-[1em] items-center justify-center" aria-label="Blocked time">
          <X
            className={compactRow ? 'h-5 w-5 text-amber-200/75' : compact ? 'h-6 w-6 text-amber-200/75' : 'h-4 w-4 text-amber-200/75'}
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
            ? `${iconBtn} border-amber-800/40 bg-amber-950/35 text-amber-200/80 hover:bg-amber-950/50`
            : compact
              ? `${actionBtnClass} flex items-center justify-center gap-1.5 border-amber-800/40 bg-amber-950/35 text-amber-200/80`
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
  const [headersBusy, setHeadersBusy] = useState(false)
  const [headersHint, setHeadersHint] = useState<string | null>(null)
  /** Shown inside booking modal — global `error` sits under the modal and was invisible. */
  const [modalSheetError, setModalSheetError] = useState<string | null>(null)
  const [contactLookup, setContactLookup] = useState<{
    loading: boolean
    data: { phone: string; email: string; name: string } | null
    missing: boolean
    /** Log row matched date + label but Phone/Email columns are blank */
    rowWithoutContact: boolean
  }>({ loading: false, data: null, missing: false, rowWithoutContact: false })
  const [queuePending, setQueuePending] = useState<QueuePendingItem[]>([])
  const [queueError, setQueueError] = useState<string | null>(null)
  const [selectedQueueItem, setSelectedQueueItem] = useState<QueuePendingItem | null>(null)
  const [queueModalError, setQueueModalError] = useState<string | null>(null)
  const [queueBusy, setQueueBusy] = useState<string | null>(null)
  const [premiumImages, setPremiumImages] = useState<PremiumImageState>({ byAddon: {}, maxPerAddon: 5 })
  const [premiumImagesBusy, setPremiumImagesBusy] = useState<string | null>(null)
  const [premiumImagesError, setPremiumImagesError] = useState<string | null>(null)
  const [calendarView, setCalendarView] = useState<'list' | 'grid'>('list')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    setQueueError(null)
    try {
      const schedRes = await fetch('/api/admin/schedule', { credentials: 'include' })
      const data = await schedRes.json().catch(() => ({}))
      if (!schedRes.ok) {
        if (schedRes.status === 401) {
          setLoggedIn(false)
          setQueuePending([])
          return
        }
        throw new Error(data.error || schedRes.statusText)
      }
      setRows(Array.isArray(data.rows) ? data.rows : [])

      if (typeof data.requestQueueError === 'string' && data.requestQueueError.trim()) {
        setQueueError(data.requestQueueError.trim())
        setQueuePending([])
      } else if (Array.isArray(data.requestQueuePending)) {
        setQueuePending(data.requestQueuePending as QueuePendingItem[])
        setQueueError(null)
      } else {
        const queueRes = await fetch('/api/admin/queue', { credentials: 'include' })
        const qd = await queueRes.json().catch(() => ({}))
        if (!queueRes.ok) {
          if (queueRes.status === 401) {
            setLoggedIn(false)
            setQueuePending([])
            return
          }
          setQueueError(String(qd.error || `Could not load request queue (${queueRes.status})`))
          setQueuePending([])
        } else if (!Array.isArray(qd.pending)) {
          setQueueError('Unexpected response from request queue.')
          setQueuePending([])
        } else {
          setQueuePending(qd.pending as QueuePendingItem[])
          setQueueError(null)
        }
      }
      setLoggedIn(true)
      try {
        const imgRes = await fetch('/api/premium-upgrade-images', { credentials: 'include' })
        const imgData = await imgRes.json().catch(() => ({}))
        if (imgRes.ok) {
          setPremiumImages({
            byAddon: imgData.byAddon && typeof imgData.byAddon === 'object' ? imgData.byAddon : {},
            maxPerAddon: typeof imgData.maxPerAddon === 'number' ? imgData.maxPerAddon : 5,
          })
          setPremiumImagesError(null)
        }
      } catch {
        /* ignore image panel fetch failures */
      }
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
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedBooking(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedBooking])

  useEffect(() => {
    if (!selectedQueueItem) return
    setQueueModalError(null)
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedQueueItem(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedQueueItem])

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
    setQueuePending([])
    setQueueError(null)
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

  async function clearBookingForSelection(sel: SelectedBooking) {
    const key = `clear_booking-${sel.row.date}-${sel.slots.join(',')}`
    setBusyKey(key)
    setModalSheetError(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          date: sel.row.date,
          action: 'clear_booking',
          slots: sel.slots,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || res.statusText)
      setSelectedBooking(null)
      await refresh()
    } catch (e) {
      setModalSheetError(e instanceof Error ? e.message : 'Could not remove booking')
    } finally {
      setBusyKey(null)
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

  const queueSmsUrl = useMemo(() => {
    if (!selectedQueueItem?.phone) return null
    const body = `Hi ${selectedQueueItem.name || 'there'}, this is Jackson Auto Glow regarding your detail request for ${selectedQueueItem.preferredDate}. `
    return buildSmsMessagesUrl(selectedQueueItem.phone, body)
  }, [selectedQueueItem])

  async function acceptQueueRequest(item: QueuePendingItem) {
    const key = `accept-${item.clientReferenceId}`
    setQueueBusy(key)
    setQueueModalError(null)
    try {
      const res = await fetch('/api/admin/request-queue/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ clientReferenceId: item.clientReferenceId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || res.statusText)
      setSelectedQueueItem(null)
      await refresh()
    } catch (e) {
      setQueueModalError(e instanceof Error ? e.message : 'Accept failed')
    } finally {
      setQueueBusy(null)
    }
  }

  async function declineQueueRequest(item: QueuePendingItem) {
    const key = `decline-${item.clientReferenceId}`
    setQueueBusy(key)
    setQueueModalError(null)
    try {
      const res = await fetch('/api/admin/request-queue/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ clientReferenceId: item.clientReferenceId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || res.statusText)
      setSelectedQueueItem(null)
      await refresh()
    } catch (e) {
      setQueueModalError(e instanceof Error ? e.message : 'Decline failed')
    } finally {
      setQueueBusy(null)
    }
  }

  async function uploadPremiumImage(addonId: string, file: File) {
    const key = `upload-${addonId}`
    setPremiumImagesBusy(key)
    setPremiumImagesError(null)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('Could not read image'))
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/admin/premium-upgrade-images/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ addonId, dataUrl }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setPremiumImages({
        byAddon: data.byAddon && typeof data.byAddon === 'object' ? data.byAddon : {},
        maxPerAddon: typeof data.maxPerAddon === 'number' ? data.maxPerAddon : 5,
      })
    } catch (e) {
      setPremiumImagesError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setPremiumImagesBusy(null)
    }
  }

  async function deletePremiumImage(addonId: string, url: string) {
    const key = `delete-${addonId}-${url}`
    setPremiumImagesBusy(key)
    setPremiumImagesError(null)
    try {
      const res = await fetch('/api/admin/premium-upgrade-images/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ addonId, url }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      setPremiumImages({
        byAddon: data.byAddon && typeof data.byAddon === 'object' ? data.byAddon : {},
        maxPerAddon: typeof data.maxPerAddon === 'number' ? data.maxPerAddon : 5,
      })
    } catch (e) {
      setPremiumImagesError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setPremiumImagesBusy(null)
    }
  }

  const sorted = useMemo(() => [...rows].sort((a, b) => a.date.localeCompare(b.date)), [rows])

  const rowByDate = useMemo(() => {
    const m = new Map<string, Row>()
    for (const r of sorted) {
      if (!m.has(r.date)) m.set(r.date, r)
    }
    return m
  }, [sorted])

  const gridWeeks = useMemo(() => {
    const todayWeek = startOfWeekSunday(new Date())
    const firstDate = sorted[0]?.date
    const lastDate = sorted[sorted.length - 1]?.date
    const firstWeek = firstDate
      ? startOfWeekSunday(new Date(`${firstDate}T12:00:00`))
      : todayWeek
    const lastWeek = lastDate ? startOfWeekSunday(new Date(`${lastDate}T12:00:00`)) : todayWeek
    const start = firstWeek <= todayWeek ? firstWeek : todayWeek
    const end = lastWeek >= todayWeek ? lastWeek : todayWeek
    const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })

    const weeks: Array<{ weekStart: Date; dates: string[]; monthLabel: string | null }> = []
    let cursor = start
    let prevMonth = -1
    while (cursor <= end) {
      const month = cursor.getMonth()
      const monthLabel = month !== prevMonth ? monthFmt.format(cursor) : null
      weeks.push({
        weekStart: new Date(cursor),
        dates: buildWeekDates(cursor),
        monthLabel,
      })
      prevMonth = month
      cursor = addDays(cursor, 7)
    }
    return weeks
  }, [sorted])

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
              Manage availability and customer requests.
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

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <h2 className="font-display text-base font-bold italic text-slate-100 sm:text-lg">
            Requests queue
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-sm">
            Review and accept or decline incoming booking requests.
          </p>
          {queueError ? (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100"
            >
              {queueError}
            </p>
          ) : null}
          {!queueError && queuePending.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No pending requests.</p>
          ) : !queueError ? (
            <ul className="mt-4 space-y-2">
              {queuePending.map((q) => (
                <li key={q.clientReferenceId}>
                  <button
                    type="button"
                    onClick={() => {
                      setQueueModalError(null)
                      setSelectedQueueItem(q)
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-left transition hover:border-cyan-500/25 hover:bg-black/50 sm:px-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{q.name || 'Customer'}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        <span className="font-mono text-slate-500">{q.preferredDate}</span>
                        <span className="mx-1.5 text-slate-600">·</span>
                        {q.fullDayCeramic?.toLowerCase() === 'yes'
                          ? 'Full day (ceramic)'
                          : q.timeSummary || 'Time TBD'}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {queuePackageDisplayName(q)}
                        {(() => {
                          const p = queueResolvedPackagePrice(q)
                          return p != null ? ` · $${p}` : ''
                        })()}
                        {q.selectedAddonIds.length > 0
                          ? ` · +${q.selectedAddonIds.length} add-on${q.selectedAddonIds.length === 1 ? '' : 's'}`
                          : ''}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-cyan-950/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200/85">
                      Pending
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <h2 className="font-display text-base font-bold italic text-slate-100 sm:text-lg">
            Premium Upgrade Images
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-sm">
            Upload up to {premiumImages.maxPerAddon} images for each premium upgrade. New uploads replace
            the oldest once full.
          </p>
          {premiumImagesError ? (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100"
            >
              {premiumImagesError}
            </p>
          ) : null}
          <div className="mt-4 space-y-4">
            {PREMIUM_IMAGE_OPTIONS.map((opt) => {
              const urls = premiumImages.byAddon[opt.addonId] ?? []
              const busyForAddon = premiumImagesBusy?.includes(opt.addonId) ?? false
              return (
                <article key={opt.addonId} className="rounded-xl border border-white/10 bg-black/25 p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{opt.title}</p>
                      <p className="text-xs text-slate-500">{opt.addonId}</p>
                    </div>
                    <label className="cursor-pointer rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20">
                      {busyForAddon ? 'Uploading…' : 'Add image'}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        disabled={Boolean(premiumImagesBusy)}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) void uploadPremiumImage(opt.addonId, file)
                          e.currentTarget.value = ''
                        }}
                      />
                    </label>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {(urls.length ? urls : [opt.fallbackImage]).map((url, idx) => {
                      const isFallback = urls.length === 0
                      return (
                        <div key={`${opt.addonId}-${url}-${idx}`} className="relative overflow-hidden rounded-lg border border-white/10 bg-black/35">
                          <img
                            src={url}
                            alt=""
                            className="aspect-square w-full object-cover"
                            loading="lazy"
                          />
                          {isFallback ? (
                            <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-slate-300">
                              Default
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={Boolean(premiumImagesBusy)}
                              onClick={() => void deletePremiumImage(opt.addonId, url)}
                              className="absolute right-1 top-1 rounded bg-black/70 p-1 text-slate-200 hover:bg-black/90 disabled:opacity-40"
                              aria-label="Delete image"
                              title="Delete image"
                            >
                              <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <div className="mt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="inline-flex w-full rounded-xl border border-white/15 bg-black/30 p-0.5 sm:w-auto"
              role="group"
              aria-label="Calendar layout"
            >
              <button
                type="button"
                onClick={() => setCalendarView('list')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium sm:flex-none sm:text-sm ${
                  calendarView === 'list'
                    ? 'bg-white/15 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutList className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                List
              </button>
              <button
                type="button"
                onClick={() => setCalendarView('grid')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium sm:flex-none sm:text-sm ${
                  calendarView === 'grid'
                    ? 'bg-white/15 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                Grid
              </button>
            </div>
            {calendarView === 'grid' ? (
              <p className="text-center text-xs text-slate-400 sm:text-right">
                Scroll weeks · month breaks are separated
              </p>
            ) : null}
          </div>

          {calendarView === 'grid' ? (
            <div className="max-h-[70dvh] overflow-y-auto rounded-xl border border-white/10 bg-black/25 p-2 sm:p-3">
              <p className="mb-2 text-center text-[11px] text-slate-500 sm:text-left">
                Sun–Sat · {SLOT_KEYS.map((k) => labelPreferredTime(k)).join(' · ')}
              </p>
              {gridWeeks.map((week, idx) => (
                <div key={formatLocalYmd(week.weekStart)} className={idx === 0 ? '' : 'mt-4'}>
                  {week.monthLabel ? (
                    <div className={idx === 0 ? 'mb-2' : 'mb-2 mt-4 border-t border-white/10 pt-4'}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200/80">
                        {week.monthLabel}
                      </p>
                    </div>
                  ) : null}
                  <div className="pb-1">
                    <div className="mx-auto w-full">
                      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
                        {week.dates.map((dateStr) => {
                          const row = rowByDate.get(dateStr)
                          const d = new Date(`${dateStr}T12:00:00`)
                          const wd = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(d)
                          const md = new Intl.DateTimeFormat(undefined, {
                            month: 'numeric',
                            day: 'numeric',
                          }).format(d)
                          return (
                            <div key={dateStr} className="flex min-w-0 flex-col bg-zinc-950">
                              <div className="border-b border-white/10 px-1 py-2 text-center max-[749px]:px-0.5 max-[749px]:py-1">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 max-[749px]:text-[8px] max-[749px]:tracking-normal">
                                  {wd}
                                </p>
                                <p className="text-xs font-semibold text-white max-[749px]:text-[9px]">{md}</p>
                                <p className="mt-0.5 font-mono text-[9px] text-slate-600 max-[749px]:hidden">{dateStr}</p>
                              </div>
                              <div className="flex flex-1 flex-col gap-1 p-1 max-[749px]:gap-0.5 max-[749px]:p-0.5">
                                {SLOT_KEYS.map((slot) => (
                                  <AdminCalendarGridSlot
                                    key={slot}
                                    row={row}
                                    slot={slot}
                                    busyKey={busyKey}
                                    onOpenBooking={setSelectedBooking}
                                    onSlotAction={slotAction}
                                  />
                                ))}
                              </div>
                              <div className="flex gap-0.5 border-t border-white/10 p-1 max-[749px]:hidden">
                                <button
                                  type="button"
                                  disabled={busyKey !== null || !row}
                                  onClick={() => row && void slotAction(row.date, 'all', 'blockout')}
                                  className="min-h-8 flex-1 rounded-md border border-amber-800/35 bg-amber-950/30 px-1 py-0.5 text-[9px] font-medium text-amber-100 hover:bg-amber-950/45 disabled:opacity-40"
                                >
                                  Block day
                                </button>
                                <button
                                  type="button"
                                  disabled={busyKey !== null || !row}
                                  onClick={() => row && void slotAction(row.date, 'all', 'clear')}
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-40"
                                  aria-label="Clear day blockouts"
                                  title="Clear day"
                                >
                                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
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
                      className="min-h-10 flex-1 rounded-lg border border-amber-800/35 bg-amber-950/30 px-2 text-xs font-medium text-amber-200/80 hover:bg-amber-950/45 disabled:opacity-40"
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
                            className="rounded-lg border border-amber-800/35 bg-amber-950/30 px-2 py-1.5 text-[10px] font-medium text-amber-200/80 hover:bg-amber-950/45 disabled:opacity-40"
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
            </>
          )}
        </div>

        <p className="mt-6 text-xs leading-relaxed text-slate-600 sm:text-sm">
          Per-slot “Clear” removes blockouts only. To free a booked slot, open the booking and use{' '}
          <strong className="font-medium text-slate-400">Remove booking</strong>, or edit the cell in Sheets.
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
              <div className="flex items-start justify-between gap-3 pb-3 sm:pb-4">
                <div>
                  <h2
                    id="booking-modal-title"
                    className="font-display text-lg font-bold italic tracking-tight text-white sm:text-xl"
                  >
                    Booking details
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">Review customer info, then send confirmation.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              <dl className="mt-4 grid gap-2 text-xs sm:mt-5 sm:grid-cols-2 sm:gap-3 sm:text-sm">
                <div className="p-3">
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                    Date
                  </dt>
                  <dd className="mt-1 text-slate-100">
                    {selectedBooking.row.dateLabel ?? selectedBooking.row.date}
                    <span className="ml-2 font-mono text-xs text-slate-500">{selectedBooking.row.date}</span>
                  </dd>
                </div>
                <div className="p-3">
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden />
                    Time
                  </dt>
                  <dd className="mt-1 text-slate-100">
                    {selectedBooking.slots.length >= 3
                      ? 'Full day (all slots)'
                      : selectedBooking.slots.map((k) => labelPreferredTime(k)).join(' · ')}
                  </dd>
                </div>
                <div className="p-3">
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                    Phone
                  </dt>
                  <dd className="mt-1 text-slate-200">
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
                      <span className="text-slate-300">
                        Submitted Requests row exists for this booking, but column D (Phone) is empty. Add your
                        number there or in the site form next time — the Booking Calendar cell only holds the
                        short note (name/vehicle), not phone.
                      </span>
                    ) : contactLookup.missing ? (
                      <span className="text-slate-300">
                        No matching Submitted Requests row yet (date + calendar note must match that sheet).
                        Rows are added when a customer books on the site or when you accept a pending request
                        from the queue. The calendar cell only holds the short note — not phone.
                      </span>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div className="p-3">
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <Mail className="h-3.5 w-3.5" aria-hidden />
                    Email
                  </dt>
                  <dd className="mt-1 break-all text-slate-200">
                    {contactLookup.data?.email ? (
                      <a
                        href={`mailto:${contactLookup.data.email}`}
                        className="text-cyan-300 underline-offset-2 hover:underline"
                      >
                        {contactLookup.data.email}
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
              </dl>

              <div className="mt-3 p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  Calendar note
                </p>
                <p className="mt-1 break-words text-slate-300">{selectedBooking.label}</p>
                <p className="mt-2 text-[11px] leading-snug text-slate-500">
                  Column titles for the log live in <span className="text-slate-400">server/index.mjs</span>{' '}
                  (<code className="rounded bg-white/5 px-1 text-[10px] text-slate-400">SUBMISSION_HEADERS</code>
                  ). Row 1 is written on new site bookings and when you accept a request from the queue.
                </p>
              </div>

              {(() => {
                const { name, detail } = parseCalendarBookingLabel(selectedBooking.label)
                if (!name && !detail) return null
                return (
                  <div className="mt-3 p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <UserRound className="h-3.5 w-3.5" aria-hidden />
                      Parsed from note
                    </p>
                    <p className="mt-1 text-slate-300">
                      {name ? <span className="font-medium text-white">{name}</span> : null}
                      {name && detail ? <span className="text-slate-500"> · </span> : null}
                      {detail ? <span>{detail}</span> : null}
                    </p>
                  </div>
                )
              })()}

              <div className="mt-4 p-3.5 sm:mt-5 sm:p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200/85">
                  Message for your customer
                </p>
                <p className="mt-1 text-[11px] leading-snug text-slate-400 sm:text-xs">
                  Confirms their date and thanks them for Jackson Auto Glow.{' '}
                  <strong className="font-medium text-slate-300">Message</strong> opens your default texting
                  app (e.g. Messages) with this draft to the phone number from their booking.
                </p>
                <textarea
                  readOnly
                  value={confirmationDraft}
                  rows={8}
                  className="mt-2 max-h-[40vh] w-full resize-y rounded-xl border border-white/10 bg-black/45 px-2.5 py-2 font-sans text-base leading-snug text-slate-100 outline-none focus:border-cyan-500/40 sm:max-h-none sm:px-3 sm:py-2.5 sm:text-sm sm:leading-relaxed"
                />
                {modalSheetError ? (
                  <p
                    role="alert"
                    className="mt-2 rounded-lg border border-red-500/35 bg-red-500/10 px-2.5 py-2 text-xs leading-snug text-red-100"
                  >
                    {modalSheetError}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:flex-wrap sm:items-stretch">
                  {messagesUrl ? (
                    <a
                      href={messagesUrl}
                      className="cta-gradient flex min-h-11 w-full items-center justify-center rounded-xl px-3 text-center text-sm font-semibold sm:min-h-11 sm:flex-1"
                    >
                      Message
                    </a>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyKey !== null}
                    onClick={() => {
                      if (
                        !window.confirm(
                          'Remove this booking from the calendar? Those time slots will be emptied and can be booked again.',
                        )
                      )
                        return
                      void clearBookingForSelection(selectedBooking)
                    }}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 text-sm font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-50 sm:flex-1"
                  >
                    <Trash2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                    Remove booking
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBooking(null)}
                    className="min-h-11 w-full rounded-xl border border-white/15 px-3 text-sm text-slate-300 hover:bg-white/5 sm:w-auto sm:flex-1"
                  >
                    Close
                  </button>
                </div>
              </div>
              </div>
            </div>
          </div>
        ) : null}

        {selectedQueueItem ? (
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/80"
            role="presentation"
            onClick={() => setSelectedQueueItem(null)}
          >
            <div className="flex min-h-[100dvh] min-h-screen items-center justify-center p-3 py-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 sm:py-6">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="queue-modal-title"
                className="my-auto w-full max-w-lg max-h-[min(88dvh,calc(100dvh-2rem))] overflow-y-auto overscroll-contain rounded-2xl border border-white/12 bg-zinc-950 p-4 shadow-2xl sm:max-h-[min(90vh,720px)] sm:p-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 pb-3 sm:pb-4">
                  <div>
                    <h2
                      id="queue-modal-title"
                      className="font-display text-lg font-bold italic tracking-tight text-white sm:text-xl"
                    >
                      Pending request
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">Review details and choose the next action.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedQueueItem(null)}
                    className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>

                <dl className="mt-4 grid gap-2 text-xs sm:mt-5 sm:grid-cols-2 sm:gap-3 sm:text-sm">
                  <div className="p-3">
                    <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <UserRound className="h-3.5 w-3.5" aria-hidden />
                      Name
                    </dt>
                    <dd className="mt-1 text-slate-100">{selectedQueueItem.name || '—'}</dd>
                  </div>
                  <div className="p-3">
                    <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <Phone className="h-3.5 w-3.5" aria-hidden />
                      Phone
                    </dt>
                    <dd className="mt-1">
                      {selectedQueueItem.phone ? (
                        <a
                          href={`tel:${selectedQueueItem.phone.replace(/\s/g, '')}`}
                          className="text-cyan-300 underline-offset-2 hover:underline"
                        >
                          {selectedQueueItem.phone}
                        </a>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                  <div className="p-3">
                    <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <Mail className="h-3.5 w-3.5" aria-hidden />
                      Email
                    </dt>
                    <dd className="mt-1 break-all">
                      {selectedQueueItem.email ? (
                        <a
                          href={`mailto:${selectedQueueItem.email}`}
                          className="text-cyan-300 underline-offset-2 hover:underline"
                        >
                          {selectedQueueItem.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                  <div className="p-3">
                    <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                      Date & time
                    </dt>
                    <dd className="mt-1 text-slate-200">
                      <span className="font-mono text-slate-400">{selectedQueueItem.preferredDate}</span>
                      <span className="mx-1 text-slate-600">·</span>
                      {selectedQueueItem.fullDayCeramic?.toLowerCase() === 'yes'
                        ? 'Full day (ceramic)'
                        : selectedQueueItem.timeSummary || '—'}
                    </dd>
                  </div>
                  <div className="p-3">
                    <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <FileText className="h-3.5 w-3.5" aria-hidden />
                      Package
                    </dt>
                    <dd className="mt-1 text-slate-200">
                      <span className="font-medium text-white">{queuePackageDisplayName(selectedQueueItem)}</span>
                      {(() => {
                        const p = queueResolvedPackagePrice(selectedQueueItem)
                        return p != null ? <span className="text-cyan-300"> — ${p}</span> : null
                      })()}
                      {selectedQueueItem.packageId ? (
                        <span className="mt-1 block font-mono text-[10px] text-slate-600">
                          id: {selectedQueueItem.packageId}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                  <div className="p-3">
                    <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <CarFront className="h-3.5 w-3.5" aria-hidden />
                      Vehicle
                    </dt>
                    <dd className="mt-1 text-slate-200">
                      {selectedQueueItem.vehicleTypeLabel}
                      {selectedQueueItem.vehicleDescription ? ` · ${selectedQueueItem.vehicleDescription}` : ''}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    Location
                  </p>
                  <p className="mt-1 text-slate-200">
                    {selectedQueueItem.locationMode === 'shop' ? 'Shop' : 'Mobile'}
                    {selectedQueueItem.address ? ` · ${selectedQueueItem.address}` : ''}
                  </p>
                  {selectedQueueItem.parkingNotes ? (
                    <p className="mt-2 text-sm text-slate-300">Parking: {selectedQueueItem.parkingNotes}</p>
                  ) : null}
                  {selectedQueueItem.contactNotes ? (
                    <p className="mt-2 text-sm text-slate-300">Notes: {selectedQueueItem.contactNotes}</p>
                  ) : null}
                </div>

                <div className="mt-3 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <FileText className="h-3.5 w-3.5" aria-hidden />
                    Services & add-ons
                  </p>
                  {selectedQueueItem.selectedAddonIds.length === 0 ? (
                    <p className="mt-1 text-slate-500">No add-ons — base package only.</p>
                  ) : (
                    <ul className="mt-1 space-y-1.5 border-l border-cyan-500/20 pl-3">
                      {selectedQueueItem.selectedAddonIds.map((id) => {
                        const a = getAddonById(id)
                        return (
                          <li key={id} className="flex justify-between gap-3 text-sm">
                            <span className="text-slate-200">{a?.name ?? id}</span>
                            <span className="shrink-0 font-medium text-cyan-200/90">
                              {a ? `+$${a.price}` : '—'}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  {selectedQueueItem.addonsLineTotal != null && selectedQueueItem.addonsLineTotal > 0 ? (
                    <p className="mt-2 text-[11px] text-slate-500">
                      Add-ons subtotal: ${selectedQueueItem.addonsLineTotal}
                    </p>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-2 p-3 text-xs sm:grid-cols-2 sm:text-sm">
                  {selectedQueueItem.grandTotal != null ? (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Est. total</p>
                      <p className="mt-1 text-slate-200">${selectedQueueItem.grandTotal}</p>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Reference</p>
                    <p className="mt-1 font-mono text-[11px] text-slate-500">{selectedQueueItem.clientReferenceId}</p>
                  </div>
                </div>

                {queueModalError ? (
                  <p
                    role="alert"
                    className="mt-4 rounded-lg border border-red-500/35 bg-red-500/10 px-2.5 py-2 text-xs text-red-100"
                  >
                    {queueModalError}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {queueSmsUrl ? (
                    <a
                      href={queueSmsUrl}
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/15 sm:flex-1"
                    >
                      <MessageSquare className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                      Message
                    </a>
                  ) : null}
                  <button
                    type="button"
                    disabled={queueBusy !== null}
                    onClick={() => {
                      if (
                        !window.confirm(
                          'Accept this booking? The calendar will be updated and a row will be added to Submitted Requests.',
                        )
                      )
                        return
                      void acceptQueueRequest(selectedQueueItem)
                    }}
                    className="min-h-11 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-50 sm:flex-1"
                  >
                    {queueBusy === `accept-${selectedQueueItem.clientReferenceId}`
                      ? 'Accepting…'
                      : 'Accept booking'}
                  </button>
                  <button
                    type="button"
                    disabled={queueBusy !== null}
                    onClick={() => {
                      if (!window.confirm('Decline this request? The calendar will not change.')) return
                      void declineQueueRequest(selectedQueueItem)
                    }}
                    className="min-h-11 rounded-xl border border-red-500/35 bg-red-500/10 px-3 text-sm font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-50 sm:flex-1"
                  >
                    {queueBusy === `decline-${selectedQueueItem.clientReferenceId}`
                      ? 'Declining…'
                      : 'Decline'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedQueueItem(null)}
                    className="min-h-11 rounded-xl border border-white/15 px-3 text-sm text-slate-300 hover:bg-white/5 sm:w-full sm:flex-none"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
