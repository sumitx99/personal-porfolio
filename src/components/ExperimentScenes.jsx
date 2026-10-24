import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, PerspectiveCamera, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { useFrameloop, useIsSmall } from '../hooks'

// Small looping 3D scenes for the experiment cards, one per project.

const ACCENT = '#d4ff3a'
const SHELL = '#e9eaee'
const DARK = '#1c1d21'

function Glossy({ color = DARK, ...props }) {
  return <meshStandardMaterial color={color} metalness={0.55} roughness={0.28} {...props} />
}

function Glow({ intensity = 1.6 }) {
  return <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={intensity} toneMapped={false} />
}

function Rig({ children, z = 5.2 }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, z]} fov={35} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} />
      <pointLight position={[-3, -1, 2]} intensity={6} distance={9} color={ACCENT} />
      <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.5}>
        {children}
      </Float>
    </>
  )
}

// Sonia: documents get scanned, chunks stream into an answer bubble.
function Sonia() {
  const lens = useRef()
  const chunks = useRef()
  useFrame((s) => {
    const t = s.clock.elapsedTime
    lens.current.position.set(-0.9 + Math.sin(t * 1.4) * 0.35, Math.cos(t * 1.8) * 0.35, 0.45)
    chunks.current.children.forEach((c, i) => {
      const p = (t * 0.5 + i / 6) % 1
      c.position.set(-0.3 + p * 1.6, Math.sin(p * Math.PI) * 0.35 - 0.1, 0.1)
      c.scale.setScalar(Math.sin(p * Math.PI) * 0.9 + 0.1)
    })
  })
  return (
    <Rig>
      <group position={[-0.95, 0, 0]} rotation={[0, 0.35, 0]}>
        {[0, 1, 2].map((i) => (
          <RoundedBox key={i} args={[0.95, 1.25, 0.05]} radius={0.04} position={[i * 0.12, i * -0.08, -i * 0.18]}>
            <Glossy color={i ? '#2a2c31' : SHELL} />
          </RoundedBox>
        ))}
        {[0.35, 0.18, 0.01, -0.16, -0.33].map((y, i) => (
          <mesh key={y} position={[i === 4 ? -0.12 : 0, y, 0.035]}>
            <boxGeometry args={[i === 4 ? 0.45 : 0.68, 0.06, 0.01]} />
            <meshStandardMaterial color="#9aa0aa" />
          </mesh>
        ))}
      </group>
      <group ref={lens}>
        <mesh>
          <torusGeometry args={[0.22, 0.04, 16, 48]} />
          <Glow />
        </mesh>
        <mesh position={[0.2, -0.2, 0]} rotation={[0, 0, Math.PI / 4]}>
          <capsuleGeometry args={[0.035, 0.18, 6, 12]} />
          <Glossy color={SHELL} />
        </mesh>
      </group>
      <group ref={chunks}>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i}>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <Glow intensity={1.2} />
          </mesh>
        ))}
      </group>
      <group position={[1.45, 0.05, 0]}>
        <RoundedBox args={[0.95, 0.68, 0.22]} radius={0.12}>
          <Glossy />
        </RoundedBox>
        {[-0.2, 0, 0.2].map((x, i) => (
          <mesh key={x} position={[x, 0, 0.13]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            {i === 2 ? <Glow /> : <Glossy color={SHELL} />}
          </mesh>
        ))}
      </group>
    </Rig>
  )
}

// AI SQL Assistant: a database whose rows light up as a query runs.
function AiSql() {
  const rows = useRef()
  const disks = useRef()
  useFrame((s) => {
    const t = s.clock.elapsedTime
    const active = Math.floor(t * 1.5) % 4
    rows.current.children.forEach((r, i) => (r.material.emissiveIntensity = i === active ? 1.4 : 0))
    disks.current.children.forEach((d, i) => (d.material.emissiveIntensity = 0.6 + Math.sin(t * 3 - i) * 0.6))
  })
  return (
    <Rig>
      <group position={[-0.95, -0.05, 0]} rotation={[0.25, 0, 0]}>
        {[0.42, 0, -0.42].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <cylinderGeometry args={[0.55, 0.55, 0.32, 48]} />
            <Glossy />
          </mesh>
        ))}
        <group ref={disks}>
          {[0.58, 0.16, -0.26].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.555, 0.018, 8, 64]} />
              <meshStandardMaterial color={ACCENT} emissive={ACCENT} toneMapped={false} />
            </mesh>
          ))}
        </group>
      </group>
      <mesh position={[0.05, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.1, 0.22, 3]} />
        <Glow />
      </mesh>
      <group position={[1.2, 0, 0]} rotation={[0, -0.3, 0]}>
        <RoundedBox args={[1.25, 1.2, 0.06]} radius={0.04}>
          <Glossy color="#2a2c31" />
        </RoundedBox>
        <mesh position={[0, 0.45, 0.04]}>
          <boxGeometry args={[1.15, 0.18, 0.02]} />
          <Glossy color={SHELL} />
        </mesh>
        <group ref={rows}>
          {[0.18, -0.06, -0.3, -0.54].map((y) => (
            <mesh key={y} position={[0, y + 0.06, 0.04]}>
              <boxGeometry args={[1.15, 0.16, 0.02]} />
              <meshStandardMaterial color="#3a3c42" emissive={ACCENT} emissiveIntensity={0} toneMapped={false} />
            </mesh>
          ))}
        </group>
      </group>
    </Rig>
  )
}

