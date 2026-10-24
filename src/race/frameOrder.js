// Async model loading must not determine which pose the camera sees. Negative
// priorities order these updates while leaving Fiber's automatic render enabled.
export const RACE_FRAME = Object.freeze({ simulation: -3, pose: -2, camera: -1 })
