import { memo, Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Html, Lightformer, useGLTF, useProgress } from '@react-three/drei'
import * as THREE from 'three'
import { makeRaceRig } from './carRig'
import { attachWheelSpin } from '../race/wheels'
import { RaceCameraRig } from '../race/camera'
import { FrontWheelSteering, steerFrontWheels } from '../race/steering'
import wheelCalibration from '../race/wheel-calibration.json'
import { RACE_FRAME } from '../race/frameOrder'

// "Marina Bay Street Circuit" by Dave Love (Tyler_Dave) on Sketchfab, CC BY 4.0, compressed in
// public/tracks. The race itself (positions, pit stops) comes from src/race/engine.js.
const TRACK = '/tracks/marina_bay.glb'
const BACKDROP = '11001Mtl_1'
const LIFT = 0.05

function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="car-loader">
        <span style={{ width: `${progress}%` }} />
        <p>Building Marina Bay… {Math.round(progress)}%</p>
      </div>
    </Html>
  )
}

function Circuit() {
  const { scene } = useGLTF(TRACK)
  useMemo(() => {
    scene.traverse((o) => {
      if (!o.isMesh) return
      o.receiveShadow = true
      const m = o.material
      // the studio reflections are for the cars; on the circuit they'd wash the night out
      if (m) m.envMapIntensity = 0.15
      // the distant skyline is a huge painted backdrop: keep it see-through and out of the fog
      if (m?.name === BACKDROP) {
        m.fog = false
        m.depthWrite = false
        return
      }
      // see-through foliage and fences: cut out instead of sorting thousands of blended triangles
      if (m?.transparent && m.map) {
        m.transparent = false
        m.alphaTest = 0.5
      }
    })
  }, [scene])
  return <primitive object={scene} />
}

// Advances the race in the same frame it is drawn, before the cars read their poses, so motion
// never doubles up or skips a frame.
function Drive({ engine, speed }) {
  useFrame((_, dt) => {
    const start = performance.now()
    engine.step(dt * speed)
    if (import.meta.env.DEV) engine.stepMs = performance.now() - start
  }, RACE_FRAME.simulation)
  return null
}

function RacePerformance({ engine }) {
  const { gl } = useThree()
  const samples = useRef([])
  useFrame((_, dt) => {
    if (engine.phase !== 'race') return
    samples.current.push({ frame: dt * 1000, physics: engine.stepMs || 0 })
    if (samples.current.length < 180) return
    const frames = samples.current.map((s) => s.frame).sort((a, b) => a - b)
    gl.domElement.dataset.racePerf = JSON.stringify({
      fps: Math.round(1000 / (frames.reduce((a, b) => a + b, 0) / frames.length)),
      medianMs: +frames[90].toFixed(1),
      p95Ms: +frames[171].toFixed(1),
      physicsMs: +(samples.current.reduce((n, s) => n + s.physics, 0) / 180).toFixed(2),
      triangles: gl.info.render.triangles,
      calls: gl.info.render.calls,
      dpr: gl.getPixelRatio(),
      sceneCommits: engine.sceneCommits || 0,
    })
    samples.current = []
  })
  return null
}

const aim = new THREE.Object3D()
const DRS_ANGLE = 0.45 // radians the rear-wing flap opens under boost (~26°)
const FLAP_AXIS = new THREE.Vector3(1, 0, 0)
const flapTurn = new THREE.Quaternion()

