import { useCallback, useEffect, useRef, useState } from 'react'
import { useIsSmall } from '../hooks'

// Page views as lime bars (the site accent), visitors as a light-blue line on the same axis.
const SERIES = [
  { key: 'views', label: 'Page views', color: '#d4ff3a' },
  { key: 'visitors', label: 'Visitors', color: '#7aa7ff' },
]
const RANGES = [
  ['24h', '24H'],
  ['7d', '7D'],
  ['30d', '30D'],
]
const PAGE_NAMES = {
  '/': 'Home',
  '/experiments': 'Experiments',
  '/coding': 'Coding',
  '/certifications': 'Certifications',
  '/analytics': 'Analytics',
  '/garage': 'Garage',
}
const PAD = { l: 34, r: 10, t: 16, b: 28 }

// Whole-number axis: a 1/2/5 step that gives four or five gridlines.
function axis(max) {
  max = Math.max(4, max) // a quiet week still gets a few gridlines
  const raw = max / 4
  const p = 10 ** Math.floor(Math.log10(raw))
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw))
  const top = Math.ceil(max / step) * step
  return { top, ticks: Array.from({ length: top / step + 1 }, (_, i) => i * step) }
}

const fmtDay = (t) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const fmtHour = (t) => `${String(new Date(t).getUTCHours()).padStart(2, '0')}:00`

function Delta({ now, before }) {
  if (!before) return <span className="tr-delta flat">new</span>
  const pct = ((now - before) / before) * 100
  const up = pct >= 0
  return (
    <span className={`tr-delta ${up ? 'up' : 'down'}`} title="vs the previous period">
      {up ? '↑' : '↓'} {Math.abs(pct).toFixed(0)}%
    </span>
  )
}

