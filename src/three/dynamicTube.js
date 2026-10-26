import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three'

// Same Frenet-frame construction as THREE.TubeGeometry, with persistent vertex buffers.
export function createDynamicTube(pointCount, segments = 40, radius = 0.017, sides = 7) {
  const curve = new CatmullRomCurve3(Array.from({ length: pointCount }, (_, i) => new Vector3(0, i, 0)))
  const geometry = new TubeGeometry(curve, segments, radius, sides, false)
  const point = new Vector3()
  return {
    curve, geometry,
    update() {
      curve.updateArcLengths()
      const frames = curve.computeFrenetFrames(segments, false)
      const positions = geometry.attributes.position
      const normals = geometry.attributes.normal
      for (let i = 0; i <= segments; i++) {
        curve.getPointAt(i / segments, point)
        const n = frames.normals[i]
        const b = frames.binormals[i]
        for (let j = 0; j <= sides; j++) {
          const angle = j / sides * Math.PI * 2
          const sin = Math.sin(angle), cos = -Math.cos(angle)
          let x = cos * n.x + sin * b.x
          let y = cos * n.y + sin * b.y
          let z = cos * n.z + sin * b.z
          const length = Math.hypot(x, y, z)
          x /= length; y /= length; z /= length
          const index = i * (sides + 1) + j
          normals.setXYZ(index, x, y, z)
          positions.setXYZ(index, point.x + radius * x, point.y + radius * y, point.z + radius * z)
        }
      }
      positions.needsUpdate = normals.needsUpdate = true
      return geometry
    },
  }
}