function RearLight({ car }) {
  const lamp = useRef()
  const halo = useRef()
  const glow = useMemo(() => {
    const size = 32
    const data = new Uint8Array(size * size * 4)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4
        const radius = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1)
        data.set([255, 12, 24, Math.round(Math.max(0, 1 - radius) ** 2 * 255)], i)
      }
    }
    const texture = new THREE.DataTexture(data, size, size)
    texture.needsUpdate = true
    return texture
  }, [])
  useEffect(() => () => glow.dispose(), [glow])
  useFrame(({ clock }) => {
    const warning = car.braking || Math.abs(car.curvature) > 0.012 || car.boost > 0
    const bright = !warning || Math.sin(clock.elapsedTime * Math.PI * 8 + car.noise) > 0
    if (lamp.current) lamp.current.color.setRGB(bright ? 1 : 0.15, 0.005, 0.012)
    if (halo.current) halo.current.opacity = bright ? (warning ? 0.85 : 0.35) : 0.04
  })
  return (
    <group position={[0, 0.48, -2.79]}>
      <mesh>
        <boxGeometry args={[0.2, 0.14, 0.045]} />
        <meshBasicMaterial ref={lamp} color="#ff1020" toneMapped={false} />
      </mesh>
      <sprite position={[0, 0, -0.04]} scale={[0.8, 0.8, 1]}>
        <spriteMaterial ref={halo} map={glow} color="#ff162b" transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  )
}

// One car, posed from the engine every frame; wheels roll with its speed and the fronts steer.
function Car({ car, engine, speed }) {
  // Keep the player's full-detail model. Only rivals use the race-only mesh copies.
  const model = car.player ? car.team.file : car.team.file.replace('/cars/', '/cars/race/')
  const { scene } = useGLTF(model)
  const rig = useMemo(() => {
    const result = makeRaceRig(scene)
    const axes = car.player ? undefined : wheelCalibration[car.team.file]
    result.wheels.forEach((wheel, i) => attachWheelSpin(wheel, axes?.[i]))
    return result
  }, [scene, car.team.file, car.player])
  const steering = useMemo(() => new FrontWheelSteering(engine), [engine])
  // Cars modelled with a separate rear-wing flap (the Williams) open it like DRS while boosting.
  const drs = useMemo(() => {
    const flap = rig.root.getObjectByName('DRS_Flap')
    return flap && { flap, rest: flap.quaternion.clone(), open: 0 }
  }, [rig])
  useEffect(() => {
    const shared = new Set()
    scene.traverse((o) => { if (o.isMesh) shared.add(o.geometry) })
    const generated = new Set()
    rig.root.traverse((o) => { if (o.isMesh && !shared.has(o.geometry)) generated.add(o.geometry) })
    return () => generated.forEach((geometry) => geometry.dispose())
  }, [rig, scene])
  const placed = useRef(false)
  useFrame((_, dt) => {
    const frame = Math.min(dt, 0.05)
    const height = car.pos.y + LIFT
    rig.root.position.set(car.pos.x, height, car.pos.z)
    // Ease tiny heading changes, but limit lag to three degrees: the safety envelope
    // has room for this and the body never trails behind its actual road position.
    aim.position.copy(rig.root.position)
    aim.lookAt(car.look.x, car.look.y + LIFT, car.look.z)
    if (placed.current) {
      rig.root.quaternion.slerp(aim.quaternion, 1 - Math.exp(-frame * 12))
      const angle = rig.root.quaternion.angleTo(aim.quaternion)
      const limit = Math.PI / 60
      if (angle > limit) rig.root.quaternion.slerp(aim.quaternion, 1 - limit / angle)
    } else rig.root.quaternion.copy(aim.quaternion)
    placed.current = true
    const steer = steering.update(car, frame, speed)
    rig.wheels.forEach((w) => {
      // At real road RPM, spokes/tyre markings alias between frames and look as if
      // they are shaking or running backwards. Limit only the visual spin rate.
      const spin = Math.min(car.speed / Math.max(w.radius, 0.1), 18)
      w.spin.rotation.x = (w.spin.rotation.x + spin * frame) % (Math.PI * 2)
    })
    steerFrontWheels(rig.wheels, steer)
    if (drs) {
      // the flap pivots on its trailing edge, so the leading edge lifts and the slot opens
      drs.open += ((car.boost > 0 ? 1 : 0) - drs.open) * Math.min(1, frame * 10)
      drs.flap.quaternion.copy(drs.rest).multiply(flapTurn.setFromAxisAngle(FLAP_AXIS, -DRS_ANGLE * drs.open))
    }
    car.object = rig.root
  }, RACE_FRAME.pose)
  return <primitive object={rig.root}><RearLight car={car} /></primitive>
}

