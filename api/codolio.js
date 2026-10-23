// Vercel serverless function: everything the Coding page shows, live from Codolio.
//   GET /api/codolio -> { profile, rank, solving, dev, awards, updated }
// Codolio's endpoints also return personal details (email, college, socials); only the fields
// below leave this function. Vercel's CDN caches the answer for a few hours.
import { coding } from '../src/data.js'

const KEY = encodeURIComponent(coding.handle)
const PLATFORMS = {
  leetcode: { name: 'LeetCode', short: 'LC', url: (h) => `https://leetcode.com/u/${h}/` },
  codechef: { name: 'CodeChef', short: 'CC', url: (h) => `https://www.codechef.com/users/${h}` },
  codestudio: { name: 'Code360', short: '360', url: (h) => `https://www.naukri.com/code360/profile/${h}` },
  geeksforgeeks: { name: 'GeeksforGeeks', short: 'GfG', url: (h) => `https://www.geeksforgeeks.org/user/${h}/` },
  codeforces: { name: 'Codeforces', short: 'CF', url: (h) => `https://codeforces.com/profile/${h}` },
}
const TOPIC_NAMES = { String: 'Strings', 'HashMap and Set': 'HashMap & Set', 'Greedy Algorithms': 'Greedy' }
const SKIP_TOPICS = new Set(['Algorithms'])
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s)

async function get(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) })
  if (!r.ok) throw new Error(`${url} ${r.status}`)
  const body = await r.json()
  return body?.data
}

function award(platform, b) {
  if (platform === 'leetcode') {
    const icon = b.icon?.startsWith('/') ? `https://leetcode.com${b.icon}` : b.icon
    return { name: b.displayName || b.shortName, icon, date: b.creationDate ? b.creationDate * 1000 : null }
  }
  if (platform === 'codestudio') return { name: `${cap(b.name)} · ${b.displayName}`, level: b.name }
  return { name: b.name, detail: b.displayName, icon: b.icon }
}

export function summarise(profiles) {
  const days = new Set()
  const topics = {}
  const difficulty = { Easy: 0, Medium: 0, Hard: 0 }
  const tags = new Set()
  const awards = []
  let solved = 0
  let cf = {}

  const platforms = profiles
    .filter((p) => PLATFORMS[p.platform])
    .map((p) => {
      const meta = PLATFORMS[p.platform]
      const q = p.totalQuestionStats || {}
      const stats = p.userStats || {}
      const n = q.totalQuestionCounts || 0
      solved += n
      difficulty.Easy += q.easyQuestionCounts || 0
      difficulty.Medium += q.mediumQuestionCounts || 0
      difficulty.Hard += q.hardQuestionCounts || 0
      // Active days are counted across all judges together: a day counts once however many you used.
      const cal = p.dailyActivityStatsResponse?.submissionCalendar || {}
      Object.entries(cal).forEach(([ts, count]) => count && days.add(new Date(ts * 1000).toISOString().slice(0, 10)))
      Object.entries(p.topicAnalysisStats?.topicWiseDistribution || {}).forEach(([t, c]) => {
        if (SKIP_TOPICS.has(t)) return
        const name = TOPIC_NAMES[t] || t
        topics[name] = (topics[name] || 0) + c
      })
      ;(stats.languageList || []).forEach((l) => tags.add(l))
      ;(p.platformDetails?.types || []).forEach((t) => tags.add(t))
      if (p.platform === 'codeforces') cf = { rating: stats.currentRating ?? null, title: stats.rank || null }
      const list = p.badgeStats?.badgeList || []
      if (list.length) awards.push({ platform: meta.name, items: list.map((b) => award(p.platform, b)) })
      return { name: meta.name, short: meta.short, url: meta.url(stats.handle), solved: n, verified: Boolean(p.isVerified) }
    })
  if (cf.title) tags.add(cf.title)

  let maxStreak = 0
  let run = 0
  let prev = null
  for (const d of [...days].sort()) {
    const t = Date.parse(d)
    run = prev != null && t - prev === 86400e3 ? run + 1 : 1
    maxStreak = Math.max(maxStreak, run)
    prev = t
  }

  return {
    solving: {
      solved,
      activeDays: days.size,
      maxStreak,
      cfRating: cf.rating ?? null,
      platforms: platforms.sort((a, b) => b.solved - a.solved),
      difficulty: Object.entries(difficulty),
      topics: Object.entries(topics)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 9),
      tags: [...tags],
    },
    awards,
  }
}

function development(gh) {
  if (!gh) return null
  return {
    github: gh.githubProfile,
    url: `https://github.com/${gh.githubProfile}`,
    activeDays: gh.totalActiveDays ?? 0,
    contributions: gh.totalContributions ?? 0,
    commits: gh.commitCounts ?? 0,
    stars: gh.stars ?? 0,
    prs: gh.pushRequestsCount ?? 0,
    // Daily contributions as [YYYY-MM-DD, count], only days with activity; `since` is where the data starts.
    activity: Object.entries(gh.developmentActivity || {})
      .filter(([, n]) => n > 0)
      .map(([ts, n]) => [new Date(ts * 1000).toISOString().slice(0, 10), n])
      .sort((a, b) => a[0].localeCompare(b[0])),
    since: (() => {
      const ts = Object.keys(gh.developmentActivity || {}).map(Number)
      return ts.length ? new Date(Math.min(...ts) * 1000).toISOString().slice(0, 10) : null
    })(),
    // Languages by bytes of code, biggest first.
    languages: Object.entries(gh.languageDistributions || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([l]) => l),
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  try {
    const [user, gh] = await Promise.all([
      get(`https://api.codolio.com/profile?userKey=${KEY}`),
      get(`https://api.codolio.com/github/profile?userKey=${KEY}`).catch(() => null),
    ])
    const profiles = user?.platformProfiles?.platformProfiles
    if (!Array.isArray(profiles) || !profiles.length) throw new Error('codolio shape')
    const board = await get(`https://node.codolio.com/api/leaderboard/v1/get-user-leaderboard?userId=${user.id}`).catch(() => null)
    const handle = user.profileName || coding.handle
    res.statusCode = 200
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400')
    res.end(
      JSON.stringify({
        profile: {
          name: [user.firstName, user.secondName].filter(Boolean).join(' '),
          handle,
          photo: user.imageUrl || null,
          url: `https://codolio.com/profile/${handle}`,
          card: `https://codolio.com/profile/${handle}/card`,
        },
        // "1" is Codolio's overall C-Score board, the rank shown on the profile.
        rank: board?.global?.['1']?.rank ?? null,
        ...summarise(profiles),
        dev: development(gh),
        updated: new Date().toISOString(),
      }),
    )
  } catch {
    res.statusCode = 502
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify({ error: 'unavailable' }))
  }
}
