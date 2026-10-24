import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { RaceCameraRig } from './camera.js'
import { RACE_FRAME } from './frameOrder.js'

for (const mode of ['chase', 'cockpit']) {
  for (const speed of [1, 2, 4]) {
    test(`${mode} ${speed}x: camera uses the current car pose even when its model mounts last`, () => {
      const camera = new THREE.PerspectiveCamera(42, 1.7, 0.3, 6000)
      const rig = new RaceCameraRig()
      const car = new THREE.Object3D()
      const projected = new THREE.Vector3()
      let clock = 0
      let anchor
      // Camera subscribes before the model resolves, as happens with Suspense.
      const subscriptions = [
        { priority: RACE_FRAME.camera, update: (dt) => rig.update(camera, car, dt, { mode }) },
        { priority: RACE_FRAME.simulation, update: (dt) => { clock += dt * speed } },
        { priority: RACE_FRAME.pose, update: () => {
          car.position.set(Math.sin(clock) * 40, Math.sin(clock * 2), Math.cos(clock) * 40)
          car.rotation.y = clock + Math.sin(clock * 3) * 0.2
        } },
      ].sort((a, b) => a.priority - b.priority)
      for (let frame = 0; frame < 900; frame++) {
        const dt = frame % 7 === 0 ? 1 / 30 : 1 / 60
        subscriptions.forEach(({ update }) => update(dt))
        projected.copy(car.position).project(camera)
        if (!anchor) anchor = projected.clone()
        assert.ok(Math.abs(projected.x - anchor.x) < 1e-8, 'horizontal stale-frame shake')
        assert.ok(Math.abs(projected.y - anchor.y) < 1e-8, 'vertical stale-frame shake')
      }
      assert.ok(Object.values(RACE_FRAME).every((priority) => priority < 0), 'keep automatic rendering enabled')
    })
  }
}
