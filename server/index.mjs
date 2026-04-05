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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
const CALENDAR_TAB = (process.env.GOOGLE_SHEETS_CALENDAR_TAB || 'Booking Calendar').trim()
const HEADER_ROW_COUNT = Math.max(0, parseInt(process.env.GOOGLE_SHEETS_HEADER_ROWS || '1', 10))
/** Full form submissions log (same spreadsheet). Default tab name matches typical sheet title. */
const SUBMISSIONS_TAB = (process.env.GOOGLE_SHEETS_SUBMISSIONS_TAB || 'Submitted Requests').trim()
const SUBMISSIONS_HEADER_ROWS = Math.max(0, parseInt(process.env.GOOGLE_SHEETS_SUBMISSIONS_HEADER_ROWS || '1', 10))

/** Column index (0-based) for admin phone lookup */
const SUB_COL_DATE = 17
const SUB_COL_CALENDAR_LABEL = 24
const SUB_COL_PHONE = 3
const SUB_COL_EMAIL = 4
const SUB_COL_NAME = 2

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
}

const PACKAGE_NAMES = {
  'interior-detail': 'Interior Detail',
  'exterior-detail': 'Exterior Detail',
  'full-detail': 'Full Detail',
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
])

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
      const row = await findOrCreateDateRow(sheets, dateISO)
      const rows = await readCalendarRows(sheets)
      const parsed = parseRows(rows)
      const snap = parsed.find((p) => p.row === row && p.dateISO === dateISO)
      if (!snap) return res.status(500).json({ error: 'Row sync failed' })

      if (!canOccupy(snap.cells, toReserve)) {
        return res.status(409).json({ error: 'Selected slot(s) are no longer available.' })
      }

      const label = bookingLabelFromPayload(body)
      const updates = toReserve.map((slot) => ({ col: colForSlot(slot), value: label }))
      await updateCells(sheets, row, updates)

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
          await updateCells(sheets, row, clearUpdates)
        } catch (rollbackErr) {
          console.error('[auto-glow] Calendar rollback failed — fix sheet manually:', rollbackErr)
        }
        return res.status(503).json({
          error:
            'We could not save your contact details to our log, so your time was not held. Please try again in a moment or call us.',
        })
      }

      return res.status(201).json({ ok: true, row, date: dateISO, slots: toReserve })
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
      return res.json({ tab: CALENDAR_TAB, rows: out })
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

if (!isSplitStaticHost()) {
  try {
    main()
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}
