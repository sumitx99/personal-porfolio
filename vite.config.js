import { Buffer } from 'node:buffer'
import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In `npm run dev`, serve the server/ handlers at /api/* just like the hosts do. The handlers speak
// web-standard Request/Response, so this only converts Node's req/res at the edges.
const HANDLERS = { chat: 'chat', visits: 'visits', codolio: 'codolio' }

async function toRequest(req) {
  const url = new URL(req.originalUrl, `http://${req.headers.host}`)
  const headers = new Headers()
  Object.entries(req.headers).forEach(([k, v]) => v != null && headers.set(k, Array.isArray(v) ? v.join(', ') : v))
  let body
  if (!['GET', 'HEAD'].includes(req.method)) {
    const chunks = []
    for await (const c of req) chunks.push(c)
    body = Buffer.concat(chunks)
  }
  return new Request(url, { method: req.method, headers, body })
}

function devApi() {
  return {
    name: 'dev-api',
    configureServer(server) {
      for (const [name, fn] of Object.entries(HANDLERS)) {
        server.middlewares.use(`/api/${name}`, async (req, res) => {
          const mod = await server.ssrLoadModule(`/server/${name}.js`)
          const response = await mod[fn](await toRequest(req), process.env)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devApi()],
})
