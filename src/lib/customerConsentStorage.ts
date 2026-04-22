/**
 * Bump when the booking / data disclosure shown on the **new customer** path changes.
 * Stored in `localStorage` for this origin only (same browser profile); not tied to IP.
 */
export const CUSTOMER_CONSENT_VERSION = 4

/**
 * Bump when copy for **phone number as returning sign-in** (loyalty / punch card) should be re-shown.
 * Separate from {@link CUSTOMER_CONSENT_VERSION} so backfilled clients who only use “Returning”
 * are prompted the first time they use phone sign-in here, even if they never tapped “New customer”.
 */
export const RETURNING_PHONE_LOGIN_CONSENT_VERSION = 4

const STORAGE_KEY = 'jag-customer-data-consent'
const RETURNING_PHONE_LOGIN_STORAGE_KEY = 'jag-returning-phone-login-consent'

export type StoredCustomerConsent = {
  version: number
  acceptedAt: string
}

export function readStoredCustomerConsent(): StoredCustomerConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredCustomerConsent>
    if (
      typeof parsed.version !== 'number' ||
      typeof parsed.acceptedAt !== 'string' ||
      !parsed.acceptedAt
    ) {
      return null
    }
    return { version: parsed.version, acceptedAt: parsed.acceptedAt }
  } catch {
    return null
  }
}

export function hasActiveCustomerConsent(): boolean {
  const s = readStoredCustomerConsent()
  return Boolean(s && s.version === CUSTOMER_CONSENT_VERSION)
}

export function persistCustomerConsent(): void {
  if (typeof window === 'undefined') return
  try {
    const payload: StoredCustomerConsent = {
      version: CUSTOMER_CONSENT_VERSION,
      acceptedAt: new Date().toISOString(),
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

export function readStoredReturningPhoneLoginConsent(): StoredCustomerConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(RETURNING_PHONE_LOGIN_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredCustomerConsent>
    if (
      typeof parsed.version !== 'number' ||
      typeof parsed.acceptedAt !== 'string' ||
      !parsed.acceptedAt
    ) {
      return null
    }
    return { version: parsed.version, acceptedAt: parsed.acceptedAt }
  } catch {
    return null
  }
}

export function hasActiveReturningPhoneLoginConsent(): boolean {
  const s = readStoredReturningPhoneLoginConsent()
  return Boolean(s && s.version === RETURNING_PHONE_LOGIN_CONSENT_VERSION)
}

export function persistReturningPhoneLoginConsent(): void {
  if (typeof window === 'undefined') return
  try {
    const payload: StoredCustomerConsent = {
      version: RETURNING_PHONE_LOGIN_CONSENT_VERSION,
      acceptedAt: new Date().toISOString(),
    }
    window.localStorage.setItem(RETURNING_PHONE_LOGIN_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

/** Persist every consent flag the booking UI can show (one accept on either modal path). */
export function persistAllCustomerConsents(): void {
  persistCustomerConsent()
  persistReturningPhoneLoginConsent()
}
