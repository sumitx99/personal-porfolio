import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Vector3 } from 'three'
import { RaceEngine } from './engine.js'
import { carsOverlap } from './collision.js'

const lap = JSON.parse(readFileSync(new URL('../data/marina-lap.json', import.meta.url)))
const teams = Array.from({ length: 5 }, (_, i) => ({ id: `car-${i}`, name: `Car ${i}` }))
function race(count = teams.length) {
  const engine = new RaceEngine(lap, teams.slice(0, count), { laps: 20, playerId: teams[0].id })
  engine.start()
  engine.phase = 'race'
  engine.raceStart = 0
  engine.cars.forEach((c, i) => {
    c.pace = 0.98 + i * 0.005
    c.plannedLap = 0
    c.noise = i
    c.total = -6 - i * 8
    c.lane = c.laneTarget = i % 2 ? -2 : 2
    c.compound = 'medium'
    engine.place(c)
  })
  return engine
}
function assertClear(engine) {
  for (let i = 0; i < engine.cars.length; i++) {
    for (let j = i + 1; j < engine.cars.length; j++) {
      assert.ok(!carsOverlap(engine.cars[i], engine.cars[j]), `overlap ${i}/${j} at ${engine.clock.toFixed(3)}s`)
    }
  }
}
function run(engine, seconds, dt = 1 / 30) {
  for (let t = 0; t < seconds; t += dt) {
    if (engine.player().charge >= 1) engine.fireBoost()
    engine.step(dt)
    assertClear(engine)
    engine.cars.forEach((c) => assert.ok(Number.isFinite(c.speed) && c.speed >= 0))
  }
}

test('body checks account for heading and permit side-by-side passing', () => {
  const car = (x, z, fx = 0, fz = 1) => ({ pos: { x, y: 0, z }, look: { x: x + fx, y: 0, z: z + fz } })
  assert.equal(carsOverlap(car(0, 0), car(0, 5)), true)
  assert.equal(carsOverlap(car(0, 0), car(3, 0)), false)
  assert.equal(carsOverlap(car(0, 0), car(3.1, 0, 1, 0)), true)
})

test('road position and heading stay smooth across track sample boundaries', () => {
  const engine = race(1)
  const before = new Vector3()
  const here = new Vector3()
  const after = new Vector3()
  const incoming = new Vector3()
  const outgoing = new Vector3()
  for (const lane of [-3, 0, 3]) {
    for (const s of engine.d) {
      engine.pointAt(s - 0.001, lane, before)
      engine.pointAt(s, lane, here)
      engine.pointAt(s + 0.001, lane, after)
      incoming.subVectors(here, before).normalize()
      outgoing.subVectors(after, here).normalize()
      assert.ok(incoming.angleTo(outgoing) < 0.02, `heading discontinuity at ${s}m, lane ${lane}`)
    }
  }
})

test('survey noise is bounded and pit junctions remain at their original positions', () => {
  const engine = race(1)
  engine.track.forEach((p, i) => assert.ok(Math.hypot(p.x - lap.points[i][0], p.z - lap.points[i][2]) <= 0.800001))
  for (const i of [lap.pit.entry, lap.pit.exit]) {
    assert.equal(engine.track[i].x, lap.points[i][0])
    assert.equal(engine.track[i].z, lap.points[i][2])
  }
})

test('traced straight does not make the car steer left-right repeatedly at speed', () => {
  const engine = race(1)
  const a = new Vector3()
  const b = new Vector3()
  let previous
  let previousTurn
  for (let s = 350; s < 410; s++) {
    engine.pointAt(s, -2, a)
    engine.pointAt(s + 7, -2, b)
    const yaw = Math.atan2(b.x - a.x, b.z - a.z)
    if (previous != null) {
      const turn = Math.atan2(Math.sin(yaw - previous), Math.cos(yaw - previous))
      if (previousTurn != null) assert.ok(Math.abs(turn - previousTurn) < 0.15 * Math.PI / 180)
      previousTurn = turn
    }
    previous = yaw
  }
})

test('chicane speed respects grip even when adjacent bends turn in opposite directions', () => {
  const engine = race(1)
  const points = engine.track
  for (let i = 0; i < points.length; i++) {
    const previous = (i - 1 + points.length) % points.length
    const next = (i + 1) % points.length
    const incoming = points[i].clone().sub(points[previous])
    const outgoing = points[next].clone().sub(points[i])
    const turn = Math.atan2(outgoing.x * incoming.z - outgoing.z * incoming.x, outgoing.x * incoming.x + outgoing.z * incoming.z)
    const curvature = Math.abs(turn) / ((incoming.length() + outgoing.length()) / 2)
    assert.ok(engine.profile.v[i] ** 2 * curvature <= 30.00001, `grip exceeded at point ${i}`)
  }
})