// Postura: a jointed figure doing squats, joints tracked in lime.
function Postura() {
  const hip = useRef()
  const thigh = useRef()
  const shin = useRef()
  const torso = useRef()
  useFrame((s) => {
    const k = (Math.sin(s.clock.elapsedTime * 2.2) + 1) / 2
    hip.current.position.y = 0.15 - k * 0.45
    thigh.current.rotation.z = 0.15 + k * 1.15
    shin.current.rotation.z = -0.3 - k * 1.6
    torso.current.rotation.z = -k * 0.35
  })
  const Joint = (props) => (
    <mesh {...props}>
      <sphereGeometry args={[0.075, 16, 16]} />
      <Glow />
    </mesh>
  )
  return (
    <Rig>
      <group position={[0, -0.1, 0]} rotation={[0, -0.5, 0]}>
        <group ref={hip}>
          <Joint />
          <group ref={torso}>
            <mesh position={[0, 0.42, 0]}>
              <capsuleGeometry args={[0.1, 0.62, 8, 16]} />
              <Glossy color={SHELL} />
            </mesh>
            <Joint position={[0, 0.84, 0]} />
            <mesh position={[0, 1.08, 0]}>
              <sphereGeometry args={[0.17, 24, 24]} />
              <Glossy color={SHELL} />
            </mesh>
            <mesh position={[0.32, 0.72, 0]} rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.06, 0.5, 6, 12]} />
              <Glossy color={SHELL} />
            </mesh>
          </group>
          <group ref={thigh}>
            <mesh position={[0, -0.32, 0]}>
              <capsuleGeometry args={[0.085, 0.5, 8, 16]} />
              <Glossy color={SHELL} />
            </mesh>
            <group position={[0, -0.64, 0]}>
              <Joint />
              <group ref={shin}>
                <mesh position={[0, -0.3, 0]}>
                  <capsuleGeometry args={[0.075, 0.48, 8, 16]} />
                  <Glossy color={SHELL} />
                </mesh>
                <Joint position={[0, -0.6, 0]} />
              </group>
            </group>
          </group>
        </group>
      </group>
      <mesh position={[0, -1.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.64, 64]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.6} />
      </mesh>
    </Rig>
  )
}

function useShieldGeometry() {
  return useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, 0.75)
    s.quadraticCurveTo(0.35, 0.62, 0.6, 0.6)
    s.lineTo(0.6, 0.05)
    s.quadraticCurveTo(0.55, -0.5, 0, -0.8)
    s.quadraticCurveTo(-0.55, -0.5, -0.6, 0.05)
    s.lineTo(-0.6, 0.6)
    s.quadraticCurveTo(-0.35, 0.62, 0, 0.75)
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 4 })
    g.center()
    return g
  }, [])
}

// Claim AI: a protective shield and claims insight bars.
function Claim() {
  const shield = useShieldGeometry()
  const bars = useRef()
  const check = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.22, 0, 0), new THREE.Vector3(-0.05, -0.17, 0), new THREE.Vector3(0.25, 0.2, 0)], false, 'catmullrom', 0)
    return new THREE.TubeGeometry(c, 20, 0.045, 8)
  }, [])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    bars.current.children.forEach((b, i) => {
      const h = 0.4 + i * 0.3 + Math.sin(t * 2 + i) * 0.12
      b.scale.y = h
      b.position.y = -0.7 + h / 2
    })
  })
  return (
    <Rig>
      <group position={[-0.7, 0.05, 0]} rotation={[0, 0.35, 0]}>
        <mesh geometry={shield}>
          <Glossy color={SHELL} />
        </mesh>
        <mesh geometry={check} position={[0, 0, 0.16]}>
          <Glow />
        </mesh>
      </group>
      <group ref={bars} position={[0.75, 0, 0]} rotation={[0, -0.35, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[i * 0.36 - 0.36, 0, 0]}>
            <boxGeometry args={[0.24, 1, 0.24]} />
            {i === 2 ? <Glow intensity={1.1} /> : <Glossy color={i ? SHELL : '#3a3c42'} />}
          </mesh>
        ))}
      </group>
    </Rig>
  )
}

