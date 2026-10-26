import { memo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'

// Camera orbit changes neither the light nor its casters. Reuse full-resolution maps
// until a team/tyre change or actual pit animation changes the geometry.
function GarageShadows({ active, revision }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const autoUpdate = gl.shadowMap.autoUpdate
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    return () => { gl.shadowMap.autoUpdate = autoUpdate }
  }, [gl])
  useEffect(() => { gl.shadowMap.needsUpdate = true }, [gl, revision, active])
  useFrame(() => {
    if (active) gl.shadowMap.needsUpdate = true
  })
  return <ContactShadows key={revision} frames={active ? Infinity : 1} position={[0, 0.004, 0]} opacity={0.75} scale={9} blur={2.2} far={2} resolution={1024} />
}

export default memo(GarageShadows)
