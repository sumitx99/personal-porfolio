import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Html, Lightformer, MeshReflectorMaterial, OrbitControls, useGLTF, useProgress } from '@react-three/drei'
import * as THREE from 'three'
import { COMPOUNDS, PIT_TIMELINE as T } from '../f1'
import PitCrew from './PitCrew'

const ACCENT = '#d4ff3a'
// Road-wheel parts; steering wheels are named "…_steeringwheel" / "…_sw" and must stay in the cockpit.
const WHEEL_PART = /(sidewall|tread|tyre|tire|rim|wheel|discs|hub_nut)/i
const NOT_WHEEL = /(steer|_sw\b|sw_)/i
const PAINT_PART = /paint/i

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))
const span = (t, a, b) => ease((t - a) / (b - a))

// Copies an attribute into plain floats; the compressed models store quantized (int16) data.
function toFloat(attr) {
  const out = new Float32Array(attr.count * attr.itemSize)
  for (let i = 0; i < attr.count; i++) {
    out[i * attr.itemSize] = attr.getX(i)
    if (attr.itemSize > 1) out[i * attr.itemSize + 1] = attr.getY(i)
    if (attr.itemSize > 2) out[i * attr.itemSize + 2] = attr.getZ(i)
    if (attr.itemSize > 3) out[i * attr.itemSize + 3] = attr.getW(i)
  }
  return new THREE.BufferAttribute(out, attr.itemSize)
}

// Each car ships its four wheels merged into one mesh per material (tread, sidewall, hub, discs).
// Split those by quadrant so every wheel can be taken off on its own.
function splitWheels(scene) {
  scene.updateMatrixWorld(true)
  // Bake into the scene's parent space, so the car's own scale is included.
  const toRoot = new THREE.Matrix4()
  const extras = []
  const parts = []
  scene.traverse((o) => {
    if (o.isMesh && WHEEL_PART.test(o.material?.name || '') && !NOT_WHEEL.test(o.material?.name || '')) parts.push(o)
  })

  const baked = parts.map((m) => {
    const g = new THREE.BufferGeometry()
    for (const name of ['position', 'normal', 'uv']) {
      const a = m.geometry.getAttribute(name)
      if (a) g.setAttribute(name, toFloat(a))
    }
    if (m.geometry.index) g.setIndex(new THREE.BufferAttribute(Uint32Array.from(m.geometry.index.array), 1))
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toRoot, m.matrixWorld))
    m.visible = false
    return { material: m.material, geo: g }
  })

  const all = new THREE.Box3()
  baked.forEach(({ geo }) => {
    geo.computeBoundingBox()
    all.union(geo.boundingBox)
  })
  const midZ = (all.min.z + all.max.z) / 2

  const quads = [0, 1, 2, 3].map(() => ({ meshes: [], box: new THREE.Box3() }))
  const v = new THREE.Vector3()
  baked.forEach(({ material, geo }) => {
    const pos = geo.getAttribute('position')
    const idx = geo.index ? geo.index.array : Uint32Array.from({ length: pos.count }, (_, i) => i)
    const lists = [[], [], [], []]
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t]
      const b = idx[t + 1]
      const c = idx[t + 2]
      const cx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3
      const cz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3
      const q = (cz > midZ ? 0 : 2) + (cx > 0 ? 0 : 1)
      lists[q].push(a, b, c)
      for (const k of [a, b, c]) quads[q].box.expandByPoint(v.fromBufferAttribute(pos, k))
    }
    lists.forEach((list, q) => {
      if (!list.length) return
      const g = new THREE.BufferGeometry()
      for (const name of Object.keys(geo.attributes)) g.setAttribute(name, geo.getAttribute(name))
      g.setIndex(list)
      const mesh = new THREE.Mesh(g, material)
      mesh.castShadow = true
      quads[q].meshes.push(mesh)
    })
  })

  // Some tyre parts end up on generically named materials after compression, so also take any
  // triangle that sits entirely inside a wheel's tyre cylinder, whatever its material.
  const wheelsZone = quads.map((q) => {
    if (!q.meshes.length) return null
    const c = q.box.getCenter(new THREE.Vector3())
    return { c, r: (q.box.max.y - q.box.min.y) / 2, x0: q.box.min.x - 0.02, x1: q.box.max.x + 0.02, box: q.box.clone().expandByScalar(0.03) }
  })
  const inside = (zone, x, y, z) =>
    zone && x >= zone.x0 && x <= zone.x1 && Math.hypot(y - zone.c.y, z - zone.c.z) <= zone.r * 1.02
  const others = []
  scene.traverse((o) => {
    if (o.isMesh && o.visible && !parts.includes(o)) others.push(o)
  })
  others.forEach((m) => {
    const wb = new THREE.Box3().setFromObject(m)
    if (!wheelsZone.some((z) => z && z.box.intersectsBox(wb))) return
    const g = new THREE.BufferGeometry()
    for (const name of ['position', 'normal', 'uv']) {
      const a = m.geometry.getAttribute(name)
      if (a) g.setAttribute(name, toFloat(a))
    }
    const pos = g.getAttribute('position')
    const idx = m.geometry.index ? Uint32Array.from(m.geometry.index.array) : Uint32Array.from({ length: pos.count }, (_, i) => i)
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toRoot, m.matrixWorld))
    const caught = [[], [], [], []]
    const rest = []
    for (let t = 0; t < idx.length; t += 3) {
      const tri = [idx[t], idx[t + 1], idx[t + 2]]
      const q = wheelsZone.findIndex((z) => tri.every((k) => inside(z, pos.getX(k), pos.getY(k), pos.getZ(k))))
      if (q >= 0) caught[q].push(...tri)
      else rest.push(...tri)
    }
    if (!caught.some((l) => l.length)) return
    const sub = (list) => {
      const out = new THREE.BufferGeometry()
      for (const name of Object.keys(g.attributes)) out.setAttribute(name, g.getAttribute(name))
      out.setIndex(list)
      const mesh = new THREE.Mesh(out, m.material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      return mesh
    }
    caught.forEach((list, q) => list.length && quads[q].meshes.push(sub(list)))
    if (rest.length) extras.push(sub(rest))
    m.visible = false
  })

  const wheels = quads
    .filter((q) => q.meshes.length)
    .map((q) => {
      const center = q.box.getCenter(new THREE.Vector3())
      const size = q.box.getSize(new THREE.Vector3())
      const side = Math.sign(center.x) || 1
      const pivot = new THREE.Group()
      pivot.position.copy(center)
      q.meshes.forEach((m) => {
        m.position.copy(center).multiplyScalar(-1)
        pivot.add(m)
      })
      return {
        pivot,
        base: center.clone(),
        radius: size.y / 2,
        outer: (side > 0 ? q.box.max.x : q.box.min.x) - center.x,
        side,
        front: center.z > midZ,
      }
    })
  return { wheels, extras }
}

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

