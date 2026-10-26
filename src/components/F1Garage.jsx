import SceneRuntime from './SceneRuntime'
import { memo, Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Html, Lightformer, OrbitControls, useGLTF, useProgress } from '@react-three/drei'
import * as THREE from 'three'
import { COMPOUNDS, PIT_TIMELINE as T } from '../f1'
import PitCrew from './PitCrew'
import PitLane from './PitLane'
import { splitWheels } from './carRig'
import { TouchScroll, useFrameloop } from '../hooks'
import GarageShadows from './GarageShadows'
import StaticBatch from './StaticBatch'

const PAINT_PART = /paint/i

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))
const span = (t, a, b) => ease((t - a) / (b - a))

// Coloured band on the outer sidewall, like Pirelli's compound markings.
function CompoundBand({ wheel, compound }) {
  const c = COMPOUNDS[compound].color
  return (
    <mesh position={[wheel.outer + wheel.side * 0.004, 0, 0]} rotation={[0, (wheel.side * Math.PI) / 2, 0]}>
      <ringGeometry args={[wheel.radius * 0.7, wheel.radius * 0.79, 64]} />
      <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.15} roughness={0.5} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  )
}

// Drive-through stops: the car brakes in from the pit lane at the 80 km/h limit, the crew works, and
// it accelerates away. Times are seconds relative to pitStart (negative while it is still arriving).
export const APPROACH = 2.6 // seconds of arrival before the crew timeline starts
const LIMIT = 22 // m/s
const DECEL = 8
const LAUNCH = 12
const RELEASE = T.jackDown + 0.15
const EXIT_TIME = 3.4
// distance still to go before the car stops in the box, s seconds before it does
function toBox(s) {
  const tBrake = LIMIT / DECEL
  return s <= tBrake ? 0.5 * DECEL * s * s : 0.5 * DECEL * tBrake * tBrake + LIMIT * (s - tBrake)
}
function awayFromBox(u) {
  const tLaunch = LIMIT / LAUNCH
  return u <= tLaunch ? 0.5 * LAUNCH * u * u : 0.5 * LAUNCH * tLaunch * tLaunch + LIMIT * (u - tLaunch)
}

