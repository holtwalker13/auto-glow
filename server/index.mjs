/**
 * Jackson Auto Glow — API + Google Sheets calendar.
 * Credentials: GOOGLE_SERVICE_ACCOUNT_JSON, _BASE64, or GOOGLE_APPLICATION_CREDENTIALS file path.
 */
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'

/**
 * Netlify bundles `server/index.mjs` into a single `api.js`; `import.meta.url` can be missing,
 * which makes `fileURLToPath(undefined)` throw before any route runs (502).
 */
function resolveServerDirname() {
  try {
    const u = import.meta?.url
    if (typeof u === 'string' && u.length > 0) {
      return path.dirname(fileURLToPath(u))
    }
  } catch {
    /* bundled without a usable import.meta.url */
  }
  return process.cwd()
}

const __dirname = resolveServerDirname()

/** True when this file is the Node entrypoint (not when imported by e.g. `scripts/*.mjs`). */
function isExecutedDirectly() {
  try {
    const entry = process.argv[1]
    if (!entry) return false
    const thisFile = fileURLToPath(import.meta.url)
    return path.resolve(entry) === path.resolve(thisFile)
  } catch {
    return false
  }
}

// Lambda / Vercel: env comes from the host; no .env file on disk.
if (!process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.VERCEL) {
  dotenv.config({ path: path.join(__dirname, '..', '.env') })
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
const CALENDAR_TAB = (process.env.GOOGLE_SHEETS_CALENDAR_TAB || 'Booking Calendar').trim()
const HEADER_ROW_COUNT = Math.max(0, parseInt(process.env.GOOGLE_SHEETS_HEADER_ROWS || '1', 10))
/** Full form submissions log (same spreadsheet). Default tab name matches typical sheet title. */
const SUBMISSIONS_TAB = (process.env.GOOGLE_SHEETS_SUBMISSIONS_TAB || 'Submitted Requests').trim()
const SUBMISSIONS_HEADER_ROWS = Math.max(0, parseInt(process.env.GOOGLE_SHEETS_SUBMISSIONS_HEADER_ROWS || '1', 10))
/** Pending customer requests (same columns as submissions + Status). Worksheet is auto-created if missing. */
const REQUEST_QUEUE_TAB = (process.env.GOOGLE_SHEETS_REQUEST_QUEUE_TAB || 'Requests Queue').trim()
/** Queue tab always has a single header row (A1:AB1), independent of Submitted Requests header count. */
const REQUEST_QUEUE_HEADER_ROWS = 1

/** Column index (0-based) for admin phone lookup */
const SUB_COL_REF = 1
const SUB_COL_DATE = 17
const SUB_COL_CALENDAR_LABEL = 24
const SUB_COL_PHONE = 3
const SUB_COL_EMAIL = 4
const SUB_COL_NAME = 2
const SUB_COL_PACKAGE_ID = 8
const SUB_COL_TIME_LABEL = 18
const SUB_COL_FULL_DAY = 19
const SUB_COL_LOCATION = 20
const SUB_COL_ADDRESS = 21
const SUB_COL_PARKING = 22
const SUB_COL_NOTES = 23
const SUB_COL_DISMISSED = 25
const SUB_COL_ADDON_IDS_RAW = 26
const SUB_COL_STATUS = 27

/** Row 1 on Submitted Requests — written by ensure/write endpoints and before each append. */
const SUBMISSION_HEADERS = [
  'Submitted At (ISO)',
  'Reference ID',
  'Name',
  'Phone',
  'Email',
  'Vehicle Type',
  'Vehicle Description',
  'Package',
  'Package ID',
  'Package Price',
  'Addon 1',
  'Addon 2',
  'Addon 3',
  'Addon 4',
  'Addon 5',
  'Add-ons Total',
  'Est. Grand Total',
  'Preferred Date',
  'Time Slot',
  'Full Day (Ceramic)',
  'Pickup / Location Type',
  'Service Address',
  'Parking Notes',
  'Contact Notes',
  'Calendar Cell Label',
  'Dismissed Glow-up IDs',
  'Selected Addon IDs (raw)',
]

const QUEUE_HEADERS = [...SUBMISSION_HEADERS, 'Status']

const VEHICLE_TYPE_LABELS = {
  car: 'Car',
  truck: 'Truck',
  'suv-compact': 'Compact SUV',
  'suv-fullsize': 'Full-size SUV',
}

const SLOT_LABELS = { '10:00': '10 AM', '14:00': '2 PM', '16:00': '4 PM' }

/** id -> { name, price } — keep in sync with src/data/services.ts */
const ADDON_META = {
  'addon-clay': { name: 'Clay bar decontamination', price: 85 },
  'addon-spray-wax': { name: 'Spray wax / sealant boost', price: 65 },
  'addon-interior-deep': { name: 'Interior deep clean (cloth or leather)', price: 125 },
  'addon-pet': { name: 'Pet hair removal', price: 55 },
  'addon-engine': { name: 'Engine bay wipe-down & dress', price: 85 },
  'addon-headlight': { name: 'Headlight restoration (pair)', price: 99 },
  'addon-odor': { name: 'Odor treatment', price: 95 },
  'addon-ceramic-3yr': { name: 'Ceramic coating (3-year)', price: 899 },
  'addon-sub-engine': { name: 'Engine bay detail', price: 85 },
  'addon-sub-trim': { name: 'Trim restoration', price: 75 },
  'addon-sub-tar-bug': { name: 'Tar & bug removal', price: 65 },
  'addon-sub-leather': { name: 'Leather conditioner', price: 45 },
  'addon-sub-seat-shampoo': { name: 'Seat shampoo', price: 55 },
  'addon-sub-carpet-shampoo': { name: 'Carpet shampoo', price: 55 },
  'addon-sub-pet-hair': { name: 'Pet hair removal', price: 55 },
}

const PACKAGE_NAMES = {
  'interior-detail': 'Interior Detail',
  'exterior-detail': 'Exterior Detail',
  'full-detail': 'Full Detail',
  'full-everything': 'Full Everything',
}
const COOKIE_SECRET = process.env.SESSION_COOKIE_SECRET || 'change-me-set-SESSION_COOKIE_SECRET'
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || '').trim()
const PORT = Number(process.env.PORT || 8787)
const CERAMIC_ADDON_ID = 'addon-ceramic-3yr'
/** When column A has no year (e.g. "Wednesday, April 1"), assume this year. Booking sheet is 2026. */
const CALENDAR_YEAR = parseInt(process.env.SHEET_CALENDAR_YEAR || '2026', 10)

const SLOTS = ['10:00', '14:00', '16:00']

/** Vercel or Netlify (AWS Lambda) — static site is served separately; do not listen() or bundle dist in the function. */
function isSplitStaticHost() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
}

/** First path segment for routes this app exposes under `/api/...` (when Lambda gets a stripped path). */
const NETLIFY_API_ROOT_SEGMENTS = new Set([
  'admin',
  'bookings',
  'calendar',
  'availability',
  'health',
  'loyalty',
])

/** Package IDs that count as one punch on the detail loyalty card (Submitted Requests). */
const LOYALTY_PUNCH_PACKAGE_IDS = new Set([
  'full-detail',
  'full-everything',
  'interior-detail',
  'exterior-detail',
])

const LOYALTY_MAX_PUNCHES = 5

/** Next-visit discount % after `completedPunches` detail jobs logged in Submitted Requests (0 = regular price). */
function loyaltyNextDiscountPercent(completedPunches) {
  const n = Math.max(0, completedPunches)
  const tier = [0, 20, 30, 40, 50]
  return tier[Math.min(n, tier.length - 1)]
}

