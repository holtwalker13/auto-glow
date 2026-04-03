import serverless from 'serverless-http'
import { createApp } from '../../server/index.mjs'

const app = createApp()
export const handler = serverless(app)
