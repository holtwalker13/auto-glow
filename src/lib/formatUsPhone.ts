/** Digits only (for validation and API payloads). */
export function phoneDigitsOnly(s: string): string {
  return s.replace(/\D/g, '')
}

/**
 * US / NANP display format while typing:
 * - 10 digits: (555) 123-4567
 * - Leading country 1: +1 (555) 123-4567 (11 digits total)
 */
export function formatUsPhoneInput(input: string): string {
  const d = phoneDigitsOnly(input)
  if (d.length === 0) return ''

  const withLeadingOne = d[0] === '1'
  let national: string

  if (withLeadingOne) {
    if (d.length === 1) return '+1 '
    national = d.slice(1, 11)
  } else {
    national = d.slice(0, 10)
  }

  national = national.slice(0, 10)

  let body = ''
  if (national.length <= 3) {
    body = national.length < 3 ? `(${national}` : `(${national})`
  } else if (national.length <= 6) {
    body = `(${national.slice(0, 3)}) ${national.slice(3)}`
  } else {
    body = `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`
  }

  return withLeadingOne ? `+1 ${body}` : body
}
