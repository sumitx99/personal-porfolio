import { useEffect, useMemo, useRef, useState } from 'react'

const DAY = 86400e3
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const iso = (t) => new Date(t).toISOString().slice(0, 10)
const utc = (y, m, d) => Date.UTC(y, m, d)
const pretty = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

function todayUtc() {
  const n = new Date()
  return utc(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())
}

// The date span a filter selects: last 12 months, a year, or one month of either.
function span(range, month) {
  const today = todayUtc()
  if (range === 'last') {
    if (month !== 'all') {
      const [y, m] = month.split('-').map(Number)
      return [utc(y, m, 1), Math.min(utc(y, m + 1, 0), today)]
    }
    return [today - 364 * DAY, today]
  }
  const y = Number(range)
  if (month !== 'all') return [utc(y, Number(month), 1), Math.min(utc(y, Number(month) + 1, 0), today)]
  return [utc(y, 0, 1), Math.min(utc(y, 11, 31), today)]
}

// Month choices for a range; for "last 12 months" they carry the year as "YYYY-M".
function monthOptions(range) {
  const today = new Date(todayUtc())
  if (range === 'last') {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11 + i, 1))
      return [`${d.getUTCFullYear()}-${d.getUTCMonth()}`, `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`]
    }).reverse()
  }
  const y = Number(range)
  const last = y === today.getUTCFullYear() ? today.getUTCMonth() : 11
  return Array.from({ length: last + 1 }, (_, m) => [String(m), MONTHS[m]])
}

function summary(days) {
  let total = 0
  let active = 0
  let best = null
  let streak = 0
  let run = 0
  days.forEach((d) => {
    total += d.n
    if (d.n) {
      active++
      run++
      streak = Math.max(streak, run)
      if (!best || d.n > best.n) best = d
    } else run = 0
  })
  return { total, active, streak, best }
}

// GitHub-style contribution heatmap in the site's colours, filterable by year and month.
export default function ContributionGraph({ activity, profileUrl }) {
  const counts = useMemo(() => new Map(activity), [activity])
  const years = useMemo(() => {
    const first = activity.length ? Number(activity[0][0].slice(0, 4)) : new Date().getUTCFullYear()
    const now = new Date().getUTCFullYear()
    return Array.from({ length: now - first + 1 }, (_, i) => String(now - i))
  }, [activity])
  const [range, setRange] = useState('last')
  const [month, setMonth] = useState('all')
  const [hover, setHover] = useState(null)
  const scroller = useRef(null)
  // On narrow screens the year scrolls sideways: start at the latest weeks.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth
  }, [range, month])

  const [from, to] = span(range, month)
  const days = useMemo(() => {
    const list = []
    for (let t = from; t <= to; t += DAY) list.push({ t, n: counts.get(iso(t)) || 0 })
    return list
  }, [from, to, counts])
  const stats = summary(days)
  const max = Math.max(1, ...days.map((d) => d.n))
  const level = (n) => (n ? Math.min(4, Math.ceil((n / max) * 4)) : 0)
  const tip = (d) => `${d.n || 'No'} contribution${d.n === 1 ? '' : 's'} on ${pretty(d.t)}`
  const label = range === 'last' ? (month === 'all' ? 'in the last 12 months' : `in ${monthOptions('last').find(([v]) => v === month)?.[1]}`) : month === 'all' ? `in ${range}` : `in ${MONTHS[month]} ${range}`

  // Year view: weeks as columns, starting on the Sunday on or before the first day.
  const lead = new Date(from).getUTCDay()
  const cells = [...Array(lead).fill(null), ...days]
  const weeks = Math.ceil(cells.length / 7)
  const monthMarks = []
  days.forEach((d, i) => {
    const date = new Date(d.t)
    if (date.getUTCDate() === 1 || i === 0) {
      const col = Math.floor((i + lead) / 7)
      if (!monthMarks.length || col - monthMarks.at(-1).col >= 3) monthMarks.push({ col, name: MONTHS[date.getUTCMonth()] })
    }
  })

  return (
    <div
      className="contrib-graph"
      onPointerOver={(e) => {
        const cell = e.target.closest('[data-t]')
        if (!cell) return setHover(null)
        const box = e.currentTarget.getBoundingClientRect()
        const r = cell.getBoundingClientRect()
        setHover({ text: cell.dataset.t, x: r.left + r.width / 2 - box.left, y: r.top - box.top })
      }}
      onPointerLeave={() => setHover(null)}
    >
      {hover && (
        <span className="contrib-tip" style={{ left: hover.x, top: hover.y }}>
          {hover.text}
        </span>
      )}
      <div className="contrib-filters">
        <label>
          <span className="sr-only">Year</span>
          <select
            value={range}
            onChange={(e) => {
              setRange(e.target.value)
              setMonth('all')
            }}
          >
            <option value="last">Last 12 months</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Month</span>
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="all">All months</option>
            {monthOptions(range).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="contrib-stats">
        <div>
          <strong>{stats.total}</strong>
          <span>contributions {label}</span>
        </div>
        <div>
          <strong>{stats.active}</strong>
          <span>active days</span>
        </div>
        <div>
          <strong>{stats.streak}</strong>
          <span>day longest streak</span>
        </div>
        <div>
          <strong>{stats.best ? stats.best.n : 0}</strong>
          <span>{stats.best ? `best day · ${pretty(stats.best.t)}` : 'best day'}</span>
        </div>
      </div>

      {month === 'all' ? (
        <div className="contrib-scroll" ref={scroller} data-lenis-prevent-horizontal>
          <div className="contrib-year" style={{ '--weeks': weeks }} role="img" aria-label={`${stats.total} contributions ${label}`}>
            <div className="contrib-months">
              {monthMarks.map((m) => (
                <span key={`${m.name}-${m.col}`} style={{ gridColumn: m.col + 1 }}>
                  {m.name}
                </span>
              ))}
            </div>
            <div className="contrib-weekdays" aria-hidden="true">
              <span />
              <span>Mon</span>
              <span />
              <span>Wed</span>
              <span />
              <span>Fri</span>
              <span />
            </div>
            <div className="contrib-cells">
              {cells.map((d, i) => (d ? <span key={d.t} className={`lv${level(d.n)}`} data-t={tip(d)} /> : <span key={`pad-${i}`} className="pad" />))}
            </div>
          </div>
        </div>
      ) : (
        <div className="contrib-month" role="img" aria-label={`${stats.total} contributions ${label}`}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <b key={d}>{d}</b>
          ))}
          {cells.map((d, i) =>
            d ? (
              <span key={d.t} className={`lv${level(d.n)}`} data-t={tip(d)}>
                <i>{new Date(d.t).getUTCDate()}</i>
                {d.n > 0 && <em>{d.n}</em>}
              </span>
            ) : (
              <span key={`pad-${i}`} className="pad" />
            ),
          )}
        </div>
      )}

      <div className="contrib-foot">
        <a href={profileUrl} target="_blank" rel="noreferrer" className="muted">
          View on GitHub ↗
        </a>
        <span className="contrib-legend" aria-hidden="true">
          Less
          {[0, 1, 2, 3, 4].map((l) => (
            <i key={l} className={`lv${l}`} />
          ))}
          More
        </span>
      </div>
    </div>
  )
}