function Chart({ data }) {
  // Phones get a narrower drawing so the axis text stays readable when it scales down.
  const small = useIsSmall()
  const W = small ? 360 : 720
  const H = small ? 220 : 250
  const [hover, setHover] = useState(null)
  const svg = useRef(null)
  const n = data.series.length
  const { top, ticks } = axis(Math.max(...data.series.map((d) => Math.max(d.views, d.visitors))))
  const slot = (W - PAD.l - PAD.r) / n
  const cx = (i) => PAD.l + slot * (i + 0.5)
  const y = (v) => H - PAD.b - (v / top) * (H - PAD.t - PAD.b)
  const bar = Math.min(26, slot * 0.62)
  const every = data.hourly ? (small ? 6 : 3) : n > 10 ? (small ? 7 : 4) : small ? 2 : 1
  const fmt = data.hourly ? fmtHour : fmtDay
  const line = data.series.map((d, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)},${y(d.visitors).toFixed(1)}`).join('')

  const onMove = useCallback(
    (e) => {
      const r = svg.current.getBoundingClientRect()
      const px = ((e.clientX - r.left) / r.width) * W
      setHover(Math.max(0, Math.min(n - 1, Math.floor((px - PAD.l) / slot))))
    },
    [n, W, slot],
  )

  const h = hover != null ? data.series[hover] : null
  return (
    <div className="tr-plot">
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Page views and visitors, ${data.range}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="tr-grid" />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="tr-axis">
              {t}
            </text>
          </g>
        ))}
        {hover != null && <rect x={cx(hover) - slot / 2} y={PAD.t} width={slot} height={H - PAD.t - PAD.b} className="tr-hover" />}
        {data.series.map((d, i) => {
          const top = y(d.views)
          const height = H - PAD.b - top
          return height > 0 ? (
            <path
              key={d.t}
              d={`M${cx(i) - bar / 2},${H - PAD.b}V${top + Math.min(4, height)}q0,-4 4,-4h${bar - 8}q4,0 4,4V${H - PAD.b}Z`}
              fill={SERIES[0].color}
              opacity={hover == null || hover === i ? 0.9 : 0.35}
            />
          ) : null
        })}
        <path d={line} fill="none" stroke={SERIES[1].color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.series.map((d, i) => (
          <circle key={d.t} cx={cx(i)} cy={y(d.visitors)} r={hover === i ? 5 : 3} fill={SERIES[1].color} stroke="var(--bg-2)" strokeWidth="2" />
        ))}
        {data.series.map((d, i) =>
          i % every === 0 || i === n - 1 ? (
            <text key={d.t} x={cx(i)} y={H - 8} textAnchor="middle" className="tr-axis">
              {fmt(d.t)}
            </text>
          ) : null,
        )}
      </svg>
      {h && (
        <div className="tr-tip" style={{ left: `${Math.min(85, Math.max(15, (cx(hover) / W) * 100))}%` }}>
          <strong>{data.hourly ? `${fmtDay(h.t)} · ${fmtHour(h.t)}` : fmtDay(h.t)}</strong>
          {SERIES.map((s) => (
            <span key={s.key}>
              <i style={{ background: s.color }} /> {s.label} <b>{h[s.key]}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function TopPages({ pages }) {
  const list = pages.filter((p) => p.views > 0)
  const max = Math.max(1, ...list.map((p) => p.views))
  if (!list.length) return <p className="muted">No page views yet.</p>
  return (
    <ol className="tr-pages">
      {list.map((p) => (
        <li key={p.path}>
          <span className="tr-page-bar" style={{ width: `${(p.views / max) * 100}%` }} />
          <span className="tr-page-name">{PAGE_NAMES[p.path] || p.path}</span>
          <b>{p.views}</b>
        </li>
      ))}
    </ol>
  )
}

// Live visitor counts for this site, recorded by /api/visits.
export default function SiteTraffic() {
  const [range, setRange] = useState('7d')
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    const load = () =>
      fetch(`/api/visits?range=${range}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((d) => live && (setData(d), setFailed(false)))
        .catch(() => live && setFailed(true))
    load()
    // refresh once this visit has been recorded, so "you" are already in the numbers
    window.addEventListener('sk-visit', load)
    return () => {
      live = false
      window.removeEventListener('sk-visit', load)
    }
  }, [range])

  // In production the counts only mean something once Redis is connected.
  const waiting = data && !data.stored && !import.meta.env.DEV
  const ready = data && !waiting
  const period = range === '24h' ? 'last 24 hours' : `last ${range === '7d' ? 7 : 30} days`
  const perVisit = ready && data.visitors ? (data.views / data.visitors).toFixed(1) : '—'

  const tiles = [
    ['Visitors', ready ? data.visitors : '—', ready && <Delta now={data.visitors} before={data.prevVisitors} />],
    ['Page views', ready ? data.views : '—', ready && <Delta now={data.views} before={data.prevViews} />],
    ['Pages / visit', perVisit, <span key="n" className="tr-note">{period}</span>],
    ['All-time visitors', ready ? data.allVisitors : '—', <span key="n" className="tr-note">{ready ? `${data.allViews} views` : ''}</span>],
  ]

  return (
    <section className="tr">
      <div className="tr-top">
        <span className="tr-live">
          <span className="tr-pulse" aria-hidden="true" /> Live visitors
        </span>
        <div className="tr-ranges" role="tablist" aria-label="Time range">
          {RANGES.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={range === id} className={range === id ? 'active' : ''} onClick={() => setRange(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="tr-tiles">
        {tiles.map(([label, value, extra]) => (
          <div className="tr-tile" key={label}>
            <span className="tr-label">{label}</span>
            <strong>{value}</strong>
            {extra || <span className="tr-note">&nbsp;</span>}
          </div>
        ))}
      </div>

      <div className="tr-main">
        <div className="chart-card tr-chart">
          <div className="tr-head">
            <h3>Traffic</h3>
            <span className="tr-legend">
              {SERIES.map((s) => (
                <span key={s.key}>
                  <i style={{ background: s.color }} /> {s.label}
                </span>
              ))}
            </span>
          </div>
          <p className="muted tr-period">{period} · UTC</p>
          {failed && <p className="muted">Visitor stats are offline right now.</p>}
          {waiting && <p className="muted">Visitor counting switches on once the site’s database is connected.</p>}
          {ready && <Chart data={data} />}
          {!data && !failed && <div className="skeleton" aria-hidden="true" />}
          {ready && (
            <details className="tr-table">
              <summary>View as table</summary>
              <table>
                <thead>
                  <tr>
                    <th>{data.hourly ? 'Hour (UTC)' : 'Day'}</th>
                    <th>Visitors</th>
                    <th>Page views</th>
                  </tr>
                </thead>
                <tbody>
                  {data.series.map((d) => (
                    <tr key={d.t}>
                      <td>{data.hourly ? fmtHour(d.t) : fmtDay(d.t)}</td>
                      <td>{d.visitors}</td>
                      <td>{d.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </div>

        <div className="chart-card tr-side">
          <div className="tr-head">
            <h3>Top pages</h3>
            <span className="tr-note">all time</span>
          </div>
          {ready && data.pages ? <TopPages pages={data.pages} /> : <p className="muted">—</p>}
          <p className="muted tr-privacy">No cookies, no IPs, no personal data: just an anonymous id made in your browser.</p>
        </div>
      </div>
    </section>
  )
}
