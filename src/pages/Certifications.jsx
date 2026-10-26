import { useEffect, useMemo, useState } from 'react'
import { achievements, certifications, certificationCounts, profile } from '../data'
import { useReveal } from '../hooks'
import { PageHead } from '../components/SectionHead'

const CATEGORIES = ['All', 'AI/ML', 'Cloud', 'Data', 'Software', 'Recognition']

// Full-screen view of a certificate; Esc or a click outside closes it.
function Lightbox({ cert, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={cert.title} onClick={onClose}>
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={cert.image} alt={cert.title} />
        <figcaption>
          <span>{cert.title}</span>
          {cert.url && (
            <a href={cert.url} target="_blank" rel="noreferrer">
              Verify ↗
            </a>
          )}
        </figcaption>
      </figure>
      <button className="lightbox-close" onClick={onClose} aria-label="Close">
        ×
      </button>
    </div>
  )
}

function CertCard({ cert, onOpen }) {
  const Title = cert.url ? 'a' : 'span'
  return (
    <article className="certx reveal">
      <div className="certx-tab">
        <span className="dot" /> {cert.date}
      </div>
      <button
        className={`certx-frame ${cert.photo ? 'photo' : ''}`}
        onClick={() => cert.image && onOpen(cert)}
        disabled={!cert.image}
        aria-label={cert.image ? `View ${cert.title}` : undefined}
      >
        {cert.image ? (
          <img src={cert.image} alt={`${cert.title} certificate`} loading="lazy" />
        ) : (
          <div className="certx-placeholder">
            <span>{cert.issuer}</span>
            <strong>{cert.title}</strong>
          </div>
        )}
        {cert.image && <span className="certx-zoom">View ↗</span>}
      </button>
      <h3>
        <Title {...(cert.url ? { href: cert.url, target: '_blank', rel: 'noreferrer' } : {})}>
          {cert.title} {cert.url && <span aria-hidden="true">↗</span>}
        </Title>
      </h3>
      <p className="muted">{cert.issuer}</p>
      {(cert.note || cert.id) && (
        <p className="certx-meta">
          {cert.note}
          {cert.note && cert.id && ' · '}
          {cert.id && `ID ${cert.id}`}
        </p>
      )}
      <div className="chips">
        {cert.tags.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </article>
  )
}

export default function Certifications() {
  const [cat, setCat] = useState('All')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return certifications.filter(
      (c) =>
        (cat === 'All' || c.category === cat) &&
        (!needle || [c.title, c.issuer, ...c.tags].join(' ').toLowerCase().includes(needle))
    )
  }, [cat, q])

  useReveal([cat, q])

  return (
    <div className="page">
      <PageHead
        eyebrow={`${certificationCounts.certifications} certifications · ${certificationCounts.recognitions} recognitions`}
        title="Certifications"
        intro="The certificates themselves — from cloud foundations to generative AI — plus a few podiums. Click any one to see it full size or verify it with the issuer."
      >
        <a className="btn btn-ghost" href={`${profile.linkedin}details/certifications/`} target="_blank" rel="noreferrer">
          See them on LinkedIn ↗
        </a>
      </PageHead>

      <label className="search">
        <span aria-hidden="true">⌕</span>
        <input type="search" placeholder="Search certificates or skills…" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>

      <div className="filters" role="tablist" aria-label="Filter certifications">
        {CATEGORIES.map((c) => (
          <button key={c} role="tab" aria-selected={cat === c} className={cat === c ? 'active' : ''} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      <p className="found">
        {list.length} {list.length === 1 ? 'result' : 'results'} found
      </p>

      <div className="certx-grid">
        {list.map((c) => (
          <CertCard key={c.title} cert={c} onOpen={setOpen} />
        ))}
      </div>
      {list.length === 0 && <p className="notice">Nothing matches “{q}”. Try “AI”, “cloud” or “Microsoft”.</p>}

      <h2 className="sub-head">More recognition</h2>
      <ul className="awards">
        {achievements.map((a) => (
          <li className="reveal" key={a.title}>
            <span className="year">{a.year}</span>
            <div>
              <h4>{a.title}</h4>
              <p className="muted">{a.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      {open && <Lightbox cert={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
