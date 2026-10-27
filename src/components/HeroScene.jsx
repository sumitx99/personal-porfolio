import SceneRuntime from './SceneRuntime'
import { memo, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { useFrameloop } from '../hooks'

const ACCENT = '#d4ff3a'
const SOFT = '#8a8f98'

// Soft round sprite so points render as dots instead of squares.
const dotTexture = (() => {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, '#fff')
  g.addColorStop(0.45, '#fff')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
})()

// Points spread evenly over a sphere (Fibonacci lattice) — the "neurons".
function spherePoints(count, radius) {
  const pts = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const t = golden * i
    pts.push(new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r).multiplyScalar(radius))
  }
  return pts
}

function NeuralShell({ count, radius }) {
  const group = useRef()
  const pointsMat = useRef()

  const { positions, linePositions } = useMemo(() => {
    const pts = spherePoints(count, radius)
    const positions = new Float32Array(pts.flatMap((p) => [p.x, p.y, p.z]))
    // Connect each node to its nearest neighbours.
    const segs = []
    const maxDist = radius * 0.62
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        if (pts[i].distanceTo(pts[j]) < maxDist && Math.random() > 0.35) {
          segs.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z)
        }
      }
    }
    return { positions, linePositions: new Float32Array(segs) }
  }, [count, radius])

  useFrame((state, delta) => {
    group.current.rotation.y += delta * 0.08
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.15
    pointsMat.current.size = 0.09 + Math.sin(state.clock.elapsedTime * 2) * 0.02
  })

  return (
    <group ref={group}>
      <points>
        <bufferGeometry key={count}>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={pointsMat}
          color={ACCENT}
          size={0.09}
          map={dotTexture}
          alphaTest={0.01}
          depthWrite={false}
          sizeAttenuation
          transparent
        />
      </points>
      <lineSegments>
        <bufferGeometry key={count}>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={SOFT} transparent opacity={0.14} />
      </lineSegments>
    </group>
  )
}

function Core() {
  const solid = useRef()
  const wire = useRef()

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    solid.current.rotation.x += delta * 0.15
    solid.current.rotation.y += delta * 0.22
    wire.current.rotation.x -= delta * 0.1
    wire.current.rotation.y -= delta * 0.12
    const s = 1 + Math.sin(t * 1.4) * 0.04
    solid.current.scale.setScalar(s)
  })

  return (
    <group>
      <mesh ref={solid}>
        <icosahedronGeometry args={[1.05, 0]} />
        <meshStandardMaterial color="#141416" roughness={0.25} metalness={0.9} flatShading />
      </mesh>
      <mesh ref={wire} scale={1.45}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color={ACCENT} wireframe transparent opacity={0.55} />
      </mesh>
      <pointLight color={ACCENT} intensity={6} distance={6} />
    </group>
  )
}

function Rings() {
  const ref = useRef()
  useFrame((_, delta) => {
    ref.current.children.forEach((ring, i) => {
      ring.rotation.z += delta * (0.15 + i * 0.08) * (i % 2 ? -1 : 1)
    })
  })
  return (
    <group ref={ref}>
      {[2.05, 2.35, 2.7].map((r, i) => (
        <mesh key={r} rotation={[Math.PI / 2.4 + i * 0.35, i * 0.6, 0]}>
          <torusGeometry args={[r, 0.008, 8, 160]} />
          <meshBasicMaterial color={i === 1 ? ACCENT : '#ecebe6'} transparent opacity={i === 1 ? 0.6 : 0.18} />
        </mesh>
      ))}
    </group>
  )
}

// Small objects drifting around the core: the "tools" orbiting the work.
function Satellites() {
  const items = [
    { pos: [-3.1, 1.4, -0.5], geo: <boxGeometry args={[0.38, 0.38, 0.38]} /> },
    { pos: [3.0, -1.2, 0.3], geo: <octahedronGeometry args={[0.32]} /> },
    { pos: [2.4, 1.9, -1], geo: <torusKnotGeometry args={[0.18, 0.06, 64, 8]} /> },
    { pos: [-2.6, -1.8, 0.6], geo: <tetrahedronGeometry args={[0.34]} /> },
  ]
  return items.map((it, i) => (
    <Float key={i} speed={1.6} rotationIntensity={2} floatIntensity={1.8}>
      <mesh position={it.pos}>
        {it.geo}
        <meshStandardMaterial
          color={i % 2 ? ACCENT : '#ecebe6'}
          roughness={0.35}
          metalness={0.6}
          emissive={i % 2 ? ACCENT : '#000000'}
          emissiveIntensity={0.25}
        />
      </mesh>
    </Float>
  ))
}

// Eases the whole rig toward the pointer and pushes it back as the page scrolls.
function Rig({ children, offsetX }) {
  const ref = useRef()
  const { pointer } = useThree()
  useFrame((_, delta) => {
    const scroll = Math.min(window.scrollY / window.innerHeight, 1)
    const g = ref.current
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, pointer.x * 0.45, 3, delta)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -pointer.y * 0.3 + scroll * 0.6, 3, delta)
    g.position.x = THREE.MathUtils.damp(g.position.x, offsetX, 4, delta)
    g.position.y = THREE.MathUtils.damp(g.position.y, scroll * 1.5, 4, delta)
    g.position.z = THREE.MathUtils.damp(g.position.z, -scroll * 3, 4, delta)
  })
  return <group ref={ref}>{children}</group>
}

function Scene({ small }) {
  const { viewport } = useThree()
  // On wide screens the core sits right of the headline; on phones it centres above it.
  const offsetX = small ? 0 : Math.min(viewport.width * 0.25, 3.4)
  const scale = small ? 0.55 : THREE.MathUtils.clamp(viewport.width / 13, 0.6, 0.85)

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 5, 3]} intensity={1.4} />
      <Rig offsetX={offsetX}>
        <group scale={scale} position={[0, small ? 2.1 : 0, 0]}>
          <Core />
          <Rings />
          <NeuralShell count={140} radius={3.3} />
          <Satellites />
        </group>
      </Rig>
      <Sparkles count={90} scale={[14, 9, 6]} size={2} speed={0.3} color={ACCENT} opacity={0.5} />
    </>
  )
}

function HeroScene({ small }) {
  const ref = useRef()
  const frameloop = useFrameloop(ref)
  return (
    <Canvas
      ref={ref}
      frameloop={frameloop}
      resize={{ scroll: false }}
      camera={{ position: [0, 0, 8], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
    >
      <SceneRuntime name="hero" />
      <Scene small={small} />
    </Canvas>
  )
}

export default memo(HeroScene)