function phoneDigitsKey(s) {
  const d = String(s ?? '').replace(/\D/g, '')
  if (d.length >= 10) return d.slice(-10)
  return d
}

/**
 * Netlify rewrites `/api/*` → `/.netlify/functions/api/:splat`. The Lambda event often uses
 * `/.netlify/functions/api/...` or a splat-only path like `/admin/me`. Express only mounts `/api/...`.
 *
 * serverless-http's clean-up prefers `event.requestPath` over `rawPath` / `path`, so we normalize
 * in the Netlify handler (see normalizeNetlifyLambdaEvent) and mirror here for local parity.
 */
function normalizeApiPathnameForNetlify(pathname) {
  let p = pathname || '/'
  if (p[0] !== '/') p = `/${p}`
  const prefix = '/.netlify/functions/api'
  if (p === prefix || p.startsWith(`${prefix}/`)) {
    const tail = p.length <= prefix.length ? '' : p.slice(prefix.length)
    p = `/api${tail}`
  }
  if (process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.VERCEL && !p.startsWith('/api')) {
    const slash = p.indexOf('/', 1)
    const first = slash === -1 ? p.slice(1) : p.slice(1, slash)
    if (NETLIFY_API_ROOT_SEGMENTS.has(first)) {
      p = `/api${p}`
    }
  }
  return p
}

function rewriteNetlifyFunctionUrl(req, _res, next) {
  const raw = req.url || '/'
  const q = raw.indexOf('?')
  const pathPart = q === -1 ? raw : raw.slice(0, q)
  const qs = q === -1 ? '' : raw.slice(q)
  req.url = normalizeApiPathnameForNetlify(pathPart) + qs
  next()
}

/**
 * Mutate the Lambda event before serverless-http (Netlify may set `requestPath`, which wins over
 * `rawPath` in clean-up-event.js).
 */
export function normalizeNetlifyLambdaEvent(event) {
  if (!event || process.env.VERCEL) return
  const v2 = event.version === '2.0'
  const cur = String(v2 ? event.requestPath || event.rawPath || '/' : event.requestPath || event.path || '/')
  const q = cur.indexOf('?')
  const pathOnly = q === -1 ? cur : cur.slice(0, q)
  const normalized = normalizeApiPathnameForNetlify(pathOnly)
  if (pathOnly === normalized) return
  event.requestPath = normalized
  if (v2) event.rawPath = normalized
  else event.path = normalized
}

function tabRange(a1) {
  const safe = CALENDAR_TAB.replace(/'/g, "''")
  return `'${safe}'!${a1}`
}

/** Column A display: weekday + month + day, no year (e.g. "Wednesday, April 1"). */
function formatColumnADate(dateISO) {
  const m = dateISO.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return dateISO
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const local = new Date(y, mo, d)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(local)
}

/** Match calendar label to log row despite en/em dash or spacing differences. */
function normalizeCalendarLabelForMatch(s) {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u2013\u2015\u2212]/g, '\u2014')
}

/** Preferred Date column may be text, or a Sheets serial (number) when formatted as date. */
function submissionPreferredDateToISO(cell) {
  if (cell == null || cell === '') return null
  if (typeof cell === 'number' && Number.isFinite(cell)) {
    return sheetsSerialToISODate(cell)
  }
  const s = String(cell).trim()
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = parseFloat(s)
    if (Number.isFinite(n)) {
      const fromSerial = sheetsSerialToISODate(n)
      if (fromSerial) return fromSerial
    }
  }
  return normalizeToISODate(cell)
}

/** Google Sheets / Excel day serial (1899-12-30 origin). */
function sheetsSerialToISODate(serial) {
  const n = typeof serial === 'number' ? serial : parseFloat(serial)
  if (!Number.isFinite(n)) return null
  const whole = Math.floor(n)
  const epochMs = Date.UTC(1899, 11, 30) + whole * 86400000
  const d = new Date(epochMs)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

function normalizeToISODate(value) {
  if (value == null) return null
  const s = String(value).trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  const toISO = (dt) => {
    if (Number.isNaN(dt.getTime())) return null
    const y = dt.getFullYear()
    const mo = String(dt.getMonth() + 1).padStart(2, '0')
    const day = String(dt.getDate()).padStart(2, '0')
    return `${y}-${mo}-${day}`
  }

  const trimmed = s.replace(/,+\s*$/, '').trim()
  // Yearless labels (e.g. "Wednesday, April 9") must NOT use `new Date(s)` first — engines
  // may default to the wrong year (e.g. 2001). Always anchor with SHEET_CALENDAR_YEAR / 2026.
  if (!/\b(19|20)\d{2}\b/.test(trimmed)) {
    const d = new Date(`${trimmed}, ${CALENDAR_YEAR}`)
    const iso = toISO(d)
    if (iso) return iso
  }

  const d = new Date(s)
  const iso = toISO(d)
  if (iso) return iso

  return null
}

function classifyCell(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return { kind: 'empty' }
  if (/^x$/i.test(s)) return { kind: 'block' }
  return { kind: 'booked', label: s }
}

function addOneCalendarDayISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const x = new Date(y, m - 1, d)
  x.setDate(x.getDate() + 1)
  const yy = x.getFullYear()
  const mm = String(x.getMonth() + 1).padStart(2, '0')
  const dd = String(x.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function enumerateDatesInclusive(fromISO, toISO) {
  const res = []
  let cur = fromISO
  while (cur <= toISO) {
    res.push(cur)
    if (cur === toISO) break
    cur = addOneCalendarDayISO(cur)
  }
  return res
}

function colForSlot(slot) {
  const i = SLOTS.indexOf(slot)
  if (i < 0) return null
  return 1 + i
}

function letter(colZeroBased) {
  return String.fromCharCode(65 + colZeroBased)
}

/** PEM from Netlify/UI: literal \n, or multiline, or one long line of base64 between BEGIN/END. */
function normalizePemPrivateKey(raw) {
  let k = String(raw ?? '').trim()
  if (!k) return ''
  k = k.replace(/\\n/g, '\n').replace(/\\r\n?/g, '\n')
  if (!k.includes('\n') && /BEGIN [A-Z ]*PRIVATE KEY/.test(k)) {
    const begin = k.match(/-----BEGIN [^-]+-----/)
    const end = k.match(/-----END [^-]+-----/)
    if (begin && end) {
      const bi = k.indexOf(begin[0])
      const ei = k.indexOf(end[0])
      if (ei > bi) {
        const body = k.slice(bi + begin[0].length, ei).replace(/\s+/g, '')
        const lines = body.match(/.{1,64}/g) ?? []
        k = `${begin[0]}\n${lines.join('\n')}\n${end[0]}`
      }
    }
  }
  return k.trim()
}

function credentialsFromEmailAndPem() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim()
  if (!email) return null
  let pem =
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() ||
    process.env.GOOGLE_PRIVATE_KEY?.trim() ||
    ''
  const pemB64 = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_BASE64?.trim()
  if (!pem && pemB64) {
    try {
      pem = Buffer.from(pemB64, 'base64').toString('utf8').trim()
    } catch {
      return null
    }
  }
  if (!pem) return null
  const private_key = normalizePemPrivateKey(pem)
  if (!private_key.includes('PRIVATE KEY')) return null
  return {
    type: 'service_account',
    client_email: email,
    private_key,
  }
}

function isFullServiceAccountJson(obj) {
  return Boolean(
    obj &&
      typeof obj === 'object' &&
      typeof obj.client_email === 'string' &&
      obj.client_email.includes('@') &&
      typeof obj.private_key === 'string' &&
      obj.private_key.includes('PRIVATE KEY'),
  )
}

function tryParseJsonCredentials(raw) {
  try {
    const o = JSON.parse(raw)
    return isFullServiceAccountJson(o) ? o : null
  } catch {
    return null
  }
}

/**
 * Netlify: prefer email + PEM when both are set (avoids a stale/broken JSON_BASE64 blocking auth).
 * Invalid base64/JSON falls through instead of returning null for the whole loader.
 */
function loadServiceAccountCredentials() {
  const fromPem = credentialsFromEmailAndPem()
  if (fromPem) return fromPem

  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64?.trim()
  if (b64) {
    try {
      const raw = Buffer.from(b64, 'base64').toString('utf8')
      const parsed = tryParseJsonCredentials(raw)
      if (parsed) return parsed
    } catch {
      /* fall through */
    }
  }
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()
  if (inline) {
    const parsed = tryParseJsonCredentials(inline)
    if (parsed) return parsed
  }

  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  if (gac) {
    if (gac.startsWith('{')) {
      const parsed = tryParseJsonCredentials(gac)
      if (parsed) return parsed
    } else if (fs.existsSync(gac)) {
      try {
        const parsed = tryParseJsonCredentials(fs.readFileSync(gac, 'utf8'))
        if (parsed) return parsed
      } catch {
        /* fall through */
      }
    }
  }
  return null
}

function assertSheetsEnv() {
  if (!SPREADSHEET_ID) {
    const err = new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID')
    err.status = 503
    throw err
  }
  const creds = loadServiceAccountCredentials()
  if (!creds?.client_email || !creds?.private_key) {
    const err = new Error(
      'Google credentials missing or invalid. Set GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (PEM), or GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 / GOOGLE_SERVICE_ACCOUNT_JSON, or GOOGLE_APPLICATION_CREDENTIALS (path or JSON).',
    )
    err.status = 503
    throw err
  }
}

/** Lazy-load googleapis so /api/admin/* cold starts stay under Netlify’s ~10s budget. */
let googleApisModule = null
async function loadGoogle() {
  if (!googleApisModule) {
    googleApisModule = await import('googleapis')
  }
  return googleApisModule.google
}

async function getSheets() {
  assertSheetsEnv()
  const google = await loadGoogle()
  const credentials = loadServiceAccountCredentials()
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const client = await auth.getClient()
  return google.sheets({ version: 'v4', auth: client })
}

async function readCalendarRows(sheets) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: tabRange('A:D'),
  })
  return res.data.values || []
}

