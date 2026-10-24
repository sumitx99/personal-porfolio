import { readFile, readdir, writeFile } from 'node:fs/promises'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { makeRaceRig } from '../src/components/carRig.js'
import { fitWheelAxle } from '../src/race/wheels.js'

// Calibrate from the original, uniformly tessellated tyres. Simplification keeps
// their shape but changes vertex density, which biases a PCA fit on rival meshes.
const result = {}
const folder = new URL('../public/cars/', import.meta.url)
for (const name of (await readdir(folder)).filter((name) => name.endsWith('.glb')).sort()) {
  const source = await readFile(new URL(name, folder))
  const length = source.readUInt32LE(12)
  const json = JSON.parse(source.subarray(20, 20 + length))
  json.materials = json.materials.map(({ name }) => ({ name }))
  json.images = []
  json.textures = []
  const text = Buffer.from(JSON.stringify(json))
  const padding = Buffer.alloc((4 - text.length % 4) % 4, 32)
  const binary = source.subarray(20 + length)
  const out = Buffer.alloc(20 + text.length + padding.length + binary.length)
  out.writeUInt32LE(0x46546c67, 0)
  out.writeUInt32LE(2, 4)
  out.writeUInt32LE(out.length, 8)
  out.writeUInt32LE(text.length + padding.length, 12)
  out.writeUInt32LE(0x4e4f534a, 16)
  text.copy(out, 20)
  padding.copy(out, 20 + text.length)
  binary.copy(out, 20 + text.length + padding.length)
  const { scene } = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(out.buffer, '')
  result[`/cars/${name}`] = makeRaceRig(scene).wheels.map((wheel) => fitWheelAxle(wheel).toArray())
}
await writeFile(new URL('../src/race/wheel-calibration.json', import.meta.url), JSON.stringify(result, null, 2) + '\n')
console.log(`Calibrated ${Object.keys(result).length} original cars`)
