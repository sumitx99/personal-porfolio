# Sumit Kumar Ranjan — Portfolio

React + Vite site with a Three.js (React Three Fiber) hero.

```bash
npm install
npm run dev      # http://localhost:5173 (the /api/* handlers run too)
npm run build    # outputs dist/
```

- Content (projects, experience, skills, awards) lives in `src/data.js`.
- The 3D hero scene is `src/components/HeroScene.jsx`; it loads lazily and uses a lighter scene under 760px.
- Certificate images live in `public/certs/`; add or replace one there and point its `image` field in `src/data.js` at it.

## Server endpoints (any host)

Three small endpoints back the site. Their code lives in `server/` and only uses web-standard
`Request`/`Response`, so the same code runs everywhere; each host gets a one-line wrapper:

| Endpoint | Handler | What it does | Needs |
|---|---|---|---|
| `POST /api/chat` | `server/chat.js` | Chat robot answers with Claude (`claude-opus-5-5`) | `ANTHROPIC_API_KEY` (optional: without it the robot answers from `src/bot/knowledge.js`) |
| `GET/POST /api/visits` | `server/visits.js` | Visitor and page-view counter on Analytics | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (optional: without them it counts in memory and resets) |
| `GET /api/codolio` | `server/codolio.js` | Live Coding page, awards and contribution graph from Codolio, cached 6 h | nothing |

| Host | Wrapper files | Notes |
|---|---|---|
| Cloudflare Workers | `worker/index.js` + `wrangler.jsonc` | Build command `npm run build`, deploy command `npx wrangler deploy`. `name` in `wrangler.jsonc` must match the Worker's name in the dashboard. Add the variables under the Worker → Settings → Variables and Secrets. |
| Cloudflare Pages | `functions/api/*.js` | Build command `npm run build`, output `dist`. Add the variables under Settings → Variables and Secrets. |
| Vercel | `api/*.js` + `vercel.json` | Framework preset Vite. Add the variables under Settings → Environment Variables. |
| Netlify | `netlify/functions/*.mjs` + `netlify.toml` | Settings come from `netlify.toml`. Add the variables under Site configuration → Environment variables. |
| `npm run dev` | `vite.config.js` | Reads variables from your shell, e.g. `ANTHROPIC_API_KEY=... npm run dev`. |

Each host only reads its own wrapper folder and ignores the others, so all of them can stay in the repo.
Redeploy after changing variables.

**Upstash Redis (visitor counter):** create a free database at upstash.com, open its REST API section
and copy the URL and token into the two variables above. Vercel's Storage → Upstash integration sets
`KV_REST_API_URL` / `KV_REST_API_TOKEN`, which work too.

Keys never go in the repo: `.env` files are git-ignored.
