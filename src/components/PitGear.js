import * as THREE from 'three'
import { createDynamicTube } from '../three/dynamicTube'

// Procedural pit equipment, modelled at real scale (metres).

const ACCENT = '#d4ff3a'
const mat = {
  gunmetal: new THREE.MeshStandardMaterial({ color: '#2b2d33', metalness: 0.85, roughness: 0.32 }),
  chrome: new THREE.MeshStandardMaterial({ color: '#d9dce1', metalness: 1, roughness: 0.15 }),
  rubber: new THREE.MeshStandardMaterial({ color: '#111214', roughness: 0.85 }),
  black: new THREE.MeshStandardMaterial({ color: '#0b0c0e', roughness: 0.55, metalness: 0.2 }),
  accent: new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.35, roughness: 0.4 }),
  white: new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.5 }),
  reflective: new THREE.MeshStandardMaterial({ color: '#e8eaee', metalness: 0.6, roughness: 0.25 }),
  hose: new THREE.MeshStandardMaterial({ color: '#16171a', roughness: 0.6 }),
}

// Primitives are not disposed automatically by Fiber. Keep module-level materials
// and cached blanket textures, but release each team's procedural GPU resources.
export function disposeEquipment(roots, preserveGeometries = new Set()) {
  const geometries = new Set()
  const materials = new Set()
  const skeletons = new Set()
  const shared = new Set(Object.values(mat))
  roots.filter(Boolean).forEach((root) => root.traverse((object) => {
    if (object.geometry && !preserveGeometries.has(object.geometry)) geometries.add(object.geometry)
    const list = Array.isArray(object.material) ? object.material : [object.material]
    list.forEach((material) => { if (material && !shared.has(material)) materials.add(material) })
    if (object.skeleton) skeletons.add(object.skeleton)
  }))
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
  skeletons.forEach((skeleton) => skeleton.dispose())
}

const mesh = (geo, material, props = {}) => {
  const m = new THREE.Mesh(geo, material)
  m.castShadow = true
  Object.assign(m.position, props.position || {})
  if (props.rotation) m.rotation.set(...props.rotation)
  return m
}

// Pneumatic wheel gun: barrel along +Z, grip hanging down. `inlet` is where the air hose plugs in.
export function makeWheelGun() {
  const g = new THREE.Group()
  const along = [Math.PI / 2, 0, 0]
  g.add(mesh(new THREE.CylinderGeometry(0.056, 0.06, 0.2, 20), mat.gunmetal, { rotation: along }))
  g.add(mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.035, 20), mat.accent, { position: { z: 0.09 }, rotation: along }))
  g.add(mesh(new THREE.SphereGeometry(0.056, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat.gunmetal, { position: { z: -0.1 }, rotation: [-Math.PI / 2, 0, 0] }))
  g.add(mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.1, 18), mat.chrome, { position: { z: 0.155 }, rotation: along }))
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 6), mat.black, { position: { z: 0.215 }, rotation: along }))
  g.add(mesh(new THREE.TorusGeometry(0.037, 0.006, 8, 24), mat.accent, { position: { z: 0.2 } }))
  // pistol grip and trigger
  g.add(mesh(new THREE.BoxGeometry(0.045, 0.14, 0.06), mat.rubber, { position: { y: -0.1, z: -0.03 }, rotation: [0.25, 0, 0] }))
  g.add(mesh(new THREE.BoxGeometry(0.015, 0.035, 0.02), mat.black, { position: { y: -0.065, z: 0.02 } }))
  // front handle for the second hand
  g.add(mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.13, 10), mat.rubber, { position: { x: -0.07, y: -0.02, z: 0.04 }, rotation: [0, 0, Math.PI / 2] }))
  // air inlet at the bottom of the grip
  g.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 10), mat.chrome, { position: { y: -0.18, z: -0.05 } }))
  g.userData.inlet = new THREE.Vector3(0, -0.2, -0.05)
  return g
}

// Air hose rebuilt each frame from the gun to an air line at the edge of the box.
export function makeHose() {
  const m = new THREE.Mesh(new THREE.BufferGeometry(), mat.hose)
  m.castShadow = true
  m.frustumCulled = false
  return m
}
const tmp = new THREE.Vector3()
export function updateHose(hose, from, side, z) {
  const pts = [
    from.clone(),
    tmp.set(from.x + side * 0.12, Math.max(0.05, from.y * 0.35), from.z).clone(),
    new THREE.Vector3(from.x + side * 0.6, 0.025, from.z + 0.15),
    new THREE.Vector3(side * 5.4, 0.025, z + 0.4),
  ]
  hose.geometry.dispose()
  hose.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.017, 7)
}

