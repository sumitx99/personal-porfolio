import SceneRuntime from './SceneRuntime'
import { memo, Suspense, useMemo, useRef } from 'react'
import { TouchScroll, useFrameloop } from '../hooks'
import { Canvas } from '@react-three/fiber'
import { Html, OrbitControls, Preload, useGLTF, useProgress } from '@react-three/drei'
import StaticBatch from './StaticBatch'

// "Gaming Desktop PC" by Yolala1232 on Sketchfab (CC BY 4.0), compressed into public/models.
const MODEL = '/models/desktop_pc.glb'

function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <span className="pc-loading">{Math.round(progress)}%</span>
    </Html>
  )
}

function Computer({ small }) {
  const { scene: original } = useGLTF(MODEL)
  const scene = useMemo(() => original.clone(true), [original])
  return (
    <group>
      <hemisphereLight intensity={0.6} groundColor="black" />
      <spotLight position={[-20, 50, 10]} angle={0.12} penumbra={1} intensity={1.2} castShadow shadow-mapSize={1024} decay={0} />
      <pointLight intensity={1.2} position={[0, 2, 0]} decay={0} color="#d4ff3a" />
      <pointLight intensity={0.8} position={[2, 3, 6]} decay={0} />
      <StaticBatch cellSize={Infinity} revision={small}>
        <primitive object={scene} scale={small ? 0.62 : 0.66} position={small ? [0, -1.5, -1.1] : [0, -2.1, -1.1]} rotation={[-0.01, -0.2, -0.1]} />
      </StaticBatch>
    </group>
  )
}

// The desk setup from the coding page header: drag to spin it, it never zooms or flips under the floor.
function DesktopPC({ small }) {
  const ref = useRef()
  const frameloop = useFrameloop(ref)
  return (
    <Canvas ref={ref} frameloop={frameloop} resize={{ scroll: false }} shadows dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'high-performance' }} camera={{ position: [20, 3, 5], fov: 25 }}>
      <SceneRuntime name="desktop-pc" />
      <TouchScroll />
      <Suspense fallback={<Loader />}>
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2} minPolarAngle={Math.PI / 2} autoRotate autoRotateSpeed={0.8} />
        <Computer small={small} />
      </Suspense>
      <Preload all />
    </Canvas>
  )
}

useGLTF.preload(MODEL)

export default memo(DesktopPC)
