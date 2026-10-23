import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { PIT_TIMELINE as T, TEAMS } from '../f1'
import { makeBlanketTyre } from './PitGear'

// A night-race pit lane laid out like a real one. The car sits in its pit box facing +Z, the garage
// opens onto the lane at -X, and the fast lane, pit wall and main straight run along +X.
const GARAGE_X = -5.6 // garage mouth
const GARAGE_DEPTH = 10.5
const GARAGE_W = 12 // one team's garage along the lane
const CEILING = 4.4
const FAST_LANE_X = 5.4 // white line between the working lane and the fast lane
const PIT_WALL_X = 9.6
const LANE_LEN = 90

// Faces only show from the pit-lane side, so the camera can orbit through walls and roofs without
// them blocking the car.
const one = THREE.FrontSide

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

const shade = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString()

function signTexture(team) {
  return canvasTexture(2048, 256, (g, w, h) => {
    g.fillStyle = shade(team.color, 0.35)
    g.fillRect(0, 0, w, h)
    g.fillStyle = team.color
    g.fillRect(0, h - 26, w, 26)
    g.fillStyle = '#ffffff'
    g.font = '800 120px Unbounded, Arial Black, sans-serif'
    g.textBaseline = 'middle'
    g.fillText(team.name.toUpperCase(), 90, h / 2 - 8)
    g.font = '600 64px "JetBrains Mono", monospace'
    g.textAlign = 'right'
    g.globalAlpha = 0.75
    g.fillText(team.car, w - 90, h / 2 - 8)
  })
}

// Back wall: team-coloured panels with a big wordmark and a stripe, like the branded garage walls.
function backWallTexture(team) {
  return canvasTexture(2048, 768, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, shade(team.color, 0.16))
    grad.addColorStop(1, shade(team.color, 0.42))
    g.fillStyle = grad
    g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(255,255,255,0.07)'
    g.lineWidth = 4
    for (let x = 0; x <= w; x += w / 8) {
      g.beginPath()
      g.moveTo(x, 0)
      g.lineTo(x, h)
      g.stroke()
    }
    g.fillStyle = team.color
    g.fillRect(0, h * 0.62, w, 18)
    g.fillStyle = 'rgba(255,255,255,0.92)'
    g.font = '800 150px Unbounded, Arial Black, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(team.name.toUpperCase(), w / 2, h * 0.38)
    g.font = '500 44px "JetBrains Mono", monospace'
    g.globalAlpha = 0.6
    g.fillText(`${team.car} · RACE TEAM · PIT 01`, w / 2, h * 0.75)
  })
}

// Telemetry screens: dark panels with traces, so the garage reads as a working engineering space.
const screenTexture = canvasTexture(512, 288, (g, w, h) => {
  g.fillStyle = '#05070b'
  g.fillRect(0, 0, w, h)
  const colors = ['#d4ff3a', '#3ad1ff', '#ff4d6d', '#ffffff']
  colors.forEach((c, i) => {
    g.strokeStyle = c
    g.globalAlpha = 0.85
    g.lineWidth = 3
    g.beginPath()
    for (let x = 0; x <= w; x += 8) {
      const y = h * (0.2 + i * 0.2) + Math.sin(x * 0.03 + i * 2) * 14 + Math.sin(x * 0.11 + i) * 6
      x ? g.lineTo(x, y) : g.moveTo(x, y)
    }
    g.stroke()
  })
  g.globalAlpha = 1
  g.fillStyle = '#d4ff3a'
  g.font = '600 26px "JetBrains Mono", monospace'
  g.fillText('LAP 32  S1 28.412  S2 31.077', 16, 34)
})

// Pit box paint on the asphalt: box outline, a wheel mark for each corner and the stop line.
function boxTexture(color) {
  return canvasTexture(512, 1024, (g, w, h) => {
    const px = w / 6 // 6 m wide, 12 m long
    g.clearRect(0, 0, w, h)
    g.strokeStyle = 'rgba(255,255,255,0.85)'
    g.lineWidth = 0.1 * px
    g.strokeRect(0.6 * px, 1.4 * px, 4.8 * px, 9.6 * px)
    g.fillStyle = color
    for (const [x, z] of [[-0.82, 1.95], [0.82, 1.95], [-0.82, -1.65], [0.82, -1.65]]) {
      g.fillRect((3 + x - 0.28) * px, (6 - z - 0.04) * px, 0.56 * px, 0.08 * px)
      g.fillRect((3 + x - 0.04) * px, (6 - z - 0.3) * px, 0.08 * px, 0.6 * px)
    }
    g.fillRect(1.2 * px, (6 - 3.55) * px, 3.6 * px, 0.14 * px)
  })
}

