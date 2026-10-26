import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import RenderMetrics from './RenderMetrics'

export default function SceneRuntime({ name }) {
  const elapsed = useRef(0)
  // Fiber 8 resets clock.elapsedTime when frameloop changes. Preserve the scene's
  // animation timeline across scrolling/tab pauses, without advancing hidden time.
  useFrame(({ clock }, delta) => {
    if (clock.elapsedTime < elapsed.current) clock.elapsedTime = elapsed.current + Math.min(delta, 0.05)
    elapsed.current = clock.elapsedTime
  }, -2000)
  return <RenderMetrics name={name} />
}
