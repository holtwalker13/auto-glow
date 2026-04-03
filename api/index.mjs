/**
 * Vercel serverless entry: full Express app (Sheets API + production static from dist/).
 * Rewrites in vercel.json send all routes here.
 */
import { createApp } from '../server/index.mjs'

export default createApp()
