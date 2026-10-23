# Sumit Kumar Ranjan — Portfolio

React + Vite site with a Three.js (React Three Fiber) hero.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
```

- Content (projects, experience, skills, awards) lives in `src/data.js`.
- The 3D hero scene is `src/components/HeroScene.jsx`; it loads lazily and uses a lighter scene under 760px.
- Deploy: import the repo on Vercel (framework preset: Vite), no extra config needed.

## Chat assistant

The robot in the bottom-right corner answers questions about Sumit.

- **On Vercel:** `api/chat.js` calls Claude (`claude-opus-5-5`, low effort) with the portfolio data as its only source. Add `ANTHROPIC_API_KEY` under Project → Settings → Environment Variables, then redeploy.
- **Without a key (or in `npm run dev`):** the widget answers from `src/bot/knowledge.js` keyword matching, so it always works.
- To try the Claude version locally: `ANTHROPIC_API_KEY=... npm run dev`.

Certificate images live in `public/certs/`; add or replace one there and point its `image` field in `src/data.js` at it.
## Visitor analytics

The Analytics page shows visitors and page views (24H / 7D / 30D). Every page load posts to `api/visits.js` with a random per-browser id: no cookies, no IPs, no personal data.

- **On Vercel:** open the project → Storage → Create → Upstash Redis (free tier) and connect it to the project. That sets `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_*`), which the function picks up. Redeploy. Until then the page says counting isn't switched on.
- **Locally:** `npm run dev` counts in memory, so the chart works but resets when the dev server restarts.

# personal-porfolio
