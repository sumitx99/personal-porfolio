import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { careerChapters } from '../data'
import './Chapter.css'

const pad = (n) => String(n).padStart(2, '0')
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// "Aug 2025 — Jun 2026" → 11, counting both ends; "Present" means this month.
function monthsIn(period) {
  const [from, to] = period.split('—').map((s) => s.trim().toLowerCase())
  const parse = (s) => {
    if (s.startsWith('present')) {
      const d = new Date()
      return d.getFullYear() * 12 + d.getMonth()
    }
    const [m, y] = s.split(/\s+/)
    return Number(y) * 12 + MONTHS.indexOf(m.slice(0, 3))
  }
  return Math.max(1, parse(to) - parse(from) + 1)
}

function CountUp({ to }) {
  const [n, setN] = useState(reduced() ? to : 0)
  useEffect(() => {
    if (reduced()) return setN(to)
    let raf
    const start = performance.now()
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 1100)
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <>{pad(n)}</>
}

const spotlight = (e) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

function Explorer({ chapter }) {
  const [active, setActive] = useState(0)
  const [tool, setTool] = useState(null)
  const tabs = useRef([])
  const matches = (w) => !tool || w.uses.includes(tool)

  const pickTool = (t) => {
    const next = tool === t ? null : t
    setTool(next)
    if (next && !chapter.work[active].uses.includes(next)) setActive(chapter.work.findIndex((w) => w.uses.includes(next)))
  }

  const onKey = (e) => {
    const dir = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]
    if (!dir) return
    e.preventDefault()
    const next = (active + dir + chapter.work.length) % chapter.work.length
    setActive(next)
    tabs.current[next]?.focus()
  }

  return (
    <section className="ch-explore" id="ch-explore" aria-labelledby="ch-explore-title">
      <div className="ch-explore-head">
        <div>
          <span className="ch-kicker">What I built</span>
          <h2 id="ch-explore-title">
            {chapter.work.length} builds. <em>Pick one.</em>
          </h2>
        </div>
        <div className="ch-tools" role="group" aria-label="Filter by tool">
          {chapter.tags.map((t) => (
            <button key={t} type="button" aria-pressed={tool === t} onClick={() => pickTool(t)} className={tool === t ? 'is-on' : ''}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="ch-explore-grid">
        <div className="ch-nav">
        <div className="ch-tabs" role="tablist" aria-label="Builds" aria-orientation="vertical" onKeyDown={onKey}>
          {chapter.work.map((w, i) => (
            <button
              key={w.head}
              ref={(el) => (tabs.current[i] = el)}
              type="button"
              role="tab"
              id={`ch-tab-${i}`}
              aria-selected={i === active}
              aria-controls={`ch-panel-${i}`}
              tabIndex={i === active ? 0 : -1}
              className={`${i === active ? 'is-active' : ''} ${matches(w) ? '' : 'is-dim'}`}
              onClick={() => setActive(i)}
            >
              <span className="ch-tab-no">{pad(i + 1)}</span>
              <span className="ch-tab-name">
                {w.head}
                <small>{w.uses.join(' · ')}</small>
              </span>
              <span className="ch-tab-arrow" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
        <div className="ch-stepper">
          <div className="ch-stepper-bar" aria-hidden="true">
            <span style={{ transform: `scaleX(${(active + 1) / chapter.work.length})` }} />
          </div>
          <div className="ch-stepper-row">
            <span>
              Build {pad(active + 1)} <i>of {pad(chapter.work.length)}</i>
            </span>
            <div>
              <button type="button" aria-label="Previous build" onClick={() => setActive((active - 1 + chapter.work.length) % chapter.work.length)}>
                ←
              </button>
              <button type="button" aria-label="Next build" onClick={() => setActive((active + 1) % chapter.work.length)}>
                →
              </button>
            </div>
          </div>
        </div>
        </div>

        <div className="ch-stack">
          {chapter.work.map((item, idx) => (
            <div
              key={`${idx}-${idx === active}`}
              className={`ch-panel${idx === active ? ' is-on' : ''}`}
              role="tabpanel"
              id={`ch-panel-${idx}`}
              aria-labelledby={`ch-tab-${idx}`}
              aria-hidden={idx !== active}
              inert={idx === active ? undefined : ''}
              onPointerMove={spotlight}
            >
              <div className="ch-panel-top">
                <span className="ch-panel-no">{pad(idx + 1)}</span>
                <span className="ch-panel-count">
                  {pad(idx + 1)} / {pad(chapter.work.length)}
                </span>
              </div>
              <h3>{item.head}</h3>
              <p>{item.body}</p>

              <div className="ch-flow" aria-label="How it works">
                <span className="ch-flow-label">How it flows</span>
                <ol style={{ '--steps': item.flow.length }}>
                  {item.flow.map((step, i) => (
                    <li key={step} style={{ '--i': i }}>
                      <span className="ch-flow-dot" />
                      <span className="ch-flow-text">{step}</span>
                    </li>
                  ))}
                  <span className="ch-flow-pulse" aria-hidden="true" />
                </ol>
              </div>

              <div className="ch-panel-foot">
                <div className="ch-uses">
                  {item.uses.map((u) => (
                    <span key={u} className={u === tool ? 'is-on' : ''}>
                      {u}
                    </span>
                  ))}
                </div>
                {item.repos && (
                  <div className="ch-repos">
                    {item.repos.map((r) => (
                      <a key={r.href} href={r.href} target="_blank" rel="noreferrer">
                        <svg viewBox="0 0 16 16" aria-hidden="true">
                          <path
                            fill="currentColor"
                            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"
                          />
                        </svg>
                        {r.label} <span aria-hidden="true">↗</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function NextCard({ chapter, label, dir }) {
  const n = careerChapters.findIndex((c) => c.slug === chapter.slug) + 1
  return (
    <Link to={`/experience/${chapter.slug}`} className={`ch-next ch-next-${dir}`} onPointerMove={spotlight}>
      <span className="ch-kicker">{label}</span>
      <span className="ch-next-big">CH {pad(n)}</span>
      <strong>{chapter.title}</strong>
      <span className="ch-next-meta">{chapter.job.company}</span>
      <span className="ch-next-arrow" aria-hidden="true">
        {dir === 'prev' ? '←' : '→'}
      </span>
    </Link>
  )
}

export default function Chapter() {
  const { slug } = useParams()
  const index = careerChapters.findIndex((c) => c.slug === slug)
  const chapter = careerChapters[index]

  useEffect(() => {
    const previous = document.title
    document.title = chapter ? `${chapter.title} at ${chapter.job.company} · Sumit Kumar Ranjan` : 'Chapter not found · Sumit Kumar Ranjan'
    return () => {
      document.title = previous
    }
  }, [chapter])

  if (!chapter)
    return (
      <div className="page">
        <h1>This chapter isn’t written yet.</h1>
        <Link to="/#work" className="btn">
          Back to experience →
        </Link>
      </div>
    )

  const { job } = chapter
  const prev = careerChapters[index - 1]
  const next = careerChapters[index + 1]
  const isNow = job.current && chapter.slug === job.chapters[0].slug
  const host = job.url?.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
  const stats = [
    [monthsIn(chapter.period), 'Months'],
    [chapter.work.length, 'Builds'],
    [chapter.tags.length, 'Tools'],
  ]

  return (
    <article className="ch-page" key={slug}>
      <div className="ch-top">
        <Link to="/#work">← Back to experience</Link>
        <span>
          Chapter {pad(index + 1)} <i>of {pad(careerChapters.length)}</i>
        </span>
      </div>

      <nav className="ch-rail" aria-label="Career chapters" style={{ '--fill': careerChapters.length > 1 ? index / (careerChapters.length - 1) : 1 }}>
        <span className="ch-rail-track" aria-hidden="true">
          <span />
        </span>
        {careerChapters.map((c, i) => (
          <Link key={c.slug} to={`/experience/${c.slug}`} className={i === index ? 'is-current' : i < index ? 'is-past' : ''} aria-current={i === index ? 'page' : undefined}>
            <span className="ch-rail-dot" />
            <span className="ch-rail-no">CH {pad(i + 1)}</span>
            <span className="ch-rail-name">{c.title}</span>
            <span className="ch-rail-co">{c.job.company}</span>
          </Link>
        ))}
      </nav>

      <header className="ch-hero" onPointerMove={spotlight}>
        <div className="ch-hero-copy">
          <div className="ch-company">
            <span className="ch-company-name">{job.company}</span>
            {job.place && <span className="ch-dim">{job.place}</span>}
            {isNow && <span className="ch-now">Currently here</span>}
          </div>
          <h1>{chapter.title}</h1>
          <div className="ch-when">
            <span>{chapter.period}</span>
            {chapter.badge && <em>{chapter.badge}</em>}
          </div>
          <p className="ch-lede">{chapter.summary}</p>
          <div className="ch-ctas">
            <Link to="#ch-explore" className="ch-btn ch-btn-main">
              Explore the work <span aria-hidden="true">↓</span>
            </Link>
            {job.url && (
              <a href={job.url} target="_blank" rel="noreferrer" className="ch-btn">
                {host} <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        </div>

        <div className="ch-card" aria-hidden="true">
          <svg className="ch-ring" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="92" />
            <circle cx="100" cy="100" r="74" />
          </svg>
          <span className="ch-card-label">Chapter</span>
          <span className="ch-card-no">{pad(index + 1)}</span>
          <span className="ch-card-co">{job.company}</span>
        </div>

        <dl className="ch-stats">
          {stats.map(([value, label]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <CountUp to={value} />
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <Explorer chapter={chapter} />

      <footer className="ch-foot">
        {prev && <NextCard chapter={prev} label="Previous chapter" dir="prev" />}
        {next ? (
          <NextCard chapter={next} label="Next chapter" dir="next" />
        ) : (
          <Link to="/#projects" className="ch-next ch-next-next" onPointerMove={spotlight}>
            <span className="ch-kicker">That’s the story so far</span>
            <span className="ch-next-big">Next</span>
            <strong>See what I’ve shipped</strong>
            <span className="ch-next-meta">Projects</span>
            <span className="ch-next-arrow" aria-hidden="true">→</span>
          </Link>
        )}
      </footer>
    </article>
  )
}
