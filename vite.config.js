import { Buffer } from 'node:buffer'
import process from 'node:process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
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

// In `npm run dev`, serve public/journey/index.html at the clean /journey/ URL, like the hosts do,
// instead of falling back to the React app. The page gets Vite's client injected so that editing any
// file under public/journey/ reloads it automatically (public files are otherwise outside HMR).
function journeyIndex() {
  return {
    name: 'journey-index',
    configureServer(server) {
      const dir = resolve(server.config.publicDir, 'journey')
      server.watcher.add(dir)
      server.watcher.on('change', (file) => {
        if (file.startsWith(dir)) server.ws.send({ type: 'full-reload', path: '/journey/index.html' })
      })
      server.middlewares.use(async (req, res, next) => {
        const [path, query = ''] = req.url.split('?')
        if (path === '/journey') {
          res.statusCode = 301
          res.setHeader('Location', `/journey/${query && `?${query}`}`)
          return res.end()
        }
        if (path !== '/journey/' && path !== '/journey/index.html') return next()
        try {
          const html = await readFile(resolve(dir, 'index.html'), 'utf8')
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.setHeader('Cache-Control', 'no-cache')
          res.end(await server.transformIndexHtml('/journey/', html))
        } catch (error) {
          next(error)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devApi(), journeyIndex()],
})
