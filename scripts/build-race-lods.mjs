import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { MeshoptSimplifier } from 'meshoptimizer'

// Keep the garage originals and every material / texture unchanged. Race-only rivals
// use fewer triangles with a 0.2% geometric error limit and preserved material seams.
const names = ['ferrari', 'redbull', 'mercedes', 'aston_martin', 'mclaren', 'audi', 'alpine', 'cadillac', 'williams']
const directory = new URL('../public/cars/race/', import.meta.url)
await mkdir(directory, { recursive: true })
await MeshoptSimplifier.ready
function pack(json, binary) {
  const text = Buffer.from(JSON.stringify(json))
  const padding = Buffer.alloc((4 - text.length % 4) % 4, 32)
  const out = Buffer.alloc(28 + text.length + padding.length + binary.length)
  out.writeUInt32LE(0x46546c67, 0)
  out.writeUInt32LE(2, 4)
  out.writeUInt32LE(out.length, 8)
  out.writeUInt32LE(text.length + padding.length, 12)
  out.writeUInt32LE(0x4e4f534a, 16)
  text.copy(out, 20)
  padding.copy(out, 20 + text.length)
  const start = 20 + text.length + padding.length
  out.writeUInt32LE(binary.length, start)
  out.writeUInt32LE(0x004e4942, start + 4)
  binary.copy(out, start + 8)
  return out
}
for (const name of names) {
  const source = await readFile(new URL(`../public/cars/${name}.glb`, import.meta.url))
  const jsonLength = source.readUInt32LE(12)
  const json = JSON.parse(source.subarray(20, 20 + jsonLength))
  const binary = source.subarray(28 + jsonLength)
  const geometryOnly = structuredClone(json)
  geometryOnly.materials = json.materials.map(({ name }) => ({ name }))
  geometryOnly.images = []
  geometryOnly.textures = []
  const packed = pack(geometryOnly, binary)
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(packed.buffer, '')
  const appended = [binary]
  let offset = binary.length
  let before = 0
  let after = 0
  const done = new Set()
  gltf.scene.traverse((mesh) => {
    const association = gltf.parser.associations.get(mesh)
    if (!mesh.isMesh || association?.meshes == null || association.primitives == null) return
    const key = `${association.meshes}/${association.primitives}`
    if (done.has(key)) return
    done.add(key)
    const geometry = mesh.geometry
    if (!geometry.index) return
    const positions = geometry.attributes.position
    const floats = new Float32Array(positions.count * 3)
    for (let i = 0; i < positions.count; i++) floats.set([positions.getX(i), positions.getY(i), positions.getZ(i)], i * 3)
    const indices = new Uint32Array(geometry.index.array)
    const target = Math.max(3, Math.floor(indices.length * 0.25 / 3) * 3)
    const [simplified] = MeshoptSimplifier.simplify(indices, floats, 3, target, 0.002)
    const bytes = Buffer.from(simplified.buffer, simplified.byteOffset, simplified.byteLength)
    const view = json.bufferViews.length
    json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target: 34963 })
    const accessor = json.accessors.length
    json.accessors.push({ bufferView: view, componentType: 5125, count: simplified.length, type: 'SCALAR' })
    json.meshes[association.meshes].primitives[association.primitives].indices = accessor
    appended.push(bytes)
    offset += bytes.length
    before += indices.length / 3
    after += simplified.length / 3
  })
  json.buffers[0].byteLength = offset
  await writeFile(new URL(`${name}.glb`, directory), pack(json, Buffer.concat(appended)))
  console.log(`${name}: ${before.toLocaleString()} → ${after.toLocaleString()} triangles`)
}
