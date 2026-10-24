import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { RaceCameraRig } from './camera.js'

for (const mode of ['chase', 'front', 'heli']) {
  test(`${mode}: car stays anchored on screen through turns, height changes and uneven frames`, () => {
    const camera = new THREE.PerspectiveCamera(42, 1.7, 0.3, 6000)
    const rig = new RaceCameraRig()
    const car = new THREE.Object3D()
    const projected = new THREE.Vector3()
    let anchor
    for (let frame = 0; frame < 1200; frame++) {
      const t = frame / 60
      car.position.set(Math.sin(t) * 100, Math.sin(t * 2) * 2, Math.cos(t) * 100)
      car.rotation.set(Math.sin(t * 5) * 0.01, t + Math.sin(t * 3) * 0.2, 0)
      const dt = frame % 7 === 0 ? 1 / 30 : 1 / 60
      rig.update(camera, car, dt, { mode })
      projected.copy(car.position).project(camera)
      if (!anchor) anchor = projected.clone()
      assert.ok(Math.abs(projected.x - anchor.x) < 1e-8, 'horizontal camera shake')
      assert.ok(Math.abs(projected.y - anchor.y) < 1e-8, 'vertical camera shake')
    }
  })
}

test('cockpit stays fixed to the car through pitch, roll, turns and uneven frames', () => {
  const camera = new THREE.PerspectiveCamera(42, 1.7, 0.3, 6000)
  const rig = new RaceCameraRig()
  const car = new THREE.Object3D()
  const features = [new THREE.Vector3(-0.8, 0.35, 1.5), new THREE.Vector3(0.8, 0.35, 1.5), new THREE.Vector3(0, 1.05, 0.4)]
  let anchors
  for (let frame = 0; frame < 600; frame++) {
    const t = frame / 60
    car.position.set(Math.sin(t) * 100, Math.cos(t * 2) * 2, t * 50)
    car.rotation.set(Math.sin(t) * 0.08, t, Math.cos(t) * 0.03)
    rig.update(camera, car, frame % 7 ? 1 / 60 : 1 / 30, { mode: 'cockpit', boosting: frame % 2 === 0 })
    const projected = features.map((point) => point.clone().applyQuaternion(car.quaternion).add(car.position).project(camera))
    if (!anchors) anchors = projected
    projected.forEach((point, i) => assert.ok(point.distanceTo(anchors[i]) < 1e-8, 'cockpit geometry must stay stable on screen'))
  }
})

test('leaving cockpit restores the existing chase camera clipping and upright horizon', () => {
  const camera = new THREE.PerspectiveCamera(42, 1.7, 0.3, 6000)
  const rig = new RaceCameraRig()
  const car = new THREE.Object3D()
  car.rotation.z = 0.1
  rig.update(camera, car, 1 / 60, { mode: 'cockpit', small: true })
  assert.equal(camera.near, 0.05)
  rig.update(camera, car, 1 / 60, { mode: 'chase' })
  assert.equal(camera.near, 0.3)
  assert.deepEqual(camera.up.toArray(), [0, 1, 0])
})

test('portrait cockpit framing keeps both front tyres within view', () => {
  const camera = new THREE.PerspectiveCamera(42, 0.6, 0.3, 6000)
  const rig = new RaceCameraRig()
  const car = new THREE.Object3D()
  rig.update(camera, car, 1 / 60, { mode: 'cockpit', small: true })
  for (const x of [-1, 1]) {
    const tyre = new THREE.Vector3(x, 0.35, 1.5).project(camera)
    assert.ok(Math.abs(tyre.x) < 1 && Math.abs(tyre.y) < 1 && tyre.z < 1, 'front tyre outside the portrait camera')
  }
})
