import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { makeRaceRig } from '../components/carRig.js'
import { attachWheelSpin, fitWheelAxle } from './wheels.js'
import { steerFrontWheels } from './steering.js'

const calibration = JSON.parse(readFileSync(new URL('./wheel-calibration.json', import.meta.url)))

// Load the real compressed meshes in Node, omitting textures which need a browser.
async function loadCar(name) {
  const source = readFileSync(new URL(`../../public/cars/${name}.glb`, import.meta.url))
  const jsonLength = source.readUInt32LE(12)
  const json = JSON.parse(source.subarray(20, 20 + jsonLength))
  json.materials = json.materials.map(({ name }) => ({ name }))
  json.images = []
  json.textures = []
  const text = Buffer.from(JSON.stringify(json))
  const padding = Buffer.alloc((4 - text.length % 4) % 4, 32)
  const binary = source.subarray(20 + jsonLength)
  const glb = Buffer.alloc(20 + text.length + padding.length + binary.length)
  glb.writeUInt32LE(0x46546c67, 0)
  glb.writeUInt32LE(2, 4)
  glb.writeUInt32LE(glb.length, 8)
  glb.writeUInt32LE(text.length + padding.length, 12)
  glb.writeUInt32LE(0x4e4f534a, 16)
  text.copy(glb, 20)
  padding.copy(glb, 20 + text.length)
  binary.copy(glb, 20 + text.length + padding.length)
  return (await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(glb.buffer, '')).scene
}

function worldAxle(wheel) {
  const meshes = []
  wheel.pivot.traverse((mesh) => {
    if (mesh.isMesh && /(sidewall|tyre_sides|tread)/i.test(mesh.material.name)) {
      meshes.push({ material: mesh.material, geometry: mesh.geometry.clone().applyMatrix4(mesh.matrixWorld) })
    }
  })
  const axle = fitWheelAxle({ pivot: { children: meshes } })
  meshes.forEach(({ geometry }) => geometry.dispose())
  return axle
}

for (const name of ['ferrari', 'redbull', 'mercedes', 'aston_martin', 'mclaren', 'audi', 'alpine']) {
  test(`${name}: all four simplified rival tyres stay on the original axle through every spin phase`, async () => {
    const rig = makeRaceRig(await loadCar(`race/${name}`))
    for (const [i, wheel] of rig.wheels.entries()) {
      const reference = new THREE.Vector3().fromArray(calibration[`/cars/${name}.glb`][i])
      attachWheelSpin(wheel, reference.toArray())
      rig.root.updateMatrixWorld(true)
      const points = []
      wheel.spin.traverse((mesh) => {
        if (!mesh.isMesh) return
        const indices = [...new Set(mesh.geometry.index.array)]
        for (let j = 0; j < indices.length; j += Math.max(1, Math.floor(indices.length / 40))) {
          const point = new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, indices[j])
          points.push({ mesh, point, axial: point.clone().applyMatrix4(mesh.matrixWorld).dot(reference) })
        }
      })
      assert.ok(points.length > 20, 'test the real simplified tyre surface')
      for (const phase of [0.4, Math.PI / 2, Math.PI, 3 * Math.PI / 2, 2 * Math.PI]) {
        wheel.spin.rotation.x = phase
        rig.root.updateMatrixWorld(true)
        for (const { mesh, point, axial } of points) {
          assert.ok(Math.abs(point.clone().applyMatrix4(mesh.matrixWorld).dot(reference) - axial) < 1e-6, 'tyre surface must not move in/out along the original axle')
        }
      }
    }
  })
  test(`${name}: cambered front wheels keep their axle and suspension fixed through a revolution`, async () => {
    const rig = makeRaceRig(await loadCar(name))
    for (const wheel of rig.wheels.filter((w) => w.front)) {
      rig.root.updateMatrixWorld(true)
      const axis = worldAxle(wheel)
      assert.ok(Math.abs(axis.y) > 0.02, 'fixture must contain real front-wheel camber')
      const originals = new Map(wheel.pivot.children.map((mesh) => [mesh, mesh.matrixWorld.clone()]))
      attachWheelSpin(wheel)
      rig.root.updateMatrixWorld(true)
      for (const [mesh, matrix] of originals) {
        assert.ok(mesh.matrixWorld.elements.every((n, i) => Math.abs(n - matrix.elements[i]) < 1e-6), 'attachment must preserve the original pose')
      }
      const fixed = wheel.pivot.children.filter((mesh) => mesh.isMesh)
      assert.ok(fixed.length > 0, 'suspension / brake pieces must stay outside the spin group')
      const fixedMatrices = fixed.map((mesh) => mesh.matrixWorld.clone())
      for (const phase of [0.4, Math.PI / 2, Math.PI, 3 * Math.PI / 2, 2 * Math.PI]) {
        wheel.spin.rotation.x = phase
        rig.root.updateMatrixWorld(true)
        assert.ok(axis.angleTo(worldAxle(wheel)) < 0.003, 'tyre camber must not orbit with the spin')
        fixed.forEach((mesh, i) => assert.deepEqual(mesh.matrixWorld.elements, fixedMatrices[i].elements, 'suspension must not rotate with the tyre'))
      }
    }
    const body = rig.body.matrixWorld.clone()
    const rear = rig.wheels.filter((wheel) => !wheel.front).map((wheel) => wheel.pivot.matrixWorld.clone())
    const centres = rig.wheels.map((wheel) => wheel.pivot.getWorldPosition(new THREE.Vector3()))
    for (const angle of [-0.35, 0.35, 0]) {
      steerFrontWheels(rig.wheels, angle)
      rig.root.updateMatrixWorld(true)
      assert.deepEqual(rig.body.matrixWorld.elements, body.elements, 'steering must leave the body fixed')
      rig.wheels.filter((wheel) => !wheel.front).forEach((wheel, i) => {
        assert.deepEqual(wheel.pivot.matrixWorld.elements, rear[i].elements, 'rear tyres must not steer')
      })
      rig.wheels.forEach((wheel, i) => {
        assert.ok(wheel.pivot.getWorldPosition(new THREE.Vector3()).distanceTo(centres[i]) < 1e-8, 'steering must not move the axle centres')
        if (wheel.front && angle) assert.ok(Math.abs(wheel.pivot.rotation.y) > 0.3, 'both real front tyres must visibly turn')
      })
    }
  })
}
