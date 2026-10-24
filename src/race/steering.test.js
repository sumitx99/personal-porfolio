import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { RaceEngine } from './engine.js'
import { FrontWheelSteering } from './steering.js'

const lap = JSON.parse(readFileSync(new URL('../data/marina-lap.json', import.meta.url)))
function race() {
  const engine = new RaceEngine(lap, [{ id: 'player' }], { laps: 4, playerId: 'player' })
  engine.start()
  engine.phase = 'race'
  engine.raceStart = 0
  const car = engine.player()
  Object.assign(car, { total: 2800, lane: 0, laneTarget: 0, speed: 30, pace: 1, noise: 0, plannedLap: 0 })
  engine.place(car)
  return engine
}

test('front tyres visibly steer both ways through the real opposing chicane bends', () => {
  const engine = race()
  const car = engine.player()
  const steering = new FrontWheelSteering(engine)
  const angles = []
  for (let s = 2820; s < 2940; s += 25 / 60) {
    car.total = s
    angles.push(steering.update(car, 1 / 60))
  }
  assert.ok(Math.min(...angles) < -0.12, 'first bend must turn front tyres at least seven degrees')
  assert.ok(Math.max(...angles) > 0.07, 'opposing bend must reverse the front tyres')
})

test('visual steering leaves simulation positions, heading, curvature and speed exactly unchanged', () => {
  const baseline = race()
  const animated = race()
  const steering = new FrontWheelSteering(animated)
  for (let frame = 0; frame < 2400; frame++) {
    const dt = frame % 7 === 0 ? 1 / 30 : 1 / 60
    baseline.step(dt)
    animated.step(dt)
    const car = animated.player()
    steering.update(car, dt)
    const old = baseline.player()
    for (const key of ['total', 'lane', 'speed', 'curvature', 'mode']) assert.deepEqual(car[key], old[key], key)
    assert.deepEqual(car.pos.toArray(), old.pos.toArray(), 'body position must be identical')
    assert.deepEqual(car.look.toArray(), old.look.toArray(), 'body heading and camera input must be identical')
  }
})

test('tyre angle stays quiet on the traced straight and has no snaps with uneven frames', () => {
  const engine = race()
  const car = engine.player()
  const steering = new FrontWheelSteering(engine)
  let previous = 0
  for (let s = 280; s < 430; s += 1) {
    car.total = s
    assert.ok(Math.abs(steering.update(car, 1 / 60)) < 0.035, 'straight-line tyre jitter')
  }
  previous = steering.angle
  for (let frame = 0; frame < 1000; frame++) {
    const dt = frame % 7 === 0 ? 1 / 30 : 1 / 60
    car.total = 2820 + frame * 0.4
    const angle = steering.update(car, dt)
    assert.ok(Math.abs(angle - previous) <= 2 * dt + 1e-10, 'steering must not snap')
    previous = angle
  }
})

test('4x playback keeps front steering in phase with 1x through both chicane bends', () => {
  const engine = race()
  const car = engine.player()
  const normal = new FrontWheelSteering(engine)
  const fast = new FrontWheelSteering(engine)
  for (let frame = 1; frame <= 288; frame++) {
    car.total = 2820 + frame * 25 / 60
    const reference = normal.update(car, 1 / 60, 1)
    if (frame % 4 === 0) {
      const actual = fast.update(car, 1 / 60, 4)
      assert.ok(Math.abs(actual - reference) < 0.06, 'fast race playback must not leave front tyres pointing at the previous bend')
    }
  }
})
