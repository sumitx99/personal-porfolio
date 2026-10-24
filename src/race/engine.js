import * as THREE from 'three'
import { speedProfile } from './speed.js'
import { CAR_LENGTH, CAR_WIDTH, carsOverlap } from './collision.js'

// A small race simulation for the Garage: grid start behind five red lights, a set number of laps,
// pit stops, tyre wear and simple overtaking. It only does the maths; the race scene reads car poses
// every frame and the page polls `snapshot()` for the timing tower.

const PIT_LIMIT = 22 // m/s, 80 km/h
const ACCEL = 10 // m/s², traction-limited
const BRAKE = 30 // m/s²
const LANE = 3 // metres between lanes on a 12 m wide track
const GRID_GAP = 8 // metres between grid slots
const BOX_GAP = 16 // metres between neighbouring teams' boxes
const STOP_TIME = [2.2, 3.2] // seconds a rival spends stationary in its box
const LOOK_AHEAD = 7 // metres up the road a car aims at
// Boost, like an overtake mode: the battery fills over ~25 s of racing, then gives 5 s of extra pace.
const NO_STOP_PENALTY = 25 // seconds added for finishing without a pit stop
const BOOST_CHARGE = 25 // seconds to fill
const BOOST_TIME = 5 // seconds it lasts
const BOOST_PACE = 1.12 // speed multiplier while it runs
const BOOST_ACCEL = 1.6 // and a harder shove out of corners
const RIVAL_BOOST_PACE = 1.05 // rivals' boost is milder, so the player's is the one that wins places
const TOW = 25 // metres behind another car where its slipstream helps
const TOW_PACE = 1.02

// Grip and wear per compound: speed multiplier on fresh tyres, and how much is lost per lap.
export const TYRE_MODEL = {
  soft: { pace: 1, wear: 0.009 },
  medium: { pace: 0.993, wear: 0.005 },
  hard: { pace: 0.986, wear: 0.003 },
  wet: { pace: 0.94, wear: 0.003 },
}

const rand = (a, b) => a + Math.random() * (b - a)
const wrap = (s, L) => ((s % L) + L) % L

function cumulative(points, closed) {
  const d = [0]
  for (let i = 1; i < points.length; i++) d.push(d[i - 1] + points[i].distanceTo(points[i - 1]))
  const length = closed ? d[d.length - 1] + points[points.length - 1].distanceTo(points[0]) : d[d.length - 1]
  return { d, length }
}

// index of the segment containing distance s
function seek(d, s) {
  let lo = 0
  let hi = d.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (d[mid] <= s) lo = mid
    else hi = mid - 1
  }
  return lo
}

// Moving average over ~36 m of road, a few passes, so the ride height follows the road without bumps.
function smoothHeights(points, closed, radius = 4, passes = 3) {
  const n = points.length
  for (let pass = 0; pass < passes; pass++) {
    const ys = points.map((p) => p.y)
    for (let i = 0; i < n; i++) {
      let sum = 0
      let count = 0
      for (let k = -radius; k <= radius; k++) {
        const j = closed ? (i + k + n) % n : i + k
        if (j < 0 || j >= n) continue
        sum += ys[j]
        count++
      }
      points[i].y = sum / count
    }
  }
}

// The mesh trace includes small left-right bumps even on straights. Interpolating
// them exactly made cars repeatedly steer into and out of a bend that isn't there.
// Filter that survey noise, bounded to 0.8 m and anchored at both pit junctions.
function smoothRacingLine(points, anchors) {
  const original = points.map((p) => p.clone())
  const n = points.length
  const weights = [1, 4, 6, 4, 1]
  for (let pass = 0; pass < 4; pass++) {
    const source = points.map((p) => p.clone())
    points.forEach((p, i) => {
      p.x = p.z = 0
      for (let k = -2; k <= 2; k++) {
        const q = source[(i + k + n) % n]
        p.x += q.x * weights[k + 2] / 16
        p.z += q.z * weights[k + 2] / 16
      }
    })
  }
  points.forEach((p, i) => {
    const dx = p.x - original[i].x
    const dz = p.z - original[i].z
    const distance = Math.hypot(dx, dz)
    const junction = Math.min(...anchors.map((a) => Math.min((i - a + n) % n, (a - i + n) % n)))
    const blend = Math.min(1, 0.8 / (distance || 1)) * Math.min(1, junction / 4)
    p.x = original[i].x + dx * blend
    p.z = original[i].z + dz * blend
  })
}

