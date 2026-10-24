import * as THREE from 'three'

// The GLB tyres have camber baked into their vertices. Spinning them around the
// car's X axis rotates that camber too, making the tyre wobble in and out. Fit the
// axle to the tyre surface, then spin in that local frame. The garage rig is untouched.
export function fitWheelAxle(wheel) {
  const points = []
  const center = new THREE.Vector3()
  for (const mesh of wheel.pivot.children) {
    if (!/(sidewall|tyre_sides|tread)/i.test(mesh.material?.name || '')) continue
    const positions = mesh.geometry.attributes.position
    const indices = mesh.geometry.index?.array || Array.from({ length: positions.count }, (_, i) => i)
    for (const i of new Set(indices)) {
      const point = new THREE.Vector3().fromBufferAttribute(positions, i)
      points.push(point)
      center.add(point)
    }
  }
  if (!points.length) return new THREE.Vector3(1, 0, 0)
  center.divideScalar(points.length)
  const matrix = Array.from({ length: 3 }, () => [0, 0, 0])
  const vectors = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
  for (const point of points) {
    const v = point.sub(center).toArray()
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) matrix[i][j] += v[i] * v[j]
  }
  // Jacobi diagonalisation of the symmetric covariance matrix. The smallest
  // principal extent is the tyre's axle, rather than its circular rolling plane.
  for (let iteration = 0; iteration < 24; iteration++) {
    let p = 0
    let q = 1
    for (const [i, j] of [[0, 2], [1, 2]]) if (Math.abs(matrix[i][j]) > Math.abs(matrix[p][q])) [p, q] = [i, j]
    if (Math.abs(matrix[p][q]) < 1e-10) break
    const angle = Math.atan2(2 * matrix[p][q], matrix[q][q] - matrix[p][p]) / 2
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    const pp = matrix[p][p]
    const qq = matrix[q][q]
    const pq = matrix[p][q]
    for (let k = 0; k < 3; k++) {
      if (k !== p && k !== q) {
        const kp = matrix[k][p]
        const kq = matrix[k][q]
        matrix[k][p] = matrix[p][k] = c * kp - s * kq
        matrix[k][q] = matrix[q][k] = s * kp + c * kq
      }
      const vp = vectors[k][p]
      const vq = vectors[k][q]
      vectors[k][p] = c * vp - s * vq
      vectors[k][q] = s * vp + c * vq
    }
    matrix[p][p] = c * c * pp - 2 * s * c * pq + s * s * qq
    matrix[q][q] = s * s * pp + 2 * s * c * pq + c * c * qq
    matrix[p][q] = matrix[q][p] = 0
  }
  let smallest = 0
  for (let i = 1; i < 3; i++) if (matrix[i][i] < matrix[smallest][smallest]) smallest = i
  const axis = new THREE.Vector3(...vectors.map((row) => row[smallest])).normalize()
  if (axis.x < 0) axis.negate()
  return axis
}

export function attachWheelSpin(wheel, calibratedAxle) {
  const frame = new THREE.Group()
  const axle = calibratedAxle ? new THREE.Vector3().fromArray(calibratedAxle).normalize() : fitWheelAxle(wheel)
  frame.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), axle)
  const inverse = new THREE.Matrix4().makeRotationFromQuaternion(frame.quaternion.clone().invert())
  const spin = new THREE.Group()
  for (const mesh of [...wheel.pivot.children]) {
    // The shared splitter also catches nearby carbon suspension/brake pieces inside
    // the tyre cylinder. They can follow steering, but must never roll with the tyre.
    if (!/(sidewall|tyre|tire|tread|rim|wheel_hub|hub_nut|discs)/i.test(mesh.material?.name || '')) continue
    mesh.applyMatrix4(inverse)
    spin.add(mesh)
  }
  frame.add(spin)
  wheel.pivot.add(frame)
  wheel.spin = spin
  return wheel
}