const MAT = {
  steel: new THREE.MeshStandardMaterial({ color: '#2b2e35', metalness: 0.7, roughness: 0.4 }),
  dark: new THREE.MeshStandardMaterial({ color: '#15161a', roughness: 0.7 }),
  chrome: new THREE.MeshStandardMaterial({ color: '#c9ccd2', metalness: 1, roughness: 0.2 }),
  concrete: new THREE.MeshStandardMaterial({ color: '#8c8f95', roughness: 0.85 }),
  white: new THREE.MeshStandardMaterial({ color: '#e9eaec', roughness: 0.6 }),
  lightPanel: new THREE.MeshBasicMaterial({ color: '#f3f6ff', toneMapped: false }),
  warmLight: new THREE.MeshBasicMaterial({ color: '#fff1d6', toneMapped: false }),
  screen: new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false }),
  glass: new THREE.MeshStandardMaterial({ color: '#7fa2c8', metalness: 0.9, roughness: 0.08, transparent: true, opacity: 0.35 }),
  fence: new THREE.MeshStandardMaterial({
    color: '#9aa0aa',
    metalness: 0.6,
    roughness: 0.5,
    transparent: true,
    alphaTest: 0.3,
    side: THREE.DoubleSide,
    alphaMap: (() => {
      const t = canvasTexture(64, 64, (g, w, h) => {
        g.fillStyle = '#000'
        g.fillRect(0, 0, w, h)
        g.strokeStyle = '#fff'
        g.lineWidth = 4
        g.beginPath()
        g.moveTo(0, 0)
        g.lineTo(w, h)
        g.moveTo(w, 0)
        g.lineTo(0, h)
        g.stroke()
      })
      t.colorSpace = THREE.NoColorSpace
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(LANE_LEN * 9, 26)
      return t
    })(),
  }),
}

function Box({ size, position, material = MAT.dark, cast = true, ...rest }) {
  return (
    <mesh position={position} material={material} castShadow={cast} receiveShadow {...rest}>
      <boxGeometry args={size} />
    </mesh>
  )
}

function useSurfaces(wet) {
  const [aDiff, aNor, aRough, gDiff, gNor, gRough] = useTexture([
    '/paddock/asphalt_pit_lane_diff.webp',
    '/paddock/asphalt_pit_lane_nor_gl.webp',
    '/paddock/asphalt_pit_lane_rough.webp',
    '/paddock/garage_floor_diff.webp',
    '/paddock/garage_floor_nor_gl.webp',
    '/paddock/garage_floor_rough.webp',
  ])
  return useMemo(() => {
    const tile = (t, x, y, color) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(x, y)
      t.anisotropy = 8
      if (color) t.colorSpace = THREE.SRGBColorSpace
      return t
    }
    // Poly Haven scans: ~3 m of real asphalt per texture tile, ~2 m of garage floor.
    const lane = { x: (PIT_WALL_X - GARAGE_X) / 3, y: LANE_LEN / 3 }
    const asphalt = new THREE.MeshStandardMaterial({
      map: tile(aDiff, lane.x, lane.y, true),
      normalMap: tile(aNor, lane.x, lane.y),
      roughnessMap: tile(aRough, lane.x, lane.y),
      color: '#9a9ca3',
      // Wet track: the same asphalt, but slick and mirror-dark.
      roughness: wet ? 0.28 : 1,
      envMapIntensity: wet ? 1.6 : 0.6,
      normalScale: new THREE.Vector2(0.8, 0.8),
    })
    const floor = new THREE.MeshStandardMaterial({
      map: tile(gDiff, GARAGE_DEPTH / 2, LANE_LEN / 2, true),
      normalMap: tile(gNor, GARAGE_DEPTH / 2, LANE_LEN / 2),
      roughnessMap: tile(gRough, GARAGE_DEPTH / 2, LANE_LEN / 2),
      color: '#8e9196',
      roughness: 0.55,
      envMapIntensity: 1.2,
    })
    return { asphalt, floor }
  }, [aDiff, aNor, aRough, gDiff, gNor, gRough, wet])
}