test('chassis heading follows movement through both chicane bends without aiming sideways', () => {
  const engine = race(1)
  const car = engine.player()
  car.lane = car.laneTarget = 0
  const before = new Vector3()
  const after = new Vector3()
  for (let s = 2820; s < 2940; s += 0.5) {
    car.total = s
    engine.place(car)
    engine.pointAt(s - 0.5, 0, before)
    engine.pointAt(s + 0.5, 0, after)
    const motion = Math.atan2(after.x - before.x, after.z - before.z)
    const nose = Math.atan2(car.look.x - car.pos.x, car.look.z - car.pos.z)
    const difference = Math.atan2(Math.sin(nose - motion), Math.cos(nose - motion))
    assert.ok(Math.abs(difference) < Math.PI / 45, 'body must follow its travel direction within four degrees')
  }
})

test('boosted field stays separate through full laps at 4x-sized frame steps', () => {
  const engine = race()
  assertClear(engine)
  run(engine, 400, 0.1)
  engine.cars.forEach((c) => assert.ok(c.total > engine.L, 'all traffic must keep moving'))
})

test('a fast car cannot drive through lapped traffic across the start line', () => {
  const engine = race()
  engine.cars.forEach((c, i) => {
    c.total = engine.L - 9 - i * 12
    c.lane = c.laneTarget = 0
    c.speed = 70
    engine.place(c)
  })
  engine.cars[0].total += engine.L
  engine.player().charge = 1
  assert.equal(engine.forwardGap(engine.cars[1], engine.cars[0]), 12)
  assert.equal(engine.laneBusy(engine.cars[1], 0), false)
  assertClear(engine)
  run(engine, 60, 0.1)
})

test('boost and lane changes stay separate through the tightest chicane', () => {
  const engine = race()
  const corner = engine.profile.ks.reduce((best, k, i, ks) => Math.abs(k) > Math.abs(ks[best]) ? i : best, 0)
  engine.cars.forEach((c, i) => {
    c.total = engine.d[corner] - 50 - i * 12
    c.lane = c.laneTarget = i % 2 ? -3 : 0
    c.speed = 65
    c.boost = 5
    engine.place(c)
  })
  assertClear(engine)
  run(engine, 30, 0.1)
})

test('a boosted car can complete an overtake without intersecting the slower car', () => {
  const engine = race(2)
  engine.cars.forEach((c, i) => {
    c.total = engine.d[49] + (i ? 12 : 0) // long straight, slower car ahead
    c.lane = c.laneTarget = 0
    c.speed = i ? 45 : 60
    c.pace = i ? 0.75 : 1
    engine.place(c)
  })
  engine.player().charge = 1
  assert.equal(engine.fireBoost(), true)
  run(engine, 15, 0.1)
  assert.ok(engine.cars[0].total > engine.cars[1].total + 6.4, 'boost should still allow a completed pass')
})

test('pit entry, stops and rejoining do not overlap race traffic', () => {
  const engine = race()
  engine.cars.forEach((c) => { c.plannedLap = 2 })
  engine.on((type) => { if (type === 'player-box') engine.releasePlayer() })
  engine.requestPit('hard')
  run(engine, 450, 0.1)
  assert.ok(engine.player().stops > 0, 'player must complete the pit stop')
})

test('twelve seeded four-lap races finish without overlap, including boost and pit merges', () => {
  const random = Math.random
  try {
    for (let trial = 1; trial <= 12; trial++) {
      let seed = trial
      Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296)
      const engine = new RaceEngine(lap, teams, { laps: 4, playerId: teams[0].id })
      engine.start()
      engine.on((type) => { if (type === 'player-box') engine.releasePlayer() })
      for (let frame = 0; frame < 7000 && engine.phase !== 'finished'; frame++) {
        if (engine.player().charge >= 1) engine.fireBoost()
        if (engine.player().stops === 0) engine.requestPit('hard')
        engine.step(0.1)
        assertClear(engine)
      }
      assert.equal(engine.phase, 'finished', `seed ${trial} must not leave a traffic jam`)
    }
  } finally {
    Math.random = random
  }
})
