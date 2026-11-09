import { useState } from 'react'

export const conceptSteps = {
  ridebridge: ['Find the place', 'Choose the entrance', 'Take it into your ride app'],
  kite: ['Discover the offer', 'Shape the project', 'Follow the delivery'],
  'sonia-ai': ['Ask a question', 'Connect the context', 'Create an output'],
}

export function ProjectGlyph({ type, ...props }) {
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    {type === 'ridebridge' ? <><path d="M23 12c0 5-7 12-7 12S9 17 9 12a7 7 0 1 1 14 0Z" /><circle cx="16" cy="12" r="2.5" /><path d="M7 23c-2 1-3 2-3 3 0 2 5 3 12 3s12-1 12-3c0-1-1-2-3-3" /></> : type === 'kite' ? <><path d="m16 3 11 11-11 8L5 14 16 3Z" /><path d="m16 3 2 12 9-1M5 14l13 1-2 7c-6 2 8 6 0 8" /></> : <><path d="M16 3c0 9-4 13-13 13 9 0 13 4 13 13 0-9 4-13 13-13C20 16 16 12 16 3Z" /><path d="m26 2 .6 3.4L30 6l-3.4.6L26 10l-.6-3.4L22 6l3.4-.6L26 2Z" /></>}
  </svg>
}

function MapConcept({ step }) {
  return <div className={`concept-map concept-step-${step}`}>
    <svg viewBox="0 0 600 480" className="concept-map-svg" aria-hidden="true">
      <defs><pattern id="map-dots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".65" fill="var(--s-border)" /></pattern></defs>
      <rect width="600" height="480" fill="url(#map-dots)" />
      <path d="M470-30c-90 120 100 160 10 270s-30 200 20 270" fill="none" stroke="var(--s-surface)" strokeWidth="55" />
      <g fill="var(--s-surface)" stroke="var(--s-line)" strokeWidth="1"><rect x="42" y="38" width="116" height="92" rx="12" /><rect x="186" y="38" width="157" height="92" rx="12" /><rect x="42" y="162" width="116" height="136" rx="12" /><rect x="186" y="162" width="157" height="136" rx="12" /><rect x="42" y="329" width="116" height="111" rx="12" /><rect x="186" y="329" width="157" height="111" rx="12" /><rect x="375" y="60" width="47" height="70" rx="10" /><rect x="375" y="162" width="65" height="136" rx="10" /><rect x="375" y="329" width="78" height="111" rx="10" /><rect x="530" y="38" width="56" height="130" rx="10" /><rect x="530" y="200" width="56" height="138" rx="10" /></g>
      <path d="M-20 145H470M-20 314h490M172-10v510M359-10v510" fill="none" stroke="var(--s-deep)" strokeWidth="16" />
      <path d="M70 386H172v-72h187V219" fill="none" stroke="var(--s-border)" strokeWidth="3" strokeDasharray="5 7" />
      <path d="M70 386H172v-72h187V219" fill="none" stroke="var(--study-accent)" strokeWidth="4" className="concept-route" />
      <circle cx="70" cy="386" r="10" fill="var(--study-accent)" stroke="var(--s-deep)" strokeWidth="5" />
      <g fontFamily="var(--mono)" fontSize="9" fill="var(--s-muted)" letterSpacing="1"><text x="218" y="226">CAMPUS</text><text x="64" y="88">GARDEN</text><text x="200" y="388">LIBRARY</text><text x="382" y="350" transform="rotate(90 382 350)">RIVER WALK</text></g>
      <g className="concept-map-pin" transform={step === 0 ? 'translate(265 220)' : 'translate(359 219)'}><circle r="34" fill="var(--study-accent)" opacity=".09" /><circle r="22" fill="var(--study-accent)" opacity=".1" /><path d="M0 6S-15-10-15-20a15 15 0 0 1 30 0C15-10 0 6 0 6Z" fill="var(--study-accent)" stroke="var(--s-on-accent)" strokeWidth="3" /><circle cy="-20" r="4" fill="var(--s-on-accent)" /></g>
      <path d="m550 385 0-29m-6 8 6-8 6 8" fill="none" stroke="var(--s-muted)" strokeWidth="1.5" /><text x="546" y="400" fontSize="10" fill="var(--s-muted)">N</text>
    </svg>
    <div className="concept-search"><span>⌕</span> {step === 0 ? 'A place is just the beginning…' : 'Campus · the entrance you mean'}<span className="concept-search-key">↵</span></div>
    <div className="concept-map-card"><div className="concept-mini-icon"><ProjectGlyph type="ridebridge" /></div><div><small>{['START WITH A PLACE', 'MAKE IT PRECISE', 'READY FOR THE HANDOFF'][step]}</small><strong>{['One campus. Several gates.', 'North gate. Exactly here.', 'Same pin. Next app.'][step]}</strong><span>{['Search gets you close.', 'The entrance makes the difference.', 'Continue with Uber or Rapido.'][step]}</span></div><span className="concept-map-arrow">↗</span></div>
  </div>
}

