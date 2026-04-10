/**
 * Apple Messages / SMS URL (works on iPhone and often on Mac).
 *
 * Important: `sms:+1…` often opens a blank compose on macOS (recipient ignored); use a plain
 * digit address (`1` + 10 digits for US). International numbers use percent-encoded `+` in the path.
 *
 * @see https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/SMSLinks/SMSLinks.html
 */
export function buildSmsMessagesUrl(phone: string, body: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return null

  let address: string
  if (digits.length === 10) {
    address = `1${digits}`
  } else if (digits.length === 11 && digits.startsWith('1')) {
    address = digits
  } else {
    address = `+${digits}`
  }

  const bodyQ = encodeURIComponent(body)
  if (address.startsWith('+')) {
    return `sms:${encodeURIComponent(address)}?body=${bodyQ}`
  }
  return `sms:${address}?body=${bodyQ}`
}
