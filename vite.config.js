import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In `npm run dev`, serve the api/ functions the way Vercel does. Chat only runs when an API key is
// set; without one the chat widget falls back to its local answers.
function devApi() {
  return {
    name: 'dev-api',
    configureServer(server) {
      for (const name of ['visits', 'codolio']) {
        server.middlewares.use(`/api/${name}`, async (req, res) => {
          const { default: handler } = await server.ssrLoadModule(`/api/${name}.js`)
          req.url = req.originalUrl
          await handler(req, res)
        })
      }
      if (!process.env.ANTHROPIC_API_KEY) return
      server.middlewares.use('/api/chat', async (req, res) => {
        const { default: handler } = await server.ssrLoadModule('/api/chat.js')
        await handler(req, res)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devApi()],
})
