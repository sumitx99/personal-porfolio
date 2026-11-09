import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { projectSlug } from '../caseStudies'

// Screenshot gallery in a browser frame; cycles on its own, dots pick a slide.
function Gallery({ images, name, url, to }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || images.length < 2) return
    const id = setInterval(() => setI((n) => (n + 1) % images.length), 3800)
    return () => clearInterval(id)
  }, [paused, images.length])

  return (
    <div className="browser" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <Link className="browser-link" to={to} aria-label={`Read the ${name} case study`}>
        <div className="browser-bar">
          <span />
          <span />
          <span />
          <div className="browser-url">{url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</div>
        </div>
        <div className="browser-view">
          {images.map((src, n) => (
            <img
              key={src}
              src={src}
              alt={`${name} screenshot ${n + 1}`}
              loading="lazy"
              className={n === i ? 'active' : ''}
            />
          ))}
        </div>
      </Link>
      {images.length > 1 && (
        <div className="gallery-dots">
          {images.map((src, n) => (
            <button key={src} type="button" className={n === i ? 'active' : ''} onClick={() => setI(n)} aria-label={`Show screenshot ${n + 1}`} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProjectShowcase({ project, index }) {
  const p = project
  return (
    <article className={`showcase ${index % 2 ? 'flip' : ''}`} style={{ '--p-accent': p.accent }}>
      <div className="showcase-media">
        <Gallery images={p.images} name={p.name} url={p.live} to={`/projects/${projectSlug(p)}`} />
      </div>
      <div className="showcase-body">
        <div className="project-top">
          <span className="num">{String(index + 1).padStart(2, '0')}</span>
          <span className="kind">
            {p.kind} · {p.year}
          </span>
        </div>
        <h3>{p.name}</h3>
        <p className="tagline">{p.tagline}</p>
        <p className="muted">{p.blurb}</p>
        <ul className="highlights">
          {p.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <div className="chips">
          {p.stack.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <div className="showcase-cta">
          <Link className="btn" to={`/projects/${projectSlug(p)}`} aria-label={`Explore the ${p.name} case study`}>
            Explore the build <span aria-hidden="true">→</span>
          </Link>
          <a className="btn btn-ghost" href={p.live} target="_blank" rel="noreferrer" aria-label={`Visit ${p.name} live`}>
            Visit live <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </article>
  )
}