function DeliveryConcept({ step }) {
  const tasks = ['Understand the brief', 'Build the product', 'Review the milestone']
  return <div className="concept-delivery"><div className="concept-orbit-ring" /><div className="concept-delivery-label">A CLEARER WAY TO SHIP</div><div className="concept-ticket concept-ticket-back"><span>THE STARTING POINT</span><strong>A good idea, looking for a team.</strong><div className="concept-ticket-lines"><i /><i /></div></div><div className="concept-board"><div className="concept-board-head"><ProjectGlyph type="kite" /><strong>Your project, in focus.</strong><span>↗</span></div><div className="concept-board-tabs"><span className={step === 0 ? 'active' : ''}>The brief</span><span className={step === 1 ? 'active' : ''}>The plan</span><span className={step === 2 ? 'active' : ''}>The progress</span></div><div className="concept-board-body">{tasks.map((task, i) => <div key={task} className={step === i ? 'active' : ''}><span className="concept-task-dot">{i < step ? '✓' : `0${i + 1}`}</span><div><strong>{task}</strong><small>{['A shared starting point', 'Tasks, people & milestones', 'Updates that stay connected'][i]}</small></div><span>{step === i ? '↗' : '·'}</span></div>)}</div><div className="concept-board-foot"><div><span>C</span><span>L</span><span>A</span></div><small>Client. Lead. Admin.</small></div></div><div className="concept-delivery-stamp"><span>ONE SHARED</span><strong>direction.</strong><svg viewBox="0 0 110 40" aria-hidden="true"><path d="M5 29C31 7 52 43 101 9m-17 2 18-3-5 18" fill="none" stroke="currentColor" strokeWidth="2" /></svg></div></div>
}

function ResearchConcept({ step }) {
  return <div className={`concept-research concept-step-${step}`}><div className="concept-research-grid" /><svg className="concept-research-lines" viewBox="0 0 600 480" aria-hidden="true"><g fill="none" stroke="var(--s-border)" strokeWidth="1"><ellipse cx="300" cy="235" rx="220" ry="155" /><ellipse cx="300" cy="235" rx="145" ry="210" transform="rotate(43 300 235)" /><path d="M115 140 300 235l190-95M130 355 300 235l180 130" /></g></svg><div className="concept-source source-doc"><span>▤</span><div><small>YOUR DOCUMENTS</small><strong>Context, kept close.</strong></div></div><div className="concept-source source-web"><span>◎</span><div><small>LIVE WEB</small><strong>Look beyond the files.</strong></div></div><div className="concept-research-core"><ProjectGlyph type="sonia-ai" /><span>sonia</span><small>{['A QUESTION STARTS IT.', 'CONTEXT CONNECTS IT.', 'AN OUTPUT MOVES IT.'][step]}</small></div><div className="concept-source source-tools"><span>⌘</span><div><small>MCP TOOLS</small><strong>Go from ask to action.</strong></div></div><div className="concept-output"><div><i /><i /><i /></div><span>{['What could this become?', 'Bring the right sources together.', 'Answers. Tables. Images. Graphs.'][step]}</span><svg viewBox="0 0 150 45" aria-hidden="true"><path d="m5 36 24-12 24 5 24-20 24 8 24-10 20 3" fill="none" stroke="currentColor" strokeWidth="2" /></svg></div></div>
}

export default function ProjectConcept({ slug }) {
  const [step, setStep] = useState(0)
  return <div className={`project-concept concept-${slug}`}><div className="concept-caption"><span>THE PRODUCT, DISTILLED</span><span>INTERACTIVE CONCEPT ↙</span></div>{slug === 'ridebridge' ? <MapConcept step={step} /> : slug === 'kite' ? <DeliveryConcept step={step} /> : <ResearchConcept step={step} />}<div className="concept-controls" aria-label="Explore the product concept">{conceptSteps[slug].map((label, i) => <button key={label} type="button" onClick={() => setStep(i)} aria-pressed={step === i}><span>0{i + 1}</span><span>{label}</span><span className="concept-control-arrow">↗</span></button>)}</div></div>
}