function Car({ team, compound, paint, pitStart, onPitDone, onWheelSwap, driveThrough }) {
  const { scene: original } = useGLTF(team.file)
  const invalidate = useThree((state) => state.invalidate)

  // Clone per mount and split the wheels once; also centre the car in its pit box.
  const rig = useMemo(() => {
    const scene = original.clone(true)
    const paintMaterials = new Map()
    scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
        if (PAINT_PART.test(o.material?.name || '')) {
          if (!paintMaterials.has(o.material)) paintMaterials.set(o.material, o.material.clone())
          o.material = paintMaterials.get(o.material)
          o.userData.paint = { map: o.material.map, color: o.material.color.clone() }
        }
      }
    })
    // Models come in different units (one is 1/100 scale): normalise every car to F1 length.
    const raw = new THREE.Box3().setFromObject(scene)
    scene.scale.setScalar(5.5 / (raw.max.z - raw.min.z))
    const { wheels, extras } = splitWheels(scene)
    const box = new THREE.Box3().setFromObject(scene)
    const offset = new THREE.Vector3(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2)
    return { scene, wheels, extras, offset, minZ: box.min.z, maxZ: box.max.z, paintMaterials }
  }, [original])

  useEffect(() => () => rig.paintMaterials.forEach((material) => material.dispose()), [rig])

  // Custom paint swaps the livery texture for a solid colour; decals live on other materials and stay.
  useEffect(() => {
    rig.scene.traverse((o) => {
      const p = o.userData.paint
      if (!p) return
      o.material.map = paint ? null : p.map
      o.material.color.set(paint || p.color)
      o.material.needsUpdate = true
    })
    invalidate()
  }, [paint, rig, invalidate])

  const body = useRef()
  const drive = useRef()
  const swapped = useRef(false)
  const done = useRef(true)

  useEffect(() => {
    swapped.current = false
    done.current = pitStart == null
  }, [pitStart])

  useFrame((state, delta) => {
    const t = pitStart == null ? Infinity : (state.clock.elapsedTime - pitStart)
    const inPit = t < (driveThrough ? RELEASE + EXIT_TIME : T.leave)
    const lift = inPit ? span(t, T.arrive, T.jackUp) * (1 - span(t, T.wheelsOn, T.jackDown)) : 0
    const out = inPit ? span(t, T.jackUp, T.wheelsOff) * (1 - span(t, T.wheelsOff, T.wheelsOn)) : 0

    if (inPit && t >= T.wheelsOff && !swapped.current) {
      swapped.current = true
      onWheelSwap()
    }
    if (!inPit && !done.current) {
      done.current = true
      onPitDone()
    }

    // roll in from the pit lane and away again; wheels turn with the road speed
    let z = 0
    let speed = 0
    if (driveThrough && inPit) {
      if (t < T.arrive) {
        const s = T.arrive - t
        z = -toBox(s)
        speed = Math.min(LIMIT, DECEL * s)
      } else if (t > RELEASE) {
        const u = t - RELEASE
        z = awayFromBox(u)
        speed = Math.min(LIMIT, LAUNCH * u)
      }
    }
    drive.current.position.z = z
    const roll = (speed * Math.min(delta, 0.1)) / (rig.wheels[0]?.radius || 0.36)
    body.current.position.y = lift * 0.12
    rig.wheels.forEach((w) => {
      w.pivot.rotation.x += roll
      // The carrier pulls the old wheel out and away, then the new one goes on.
      w.pivot.position.set(w.base.x + w.side * out * 0.75, w.base.y + lift * 0.12 - out * 0.05, w.base.z + (w.front ? 1 : -1) * out * 0.6)
    })
  })

  return (
    <group position={rig.offset}>
      <group ref={drive}>
        <group ref={body}>
          <StaticBatch cellSize={Infinity} revision={rig}>
            <primitive object={rig.scene} />
            {rig.extras.map((m, i) => (
              <primitive key={i} object={m} />
            ))}
          </StaticBatch>
        </group>
        {rig.wheels.map((w, i) => (
          <primitive key={i} object={w.pivot}>
            <CompoundBand wheel={w} compound={compound} />
          </primitive>
        ))}
      </group>
      <PitCrew rig={rig} suit={team.crew} trim={team.color} pitStart={pitStart} />
    </group>
  )
}

function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="car-loader">
        <span style={{ width: `${progress}%` }} />
        <p>Rolling the car out… {Math.round(progress)}%</p>
      </div>
    </Html>
  )
}

// Rain for wet tyres: a few hundred streaks falling through the showroom.
function Rain() {
  const ref = useRef()
  const count = 700
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 12
      p[i * 3 + 1] = Math.random() * 7
      p[i * 3 + 2] = (Math.random() - 0.5) * 12
    }
    return p
  }, [])
  useFrame((_, d) => {
    const a = ref.current.geometry.attributes.position
    for (let i = 0; i < count; i++) {
      let y = a.getY(i) - d * 9
      if (y < 0) y += 7
      a.setY(i, y)
    }
    a.needsUpdate = true
  })
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#a9cdff" size={0.035} transparent opacity={0.7} depthWrite={false} />
    </points>
  )
}

// Pulls the camera back on tall, narrow screens so the whole car stays in frame.
function FitCamera() {
  const { camera, size } = useThree()
  useEffect(() => {
    const aspect = size.width / size.height
    const dist = 7 / Math.min(1, Math.pow(aspect / 1.4, 0.85))
    camera.position.setLength(Math.min(dist, 13))
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height])
  return null
}

// Keeps the orbiting camera inside the pit lane: never behind the pit wall fence or the garage back wall.
function CameraBounds() {
  useFrame(({ camera }) => {
    const p = camera.position
    if (p.x <= 8.4 && p.x >= -14.5) return
    const lim = p.x > 0 ? 8.4 : -14.5
    const k = lim / p.x
    p.x = lim
    p.z *= k
  })
  return null
}