function parseRows(rows) {
  const parsed = []
  for (let i = HEADER_ROW_COUNT; i < rows.length; i++) {
    const r = rows[i]
    const sheetRow = i + 1
    const dateISO = normalizeToISODate(r?.[0])
    if (!dateISO) continue
    parsed.push({
      row: sheetRow,
      dateISO,
      cells: {
        '10:00': r[1] ?? '',
        '14:00': r[2] ?? '',
        '16:00': r[3] ?? '',
      },
    })
  }
  return parsed
}

async function findOrCreateDateRow(sheets, dateISO) {
  const rows = await readCalendarRows(sheets)
  let parsed = parseRows(rows)
  let hit = parsed.find((p) => p.dateISO === dateISO)
  if (hit) return hit.row

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: tabRange('A:D'),
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[formatColumnADate(dateISO), '', '', '']] },
  })

  const rows2 = await readCalendarRows(sheets)
  parsed = parseRows(rows2)
  hit = parsed.find((p) => p.dateISO === dateISO)
  if (!hit) throw new Error('Could not find row after appending date')
  return hit.row
}

async function getRowSnapshot(sheets, dateISO) {
  const rows = await readCalendarRows(sheets)
  const parsed = parseRows(rows)
  return parsed.find((p) => p.dateISO === dateISO) ?? null
}

async function updateCells(sheets, row, updates) {
  const data = updates.map(({ col, value }) => ({
    range: tabRange(`${letter(col)}${row}`),
    values: [[value]],
  }))
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data,
    },
  })
}

function bookingLabelFromPayload(body) {
  const name = (body.contact?.name || 'Customer').trim()
  const type = body.vehicle?.type || ''
  const desc = (body.vehicle?.description || '').trim()
  const parts = [name]
  if (type) parts.push(String(type))
  if (desc) parts.push(desc)
  let s = parts.join(' — ')
  if (s.length > 120) s = `${s.slice(0, 117)}…`
  return s
}

function labelVehicleTypeServer(t) {
  return VEHICLE_TYPE_LABELS[t] || (t ? String(t) : '')
}

function formatAddonSlot(id) {
  const m = ADDON_META[id]
  return m ? `${m.name} ($${m.price})` : String(id || '')
}

function buildSubmissionDataRow(body, calendarLabel) {
  const ids = Array.isArray(body.selectedAddonIds) ? body.selectedAddonIds : []
  const addonCols = ['', '', '', '', '']
  for (let i = 0; i < Math.min(5, ids.length); i++) {
    addonCols[i] = formatAddonSlot(ids[i])
  }
  const pkgLabel =
    body.totals?.packageLine?.label ||
    PACKAGE_NAMES[body.selectedPackageId] ||
    body.selectedPackageId ||
    ''
  const pkgId = String(body.selectedPackageId ?? '')
  const pkgPrice = body.totals?.packageLine?.amount
  const addonsTotal = body.totals?.addonsLine?.amount
  const grand = body.totals?.grandTotal
  const ceramic = ids.includes(CERAMIC_ADDON_ID)
  const timeLabel = ceramic
    ? 'Full day (all slots)'
    : SLOT_LABELS[body.preferredTimeSlot] || body.preferredTimeSlot || ''
  const loc =
    body.locationMode === 'shop'
      ? 'Shop'
      : body.locationMode === 'mobile'
        ? 'Mobile — at your location'
        : String(body.locationMode || '')
  const dismissed = Array.isArray(body.dismissedPremiumIds) ? body.dismissedPremiumIds.join(' | ') : ''

  return [
    new Date().toISOString(),
    String(body.clientReferenceId ?? ''),
    String(body.contact?.name ?? '').trim(),
    String(body.contact?.phone ?? '').trim(),
    String(body.contact?.email ?? '').trim(),
    labelVehicleTypeServer(body.vehicle?.type),
    String(body.vehicle?.description ?? '').trim(),
    pkgLabel,
    pkgId,
    pkgPrice === null || pkgPrice === undefined ? '' : pkgPrice,
    addonCols[0],
    addonCols[1],
    addonCols[2],
    addonCols[3],
    addonCols[4],
    addonsTotal === null || addonsTotal === undefined ? '' : addonsTotal,
    grand === null || grand === undefined ? '' : grand,
    normalizeToISODate(body.preferredDate) || String(body.preferredDate ?? ''),
    timeLabel,
    ceramic ? 'Yes' : 'No',
    loc,
    String(body.address ?? '').trim(),
    String(body.parkingNotes ?? '').trim(),
    String(body.contact?.notes ?? '').trim(),
    calendarLabel,
    dismissed,
    ids.join(', '),
  ]
}

function parseCalendarBookingLabelServer(label) {
  const parts = String(label ?? '')
    .split(/\s*[\u2014\u2013]\s*|\s+-\s+/)
    .map((p) => p.trim())
    .filter(Boolean)
  return {
    name: parts[0] ?? '',
    vehicleTypeRaw: parts[1] ?? '',
    vehicleDesc: parts.slice(2).join(' · '),
  }
}

