import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In `npm run dev`, serve api/chat.js the way Vercel does, but only when an API key is set;
// without one the chat widget falls back to its local answers.
function devApi() {
  return {
    name: 'dev-api',
    configureServer(server) {
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
