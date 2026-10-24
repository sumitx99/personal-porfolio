import * as THREE from 'three'

// A single yaw filter drives both camera position and aim. Independent position,
// aim and body filters used to fight each other and make the car shake on screen.
export class RaceCameraRig {
  constructor() {
    this.yaw = null
    this.back = new THREE.Vector3()
    this.direction = new THREE.Vector3()
    this.goal = new THREE.Vector3()
    this.look = new THREE.Vector3()
  }

  update(camera, car, dt, { mode = 'chase', small = false, boosting = false } = {}) {
    if (mode === 'cockpit') {
      // Rigid onboard mount: cockpit and halo must not swim around as the car
      // turns. The ordered frame pipeline supplies this frame's chassis pose.
      this.goal.set(0, 1.28, -0.25).applyQuaternion(car.quaternion).add(car.position)
      this.look.set(0, 0.35, 5).applyQuaternion(car.quaternion).add(car.position)
      camera.up.set(0, 1, 0).applyQuaternion(car.quaternion)
      camera.position.copy(this.goal)
      camera.lookAt(this.look)
      camera.near = 0.05
      camera.fov = small ? 84 : 60
      camera.updateProjectionMatrix()
      camera.updateMatrixWorld()
      this.direction.set(0, 0, 1).applyQuaternion(car.quaternion)
      this.yaw = Math.atan2(this.direction.x, this.direction.z)
      return
    }
    camera.up.set(0, 1, 0)
    camera.near = 0.3
    this.direction.set(0, 0, 1).applyQuaternion(car.quaternion)
    const target = Math.atan2(this.direction.x, this.direction.z)
    if (this.yaw == null) this.yaw = target
    else {
      const difference = Math.atan2(Math.sin(target - this.yaw), Math.cos(target - this.yaw))
      this.yaw += difference * (1 - Math.exp(-Math.min(dt, 0.05) * 7))
    }
    this.back.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw))
    const distance = mode === 'front' ? (small ? -13 : -11) : mode === 'heli' ? (small ? 34 : 26) : (small ? 8.5 : 6.8)
    const height = mode === 'front' ? (small ? 2.4 : 1.8) : mode === 'heli' ? (small ? 40 : 30) : (small ? 2.8 : 2.3)
    this.goal.copy(car.position).addScaledVector(this.back, distance)
    this.goal.y += height
    this.look.copy(car.position)
    if (mode === 'chase') {
      this.look.addScaledVector(this.back, -6)
      this.look.y += 1
    } else if (mode === 'front') this.look.y += 0.7
    camera.position.copy(this.goal)
    camera.lookAt(this.look)
    const fov = (small ? 49 : 42) + (boosting ? 4 : 0)
    camera.fov = THREE.MathUtils.damp(camera.fov, fov, 4, Math.min(dt, 0.05))
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
  }
}
