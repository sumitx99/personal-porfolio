// Cloudflare Workers entry (`wrangler deploy`): /api/* goes to the server/ handlers, everything else
// is the built site in dist/, with unknown paths falling back to index.html (see wrangler.jsonc).
import { chat } from '../server/chat.js'
import { codolio } from '../server/codolio.js'
import { visits } from '../server/visits.js'
import { json } from '../server/http.js'

const routes = {
  '/api/chat': (request, env) => chat(request, env),
  '/api/visits': (request, env) => visits(request, env),
  '/api/codolio': (request, env, ctx) => codolio(request, { waitUntil: (p) => ctx.waitUntil(p) }),
}

export default {
  fetch(request, env, ctx) {
    const { pathname } = new URL(request.url)
    const route = routes[pathname]
    if (route) return route(request, env, ctx)
    if (pathname.startsWith('/api/')) return json({ error: 'not found' }, 404)
    return env.ASSETS.fetch(request)
  },
}
