import { Suspense, lazy, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { profile, roles, experience, careerChapters, education, projects, skills, experiments, certificationCounts, coding } from '../data'
import { useIsSmall, useReveal } from '../hooks'
import SectionHead from '../components/SectionHead'
import ProjectShowcase from '../components/ProjectShowcase'
import ProfilePortrait from '../components/ProfilePortrait'

const HeroScene = lazy(() => import('../components/HeroScene'))

function RotatingWord() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % roles.length), 2200)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="rotator" key={i}>
      {roles[i]}
    </span>
  )
}

function Clock() {
  const fmt = () =>
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
  const [t, setT] = useState(fmt)
  useEffect(() => {
    const id = setInterval(() => setT(fmt()), 30000)
    return () => clearInterval(id)
  }, [])
  return <span>{t} IST</span>
}

function Hero({ small }) {
  return (
    <section className="hero" id="top">
      <div className="hero-canvas" aria-hidden="true">
        <Suspense fallback={null}>
          <HeroScene small={small} />
        </Suspense>
      </div>
      <div className="hero-content">
        <p className="eyebrow">
          <span className="dot" /> Open to interesting problems
          <span className="hide-sm">
            · <Clock />
          </span>
        </p>
        <h1>
          <span className="line">Sumit Kumar</span>
          <span className="line accent-outline">Ranjan</span>
        </h1>
        <p className="hero-sub">
          Software engineer building <RotatingWord />
          <br />
          that turn messy data into things people actually use.
        </p>
        <div className="hero-cta">
          <Link className="btn" to="/#projects">
            See my work <span aria-hidden="true">→</span>
          </Link>
          <a className="btn btn-ghost" href={profile.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a className="btn btn-ghost" href={profile.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        </div>
      </div>
      <a href="#about" className="scroll-cue" aria-label="Scroll to about">
        <span />
      </a>
    </section>
  )
}

function About() {
  const stats = [
    ['2', 'engineering roles'],
    [projects.length, 'products live'],
    [certificationCounts.certifications, 'certifications'],
    ['1st', 'runner-up, BIZINNOVATHON'],
  ]
  return (
    <section id="about" className="section">
      <SectionHead index="01" title="About" />
      <div className="about-grid">
        <ProfilePortrait />
        <div className="about-copy reveal">
          <p className="lead">
            I’m a Computer Science (AI&nbsp;&amp;&nbsp;ML) engineer who likes the moment a model stops being a notebook and starts being
            a product.
          </p>
          <p>
            Right now I’m a Software Engineer at <strong>Pharmaco Evidence</strong>, working on backend services, API integrations and
            Kafka pipelines. Before that I built AI modules for the EOXS ERP — demand forecasting and automation for the steel
            industry.
          </p>
          <p>
            On the side I ship products like RideBridge, Kite and Sonia AI, and experiment with RAG, text-to-SQL and computer vision. Off the
            keyboard: cricket, basketball and travel.
          </p>
          <div className="stats">
            {stats.map(([n, l]) => (
              <div key={l}>
                <strong>{n}</strong>
                <span>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Work() {
  return (
    <section id="work" className="section">
      <SectionHead index="02" title="Experience" kicker="Where I’ve shipped code." />
      <div className="timeline">
        {experience.map((job) => (
          <article className="job reveal" key={job.company}>
            <div className="job-meta">
              <span className="period">{job.period}</span>
              <h3>
                {job.url ? (
                  <a href={job.url} target="_blank" rel="noreferrer" className="job-link">
                    {job.company} <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  job.company
                )}
              </h3>
              {job.place && <p className="muted">{job.place}</p>}
              {job.url && (
                <a href={job.url} target="_blank" rel="noreferrer" className="job-site">
                  {job.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')} ↗
                </a>
              )}
              {job.current && <span className="job-now">Currently here</span>}
            </div>
            <ol className="chapters">
              {job.chapters.map((ch) => (
                <li className="chapter" key={ch.slug}>
                  <span className="chapter-no">CH {String(careerChapters.findIndex((c) => c.slug === ch.slug) + 1).padStart(2, '0')}</span>
                  <div className="chapter-title">
                    <strong>{ch.title}</strong>
                    <span className="chapter-sub">
                      {ch.period}
                      {ch.badge && <em>{ch.badge}</em>}
                    </span>
                    <p className="chapter-summary">{ch.summary}</p>
                    <Link to={`/experience/${ch.slug}`} className="chapter-read">
                      Read the chapter <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
      <h3 className="sub-head reveal">Education</h3>
      <div className="edu">
        {education.map((e) => (
          <div className="edu-card reveal" key={e.school}>
            <span className="period">{e.period}</span>
            <h4>{e.degree}</h4>
            <p className="muted">
              {e.school} · {e.place}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Projects() {
  return (
    <section id="projects" className="section">
      <SectionHead index="03" title="Shipped projects" kicker="Behind each product: the problem, the decisions, and the build." />
      <div className="showcases">
        {projects.map((project, index) => (
          <ProjectShowcase key={project.name} project={project} index={index} />
        ))}
      </div>
    </section>
  )
}

function Explore() {
  const tiles = [
    {
      to: '/experiments',
      label: 'Experiments',
      count: `${experiments.length} builds`,
      text: 'RAG bots, text-to-SQL, pose tracking and other side quests.',
      preview: (
        <div className="tile-minis" aria-hidden="true">
          {experiments.slice(0, 3).map((e) => (
            <span key={e.name}>
              <i />
              {e.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      to: '/certifications',
      label: 'Certifications',
      count: `${certificationCounts.certifications} certifications`,
      text: 'Oracle, Microsoft, AWS and more — plus hackathon wins.',
      preview: (
        <div className="tile-stack">
          {['/certs/aws.jpg', '/certs/oracle.jpg', '/certs/azure.jpg'].map((src) => (
            <img key={src} src={src} alt="" loading="lazy" />
          ))}
        </div>
      ),
    },
    {
      to: '/coding',
      label: 'Coding',
      count: `${coding.totals[0][0]} problems solved`,
      text: 'LeetCode, CodeChef, Code360, GFG and Codeforces in one view.',
      preview: (
        <div className="tile-number" aria-hidden="true">
          <strong>{coding.totals[0][0]}</strong>
          <span>solved</span>
        </div>
      ),
    },
    {
      to: '/analytics',
      label: 'Analytics',
      count: 'Live from GitHub',
      text: 'Repos, languages and activity, pulled in real time.',
      preview: (
        <div className="tile-bars" aria-hidden="true">
          {[62, 38, 84, 50, 70, 30, 92].map((h, i) => (
            <span key={i} style={{ height: `${h}%` }} />
          ))}
        </div>
      ),
    },
  ]
  return (
    <section className="section">
      <SectionHead index="04" title="Explore more" />
      <div className="tiles">
        {tiles.map((t) => (
          <Link to={t.to} className="tile reveal" key={t.to}>
            <div className="tile-preview">{t.preview}</div>
            <div className="tile-body">
              <span className="period">{t.count}</span>
              <h3>
                {t.label} <span aria-hidden="true">→</span>
              </h3>
              <p className="muted">{t.text}</p>
            </div>
          </Link>
        ))}
      </div>
      <Link to="/garage" className="garage-banner reveal">
        <span className="period">Fun zone</span>
        <strong>
          Build your own F1 car <span aria-hidden="true">→</span>
        </strong>
        <span className="muted">Paint the livery, pick a tyre and watch the pit crew change all four wheels — all in Three.js.</span>
      </Link>
    </section>
  )
}

function Skills() {
  const all = Object.values(skills).flat()
  return (
    <section id="skills" className="section">
      <SectionHead index="05" title="Toolkit" />
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...all, ...all].map((s, i) => (
            <span key={i}>{s}</span>
          ))}
        </div>
      </div>
      <div className="skill-grid">
        {Object.entries(skills).map(([group, list]) => (
          <div className="skill-card reveal" key={group}>
            <h4>{group}</h4>
            <div className="chips">
              {list.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Contact() {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.location.href = `mailto:${profile.email}`
    }
  }
  return (
    <section id="contact" className="section contact">
      <SectionHead index="06" title="Let’s build something" />
      <div className="contact-card reveal">
        <p className="lead">Have a role, a project or a half-formed idea? My inbox is open.</p>
        <div className="contact-row">
          <a
            className="btn"
            href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(profile.email)}&su=${encodeURIComponent('Let’s talk')}`}
            target="_blank"
            rel="noreferrer"
          >
            Email me <span aria-hidden="true">→</span>
          </a>
          <button className="btn btn-ghost" onClick={copy}>
            {copied ? 'Copied ✓' : profile.email}
          </button>
        </div>
        <div className="socials">
          <a href={profile.github} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
          <a href={profile.linkedin} target="_blank" rel="noreferrer">
            LinkedIn ↗
          </a>
          <a href={profile.twitter} target="_blank" rel="noreferrer">
            X / Twitter ↗
          </a>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  const small = useIsSmall()
  useReveal()
  return (
    <>
      <Hero small={small} />
      <About />
      <Work />
      <Projects />
      <Explore />
      <Skills />
      <Contact />
    </>
  )
}
