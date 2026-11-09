import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { experiments } from '../data'
import { experimentStories, experimentSlug } from '../experimentStories'
import ExperimentVisual, { ExperimentGlyph } from '../components/ExperimentVisual'
import SystemMap from '../components/SystemMap'
import './CaseStudy.css'
import './Experiments.css'

export default function ExperimentDetail() {
  const { slug } = useParams()
  const story = experimentStories[slug]
  const experiment = experiments.find((e) => experimentSlug(e) === slug)
  useEffect(() => {
    const previous = document.title
    document.title = `${story?.name || 'Experiment not found'} — Lab notes · Sumit Kumar Ranjan`
    return () => { document.title = previous }
  }, [story])
  if (!story || !experiment) return <div className="page"><h1>This experiment isn’t here.</h1><Link to="/experiments" className="btn">Back to the workbench →</Link></div>
  const next = experiments[(experiments.indexOf(experiment) + 1) % experiments.length]
  return <article className="study lab-detail" style={{ '--study-accent': '#d4ff3a', '--study-ink': '#c6ec49', '--study-paper': '#151812' }}><div className="study-container">
    <div className="study-topline"><Link to="/experiments">← Back to the workbench</Link><span>EXPERIMENT {String(experiments.indexOf(experiment) + 1).padStart(2, '0')} / {story.category.toUpperCase()}</span></div>
    <header className="lab-detail-hero"><div><div className="study-project"><ExperimentGlyph type={story.visual} /><span>{experiment.kind}</span></div><h1>{experiment.name}</h1><p className="lab-detail-headline">{story.headline}</p><div className="study-toolkit">{experiment.stack.map((tech) => <span key={tech}>{tech}</span>)}</div><Link to="#context" className="study-primary">Explore the experiment <span>↘</span></Link></div><div className="lab-detail-art"><ExperimentVisual type={story.visual} /><span>CONCEPT SKETCH / NOT A LIVE OUTPUT</span></div></header>
    <nav className="study-chapters" aria-label="Experiment chapters"><Link to="#context"><span>01</span>The question</Link><Link to="#workflow"><span>02</span>The workflow</Link><Link to="#decisions"><span>03</span>The choices</Link><Link to="#next"><span>04</span>Keep exploring</Link></nav>
    <section id="context" className="study-section study-context"><div className="study-section-intro"><p className="study-label">01 / THE QUESTION</p><h2>{story.question}</h2></div><div className="study-context-copy"><p>{story.context}</p></div><div className="study-manifesto"><span className="study-label">THE IDEA TO TEST</span><p>{story.principle}</p><span aria-hidden="true">↗</span></div></section>
    <section id="workflow" className="study-section"><div className="study-section-head"><div><p className="study-label">02 / THE WORKFLOW</p><h2>Follow the input.<br /><em>Understand the output.</em></h2></div><p>A closer look at the components and how each contributes.</p></div><div className="lab-detail-steps">{story.steps.map((step, i) => <div key={step}><span>0{i + 1}</span><p>{step}</p></div>)}</div><SystemMap key={slug} nodes={story.nodes} name={experiment.name} slug={slug} glyph={<ExperimentGlyph type={story.visual} />} /></section>
    <section id="decisions" className="study-section study-craft"><div className="study-section-intro"><p className="study-label">03 / THE CHOICES</p><h2>What gives the build its shape.</h2><p className="study-craft-note">Explore a decision to see the reasoning behind it.</p></div><div className="study-decisions">{story.decisions.map(([title, body], i) => <details key={`${slug}-${title}`} open={i === 0 ? true : undefined}><summary><span>0{i + 1}</span><h3>{title}</h3><i>+</i></summary><p>{body}</p></details>)}</div><div className="study-takeaway"><span className="study-label">THE TAKEAWAY</span><p>{story.takeaway}</p></div></section>
    <section id="next" className="study-section"><div className="study-section-head"><div><p className="study-label">04 / KEEP EXPLORING</p><h2>The next questions<br /><em>worth asking.</em></h2></div><p>Suggested extensions to investigate next.</p></div><div className="study-roadmap lab-detail-roadmap">{story.next.map(([title, body], i) => <div key={title}><span className="study-roadmap-index">EXPLORATION 0{i + 1}<i>↗</i></span><h3>{title}</h3><p>{body}</p></div>)}</div></section>
    <section className="study-outro"><div><ExperimentGlyph type={story.visual} /><p>From the notes<br /><strong>to the actual code.</strong></p></div><div className="study-outro-links">{experiment.repo && <a className="study-primary" href={experiment.repo} target="_blank" rel="noreferrer">Explore the source <span>↗</span></a>}{experiment.live && <a className="study-source" href={experiment.live} target="_blank" rel="noreferrer">Try the live experiment ↗</a>}</div></section>
    <Link className="study-next" to={`/experiments/${experimentSlug(next)}`}><span className="study-label">ANOTHER QUESTION TO FOLLOW</span><div><strong>{next.name}</strong><span>↗</span></div><p>{next.kind}</p></Link>
  </div></article>
}