/** One row from calendar cells only (no full form). Phone/email optional (e.g. from prior lookup). */
function buildBackfillSubmissionRow(dateISO, label, slots, extras = {}) {
  const { name, vehicleTypeRaw, vehicleDesc } = parseCalendarBookingLabelServer(label)
  const vehicleTypeLabel = labelVehicleTypeServer(vehicleTypeRaw) || vehicleTypeRaw
  const orderedSlots = [...new Set(slots)].filter((s) => SLOTS.includes(s)).sort()
  const allDay = orderedSlots.length >= 3
  const timeLabel = allDay
    ? 'Full day (all slots)'
    : orderedSlots.map((s) => SLOT_LABELS[s] || s).join(', ')
  const ref = `calendar-backfill-${Date.now()}`
  const emptyAddons = ['', '', '', '', '']
  return [
    new Date().toISOString(),
    ref,
    name,
    String(extras.phone ?? '').trim(),
    String(extras.email ?? '').trim(),
    vehicleTypeLabel,
    vehicleDesc,
    '',
    '',
    '',
    ...emptyAddons,
    '',
    '',
    dateISO,
    timeLabel,
    allDay ? 'Yes' : 'No',
    '',
    '',
    '',
    String(extras.notes ?? '').trim(),
    label,
    '',
    '',
  ]
}

function formatGoogleSheetsError(err) {
  const base = err?.message || String(err)
  const d = err?.response?.data
  const apiMsg = d?.error?.message || (typeof d?.error === 'string' ? d.error : '')
  return apiMsg ? `${base} (${apiMsg})` : base
}

/** Write data on the next empty row (more reliable than values.append on some sheets). */
async function readSubmittedRequestsValues(sheets) {
  await ensureSubmittedRequestsHeaders(sheets)
  const safeSub = SUBMISSIONS_TAB.replace(/'/g, "''")
  const read = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${safeSub}'!A:AA`,
  })
  return read.data.values || []
}

/**
 * @returns {{ anyRow: boolean, completedPunches: number, lastName: string, lastEmail: string }}
 */
function loyaltySummarizeFromSubmittedRows(values, phoneKey) {
  let anyRow = false
  let completedPunches = 0
  let lastName = ''
  let lastEmail = ''
  for (let i = SUBMISSIONS_HEADER_ROWS; i < values.length; i++) {
    const row = values[i]
    if (!row) continue
    const rowPhone = phoneDigitsKey(row[SUB_COL_PHONE])
    if (rowPhone.length < 7 || rowPhone !== phoneKey) continue
    anyRow = true
    const pkgId = String(row[SUB_COL_PACKAGE_ID] ?? '').trim()
    if (LOYALTY_PUNCH_PACKAGE_IDS.has(pkgId)) {
      completedPunches += 1
    }
  }
  for (let i = values.length - 1; i >= SUBMISSIONS_HEADER_ROWS; i--) {
    const row = values[i]
    if (!row) continue
    const rowPhone = phoneDigitsKey(row[SUB_COL_PHONE])
    if (rowPhone.length < 7 || rowPhone !== phoneKey) continue
    const name = String(row[SUB_COL_NAME] ?? '').trim()
    const email = String(row[SUB_COL_EMAIL] ?? '').trim()
    if (name || email) {
      lastName = name
      lastEmail = email
      break
    }
  }
  return { anyRow, completedPunches, lastName, lastEmail }
}

function loyaltyFirstNameFromFullName(fullName) {
  const s = String(fullName ?? '').trim()
  if (!s) return ''
  const first = s.split(/\s+/).filter(Boolean)[0] ?? ''
  if (!first) return ''
  const stripped = first.replace(/^[^A-Za-z]+/, '')
  return stripped || first
}

function loyaltyCelebrationMessage(anyRow, completedPunches, nextDiscountPercent, firstName) {
  if (!anyRow) {
    return 'We could not find this number in our completed job history yet. You can still book — we will use the phone number you entered.'
  }
  if (completedPunches === 0) {
    const lead = firstName ? `Welcome back, ${firstName}. ` : ''
    return `${lead}You're in our records. Book a Full, Interior, Exterior, or Full Everything detail to start your punch card. Your next detail is regular price until then.`
  }
  if (nextDiscountPercent <= 0) return ''
  if (firstName) {
    return `Congratulations, ${firstName} — you've unlocked ${nextDiscountPercent}% off your next wash or detail.`
  }
  return `Congratulations — you've unlocked ${nextDiscountPercent}% off your next wash or detail.`
}

async function appendSubmittedRequestsDataRow(sheets, dataRow) {
  const safeSub = SUBMISSIONS_TAB.replace(/'/g, "''")
  await ensureSubmittedRequestsHeaders(sheets)
  const colA = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${safeSub}'!A:A`,
  })
  const vals = colA.data.values || []
  const nextRow = vals.length + 1
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${safeSub}'!A${nextRow}:AA${nextRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [dataRow] },
  })
}

async function writeSubmittedRequestsHeaderRow(sheets) {
  const safe = SUBMISSIONS_TAB.replace(/'/g, "''")
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${safe}'!A1:AA1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [SUBMISSION_HEADERS] },
  })
}

async function ensureSubmittedRequestsHeaders(sheets) {
  const safe = SUBMISSIONS_TAB.replace(/'/g, "''")
  try {
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${safe}'!A1:A1`,
    })
    if (r.data.values?.[0]?.[0]?.trim()) return
  } catch {
    /* tab may be missing until first successful write */
  }
  await writeSubmittedRequestsHeaderRow(sheets)
}

async function writeRequestQueueHeaderRow(sheets) {
  const safe = REQUEST_QUEUE_TAB.replace(/'/g, "''")
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${safe}'!A1:AB1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [QUEUE_HEADERS] },
  })
}

async function requestQueueWorksheetTitles(sheets) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets.properties.title',
  })
  return (meta.data.sheets || []).map((s) => s.properties?.title).filter(Boolean)
}

/** Creates the queue worksheet if it is missing (no manual tab setup). */
async function ensureRequestQueueWorksheetExists(sheets) {
  if ((await requestQueueWorksheetTitles(sheets)).includes(REQUEST_QUEUE_TAB)) return
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: REQUEST_QUEUE_TAB } } }],
      },
    })
    console.log(`[auto-glow] Created worksheet "${REQUEST_QUEUE_TAB}"`)
  } catch (err) {
    if ((await requestQueueWorksheetTitles(sheets)).includes(REQUEST_QUEUE_TAB)) return
    throw err
  }
}

/**
 * Ensures the Requests Queue tab exists and row 1 has the canonical headers (A–AB) when A1 is wrong/empty.
 * Called automatically before any queue read or append — no manual tab or header row setup.
 */
async function provisionRequestQueueSheet(sheets) {
  await ensureRequestQueueWorksheetExists(sheets)
  const safe = REQUEST_QUEUE_TAB.replace(/'/g, "''")
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${safe}'!A1:A1`,
  })
  const first = String(r.data.values?.[0]?.[0] ?? '').trim()
  if (first !== QUEUE_HEADERS[0]) {
    await writeRequestQueueHeaderRow(sheets)
  }
}

async function appendRequestQueueDataRow(sheets, dataRowWithStatus) {
  const safeQ = REQUEST_QUEUE_TAB.replace(/'/g, "''")
  await provisionRequestQueueSheet(sheets)
  const colA = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${safeQ}'!A:A`,
  })
  const vals = colA.data.values || []
  const nextRow = Math.max(vals.length, 1) + 1
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${safeQ}'!A${nextRow}:AB${nextRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [dataRowWithStatus] },
  })
}

