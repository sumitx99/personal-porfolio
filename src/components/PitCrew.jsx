import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import * as THREE from 'three'
import { PIT_TIMELINE as T } from '../f1'
import { disposeEquipment, dressCrew, makeBlanketTyre, makeGantry, makeHose, makeJack, makeParkedGun, makeWheelGun, updateHangingHose } from './PitGear'

// Rigged, animated human (Mixamo "Vanguard" from the three.js examples), dressed as a pit mechanic.
const MODEL = '/crew/mechanic.glb'

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))
const span = (t, a, b) => ease((t - a) / (b - a))

// Kneeling / bracing poses, layered on top of the Idle animation (radians, bone-local).
const POSES = {
  gunner: { LeftUpLeg: [-1.45, 0, 0], LeftLeg: [1.5, 0, 0], RightUpLeg: [-0.2, 0, 0], RightLeg: [2.1, 0, 0], Spine: [0.35, 0, 0], RightArm: [0, 0, 0.9], RightForeArm: [0, -1.1, 0], LeftArm: [0, 0, -0.9], LeftForeArm: [0, 1.1, 0], drop: 0.48 },
  carrier: { LeftUpLeg: [-0.6, 0, 0], LeftLeg: [0.9, 0, 0], RightUpLeg: [-0.6, 0, 0], RightLeg: [0.9, 0, 0], Spine: [0.45, 0, 0], RightArm: [0, 0, 1.0], RightForeArm: [0, -0.6, 0], LeftArm: [0, 0, -1.0], LeftForeArm: [0, 0.6, 0], drop: 0.2 },
  jack: { Spine: [0.55, 0, 0], Spine1: [0.2, 0, 0], RightArm: [0, 0, 1.1], LeftArm: [0, 0, -1.1], RightForeArm: [0, -0.4, 0], LeftForeArm: [0, 0.4, 0], LeftUpLeg: [-0.35, 0, 0], LeftLeg: [0.5, 0, 0], drop: 0.08 },
  // leaning on the sidepod with both hands to hold the car steady while the wheels come off
  stabiliser: { Spine: [0.7, 0, 0], Spine1: [0.25, 0, 0], RightArm: [0, 0, 1.25], LeftArm: [0, 0, -1.25], RightForeArm: [0, -0.2, 0], LeftForeArm: [0, 0.2, 0], LeftUpLeg: [-0.5, 0, 0], LeftLeg: [0.7, 0, 0], RightUpLeg: [-0.2, 0, 0], RightLeg: [0.3, 0, 0], drop: 0.12 },
}
// tyre-off and tyre-on men crouch like the old carrier pose
POSES.off = POSES.carrier
POSES.on = POSES.carrier

function makeMember(gltf, suit, trim, role) {
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

  dressCrew(bones, trim, role, suit)

  // Gunners carry a pneumatic wheel gun in the right hand.
  let gun = null
  if (role === 'gunner') {
    const ws = new THREE.Vector3()
    gun = makeWheelGun()
    bones.RightHand.getWorldScale(ws)
    gun.scale.setScalar(1 / ws.x)
    gun.position.set(0, 0.09 / ws.x, 0.04 / ws.x)
    bones.RightHand.add(gun)
  }

  const mixer = new THREE.AnimationMixer(root)
  const clip = (name) => gltf.animations.find((a) => a.name === name)
  const run = mixer.clipAction(clip('Run'))
  const idle = mixer.clipAction(clip('Idle'))
  run.play()
  idle.play()
  run.timeScale = 1.35
  return { root, bones, mixer, run, idle, role, gun, pose: POSES[role] }
}

// Work spots around the car, like a real stop: three per wheel (gun, tyre off, tyre on), front and
// rear jack, and a stabiliser either side of the cockpit. Everyone sprints in from `home` and back out.
function layout(rig) {
  const spots = []
  rig.wheels.forEach((w) => {
    const ox = w.base.x + w.outer
    const dz = w.front ? 1 : -1
    spots.push({ role: 'gunner', work: new THREE.Vector3(ox + w.side * 0.62, 0, w.base.z), face: -w.side, axis: 'x', wheel: w })
    // the old wheel is pulled outward and away from the axle line; the new one waits on the other side
    spots.push({ role: 'off', work: new THREE.Vector3(ox + w.side * 0.95, 0, w.base.z + dz * 0.95), face: -w.side, axis: 'x', wheel: w })
    spots.push({ role: 'on', work: new THREE.Vector3(ox + w.side * 1.0, 0, w.base.z - dz * 0.95), face: -w.side, axis: 'x', wheel: w })
  })
  spots.push({ role: 'jack', work: new THREE.Vector3(0, 0, rig.maxZ + 0.85), face: -1, axis: 'z', reach: 1.18 })
  spots.push({ role: 'jack', work: new THREE.Vector3(0, 0, rig.minZ - 0.85), face: 1, axis: 'z', reach: 0.88 })
  // stabilisers at the cockpit, between the front and rear tyre crews
  const front = rig.wheels.find((w) => w.front)
  const rear = rig.wheels.find((w) => !w.front)
  const midZ = front && rear ? (front.base.z * 0.4 + rear.base.z * 0.6) : (rig.minZ + rig.maxZ) / 2
  const halfW = Math.max(...rig.wheels.map((w) => Math.abs(w.base.x))) * 0.8
  for (const side of [-1, 1]) spots.push({ role: 'stabiliser', work: new THREE.Vector3(side * (halfW + 0.45), 0, midZ), face: -side, axis: 'x' })
  spots.forEach((s) => {
    s.home = s.work.clone()
    if (s.axis === 'x') s.home.x += -s.face * 3.4
    // jack men wait beside the box (garage side), clear of the car driving in and out
    else s.home.add(new THREE.Vector3(-3.2, 0, -s.face * 1.2))
  })
  return spots
}