// One team's garage: branded back wall, light ceiling, tyre trolleys, tool chests and the engineers'
// screens. Neighbouring garages reuse it in their own colours with fewer props.
function Garage({ team, z, main }) {
  const sign = useMemo(() => signTexture(team), [team])
  const wall = useMemo(() => backWallTexture(team), [team])
  const tyres = useMemo(() => {
    if (!main) return []
    return [-1, 1].map((s) => {
      const g = new THREE.Group()
      for (let i = 0; i < 4; i++) {
        const t = makeBlanketTyre(0.36, 0.38, team.color)
        t.position.set(0, 0.62 + (i % 2) * 0.76, (i < 2 ? -0.3 : 0.3))
        t.rotation.y = Math.PI / 2
        g.add(t)
      }
      g.position.set(GARAGE_X - 1.6, 0, s * 4.6)
      return g
    })
  }, [team, main])
  const back = GARAGE_X - GARAGE_DEPTH
  const mid = GARAGE_X - GARAGE_DEPTH / 2
  return (
    <group position={[0, 0, z]}>
      {/* back wall and side partitions */}
      <mesh position={[back, CEILING / 2, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[GARAGE_W, CEILING]} />
        <meshStandardMaterial map={wall} roughness={0.7} side={one} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[mid, CEILING / 2, s * (GARAGE_W / 2)]} rotation-y={s > 0 ? Math.PI : 0}>
          <planeGeometry args={[GARAGE_DEPTH, CEILING]} />
          <meshStandardMaterial color={shade(team.color, 0.22)} roughness={0.8} side={one} />
        </mesh>
      ))}
      {/* ceiling with a grid of light boxes */}
      <mesh position={[mid, CEILING, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[GARAGE_DEPTH, GARAGE_W]} />
        <meshStandardMaterial color="#1b1d22" roughness={1} side={one} />
      </mesh>
      {[...Array(3)].flatMap((_, i) =>
        [-1, 0, 1].map((j) => (
          <mesh key={`${i}${j}`} position={[GARAGE_X - 1.6 - i * 3.2, CEILING - 0.02, j * 3.6]} rotation-x={Math.PI / 2} material={MAT.lightPanel}>
            <planeGeometry args={[0.6, 2.6]} />
          </mesh>
        )),
      )}
      {/* facade above the garage door: team sign, then the hospitality floor's glass */}
      <mesh position={[GARAGE_X, CEILING + 0.55, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[GARAGE_W, 1.1]} />
        <meshBasicMaterial map={sign} side={one} toneMapped={false} />
      </mesh>
      <mesh position={[GARAGE_X, CEILING + 1.1 + 2.2, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[GARAGE_W, 4.4]} />
        <meshStandardMaterial color="#0e1218" metalness={0.8} roughness={0.15} side={one} />
      </mesh>
      {[...Array(6)].map((_, i) => (
        <mesh key={i} position={[GARAGE_X + 0.01, CEILING + 2.6, -GARAGE_W / 2 + 1 + i * 2]} rotation-y={Math.PI / 2} material={MAT.warmLight}>
          <planeGeometry args={[1.7, 1.4]} />
        </mesh>
      ))}
      {/* door posts */}
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.3, CEILING + 1.1, 0.3]} position={[GARAGE_X - 0.15, (CEILING + 1.1) / 2, s * (GARAGE_W / 2 - 0.15)]} material={MAT.steel} />
      ))}
      {/* engineers' desk along the back wall */}
      <Box size={[0.8, 0.75, 7]} position={[back + 0.6, 0.375, 0]} material={MAT.dark} />
      {[-2.4, -0.8, 0.8, 2.4].map((dz) => (
        <mesh key={dz} position={[back + 0.5, 1.2, dz]} rotation-y={Math.PI / 2} material={MAT.screen}>
          <planeGeometry args={[1.2, 0.68]} />
        </mesh>
      ))}
      {main && (
        <>
          {/* tool chests */}
          {[-1, 1].map((s) => (
            <group key={s} position={[back + 2.3, 0, s * 5.2]}>
              <Box size={[1.6, 1.05, 0.7]} position={[0, 0.525, 0]} material={new THREE.MeshStandardMaterial({ color: team.color, roughness: 0.35, metalness: 0.3 })} />
              {[0.25, 0.5, 0.75].map((y) => (
                <Box key={y} size={[1.4, 0.02, 0.02]} position={[0, y, -s * 0.36]} material={MAT.chrome} cast={false} />
              ))}
              <Box size={[1.62, 0.04, 0.72]} position={[0, 1.07, 0]} material={MAT.steel} />
            </group>
          ))}
          {/* hanging monitor gantry */}
          <Box size={[0.08, 0.08, 6]} position={[GARAGE_X - 3.5, CEILING - 0.6, 0]} material={MAT.steel} />
          {[-2, 0, 2].map((dz) => (
            <mesh key={dz} position={[GARAGE_X - 3.46, CEILING - 1.05, dz]} rotation-y={Math.PI / 2} material={MAT.screen}>
              <planeGeometry args={[1.1, 0.62]} />
            </mesh>
          ))}
          {tyres.map((g, i) => (
            <group key={i}>
              <primitive object={g} />
              <Box size={[0.9, 0.06, 1.5]} position={[g.position.x, 0.2, g.position.z]} material={MAT.steel} />
              <Box size={[0.06, 1.6, 0.06]} position={[g.position.x - 0.4, 0.95, g.position.z]} material={MAT.steel} />
            </group>
          ))}
        </>
      )}
    </group>
  )
}

