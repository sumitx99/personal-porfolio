import { useEffect, useRef, useState } from 'react'
import { ProjectGlyph } from './ProjectConcept'

// Generic four-corner map, used by the experiments.
const connections = [
  'M180 95h95q35 0 35 35v35q0 35 45 35h45',
  'M620 95h-95q-35 0-35 35v35q0 35-45 35h-45',
  'M180 305h95q35 0 35-35v-35q0-35 45-35h45',
  'M620 305h-95q-35 0-35-35v-35q0-35-45-35h-45',
]

// Each project drawn in its real shape. Positions are centres in % of the canvas, so lines and
// boxes stay joined at any width. Node ids: n0…n3 are the story's nodes, `core` the product
// itself, e0… the external ends. Edges run [from, to, 'h' | 'v' (which way the curve leaves) | 'u' (a loop
// back underneath), label]. `order` is the reading order when the map turns into a list on phones.
const layouts = {
  // a straight pipeline inside the browser, forking into two ride apps outside it
  ridebridge: {
    groups: [{ x: 2, y: 13, w: 79.5, h: 74, label: 'RideBridge · in your browser' }],
    nodes: [[12, 50, 16], [32, 50, 16], [52, 50, 16], [71.5, 50, 16]],
    ends: [{ x: 92, y: 26, label: 'Uber', note: 'web deep link', of: 3 }, { x: 92, y: 74, label: 'Rapido', note: 'Android intent', of: 3 }],
    edges: [['n0', 'n1', 'h'], ['n1', 'n2', 'h'], ['n2', 'n3', 'h'], ['n3', 'e0', 'h'], ['n3', 'e1', 'h']],
  },
  // a layered web app: each role signs in to the React workspace, which calls the API, which keeps the records
  kite: {
    groups: [{ x: 24, y: 18, w: 24, h: 64, label: 'Frontend' }, { x: 50, y: 18, w: 48, h: 64, label: 'Backend' }],
    nodes: [[10, 50, 14], [36, 50, 18], [62, 50, 18], [87, 50, 16]],
    edges: [['n0', 'n1', 'h', 'by role'], ['n1', 'n2', 'h', 'REST API'], ['n2', 'n3', 'h', 'SQL']],
  },
  // one question fans out to documents and the web/tools, then comes back as one output
  'sonia-ai': {
    core: [35, 50],
    nodes: [[11, 50, 16], [63, 20, 21], [63, 80, 21], [89, 50, 16]],
    edges: [['n0', 'core', 'h'], ['core', 'n1', 'h', 'retrieve'], ['core', 'n2', 'h', 'search · call tools'], ['n1', 'n3', 'h'], ['n2', 'n3', 'h']],
  },

  // Experiments
  // a conversation loop: each answer invites the next question
  'ai-sql-assistant': {
    nodes: [[11, 40, 16], [37, 40, 17], [63, 40, 15], [88, 40, 17]],
    edges: [['n0', 'n1', 'h', 'prompt'], ['n1', 'n2', 'h', 'SQL'], ['n2', 'n3', 'h', 'rows'], ['n3', 'n0', 'u', 'follow-up question']],
  },
  // per webcam frame: landmarks become angles, which yield the exercise and the rep count, then the cues
  postura: {
    groups: [{ x: 2, y: 8, w: 96, h: 84, label: 'repeats for every webcam frame' }],
    nodes: [[11, 50, 15], [30, 50, 15], [49, 50, 15], [89, 50, 14]],
    ends: [{ x: 69, y: 28, label: 'Exercise', note: '1 of 10 recognised', of: 2 }, { x: 69, y: 72, label: 'Reps', note: 'counted', of: 2 }],
    edges: [['n0', 'n1', 'h'], ['n1', 'n2', 'h'], ['n2', 'e0', 'h'], ['n2', 'e1', 'h'], ['e0', 'n3', 'h'], ['e1', 'n3', 'h']],
    order: [0, 1, 2, 'ends', 3],
  },
  // a router: each question takes the SQL path or the retrieval path
  'claim-ai-assistant': {
    core: [33, 50],
    nodes: [[11, 50, 15], [62, 20, 22], [62, 80, 22], [89, 50, 16]],
    edges: [['n0', 'core', 'h', 'CSV'], ['core', 'n1', 'h', 'structured'], ['core', 'n2', 'h', 'needs reasoning'], ['n1', 'n3', 'h'], ['n2', 'n3', 'h', 'streamed']],
  },
  // two signals, from prices and from the news, meet in one model
  'market-predictor': {
    nodes: [[12, 27, 15], [42, 27, 22], [42, 73, 18], [80, 50, 20]],
    ends: [{ x: 12, y: 73, label: 'News', note: 'headlines', of: 2 }],
    edges: [['n0', 'n1', 'h', 'prices'], ['e0', 'n2', 'h'], ['n1', 'n3', 'h', 'indicators'], ['n2', 'n3', 'h', 'sentiment score']],
    order: [0, 1, 'ends', 2, 3],
  },
  // a voice loop round the conversation window
  jarvis: {
    core: [50, 50],
    nodes: [[14, 50, 15], [50, 16, 15], [86, 50, 15], [50, 84, 17]],
    edges: [['n0', 'n1', 'h', 'your words as text'], ['n1', 'n2', 'h', 'reply'], ['n2', 'n3', 'h', 'spoken aloud'], ['n3', 'n0', 'h', 'next turn']],
    order: ['core', 0, 1, 2, 3],
  },
  // a control loop: the new timing changes the traffic the camera sees next
  intellitraffic: {
    core: [50, 50],
    nodes: [[18, 22, 17], [82, 22, 17], [82, 78, 17], [18, 78, 17]],
    edges: [['n0', 'n1', 'h', 'frames'], ['n1', 'n2', 'v', 'vehicles'], ['n2', 'n3', 'h', 'load'], ['n3', 'n0', 'v', 'traffic responds']],
    order: ['core', 0, 1, 2, 3],
  },
  // two documents in, one comparison, two kinds of feedback out
  'ats-resume-checker': {
    nodes: [[12, 27, 15], [12, 73, 15], [42, 50, 17], [66, 50, 14]],
    ends: [{ x: 90, y: 26, label: 'Match score', note: 'the tool’s estimate', of: 3 }, { x: 90, y: 74, label: 'Gaps', note: 'strengths · keywords', of: 3 }],
    edges: [['n0', 'n2', 'h'], ['n1', 'n2', 'h'], ['n2', 'n3', 'h', 'assessment'], ['n3', 'e0', 'h'], ['n3', 'e1', 'h']],
  },
  // the video lives on YouTube; everything after it runs in the Streamlit app
  'youtube-notes': {
    groups: [{ x: 24, y: 16, w: 74, h: 68, label: 'Streamlit app' }],
    nodes: [[11, 50, 15], [37, 50, 16], [62, 50, 15], [86, 50, 15]],
    edges: [['n0', 'n1', 'h', 'video link'], ['n1', 'n2', 'h', 'transcript'], ['n2', 'n3', 'h', 'notes']],
  },
  // a public dataset worked through in one notebook
  'drug-review-sentiment': {
    groups: [{ x: 22, y: 16, w: 76, h: 68, label: 'Jupyter notebook' }],
    nodes: [[10, 50, 15], [35, 50, 15], [60, 50, 17], [85, 50, 15]],
    edges: [['n0', 'n1', 'h', 'review text'], ['n1', 'n2', 'h', 'sentiment'], ['n2', 'n3', 'h', 'rankings']],
  },
}

