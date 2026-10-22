import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import * as THREE from 'three'
import { PIT_TIMELINE as T } from '../f1'

// Rigged, animated human (Mixamo "Vanguard" from the three.js examples), dressed as a pit mechanic.
const MODEL = '/crew/mechanic.glb'
const ACCENT = '#d4ff3a'

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))
const span = (t, a, b) => ease((t - a) / (b - a))

// Kneeling / bracing poses, layered on top of the Idle animation (radians, bone-local).
const POSES = {
  gunner: { LeftUpLeg: [-1.45, 0, 0], LeftLeg: [1.5, 0, 0], RightUpLeg: [-0.2, 0, 0], RightLeg: [2.1, 0, 0], Spine: [0.35, 0, 0], RightArm: [0, 0, 0.9], RightForeArm: [0, -1.1, 0], LeftArm: [0, 0, -0.9], LeftForeArm: [0, 1.1, 0], drop: 0.48 },
  carrier: { LeftUpLeg: [-0.6, 0, 0], LeftLeg: [0.9, 0, 0], RightUpLeg: [-0.6, 0, 0], RightLeg: [0.9, 0, 0], Spine: [0.45, 0, 0], RightArm: [0, 0, 1.0], RightForeArm: [0, -0.6, 0], LeftArm: [0, 0, -1.0], LeftForeArm: [0, 0.6, 0], drop: 0.2 },
  jack: { Spine: [0.55, 0, 0], Spine1: [0.2, 0, 0], RightArm: [0, 0, 1.1], LeftArm: [0, 0, -1.1], RightForeArm: [0, -0.4, 0], LeftForeArm: [0, 0.4, 0], LeftUpLeg: [-0.35, 0, 0], LeftLeg: [0.5, 0, 0], drop: 0.08 },
}

function makeMember(gltf, suit, role) {
  const root = cloneSkinned(gltf.scene)
  const bones = {}
  root.traverse((o) => {
    if (o.isBone) bones[o.name.replace('mixamorig', '').replace(':', '')] = o
    if (o.isMesh) {
      o.castShadow = true
      o.frustumCulled = false
      // The compressor merged both materials, so tell the visor apart by mesh name.
      const isVisor = /visor/i.test(o.name)
      // Fire suit: plain team colour with the original folds kept in the normal map.
      o.material = isVisor
        ? new THREE.MeshPhysicalMaterial({ color: '#0b0c10', metalness: 0.6, roughness: 0.08, clearcoat: 1 })
        : new THREE.MeshStandardMaterial({ color: suit, roughness: 0.62, metalness: 0.05, normalMap: o.material.normalMap || null })
    }
  })
  root.updateMatrixWorld(true)

  // White race helmet and a wheel gun, attached to the skeleton so they follow the animation.
  const ws = new THREE.Vector3()
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 28, 20),
    new THREE.MeshPhysicalMaterial({ color: '#f4f4f4', clearcoat: 1, roughness: 0.18 })
  )
  bones.Head.getWorldScale(ws)
  helmet.scale.setScalar(1 / ws.x)
  helmet.position.set(0, 0.1 / ws.x, 0.015 / ws.x)
  helmet.castShadow = true
  bones.Head.add(helmet)

  if (role !== 'jack') {
    const gun = new THREE.Group()
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.26, 14), new THREE.MeshStandardMaterial({ color: '#2b2d33', metalness: 0.8, roughness: 0.3 }))
    body.rotation.x = Math.PI / 2
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 10), new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.4 }))
    tip.rotation.x = Math.PI / 2
    tip.position.z = 0.15
    gun.add(body, tip)
    bones.RightHand.getWorldScale(ws)
    gun.scale.setScalar(1 / ws.x)
    gun.position.set(0, 0.08 / ws.x, 0.05 / ws.x)
    bones.RightHand.add(gun)
  }

  const mixer = new THREE.AnimationMixer(root)
  const clip = (name) => gltf.animations.find((a) => a.name === name)
  const run = mixer.clipAction(clip('Run'))
  const idle = mixer.clipAction(clip('Idle'))
  run.play()
  idle.play()
  run.timeScale = 1.35
  return { root, bones, mixer, run, idle, role, pose: POSES[role] }
}