// Air hose hanging from the overhead gantry down to the gun, with a little sag in the middle.
export function updateHangingHose(hose, from, anchor) {
  if (!hose.userData.tube) {
    hose.geometry.dispose()
    hose.userData.tube = createDynamicTube(5)
    hose.geometry = hose.userData.tube.geometry
  }
  const tube = hose.userData.tube
  const pts = tube.curve.points
  pts[0].copy(from)
  pts[1].set(from.x, from.y + 0.25, from.z)
  pts[2].lerpVectors(from, anchor, 0.5)
  pts[2].y -= 0.35
  pts[2].x += (from.x - anchor.x) * 0.2
  pts[3].set(anchor.x, anchor.y - 0.35, anchor.z)
  pts[4].copy(anchor)
  tube.update()
}

// Overhead gantry over the pit box: a rail down each side of the car carrying the wheel-gun air
// lines, with a reel at each corner. `anchors` are the reel positions (local, metres).
export function makeGantry(anchors, trim, height) {
  const g = new THREE.Group()
  const steel = new THREE.MeshStandardMaterial({ color: '#3a3d44', metalness: 0.8, roughness: 0.35 })
  const trimMat = new THREE.MeshStandardMaterial({ color: trim, roughness: 0.45, metalness: 0.3 })
  const zs = anchors.map((a) => a.z)
  const z0 = Math.min(...zs) - 1.2
  const z1 = Math.max(...zs) + 1.2
  for (const side of [-1, 1]) {
    const x = anchors.find((a) => Math.sign(a.x) === side)?.x ?? side * 1.6
    g.add(mesh(new THREE.BoxGeometry(0.14, 0.18, z1 - z0), steel, { position: { x, y: height + 0.12, z: (z0 + z1) / 2 } }))
    g.add(mesh(new THREE.BoxGeometry(0.16, 0.04, z1 - z0), trimMat, { position: { x, y: height + 0.02, z: (z0 + z1) / 2 } }))
    // hangers up into the garage gantry
    for (const z of [z0 + 0.2, z1 - 0.2]) g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), steel, { position: { x, y: height + 0.65, z } }))
  }
  for (const z of [z0 + 0.2, z1 - 0.2]) {
    const xs = anchors.map((a) => a.x)
    const w = Math.max(...xs) - Math.min(...xs)
    g.add(mesh(new THREE.BoxGeometry(w, 0.12, 0.12), steel, { position: { x: 0, y: height + 0.12, z } }))
  }
  anchors.forEach((a) => {
    const reel = new THREE.Group()
    reel.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 20), mat.gunmetal, { rotation: [0, 0, Math.PI / 2] }))
    reel.add(mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 20), mat.hose, { rotation: [0, Math.PI / 2, 0] }))
    reel.position.set(a.x, height - 0.1, a.z)
    g.add(reel)
  })
  return g
}

// A wheel gun parked on its air line, hanging at chest height when nobody holds it.
export function makeParkedGun(anchor) {
  const g = new THREE.Group()
  const gun = makeWheelGun()
  gun.rotation.set(Math.PI / 2, 0, 0)
  gun.position.set(anchor.x, 1.25, anchor.z)
  g.add(gun)
  const hose = makeHose()
  const top = anchor.clone()
  const end = new THREE.Vector3(anchor.x, 1.25 + 0.2, anchor.z)
  hose.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([end, new THREE.Vector3(anchor.x + 0.05, (end.y + top.y) / 2, anchor.z), top]), 16, 0.017, 7)
  g.add(hose)
  return g
}