// Market Predictor: candlesticks, a rising trend line and a little forest.
function Market() {
  const candles = useRef()
  const data = [
    [0.3, false],
    [0.45, true],
    [0.62, true],
    [0.5, false],
    [0.8, true],
    [1.05, true],
  ]
  const trend = useMemo(() => {
    const pts = data.map(([h], i) => new THREE.Vector3(i * 0.32 - 0.8, h - 0.25, 0.2))
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.025, 8)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useFrame((s) => {
    candles.current.children.forEach((c, i) => (c.position.y = Math.sin(s.clock.elapsedTime * 1.5 + i) * 0.04))
  })
  return (
    <Rig>
      <group position={[-0.35, -0.1, 0]} rotation={[0.1, 0.25, 0]}>
        <group ref={candles}>
          {data.map(([h, up], i) => (
            <group key={i} position={[i * 0.32 - 0.8, 0, 0]}>
              <mesh position={[0, h / 2 - 0.45, 0]}>
                <boxGeometry args={[0.18, h * 0.7, 0.18]} />
                {up ? <Glow intensity={0.9} /> : <Glossy color={SHELL} />}
              </mesh>
              <mesh position={[0, h / 2 - 0.45, 0]}>
                <cylinderGeometry args={[0.012, 0.012, h + 0.2, 6]} />
                <Glossy color="#9aa0aa" />
              </mesh>
            </group>
          ))}
        </group>
        <mesh geometry={trend}>
          <meshBasicMaterial color={SHELL} />
        </mesh>
      </group>
      {[1.35, 1.75].map((x, i) => (
        <group key={x} position={[x, -0.35 + i * 0.05, -0.3]}>
          <mesh position={[0, 0.5, 0]}>
            <icosahedronGeometry args={[0.28 - i * 0.04, 0]} />
            <meshStandardMaterial color="#5fd39a" flatShading roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 0.45, 8]} />
            <Glossy color="#6b5a45" />
          </mesh>
        </group>
      ))}
    </Rig>
  )
}

// J.A.R.V.I.S: a voice core wrapped in a live equalizer ring.
function Jarvis() {
  const bars = useRef()
  const ring = useRef()
  const N = 36
  useFrame((s) => {
    const t = s.clock.elapsedTime
    bars.current.children.forEach((b, i) => {
      b.scale.y = 0.35 + Math.abs(Math.sin(t * 4 + i * 0.6) * Math.sin(t * 1.3 + i * 0.2)) * 1.6
    })
    ring.current.rotation.z = t * 0.6
  })
  return (
    <Rig z={4.6}>
      <mesh>
        <sphereGeometry args={[0.42, 48, 48]} />
        <meshPhysicalMaterial color={DARK} metalness={0.6} roughness={0.15} clearcoat={1} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.16, 24, 24]} />
        <Glow intensity={2.2} />
      </mesh>
      <mesh ref={ring}>
        <torusGeometry args={[0.55, 0.012, 8, 96, Math.PI * 1.4]} />
        <Glow />
      </mesh>
      <group ref={bars}>
        {Array.from({ length: N }, (_, i) => {
          const a = (i / N) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.82, Math.sin(a) * 0.82, 0]} rotation={[0, 0, a - Math.PI / 2]}>
              <boxGeometry args={[0.05, 0.22, 0.05]} />
              {i % 3 ? <Glossy color={SHELL} /> : <Glow intensity={1.2} />}
            </mesh>
          )
        })}
      </group>
    </Rig>
  )
}

function Car({ color, offset }) {
  const ref = useRef()
  useFrame((s) => {
    ref.current.position.x = ((s.clock.elapsedTime * 0.5 + offset) % 2.6) - 1.6
  })
  return (
    <group ref={ref} position={[0, -0.32, 0.15]}>
      <RoundedBox args={[0.55, 0.2, 0.3]} radius={0.06}>
        <Glossy color={color} />
      </RoundedBox>
      <RoundedBox args={[0.3, 0.14, 0.26]} radius={0.05} position={[-0.03, 0.15, 0]}>
        <Glossy color={color} />
      </RoundedBox>
      <lineSegments position={[0, 0.06, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(0.72, 0.5, 0.42)]} />
        <lineBasicMaterial color={ACCENT} />
      </lineSegments>
    </group>
  )
}