// The pit stop traffic light hangs from the boom in front of the driver: red while the crew works,
// green on release.
function PitGantry({ team, pitStart }) {
  const red = useRef()
  const green = useRef()
  useFrame((state) => {
    const t = pitStart == null ? Infinity : state.clock.elapsedTime - pitStart
    const go = T.jackDown + 0.12
    red.current.color.set(t < go ? '#ff2a2a' : '#2a0b0b')
    green.current.color.set(t >= go && t < T.leave ? '#2bff6a' : '#0b2a14')
  })
  const boomEnd = 1.2
  const len = boomEnd - GARAGE_X
  return (
    <group>
      <Box size={[len, 0.22, 0.22]} position={[GARAGE_X + len / 2, CEILING + 0.2, 3.9]} material={MAT.steel} />
      <Box size={[len, 0.22, 0.22]} position={[GARAGE_X + len / 2, CEILING + 0.2, -3.9]} material={MAT.steel} />
      <Box size={[0.22, 0.22, 7.8]} position={[boomEnd, CEILING + 0.2, 0]} material={MAT.steel} />
      {/* LED bars that light the box */}
      {[-2.6, 0, 2.6].map((z) => (
        <mesh key={z} position={[-0.6, CEILING + 0.08, z]} rotation-x={Math.PI / 2} material={MAT.lightPanel}>
          <planeGeometry args={[3.2, 0.18]} />
        </mesh>
      ))}
      <Box size={[0.05, 1.3, 0.05]} position={[0, CEILING - 0.45, 3.9]} material={MAT.steel} />
      <group position={[0, 2.95, 3.9]}>
        <Box size={[0.75, 0.32, 0.16]} position={[0, 0, 0]} material={MAT.dark} />
        <mesh position={[-0.18, 0, -0.085]}>
          <circleGeometry args={[0.1, 24]} />
          <meshBasicMaterial ref={red} color="#2a0b0b" toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.18, 0, -0.085]}>
          <circleGeometry args={[0.1, 24]} />
          <meshBasicMaterial ref={green} color="#0b2a14" toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <Box size={[0.75, 0.04, 0.04]} position={[0, -0.2, -0.06]} material={new THREE.MeshBasicMaterial({ color: team.color })} cast={false} />
      </group>
    </group>
  )
}

// Pit wall: concrete barrier, catch fence, and the team's roofed pit wall stand with its screens.
function PitWall({ team }) {
  const posts = useMemo(() => [...Array(Math.round(LANE_LEN / 6))].map((_, i) => -LANE_LEN / 2 + i * 6), [])
  return (
    <group>
      <Box size={[0.6, 1.1, LANE_LEN]} position={[PIT_WALL_X + 0.3, 0.55, 0]} material={MAT.concrete} />
      <Box size={[0.62, 0.12, LANE_LEN]} position={[PIT_WALL_X + 0.3, 1.16, 0]} material={MAT.white} cast={false} />
      <mesh position={[PIT_WALL_X + 0.55, 1.22 + 2.4, 0]} rotation-y={Math.PI / 2} material={MAT.fence}>
        <planeGeometry args={[LANE_LEN, 4.8]} />
      </mesh>
      {posts.map((z) => (
        <Box key={z} size={[0.12, 4.9, 0.12]} position={[PIT_WALL_X + 0.6, 1.2 + 2.45, z]} material={MAT.steel} />
      ))}
      {/* team stand */}
      <group position={[PIT_WALL_X - 0.6, 0, 0]}>
        <Box size={[1.1, 0.5, 5.4]} position={[0, 1.45, 0]} material={MAT.dark} />
        {[-1, 1].map((s) => (
          <Box key={s} size={[0.1, 2.6, 0.1]} position={[-0.4, 1.3, s * 2.6]} material={MAT.steel} />
        ))}
        <Box size={[1.5, 0.08, 5.8]} position={[0.1, 2.65, 0]} material={new THREE.MeshStandardMaterial({ color: team.color, roughness: 0.5 })} />
        {[-1.8, -0.6, 0.6, 1.8].map((z) => (
          <mesh key={z} position={[-0.1, 2.1, z]} rotation-y={-Math.PI / 2} material={MAT.screen}>
            <planeGeometry args={[0.9, 0.5]} />
          </mesh>
        ))}
        {[-1.8, -0.6, 0.6, 1.8].map((z) => (
          <Box key={z} size={[0.45, 0.5, 0.45]} position={[0.2, 1.95, z]} material={MAT.dark} />
        ))}
      </group>
    </group>
  )
}

