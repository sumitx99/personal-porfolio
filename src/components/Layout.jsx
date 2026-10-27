import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { profile } from '../data'
import ChatBot from './ChatBot'
import { useIsSmall } from '../hooks'

const talkHref = profile.booking || `mailto:${profile.email}?subject=${encodeURIComponent('Let’s have a talk')}`

const NAV = [
  { to: '/#about', label: 'About' },
  { to: '/#work', label: 'Work' },
  { to: '/experiments', label: 'Experiments', page: true },
  { to: '/coding', label: 'Coding', page: true },
  { to: '/certifications', label: 'Certifications', page: true },
  { to: '/analytics', label: 'Analytics', page: true },
  { to: '/garage', label: 'Garage', page: true },
]

// Eased wheel scrolling on desktop (touch keeps the phone's own native scrolling).
let lenis = null
function SmoothScroll() {
  const small = useIsSmall()
  useEffect(() => {
    if (small || !window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const scroller = new Lenis({ lerp: 0.11, smoothWheel: true })
    lenis = scroller
    let disposed = false
    let id = requestAnimationFrame(function raf(t) {
      if (disposed) return
      scroller.raf(t)
      id = requestAnimationFrame(raf)
    })
    return () => {
      disposed = true
      cancelAnimationFrame(id)
      // Reset scrolling before destruction so a pending native-velocity timer
      // cannot re-add Lenis classes after switching to the mobile breakpoint.
      scroller.stop()
      scroller.destroy()
      if (lenis === scroller) lenis = null
    }
  }, [small])
  return null
}

function scrollToTarget(target) {
  if (lenis) lenis.scrollTo(target, { immediate: true, force: true })
  else if (typeof target === 'number') window.scrollTo(0, target)
  else target.scrollIntoView()
}

// Scrolls to the #hash after navigation, or to the top on a new page.
function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        requestAnimationFrame(() => scrollToTarget(el))
        return
      }
    }
    scrollToTarget(0)
  }, [pathname, hash])
  return null
}

// Records one page view per route. The visitor id is a random string kept in this browser, so the
// Analytics page can count unique visitors without cookies or personal data.
function visitorId() {
  try {
    let id = localStorage.getItem('sk-vid')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('sk-vid', id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

function VisitTracker() {
  const { pathname } = useLocation()
  const last = useRef(null)
  useEffect(() => {
    if (last.current === pathname) return
    last.current = pathname
    fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname, vid: visitorId() }),
      keepalive: true,
    })
      .then(() => window.dispatchEvent(new Event('sk-visit')))
      .catch(() => {})
  }, [pathname])
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
    document.body.classList.toggle('menu-open', open)
    if (open) lenis?.stop()
    else lenis?.start()
  }, [open])
  useEffect(() => setOpen(false), [pathname])

  return (
    <>
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
        <a className="btn btn-small talk-btn" href={talkHref} target="_blank" rel="noreferrer">
          <i className="talk-dot" aria-hidden="true" />
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3.5" y="5" width="17" height="15" rx="3" />
            <path d="M3.5 10h17M8 3v4M16 3v4" />
          </svg>
          <b className="talk-label">Let’s talk</b>
        </a>
        <button className={`burger ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
          <span />
          <span />
        </button>
      </header>
      {/* Outside <header> on purpose: a blurred parent would shrink this fixed overlay to the header bar. */}
      <div className={`nav-mobile ${open ? 'open' : ''}`} data-lenis-prevent>
        {NAV.map((n, i) => (
          <Link key={n.to} to={n.to} onClick={() => setOpen(false)} style={{ transitionDelay: `${open ? 80 + i * 45 : 0}ms` }}>
            <small>0{i + 1}</small>
            {n.label}
          </Link>
        ))}
        <a className="btn nav-mobile-cta" href={talkHref} target="_blank" rel="noreferrer">
          Let’s talk →
        </a>
      </div>
    </>
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
          <a href={profile.resume} download>
            Download resume ↓
          </a>
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
      </div>
    </footer>
  )
}

export default function Layout() {
  return (
    <>
      <div className="grain" aria-hidden="true" />
      <SmoothScroll />
      <ScrollManager />
      <VisitTracker />
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <ChatBot />
    </>
  )
}