// IntelliTraffic: detected cars roll past a light that adapts.
function Traffic() {
  const lights = useRef()
  useFrame((s) => {
    const phase = Math.floor(s.clock.elapsedTime / 1.6) % 3
    lights.current.children.forEach((l, i) => (l.material.emissiveIntensity = i === phase ? 2 : 0.05))
  })
  const colors = ['#ff5b5b', '#ffc93c', ACCENT]
  return (
    <Rig>
      <group rotation={[0.35, -0.3, 0]}>
        <mesh position={[0, -0.47, 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.4, 0.9]} />
          <meshStandardMaterial color="#232428" />
        </mesh>
        {[-1.2, -0.6, 0, 0.6, 1.2].map((x) => (
          <mesh key={x} position={[x, -0.46, 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.28, 0.04]} />
            <meshBasicMaterial color="#6b6e76" />
          </mesh>
        ))}
        <Car color={SHELL} offset={0} />
        <Car color="#62b6f0" offset={1.3} />
        <group position={[1.45, 0.25, -0.45]}>
          <mesh position={[0, -0.55, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.9, 8]} />
            <Glossy />
          </mesh>
          <RoundedBox args={[0.3, 0.82, 0.24]} radius={0.06}>
            <Glossy />
          </RoundedBox>
          <group ref={lights}>
            {colors.map((c, i) => (
              <mesh key={c} position={[0, 0.25 - i * 0.25, 0.12]}>
                <sphereGeometry args={[0.085, 20, 20]} />
                <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0} toneMapped={false} />
              </mesh>
            ))}
          </group>
        </group>
      </group>
    </Rig>
  )
}

// ATS Resume Checker: a résumé and a match gauge that fills up.
function Ats() {
  const fill = useRef()
  useFrame((s) => {
    fill.current.material.emissiveIntensity = 1 + Math.sin(s.clock.elapsedTime * 2) * 0.5
  })
  const arc = useMemo(() => new THREE.TorusGeometry(0.62, 0.07, 16, 96, Math.PI * 0.87), [])
  return (
    <Rig>
      <group position={[-0.85, 0, 0]} rotation={[0, 0.4, -0.06]}>
        <RoundedBox args={[0.95, 1.3, 0.05]} radius={0.04}>
          <Glossy color={SHELL} />
        </RoundedBox>
        <mesh position={[-0.24, 0.38, 0.04]}>
          <circleGeometry args={[0.13, 32]} />
          <Glow intensity={0.9} />
        </mesh>
        {[0.42, 0.32, 0.08, -0.08, -0.24, -0.4].map((y, i) => (
          <mesh key={y} position={[i < 2 ? 0.14 : 0, y, 0.035]}>
            <boxGeometry args={[i < 2 ? 0.36 : 0.7, 0.05, 0.01]} />
            <meshStandardMaterial color={i === 3 ? ACCENT : '#7d828c'} emissive={i === 3 ? ACCENT : '#000'} emissiveIntensity={0.6} />
          </mesh>
        ))}
      </group>
      <group position={[0.85, -0.15, 0]} rotation={[0, -0.3, 0]}>
        <mesh>
          <torusGeometry args={[0.62, 0.07, 16, 96, Math.PI]} />
          <Glossy color="#34363c" />
        </mesh>
        {/* Mirrored so the 87% arc fills from the left, like a gauge. */}
        <mesh ref={fill} geometry={arc} position={[0, 0, 0.02]} scale={[-1, 1, 1]}>
          <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={1.4} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <sphereGeometry args={[0.1, 20, 20]} />
          <Glossy color={SHELL} />
        </mesh>
      </group>
    </Rig>
  )
}

