import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

// Kept out of ../hooks so pages without a canvas never pull three.js into the main bundle.
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