// The Mixamo character faces -Z, so turn it half a revolution to face the direction we want.
const yawTo = (dx, dz) => Math.atan2(dx, dz) + Math.PI
const GANTRY_HEIGHT = 4.1 // metres; the overhead rail that carries the wheel-gun air lines

export default function PitCrew({ rig, suit, trim, pitStart }) {
  const gltf = useGLTF(MODEL)
  const group = useRef()
  const spots = useMemo(() => layout(rig), [rig])
  const crew = useMemo(() => spots.map((s) => makeMember(gltf, suit, trim, s.role)), [gltf, spots, suit, trim])

  // Equipment that isn't held: air hoses, the two jacks and a blanket-wrapped fresh tyre per corner.
  const gear = useMemo(() => {
    const hoses = spots.map((s) => (s.role === 'gunner' ? makeHose() : null))
    // each gunner's air line comes down from a reel on the overhead gantry, right above the wheel
    const anchors = spots.map((s) => (s.role === 'gunner' ? new THREE.Vector3(s.work.x + Math.sign(s.work.x) * 0.15, GANTRY_HEIGHT, s.work.z) : null))
    const gantry = makeGantry(anchors.filter(Boolean), trim, GANTRY_HEIGHT)
    const parked = anchors.map((a) => (a ? makeParkedGun(a) : null))
    const jacks = spots.map((s) => (s.role === 'jack' ? makeJack(trim, s.reach) : null))
    // the tyre-on man carries the new, blanket-wrapped tyre in and offers it up to the hub
    const tyres = rig.wheels.map((w) => {
      const tyre = makeBlanketTyre(w.radius, w.front ? 0.37 : 0.44, trim)
      const on = spots.find((s) => s.role === 'on' && s.wheel === w)
      const work = new THREE.Vector3(on.work.x - w.side * 0.45, w.radius * 1.04, on.work.z)
      const home = work.clone().setX(work.x + w.side * 3.4)
      const hub = new THREE.Vector3(w.base.x + w.side * 0.75, w.base.y, w.base.z)
      return { tyre, work, home, hub, side: w.side }
    })
    return { hoses, anchors, gantry, parked, jacks, tyres }
  }, [spots, rig, trim])
  const inlet = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    crew.forEach((member) => { member.run.play(); member.idle.play() })
    const shared = new Set()
    gltf.scene.traverse((object) => { if (object.geometry) shared.add(object.geometry) })
    return () => {
      crew.forEach((member) => member.mixer.stopAllAction())
      disposeEquipment(crew.map((member) => member.root), shared)
      disposeEquipment([...gear.hoses, gear.gantry, ...gear.parked, ...gear.jacks, ...gear.tyres.map((g) => g.tyre)])
    }
  }, [crew, gear, gltf])

  useFrame((state, delta) => {
    const t = pitStart == null ? Infinity : (state.clock.elapsedTime - pitStart)
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
      const direction = outbound ? -1 : 1
      const runYaw = yawTo((s.work.x - s.home.x) * direction, (s.work.z - s.home.z) * direction)
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

    const lift = inPit ? span(t, T.arrive, T.jackUp) * (1 - span(t, T.wheelsOn, T.jackDown)) : 0
    spots.forEach((s, i) => {
      // Hose from the gun up to its reel on the gantry, following the gunner; when nobody is out,
      // the gun hangs parked on its line instead.
      const hose = gear.hoses[i]
      if (hose) {
        hose.visible = crew[i].root.visible
        gear.parked[i].visible = !hose.visible
        if (hose.visible) {
          crew[i].gun.updateWorldMatrix(true, false)
          inlet.copy(crew[i].gun.userData.inlet)
          crew[i].gun.localToWorld(inlet)
          group.current.worldToLocal(inlet)
          updateHangingHose(hose, inlet, gear.anchors[i])
        }
      }
      // Jack rolls in ahead of its operator, then levers the car up in time with the lift.
      const jack = gear.jacks[i]
      if (jack) {
        jack.visible = crew[i].root.visible
        const pos = crew[i].root.position
        jack.position.set(pos.x, 0, pos.z + s.face * 0.32)
        jack.rotation.y = s.face > 0 ? 0 : Math.PI
        jack.userData.lever.rotation.x = -0.42 * lift
        jack.userData.wheels.rotation.x = (pos.z * s.face) / 0.1
      }
    })
    // Fresh tyres roll in wrapped in blankets; at wheels-off they head for the hub and get fitted.
    gear.tyres.forEach((g) => {
      g.tyre.visible = inPit && t < T.wheelsOff + 0.3
      if (!g.tyre.visible) return
      const fit = span(t, T.wheelsOff, T.wheelsOff + 0.3)
      g.tyre.position.lerpVectors(g.home, g.work, at).lerp(g.hub, fit)
      g.tyre.rotation.x = (g.tyre.position.x * g.side) / 0.35
    })
  })

  return (
    <group ref={group}>
      {crew.map((m, i) => (
        <primitive key={i} object={m.root} />
      ))}
      {gear.hoses.map((h, i) => h && <primitive key={`h${i}`} object={h} />)}
      {gear.parked.map((g, i) => g && <primitive key={`p${i}`} object={g} />)}
      <primitive object={gear.gantry} />
      {gear.jacks.map((j, i) => j && <primitive key={`j${i}`} object={j} />)}
      {gear.tyres.map((g, i) => (
        <primitive key={`t${i}`} object={g.tyre} />
      ))}
    </group>
  )
}

useGLTF.preload(MODEL)
