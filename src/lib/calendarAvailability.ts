import type { PreferredTimeSlot } from '../types/request'

const SLOT_KEYS: PreferredTimeSlot[] = ['10:00', '14:00', '16:00']

export function slotsRecordFromCalendar(slots: Record<string, { status: string }>) {
  const out: Record<string, { status: string; label?: string }> = {}
  for (const k of SLOT_KEYS) {
    const st = slots[k]?.status ?? 'free'
    out[k] = { status: st }
  }
  return out
}

export function countFreeSlots(slots: Record<string, { status: string }> | null | undefined) {
  if (!slots) return 0
  return SLOT_KEYS.filter((k) => slots[k]?.status === 'free').length
}
