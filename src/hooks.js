import { useEffect, useState, useSyncExternalStore } from 'react'
import { useThree } from '@react-three/fiber'

export function useIsSmall(query = '(max-width: 760px)') {
  const [small, setSmall] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setSmall(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return small
}

// Adds .in to every .reveal element once it scrolls into view.
// Pass deps when a page renders new .reveal elements later (e.g. after a fetch).
export function useReveal(deps = []) {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.12 }
    )
    document.querySelectorAll('.reveal:not(.in)').forEach((el) => io.observe(el))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

// One shared scroll listener. While the page is scrolling, 3D canvases skip drawing so the browser
// can spend every frame on the scroll itself; they pick up again a moment after it stops.
let scrolling = false
let idle
const subscribers = new Set()
const notify = () => subscribers.forEach((f) => f())
function onScroll() {
  if (!scrolling) {
    scrolling = true
    notify()
  }
  clearTimeout(idle)
  idle = setTimeout(() => {
    scrolling = false
    notify()
  }, 160)
}
function subscribeScroll(f) {
  if (!subscribers.size) window.addEventListener('scroll', onScroll, { passive: true })
  subscribers.add(f)
  return () => {
    subscribers.delete(f)
    if (!subscribers.size) window.removeEventListener('scroll', onScroll)
  }
}

export function useScrolling() {
  return useSyncExternalStore(subscribeScroll, () => scrolling)
}

// Keep the robot fully rendered, but let its GPU sleep when nobody interacts.
// Touch scrolling must not wake a decorative canvas on every pointermove.
export function useRobotActivity(active, expression) {
  const [awake, setAwake] = useState(true)
  useEffect(() => {
    if (active) {
      setAwake(true)
      return
    }
    let idleTimer
    const wake = () => {
      setAwake(true)
      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => setAwake(false), 600)
    }
    const onPointer = (event) => {
      if (event.pointerType === 'mouse') wake()
    }
    wake()
    window.addEventListener('pointermove', onPointer, { passive: true })
    return () => {
      clearTimeout(idleTimer)
      window.removeEventListener('pointermove', onPointer)
    }
  }, [active, expression])
  return active || awake
}

// Frameloop for a <Canvas ref={ref}>: renders only while on screen, and pauses during scrolling.
// `observe: false` is for canvases fixed to the screen, which are always in view.
export function useFrameloop(ref, { pauseOnScroll = true, observe = true, continuous = true } = {}) {
  const [visible, setVisible] = useState(true)
  const [pageVisible, setPageVisible] = useState(() => !document.hidden)
  const isScrolling = useScrolling()
  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])
  useEffect(() => {
    const el = ref.current
    if (!el || !observe) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '80px' })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, observe])
  return pageVisible && visible && !(pauseOnScroll && isScrolling) ? (continuous ? 'always' : 'demand') : 'never'
}

// OrbitControls blocks all touch gestures on its canvas. This lets a vertical swipe scroll the page
// while a sideways drag still spins the model.
// Drop inside a <Canvas> that has OrbitControls.
export function TouchScroll() {
  useTouchScroll(useThree((s) => s.gl))
  return null
}

// The controls reset touch-action whenever they reconnect, so keep re-applying it.
export function useTouchScroll(gl) {
  useEffect(() => {
    const el = gl.domElement
    const fix = () => {
      if (el.style.touchAction !== 'pan-y') el.style.touchAction = 'pan-y'
    }
    fix()
    const mo = new MutationObserver(fix)
    mo.observe(el, { attributes: true, attributeFilter: ['style'] })
    return () => mo.disconnect()
  }, [gl])
}
