import { memo } from 'react'
import { Environment, Lightformer } from '@react-three/drei'

// Environment's portal recaptures its cube map when its children change identity.
// Keep these trees stable across scroll/visibility/frameloop and UI updates.
export const CarEnvironment = memo(function CarEnvironment() {
  return (
    <Environment resolution={512} frames={1} environmentIntensity={1}>
      <Lightformer form="rect" intensity={4} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[8, 2.5, 1]} />
      <Lightformer form="rect" intensity={2.4} position={[-7, 2.2, 0]} rotation-y={Math.PI / 2} scale={[12, 4, 1]} />
      <Lightformer form="rect" intensity={1.4} color="#dfe6ff" position={[12, 9, 0]} rotation-y={-Math.PI / 2} scale={[30, 2, 1]} />
      <Lightformer form="rect" intensity={0.6} position={[0, 2, -12]} scale={[14, 2, 1]} />
      <Lightformer form="rect" intensity={0.6} position={[0, 2, 12]} rotation-y={Math.PI} scale={[14, 2, 1]} />
    </Environment>
  )
})

export const RobotEnvironment = memo(function RobotEnvironment() {
  return (
    <Environment resolution={128} frames={1}>
      <Lightformer intensity={2.2} position={[0, 4, 3]} scale={[6, 1.2, 1]} />
      <Lightformer intensity={1.2} position={[-4, 1, 2]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} />
      <Lightformer intensity={0.5} color="#d4ff3a" position={[4, -1, 1]} rotation-y={-Math.PI / 2} scale={[3, 2, 1]} />
      <Lightformer intensity={1.6} position={[2, 2, 5]} scale={[3, 3, 1]} />
      <Lightformer intensity={0.6} position={[0, -3, -4]} scale={[8, 4, 1]} />
    </Environment>
  )
})