// Lines are drawn in the canvas's real pixels (not a stretched viewBox) so strokes and packets keep their shape.
// Returns the cubic's four points; `depth` is how far a loop dips below its ends.
function curve([x1, y1], [x2, y2], dir, depth) {
  if (dir === 'u') {
    const y = Math.max(y1, y2) + depth
    return [[x1, y1], [x1, y], [x2, y], [x2, y2]]
  }
  if (dir === 'v') {
    const my = (y1 + y2) / 2
    return [[x1, y1], [x1, my], [x2, my], [x2, y2]]
  }
  const mx = (x1 + x2) / 2
  return [[x1, y1], [mx, y1], [mx, y2], [x2, y2]]
}

function Flow({ layout, nodes, name, slug, glyph, active, setActive }) {
  const canvas = useRef(null)
  const [size, setSize] = useState([1000, 450])
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize([entry.contentRect.width, entry.contentRect.height]))
    observer.observe(canvas.current)
    return () => observer.disconnect()
  }, [])
  const px = ([x, y]) => [(x * size[0]) / 100, (y * size[1]) / 100]
  const at = (id) => px(id === 'core' ? layout.core : id[0] === 'e' ? [layout.ends[id.slice(1)].x, layout.ends[id.slice(1)].y] : layout.nodes[id.slice(1)])
  const touches = (id) => id === `n${active}` || (id[0] === 'e' && layout.ends[id.slice(1)].of === active)
  const edges = layout.edges.map(([from, to, dir, label]) => {
    const [p0, p1, p2, p3] = curve(at(from), at(to), dir, size[1] * 0.42)
    // the curve's own halfway point, which for a loop is the bottom of the dip
    const mid = [0, 1].map((k) => (p0[k] + 3 * p1[k] + 3 * p2[k] + p3[k]) / 8)
    return { d: `M${p0}C${p1} ${p2} ${p3}`, label, mid: [(mid[0] / size[0]) * 100, (mid[1] / size[1]) * 100], hot: touches(from) || touches(to) }
  })
  const node = (i) => {
    const [label, tech] = nodes[i]
    const [x, y, w] = layout.nodes[i]
    return <button key={label} className={`study-system-node ${active === i ? 'active' : ''}`} style={{ left: `${x}%`, top: `${y}%`, width: `${w}%` }} onClick={() => setActive(i)} aria-pressed={active === i}><span>0{i + 1}<i>↗</i></span><strong>{label}</strong><small>{tech}</small></button>
  }
  // DOM order follows the flow, which is also how the diagram reads as a list on phones
  const order = layout.order || (layout.core ? [0, 'core', 1, 2, 3, 'ends'] : [0, 1, 2, 3, 'ends'])
  const ends = layout.ends && <div key="ends" className="system-ends">{layout.ends.map((end) => <button key={end.label} type="button" className={`system-end ${active === end.of ? 'active' : ''}`} style={{ left: `${end.x}%`, top: `${end.y}%` }} onClick={() => setActive(end.of)}><strong>{end.label}</strong><small>{end.note}</small></button>)}</div>
  return <div className="study-system-canvas" ref={canvas}>
    {layout.groups?.map((g) => <div key={g.label} className="system-group" style={{ left: `${g.x}%`, top: `${g.y}%`, width: `${g.w}%`, height: `${g.h}%` }}><span>{g.label}</span></div>)}
    <svg viewBox={`0 0 ${size[0]} ${size[1]}`} aria-hidden="true">
      <g fill="none" strokeWidth="1.3">{edges.map((e) => <path key={e.d} d={e.d} className={`system-edge ${e.hot ? 'hot' : ''}`} />)}</g>
      <g fill="none" stroke="var(--study-ink)" strokeLinecap="round">{edges.map((e, i) => <path key={e.d} className={`system-flow-packet ${e.hot ? 'active' : ''}`} d={e.d} style={{ animationDelay: `${i * -.25}s` }} />)}</g>
    </svg>
    {edges.map((e) => e.label && <span key={e.d} className="system-edge-label" style={{ left: `${e.mid[0]}%`, top: `${e.mid[1]}%` }}>{e.label}</span>)}
    {order.map((i) => (i === 'core' ? <div key="core" className="study-system-core" style={{ left: `${layout.core[0]}%`, top: `${layout.core[1]}%` }}>{glyph || <ProjectGlyph type={slug} />}<strong>{name}</strong></div> : i === 'ends' ? ends : node(i)))}
  </div>
}