// Singapore's floodlights: a pool of white light that travels with the player's car, so the cars
// read as clearly as in the garage while the city around them stays at night.
function Floodlight({ engine }) {
  const light = useRef()
  const key = useRef()
  useFrame(() => {
    const o = engine.player()?.object
    if (!o || !light.current) return
    light.current.position.set(o.position.x, o.position.y + 16, o.position.z)
    light.current.target.position.copy(o.position)
    light.current.target.updateMatrixWorld()
    key.current.position.set(o.position.x + 6, o.position.y + 10, o.position.z + 7)
    key.current.target.position.copy(o.position)
    key.current.target.updateMatrixWorld()
  })
  return (
    <>
      <spotLight ref={light} angle={1.05} penumbra={0.7} intensity={1.5} decay={0} distance={70} color="#fff6e8" />
      <directionalLight ref={key} intensity={1.8} color="#ffffff" />
    </>
  )
}

// Camera motion is isolated from the car and wheel animation.
function Cameras({ engine, mode, small }) {
  const { camera } = useThree()
  const rig = useMemo(() => new RaceCameraRig(), [])
  useFrame((_, dt) => {
    const car = engine.player()
    if (car?.object) rig.update(camera, car.object, dt, { mode, small, boosting: car.boost > 0 })
  }, RACE_FRAME.camera)
  return null
}

function MarinaScene({ engine, cameraMode = 'chase', small = false, speed = 1 }) {
  useEffect(() => {
    if (import.meta.env.DEV) engine.sceneCommits = (engine.sceneCommits || 0) + 1
  })
  const initialCamera = useMemo(() => {
    const start = engine.player()?.pos || engine.track[0]
    return { position: [start.x - 12, start.y + 5, start.z - 12], near: 0.3, far: 6000, fov: small ? 49 : 42 }
  }, [engine, small])
  return (
    <Canvas
      camera={initialCamera}
      dpr={[1, small ? 1.25 : 1.5]}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
    >
      {/* Singapore races at night: deep blue sky, floodlit track */}
      <color attach="background" args={['#0b1222']} />
      <fog attach="fog" args={['#0b1222', 600, 3200]} />
      <hemisphereLight args={['#bfcaf0', '#14110e', 0.7]} />
      <directionalLight position={[400, 900, 300]} intensity={0.7} color="#ffe8c4" />
      {/* reflections: the same studio strips as the garage, so the paint and carbon look the same out here */}
      <Environment resolution={small ? 128 : 512} environmentIntensity={1}>
        <Lightformer form="rect" intensity={4} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[8, 2.5, 1]} />
        <Lightformer form="rect" intensity={2.4} position={[-7, 2.2, 0]} rotation-y={Math.PI / 2} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#dfe6ff" position={[12, 9, 0]} rotation-y={-Math.PI / 2} scale={[30, 2, 1]} />
        <Lightformer form="rect" intensity={0.6} position={[0, 2, -12]} scale={[14, 2, 1]} />
        <Lightformer form="rect" intensity={0.6} position={[0, 2, 12]} rotation-y={Math.PI} scale={[14, 2, 1]} />
      </Environment>
      <Floodlight engine={engine} />
      <Suspense fallback={<Loader />}>
        <Circuit />
        {engine.cars.map((c) => (
          <Car key={c.team.id} car={c} engine={engine} speed={speed} />
        ))}
      </Suspense>
      <Drive engine={engine} speed={speed} />
      {import.meta.env.DEV && <RacePerformance engine={engine} />}
      <Cameras engine={engine} mode={cameraMode} small={small} />
    </Canvas>
  )
}

// The timing tower polls five times a second. It must not rebuild this scene's
// reflection cube map or reconfigure the Canvas every time a lap time changes.
export default memo(MarinaScene)
