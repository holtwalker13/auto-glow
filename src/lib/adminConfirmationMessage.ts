import { labelPreferredTime, type PreferredTimeSlot } from '../types/request'

export function parseCalendarBookingLabel(label: string): { name: string; detail: string } {
  const parts = label
    .split(/\s*[\u2014\u2013]\s*|\s+-\s+/)
    .map((p) => p.trim())
    .filter(Boolean)
  return {
    name: parts[0] ?? '',
    detail: parts.slice(1).join(' · '),
  }
}

export function buildCustomerConfirmationMessage(input: {
  calendarLabel: string
  datePretty: string
  slots: PreferredTimeSlot[]
  /** From booking submission log — avoids mashing name + vehicle into the greeting */
  submittedContactName?: string
}): string {
  const parsed = parseCalendarBookingLabel(input.calendarLabel)
  const rawName = (input.submittedContactName?.trim() || parsed.name).trim()
  const firstName = rawName.split(/\s+/)[0] ?? ''
  const greet =
    firstName && firstName.toLowerCase() !== 'customer' ? `Hi ${firstName},` : 'Hello,'
  const detail = parsed.detail

  let scheduleSentence: string
  if (input.slots.length >= 3) {
    scheduleSentence = `We're confirming your appointment on ${input.datePretty} for a full-day service (all slots that day are reserved for you).`
  } else if (input.slots.length === 1) {
    scheduleSentence = `We're confirming your appointment on ${input.datePretty} at ${labelPreferredTime(input.slots[0])}.`
  } else {
    const times = input.slots.map((s) => labelPreferredTime(s)).join(', ')
    scheduleSentence = `We're confirming your time on ${input.datePretty}: ${times}.`
  }

  const detailBlock = detail ? `\n\nDetails on your booking: ${detail}.` : ''

  return `${greet}

Thank you for booking with Jackson Auto Glow! ${scheduleSentence}${detailBlock}

We appreciate your business and look forward to seeing you.

— Jackson Auto Glow`
}
