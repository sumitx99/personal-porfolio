import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { experiments, profile } from '../data'
import { experimentStories, experimentSlug } from '../experimentStories'
import ExperimentVisual, { ExperimentGlyph } from '../components/ExperimentVisual'
import './Experiments.css'

export default function Experiments() {
  useEffect(() => {
    const previous = document.title
    document.title = 'Experiments — The workbench · Sumit Kumar Ranjan'
    return () => { document.title = previous }
  }, [])
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const groups = ['All', 'LLM & RAG', 'Computer Vision', 'ML & Data']
  const list = useMemo(() => experiments.filter((e) => {
    const story = experimentStories[experimentSlug(e)]
    return (filter === 'All' || story.category === filter) && [e.name, e.kind, e.blurb, ...e.stack].join(' ').toLowerCase().includes(query.trim().toLowerCase())
  }), [filter, query])

  return <div className="lab-page">
    <header className="lab-header"><div className="lab-kicker"><span className="lab-status" /> THE WORKBENCH <span>09 EXPLORATIONS</span></div><h1>Small builds.<br /><span>Big questions.</span></h1><div className="lab-header-bottom"><p>A place to follow a question all the way to working code. Language, vision, data—and the things I learned by connecting them.</p><span className="lab-header-mark" aria-hidden="true">↙</span></div></header>
    <div className="lab-toolbar"><div className="lab-filters" aria-label="Filter experiments">{groups.map((group) => <button type="button" key={group} aria-pressed={filter === group} onClick={() => setFilter(group)}>{group}{group === 'All' && <span>{experiments.length}</span>}</button>)}</div><label className="lab-search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Search experiments" placeholder="Find a question or tool…" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
    <div className="lab-results" role="status">{String(list.length).padStart(2, '0')} {list.length === 1 ? 'EXPERIMENT' : 'EXPERIMENTS'}<span>OPEN A BUILD TO GO DEEPER ↙</span></div>
    <div className="lab-grid">{list.map((experiment) => {
      const slug = experimentSlug(experiment)
      const story = experimentStories[slug]
      return <Link to={`/experiments/${slug}`} className="lab-card" key={slug}><div className="lab-card-art"><ExperimentVisual type={story.visual} compact /><span className="lab-card-index">EXP. {String(experiments.indexOf(experiment) + 1).padStart(2, '0')}</span><span className="lab-card-open" aria-hidden="true">↗</span></div><div className="lab-card-body"><span className="lab-card-kind"><ExperimentGlyph type={story.visual} />{experiment.kind}</span><h2>{experiment.name}</h2><p>{story.question}</p><div className="lab-card-stack">{experiment.stack.slice(0, 3).map((tech) => <span key={tech}>{tech}</span>)}</div><div className="lab-card-footer"><span>Read the lab notes</span><span aria-hidden="true">→</span></div></div></Link>
    })}</div>
    {!list.length && <div className="lab-empty"><h2>No builds in this corner yet.</h2><p>Try another tool or topic, or clear your filters.</p><button type="button" onClick={() => { setFilter('All'); setQuery('') }}>Show all experiments ↗</button></div>}
    <footer className="lab-bottom"><p>More questions. More code.</p><a href={`${profile.github}?tab=repositories`} target="_blank" rel="noreferrer">Explore the full GitHub archive ↗</a></footer>
  </div>
}
