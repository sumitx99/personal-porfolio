import { Float32BufferAttribute, Matrix4, Mesh, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Bake only explicitly static subtrees. Preserve vertices, normals, UVs and materials;
// transparent objects retain their individual sorting and animated meshes are excluded.
export function batchStaticMeshes(root, { cellSize = Infinity, exclude = [] } = {}) {
  root.updateWorldMatrix(true, true)
  const inverse = new Matrix4().copy(root.matrixWorld).invert()
  const matrix = new Matrix4()
  const center = new Vector3()
  const groups = new Map()
  root.traverseVisible((mesh) => {
    for (let parent = mesh; parent; parent = parent.parent) {
      if (exclude.includes(parent)) return
      if (parent === root) break
    }
    if (!mesh.isMesh || mesh.isSkinnedMesh || mesh.isInstancedMesh || mesh.morphTargetInfluences ||
        Array.isArray(mesh.material) || mesh.material.transparent) return
    matrix.multiplyMatrices(inverse, mesh.matrixWorld)
    // Reflected transforms need reversed triangle winding; leave them intact instead.
    if (matrix.determinant() <= 0) return
    const geometry = mesh.geometry
    if (geometry.drawRange.start !== 0 || geometry.drawRange.count !== Infinity) return
    const layout = Object.entries(geometry.attributes).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, a]) => `${key}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`).join(',')
    center.setFromMatrixPosition(matrix)
    const cell = Number.isFinite(cellSize) ? [center.x, center.y, center.z].map((n) => Math.floor(n / cellSize)).join(',') : ''
    const key = [mesh.material.uuid, mesh.castShadow, mesh.receiveShadow, mesh.renderOrder,
      mesh.layers.mask, !!geometry.index, layout, cell].join('|')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push({ mesh, matrix: matrix.clone() })
  })
  const batches = []
  let originalCalls = 0
  for (const entries of groups.values()) {
    if (entries.length < 2) continue
    const copies = entries.map(({ mesh, matrix }) => {
      const geometry = mesh.geometry.clone()
      // Quantized GLBs store positions/normals as normalized integers. Applying a
      // world transform into those arrays would clamp/overflow and damage the model.
      for (const name of ['position', 'normal', 'tangent']) {
        const source = geometry.getAttribute(name)
        if (!source || source.array instanceof Float32Array && !source.normalized) continue
        const attribute = new Float32BufferAttribute(new Float32Array(source.count * source.itemSize), source.itemSize)
        for (let i = 0; i < source.count; i++) {
          for (let c = 0; c < source.itemSize; c++) attribute.setComponent(i, c, source.getComponent(i, c))
        }
        geometry.setAttribute(name, attribute)
      }
      return geometry.applyMatrix4(matrix)
    })
    const geometry = mergeGeometries(copies, false)
    copies.forEach((g) => g.dispose())
    if (!geometry) continue
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    const source = entries[0].mesh
    const batch = new Mesh(geometry, source.material)
    batch.name = `StaticBatch:${source.material.name || source.material.type}`
    batch.castShadow = source.castShadow
    batch.receiveShadow = source.receiveShadow
    batch.renderOrder = source.renderOrder
    batch.layers.mask = source.layers.mask
    batch.matrixAutoUpdate = false
    entries.forEach(({ mesh }) => { mesh.visible = false })
    root.add(batch)
    batches.push({ batch, entries })
    originalCalls += entries.length
  }
  return {
    originalCalls, batchedCalls: batches.length,
    dispose() {
      batches.forEach(({ batch, entries }) => {
        root.remove(batch)
        batch.geometry.dispose()
        entries.forEach(({ mesh }) => { mesh.visible = true })
      })
    },
  }
}