function Car({ team, compound, paint, pitStart, onPitDone, onWheelSwap }) {
  const { scene: original } = useGLTF(team.file)

  // Clone per mount and split the wheels once; also centre the car on the turntable.
  const rig = useMemo(() => {
    const scene = original.clone(true)
    scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
        if (PAINT_PART.test(o.material?.name || '')) {
          o.material = o.material.clone()
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
    return { scene, wheels, extras, offset, minZ: box.min.z, maxZ: box.max.z }
  }, [original])

  // Custom paint swaps the livery texture for a solid colour; decals live on other materials and stay.
  useEffect(() => {
    rig.scene.traverse((o) => {
      const p = o.userData.paint
      if (!p) return
      o.material.map = paint ? null : p.map
      o.material.color.set(paint || p.color)
      o.material.needsUpdate = true
    })
  }, [paint, rig])

  const body = useRef()
  const swapped = useRef(false)
  const done = useRef(true)

  useEffect(() => {
    swapped.current = false
    done.current = pitStart == null
  }, [pitStart])

  useFrame((state) => {
    const t = pitStart == null ? Infinity : state.clock.elapsedTime - pitStart
    const inPit = t < T.leave
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

    body.current.position.y = lift * 0.12
    rig.wheels.forEach((w) => {
      // The carrier pulls the old wheel out and away, then the new one goes on.
      w.pivot.position.set(w.base.x + w.side * out * 0.75, w.base.y + lift * 0.12 - out * 0.05, w.base.z + (w.front ? 1 : -1) * out * 0.6)
    })
  })

  return (
    <group position={rig.offset}>
      <group ref={body}>
        <primitive object={rig.scene} />
        {rig.extras.map((m, i) => (
          <primitive key={i} object={m} />
        ))}
      </group>
      {rig.wheels.map((w, i) => (
        <primitive key={i} object={w.pivot}>
          <CompoundBand wheel={w} compound={compound} />
        </primitive>
      ))}
      <PitCrew rig={rig} suit={team.crew} pitStart={pitStart} />
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

function Showroom({ small }) {
  return (
    <group>
      {/* turntable */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
        <circleGeometry args={[4.2, 96]} />
        {small ? (
          <meshStandardMaterial color="#141519" roughness={0.25} metalness={0.6} />
        ) : (
          <MeshReflectorMaterial
            blur={[400, 120]}
            resolution={1024}
            mixBlur={1}
            mixStrength={28}
            roughness={0.85}
            depthScale={1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.2}
            color="#121317"
            metalness={0.6}
          />
        )}
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[4.17, 4.22, 128]} />
        <meshBasicMaterial color={ACCENT} toneMapped={false} transparent opacity={0.55} />
      </mesh>
      {/* outer floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow>
        <circleGeometry args={[30, 64]} />
        <meshStandardMaterial color="#0c0c0e" roughness={0.9} />
      </mesh>
      {/* curved backdrop with light strips */}
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[11, 11, 7, 96, 1, true]} />
        <meshStandardMaterial color="#1a1c22" side={THREE.BackSide} roughness={1} />
      </mesh>
      {[...Array(14)].map((_, i) => {
        const a = (i / 14) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 10.9, 3.4, Math.sin(a) * 10.9]} rotation={[0, -a - Math.PI / 2, 0]}>
            <planeGeometry args={[0.06, 4.5]} />
            <meshBasicMaterial color="#9aa0aa" transparent opacity={0.25} />
          </mesh>
        )
      })}
    </group>
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

// Exposes the render clock so the page can stamp pit stops with the same time base.
function ClockBridge({ clockRef }) {
  useFrame((state) => {
    if (clockRef) clockRef.current = state.clock
  })
  return null
}

export default function F1Garage({ team, compound, paint, pitStart, onPitDone, onWheelSwap, autoRotate, clockRef, small }) {
  return (
    <Canvas shadows dpr={[1, small ? 1.5 : 2]} camera={{ position: [4.6, 1.7, 4.6], fov: 34 }} gl={{ antialias: true }}>
      <ClockBridge clockRef={clockRef} />
      <FitCamera />
      <color attach="background" args={['#0d0e11']} />
      <fog attach="fog" args={['#0d0e11', 14, 30]} />
      <hemisphereLight args={['#ffffff', '#16171b', 0.6]} />
      <directionalLight position={[5, 9, 6]} intensity={2.4} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}>
        <orthographicCamera attach="shadow-camera" args={[-6, 6, 6, -6, 0.1, 30]} />
      </directionalLight>
      <spotLight position={[0, 9, 0]} angle={0.5} penumbra={0.9} intensity={120} />
      {/* Studio light panels: these make the reflections in the paint. */}
      <Environment resolution={512}>
        <Lightformer form="rect" intensity={4} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 2.5, 1]} />
        <Lightformer form="rect" intensity={2} position={[-7, 2, 2]} rotation-y={Math.PI / 2} scale={[10, 1.6, 1]} />
        <Lightformer form="rect" intensity={2} position={[7, 2, -2]} rotation-y={-Math.PI / 2} scale={[10, 1.6, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[0, 2, -8]} scale={[14, 2, 1]} />
        <Lightformer form="ring" intensity={0.8} color={ACCENT} position={[0, 3, 8]} scale={3} />
      </Environment>

      <Showroom small={small} />
      <Suspense fallback={<Loader />}>
        <Car key={team.id} team={team} compound={compound} paint={paint} pitStart={pitStart} onPitDone={onPitDone} onWheelSwap={onWheelSwap} />
      </Suspense>
      {compound === 'wet' && <Rain />}
      <ContactShadows position={[0, 0.004, 0]} opacity={0.75} scale={9} blur={2.2} far={2} resolution={1024} />
      <OrbitControls
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
