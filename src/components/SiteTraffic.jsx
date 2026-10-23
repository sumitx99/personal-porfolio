import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useIsSmall } from '../hooks'

// Validated pair on the dark card surface (lightness band, CVD separation, contrast).
const SERIES = [
  { key: 'views', label: 'Page views', color: '#e0457b' },
  { key: 'visitors', label: 'Visitors', color: '#3b82f6' },
]
const RANGES = [
  ['24h', '24H'],
  ['7d', '7D'],
  ['30d', '30D'],
]
const PAD = { l: 40, r: 16, t: 28, b: 30 }

function niceMax(v) {
  if (v <= 4) return 4
  const p = 10 ** Math.floor(Math.log10(v))
  const n = [1, 2, 2.5, 5, 10].find((m) => m * p >= v)
  return n * p
}

const fmtDay = (t) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const fmtHour = (t) => `${String(new Date(t).getUTCHours()).padStart(2, '0')}:00`

function change(now, before) {
  if (!before) return null
  return ((now - before) / before) * 100
}

function Delta({ now, before }) {
  const pct = change(now, before)
  if (pct == null) return <span className="traffic-delta muted">no earlier data yet</span>
  const up = pct >= 0
  return (
    <span className="traffic-delta">
      <b aria-hidden="true">{up ? '↗' : '↘'}</b> {Math.abs(pct).toFixed(1)}% <span className="muted">vs previous period</span>
    </span>
  )
}

function Chart({ data }) {
  // Phones get a narrower drawing so the axis text stays readable when it scales down.
  const small = useIsSmall()
  const W = small ? 360 : 720
  const H = small ? 240 : 260
  const [hover, setHover] = useState(null)
  const svg = useRef(null)
  const n = data.series.length
  const max = niceMax(Math.max(1, ...data.series.map((d) => d.views)))
  const x = (i) => PAD.l + (i / Math.max(1, n - 1)) * (W - PAD.l - PAD.r)
  const y = (v) => H - PAD.b - (v / max) * (H - PAD.t - PAD.b)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((k) => k * max)
  const every = data.hourly ? (small ? 8 : 4) : n > 10 ? (small ? 10 : 5) : small ? 2 : 1
  const fmt = data.hourly ? fmtHour : fmtDay

  const paths = useMemo(
    () =>
      SERIES.map((s) => {
        const pts = data.series.map((d, i) => `${x(i).toFixed(1)},${y(d[s.key]).toFixed(1)}`)
        return { ...s, line: `M${pts.join('L')}`, area: `M${x(0)},${y(0)}L${pts.join('L')}L${x(n - 1)},${y(0)}Z` }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, small],
  )

  const onMove = useCallback(
    (e) => {
      const r = svg.current.getBoundingClientRect()
      const px = ((e.clientX - r.left) / r.width) * W
      setHover(Math.max(0, Math.min(n - 1, Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1)))))
    },
    [n, W],
  )

  const last = data.series[n - 1]
  const h = hover != null ? data.series[hover] : null
  return (
    <div className="traffic-plot">
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Visitors and page views, ${data.range}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="traffic-grid" />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="traffic-axis">
              {Math.round(t)}
            </text>
          </g>
        ))}
        {data.series.map((d, i) =>
          i % every === 0 || i === n - 1 ? (
            <text key={d.t} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="traffic-axis">
              {fmt(d.t)}
            </text>
          ) : null,
        )}
        {paths.map((p) => (
          <g key={p.key}>
            <path d={p.area} fill={p.color} opacity="0.12" />
            <path d={p.line} fill="none" stroke={p.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        ))}
        {/* you are one of the latest visitors */}
        <g transform={`translate(${x(n - 1)},${y(last.visitors)})`}>
          <circle r="5" fill="#3b82f6" stroke="var(--bg-2)" strokeWidth="2" />
          <g transform="translate(-22,-26)">
            <rect width="34" height="18" rx="9" className="traffic-you" />
            <text x="17" y="13" textAnchor="middle" className="traffic-you-text">
              YOU
            </text>
          </g>
        </g>
        {h && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t - 8} y2={H - PAD.b} className="traffic-cross" />
            {SERIES.map((s) => (
              <circle key={s.key} cx={x(hover)} cy={y(h[s.key])} r="4.5" fill={s.color} stroke="var(--bg-2)" strokeWidth="2" />
            ))}
          </g>
        )}
      </svg>
      {h && (
        <div className="traffic-tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
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

  return (
    <section className="traffic">
      <div className="traffic-cards">
        {[
          ['Visitors', data?.visitors, data?.prevVisitors],
          ['Page views', data?.views, data?.prevViews],
        ].map(([label, now, before]) => (
          <div className="traffic-card" key={label}>
            <span className="muted">{label}</span>
            <strong>{data && !waiting ? now : '—'}</strong>
            {data && !waiting ? <Delta now={now} before={before} /> : <span className="traffic-delta muted">&nbsp;</span>}
          </div>
        ))}
      </div>

      <div className="chart-card traffic-chart">
        <div className="traffic-head">
          <h3>
            <span className="muted">~/</span>traffic
          </h3>
          <div className="traffic-ranges" role="tablist" aria-label="Time range">
            {RANGES.map(([id, label]) => (
              <button key={id} role="tab" aria-selected={range === id} className={range === id ? 'active' : ''} onClick={() => setRange(id)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="traffic-sub">
          <span className="muted">{range === '24h' ? 'last 24 hours' : `last ${range === '7d' ? 7 : 30} days`} · UTC</span>
          <span className="traffic-legend">
            {SERIES.map((s) => (
              <span key={s.key}>
                <i style={{ background: s.color }} /> {s.label}
              </span>
            ))}
          </span>
        </div>
        {failed && <p className="muted">Visitor stats are offline right now.</p>}
        {waiting && <p className="muted">Visitor counting switches on once the site’s database is connected.</p>}
        {data && !waiting && <Chart data={data} />}
        {!data && !failed && <div className="skeleton" aria-hidden="true" />}
        {data && !waiting && (
          <details className="traffic-table">
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
        {data && !waiting && (
          <p className="muted small-note">
            {data.allVisitors} visitors and {data.allViews} page views since tracking began. No cookies, no personal data.
          </p>
        )}
      </div>
    </section>
  )
}