// YouTube → Notes: a video turns into a stack of notes.
function Youtube() {
  const pages = useRef()
  const play = useMemo(() => {
    const tri = new THREE.Shape([new THREE.Vector2(-0.12, -0.16), new THREE.Vector2(-0.12, 0.16), new THREE.Vector2(0.17, 0)])
    return new THREE.ExtrudeGeometry(tri, { depth: 0.05, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3 })
  }, [])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    pages.current.children.forEach((p, i) => {
      p.rotation.z = Math.sin(t * 1.5 + i * 0.5) * 0.08 - i * 0.06
      p.position.y = i * -0.05 + Math.sin(t * 2 + i) * 0.03
    })
  })
  return (
    <Rig>
      <group position={[-0.85, 0.05, 0]} rotation={[0, 0.35, 0]}>
        <RoundedBox args={[1.25, 0.82, 0.12]} radius={0.08}>
          <Glossy />
        </RoundedBox>
        <mesh geometry={play} position={[0.02, 0.03, 0.07]}>
          <Glow />
        </mesh>
        <mesh position={[-0.12, -0.33, 0.07]}>
          <boxGeometry args={[0.7, 0.03, 0.01]} />
          <Glow intensity={0.8} />
        </mesh>
      </group>
      <mesh position={[0.15, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.08, 0.18, 3]} />
        <Glossy color={SHELL} />
      </mesh>
      <group ref={pages} position={[1.05, 0, 0]} rotation={[0, -0.35, 0]}>
        {[0, 1, 2].map((i) => (
          <group key={i} position={[i * 0.06, 0, -i * 0.12]}>
            <RoundedBox args={[0.82, 1.08, 0.03]} radius={0.03}>
              <Glossy color={i ? '#3a3c42' : SHELL} />
            </RoundedBox>
            {i === 0 &&
              [0.3, 0.14, -0.02, -0.18, -0.34].map((y, j) => (
                <mesh key={y} position={[j === 0 ? -0.08 : 0, y, 0.025]}>
                  <boxGeometry args={[j === 0 ? 0.42 : 0.6, j === 0 ? 0.06 : 0.035, 0.01]} />
                  {j === 0 ? <Glow intensity={0.9} /> : <meshStandardMaterial color="#7d828c" />}
                </mesh>
              ))}
          </group>
        ))}
      </group>
    </Rig>
  )
}

// Drug Review Sentiment: a capsule orbited by rating stars.
function Drug() {
  const pill = useRef()
  const stars = useRef()
  useFrame((s, d) => {
    pill.current.rotation.z += d * 0.6
    pill.current.rotation.y += d * 0.4
    stars.current.rotation.y = s.clock.elapsedTime * 0.7
  })
  return (
    <Rig z={4.8}>
      <group ref={pill} rotation={[0, 0, 0.6]}>
        <mesh position={[0, 0.28, 0]}>
          <capsuleGeometry args={[0.3, 0.56, 12, 32]} />
          <meshPhysicalMaterial color={SHELL} roughness={0.2} clearcoat={1} />
        </mesh>
        <mesh position={[0, -0.28, 0]}>
          <capsuleGeometry args={[0.305, 0.56, 12, 32]} />
          <meshPhysicalMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.35} roughness={0.2} clearcoat={1} />
        </mesh>
      </group>
      <group ref={stars} rotation={[0.35, 0, 0.15]}>
        {Array.from({ length: 5 }, (_, i) => {
          const a = (i / 5) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15]} rotation={[0, 0, Math.PI / 4]}>
              <octahedronGeometry args={[0.12, 0]} />
              {i < 4 ? <Glow intensity={1.1} /> : <Glossy color="#3a3c42" />}
            </mesh>
          )
        })}
      </group>
    </Rig>
  )
}

const SCENES = {
  Sonia,
  'AI SQL Assistant': AiSql,
  Postura,
  'Claim AI Assistant': Claim,
  'Market Predictor': Market,
  'J.A.R.V.I.S': Jarvis,
  IntelliTraffic: Traffic,
  'ATS Resume Checker': Ats,
  'YouTube → Notes': Youtube,
  'Drug Review Sentiment': Drug,
}

// Each card draws its scene in its own canvas inside the card, so the scene scrolls with the card.
// Drawing pauses while the page scrolls or the card is off screen; a paused canvas keeps showing
// its last frame in place, so nothing jumps or disappears.
export function ExperimentStage({ name, className = 'exp-stage' }) {
  const Scene = SCENES[name]
  const ref = useRef()
  const small = useIsSmall()
  const frameloop = useFrameloop(ref)
  if (!Scene) return null
  return (
    <div ref={ref} className={className}>
      <Canvas
        frameloop={frameloop}
        dpr={small ? 1 : [1, 1.25]}
        gl={{ alpha: true, antialias: !small, powerPreference: 'high-performance' }}
        style={{ pointerEvents: 'none' }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}

// Kept so pages that still mount it don't break; every card now has its own canvas.
export function SceneCanvas() {
  return null
}