export class RaceEngine {
  constructor(lapData, teams, { laps = 4, playerId } = {}) {
    this.laps = laps
    this.track = lapData.points.map(([x, y, z]) => new THREE.Vector3(x, y, z))
    this.pitPts = lapData.pit.points.map(([x, y, z]) => new THREE.Vector3(x, y, z))
    // the traced heights carry a little mesh noise; a few smoothing passes keep the cars level
    smoothHeights(this.track, true)
    smoothHeights(this.pitPts, false)
    smoothRacingLine(this.track, [lapData.pit.entry, lapData.pit.exit])
    // Continuous tangents prevent visible heading snaps at the traced road samples.
    // Use the very same curve for physics and rendering, including collision envelopes.
    this.line = new THREE.CatmullRomCurve3(this.track, true, 'catmullrom', 0.5)
    this.pitLine = new THREE.CatmullRomCurve3(this.pitPts, false, 'catmullrom', 0.5)
    this.tangent = new THREE.Vector3()
    this.tangentBefore = new THREE.Vector3()
    this.tangentAfter = new THREE.Vector3()
    this.poseBehind = new THREE.Vector3()
    this.poseAhead = new THREE.Vector3()
    const t = cumulative(this.track, true)
    this.d = t.d
    this.L = t.length
    const p = cumulative(this.pitPts, false)
    this.pd = p.d
    this.pitLength = p.length
    this.entryS = this.d[lapData.pit.entry]
    this.exitS = this.d[lapData.pit.exit]
    this.pitSpan = this.L - this.entryS + this.exitS // lap distance the pit lane replaces
    this.boxS = this.pd[lapData.pit.box]
    this.profile = speedProfile(this.track)
    this.teams = teams
    this.playerId = playerId
    this.listeners = new Set()
    this.reset()
  }

