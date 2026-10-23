// Vercel serverless function: counts visitors and page views, and serves them to the Analytics page.
//   POST /api/visits            { path, vid }   -> records one page view
//   GET  /api/visits?range=7d   (24h | 7d | 30d) -> series + totals vs the previous period
// Storage is Upstash Redis over its REST API (free tier). Connect it from the Vercel dashboard
// (Storage -> Upstash Redis), which sets the env vars below. Without them it counts in memory,
// which is fine for `npm run dev` but resets on every deploy.
import { Buffer } from 'node:buffer'
import process from 'node:process'

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|vercel/i
const DAY_TTL = 70 * 86400
const HOUR_TTL = 3 * 86400

// --- tiny store: Redis pipeline when configured, in-memory otherwise ---------------------------
const mem = { n: new Map(), sets: new Map() }

async function run(commands) {
  if (URL_ && TOKEN) {
    const r = await fetch(`${URL_}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
    })
    if (!r.ok) throw new Error(`redis ${r.status}`)
    return (await r.json()).map((x) => x.result)
  }
  return commands.map(([cmd, ...args]) => {
    if (cmd === 'INCR') return mem.n.set(args[0], (mem.n.get(args[0]) || 0) + 1).get(args[0])
    if (cmd === 'PFADD') {
      const s = mem.sets.get(args[0]) || new Set()
      args.slice(1).forEach((v) => s.add(v))
      return mem.sets.set(args[0], s) && 1
    }
    if (cmd === 'MGET') return args.map((k) => mem.n.get(k) ?? null)
    if (cmd === 'PFCOUNT') return new Set(args.flatMap((k) => [...(mem.sets.get(k) || [])])).size
    return null // EXPIRE: memory never outlives the process anyway
  })
}

// --- time buckets (UTC) -----------------------------------------------------------------------
const dayKey = (d) => d.toISOString().slice(0, 10)
const hourKey = (d) => d.toISOString().slice(0, 13)

function buckets(range, now = new Date()) {
  const hourly = range === '24h'
  const count = hourly ? 24 : range === '30d' ? 30 : 7
  const step = hourly ? 3600e3 : 86400e3
  const make = (offset) =>
    [...Array(count)].map((_, i) => {
      const d = new Date(now.getTime() - (offset + count - 1 - i) * step)
      return { id: hourly ? hourKey(d) : dayKey(d), t: d.getTime() }
    })
  return { hourly, current: make(0), previous: make(count) }
}

async function record(path, vid) {
  const now = new Date()
  const keys = [
    [`v:d:${dayKey(now)}`, `u:d:${dayKey(now)}`, DAY_TTL],
    [`v:h:${hourKey(now)}`, `u:h:${hourKey(now)}`, HOUR_TTL],
  ]
  const cmds = keys.flatMap(([v, u, ttl]) => [
    ['INCR', v],
    ['EXPIRE', v, ttl],
    ['PFADD', u, vid],
    ['EXPIRE', u, ttl],
  ])
  cmds.push(['INCR', 'v:all'], ['PFADD', 'u:all', vid], ['INCR', `p:${path}`])
  await run(cmds)
}

async function stats(range) {
  const { hourly, current, previous } = buckets(range)
  const p = hourly ? 'h' : 'd'
  const views = (list) => ['MGET', ...list.map((b) => `v:${p}:${b.id}`)]
  const uniq = (list) => ['PFCOUNT', ...list.map((b) => `u:${p}:${b.id}`)]
  const [curViews, prevViews, curUniq, prevUniq, allViews, allUniq, ...perBucket] = await run([
    views(current),
    views(previous),
    uniq(current),
    uniq(previous),
    ['MGET', 'v:all'],
    ['PFCOUNT', 'u:all'],
    ...current.map((b) => ['PFCOUNT', `u:${p}:${b.id}`]),
  ])
  const sum = (a) => a.reduce((s, n) => s + Number(n || 0), 0)
  return {
    stored: Boolean(URL_ && TOKEN),
    range,
    hourly,
    series: current.map((b, i) => ({ t: b.t, views: Number(curViews[i] || 0), visitors: Number(perBucket[i] || 0) })),
    views: sum(curViews),
    visitors: curUniq,
    prevViews: sum(prevViews),
    prevVisitors: prevUniq,
    allViews: Number(allViews[0] || 0),
    allVisitors: allUniq,
  }
}

async function readBody(req) {
  if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const chunks = []
  for await (const c of req) chunks.push(c)
  return JSON.parse(Buffer.concat(chunks).toString() || '{}')
}

function send(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const { path, vid } = await readBody(req)
      // Visitor ids are random strings made in the browser: no cookies, IPs or personal data stored.
      const ok = typeof vid === 'string' && /^[a-z0-9-]{8,40}$/i.test(vid) && typeof path === 'string'
      if (ok && !BOT.test(req.headers['user-agent'] || '')) await record(path.slice(0, 60).replace(/[^\w/-]/g, ''), vid)
      return send(res, 200, { ok: true })
    }
    if (req.method === 'GET') {
      const range = new URL(req.url, 'http://x').searchParams.get('range')
      return send(res, 200, await stats(['24h', '7d', '30d'].includes(range) ? range : '7d'))
    }
    send(res, 405, { error: 'method' })
  } catch {
    send(res, 500, { error: 'unavailable' })
  }
}
