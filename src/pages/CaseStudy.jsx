import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { projects } from '../data'
import { caseStudies, projectSlug } from '../caseStudies'
import ProjectConcept, { ProjectGlyph } from '../components/ProjectConcept'
import SystemMap from '../components/SystemMap'
import './CaseStudy.css'

const chapters = [['context', 'The why'], ['experience', 'The product'], ['architecture', 'The system'], ['build', 'The craft'], ['next', 'The horizon']]
// Each story gets its own neon accent, as bright as the site's lime so it sits with the black-and-lime theme.
const artDirection = {
  ridebridge: { accent: '#ffc53a', ink: '#ffd978', paper: '#17140c', productNote: 'From place discovery to a precise handoff.', word: 'Closer.', sub: 'A better handoff, one precise pin at a time.', headings: ['A place name isn’t always a destination.', 'Find it. Refine it. Ride.', 'Precision is a chain of small decisions.'] },
  kite: { accent: '#3ad7ff', ink: '#85e7ff', paper: '#0c1518', productNote: 'Discovery, orders and the workspace that follows.', word: 'Together.', sub: 'Software delivery, with everyone on the same page.', headings: ['The order is only the beginning.', 'From first impression to daily progress.', 'Good delivery needs a shared structure.'] },
  'sonia-ai': { accent: '#b48cff', ink: '#cfb5ff', paper: '#141019', productNote: 'Documents, research and outputs in one conversation.', word: 'Beyond.', sub: 'Follow your curiosity. Bring your sources.', headings: ['An answer should open another door.', 'One workspace. More ways forward.', 'Give every capability a clear purpose.'] },
}

function ProductGallery({ project, story }) {
  const [slide, setSlide] = useState(0)
  const dialog = useRef(null)
  return <div className="study-gallery">
    <div className="study-gallery-stage"><img src={project.images[slide]} alt={`${project.name}: ${story.captions[slide]}`} loading="lazy" /></div>
    <div className="study-gallery-bottom">
      <div><span className="study-label">INSIDE {project.name.toUpperCase()} / 0{slide + 1}</span><p>{story.captions[slide]}</p></div>
      <button type="button" className="study-expand" onClick={() => dialog.current.showModal()}>Expand screenshot <span aria-hidden="true">↗</span></button>
      <div className="study-gallery-controls"><button type="button" aria-label="Previous product view" onClick={() => setSlide((slide + project.images.length - 1) % project.images.length)}>←</button><span>0{slide + 1}<i> / 0{project.images.length}</i></span><button type="button" aria-label="Next product view" onClick={() => setSlide((slide + 1) % project.images.length)}>→</button></div>
    </div>
    <dialog className="study-image-dialog" ref={dialog} aria-label={`${project.name} screenshot viewer`} data-lenis-prevent onClick={(event) => { if (event.target === event.currentTarget) dialog.current.close() }}>
      <div className="study-image-dialog-bar"><span>{project.name} / 0{slide + 1}</span><button type="button" onClick={() => dialog.current.close()} aria-label="Close screenshot viewer">Close ×</button></div>
      <img src={project.images[slide]} alt={`${project.name}: ${story.captions[slide]}`} />
      <p>{story.captions[slide]}</p>
    </dialog>
  </div>
}

