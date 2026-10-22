import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { profile } from '../data'
import ChatBot from './ChatBot'

const NAV = [
  { to: '/#about', label: 'About' },
  { to: '/#work', label: 'Work' },
  { to: '/#projects', label: 'Projects' },
  { to: '/experiments', label: 'Experiments', page: true },
  { to: '/coding', label: 'Coding', page: true },
  { to: '/certifications', label: 'Certifications', page: true },
  { to: '/analytics', label: 'Analytics', page: true },
  { to: '/garage', label: 'Garage', page: true },
]

// Scrolls to the #hash after navigation, or to the top on a new page.
function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        requestAnimationFrame(() => el.scrollIntoView())
        return
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
  }, [open])
  useEffect(() => setOpen(false), [pathname])

  return (
    <header className={`header ${scrolled || pathname !== '/' ? 'scrolled' : ''}`}>
      <Link to="/" className="logo" aria-label="Home">
        sk<span>.</span>
      </Link>
      <nav className="nav-desktop">
        {NAV.map((n) =>
          n.page ? (
            <NavLink key={n.to} to={n.to}>
              {n.label}
            </NavLink>
          ) : (
            <Link key={n.to} to={n.to}>
              {n.label}
            </Link>
          )
        )}
      </nav>
      <a className="btn btn-small hide-md" href={`mailto:${profile.email}`}>
        Say hello
      </a>
      <button className={`burger ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
        <span />
        <span />
      </button>
      <div className={`nav-mobile ${open ? 'open' : ''}`}>
        {NAV.map((n, i) => (
          <Link key={n.to} to={n.to} onClick={() => setOpen(false)} style={{ transitionDelay: `${open ? 80 + i * 45 : 0}ms` }}>
            <small>0{i + 1}</small>
            {n.label}
          </Link>
        ))}
        <a className="btn nav-mobile-cta" href={`mailto:${profile.email}`}>
          Say hello →
        </a>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <Link to="/" className="logo">
            sk<span>.</span>
          </Link>
          <p className="muted">Software engineer building AI products end to end.</p>
        </div>
        <nav className="footer-links">
          <Link to="/experiments">Experiments</Link>
          <Link to="/coding">Coding</Link>
          <Link to="/certifications">Certifications</Link>
          <Link to="/analytics">Analytics</Link>
          <Link to="/garage">Garage</Link>
          <a href={profile.github} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
          <a href={profile.linkedin} target="_blank" rel="noreferrer">
            LinkedIn ↗
          </a>
        </nav>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {profile.name}
        </span>
        <span className="muted">Built with React &amp; Three.js</span>
      </div>
    </footer>
  )
}

export default function Layout() {
  return (
    <>
      <div className="grain" aria-hidden="true" />
      <ScrollManager />
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <ChatBot />
    </>
  )
}
