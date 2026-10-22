import { useMemo, useState } from 'react'
import { experiments, profile } from '../data'
import { useReveal } from '../hooks'
import { PageHead } from '../components/SectionHead'
import { ExperimentStage, SceneCanvas } from '../components/ExperimentScenes'

const CAPTIONS = {
  Sonia: 'Parse → Rank → Answer',
  'AI SQL Assistant': 'Talk to your database',
  Postura: 'Form: 98%',
  'Claim AI Assistant': 'SQL + RAG',
  'Market Predictor': 'Random forest',
  'J.A.R.V.I.S': 'Listen → Think → Speak',
  IntelliTraffic: 'YOLOv8 · live',
  'ATS Resume Checker': '87% match',
  'YouTube → Notes': 'Watch less · learn more',
  'Drug Review Sentiment': 'Reviews → sentiment',
}

const AREAS = {
  'LLM & RAG': ['Sonia', 'AI SQL Assistant', 'Claim AI Assistant', 'ATS Resume Checker', 'YouTube → Notes', 'J.A.R.V.I.S'],
  'Computer Vision': ['Postura', 'IntelliTraffic'],
  'ML & Data': ['Market Predictor', 'Drug Review Sentiment'],
}

export default function Experiments() {
  const groups = ['All', ...Object.keys(AREAS)]
  const [filter, setFilter] = useState('All')
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return experiments.filter(
      (e) =>
        (filter === 'All' || AREAS[filter].includes(e.name)) &&
        (!needle || [e.name, e.kind, e.blurb, ...e.stack].join(' ').toLowerCase().includes(needle))
    )
  }, [filter, q])

  useReveal([filter, q])

  return (
    <div className="page">
      <PageHead
        eyebrow="Side quests & happy accidents"
        title="Experiments"
        intro="Things I built to learn something — RAG pipelines, text-to-SQL, pose tracking, forecasting. Some polished, some held together with tape."
      />

      <label className="search">
        <span aria-hidden="true">⌕</span>
        <input type="search" placeholder="Search projects, topics or tools…" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>

      <div className="filters" role="tablist" aria-label="Filter experiments">
        {groups.map((g) => (
          <button key={g} role="tab" aria-selected={filter === g} className={filter === g ? 'active' : ''} onClick={() => setFilter(g)}>
            {g}
          </button>
        ))}
      </div>
      <p className="found">
        {list.length} {list.length === 1 ? 'project' : 'projects'}
      </p>

      <div className="certx-grid">
        {list.map((e) => {
          const href = e.live || e.repo
          return (
            <article className="certx expx reveal" key={e.name}>
              <div className="certx-tab">
                <span className="dot" /> {e.kind}
              </div>
              <a className="certx-frame" href={href} target="_blank" rel="noreferrer" tabIndex={-1}>
                <ExperimentStage name={e.name} />
                <span className="stage-caption">{CAPTIONS[e.name]}</span>
                <span className="certx-zoom">{e.live ? 'Open live ↗' : 'View code ↗'}</span>
              </a>
              <h3>
                <a href={href} target="_blank" rel="noreferrer">
                  {e.name} <span aria-hidden="true">↗</span>
                </a>
              </h3>
              <p className="muted">{e.blurb}</p>
              <div className="chips">
                {e.stack.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
              <div className="project-links expx-links">
                {e.live && (
                  <a href={e.live} target="_blank" rel="noreferrer">
                    Live ↗
                  </a>
                )}
                {e.repo && (
                  <a href={e.repo} target="_blank" rel="noreferrer">
                    Code ↗
                  </a>
                )}
              </div>
            </article>
          )
        })}
      </div>
      {list.length === 0 && <p className="notice">Nothing matches “{q}”. Try “RAG”, “vision” or “Gemini”.</p>}

      <a className="btn btn-ghost more" href={`${profile.github}?tab=repositories`} target="_blank" rel="noreferrer">
        Everything else on GitHub ↗
      </a>
      <SceneCanvas />
    </div>
  )
}
