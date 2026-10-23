// Cloudflare Pages adapter: the handler itself lives in server/visits.js.
import { visits } from '../../server/visits.js'

export const onRequest = ({ request, env }) => visits(request, env)
