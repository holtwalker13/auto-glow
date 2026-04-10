/**
 * Writes PACKAGES + ADDONS to the Google Sheet tab GOOGLE_SHEETS_PRICING_TAB (default "Pricing").
 * Requires .env: GOOGLE_SHEETS_SPREADSHEET_ID + service account credentials (same as the API).
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(root, '.env') })

const { seedPricingTabToSpreadsheet } = await import('../server/index.mjs')

try {
  const { tab, rows } = await seedPricingTabToSpreadsheet()
  console.log(`OK: wrote ${rows} rows to tab "${tab}".`)
} catch (e) {
  console.error(e?.message || e)
  process.exit(1)
}
