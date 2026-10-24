import * as THREE from 'three'

// Visual steering only. The camera, body pose, speed profile and collision
// simulation keep using their existing values; this output only turns tyres.
export class FrontWheelSteering {
  constructor(engine) {
    this.engine = engine
    this.before = new THREE.Vector3()
    this.center = new THREE.Vector3()
    this.after = new THREE.Vector3()
    this.angle = 0
  }

  update(car, dt, playbackSpeed = 1) {
    let target = 0
    if (car.mode === 'track' && car.speed > 0.1) {
      // The body already aims 7 m up the road. Give the tyres a short preview
      // too, so they turn into the corner before the body follows it.
      this.engine.pointAt(car.total + 2, car.lane, this.before)
      this.engine.pointAt(car.total + 6, car.lane, this.center)
      this.engine.pointAt(car.total + 10, car.lane, this.after)
      const ax = this.center.x - this.before.x
      const az = this.center.z - this.before.z
      const bx = this.after.x - this.center.x
      const bz = this.after.z - this.center.z
      const turn = Math.atan2(bx * az - bz * ax, ax * bx + az * bz)
      const distance = (Math.hypot(ax, az) + Math.hypot(bx, bz)) / 2
      const raw = Math.atan(3.6 * turn / Math.max(distance, 0.01))
      // Ignore tiny survey noise on straights and bound the steering lock.
      // A modest visual gain makes steering readable from the race cameras.
      target = Math.sign(raw) * Math.min(0.52, Math.max(0, Math.abs(raw) - 0.01) * 1.7)
    }
    // The race can run at 2x/4x while rendering at the same frame rate. Keep
    // tyre response on that race clock so the body cannot outrun its steering.
    const frame = Math.max(0, Math.min(Math.min(dt, 0.05) * playbackSpeed, 0.1))
    const change = (target - this.angle) * (1 - Math.exp(-frame * 16))
    this.angle += THREE.MathUtils.clamp(change, -2 * frame, 2 * frame)
    return this.angle
  }
}

// Ackermann steering: the inside front tyre turns further than the outside one.
// Keep the rear pivots and every body/camera transform out of this operation.
export function steerFrontWheels(wheels, angle) {
  const front = wheels.filter((wheel) => wheel.front)
  const rear = wheels.filter((wheel) => !wheel.front)
  if (front.length !== 2 || rear.length !== 2) return
  const wheelbase = Math.abs((front[0].base.z + front[1].base.z - rear[0].base.z - rear[1].base.z) / 2)
  const radius = wheelbase / Math.tan(Math.abs(angle) || 1e-10)
  const sign = Math.sign(angle)
  for (const wheel of front) {
    const inside = wheel.side === sign
    wheel.pivot.rotation.y = sign * Math.atan(wheelbase / Math.max(0.1, radius + (inside ? -1 : 1) * Math.abs(wheel.base.x)))
  }
}