async function readRequestQueueValues(sheets) {
  await provisionRequestQueueSheet(sheets)
  const safeQ = REQUEST_QUEUE_TAB.replace(/'/g, "''")
  try {
    const read = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${safeQ}'!A:AB`,
    })
    return read.data.values || []
  } catch (err) {
    const hint = formatGoogleSheetsError(err) || err.message
    console.error('[auto-glow] readRequestQueueValues:', hint)
    throw new Error(
      `Could not read Requests Queue ("${REQUEST_QUEUE_TAB}"). Check spreadsheet ID and that the service account can edit the file. ${hint}`,
    )
  }
}

function findQueueRowIndexByRef(values, clientReferenceId) {
  const ref = String(clientReferenceId ?? '').trim()
  if (!ref) return -1
  for (let i = values.length - 1; i >= REQUEST_QUEUE_HEADER_ROWS; i--) {
    const row = values[i]
    if (!row) continue
    if (String(row[SUB_COL_REF] ?? '').trim() === ref) return i
  }
  return -1
}

/** Pending rows for admin UI (same shape as GET /api/admin/request-queue). */
async function loadPendingRequestQueueForAdmin(sheets) {
  const values = await readRequestQueueValues(sheets)
  const pending = []
  for (let i = REQUEST_QUEUE_HEADER_ROWS; i < values.length; i++) {
    const row = values[i]
    if (!row) continue
    const status = String(row[SUB_COL_STATUS] ?? '').trim() || 'Pending'
    if (status.toLowerCase() !== 'pending') continue
    try {
      const body = bookingBodyFromSubmissionRow(row)
      pending.push({
        sheetRow: i + 1,
        clientReferenceId: body.clientReferenceId,
        submittedAt: String(row[0] ?? '').trim(),
        name: body.contact.name,
        phone: body.contact.phone,
        email: body.contact.email,
        preferredDate: body.preferredDate,
        timeSummary: String(row[SUB_COL_TIME_LABEL] ?? '').trim(),
        fullDayCeramic: String(row[SUB_COL_FULL_DAY] ?? '').trim(),
        packageId: body.selectedPackageId,
        packageLabel: String(row[7] ?? '').trim(),
        vehicleDescription: body.vehicle.description,
        vehicleTypeLabel: String(row[5] ?? '').trim(),
        selectedAddonIds: body.selectedAddonIds,
        locationMode: body.locationMode,
        address: body.address,
        parkingNotes: body.parkingNotes,
        contactNotes: body.contact.notes,
        grandTotal: body.totals?.grandTotal,
      })
    } catch (rowErr) {
      console.error('[auto-glow] request-queue skip row', i + 1, rowErr)
    }
  }
  return { tab: REQUEST_QUEUE_TAB, pending }
}

async function updateQueueRowStatus(sheets, clientReferenceId, status) {
  const values = await readRequestQueueValues(sheets)
  const idx = findQueueRowIndexByRef(values, clientReferenceId)
  if (idx < 0) return { ok: false, error: 'Queue row not found' }
  const sheetRow = idx + 1
  const safeQ = REQUEST_QUEUE_TAB.replace(/'/g, "''")
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${safeQ}'!AB${sheetRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[status]] },
  })
  return { ok: true, sheetRow }
}

/** Reverse VEHICLE_TYPE_LABELS for sheet "Car" -> car */
const VEHICLE_LABEL_TO_TYPE = Object.fromEntries(
  Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => [v, k]),
)

const TIME_LABEL_TO_SLOT = {
  '10 AM': '10:00',
  '2 PM': '14:00',
  '4 PM': '16:00',
}

function resolvePackagePriceServer(packageId, vehicleType) {
  if (packageId === 'full-everything') return 700
  const pkgName = PACKAGE_NAMES[packageId]
  if (!pkgName) return null
  if (packageId === 'full-detail') {
    if (!vehicleType || !VEHICLE_TYPE_LABELS[vehicleType]) return null
    const byClass = { car: 225, 'suv-compact': 225, 'suv-fullsize': 265, truck: 295 }
    return byClass[vehicleType] ?? null
  }
  if (packageId === 'interior-detail') return 120
  if (packageId === 'exterior-detail') return 200
  return null
}

function recomputeTotalsOnBody(body) {
  const pkgId = body.selectedPackageId
  const vehicleType = body.vehicle?.type
  const packagePrice = resolvePackagePriceServer(pkgId, vehicleType)
  const ids = Array.isArray(body.selectedAddonIds) ? body.selectedAddonIds : []
  let addonsTotal = 0
  for (const id of ids) {
    addonsTotal += ADDON_META[id]?.price ?? 0
  }
  const grand = packagePrice != null ? packagePrice + addonsTotal : null
  const pkgLabel = PACKAGE_NAMES[pkgId] || pkgId
  body.totals = {
    packageLine: { label: pkgLabel, amount: packagePrice },
    addonsLine: { label: 'Add-ons', amount: addonsTotal },
    grandTotal: grand,
  }
}

/**
 * Rebuild a booking-shaped body from a Requests Queue / Submitted Requests row (A–AA).
 */
function bookingBodyFromSubmissionRow(row) {
  const pkgId = String(row[SUB_COL_PACKAGE_ID] ?? '').trim()
  const addonRaw = String(row[SUB_COL_ADDON_IDS_RAW] ?? '').trim()
  const selectedAddonIds = addonRaw
    ? addonRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []
  const dateISO =
    submissionPreferredDateToISO(row[SUB_COL_DATE]) || String(row[SUB_COL_DATE] ?? '').trim()
  const fullDay = String(row[SUB_COL_FULL_DAY] ?? '').trim().toLowerCase() === 'yes'
  const timeLabel = String(row[SUB_COL_TIME_LABEL] ?? '').trim()
  let preferredTimeSlot = '10:00'
  if (!fullDay) {
    preferredTimeSlot = TIME_LABEL_TO_SLOT[timeLabel] || ''
  }
  const loc = String(row[SUB_COL_LOCATION] ?? '').trim()
  const locationMode = loc.startsWith('Shop') ? 'shop' : 'mobile'
  const vtLabel = String(row[5] ?? '').trim()
  const vehicleType = VEHICLE_LABEL_TO_TYPE[vtLabel] || 'car'

  const dismissedRaw = String(row[SUB_COL_DISMISSED] ?? '').trim()
  const dismissedPremiumIds = dismissedRaw
    ? dismissedRaw.split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean)
    : []

  const body = {
    clientReferenceId: String(row[SUB_COL_REF] ?? '').trim(),
    contact: {
      name: String(row[SUB_COL_NAME] ?? '').trim(),
      phone: String(row[SUB_COL_PHONE] ?? '').trim(),
      email: String(row[SUB_COL_EMAIL] ?? '').trim(),
      notes: String(row[SUB_COL_NOTES] ?? '').trim(),
    },
    vehicle: {
      type: vehicleType,
      description: String(row[6] ?? '').trim(),
    },
    selectedPackageId: pkgId,
    selectedAddonIds,
    dismissedPremiumIds,
    locationMode,
    preferredDate: dateISO,
    preferredTimeSlot,
    address: String(row[SUB_COL_ADDRESS] ?? '').trim(),
    parkingNotes: String(row[SUB_COL_PARKING] ?? '').trim(),
  }
  recomputeTotalsOnBody(body)
  return body
}