// F1 lifting jack: a lever on two wheels. Local +Z points at the car; the pivot is the axle.
// Pushing the handle down tips the cradle up under the nose or gearbox.
export function makeJack(color, reach) {
  const jack = new THREE.Group()
  const wheels = new THREE.Group()
  const lever = new THREE.Group()
  jack.add(wheels, lever)

  const axleZ = reach - 0.32
  wheels.position.set(0, 0.1, axleZ)
  lever.position.set(0, 0.16, axleZ)
  for (const x of [-0.17, 0.17]) {
    const w = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 20), mat.rubber, { position: { x }, rotation: [0, 0, Math.PI / 2] })
    const hub = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.055, 14), mat.chrome, { position: { x }, rotation: [0, 0, Math.PI / 2] })
    wheels.add(w, hub)
  }
  wheels.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.36, 8), mat.chrome, { rotation: [0, 0, Math.PI / 2] }))

  // main beam from handle (behind the axle) to cradle (in front), painted in team colour
  const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.35 })
  const back = axleZ
  lever.add(mesh(new THREE.BoxGeometry(0.07, 0.06, back + 0.32), paint, { position: { z: -(back - 0.32) / 2 } }))
  lever.add(mesh(new THREE.BoxGeometry(0.05, 0.05, 0.36), mat.black, { position: { y: 0.04, z: 0.16 } }))
  // lifting cradle
  const cradle = new THREE.Group()
  cradle.position.set(0, 0.06, 0.32)
  cradle.add(mesh(new THREE.BoxGeometry(0.46, 0.04, 0.09), mat.gunmetal))
  for (const x of [-0.21, 0.21]) cradle.add(mesh(new THREE.BoxGeometry(0.04, 0.1, 0.09), mat.gunmetal, { position: { x, y: 0.06 } }))
  cradle.add(mesh(new THREE.BoxGeometry(0.38, 0.015, 0.08), mat.rubber, { position: { y: 0.027 } }))
  lever.add(cradle)
  // T-handle with grips at the operator end, angled up
  const handle = new THREE.Group()
  handle.position.set(0, 0.02, -back)
  handle.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.62, 10), mat.chrome, { position: { y: 0.3, z: -0.05 }, rotation: [-0.2, 0, 0] }))
  handle.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 10), mat.chrome, { position: { y: 0.6, z: -0.11 }, rotation: [0, 0, Math.PI / 2] }))
  for (const x of [-0.2, 0.2]) handle.add(mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.12, 12), mat.accent, { position: { x, y: 0.6, z: -0.11 }, rotation: [0, 0, Math.PI / 2] }))
  lever.add(handle)

  jack.userData = { lever, wheels }
  return jack
}

// Quilted tyre-blanket texture: team colour with stitched panels and a lime band.
const blanketTextures = new Map()
function blanketTexture(color) {
  if (blanketTextures.has(color)) return blanketTextures.get(color)
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const ctx = c.getContext('2d')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 512, 128)
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = 3
  for (let x = 0; x <= 512; x += 32) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 128)
    ctx.stroke()
  }
  ctx.setLineDash([6, 6])
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 2
  for (const y of [20, 108]) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(512, y)
    ctx.stroke()
  }
  ctx.setLineDash([])
  ctx.fillStyle = ACCENT
  ctx.fillRect(0, 56, 512, 16)
  ctx.fillStyle = '#0b0c0e'
  ctx.font = '700 13px JetBrains Mono, monospace'
  for (let x = 20; x < 512; x += 128) ctx.fillText('SK RACING · 80°C', x, 68)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  blanketTextures.set(color, tex)
  return tex
}

// Fresh tyre wrapped in its electric blanket, axle along X like the car's wheels.
export function makeBlanketTyre(radius, width, color) {
  const g = new THREE.Group()
  const tread = new THREE.MeshStandardMaterial({ map: blanketTexture(color), roughness: 0.9 })
  const side = new THREE.MeshStandardMaterial({ color: '#1a1b1f', roughness: 0.9 })
  const body = mesh(new THREE.CylinderGeometry(radius * 1.04, radius * 1.04, width * 1.05, 40, 1, false), [tread, side, side], { rotation: [0, 0, Math.PI / 2] })
  g.add(body)
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.TorusGeometry(radius * 0.66, 0.025, 10, 40), mat.rubber, { position: { x: s * width * 0.53 }, rotation: [0, Math.PI / 2, 0] }))
  }
  // power cable trailing to the floor
  const cable = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -radius * 0.2, -radius * 0.95),
    new THREE.Vector3(0, -radius * 0.8, -radius * 1.4),
    new THREE.Vector3(0, -radius + 0.01, -radius * 2.2),
  ])
  g.add(mesh(new THREE.TubeGeometry(cable, 16, 0.008, 6), mat.black))
  return g
}

