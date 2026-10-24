import * as THREE from 'three'

// Shared car rigging for the Garage and the Marina Bay race: the GLB car models ship their four wheels
// merged together, so they're split into separate pivots that can spin, steer and come off.

// Road-wheel parts; steering wheels are named "…_steeringwheel" / "…_sw" and must stay in the cockpit.
const WHEEL_PART = /(sidewall|tread|tyre|tire|rim|wheel|discs|hub_nut)/i
const NOT_WHEEL = /(steer|_sw\b|sw_)/i

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
export function splitWheels(scene) {
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

// A car ready to drive: scaled to F1 length (5.5 m), wheels on their own pivots, nose along +Z,
// sitting on y = 0. `root` goes in the scene; spin `wheels[i].pivot.rotation.x`, steer the front ones.
export function makeRaceRig(original, length = 5.5) {
  const scene = original.clone(true)
  scene.traverse((o) => {
    if (o.isMesh) o.castShadow = true
  })
  const raw = new THREE.Box3().setFromObject(scene)
  scene.scale.setScalar(length / (raw.max.z - raw.min.z))
  const { wheels, extras } = splitWheels(scene)
  const box = new THREE.Box3().setFromObject(scene)
  const body = new THREE.Group()
  body.add(scene, ...extras)
  const root = new THREE.Group()
  const inner = new THREE.Group()
  inner.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2)
  inner.add(body)
  wheels.forEach((w) => {
    w.pivot.rotation.order = 'YXZ'
    inner.add(w.pivot)
  })
  root.add(inner)
  return { root, body, wheels }
}