/**
 * Reserve calendar cells + append Submitted Requests. Rolls back calendar if log fails.
 * @returns {{ ok: true, row, date: dateISO, slots } | { ok: false, status, error }}
 */
async function confirmBookingOnCalendar(sheets, body) {
  const dateISO = normalizeToISODate(body.preferredDate)
  if (!dateISO) return { ok: false, status: 400, error: 'Invalid preferredDate' }
  const toReserve = slotsToReserve(body)
  if (!toReserve) return { ok: false, status: 400, error: 'Invalid or missing preferredTimeSlot' }

  const calRow = await findOrCreateDateRow(sheets, dateISO)
  const rows = await readCalendarRows(sheets)
  const parsed = parseRows(rows)
  const snap = parsed.find((p) => p.row === calRow && p.dateISO === dateISO)
  if (!snap) return { ok: false, status: 500, error: 'Row sync failed' }

  if (!canOccupy(snap.cells, toReserve)) {
    return { ok: false, status: 409, error: 'Selected slot(s) are no longer available.' }
  }

  const label = bookingLabelFromPayload(body)
  const updates = toReserve.map((slot) => ({ col: colForSlot(slot), value: label }))
  await updateCells(sheets, calRow, updates)

  try {
    const dataRow = buildSubmissionDataRow(body, label)
    await appendSubmittedRequestsDataRow(sheets, dataRow)
  } catch (logErr) {
    console.error(
      '[auto-glow] Submitted Requests write failed; rolling back calendar slots:',
      formatGoogleSheetsError(logErr),
    )
    try {
      const clearUpdates = toReserve.map((slot) => ({ col: colForSlot(slot), value: '' }))
      await updateCells(sheets, calRow, clearUpdates)
    } catch (rollbackErr) {
      console.error('[auto-glow] Calendar rollback failed — fix sheet manually:', rollbackErr)
    }
    return {
      ok: false,
      status: 503,
      error:
        'Could not save to Submitted Requests; calendar was not updated. Try again or fix the sheet.',
    }
  }

  return { ok: true, row: calRow, date: dateISO, slots: toReserve }
}

function slotsToReserve(body) {
  const ceramic = Array.isArray(body.selectedAddonIds) && body.selectedAddonIds.includes(CERAMIC_ADDON_ID)
  if (ceramic) return [...SLOTS]
  const t = body.preferredTimeSlot
  if (!SLOTS.includes(t)) return null
  return [t]
}

function canOccupy(cells, slotKeys) {
  for (const slot of slotKeys) {
    const k = classifyCell(cells[slot])
    if (k.kind !== 'empty') return false
  }
  return true
}

function timingSafePassword(expected, attempt) {
  const eh = crypto.createHash('sha256').update(String(expected), 'utf8').digest()
  const ah = crypto.createHash('sha256').update(String(attempt ?? ''), 'utf8').digest()
  return crypto.timingSafeEqual(eh, ah)
}

function requireAdmin(req, res, next) {
  if (!ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'Admin is not configured (set ADMIN_PASSWORD in .env).' })
  }
  if (req.signedCookies?.jag_admin === '1') return next()
  return res.status(401).json({ error: 'Unauthorized' })
}

