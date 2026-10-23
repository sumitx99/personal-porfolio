// Cloudflare Pages adapter: the handler itself lives in server/codolio.js.
import { codolio } from '../../server/codolio.js'

export const onRequest = ({ request, waitUntil }) => codolio(request, { waitUntil })
