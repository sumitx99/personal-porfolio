// Shared helpers for the server handlers. Everything here is web-standard (fetch, Request,
// Response), so the same code runs on Vercel, Cloudflare Pages, Netlify and the Vite dev server.
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  })
}
