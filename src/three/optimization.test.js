import test from 'node:test'
import assert from 'node:assert/strict'
import { BoxGeometry, BufferAttribute, BufferGeometry, Group, Matrix3, Mesh, MeshStandardMaterial, SkinnedMesh, TubeGeometry, Vector3 } from 'three'
import { batchStaticMeshes } from './staticBatch.js'
import { createDynamicTube } from './dynamicTube.js'

function triangles(root) {
  const result = []
  root.updateWorldMatrix(true, true)
  root.traverseVisible((mesh) => {
    if (!mesh.isMesh) return
    const position = mesh.geometry.attributes.position
    const indices = mesh.geometry.index?.array || Array.from({ length: position.count }, (_, i) => i)
    for (const index of indices) {
      const point = new Vector3().fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld)
      result.push(point.toArray())
    }
  })
  return result
}

function assertVertices(actual, expected) {
  assert.equal(actual.length, expected.length)
  actual.forEach((point, i) => point.forEach((value, axis) =>
    assert.ok(Math.abs(value - expected[i][axis]) < 1e-5, `vertex ${i}, axis ${axis}`)))
}

function normals(root) {
  const result = []
  root.updateWorldMatrix(true, true)
  root.traverseVisible((mesh) => {
    if (!mesh.isMesh) return
    const matrix = new Matrix3().getNormalMatrix(mesh.matrixWorld)
    const normal = mesh.geometry.attributes.normal
    const uv = mesh.geometry.attributes.uv
    for (const index of mesh.geometry.index.array) {
      result.push([...new Vector3().fromBufferAttribute(normal, index).applyNormalMatrix(matrix).toArray(), uv.getX(index), uv.getY(index)])
    }
  })
  return result
}

test('static batching preserves transformed triangles and material/shadow behavior, and restores on cleanup', () => {
  const root = new Group()
  root.position.set(12, 3, -5)
  root.rotation.y = 0.6
  const material = new MeshStandardMaterial()
  for (let i = 0; i < 8; i++) {
    const parent = new Group()
    parent.position.set(i, i * 0.4, -i)
    parent.rotation.set(0.2, i * 0.3, 0.4)
    const mesh = new Mesh(new BoxGeometry(), material)
    mesh.scale.set(2, 0.3, 4)
    mesh.castShadow = mesh.receiveShadow = true
    parent.add(mesh)
    root.add(parent)
  }
  const before = triangles(root)
  const beforeNormals = normals(root)
  const batches = batchStaticMeshes(root)
  assert.equal(batches.originalCalls, 8)
  assert.equal(batches.batchedCalls, 1)
  assertVertices(triangles(root), before)
  assertVertices(normals(root), beforeNormals)
  const batch = root.children.find((o) => o.isMesh)
  assert.equal(batch.material, material)
  assert.equal(batch.castShadow, true)
  assert.equal(batch.receiveShadow, true)
  assert.ok(batch.geometry.attributes.normal && batch.geometry.attributes.uv)
  batches.dispose()
  assertVertices(triangles(root), before)
  assert.equal(root.children.length, 8)
})

test('quantized positions are decoded before transforms, without clamping or integer overflow', () => {
  const root = new Group()
  const material = new MeshStandardMaterial()
  for (let i = 0; i < 2; i++) {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Int16Array([0, 0, 0, 32767, 0, 0, 0, 32767, 0]), 3, true))
    const mesh = new Mesh(geometry, material)
    mesh.position.set(i * 8, 3, -4)
    mesh.scale.setScalar(5)
    root.add(mesh)
  }
  const before = triangles(root)
  const batches = batchStaticMeshes(root)
  assert.equal(batches.batchedCalls, 1)
  assertVertices(triangles(root), before)
  batches.dispose()
})

test('transparent, skinned, mirrored and differently shadowed meshes remain separate', () => {
  const root = new Group()
  const material = new MeshStandardMaterial()
  const transparent = new MeshStandardMaterial({ transparent: true })
  const geometry = new BoxGeometry()
  const objects = [new Mesh(geometry, transparent), new Mesh(geometry, transparent),
    new SkinnedMesh(geometry, material), new Mesh(geometry, material), new Mesh(geometry, material)]
  objects[3].scale.x = -1
  objects[4].castShadow = true
  root.add(...objects)
  const batches = batchStaticMeshes(root)
  assert.equal(batches.batchedCalls, 0)
  assert.ok(objects.every((m) => m.visible))
})

test('excluded moving parts stay independent of merged static body geometry', () => {
  const root = new Group()
  const flap = new Group()
  const material = new MeshStandardMaterial()
  for (let i = 0; i < 4; i++) {
    const mesh = new Mesh(new BoxGeometry(), material)
    mesh.position.x = i
    if (i < 2) flap.add(mesh)
    else root.add(mesh)
  }
  root.add(flap)
  const batches = batchStaticMeshes(root, { exclude: [flap] })
  assert.equal(batches.originalCalls, 2)
  assert.equal(batches.batchedCalls, 1)
  assert.ok(flap.children.every((mesh) => mesh.visible))
  flap.rotation.x = 0.45
  root.updateWorldMatrix(true, true)
  assert.equal(flap.children[0].parent, flap)
  batches.dispose()
})

test('dynamic hoses match TubeGeometry across moving poses and reuse GPU attribute buffers', () => {
  const tube = createDynamicTube(5)
  const positionBuffer = tube.geometry.attributes.position.array
  const normalBuffer = tube.geometry.attributes.normal.array
  for (let frame = 0; frame < 12; frame++) {
    tube.curve.points.forEach((point, i) => point.set(Math.sin(frame * 0.2 + i) * 0.8, i * 0.8, Math.cos(i + frame * 0.1)))
    tube.update()
    const expected = new TubeGeometry(tube.curve, 40, 0.017, 7, false)
    assert.equal(tube.geometry.attributes.position.array, positionBuffer)
    assert.equal(tube.geometry.attributes.normal.array, normalBuffer)
    for (const name of ['position', 'normal', 'uv']) {
      const actual = tube.geometry.attributes[name].array
      const reference = expected.attributes[name].array
      assert.equal(actual.length, reference.length)
      for (let i = 0; i < actual.length; i++) assert.ok(Math.abs(actual[i] - reference[i]) < 1e-6, `${name}[${i}]`)
    }
    assert.deepEqual(tube.geometry.index.array, expected.index.array)
    expected.dispose()
  }
  tube.geometry.dispose()
})
