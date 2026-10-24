// The models are 5.5 m long. These envelopes include clearance for wings and tyres.
export const CAR_LENGTH = 6.4
export const CAR_WIDTH = 2.6

// Separating-axis test in road space, including each car's heading through a corner.
// Track distance alone cannot keep wings apart in a chicane or at the lap boundary.
export function carsOverlap(a, b) {
  const dx = b.pos.x - a.pos.x
  const dz = b.pos.z - a.pos.z
  if (Math.abs(b.pos.y - a.pos.y) > 2 || dx * dx + dz * dz >= CAR_LENGTH ** 2 + CAR_WIDTH ** 2) return false
  const heading = (c) => {
    const x = c.look.x - c.pos.x
    const z = c.look.z - c.pos.z
    const length = Math.hypot(x, z) || 1
    return [x / length, z / length]
  }
  const af = heading(a)
  const bf = heading(b)
  const ar = [-af[1], af[0]]
  const br = [-bf[1], bf[0]]
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1]
  for (const axis of [af, ar, bf, br]) {
    const ra = (CAR_LENGTH * Math.abs(dot(af, axis)) + CAR_WIDTH * Math.abs(dot(ar, axis))) / 2
    const rb = (CAR_LENGTH * Math.abs(dot(bf, axis)) + CAR_WIDTH * Math.abs(dot(br, axis))) / 2
    if (Math.abs(dx * axis[0] + dz * axis[1]) >= ra + rb) return false
  }
  return true
}