// Fire-suit details stitched onto the rig: gloves, boots, reflective bands, chest panel, knee pads,
// helmet stripe and radio mic. Bone scales vary, so each piece is sized in metres.
export function dressCrew(bones, trim, role, suit = '#f4f4f4') {
  const ws = new THREE.Vector3()
  const attach = (boneName, obj, offset = [0, 0, 0]) => {
    const b = bones[boneName]
    if (!b) return
    b.getWorldScale(ws)
    obj.scale.multiplyScalar(1 / ws.x)
    obj.position.set(offset[0] / ws.x, offset[1] / ws.x, offset[2] / ws.x)
    b.add(obj)
  }
  const trimMat = new THREE.MeshStandardMaterial({ color: trim, roughness: 0.45, metalness: 0.2 })

  // helmet in the team's colour with a contrasting stripe, dark visor, radio mic
  const helmet = new THREE.Group()
  helmet.add(mesh(new THREE.SphereGeometry(0.13, 28, 20), new THREE.MeshPhysicalMaterial({ color: suit, clearcoat: 1, roughness: 0.18 })))
  helmet.add(mesh(new THREE.TorusGeometry(0.131, 0.012, 8, 40, Math.PI), trimMat, { rotation: [0, Math.PI / 2, 0] }))
  helmet.add(mesh(new THREE.SphereGeometry(0.132, 24, 12, -0.9, 1.8, 1.25, 0.55), new THREE.MeshPhysicalMaterial({ color: '#0b0c10', metalness: 0.6, roughness: 0.06, clearcoat: 1 })))
  helmet.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), mat.black, { position: { x: 0.09, y: -0.08, z: 0.06 }, rotation: [0.9, 0, 0.3] }))
  attach('Head', helmet, [0, 0.1, 0.015])

  for (const s of ['Left', 'Right']) {
    attach(`${s}Hand`, mesh(new THREE.SphereGeometry(0.052, 14, 10), mat.black), [0, 0.05, 0])
    attach(`${s}Foot`, mesh(new THREE.CapsuleGeometry(0.055, 0.14, 6, 12), mat.black), [0, 0.06, 0.02])
    attach(`${s}ForeArm`, mesh(new THREE.TorusGeometry(0.052, 0.012, 8, 24), mat.reflective, { rotation: [Math.PI / 2, 0, 0] }), [0, 0.14, 0])
    attach(`${s}Leg`, mesh(new THREE.TorusGeometry(0.068, 0.013, 8, 24), mat.reflective, { rotation: [Math.PI / 2, 0, 0] }), [0, 0.2, 0])
    attach(`${s}Arm`, mesh(new THREE.TorusGeometry(0.07, 0.016, 8, 24), trimMat, { rotation: [Math.PI / 2, 0, 0] }), [0, 0.06, 0])
    // two-tone suit: a team-colour stripe down the outside of each leg and arm
    const out = s === 'Left' ? 1 : -1
    attach(`${s}UpLeg`, mesh(new THREE.BoxGeometry(0.03, 0.4, 0.05), trimMat), [out * 0.085, 0.2, 0])
    attach(`${s}Leg`, mesh(new THREE.BoxGeometry(0.026, 0.36, 0.045), trimMat), [out * 0.07, 0.2, 0])
    attach(`${s}ForeArm`, mesh(new THREE.BoxGeometry(0.022, 0.2, 0.03), trimMat), [out * 0.05, 0.12, 0])
    if (role === 'gunner') attach(`${s}Leg`, mesh(new THREE.BoxGeometry(0.13, 0.1, 0.06), mat.black), [0, 0.02, 0.06])
  }
  // chest panel with a lime team mark, and a belt
  const chest = new THREE.Group()
  chest.add(mesh(new THREE.BoxGeometry(0.24, 0.09, 0.02), mat.white))
  chest.add(mesh(new THREE.BoxGeometry(0.05, 0.05, 0.022), trimMat, { position: { x: -0.07 } }))
  chest.add(mesh(new THREE.BoxGeometry(0.1, 0.012, 0.022), mat.accent, { position: { x: 0.04 } }))
  attach('Spine2', chest, [0, 0.06, 0.14])
  attach('Hips', mesh(new THREE.TorusGeometry(0.17, 0.02, 8, 32), mat.black, { rotation: [Math.PI / 2, 0, 0] }), [0, 0.07, 0])
}
