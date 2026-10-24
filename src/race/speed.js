// Driving physics, kept simple but grounded in real F1 numbers: top speed ~295 km/h, about 3 g of
// cornering grip, hard braking and strong traction. With these the lap lands near a real Monaco lap.
const VMAX = 82 // m/s
const LATERAL = 30 // m/s²
const ACCEL = 10 // m/s²
const BRAKE = 38 // m/s²

// Distance along the lap at every sample, and the speed a car can carry there.
export function speedProfile(points) {
  const n = points.length
  const ds = points.map((p, i) => p.distanceTo(points[(i + 1) % n]))
  const dist = [0]
  for (let i = 1; i < n; i++) dist.push(dist[i - 1] + ds[i - 1])
  const length = dist[n - 1] + ds[n - 1]
  // curvature from the heading change over ~12 m, then smoothed
  const heading = points.map((p, i) => {
    const q = points[(i + 1) % n]
    return Math.atan2(q.x - p.x, q.z - p.z)
  })
  // signed: positive when the lap bends towards +X of the car (its left)
  const k = points.map((_, i) => {
    let d = heading[(i + 2) % n] - heading[(i - 1 + n) % n]
    d = Math.atan2(Math.sin(d), Math.cos(d))
    return d / (ds[i] * 3 || 1)
  })
  const ks = k.map((_, i) => {
    let s = 0
    for (let j = -3; j <= 3; j++) s += k[(i + j + n) % n]
    return s / 7
  })
  // Opposite bends in a chicane must not cancel one another when estimating grip.
  // Keep signed smoothing for wheel steering, but use local absolute curvature for
  // speed so cars brake before the tight bend instead of snapping through at straight-line pace.
  const localGrip = heading.map((h, i) => {
    const previous = (i - 1 + n) % n
    const turn = Math.atan2(Math.sin(h - heading[previous]), Math.cos(h - heading[previous]))
    return Math.abs(turn) / ((ds[i] + ds[previous]) / 2 || 1)
  })
  const v = ks.map((c, i) => Math.min(VMAX, Math.sqrt(LATERAL / Math.max(Math.abs(c), localGrip[i], 1e-4))))
  // braking (backwards) and traction (forwards) limits; two laps round so the loop closes cleanly
  for (let pass = 0; pass < 2; pass++) {
    for (let i = n - 1; i >= 0; i--) v[i] = Math.min(v[i], Math.sqrt(v[(i + 1) % n] ** 2 + 2 * BRAKE * ds[i]))
    for (let i = 0; i < n; i++) v[i] = Math.min(v[i], Math.sqrt(v[(i - 1 + n) % n] ** 2 + 2 * ACCEL * ds[(i - 1 + n) % n]))
  }
  const time = ds.reduce((t, d, i) => t + d / ((v[i] + v[(i + 1) % n]) / 2), 0)
  return { dist, length, v, ks, lapTime: time }
}
