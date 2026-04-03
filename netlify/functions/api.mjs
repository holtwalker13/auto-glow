import serverless from 'serverless-http'
import { createApp } from '../../server/index.mjs'

const app = createApp()
const run = serverless(app)

export const handler = async (event, context) => {
  try {
    return await run(event, context)
  } catch (err) {
    console.error('[netlify api]', err)
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: err?.message || 'Server error' }),
    }
  }
}