export default function SystemMap({ nodes, name, slug, glyph }) {
  const [active, setActive] = useState(0)
  const [flowing, setFlowing] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [visible, setVisible] = useState(false)
  const [pageVisible, setPageVisible] = useState(() => !document.hidden)
  const ref = useRef(null)
  const layout = layouts[slug]

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(ref.current)
    const onVisibility = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', onVisibility) }
  }, [])

  return <div className={`study-system ${layout ? `study-system-flow flow-${slug}` : ''}`} ref={ref} data-flowing={flowing && visible && pageVisible}>
    <div className="study-system-heading">
      <span className="study-label">{layout ? 'HOW IT FLOWS' : 'SYSTEM AT A GLANCE'}</span>
      <button className="system-flow-toggle" type="button" onClick={() => setFlowing(!flowing)} aria-pressed={flowing} aria-label={flowing ? 'Pause connection flow' : 'Start connection flow'}><span aria-hidden="true">{flowing ? 'Ⅱ' : '▷'}</span>{flowing ? 'Pause flow' : 'Start flow'}</button>
    </div>
    {layout ? <Flow layout={layout} nodes={nodes} name={name} slug={slug} glyph={glyph} active={active} setActive={setActive} /> : <div className="study-system-canvas">
      <svg viewBox="0 0 800 400" preserveAspectRatio="none" aria-hidden="true">
        <defs><pattern id="system-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#b9b2a5" /></pattern></defs>
        <rect width="800" height="400" fill="url(#system-dots)" />
        <g fill="none" stroke="#b8b1a6" strokeWidth="1.3">{connections.map((path) => <path d={path} key={path} />)}</g>
        <path fill="none" stroke="var(--study-ink)" strokeOpacity=".6" strokeWidth="2" d={connections[active]} />
        <g fill="none" stroke="var(--study-ink)" strokeLinecap="round">{connections.map((path, i) => <path className={`system-flow-packet ${active === i ? 'active' : ''}`} pathLength="100" d={path} key={path} style={{ animationDelay: `${i * -.9}s`, animationDirection: i === 3 ? 'reverse' : 'normal' }} />)}</g>
      </svg>
      <div className="study-system-core">{glyph || <ProjectGlyph type={slug} />}<strong>{name}</strong></div>
      {nodes.map(([label, tech], i) => <button key={label} className={`study-system-node node-${i} ${active === i ? 'active' : ''}`} onClick={() => setActive(i)} aria-pressed={active === i}><span>0{i + 1}<i>↗</i></span><strong>{label}</strong><small>{tech}</small></button>)}
    </div>}
    <div className="study-system-detail"><span className="study-label">0{active + 1} / {nodes[active][0]}</span><p>{nodes[active][2]}</p></div>
    <p className="study-system-note">{layout ? 'Follow the flow · select a step to look closer.' : 'Conceptual capability map · select a component to look closer.'}</p>
  </div>
}
