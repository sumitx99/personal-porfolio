import { lazy, Suspense, useEffect, useState } from 'react'
import { coding } from '../data'
import { useIsSmall, useReveal } from '../hooks'
import { PageHead } from '../components/SectionHead'
import { useCodolio } from '../codolio'

const DesktopPC = lazy(() => import('../components/DesktopPC'))

const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US'))
const listNames = (names) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0] || '')

function CopyLink({ url }) {
  const [copied, setCopied] = useState(false)
  const copy = () =>
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    })
  return (
    <button className="btn btn-ghost" onClick={copy}>
      {copied ? 'Link copied ✓' : 'Copy card link'}
    </button>
  )
}

function Verified() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-label="Verified">
      <path fill="var(--accent)" d="M12 1.5l2.6 2 3.2-.3 1 3.1 2.7 1.8-1 3.1 1 3.1-2.7 1.8-1 3.1-3.2-.3-2.6 2-2.6-2-3.2.3-1-3.1-2.7-1.8 1-3.1-1-3.1 2.7-1.8 1-3.1 3.2.3z" />
      <path d="M8 12.2l2.7 2.7L16.2 9.4" fill="none" stroke="var(--accent-ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// One face of the card. Both faces share the header, avatar and name; the rest differs.
function CardFace({ data, kind, stats, find, tags }) {
  const { profile, rank } = data
  return (
    <article className="ccard">
      <header className="ccard-top">
        <span className="ccard-brand">
          sk<b>.</b> {kind} card
        </span>
        {rank != null && <span className="ccard-rank">#{fmt(rank)}</span>}
      </header>
      <div className="ccard-avatar">
        <img src="/coding-profile.jpg" alt={profile.name} width="132" height="132" loading="lazy" />
        <span aria-hidden="true">{kind === 'dev' ? '{ }' : '</>'}</span>
      </div>
      <h3>
        {profile.name}
        <Verified />
      </h3>
      <span className="ccard-handle">@{profile.handle}</span>
      <div className="ccard-stats">
        {stats.map(([l, n]) => (
          <div key={l}>
            <span>{l}</span>
            <strong>{fmt(n)}</strong>
          </div>
        ))}
      </div>
      <div className="ccard-find">
        <span>You can find me on</span>
        <div>{find}</div>
      </div>
      {tags.length > 0 && (
        <div className="ccard-tags">
          {tags.map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </div>
      )}
    </article>
  )
}

// Codolio-style card that flips between problem solving and development, like their share card.
function FlipCard({ data, side, onFlip }) {
  const { solving, dev } = data
  const back = side === 'dev'
  return (
    <div className="flip" onClick={() => dev && onFlip(back ? 'solving' : 'dev')}>
      <div className={`flip-inner ${back ? 'flipped' : ''}`}>
        <div className="flip-face" aria-hidden={back} {...(back ? { inert: '' } : {})}>
          <CardFace
            data={data}
            kind="coding"
            stats={[
              ['Questions solved', solving.solved],
              ['Active days', solving.activeDays],
            ]}
            find={solving.platforms.map((p) => (
              <a key={p.name} href={p.url} target="_blank" rel="noreferrer" title={`${p.name} · ${p.solved} solved`} aria-label={p.name} onClick={(e) => e.stopPropagation()}>
                {p.short}
              </a>
            ))}
            tags={solving.tags}
          />
        </div>
        {dev && (
          <div className="flip-face flip-back" aria-hidden={!back} {...(!back ? { inert: '' } : {})}>
            <CardFace
              data={data}
              kind="dev"
              stats={[
                ['Active days', dev.activeDays],
                ['Contributions', dev.contributions],
              ]}
              find={
                <a className="ccard-gh" href={dev.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 014 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"
                    />
                  </svg>
                  {dev.github}
                </a>
              }
              tags={dev.languages}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Code360 badges come without artwork, so they get a hexagon drawn here: crown for Achiever, star for Specialist.
function HexBadge({ level, size = 64 }) {
  const achiever = level === 'achiever'
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className={`hexbadge ${achiever ? 'is-achiever' : ''}`}>
      <path d="M32 3l25 14.5v29L32 61 7 46.5v-29z" />
      <path className="hex-inner" d="M32 9l20 11.6v22.8L32 55 12 43.4V20.6z" />
      {achiever ? (
        <path className="hex-mark" d="M20 41h24l2.2-15-8.7 6.4L32 21.5l-5.5 10.9-8.7-6.4z" />
      ) : (
        <path className="hex-mark" d="M32 19l3.9 8.2 9 1.1-6.6 6.2 1.7 8.9L32 39l-8 4.4 1.7-8.9-6.6-6.2 9-1.1z" />
      )}
    </svg>
  )
}

function BadgeArt({ award, size }) {
  return award.icon ? (
    <img src={award.icon} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer" />
  ) : (
    <HexBadge level={award.level} size={size} />
  )
}

const rankOf = (a) => (a.icon ? 0 : a.level === 'achiever' ? 1 : 2)
const badgeLabel = (a) => (a.level ? `${a.level[0].toUpperCase()}${a.level.slice(1)} - ${a.name.split(' · ').pop()}` : a.name)
const badgeDate = (a) => (a.date ? new Date(a.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null)

// Codolio-style awards: a compact card with a row of badges; "View all" opens every badge by platform.
function Awards({ awards }) {
  const [open, setOpen] = useState(false)
  const all = awards.flatMap((g) => g.items)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])
  if (!all.length) return null
  // Badges with their own artwork first, then Achiever, then Specialist.
  const preview = [...all].sort((a, b) => rankOf(a) - rankOf(b)).slice(0, 8)
  return (
    <>
      <section className="awards-card reveal">
        <header>
          <div>
            <h2>Awards</h2>
            <strong>{all.length}</strong>
          </div>
          <button className="awards-expand" onClick={() => setOpen(true)} aria-label="View all awards">
            View all
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" />
            </svg>
          </button>
        </header>
        <button className="awards-row" onClick={() => setOpen(true)} aria-label="Open all awards">
          {preview.map((a, i) => (
            <span key={i} className="awards-mini" title={badgeLabel(a)}>
              <BadgeArt award={a} size={52} />
            </span>
          ))}
          {all.length > preview.length && <span className="awards-more">+{all.length - preview.length}</span>}
        </button>
      </section>

      {open && (
        <div className="awards-modal" role="dialog" aria-modal="true" aria-label={`Awards (${all.length})`} onClick={() => setOpen(false)} data-lenis-prevent>
          <div className="awards-panel" onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>
                Awards <span>({all.length})</span>
              </h2>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </header>
            <div className="awards-body">
              {awards.map((g) => (
                <section key={g.platform}>
                  <h3>{g.platform}</h3>
                  <ul>
                    {[...g.items].sort((a, b) => rankOf(a) - rankOf(b)).map((a, i) => (
                      <li key={i} title={a.detail || badgeLabel(a)}>
                        <BadgeArt award={a} size={72} />
                        <strong>{badgeLabel(a)}</strong>
                        {badgeDate(a) && <small>{badgeDate(a)}</small>}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function Coding() {
  const small = useIsSmall()
  const { status, data } = useCodolio()
  const [side, setSide] = useState('solving')
  useReveal([status])
  const profileUrl = data?.profile.url || `https://codolio.com/profile/${coding.handle}`

  const solving = data?.solving
  const max = solving ? Math.max(1, ...solving.platforms.map((p) => p.solved)) : 1
  const total = solving ? solving.difficulty.reduce((s, [, n]) => s + n, 0) : 0

  return (
    <div className="page">
      <div className="coding-hero">
        <PageHead
          eyebrow={
            status === 'ready'
              ? data.rank != null
                ? `Global rank #${fmt(data.rank)} on Codolio`
                : 'Live from Codolio'
              : status === 'loading'
                ? 'Fetching live from Codolio…'
                : 'Codolio is unreachable right now'
          }
          title="Coding"
          intro={
            solving
              ? `Daily DSA practice across ${solving.platforms.length} judges — ${listNames(solving.platforms.map((p) => p.name))}.`
              : 'Daily DSA practice across coding judges, tracked live on Codolio.'
          }
        />
        <div className="coding-pc" aria-label="3D model of a gaming desk setup, drag to rotate">
          <Suspense fallback={null}>
            <DesktopPC small={small} />
          </Suspense>
        </div>
      </div>

      {status === 'loading' && <div className="skeleton" aria-hidden="true" />}
      {status === 'error' && (
        <p className="notice">
          Couldn’t reach Codolio just now. The full, up-to-date profile is on{' '}
          <a href={profileUrl} target="_blank" rel="noreferrer">
            codolio.com/profile/{coding.handle} ↗
          </a>
        </p>
      )}

      {solving && (
        <>
          <div className="stat-tiles coding-tiles">
            {[
              [solving.solved, 'questions solved'],
              [solving.activeDays, 'active days'],
              [solving.maxStreak, 'day max streak'],
              [solving.cfRating, 'Codeforces rating'],
            ].map(([n, l]) => (
              <div className="stat-tile reveal" key={l}>
                <strong>{fmt(n)}</strong>
                <span>{l}</span>
              </div>
            ))}
          </div>
          <div className="coding-grid">
            <section className="chart-card reveal">
              <h3>Solved by platform</h3>
              <p className="muted">Click a platform to open that profile.</p>
              <div className="hbars">
                {solving.platforms.map((p) => (
                  <a className="hbar" key={p.name} href={p.url} target="_blank" rel="noreferrer" data-tip={`${p.name}: ${p.solved} solved`}>
                    <span className="hbar-label">{p.name} ↗</span>
                    <span className="hbar-track">
                      <span className="hbar-fill" style={{ width: `${(p.solved / max) * 100}%` }} />
                    </span>
                    <span className="hbar-value">{p.solved}</span>
                  </a>
                ))}
              </div>
            </section>
            <section className="chart-card reveal">
              <h3>DSA by difficulty</h3>
              <p className="muted">{fmt(total)} DSA problems across all platforms.</p>
              <div className="diff-bar" role="img" aria-label={solving.difficulty.map(([d, n]) => `${d} ${n}`).join(', ')}>
                {solving.difficulty.map(([d, n], i) => (
                  <span key={d} className={`diff-${i}`} style={{ flexGrow: n }} data-tip={`${d}: ${n} (${Math.round((n / Math.max(1, total)) * 100)}%)`} />
                ))}
              </div>
              <ul className="diff-legend">
                {solving.difficulty.map(([d, n], i) => (
                  <li key={d}>
                    <span className={`swatch diff-${i}`} />
                    {d}
                    <strong>{n}</strong>
                  </li>
                ))}
              </ul>
              {solving.topics.length > 0 && (
                <>
                  <h4 className="topics-head">Top topics</h4>
                  <div className="chips topic-chips">
                    {solving.topics.map(([t, n]) => (
                      <span key={t}>
                        {t} <b>{n}</b>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>

          <Awards awards={data.awards} />

          <section className="ccard-wrap reveal">
            <div className="ccard-col">
              {data.dev && (
                <div className="ccard-tabs" role="tablist" aria-label="Card side">
                  {[
                    ['solving', 'Problem Solving'],
                    ['dev', 'Development'],
                  ].map(([id, label]) => (
                    <button key={id} role="tab" aria-selected={side === id} className={side === id ? 'active' : ''} onClick={() => setSide(id)}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <FlipCard data={data} side={side} onFlip={setSide} />
            </div>
            <div className="ccard-share">
              {data.rank != null && (
                <p className="eyebrow">
                  <span className="dot" /> Global rank #{fmt(data.rank)}
                </p>
              )}
              <h2>
                My coding <span>card</span>
              </h2>
              <p className="muted">
                Problem solving on one side, development on the other. Tap the card to flip it. Numbers update live from Codolio.
              </p>
              <div className="ccard-actions">
                <a className="btn" href={profileUrl} target="_blank" rel="noreferrer">
                  Full coding profile <span>↗</span>
                </a>
                <CopyLink url={data.profile.card} />
              </div>
            </div>
          </section>

        </>
      )}

    </div>
  )
}
