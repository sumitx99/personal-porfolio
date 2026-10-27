import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import F1Garage, { APPROACH } from '../components/F1Garage'
import { PageHead } from '../components/SectionHead'
import { useIsSmall } from '../hooks'
import { COMPOUNDS, PAINTS, TEAMS } from '../f1'
import { RaceEngine } from '../race/engine'
import lapData from '../data/marina-lap.json'

const MarinaScene = lazy(() => import('../components/MarinaScene'))

const LAPS = 4
const CAMERAS = [
  ['chase', 'Chase'],
  ['cockpit', 'Cockpit'],
  ['front', 'Front'],
  ['heli', 'Heli'],
]
const SPEEDS = [1, 2, 4]
const MODES = [
  ['garage', 'Garage'],
  ['race', 'Race'],
]
const ready = TEAMS.filter((t) => t.file)

const fmtTime = (s) => (s == null ? '—' : `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`)
const fmtGap = (g) => (g == null ? 'Leader' : `+${g.toFixed(1)}s`)

export default function Garage() {
  const small = useIsSmall()
  const [teamId, setTeamId] = useState('ferrari')
  const [paint, setPaint] = useState(null)
  const [compound, setCompound] = useState('medium')
  const [pending, setPending] = useState(null)
  const [pitStart, setPitStart] = useState(null)
  const [radio, setRadio] = useState('Car’s in the garage. Pick a tyre and paint, then try a pit stop or go racing.')
  // garage: the car parked for setup (tyre changes happen right there); race: the race, with pit stops from the race bar
  const [mode, setMode] = useState('garage')
  const [last, setLast] = useState(null)
  const [best, setBest] = useState(null)
  const [stops, setStops] = useState(0)
  const [autoRotate, setAutoRotate] = useState(true)
  const clock = useRef(null)

  // Race state. The engine steps in its own loop, so the race carries on while the garage view
  // shows the player's pit stop.
  const engine = useRef(null)
  const [view, setView] = useState('garage') // 'garage' | 'race'
  const [race, setRace] = useState(null) // latest snapshot for the UI
  const [camera, setCamera] = useState('chase')
  const [speed, setSpeed] = useState(1)
  const [nextTyre, setNextTyre] = useState('hard')
  const crewCall = useRef(false) // the player's car is waiting in the box for the garage crew
  const viewRef = useRef('garage')
  viewRef.current = view

  const team = TEAMS.find((t) => t.id === teamId)
  const inPit = pitStart != null
  const racing = race != null && race.phase !== 'garage' && race.phase !== 'finished'

  const pickTeam = (t) => {
    if (!t.file || inPit || racing) return
    setTeamId(t.id)
    setPaint(null)
    setRadio(`${t.name} ${t.car} rolled out. Radio check, loud and clear.`)
  }

  // In the garage the crew swaps all four wheels where the car stands.
  const boxBox = (next) => {
    if (inPit || next === compound || !clock.current) return
    setPending(next)
    setPitStart(clock.current.elapsedTime)
    setRadio(`Crew out — fitting ${COMPOUNDS[next].label.toLowerCase()}s.`)
  }

  const onWheelSwap = useCallback(() => {
    setCompound((c) => pending || c)
  }, [pending])

  const onPitDone = useCallback(() => {
    // The animation runs at a fixed pace; the "stop time" adds a little human variance for fun.
    const time = +(1.85 + Math.random() * 0.75).toFixed(2)
    setLast(time)
    setBest((b) => (b == null || time < b ? time : b))
    setStops((n) => n + 1)
    setRadio(`Go, go, go! ${time.toFixed(2)}s stop. ${COMPOUNDS[pending]?.label ?? ''} tyres fitted.`)
    setPending(null)
    setPitStart(null)
    if (crewCall.current) {
      // back out on track: the race view takes over again
      crewCall.current = false
      engine.current?.releasePlayer()
      setView('race')
    }
  }, [pending])

  // Step the race every animation frame whichever view is on screen; refresh the tower ~5x a second.
  useEffect(() => {
    let id
    let lastT = performance.now()
    let lastUi = 0
    const tick = (t) => {
      const dt = (t - lastT) / 1000
      lastT = t
      const e = engine.current
      if (e) {
        // the race view steps the engine in its own render loop; here only while it is hidden
        if (viewRef.current !== 'race') e.step(dt * speed)
        if (t - lastUi > 200) {
          lastUi = t
          setRace(e.snapshot())
        }
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [speed])

  const startRace = () => {
    // Every available garage team joins the grid, including the selected player.
    const e = new RaceEngine(lapData, ready, { laps: LAPS, playerId: teamId })
    e.on((type, car) => {
      if (type === 'go') setRadio('Lights out and away we go!')
      if (type === 'pit-entry' && car.player) setRadio(`In the pit lane. Limiter on, crew ready with ${COMPOUNDS[car.nextCompound].label.toLowerCase()}s.`)
      if (type === 'player-box') {
        // hand over to the real pit crew in the garage view
        crewCall.current = true
        setPending(car.nextCompound)
        setView('garage')
        setRadio(`Box, box! Crew out — fitting ${COMPOUNDS[car.nextCompound].label.toLowerCase()}s.`)
      }
      if (type === 'car-finished' && car.player)
        setRadio(
          car.penalty
            ? `Chequered flag, but no pit stop: +${car.penalty}s penalty. Classified P${e.snapshot().rows.findIndex((r) => r.player) + 1}.`
            : `Chequered flag! That's P${e.snapshot().rows.findIndex((r) => r.player) + 1}.`,
        )
    })
    e.start(compound)
    engine.current = e
    if (import.meta.env.DEV) window.__race = e
    setRace(e.snapshot())
    setNextTyre(compound === 'hard' ? 'medium' : 'hard')
    setView('race')
    setRadio('On the grid. Watch the lights…')
  }

  // When the garage view comes up for a race stop, start the crew animation once its clock exists.
  useEffect(() => {
    if (view !== 'garage' || !crewCall.current || pitStart != null) return
    let id
    const wait = () => {
      if (clock.current) setPitStart(clock.current.elapsedTime + APPROACH)
      else id = requestAnimationFrame(wait)
    }
    wait()
    return () => cancelAnimationFrame(id)
  }, [view, pitStart])

  const requestPit = () => {
    if (engine.current?.requestPit(nextTyre)) setRadio(`Box this lap, box this lap. ${COMPOUNDS[nextTyre].label} tyres ready.`)
  }

  const boost = useCallback(() => {
    if (engine.current?.fireBoost()) setRadio('Boost on! Full power for five seconds.')
  }, [])

  // keyboard: B fires the boost during a race
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() === 'b' && !e.repeat && !/input|textarea/i.test(e.target.tagName)) boost()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [boost])

  const endRace = () => {
    engine.current = null
    crewCall.current = false
    setRace(null)
    setView('garage')
    setPitStart(null)
    setPending(null)
  }

  // The three mode buttons. Leaving a race ends it; picking Race starts a fresh one.
  const switchMode = (next) => {
    if (engine.current) endRace()
    else if (inPit) {
      setPitStart(null)
      setPending(null)
    }
    setMode(next)
    if (next === 'garage') setRadio('Back in the garage. Pick a tyre and paint, or head out again.')
    if (next === 'race') startRace()
  }

  const player = race?.player
  const raceOn = race != null && race.phase !== 'garage'

  return (
    <div className="page garage-page">
      <PageHead
        eyebrow="Fun zone · drag to look around"
        title="Garage"
        intro={`Pick a 2026 car, repaint it and call the crew in for a tyre change, or take it racing: four laps at Marina Bay against all ${ready.length - 1} rival teams, under the lights.`}
      />

      <div className="garage">
        <div className="garage-stage" data-lenis-prevent-wheel>
          {view === 'garage' || !engine.current ? (
            <F1Garage
              team={team}
              paint={paint}
              compound={compound}
              pitStart={pitStart}
              onPitDone={onPitDone}
              onWheelSwap={onWheelSwap}
              autoRotate={autoRotate && !inPit && mode === 'garage'}
              clockRef={clock}
              small={small}
              driveThrough={crewCall.current}
              pitCam={crewCall.current}
            />
          ) : (
            <Suspense fallback={<div className="skeleton" aria-hidden="true" />}>
              <MarinaScene engine={engine.current} cameraMode={camera} small={small} speed={speed} />
            </Suspense>
          )}
          <div className={`radio ${inPit || racing ? 'live' : ''}`} aria-live="polite">
            <span className="radio-tag">
              <span className="dot" /> Team radio · {team.name}
            </span>
            <p>{radio}</p>
          </div>

          {raceOn ? (
            <>
              <ol className="tower" aria-label="Race order">
                <li className="tower-head">
                  {race.phase === 'finished' ? 'Final' : `Lap ${player?.lap ?? 1}/${race.laps}`} · {fmtTime(race.time)}
                </li>
                {race.rows.map((r, k) => (
                  <li key={r.id} className={r.player ? 'me' : ''} style={{ '--c': r.color }}>
                    <b>{k + 1}</b>
                    <span className="tower-team">
                      {r.boosting ? '⚡ ' : ''}
                      {r.name}
                    </span>
                    <i className="tyre-dot" style={{ '--c': COMPOUNDS[r.compound].color }} title={COMPOUNDS[r.compound].label} />
                    <em>{r.inPit ? 'PIT' : r.finishedAt != null ? fmtTime(r.finishedAt) : fmtGap(r.gap)}</em>
                  </li>
                ))}
              </ol>
              {race.phase === 'lights' && (
                <div className="start-lights" aria-label="Start lights">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={race.lights >= n ? 'on' : ''} />
                  ))}
                </div>
              )}
              {player && view === 'race' && (
                <div className="tyre-now">
                  <span className="tyre-dot" style={{ '--c': COMPOUNDS[player.compound].color }} />
                  P{player.position} · {player.speed} km/h · {COMPOUNDS[player.compound].label}
                  {player.pitRequest && !player.inPit ? ' · boxing' : ''}
                  {player.ahead && !player.inPit ? ` · ${player.ahead.gap.toFixed(1)}s to ${player.ahead.name}` : ''}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="pit-board">
                <div>
                  <span>Last stop</span>
                  <strong>{last ? `${last.toFixed(2)}s` : '—'}</strong>
                </div>
                <div>
                  <span>Best</span>
                  <strong>{best ? `${best.toFixed(2)}s` : '—'}</strong>
                </div>
                <div>
                  <span>Stops</span>
                  <strong>{stops}</strong>
                </div>
              </div>
              <div className="tyre-now">
                <span className="tyre-dot" style={{ '--c': COMPOUNDS[compound].color }} />
                {team.car} · {COMPOUNDS[compound].label}
              </div>
            </>
          )}

          {race?.phase === 'finished' && view === 'race' && (
            <div className="results" role="dialog" aria-label="Race result">
              <h3>Chequered flag</h3>
              <ol>
                {race.rows.map((r, k) => (
                  <li key={r.id} className={r.player ? 'me' : ''} style={{ '--c': r.color }}>
                    <b>P{k + 1}</b>
                    <span>{r.name}</span>
                    <em>{k === 0 ? fmtTime(r.finishedAt) : fmtGap(r.gap)}</em>
                    <small>
                      best {fmtTime(r.best)}
                      {r.penalty ? ` · +${r.penalty}s no-stop penalty` : ''}
                    </small>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* race controls, in one row under the stage */}
        <div className="race-bar">
          <div className="seg mode-seg" role="group" aria-label="Mode">
            {MODES.map(([id, label]) => (
              <button key={id} className={mode === id ? 'active' : ''} onClick={() => switchMode(id)} aria-pressed={mode === id}>
                {label}
              </button>
            ))}
          </div>
          {mode === 'garage' ? (
            <span className="muted">Car parked in the garage. Change team, tyres and paint below, then hit Race.</span>
          ) : !raceOn ? null : race.phase === 'finished' ? (
            <>
              <button className="btn" onClick={() => switchMode('race')}>
                Race again
              </button>
              <button className="btn btn-ghost" onClick={() => switchMode('garage')}>
                Back to garage
              </button>
            </>
          ) : (
            <>
              <div className="pit-call">
                <button className="btn" onClick={requestPit} disabled={race.phase !== 'race' || player?.pitRequest || player?.inPit || player?.lap >= LAPS}>
                  {player?.inPit ? 'In the pits' : player?.pitRequest ? 'Boxing this lap' : 'Pit stop'}
                </button>
                <div className="pit-tyres" role="group" aria-label="Tyres for the pit stop">
                  {Object.entries(COMPOUNDS).map(([key, c]) => (
                    <button key={key} className={nextTyre === key ? 'active' : ''} style={{ '--c': c.color }} onClick={() => setNextTyre(key)} aria-pressed={nextTyre === key}>
                      <span className="tyre-dot" />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                className={`boost-btn ${player?.boost > 0 ? 'on' : ''}`}
                onClick={boost}
                disabled={race.phase !== 'race' || player?.inPit || !(player?.charge >= 1) || player?.boost > 0}
                style={{ '--charge': player?.boost > 0 ? player.boost / player.boostTime : player?.charge ?? 0 }}
                title="Boost (B)"
              >
                <span className="boost-fill" aria-hidden="true" />
                <span className="boost-label">
                  ⚡ {player?.boost > 0 ? `Boost ${player.boost.toFixed(1)}s` : player?.charge >= 1 ? 'Boost ready' : `Boost ${Math.round((player?.charge ?? 0) * 100)}%`}
                </span>
              </button>
              {view === 'race' && (
                <div className="seg" role="group" aria-label="Camera">
                  {CAMERAS.map(([id, label]) => (
                    <button key={id} className={camera === id ? 'active' : ''} onClick={() => setCamera(id)} aria-pressed={camera === id}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <div className="seg" role="group" aria-label="Race speed">
                {SPEEDS.map((x) => (
                  <button key={x} className={speed === x ? 'active' : ''} onClick={() => setSpeed(x)} aria-pressed={speed === x}>
                    {x}×
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost" onClick={() => switchMode('garage')}>
                Retire
              </button>
            </>
          )}
        </div>

        <aside className="garage-panel">
          <section>
            <h3>Team</h3>
            <div className="team-grid">
              {TEAMS.map((t) => (
                <button
                  key={t.id}
                  className={`team-btn ${teamId === t.id ? 'active' : ''}`}
                  style={{ '--c': t.color }}
                  onClick={() => pickTeam(t)}
                  disabled={!t.file || inPit || racing}
                  aria-pressed={teamId === t.id}
                >
                  <span className="team-chip" aria-hidden="true" />
                  <strong>{t.name}</strong>
                  <small>{t.file ? t.car : 'Coming soon'}</small>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3>Tyres</h3>
            <p className="muted">
              {mode === 'race'
                ? 'During a race, pick tyres in the pit stop bar.'
                : 'Pick a compound and the crew swaps all four wheels. It is also the tyre you start a race on.'}
            </p>
            <div className="tyre-grid">
              {Object.entries(COMPOUNDS).map(([key, c]) => (
                <button
                  key={key}
                  className={`tyre-btn ${compound === key ? 'active' : ''} ${pending === key ? 'pending' : ''}`}
                  style={{ '--c': c.color }}
                  onClick={() => boxBox(key)}
                  disabled={inPit || mode === 'race'}
                  aria-pressed={compound === key}
                >
                  <span className="tyre-icon" aria-hidden="true" />
                  <strong>{c.label}</strong>
                  <small>{c.note}</small>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3>Paint</h3>
            <p className="muted">Team livery, or your own colour (sponsor decals stay on). Shows in the garage view.</p>
            <div className="paint-row">
              <button className={`paint-livery ${paint == null ? 'active' : ''}`} onClick={() => setPaint(null)}>
                Team livery
              </button>
              {PAINTS.map((p) => (
                <button
                  key={p}
                  className={`paint-swatch ${paint === p ? 'active' : ''}`}
                  style={{ background: p }}
                  onClick={() => setPaint(p)}
                  aria-label={`Paint ${p}`}
                />
              ))}
              <label className="paint-custom" title="Pick any colour">
                <input type="color" value={paint || team.color} onChange={(e) => setPaint(e.target.value)} />
              </label>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} />
              <span />
              Auto-rotate camera
            </label>
          </section>
        </aside>
      </div>

    </div>
  )
}
