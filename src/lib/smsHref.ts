/**
 * Apple Messages / SMS URL (works on iPhone and often on Mac).
 * @see https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/SMSLinks/SMSLinks.html
 */
export function buildSmsMessagesUrl(phone: string, body: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return null
  let e164: string
  if (digits.length === 10) {
    e164 = `+1${digits}`
  } else if (digits.length === 11 && digits.startsWith('1')) {
    e164 = `+${digits}`
  } else {
    e164 = `+${digits}`
  }
  return `sms:${e164}?body=${encodeURIComponent(body)}`
}
