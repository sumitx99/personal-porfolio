import { useEffect, useState } from 'react'

// Screenshot gallery in a browser frame; cycles on its own, dots pick a slide.
function Gallery({ images, name, url }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || images.length < 2) return
    const id = setInterval(() => setI((n) => (n + 1) % images.length), 3800)
    return () => clearInterval(id)
  }, [paused, images.length])

  return (
    <div className="browser" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
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
      {images.length > 1 && (
        <div className="gallery-dots">
          {images.map((src, n) => (
            <button key={src} className={n === i ? 'active' : ''} onClick={() => setI(n)} aria-label={`Show screenshot ${n + 1}`} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProjectShowcase({ project, index }) {
  const p = project
  return (
    <article className={`showcase reveal ${index % 2 ? 'flip' : ''}`} style={{ '--p-accent': p.accent }}>
      <a className="showcase-media" href={p.live} target="_blank" rel="noreferrer" aria-label={`Open ${p.name} live`}>
        <Gallery images={p.images} name={p.name} url={p.live} />
      </a>
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
          <a className="btn" href={p.live} target="_blank" rel="noreferrer">
            Visit live <span aria-hidden="true">↗</span>
          </a>
          {p.repo && (
            <a className="btn btn-ghost" href={p.repo} target="_blank" rel="noreferrer">
              Source code
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
