import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { profile, experience, education } from '../data'
import './ProfilePortrait.css'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const photoTransform = (from, to) => `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`

export default function ProfilePortrait() {
  const trigger = useRef(null)
  const dialog = useRef(null)
  const photo = useRef(null)
  const card = useRef(null)
  const details = useRef(null)
  const closeButton = useRef(null)
  const closing = useRef(false)
  const scrollStyle = useRef(null)
  const animation = useRef(null)

  const restoreScroll = () => {
    if (scrollStyle.current !== null) {
      document.body.style.overflow = scrollStyle.current
      scrollStyle.current = null
    }
  }

  useEffect(() => () => {
    animation.current?.cancel()
    restoreScroll()
  }, [])

  const open = () => {
    if (dialog.current.open) return
    animation.current?.cancel()
    photo.current.style.transform = ''
    const from = trigger.current.getBoundingClientRect()
    closing.current = false
    delete dialog.current.dataset.closing
    scrollStyle.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current.showModal()
    closeButton.current.focus({ preventScroll: true })
    card.current.scrollTop = 0
    details.current.scrollTop = 0
    if (!reducedMotion()) {
      const to = photo.current.getBoundingClientRect()
      animation.current = photo.current.animate(
        [{ transform: photoTransform(from, to) }, { transform: 'none' }],
        { duration: 460, easing: 'cubic-bezier(.22,1,.36,1)' },
      )
    }
  }

  const close = async () => {
    if (closing.current || !dialog.current.open) return
    closing.current = true
    dialog.current.dataset.closing = 'true'
    // Keep an interrupted opening frame still while the whole panel fades.
    if (animation.current?.playState === 'running') {
      photo.current.style.transform = getComputedStyle(photo.current).transform
    }
    animation.current?.cancel()
    if (!reducedMotion()) {
      animation.current = dialog.current.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 180, easing: 'ease-out', fill: 'forwards' },
      )
      await animation.current.finished.catch(() => {})
    }
    dialog.current?.close()
    animation.current?.cancel()
    if (photo.current) photo.current.style.transform = ''
    restoreScroll()
    closing.current = false
  }

  const facts = [
    ['Based in', profile.location],
    ['Currently', `${experience[0].title}, ${experience[0].company}`],
    ['Education', education[0].degree],
    ['University', education[0].school],
    ['Beyond work', 'Cricket, basketball & travel'],
  ]

  return (
    <>
      <figure className="portrait reveal">
        <button ref={trigger} className="portrait-trigger" onClick={open} aria-label={`More about ${profile.name}`} aria-haspopup="dialog">
          <img src="/profile.jpg" alt={`Portrait of ${profile.name}`} loading="lazy" width="1200" height="800" />
          <span className="portrait-hint">Meet Sumit <span aria-hidden="true">↗</span></span>
        </button>
        <figcaption><span className="dot" /> {profile.location}</figcaption>
      </figure>
      {createPortal(
        <dialog
          ref={dialog}
          className="profile-dialog"
          aria-labelledby="profile-title"
          aria-describedby="profile-intro"
          data-lenis-prevent
          onKeyDown={(event) => {
            if (event.key !== 'Tab') return
            const stops = event.currentTarget.querySelectorAll('button, a[href]')
            const first = stops[0]
            const last = stops[stops.length - 1]
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault()
              last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault()
              first.focus()
            }
          }}
          onCancel={(event) => { event.preventDefault(); close() }}
          onClose={restoreScroll}
          onClick={(event) => { if (event.target === event.currentTarget) close() }}
        >
          <button ref={closeButton} className="profile-close" onClick={close} aria-label="Close profile">Close <span aria-hidden="true">×</span></button>
          <article ref={card} className="profile-card">
            <div ref={photo} className="profile-photo">
              <img src="/profile.jpg" alt={profile.name} width="1200" height="800" />
              <span className="profile-photo-caption"><span className="dot" /> A little more human.</span>
            </div>
            <div ref={details} className="profile-details">
              <div className="profile-heading">
                <p className="profile-kicker">BEHIND THE BUILDS · 01</p>
              </div>
              <h2 id="profile-title">{profile.name}</h2>
              <p className="profile-role">{profile.role}</p>
              <p id="profile-intro">I like turning the messy middle—data, models and backend systems—into something people can actually use.</p>
              <dl className="profile-facts">
                {facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
              </dl>
              <p className="profile-note">On the side, I build RideBridge, Kite and Sonia AI, and explore RAG, text-to-SQL and computer vision.</p>
              <div className="profile-links">
                <a href={profile.resume} download>Resume <span aria-hidden="true">↓</span></a>
                <a href={profile.github} target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
                <a href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn <span aria-hidden="true">↗</span></a>
              </div>
            </div>
          </article>
        </dialog>, document.body,
      )}
    </>
  )
}