function createApp() {
  const app = express()
  app.set('trust proxy', 1)
  app.use(rewriteNetlifyFunctionUrl)
  app.use(cors({ origin: true, credentials: true }))
  app.use(express.json({ limit: '256kb' }))
  app.use(cookieParser(COOKIE_SECRET))

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      runtime: process.env.AWS_LAMBDA_FUNCTION_NAME ? 'lambda' : 'node',
      /** Booleans only — use to verify Netlify injected env into the function (no secret values). */
      config: {
        adminPassword: Boolean((process.env.ADMIN_PASSWORD || '').trim()),
        sessionSecret: Boolean((process.env.SESSION_COOKIE_SECRET || '').trim()),
        sheetId: Boolean((process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '').trim()),
        googleCredentials: Boolean(loadServiceAccountCredentials()),
      },
    })
  })

  app.get('/api/availability', async (req, res) => {
    try {
      assertSheetsEnv()
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.message })
    }
    const dateISO = normalizeToISODate(req.query.date)
    if (!dateISO) return res.status(400).json({ error: 'Invalid or missing date' })
    try {
      const sheets = await getSheets()
      const snap = await getRowSnapshot(sheets, dateISO)
      const slots = {}
      for (const s of SLOTS) {
        if (!snap) {
          slots[s] = { status: 'free' }
        } else {
          const c = classifyCell(snap.cells[s])
          if (c.kind === 'empty') slots[s] = { status: 'free' }
          else if (c.kind === 'block') slots[s] = { status: 'block' }
          else slots[s] = { status: 'booked', label: c.label }
        }
      }
      return res.json({ date: dateISO, slots })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: err.message || 'Sheets error' })
    }
  })

  app.post('/api/loyalty/lookup', async (req, res) => {
    try {
      assertSheetsEnv()
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.message })
    }
    const rawPhone = typeof req.body?.phone === 'string' ? req.body.phone : ''
    const phoneKey = phoneDigitsKey(rawPhone)
    if (phoneKey.length < 7) {
      return res.status(400).json({ error: 'Enter a valid phone number (at least 7 digits).' })
    }
    try {
      const sheets = await getSheets()
      const values = await readSubmittedRequestsValues(sheets)
      const { anyRow, completedPunches, lastName, lastEmail } = loyaltySummarizeFromSubmittedRows(
        values,
        phoneKey,
      )
      const firstName = loyaltyFirstNameFromFullName(lastName)
      const punchesOnCard = Math.min(completedPunches, LOYALTY_MAX_PUNCHES)
      const nextDiscountPercent = loyaltyNextDiscountPercent(completedPunches)
      const message = loyaltyCelebrationMessage(
        anyRow,
        completedPunches,
        nextDiscountPercent,
        firstName,
      )
      return res.json({
        recognized: anyRow,
        completedPunches,
        punchesOnCard,
        maxPunches: LOYALTY_MAX_PUNCHES,
        nextDiscountPercent,
        firstName,
        /** Labels for the five milestones (visit pricing / reward ladder). */
        tierLabels: ['Regular price', '20% off', '30% off', '40% off', '50% off'],
        message,
        contactHint: {
          name: lastName,
          email: lastEmail,
        },
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: err.message || 'Loyalty lookup failed' })
    }
  })

  app.get('/api/calendar', async (req, res) => {
    try {
      assertSheetsEnv()
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.message })
    }
    const from = normalizeToISODate(req.query.from)
    const to = normalizeToISODate(req.query.to)
    if (!from || !to) return res.status(400).json({ error: 'Invalid or missing from / to' })
    if (from > to) return res.status(400).json({ error: 'from must be before to' })
    const days = enumerateDatesInclusive(from, to)
    if (days.length > 120) {
      return res.status(400).json({ error: 'Date range too large (max 120 days)' })
    }
    try {
      const sheets = await getSheets()
      const rows = await readCalendarRows(sheets)
      const parsed = parseRows(rows)
      const byDate = new Map(parsed.map((p) => [p.dateISO, p]))

      const result = days.map((dateISO) => {
        const snap = byDate.get(dateISO) ?? null
        const slots = {}
        let freeCount = 0
        for (const s of SLOTS) {
          let status = 'free'
          if (snap) {
            const c = classifyCell(snap.cells[s])
            if (c.kind === 'block') status = 'block'
            else if (c.kind === 'booked') status = 'booked'
          }
          slots[s] = { status }
          if (status === 'free') freeCount += 1
        }
        return {
          date: dateISO,
          slots,
          bookableStandard: freeCount > 0,
          bookableCeramic: freeCount === 3,
        }
      })
      return res.json({ days: result })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: err.message || 'Sheets error' })
    }
  })

  app.post('/api/bookings', async (req, res) => {
    try {
      assertSheetsEnv()
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.message })
    }
    const body = req.body
    if (!body?.contact?.name || !body?.preferredDate) {
      return res.status(400).json({ error: 'Missing required booking fields' })
    }
    const phoneDigits = String(body?.contact?.phone ?? '').replace(/\D/g, '')
    if (phoneDigits.length < 7) {
      return res.status(400).json({ error: 'A reachable phone number is required' })
    }
    const emailStr = String(body?.contact?.email ?? '').trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      return res.status(400).json({ error: 'A valid email is required' })
    }
    const dateISO = normalizeToISODate(body.preferredDate)
    if (!dateISO) return res.status(400).json({ error: 'Invalid preferredDate' })

    const toReserve = slotsToReserve(body)
    if (!toReserve) {
      return res.status(400).json({ error: 'Invalid or missing preferredTimeSlot' })
    }

    try {
      const sheets = await getSheets()
      const calRow = await findOrCreateDateRow(sheets, dateISO)
      const rows = await readCalendarRows(sheets)
      const parsed = parseRows(rows)
      const snap = parsed.find((p) => p.row === calRow && p.dateISO === dateISO)
      if (!snap) return res.status(500).json({ error: 'Row sync failed' })

      if (!canOccupy(snap.cells, toReserve)) {
        return res.status(409).json({ error: 'Selected slot(s) are no longer available.' })
      }

      const label = bookingLabelFromPayload(body)
      const baseRow = buildSubmissionDataRow(body, label)
      try {
        await appendRequestQueueDataRow(sheets, [...baseRow, 'Pending'])
      } catch (logErr) {
        console.error('[auto-glow] Requests Queue write failed:', formatGoogleSheetsError(logErr))
        return res.status(503).json({
          error:
            'We could not save your request. Please try again in a moment or call us.',
        })
      }

      return res.status(201).json({
        ok: true,
        pending: true,
        date: dateISO,
        slots: toReserve,
        message:
          'Request received — the owner will confirm your booking. Your time is not reserved on the calendar until then.',
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: err.message || 'Booking failed' })
    }
  })

  app.get('/api/admin/submissions-schema', requireAdmin, (_req, res) => {
    return res.json({ tab: SUBMISSIONS_TAB, headers: SUBMISSION_HEADERS })
  })

  app.post('/api/admin/append-submission-from-calendar', requireAdmin, async (req, res) => {
    try {
      assertSheetsEnv()
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.message })
    }
    const dateISO = normalizeToISODate(req.body?.date)
    const label = typeof req.body?.label === 'string' ? req.body.label.trim() : ''
    const slots = Array.isArray(req.body?.slots) ? req.body.slots : []
    if (!dateISO) return res.status(400).json({ error: 'Invalid or missing date' })
    if (!label) return res.status(400).json({ error: 'label is required' })
    if (slots.length === 0 || !slots.every((s) => typeof s === 'string' && SLOTS.includes(s))) {
      return res.status(400).json({ error: 'slots must be a non-empty array of 10:00, 14:00, and/or 16:00' })
    }
    const extras = {
      phone: typeof req.body?.phone === 'string' ? req.body.phone : '',
      email: typeof req.body?.email === 'string' ? req.body.email : '',
      notes: typeof req.body?.notes === 'string' ? req.body.notes : '',
    }
    try {
      const sheets = await getSheets()
      const dataRow = buildBackfillSubmissionRow(dateISO, label, slots, extras)
      await appendSubmittedRequestsDataRow(sheets, dataRow)
      return res.json({ ok: true, tab: SUBMISSIONS_TAB })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: formatGoogleSheetsError(err) || 'Append failed' })
    }
  })

  app.post('/api/admin/write-submissions-headers', requireAdmin, async (_req, res) => {
    try {
      assertSheetsEnv()
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.message })
    }
    try {
      const sheets = await getSheets()
      await writeSubmittedRequestsHeaderRow(sheets)
      return res.json({ ok: true, tab: SUBMISSIONS_TAB, columns: SUBMISSION_HEADERS.length })
    } catch (err) {
      console.error(err)
      return res.status(500).json({
        error:
          formatGoogleSheetsError(err) ||
          'Could not write headers (check tab name GOOGLE_SHEETS_SUBMISSIONS_TAB and service account access).',
      })
    }
  })

  async function handleAdminGetRequestQueue(_req, res) {
    try {
      assertSheetsEnv()
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.message })
    }
    try {
      const sheets = await getSheets()
      const { tab, pending } = await loadPendingRequestQueueForAdmin(sheets)
      return res.json({ tab, pending })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: err.message || 'Queue read failed' })
    }
  }

  app.get('/api/admin/request-queue', requireAdmin, handleAdminGetRequestQueue)
  /** Alias without hyphen (avoids rare proxy/path issues). */
  app.get('/api/admin/queue', requireAdmin, handleAdminGetRequestQueue)

  app.post('/api/admin/request-queue/accept', requireAdmin, async (req, res) => {
    try {
      assertSheetsEnv()
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.message })
    }
    const clientReferenceId = String(req.body?.clientReferenceId ?? '').trim()
    if (!clientReferenceId) {
      return res.status(400).json({ error: 'clientReferenceId is required' })
    }
    try {
      const sheets = await getSheets()
      const values = await readRequestQueueValues(sheets)
      const idx = findQueueRowIndexByRef(values, clientReferenceId)
      if (idx < 0) return res.status(404).json({ error: 'Queue entry not found' })
      const row = values[idx]
      const status = String(row[SUB_COL_STATUS] ?? '').trim().toLowerCase()
      if (status && status !== 'pending') {
        return res.status(409).json({ error: 'This request is not pending.' })
      }
      const body = bookingBodyFromSubmissionRow(row)
      const result = await confirmBookingOnCalendar(sheets, body)
      if (!result.ok) {
        return res.status(result.status).json({ error: result.error })
      }
      const up = await updateQueueRowStatus(sheets, clientReferenceId, 'Accepted')
      if (!up.ok) {
        console.error('[auto-glow] Queue status update failed after calendar confirm', clientReferenceId)
      }
      return res.json({
        ok: true,
        calendarRow: result.row,
        date: result.date,
        slots: result.slots,
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: err.message || 'Accept failed' })
    }
  })

  app.post('/api/admin/request-queue/decline', requireAdmin, async (req, res) => {
    try {
      assertSheetsEnv()
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.message })
    }
    const clientReferenceId = String(req.body?.clientReferenceId ?? '').trim()
    if (!clientReferenceId) {
      return res.status(400).json({ error: 'clientReferenceId is required' })
    }
    try {
      const sheets = await getSheets()
      const values = await readRequestQueueValues(sheets)
      const idx = findQueueRowIndexByRef(values, clientReferenceId)
      if (idx < 0) return res.status(404).json({ error: 'Queue entry not found' })
      const row = values[idx]
      const status = String(row[SUB_COL_STATUS] ?? '').trim().toLowerCase()
      if (status && status !== 'pending') {
        return res.status(409).json({ error: 'This request is not pending.' })
      }
      const up = await updateQueueRowStatus(sheets, clientReferenceId, 'Declined')
      if (!up.ok) return res.status(500).json({ error: up.error || 'Update failed' })
      return res.json({ ok: true })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: err.message || 'Decline failed' })
    }
  })

  app.get('/api/admin/me', (req, res) => {
    if (!ADMIN_PASSWORD) return res.status(503).json({ ok: false, configured: false })
    if (req.signedCookies?.jag_admin === '1') return res.json({ ok: true, configured: true })
    return res.status(401).json({ ok: false, configured: true })
  })

  app.post('/api/admin/login', (req, res) => {
    if (!ADMIN_PASSWORD) {
      return res.status(503).json({ error: 'ADMIN_PASSWORD not set' })
    }
    const pwd = String(req.body?.password ?? '').trim()
    if (!timingSafePassword(ADMIN_PASSWORD, pwd)) {
      return res.status(401).json({ error: 'Invalid password' })
    }
    res.cookie('jag_admin', '1', {
      httpOnly: true,
      signed: true,
      maxAge: 7 * 24 * 3600 * 1000,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
    return res.json({ ok: true })
  })

  app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('jag_admin', { signed: true, sameSite: 'lax' })
    res.json({ ok: true })
  })

  app.get('/api/admin/booking-contact', requireAdmin, async (req, res) => {
    try {
      assertSheetsEnv()
    } catch (e) {
      return res.status(e.status || 500).json({ error: e.message })
    }
    const dateISO = normalizeToISODate(req.query.date)
    const label = typeof req.query.label === 'string' ? req.query.label.trim() : ''
    const labelNorm = label ? normalizeCalendarLabelForMatch(label) : ''
    if (!dateISO || !label) {
      return res.status(400).json({ error: 'Query params date and label are required' })
    }
    try {
      const sheets = await getSheets()
      const safeSub = SUBMISSIONS_TAB.replace(/'/g, "''")
      const read = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${safeSub}'!A:AA`,
      })
      const values = read.data.values || []
      for (let i = values.length - 1; i >= SUBMISSIONS_HEADER_ROWS; i--) {
        const row = values[i]
        if (!row) continue
        const rowDate =
          submissionPreferredDateToISO(row[SUB_COL_DATE]) || String(row[SUB_COL_DATE] ?? '').trim()
        const rowLabelRaw = String(row[SUB_COL_CALENDAR_LABEL] ?? '').trim()
        const rowLabelNorm = rowLabelRaw ? normalizeCalendarLabelForMatch(rowLabelRaw) : ''
        if (rowDate === dateISO && rowLabelNorm === labelNorm) {
          return res.json({
            matched: true,
            phone: String(row[SUB_COL_PHONE] ?? '').trim(),
            email: String(row[SUB_COL_EMAIL] ?? '').trim(),
            name: String(row[SUB_COL_NAME] ?? '').trim(),
          })
        }
      }
      return res.status(404).json({
        matched: false,
        error:
          'No Submitted Requests row for this booking. Phone/email only exist there after a site booking or “Log to Submitted Requests”; the calendar cell itself does not store phone numbers.',
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: err.message || 'Lookup failed' })
    }
  })

  app.get('/api/admin/schedule', requireAdmin, async (_req, res) => {
    try {
      const sheets = await getSheets()
      const rows = await readCalendarRows(sheets)
      const parsed = parseRows(rows)
      const out = parsed.map((p) => ({
        date: p.dateISO,
        dateLabel: formatColumnADate(p.dateISO),
        row: p.row,
        slots: Object.fromEntries(
          SLOTS.map((s) => {
            const c = classifyCell(p.cells[s])
            let status = 'free'
            if (c.kind === 'block') status = 'block'
            else if (c.kind === 'booked') status = 'booked'
            return [s, c.kind === 'booked' ? { status, label: c.label } : { status }]
          }),
        ),
      }))
      let requestQueuePending = []
      let requestQueueError = null
      try {
        const q = await loadPendingRequestQueueForAdmin(sheets)
        requestQueuePending = q.pending
      } catch (queueErr) {
        console.error('[auto-glow] schedule: bundled request queue failed', queueErr)
        requestQueueError = queueErr.message || 'Queue read failed'
      }
      return res.json({
        tab: CALENDAR_TAB,
        rows: out,
        requestQueueTab: REQUEST_QUEUE_TAB,
        requestQueuePending,
        ...(requestQueueError ? { requestQueueError } : {}),
      })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: err.message || 'Sheets error' })
    }
  })

  app.post('/api/admin/slot', requireAdmin, async (req, res) => {
    const dateISO = normalizeToISODate(req.body?.date)
    const slot = req.body?.slot
    const action = req.body?.action
    if (!dateISO) return res.status(400).json({ error: 'Invalid date' })
    if (!['blockout', 'clear'].includes(action)) {
      return res.status(400).json({ error: 'action must be blockout or clear' })
    }
    const targets =
      slot === 'all' ? [...SLOTS] : SLOTS.includes(slot) ? [slot] : null
    if (!targets) return res.status(400).json({ error: 'Invalid slot' })

    try {
      const sheets = await getSheets()
      const row = await findOrCreateDateRow(sheets, dateISO)
      const snap = (await getRowSnapshot(sheets, dateISO)) || { cells: { '10:00': '', '14:00': '', '16:00': '' } }

      if (action === 'blockout') {
        const updates = targets.map((s) => ({ col: colForSlot(s), value: 'x' }))
        await updateCells(sheets, row, updates)
      } else {
        for (const s of targets) {
          const k = classifyCell(snap.cells[s])
          if (k.kind === 'booked') {
            return res.status(409).json({
              error:
                'That slot has a booking. Clear it in Google Sheets or remove the customer text first.',
            })
          }
        }
        const updates = targets.map((s) => ({ col: colForSlot(s), value: '' }))
        await updateCells(sheets, row, updates)
      }
      return res.json({ ok: true })
    } catch (err) {
      console.error(err)
      return res.status(500).json({ error: err.message || 'Update failed' })
    }
  })

  const distDir =
    [path.join(__dirname, '..', 'dist'), path.join(process.cwd(), 'dist')].find((p) =>
      fs.existsSync(p),
    ) || path.join(__dirname, '..', 'dist')

  function cacheHeadersForStaticFile(res, filepath) {
    const normalized = filepath.replace(/\\/g, '/')
    if (normalized.endsWith('/index.html') || normalized.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      res.setHeader('Pragma', 'no-cache')
      res.setHeader('Expires', '0')
    } else if (normalized.includes('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    }
  }

  // Vercel/Netlify serve dist/ from CDN; this process only handles /api/* in the function.
  const serveStatic =
    process.env.NODE_ENV === 'production' && fs.existsSync(distDir) && !isSplitStaticHost()

  if (serveStatic) {
    app.use(
      express.static(distDir, {
        setHeaders: (res, filepath) => cacheHeadersForStaticFile(res, filepath),
      }),
    )
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      res.setHeader('Pragma', 'no-cache')
      res.setHeader('Expires', '0')
      res.sendFile(path.join(distDir, 'index.html'))
    })
  }

  return app
}

function main() {
  const app = createApp()
  app.listen(PORT, () => {
    console.log(`[auto-glow] API http://localhost:${PORT}`)
    const distDir =
      [path.join(__dirname, '..', 'dist'), path.join(process.cwd(), 'dist')].find((p) =>
        fs.existsSync(p),
      ) || path.join(__dirname, '..', 'dist')
    if (process.env.NODE_ENV === 'production' && fs.existsSync(distDir)) {
      console.log('[auto-glow] Serving static from dist/')
    }
  })
}

export { createApp }

if (!isSplitStaticHost() && isExecutedDirectly()) {
  try {
    main()
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}