export default function CaseStudy() {
  const { slug } = useParams()
  const story = caseStudies[slug]
  const project = projects.find((p) => projectSlug(p) === slug)
  const art = artDirection[slug]
  useEffect(() => {
    const previous = document.title
    document.title = story ? `${story.name} — The build story · Sumit Kumar Ranjan` : 'Project not found · Sumit Kumar Ranjan'
    return () => { document.title = previous }
  }, [story])
  if (!story || !project) return <div className="page"><h1>This story isn’t here.</h1><Link to="/#projects" className="btn">Explore the projects →</Link></div>
  const next = projects[(projects.indexOf(project) + 1) % projects.length]
  return <article className={`study study-${slug}`} style={{ '--study-accent': art.accent, '--study-ink': art.ink, '--study-paper': art.paper }}>
    <div className="study-container">
      <div className="study-topline"><Link to="/#projects">← Back to selected work</Link><span>DESIGN / ENGINEERING / {project.year}</span></div>
      <header className="study-hero">
        <div className="study-hero-copy"><div className="study-project"><ProjectGlyph type={slug} /><span>{project.name}</span><span className="study-edition">BUILD STORY 0{projects.indexOf(project) + 1}</span></div><h1>{art.word}</h1><h2>{art.sub}</h2><p>{story.intro}</p><div className="study-hero-actions"><Link to="#context" className="study-primary">Step inside the build <span>↘</span></Link><a href={project.live} target="_blank" rel="noreferrer" className="study-live">Visit live ↗</a></div><div className="study-hero-footer"><span>{project.kind}</span><span>{story.role}</span></div></div>
        <ProjectConcept key={slug} slug={slug} />
      </header>
      <nav className="study-chapters" aria-label="Case study chapters">{chapters.map(([id, label], i) => <Link key={id} to={`#${id}`}><span>0{i + 1}</span>{label}</Link>)}<span className="study-chapters-end">A LOOK BEHIND THE INTERFACE ↓</span></nav>
      <section id="context" className="study-section study-context"><div className="study-section-intro"><p className="study-label">01 / THE WHY</p><h2>{art.headings[0]}</h2></div><div className="study-context-copy"><p className="study-question">{story.question}</p><p>{story.problem}</p></div><div className="study-manifesto"><span className="study-label">THE PRINCIPLE</span><p>{story.principle}</p><span aria-hidden="true">↗</span></div></section>
      <section id="experience" className="study-section study-product"><div className="study-section-head"><div><p className="study-label">02 / THE PRODUCT</p><h2>{art.headings[1]}</h2></div><p>{art.productNote}</p></div><ProductGallery key={slug} project={project} story={story} /><div className="study-feature-strip">{story.experience.map((text, i) => <div key={text}><span>0{i + 1}</span><p>{text}</p></div>)}</div></section>
      <section id="architecture" className="study-section"><div className="study-section-head"><div><p className="study-label">03 / THE SYSTEM</p><h2>A little clarity.<br /><em>Behind the complexity.</em></h2></div><p>{story.flowLabel}.</p></div><SystemMap key={slug} nodes={story.nodes} name={project.name} slug={slug} /></section>
      <section id="build" className="study-section study-craft"><div className="study-section-intro"><p className="study-label">04 / THE CRAFT</p><h2>{art.headings[2]}</h2><p className="study-craft-note">The choices that give the product its shape.</p><div className="study-toolkit">{project.stack.map((tech) => <span key={tech}>{tech}</span>)}</div></div><div className="study-decisions">{story.decisions.map(([title, body], i) => <details key={`${slug}-${title}`} open={i === 0 ? true : undefined}><summary><span>0{i + 1}</span><h3>{title}</h3><i>+</i></summary><p>{body}</p></details>)}</div><div className="study-build-path">{story.journey.map(([title, body], i) => <div key={title}><span className="study-build-number">0{i + 1}</span><h3>{title}</h3><p>{body}</p></div>)}</div><div className="study-takeaway"><span className="study-label">A NOTE FROM THE BUILD</span><p>{story.takeaway}</p></div></section>
      <section id="next" className="study-section study-horizon"><div className="study-section-head"><div><p className="study-label">05 / THE HORIZON</p><h2>Still curious.<br /><em>Still building.</em></h2></div><p>Possible next explorations.<br />Ideas for the next iteration.</p></div><div className="study-roadmap">{story.next.map(([title, body], i) => <div key={title}><span className="study-roadmap-index">EXPLORATION 0{i + 1}<i>↗</i></span><h3>{title}</h3><p>{body}</p></div>)}</div></section>
      <section className="study-outro"><div><ProjectGlyph type={slug} /><p>You’ve seen the thinking.<br /><strong>Now explore the thing.</strong></p></div><div className="study-outro-links"><a href={project.live} target="_blank" rel="noreferrer" className="study-primary">Open {project.name}<span>↗</span></a>{project.repo && <a className="study-source" href={project.repo} target="_blank" rel="noreferrer">Read the source code ↗</a>}</div></section>
      <Link className="study-next" to={`/projects/${projectSlug(next)}`}><span className="study-label">ANOTHER IDEA, MADE REAL</span><div><strong>{next.name}</strong><span>↗</span></div><p>{next.tagline}</p></Link>
    </div>
  </article>
}
