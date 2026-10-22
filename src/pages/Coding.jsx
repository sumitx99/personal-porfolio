import { coding } from '../data'
import { useReveal } from '../hooks'
import { PageHead } from '../components/SectionHead'

export default function Coding() {
  const max = Math.max(...coding.platforms.map((p) => p.solved))
  const total = coding.difficulty.reduce((s, [, n]) => s + n, 0)
  useReveal()
  return (
    <div className="page">
      <PageHead
        eyebrow={`Global rank #${coding.globalRank} on Codolio`}
        title="Coding"
        intro="Daily DSA practice across five judges — LeetCode, CodeChef, Code360, GeeksforGeeks and Codeforces."
      />
      <div className="stat-tiles coding-tiles">
        {coding.totals.map(([n, l]) => (
          <div className="stat-tile reveal" key={l}>
            <strong>{n}</strong>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <div className="coding-grid">
        <section className="chart-card reveal">
          <h3>Solved by platform</h3>
          <p className="muted">Click a platform to open that profile.</p>
          <div className="hbars">
            {coding.platforms.map((p) => (
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
          <p className="muted">{total} DSA problems across all platforms.</p>
          <div className="diff-bar" role="img" aria-label={coding.difficulty.map(([d, n]) => `${d} ${n}`).join(', ')}>
            {coding.difficulty.map(([d, n], i) => (
              <span key={d} className={`diff-${i}`} style={{ flexGrow: n }} data-tip={`${d}: ${n} (${Math.round((n / total) * 100)}%)`} />
            ))}
          </div>
          <ul className="diff-legend">
            {coding.difficulty.map(([d, n], i) => (
              <li key={d}>
                <span className={`swatch diff-${i}`} />
                {d}
                <strong>{n}</strong>
              </li>
            ))}
          </ul>
          <h4 className="topics-head">Top topics</h4>
          <div className="chips topic-chips">
            {coding.topics.map(([t, n]) => (
              <span key={t}>
                {t} <b>{n}</b>
              </span>
            ))}
          </div>
        </section>
      </div>
      <div className="coding-foot reveal">
        <span className="muted">
          Global rank <strong>#{coding.globalRank}</strong> on Codolio
        </span>
        <a className="btn btn-ghost" href={coding.profile} target="_blank" rel="noreferrer">
          Full coding profile ↗
        </a>
      </div>
    </div>
  )
}