// Beyond the pit wall: the main straight, floodlight masts and a grandstand fading into the night.
function Circuit() {
  const masts = useMemo(() => [-36, -18, 0, 18, 36], [])
  const crowd = useMemo(
    () =>
      canvasTexture(1024, 256, (g, w, h) => {
        g.fillStyle = '#0c0e13'
        g.fillRect(0, 0, w, h)
        for (let i = 0; i < 2600; i++) {
          g.fillStyle = ['#d94040', '#f2f2f2', '#3a6bff', '#ffcc33', '#1f8f55', '#ff8a1f'][i % 6]
          g.globalAlpha = 0.25 + Math.random() * 0.45
          g.fillRect(Math.random() * w, Math.random() * h, 3, 3)
        }
      }),
    [],
  )
  return (
    <group>
      <group position={[PIT_WALL_X + 25, 6, 0]} rotation-y={-Math.PI / 2}>
        <mesh rotation-x={-0.35}>
          <planeGeometry args={[LANE_LEN, 14]} />
          <meshBasicMaterial map={crowd} side={one} />
        </mesh>
      </group>
      {masts.map((z) => (
        <group key={z} position={[PIT_WALL_X + 18, 0, z]}>
          <Box size={[0.3, 16, 0.3]} position={[0, 8, 0]} material={MAT.steel} cast={false} />
          <mesh position={[-0.3, 16, 0]} rotation-y={-Math.PI / 2} material={MAT.lightPanel}>
            <planeGeometry args={[3, 1.2]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export default function PitLane({ team, wet, pitStart, small }) {
  const { asphalt, floor } = useSurfaces(wet)
  const box = useMemo(() => boxTexture(team.color), [team.color])
  const others = useMemo(() => TEAMS.filter((t) => t.id !== team.id), [team.id])
  const neighbours = small ? [-1, 1] : [-2, -1, 1, 2]
  const laneW = PIT_WALL_X - GARAGE_X
  return (
    <group>
      {/* pit lane and main straight asphalt */}
      <mesh rotation-x={-Math.PI / 2} position={[GARAGE_X + laneW / 2, 0, 0]} material={asphalt} receiveShadow>
        <planeGeometry args={[laneW, LANE_LEN]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[PIT_WALL_X + 30, -0.01, 0]} material={asphalt} receiveShadow>
        <planeGeometry args={[40, LANE_LEN]} />
      </mesh>
      {/* garage floors */}
      <mesh rotation-x={-Math.PI / 2} position={[GARAGE_X - GARAGE_DEPTH / 2, 0.004, 0]} material={floor} receiveShadow>
        <planeGeometry args={[GARAGE_DEPTH, LANE_LEN]} />
      </mesh>
      {/* lane markings: fast-lane line, garage line, and our painted pit box */}
      <mesh rotation-x={-Math.PI / 2} position={[FAST_LANE_X, 0.006, 0]}>
        <planeGeometry args={[0.15, LANE_LEN]} />
        <meshStandardMaterial color="#f2f2f2" roughness={0.6} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[GARAGE_X + 0.4, 0.006, 0]}>
        <planeGeometry args={[0.12, LANE_LEN]} />
        <meshStandardMaterial color="#ffd12a" roughness={0.6} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.007, 0]}>
        <planeGeometry args={[6, 12]} />
        <meshStandardMaterial map={box} transparent roughness={0.6} depthWrite={false} />
      </mesh>

      <Garage team={team} z={0} main />
      {neighbours.map((n) => (
        <Garage key={n} team={others[(n + 2 + others.length) % others.length]} z={n * GARAGE_W} />
      ))}
      <PitGantry team={team} pitStart={pitStart} />
      <PitWall team={team} />
      <Circuit />
    </group>
  )
}
