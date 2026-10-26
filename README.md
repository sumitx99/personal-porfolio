# Sumit Kumar Ranjan — Portfolio

React + Vite site with a Three.js (React Three Fiber) hero.

```bash
npm install
npm run dev      # http://localhost:5173 (the /api/* handlers run too)
npm run build    # outputs dist/
```

- Content (projects, experience, skills, awards) lives in `src/data.js`.
- The 3D hero scene is `src/components/HeroScene.jsx`; it loads lazily and adapts its framing under 760px while keeping the same detail.
- Certificate images live in `public/certs/`; add or replace one there and point its `image` field in `src/data.js` at it.

## Resume download

The Home hero and footer download `public/resume/Sumit_Kumar_Ranjan_Resume.pdf`.
The download URL is configured once as `profile.resume` in `src/data.js`. The served
PDF is the user-supplied resume, copied unchanged. To update it, replace that PDF;
the LaTeX file in `docs/resume/` is not compiled automatically.

`npm run build` checks that the resume exists and has a PDF header, then copies it
into the published site automatically. A missing PDF fails the build instead of
shipping a download link that returns the HTML fallback.

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

## Three.js performance

See [the performance notes](docs/three-performance.md) for the implementation, measured results,
quality settings, and the Windows/phone verification procedure.

```bash
npm test             # race behavior + geometry/normal/UV preservation + dynamic hoses
npm run audit:three  # decode actual compressed GLBs; check batching preserves triangles and bounds
```

Open a route with `?perf=1` to enable local render counters on its canvas's
`data-render-metrics` attribute. Diagnostics send no network requests.

## Asset and data credits

- Coding stats, badges, profile and contribution data: [Codolio](https://codolio.com/profile/sumit09).
- [Gaming Desktop PC](https://sketchfab.com/3d-models/gaming-desktop-pc-d1d8282c9916438091f11aeb28787b66) by [Yolala1232](https://sketchfab.com/Yolala1232), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); compressed for the web.
- Car models by [Dave Love (Tyler_Dave)](https://sketchfab.com/Tyler_Dave) and [Abu Saif](https://sketchfab.com/abuhossain844), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Individual source links are retained in `src/f1.js`. Models are compressed for the web; Williams FW48 is a repainted Mercedes W17 model.
- [Marina Bay Street Circuit](https://sketchfab.com/3d-models/marina-bay-street-circuit-e665d831c57546609d4c15287a6107b7) by Dave Love, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); compressed for the web.
- Pit crew: Mixamo character from the three.js examples.
- Pit-lane and garage-floor textures: [Poly Haven](https://polyhaven.com/a/asphalt_pit_lane), CC0.

Team names and liveries belong to their owners. The garage is a fan project, not affiliated with F1 or any team.