// Pit-stop camera, like a broadcast shot from the gantry: high over the box, looking back up the
// pit lane so the car is seen arriving, stopping and leaving.
function PitCam({ active, small }) {
  const { camera } = useThree()
  const target = useMemo(() => new THREE.Vector3(0, 0, -2.5), [])
  const goal = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    if (!active) return
    goal.set(small ? 9 : 7.5, small ? 13 : 10, small ? 11 : 8.5)
    camera.position.lerp(goal, 1 - Math.exp(-Math.min(dt, 0.1) * 3))
    camera.lookAt(target)
  })
  return null
}

// Exposes the render clock so the page can stamp pit stops with the same time base.
function ClockBridge({ clockRef }) {
  useFrame((state) => {
    if (clockRef) clockRef.current = state.clock
  })
  // forget this scene's clock when it goes, so a remounted scene isn't stamped with stale times
  useEffect(
    () => () => {
      if (clockRef) clockRef.current = null
    },
    [clockRef],
  )
  return null
}

function F1Garage({ team, compound, paint, pitStart, onPitDone, onWheelSwap, autoRotate, clockRef, small, driveThrough = false, pitCam = false }) {
  const canvas = useRef()
  const frameloop = useFrameloop(canvas, { continuous: autoRotate || pitStart != null || compound === 'wet' || pitCam })
  return (
    <Canvas ref={canvas} frameloop={frameloop} shadows dpr={[1, 1.5]} camera={{ position: [5.2, 1.9, 4.2], fov: 34 }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <SceneRuntime name="garage" />
      <TouchScroll />
      <ClockBridge clockRef={clockRef} />
      <FitCamera />
      <CameraBounds />
      <color attach="background" args={['#06080c']} />
      <fog attach="fog" args={['#06080c', 20, 60]} />
      <hemisphereLight args={['#cfd8ff', '#16171b', 0.55]} />
      <directionalLight position={[5, 9, 6]} intensity={2.4} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}>
        <orthographicCamera attach="shadow-camera" args={[-6, 6, 6, -6, 0.1, 30]} />
      </directionalLight>
      <spotLight position={[0, 9, 0]} angle={0.5} penumbra={0.9} intensity={120} />
      {/* Night-race lighting for reflections: the gantry LEDs overhead, the bright garage mouth on one
          side and the floodlights over the pit wall on the other. */}
      <Environment resolution={512} frames={1}>
        <Lightformer form="rect" intensity={4} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[8, 2.5, 1]} />
        <Lightformer form="rect" intensity={2.4} position={[-7, 2.2, 0]} rotation-y={Math.PI / 2} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#dfe6ff" position={[12, 9, 0]} rotation-y={-Math.PI / 2} scale={[30, 2, 1]} />
        <Lightformer form="rect" intensity={0.6} position={[0, 2, -12]} scale={[14, 2, 1]} />
        <Lightformer form="rect" intensity={0.6} position={[0, 2, 12]} rotation-y={Math.PI} scale={[14, 2, 1]} />
      </Environment>

      <Suspense fallback={<Loader />}>
        <PitLane team={team} wet={compound === 'wet'} pitStart={pitStart} />
        <Car key={team.id} team={team} compound={compound} paint={paint} pitStart={pitStart} onPitDone={onPitDone} onWheelSwap={onWheelSwap} driveThrough={driveThrough} />
        <GarageShadows active={pitStart != null} revision={`${team.id}:${compound}`} />
      </Suspense>
      {compound === 'wet' && <Rain />}
      <PitCam active={pitCam} small={small} />
      <OrbitControls
        enabled={!pitCam}
        enablePan={false}
        minDistance={4.2}
        maxDistance={13}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0.5, 0]}
        autoRotate={autoRotate}
        autoRotateSpeed={0.6}
      />
    </Canvas>
  )
}

export default memo(F1Garage)