// Work spots around the car; each crew member sprints in from `home` and back out.
function layout(rig) {
  const spots = []
  rig.wheels.forEach((w) => {
    const ox = w.base.x + w.outer
    const dz = w.front ? 1 : -1
    spots.push({ role: 'gunner', work: new THREE.Vector3(ox + w.side * 0.62, 0, w.base.z), face: -w.side, axis: 'x' })
    spots.push({ role: 'carrier', work: new THREE.Vector3(ox + w.side * 0.95, 0, w.base.z + dz * 0.95), face: -w.side, axis: 'x' })
  })
  spots.push({ role: 'jack', work: new THREE.Vector3(0, 0, rig.maxZ + 0.55), face: -1, axis: 'z' })
  spots.push({ role: 'jack', work: new THREE.Vector3(0, 0, rig.minZ - 0.55), face: 1, axis: 'z' })
  spots.forEach((s) => {
    s.home = s.work.clone()
    if (s.axis === 'x') s.home.x += -s.face * 3.4
    else s.home.z += -s.face * 3.4
  })
  return spots
}

const yawTo = (dx, dz) => Math.atan2(dx, dz)

export default function PitCrew({ rig, suit, pitStart }) {
  const gltf = useGLTF(MODEL)
  const spots = useMemo(() => layout(rig), [rig])
  const crew = useMemo(() => spots.map((s) => makeMember(gltf, suit, s.role)), [gltf, spots, suit])

  useEffect(() => () => crew.forEach((m) => m.mixer.stopAllAction()), [crew])

  useFrame((state, delta) => {
    const t = pitStart == null ? Infinity : state.clock.elapsedTime - pitStart
    const inPit = t < T.leave
    const goIn = inPit ? span(t, 0, T.arrive) : 0
    const goOut = inPit ? span(t, T.jackDown, T.leave) : 1
    const at = goIn * (1 - goOut) // 0 = at home, 1 = at the car
    const running = inPit && ((t > 0.02 && t < T.arrive) || (t > T.jackDown && t < T.leave - 0.05))
    const working = inPit ? span(t, T.arrive - 0.1, T.arrive + 0.15) * (1 - span(t, T.jackDown - 0.05, T.jackDown + 0.15)) : 0

    crew.forEach((m, i) => {
      const s = spots[i]
      m.root.visible = inPit && t < T.leave - 0.02
      if (!m.root.visible) return
      m.mixer.update(delta)
      m.run.setEffectiveWeight(running ? 1 : 0)
      m.idle.setEffectiveWeight(running ? 0 : 1)

      m.root.position.lerpVectors(s.home, s.work, at)
      // Face where you're running; face the car while working.
      const outbound = t > T.jackDown
      const dir = new THREE.Vector3().subVectors(s.work, s.home).multiplyScalar(outbound ? -1 : 1)
      const runYaw = yawTo(dir.x, dir.z)
      const workYaw = s.axis === 'x' ? yawTo(s.face, 0) : yawTo(0, s.face)
      m.root.rotation.y = running ? runYaw : workYaw

      // Layer the kneel / brace pose over the animation.
      const p = m.pose
      for (const [bone, rot] of Object.entries(p)) {
        if (bone === 'drop') continue
        const b = m.bones[bone]
        if (!b) continue
        b.rotation.x += rot[0] * working
        b.rotation.y += rot[1] * working
        b.rotation.z += rot[2] * working
      }
      m.root.position.y = -p.drop * working
    })
  })

  return (
    <group>
      {crew.map((m, i) => (
        <primitive key={i} object={m.root} />
      ))}
    </group>
  )
}

useGLTF.preload(MODEL)
