import { useCallback, useRef, useState } from 'react'
import F1Garage from '../components/F1Garage'
import { PageHead } from '../components/SectionHead'
import { useIsSmall } from '../hooks'
import { COMPOUNDS, PAINTS, TEAMS } from '../f1'

const ready = TEAMS.filter((t) => t.file)

export default function Garage() {
  const small = useIsSmall()
  const [teamId, setTeamId] = useState('ferrari')
  const [paint, setPaint] = useState(null)
  const [compound, setCompound] = useState('medium')
  const [pending, setPending] = useState(null)
  const [pitStart, setPitStart] = useState(null)
  const [radio, setRadio] = useState('Car’s in the pit box. Pick a tyre and the crew will change all four.')
  const [last, setLast] = useState(null)
  const [best, setBest] = useState(null)
  const [stops, setStops] = useState(0)
  const [autoRotate, setAutoRotate] = useState(true)
  const clock = useRef(null)

  const team = TEAMS.find((t) => t.id === teamId)
  const inPit = pitStart != null

  const pickTeam = (t) => {
    if (!t.file || inPit) return
    setTeamId(t.id)
    setPaint(null)
    setRadio(`${t.name} ${t.car} rolled out. Radio check, loud and clear.`)
  }

  const boxBox = (next) => {
    if (inPit || next === compound || !clock.current) return
    setPending(next)
    setPitStart(clock.current.elapsedTime)
    setRadio(`Box, box! Crew out — fitting ${COMPOUNDS[next].label.toLowerCase()}s.`)
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
  }, [pending])

  return (
    <div className="page garage-page">
      <PageHead
        eyebrow="Fun zone · drag to look around"
        title="Garage"
        intro="Pick a 2026 car, repaint it, then call the crew in for a tyre change. Real-scale 3D models, running live in your browser with Three.js."
      />

      <div className="garage">
        <div className="garage-stage" data-lenis-prevent-wheel>
          <F1Garage
            team={team}
            paint={paint}
            compound={compound}
            pitStart={pitStart}
            onPitDone={onPitDone}
            onWheelSwap={onWheelSwap}
            autoRotate={autoRotate && !inPit}
            clockRef={clock}
            small={small}
          />
          <div className={`radio ${inPit ? 'live' : ''}`} aria-live="polite">
            <span className="radio-tag">
              <span className="dot" /> Team radio · {team.name}
            </span>
            <p>{radio}</p>
          </div>
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
                  disabled={!t.file || inPit}
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
            <p className="muted">Pick a compound and the pit crew swaps all four wheels.</p>
            <div className="tyre-grid">
              {Object.entries(COMPOUNDS).map(([key, c]) => (
                <button
                  key={key}
                  className={`tyre-btn ${compound === key ? 'active' : ''} ${pending === key ? 'pending' : ''}`}
                  style={{ '--c': c.color }}
                  onClick={() => boxBox(key)}
                  disabled={inPit}
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
            <p className="muted">Team livery, or your own colour (sponsor decals stay on).</p>
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

      <p className="credits">
        3D car models on Sketchfab by{' '}
        <a href="https://sketchfab.com/Tyler_Dave" target="_blank" rel="noreferrer">
          Dave Love (Tyler_Dave)
        </a>{' '}
        and{' '}
        <a href="https://sketchfab.com/abuhossain844" target="_blank" rel="noreferrer">
          Abu Saif
        </a>
        , licensed{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
        :{' '}
        {ready.map((t, i) => (
          <span key={t.id}>
            <a href={t.url} target="_blank" rel="noreferrer">
              {t.name} {t.car}
            </a>
            {i < ready.length - 1 ? ', ' : ''}
          </span>
        ))}
        . Pit crew: Mixamo character from the three.js examples. Pit lane and garage floor textures from{' '}
        <a href="https://polyhaven.com/a/asphalt_pit_lane" target="_blank" rel="noreferrer">
          Poly Haven
        </a>{' '}
        (CC0). Models compressed for the web; team names and liveries belong to their owners. A fan project, not affiliated with F1 or any team.
      </p>
    </div>
  )
}
