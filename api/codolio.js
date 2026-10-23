// Vercel adapter: the handler itself lives in server/codolio.js.
import { codolio } from '../server/codolio.js'

export const GET = (request) => codolio(request)
