import { RobotEnvironment } from './StudioEnvironment'
import SceneRuntime from './SceneRuntime'
import { memo, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Float } from '@react-three/drei'
import * as THREE from 'three'
import { useFrameloop, useRobotActivity } from '../hooks'

const ACCENT = '#d4ff3a'

// Tracks the mouse across the whole window, since the canvas itself is tiny.
function useWindowPointer() {
  const p = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const on = (e) => {
      p.current.x = (e.clientX / window.innerWidth) * 2 - 1
      p.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('pointermove', on, { passive: true })
    return () => window.removeEventListener('pointermove', on)
  }, [])
  return p
}

// Soft radial sprite used as the glow behind the eyes.
function useGlowTexture() {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, 'rgba(212,255,58,0.9)')
    g.addColorStop(0.4, 'rgba(212,255,58,0.25)')
    g.addColorStop(1, 'rgba(212,255,58,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(c)
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

function Eyes({ talking, happy }) {
  const group = useRef()
  const open = useRef()
  const smile = useRef()
  const glow = useGlowTexture()

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    // Blink for ~120ms every 4s; squint while talking.
    const blink = t % 4 < 0.12 ? 0.08 : 1
    const talk = talking ? 0.55 + Math.abs(Math.sin(t * 12)) * 0.45 : 1
    open.current.children.forEach((e) => {
      e.scale.y = THREE.MathUtils.damp(e.scale.y, blink * talk, 30, delta)
    })
    // Swap round eyes for happy ^ ^ arcs on hover.
    open.current.visible = !happy
    smile.current.visible = happy
  })

  return (
    <group ref={group} position={[0, 0.06, 0.865]}>
      <sprite scale={[0.9, 0.45, 1]} position={[0, 0, 0.01]}>
        <spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.55} />
      </sprite>
      <group ref={open}>
        {[-0.17, 0.17].map((x) => (
          <mesh key={x} position={[x, 0, x === 0 ? 0 : -0.012]} rotation={[0, x * 0.9, 0]}>
            <capsuleGeometry args={[0.06, 0.09, 8, 16]} />
            <meshBasicMaterial color={ACCENT} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <group ref={smile} visible={false}>
        {[-0.17, 0.17].map((x) => (
          <mesh key={x} position={[x, -0.03, -0.012]} rotation={[0, x * 0.9, 0]}>
            <torusGeometry args={[0.07, 0.024, 10, 24, Math.PI]} />
            <meshBasicMaterial color={ACCENT} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Orb({ talking, happy }) {
  const head = useRef()
  const ring = useRef()
  const ring2 = useRef()
  const pointer = useWindowPointer()

  useFrame((state, delta) => {
    // The orb sits bottom-right, so most of the page is up-left of it.
    const tx = THREE.MathUtils.clamp(pointer.current.x * 0.7 + 0.25, -0.7, 0.7)
    const ty = THREE.MathUtils.clamp(-pointer.current.y * 0.45 - 0.15, -0.45, 0.35)
    head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, tx, 4, delta)
    head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, ty, 4, delta)
    const speed = talking ? 2.4 : happy ? 1.4 : 0.5
    ring.current.rotation.z += delta * speed
    ring2.current.rotation.z -= delta * speed * 0.6
  })

  return (
    <group>
      <group ref={head}>
        {/* glossy shell */}
        <mesh>
          <sphereGeometry args={[0.8, 64, 64]} />
          <meshPhysicalMaterial color="#eef0f3" metalness={0.08} roughness={0.22} clearcoat={1} clearcoatRoughness={0.08} sheen={0.4} />
        </mesh>
        {/* glass face: a flattened, glossy ellipsoid set into the front of the shell */}
        <mesh position={[0, 0.04, 0.6]} scale={[0.6, 0.4, 0.26]}>
          <sphereGeometry args={[1, 64, 48]} />
          <meshPhysicalMaterial color="#060708" metalness={0.5} roughness={0.06} clearcoat={1} clearcoatRoughness={0.02} />
        </mesh>
        <Eyes talking={talking} happy={happy} />
        {/* side "ears" */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.8, 0, 0]} rotation={[0, 0, (s * Math.PI) / 2]}>
            <mesh>
              <cylinderGeometry args={[0.16, 0.16, 0.08, 32]} />
              <meshStandardMaterial color="#c9ccd2" metalness={1} roughness={0.2} />
            </mesh>
            <mesh position={[0, s * -0.045, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.02, 24]} />
              <meshBasicMaterial color={ACCENT} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>

      {/* orbiting halo rings */}
      <group rotation={[Math.PI / 2.25, 0.3, 0]}>
        <mesh ref={ring}>
          <torusGeometry args={[1.08, 0.012, 12, 128, Math.PI * 1.55]} />
          <meshBasicMaterial color={ACCENT} toneMapped={false} />
        </mesh>
      </group>
      <group rotation={[Math.PI / 1.85, -0.5, 0]}>
        <mesh ref={ring2}>
          <torusGeometry args={[1.18, 0.006, 8, 128, Math.PI * 0.9]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.45} />
        </mesh>
      </group>
    </group>
  )
}

// Faint lime light pool under the orb, so it reads as floating on a dark page.
function HoverPad() {
  const glow = useGlowTexture()
  const ref = useRef()
  useFrame((state) => {
    ref.current.material.opacity = 0.35 + Math.sin(state.clock.elapsedTime * 2.2) * 0.12
  })
  return (
    <sprite ref={ref} position={[0, -1.22, 0]} scale={[2, 0.45, 1]}>
      <spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.35} />
    </sprite>
  )
}

function RobotScene({ talking, excited, active = false }) {
  const ref = useRef()
  const animated = useRobotActivity(active || talking, excited)
  const frameloop = useFrameloop(ref, { continuous: animated })
  return (
    <Canvas ref={ref} frameloop={frameloop} resize={{ scroll: false }} camera={{ position: [0, 0.1, 3.7], fov: 38 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}>
      <SceneRuntime name="robot" />
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 4]} intensity={1.8} />
      {/* Studio reflections built from light panels: no HDR file to download. */}
      <RobotEnvironment />
      <Float speed={2.2} rotationIntensity={0.25} floatIntensity={0.9} floatingRange={[-0.08, 0.08]}>
        <group scale={excited ? 1.06 : 1}>
          <Orb talking={talking} happy={excited} />
        </group>
      </Float>
      <ContactShadows position={[0, -1.25, 0]} opacity={0.7} scale={3.2} blur={2.6} far={2} color="#000000" />
      <HoverPad />
    </Canvas>
  )
}

export default memo(RobotScene)
