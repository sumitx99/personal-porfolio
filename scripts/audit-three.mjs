import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Box3, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { batchStaticMeshes } from '../src/three/staticBatch.js'
import { makeRaceRig } from '../src/components/carRig.js'

// Decode the actual compressed assets without browser-only texture loading.
async function loadGeometry(path) {
  const source = await readFile(new URL(`../public/${path}`, import.meta.url))
  const length = source.readUInt32LE(12)
  const json = JSON.parse(source.subarray(20, 20 + length))
  json.materials = json.materials.map(({ name, alphaMode, alphaCutoff, doubleSided }) => ({ name, alphaMode, alphaCutoff, doubleSided }))
  json.images = []
  json.textures = []
  const text = Buffer.from(JSON.stringify(json))
  const padding = Buffer.alloc((4 - text.length % 4) % 4, 32)
  const binary = source.subarray(20 + length)
  const result = Buffer.alloc(20 + text.length + padding.length + binary.length)
  result.writeUInt32LE(0x46546c67, 0)
  result.writeUInt32LE(2, 4)
  result.writeUInt32LE(result.length, 8)
  result.writeUInt32LE(text.length + padding.length, 12)
  result.writeUInt32LE(0x4e4f534a, 16)
  text.copy(result, 20)
  padding.copy(result, 20 + text.length)
  binary.copy(result, 20 + text.length + padding.length)
  return (await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(result.buffer, '')).scene
}

function inspect(root) {
  let calls = 0, triangles = 0
  const bounds = new Box3()
  const point = new Vector3()
  root.updateWorldMatrix(true, true)
  root.traverseVisible((mesh) => {
    if (!mesh.isMesh) return
    calls += Array.isArray(mesh.material) ? mesh.geometry.groups.length : 1
    triangles += (mesh.geometry.index?.count || mesh.geometry.attributes.position.count) / 3
    const position = mesh.geometry.attributes.position
    for (let i = 0; i < position.count; i++) bounds.expandByPoint(point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld))
  })
  return { calls, triangles, bounds }
}

const assets = ['models/desktop_pc.glb', ...['ferrari', 'redbull', 'mercedes', 'aston_martin', 'mclaren', 'audi', 'alpine', 'cadillac', 'williams'].map((name) => `cars/${name}.glb`)]
const rows = []
for (const asset of assets) {
  const scene = await loadGeometry(asset)
  const car = asset.startsWith('cars/') ? makeRaceRig(scene) : null
  const root = car?.root || scene
  const before = inspect(root)
  const flap = root.getObjectByName('DRS_Flap')
  const batches = batchStaticMeshes(car?.body || root, { exclude: flap ? [flap] : [] })
  const after = inspect(root)
  assert.equal(after.triangles, before.triangles, `${asset}: triangles preserved`)
  assert.ok(after.bounds.min.distanceTo(before.bounds.min) < 0.001, `${asset}: minimum bound preserved`)
  assert.ok(after.bounds.max.distanceTo(before.bounds.max) < 0.001, `${asset}: maximum bound preserved`)
  rows.push({ asset, meshesBefore: before.calls, meshesAfter: after.calls, triangles: after.triangles, boundsPreserved: true })
  batches.dispose()
}
console.log(JSON.stringify(rows, null, 2))
