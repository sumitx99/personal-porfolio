export default function SectionHead({ index, title, kicker }) {
  return (
    <div className="section-head reveal">
      <span className="index">{index}</span>
      <h2>{title}</h2>
      {kicker && <p>{kicker}</p>}
    </div>
  )
}

// Big title block used at the top of the standalone pages.
export function PageHead({ eyebrow, title, intro, children }) {
  return (
    <header className="page-head">
      <p className="eyebrow">
        <span className="dot" /> {eyebrow}
      </p>
      <h1 className="page-title" style={{ '--len': title.length }}>
        {title}
      </h1>
      {intro && <p className="page-intro">{intro}</p>}
      {children}
    </header>
  )
}
