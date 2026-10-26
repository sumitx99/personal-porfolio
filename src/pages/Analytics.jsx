import { useEffect, useState } from 'react'
import { linkedinStats, profile } from '../data'
import { useReveal } from '../hooks'
import { PageHead } from '../components/SectionHead'
import SiteTraffic from '../components/SiteTraffic'
import ContributionGraph from '../components/ContributionGraph'
import { useCodolio } from '../codolio'

const CACHE_KEY = 'gh-stats-v1'

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    /* storage unavailable: just refetch next time */
  }
}

async function loadGithub(user) {
  const [u, repos] = await Promise.all([
    fetch(`https://api.github.com/users/${user}`).then((r) => {
      if (!r.ok) throw new Error(r.status)
      return r.json()
    }),
    fetch(`https://api.github.com/users/${user}/repos?per_page=100&sort=pushed`).then((r) => {
      if (!r.ok) throw new Error(r.status)
      return r.json()
    }),
  ])
  // Skip forks and the profile-README repo (named after the user).
  const own = repos.filter((r) => !r.fork && r.name.toLowerCase() !== user.toLowerCase())
  const langs = {}
  const years = {}
  own.forEach((r) => {
    if (r.language) langs[r.language] = (langs[r.language] || 0) + 1
    const y = r.created_at.slice(0, 4)
    years[y] = (years[y] || 0) + 1
  })
  return {
    repos: u.public_repos,
    followers: u.followers,
    since: u.created_at.slice(0, 4),
    stars: own.reduce((s, r) => s + r.stargazers_count, 0),
    languages: Object.entries(langs).sort((a, b) => b[1] - a[1]),
    years: Object.entries(years).sort((a, b) => a[0].localeCompare(b[0])),
    recent: own.slice(0, 6).map((r) => ({ name: r.name, url: r.html_url, lang: r.language, pushed: r.pushed_at })),
  }
}

function ago(iso) {
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000)
  if (days < 1) return 'today'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

// Horizontal bars, one hue: magnitude only, labelled directly, tooltip on hover.
function LanguageBars({ data }) {
  const total = data.reduce((s, [, n]) => s + n, 0)
  const max = data[0]?.[1] || 1
  const shown = data.slice(0, 7)
  const rest = data.slice(7).reduce((s, [, n]) => s + n, 0)
  const rows = rest ? [...shown, ['Other', rest]] : shown
  return (
    <div className="hbars" role="img" aria-label="Repositories by primary language">
      {rows.map(([lang, n]) => (
        <div className="hbar" key={lang} data-tip={`${lang}: ${n} repos · ${Math.round((n / total) * 100)}%`}>
          <span className="hbar-label">{lang}</span>
          <span className="hbar-track">
            <span className="hbar-fill" style={{ width: `${(n / max) * 100}%` }} />
          </span>
          <span className="hbar-value">{n}</span>
        </div>
      ))}
    </div>
  )
}

function YearColumns({ data }) {
  const max = Math.max(...data.map(([, n]) => n), 1)
  return (
    <div className="cols" role="img" aria-label="New repositories per year">
      {data.map(([y, n]) => (
        <div className="col" key={y} data-tip={`${y}: ${n} new repos`}>
          <span className="col-value">{n}</span>
          <span className="col-bar" style={{ height: `${(n / max) * 100}%` }} />
          <span className="col-label">{y}</span>
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const codolio = useCodolio()
  const [data, setData] = useState(readCache)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (data) return
    loadGithub(profile.githubUser)
      .then((d) => {
        writeCache(d)
        setData(d)
      })
      .catch(() => setError(true))
  }, [data])

  useReveal([data, error, codolio.status])

  const tiles = data
    ? [
        [data.repos, 'public repos'],
        [data.stars, 'stars earned'],
        [data.followers, 'GitHub followers'],
        [`’${data.since.slice(2)}`, 'coding on GitHub since'],
      ]
    : []

  return (
    <div className="page">
      <PageHead
        eyebrow={data ? 'Live from the GitHub API' : error ? 'GitHub is rate-limiting right now' : 'Fetching from GitHub…'}
        title="Analytics"
        intro="Who’s visiting this site, plus the numbers behind the work: what I build with, how often I ship, and what I touched last."
      />

      <SiteTraffic />

      <h2 className="sub-head">GitHub</h2>

      {error && (
        <p className="notice reveal">
          Couldn’t reach GitHub just now (it limits anonymous requests). The full picture is on{' '}
          <a href={profile.github} target="_blank" rel="noreferrer">
            github.com/{profile.githubUser} ↗
          </a>
        </p>
      )}

      {!data && !error && <div className="skeleton" aria-hidden="true" />}

      {data && (
        <>
          <div className="stat-tiles">
            {tiles.map(([n, l]) => (
              <div className="stat-tile reveal" key={l}>
                <strong>{n}</strong>
                <span>{l}</span>
              </div>
            ))}
          </div>

          <div className="chart-grid">
            <section className="chart-card reveal">
              <h3>Repos by language</h3>
              <p className="muted">Primary language of each original repository.</p>
              <LanguageBars data={data.languages} />
            </section>
            <section className="chart-card reveal">
              <h3>New repos per year</h3>
              <p className="muted">Original repositories created each year.</p>
              <YearColumns data={data.years} />
            </section>
          </div>

          {codolio.data?.dev?.activity && (
            <section className="chart-card reveal">
              <h3>Contribution graph</h3>
              <ContributionGraph activity={codolio.data.dev.activity} profileUrl={codolio.data.dev.url} />
            </section>
          )}

          <section className="chart-card reveal">
            <h3>Recently pushed</h3>
            <ul className="recent">
              {data.recent.map((r) => (
                <li key={r.name}>
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.name} ↗
                  </a>
                  <span className="muted">{r.lang || '—'}</span>
                  <span className="period">{ago(r.pushed)}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <h2 className="sub-head">LinkedIn snapshot</h2>
      <div className="stat-tiles">
        {linkedinStats.map(([n, l]) => (
          <div className="stat-tile reveal" key={l}>
            <strong>{n}</strong>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <p className="muted small-note">LinkedIn figures as of Oct 2026.</p>
    </div>
  )
}
