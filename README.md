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
# personal-porfolio