  on(fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  emit(type, data) {
    this.listeners.forEach((fn) => fn(type, data))
  }

  setPlayer(id) {
    this.playerId = id
    this.cars.forEach((c) => (c.player = c.team.id === id))
  }

  // Everyone parked in their own pit box, nobody moving.
  reset() {
    this.phase = 'garage'
    this.clock = 0
    this.lights = 0
    this.raceStart = null
    this.cars = this.teams.map((team, i) => ({
      team,
      player: team.id === this.playerId,
      mode: 'pit', // 'pit' | 'track'
      box: this.boxS + (i - Math.floor(this.teams.length / 2)) * BOX_GAP,
      pitS: 0,
      total: 0,
      lane: 0,
      laneTarget: 0,
      laneHold: 0,
      speed: 0,
      pace: 1,
      compound: 'medium',
      nextCompound: 'hard',
      tyreAge: 0,
      stops: 0,
      plannedLap: 0,
      pitRequest: false,
      stopDone: false,
      waiting: false,
      stopLeft: 0,
      laps: [],
      lapStart: 0,
      finishedAt: null,
      noise: rand(0, Math.PI * 2),
      charge: 0,
      boost: 0,
      pos: new THREE.Vector3(),
      look: new THREE.Vector3(),
      curvature: 0,
      braking: false,
    }))
    this.cars.forEach((c) => {
      c.pitS = c.box
      this.place(c)
    })
  }

  // Line up on the grid in a random order and run the light sequence. The player starts on the
  // compound picked in the garage; rivals pick soft or medium and plan one stop for hards.
  start(playerCompound = 'medium') {
    const order = [...this.cars].sort(() => Math.random() - 0.5)
    order.forEach((c, k) => {
      c.mode = 'track'
      c.total = -(6 + k * GRID_GAP)
      c.lane = c.laneTarget = k % 2 ? -LANE / 1.5 : LANE / 1.5
      c.speed = 0
      c.laneHold = 0
      c.pace = rand(0.975, 1)
      c.compound = c.player ? playerCompound : Math.random() < 0.5 ? 'soft' : 'medium'
      c.nextCompound = 'hard'
      c.tyreAge = 0
      c.stops = 0
      c.plannedLap = c.player ? 0 : Math.random() < 0.5 ? 2 : 3
      c.pitRequest = false
      c.waiting = false
      c.laps = []
      c.finishedAt = null
      c.charge = 0
      c.boost = 0
      this.place(c)
    })
    this.phase = 'lights'
    this.clock = 0
    this.lightsOut = 5 + rand(0.4, 1.2)
  }

  // Ask the player's car to box at the next pit entry, for the given compound.
  requestPit(compound) {
    const c = this.cars.find((x) => x.player)
    if (!c || this.phase !== 'race' || c.finishedAt != null) return false
    c.pitRequest = true
    c.nextCompound = compound
    return true
  }

  // Fire the player's boost when the battery is full.
  fireBoost() {
    const c = this.player()
    if (!c || this.phase !== 'race' || c.mode !== 'track' || c.finishedAt != null || c.charge < 1) return false
    c.charge = 0
    c.boost = BOOST_TIME
    this.emit('boost', c)
    return true
  }

  // The crew finished the player's stop: fit the tyres and send the car on its way.
  releasePlayer() {
    const c = this.cars.find((x) => x.player)
    if (!c?.waiting) return
    c.waiting = false
    c.stopDone = true
    c.compound = c.nextCompound
    c.tyreAge = 0
    c.stops++
    c.pitRequest = false
  }

  place(c) {
    if (c.mode === 'pit') {
      const s = THREE.MathUtils.clamp(c.pitS, 0, this.pitLength)
      const i = Math.min(seek(this.pd, s), this.pitPts.length - 2)
      const t = (s - this.pd[i]) / (this.pd[i + 1] - this.pd[i] || 1)
      this.pitLine.getPoint((i + t) / (this.pitPts.length - 1), c.pos)
      const s2 = Math.min(s + LOOK_AHEAD, this.pitLength - 0.01)
      const i2 = Math.min(seek(this.pd, s2), this.pitPts.length - 2)
      const t2 = (s2 - this.pd[i2]) / (this.pd[i2 + 1] - this.pd[i2] || 1)
      this.pitLine.getPoint((i2 + t2) / (this.pitPts.length - 1), c.look)
      c.curvature = 0
      return
    }
    const s = wrap(c.total, this.L)
    const n = this.track.length
    const i = seek(this.d, s)
    const j = (i + 1) % n
    const seg = (j === 0 ? this.L : this.d[j]) - this.d[i]
    const t = seg ? (s - this.d[i]) / seg : 0
    this.pointAt(s, c.lane, c.pos)
    // Orient the chassis along the road beneath it. A one-sided 7 m look-ahead
    // turned the nose into a corner before the car arrived, creating visible
    // sideways sliding. A centred chord keeps the same smooth sampling span.
    this.pointAt(s - LOOK_AHEAD / 2, c.lane, this.poseBehind)
    this.pointAt(s + LOOK_AHEAD / 2, c.lane, this.poseAhead)
    c.look.copy(c.pos).add(this.poseAhead).sub(this.poseBehind)
    c.curvature = this.profile.ks[i] + (this.profile.ks[j] - this.profile.ks[i]) * t
  }

  // Point at lap distance s, `lane` metres to the left of the line, interpolated between samples.
  pointAt(s, lane, out) {
    s = wrap(s, this.L)
    const n = this.track.length
    const i = seek(this.d, s)
    const j = (i + 1) % n
    const seg = (j === 0 ? this.L : this.d[j]) - this.d[i]
    const t = seg ? (s - this.d[i]) / seg : 0
    const u = (i + t) / n
    this.line.getPoint(u, out)
    // A short, wrapped chord keeps lane normals continuous too. Raw curve curvature
    // changes at knots; offsetting along that instantaneous normal reintroduced yaw
    // jumps for cars outside the centre lane, especially across the lap seam.
    this.line.getPoint(wrap(u - 0.5 / n, 1), this.tangentBefore)
    this.line.getPoint(wrap(u + 0.5 / n, 1), this.tangentAfter)
    this.tangent.subVectors(this.tangentAfter, this.tangentBefore)
    const len = Math.hypot(this.tangent.x, this.tangent.z) || 1
    out.x -= (this.tangent.z / len) * lane
    out.z += (this.tangent.x / len) * lane
    return out
  }

  trackSpeed(c) {
    const i = seek(this.d, wrap(c.total, this.L))
    const tyre = TYRE_MODEL[c.compound] || TYRE_MODEL.medium
    const grip = tyre.pace * (1 - Math.min(c.tyreAge, 6) * tyre.wear)
    const wobble = 1 + Math.sin(this.clock * 0.3 + c.noise) * 0.004
    const ahead = this.nearestAhead(c)
    const tow = ahead && this.forwardGap(c, ahead) < TOW ? TOW_PACE : 1
    return this.profile.v[i] * c.pace * grip * wobble * tow * (c.boost > 0 ? (c.player ? BOOST_PACE : RIVAL_BOOST_PACE) : 1)
  }

  lapOf(c) {
    return Math.floor(c.total / this.L)
  }

  step(dt) {
    // Small physics steps prevent boost / 4x playback from skipping through another car.
    let remaining = Math.max(0, Math.min(dt, 0.1))
    while (remaining > 1e-8) {
      const tick = Math.min(remaining, 1 / 120)
      this.tick(tick)
      remaining -= tick
    }
  }

  tick(dt) {
    if (this.phase === 'garage') return
    dt = Math.min(dt, 0.1)
    this.clock += dt
    if (this.phase === 'lights') {
      this.lights = Math.min(5, Math.floor(this.clock) + 1)
      if (this.clock >= this.lightsOut) {
        this.phase = 'race'
        this.lights = 0
        this.raceStart = this.clock
        this.cars.forEach((c) => (c.lapStart = this.clock))
        this.emit('go')
      }
      return
    }
    // Leaders move first; followers can then use the space they have actually vacated.
    for (const c of [...this.cars].sort((a, b) => b.total - a.total)) {
      this.stepBoost(c, dt)
      if (c.mode === 'pit') this.stepPit(c, dt)
      else this.stepTrack(c, dt)
      this.place(c)
    }
    if (this.phase === 'race' && this.cars.every((c) => c.finishedAt != null)) {
      this.phase = 'finished'
      this.emit('finished')
    }
  }

  stepBoost(c, dt) {
    if (c.finishedAt != null) {
      c.boost = 0
      return
    }
    if (c.boost > 0) c.boost = Math.max(0, c.boost - dt)
    else if (c.mode === 'track') c.charge = Math.min(1, c.charge + dt / BOOST_CHARGE)
    // rivals use theirs like DRS: when they're close behind someone on the straight-ish bits
    if (!c.player && c.charge >= 1 && c.mode === 'track') {
      const ahead = this.nearestAhead(c)
      const chasing = ahead && this.forwardGap(c, ahead) < 30
      // close behind someone, or now and then on a fast stretch, like a driver choosing their moment
      if ((chasing || Math.random() < dt * 0.03) && this.trackSpeed(c) > 50) {
        c.charge = 0
        c.boost = BOOST_TIME
      }
    }
  }

  stepPit(c, dt) {
    const startS = c.pitS
    const startSpeed = c.speed
    let target = PIT_LIMIT
    if (!c.stopDone) {
      const toBox = c.box - c.pitS
      target = Math.min(target, Math.sqrt(Math.max(0, 2 * 8 * toBox)))
      if (toBox <= 0.3) {
        c.speed = 0
        if (c.player) {
          // the garage crew takes over; the car waits until releasePlayer()
          if (!c.waiting) {
            c.waiting = true
            this.emit('player-box', c)
          }
          return
        }
        if (c.stopLeft <= 0) c.stopLeft = rand(...STOP_TIME)
        c.stopLeft -= dt
        if (c.stopLeft <= 0) {
          c.stopDone = true
          c.compound = c.nextCompound
          c.tyreAge = 0
          c.stops++
        }
        return
      }
    }
    c.speed = c.speed > target ? Math.max(target, c.speed - BRAKE * dt) : Math.min(target, c.speed + ACCEL * dt)
    c.pitS += c.speed * dt
    this.place(c)
    if (this.cars.some((o) => o !== c && carsOverlap(c, o))) {
      const endS = c.pitS
      let safe = 0
      let blocked = 1
      for (let i = 0; i < 12; i++) {
        const t = (safe + blocked) / 2
        c.pitS = startS + (endS - startS) * t
        this.place(c)
        if (this.cars.some((o) => o !== c && carsOverlap(c, o))) blocked = t
        else safe = t
      }
      c.pitS = startS + (endS - startS) * safe
      c.speed = Math.min(c.speed, (c.pitS - startS) / dt)
    }
    c.braking = c.speed < startSpeed - dt * 2
    // the pit lane runs across the start line, so the lap count keeps ticking in there
    c.total = c.pitEntryTotal + (Math.min(c.pitS, this.pitLength) / this.pitLength) * this.pitSpan
    this.checkLap(c)
    if (c.pitS >= this.pitLength) {
      c.mode = 'track'
      c.total = c.pitEntryTotal + this.pitSpan
      c.lane = c.laneTarget = -LANE
      this.place(c)
      if (this.cars.some((o) => o !== c && carsOverlap(c, o))) {
        c.mode = 'pit'
        c.speed = 0
        this.place(c)
      }
    }
  }

  stepTrack(c, dt) {
    const startTotal = c.total
    const startLane = c.lane
    const startSpeed = c.speed
    let target = this.trackSpeed(c)
    if (c.finishedAt != null) {
      // cool-down lap: ease off and keep to the side so the others can get by
      target *= 0.45
      c.laneTarget = LANE
    }
    const ahead = c.finishedAt == null ? this.nearestAhead(c) : null
    if (ahead && this.clock >= c.laneHold) {
      const gap = this.forwardGap(c, ahead)
      const sameLane = Math.abs(ahead.lane - c.lane) < LANE * 0.8
      // with boost on, pull out early and squeeze past like a DRS pass; only cars alongside or ahead block the move
      const boosting = c.boost > 0
      if (gap < (boosting ? 30 : 18) && sameLane) {
        const free = [-LANE, 0, LANE].filter((l) => Math.abs(l - ahead.lane) >= LANE * 0.9 && !this.laneBusy(c, l))
        if (free.length && target > ahead.speed) c.laneTarget = free.sort((a, b) => Math.abs(a - c.lane) - Math.abs(b - c.lane))[0]
        else if (gap < (boosting ? 5 : 9)) target = Math.min(target, ahead.speed)
      }
    } else if (!ahead && c.finishedAt == null && this.clock >= c.laneHold && !this.laneBusy(c, 0)) {
      c.laneTarget = 0 // back on the racing line when the road ahead is clear
    }
    // never run into the car in front in this lane: only as fast as lets us stop behind it
    const blocker = c.finishedAt == null ? this.blockerAhead(c) : null
    if (blocker) target = Math.min(target, blocker.speed + Math.sqrt(2 * BRAKE * 0.6 * Math.max(0, this.forwardGap(c, blocker) - CAR_LENGTH)))
    const push = c.boost > 0 && c.player ? ACCEL * BOOST_ACCEL : ACCEL
    c.speed = c.speed > target ? Math.max(target, c.speed - BRAKE * dt) : Math.min(target, c.speed + push * dt)
    // Check the lateral sweep separately. A blocked merge must not stop a car that can
    // safely keep driving in its current lane (especially beside lapped traffic).
    const lane = c.lane + (c.laneTarget - c.lane) * Math.min(1, dt * 1.6)
    c.lane = lane
    this.place(c)
    if (this.cars.some((o) => o !== c && carsOverlap(c, o))) c.lane = startLane
    const before = wrap(c.total, this.L)
    c.total += c.speed * dt
    this.place(c)
    if (this.cars.some((o) => o !== c && carsOverlap(c, o))) {
      const endTotal = c.total
      const intendedLane = c.lane
      const obstacle = this.cars.find((o) => o !== c && carsOverlap(c, o))
      const away = Math.sign(c.lane - obstacle.lane) || Math.sign(c.lane) || 1
      let cleared = false
      // Leave a little room at either edge of the 12 m road for cars to give each other
      // space as their headings change. Without this, two safe envelopes can wedge
      // side by side at a corner even though neither car has actually hit the other.
      for (const side of [away, -away]) {
        c.total = endTotal
        c.lane = THREE.MathUtils.clamp(startLane + side * dt * 2, -4, 4)
        this.place(c)
        if (!this.cars.some((o) => o !== c && carsOverlap(c, o))) {
          c.laneTarget = c.lane
          c.laneHold = this.clock + 0.6
          cleared = true
          break
        }
      }
      if (!cleared) {
        // Accept only the safe part of the forward move. This also catches angled
        // cars in chicanes, lapped cars and traffic leaving the pit lane.
        c.lane = intendedLane
        let safe = 0
        let blocked = 1
        for (let i = 0; i < 12; i++) {
          const t = (safe + blocked) / 2
          c.total = startTotal + (endTotal - startTotal) * t
          this.place(c)
          if (this.cars.some((o) => o !== c && carsOverlap(c, o))) blocked = t
          else safe = t
        }
        c.total = startTotal + (endTotal - startTotal) * safe
        c.speed = Math.min(c.speed, (c.total - startTotal) / dt)
        this.place(c)
      }
    }
    c.braking = c.speed < startSpeed - dt * 2
    this.checkLap(c)
    if (c.total >= this.laps * this.L && c.finishedAt == null) {
      // like the real rules: at least one pit stop in a dry race, or a time penalty
      c.penalty = c.stops === 0 ? NO_STOP_PENALTY : 0
      c.finishedAt = this.clock - this.raceStart + c.penalty
      this.emit('car-finished', c)
    }
    // into the pit lane: rivals on their planned lap, the player when asked
    const now = wrap(c.total, this.L)
    const crossing = before < this.entryS && now >= this.entryS
    const wants = c.player ? c.pitRequest : c.stops === 0 && c.plannedLap > 0 && this.lapOf(c) + 1 >= c.plannedLap
    if (crossing && wants && c.finishedAt == null && this.lapOf(c) + 1 < this.laps) {
      const entryTotal = c.total
      const entryLane = c.lane
      c.mode = 'pit'
      c.pitS = 0
      c.stopLeft = 0
      c.stopDone = false
      c.pitEntryTotal = c.total
      this.place(c)
      if (this.cars.some((o) => o !== c && carsOverlap(c, o))) {
        // The entry is occupied: stay on the road and try again next lap. Stopping
        // across both racing lanes would trap the very car we need to give way to.
        c.mode = 'track'
        c.total = entryTotal
        c.lane = entryLane
        this.place(c)
        return
      }
      this.emit('pit-entry', c)
    }
  }

  checkLap(c) {
    const done = Math.floor(c.total / this.L)
    while (done >= 1 && c.laps.length < done) {
      c.laps.push(this.clock - c.lapStart)
      c.lapStart = this.clock
      c.tyreAge += 1
    }
  }

  nearestAhead(c) {
    let best = null
    for (const o of this.cars) {
      if (o === c || o.mode === 'pit' || o.finishedAt != null) continue
      const gap = this.forwardGap(c, o)
      if (gap > 0 && gap < 40 && (!best || gap < this.forwardGap(c, best))) best = o
    }
    return best
  }

  // The closest car ahead that's in our lane (or half in it): the one we could hit.
  blockerAhead(c) {
    let best = null
    for (const o of this.cars) {
      if (o === c || o.mode !== 'track') continue
      const gap = this.forwardGap(c, o)
      if (gap > 0 && gap < 60 && Math.abs(o.lane - c.lane) < CAR_WIDTH && (!best || gap < this.forwardGap(c, best))) best = o
    }
    return best
  }

  forwardGap(c, other) {
    return wrap(other.total - c.total, this.L)
  }

  roadGap(c, other) {
    return wrap(other.total - c.total + this.L / 2, this.L) - this.L / 2
  }

  laneBusy(c, lane) {
    return this.cars.some(
      (o) => o !== c && o.mode === 'track' && Math.abs(this.roadGap(c, o)) < 10 && Math.abs(o.lane - lane) < CAR_WIDTH,
    )
  }

  player() {
    return this.cars.find((c) => c.player)
  }

  // Timing tower: running order, gaps, laps, tyres and who's in the pits.
  snapshot() {
    const order = [...this.cars].sort((a, b) => {
      if (a.finishedAt != null && b.finishedAt != null) return a.finishedAt - b.finishedAt
      if (a.finishedAt != null) return -1
      if (b.finishedAt != null) return 1
      return b.total - a.total
    })
    const leader = order[0]
    const p = this.player()
    // the car directly in front of the player on the road and how far back the player is, in seconds
    const front = p && p.finishedAt == null ? order[order.indexOf(p) - 1] : null
    return {
      phase: this.phase,
      lights: this.lights,
      laps: this.laps,
      time: this.raceStart != null ? this.clock - this.raceStart : 0,
      player: p && {
        lap: Math.min(this.laps, Math.max(1, this.lapOf(p) + 1)),
        position: order.indexOf(p) + 1,
        speed: Math.round(p.speed * 3.6),
        compound: p.compound,
        tyreAge: p.tyreAge,
        pitRequest: p.pitRequest,
        inPit: p.mode === 'pit' && this.phase !== 'garage',
        waiting: p.waiting,
        finishedAt: p.finishedAt,
        charge: p.charge,
        boost: p.boost,
        boostTime: BOOST_TIME,
        ahead: front && front.finishedAt == null ? { name: front.team.name, gap: (front.total - p.total) / Math.max(20, p.speed || 40) } : null,
      },
      rows: order.map((c, k) => ({
        id: c.team.id,
        name: c.team.name,
        color: c.team.color,
        player: c.player,
        compound: c.compound,
        lap: Math.min(this.laps, Math.max(1, this.lapOf(c) + 1)),
        inPit: c.mode === 'pit' && this.phase !== 'garage',
        stops: c.stops,
        boosting: c.boost > 0,
        finishedAt: c.finishedAt,
        penalty: c.penalty || 0,
        best: c.laps.length ? Math.min(...c.laps) : null,
        gap: k === 0 ? null : c.finishedAt != null && leader.finishedAt != null ? c.finishedAt - leader.finishedAt : (leader.total - c.total) / Math.max(20, c.speed || 40),
      })),
    }
  }
}
