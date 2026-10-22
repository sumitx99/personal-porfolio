import { profile, experience, education, projects, experiments, skills, certifications, achievements, coding } from '../data.js'

// Plain-text profile handed to Claude as the bot's only source of truth.
export function buildKnowledge() {
  const lines = []
  lines.push(`# ${profile.name}`)
  lines.push(`${profile.role}, based in ${profile.location}.`)
  lines.push(`Email: ${profile.email} · GitHub: ${profile.github} · LinkedIn: ${profile.linkedin}`)

  lines.push('\n## Experience')
  experience.forEach((j) => lines.push(`- ${j.title} at ${j.company} (${j.period}): ${j.points.join(' ')} Stack: ${j.tags.join(', ')}.`))

  lines.push('\n## Education')
  education.forEach((e) => lines.push(`- ${e.degree}, ${e.school}, ${e.place} (${e.period})`))

  lines.push('\n## Shipped projects (live)')
  projects.forEach((p) =>
    lines.push(`- ${p.name} (${p.kind}): ${p.blurb} Highlights: ${p.highlights.join('; ')}. Stack: ${p.stack.join(', ')}. Live: ${p.live}${p.repo ? ` · Code: ${p.repo}` : ''}`)
  )

  lines.push('\n## Experiments (side projects, page /experiments)')
  experiments.forEach((e) => lines.push(`- ${e.name} (${e.kind}): ${e.blurb} Stack: ${e.stack.join(', ')}.${e.repo ? ` Code: ${e.repo}` : ''}${e.live ? ` Live: ${e.live}` : ''}`))

  lines.push('\n## Skills')
  Object.entries(skills).forEach(([g, list]) => lines.push(`- ${g}: ${list.join(', ')}`))

  lines.push('\n## Certifications & recognition (page /certifications)')
  certifications.forEach((c) => lines.push(`- ${c.title} — ${c.issuer}, ${c.date}${c.note ? ` (${c.note})` : ''}`))
  achievements.forEach((a) => lines.push(`- ${a.title} (${a.year}): ${a.detail}`))

  lines.push('\n## Competitive programming (Codolio: ' + coding.profile + ')')
  lines.push(`- ${coding.totals.map(([n, l]) => `${n} ${l}`).join(', ')}; global rank #${coding.globalRank} on Codolio.`)
  lines.push(`- By platform: ${coding.platforms.map((p) => `${p.name} ${p.solved} (${p.url})`).join(', ')}.`)
  lines.push(`- By difficulty: ${coding.difficulty.map(([d, n]) => `${d} ${n}`).join(', ')}. Top topics: ${coding.topics.map(([t, n]) => `${t} ${n}`).join(', ')}.`)

  lines.push('\n## Site pages')
  lines.push('- Home (/), Experiments (/experiments), Coding (/coding, problem-solving stats), Certifications (/certifications), Analytics (/analytics, live GitHub stats), Garage (/garage, a fun 3D F1 car you can paint and pit-stop).')
  return lines.join('\n')
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9.+ ]/g, ' ')
const has = (q, ...words) => words.some((w) => q.includes(w))

// Keyword answers used when the Claude endpoint isn't available (local dev, no API key).
export function localAnswer(question) {
  const q = ` ${norm(question)} `

  const all = [...projects, ...experiments]
  const hit = all.find((p) => q.includes(norm(p.name).trim()) || q.includes(norm(p.name).replace(/\s|\./g, '')))
  if (hit) {
    const links = [hit.live && `Live: ${hit.live}`, hit.repo && `Code: ${hit.repo}`].filter(Boolean).join(' · ')
    return `**${hit.name}** (${hit.kind}) — ${hit.blurb}\n\nBuilt with ${hit.stack.join(', ')}.${links ? `\n${links}` : ''}`
  }

  if (has(q, ' hi ', ' hello', ' hey', 'namaste'))
    return `Hi! I’m Sumit’s portfolio assistant. Ask me about his projects, experience, skills, certifications or how to reach him.`

  if (has(q, 'contact', 'email', 'reach', 'hire', 'touch', 'mail', 'phone'))
    return `The best way to reach Sumit is email: ${profile.email}. You can also find him on LinkedIn (${profile.linkedin}) and GitHub (${profile.github}).`

  if (has(q, 'experience', 'work', 'job', 'company', 'intern', 'pharmaco', 'eoxs', 'career'))
    return experience.map((j) => `**${j.title} · ${j.company}** (${j.period})\n${j.points.join(' ')}`).join('\n\n')

  if (has(q, 'leetcode', 'dsa', 'coding', 'competitive', 'codeforces', 'codechef', 'problem', 'solved', 'gfg', 'geeks', 'codolio'))
    return `Sumit has solved **${coding.totals[0][0]}** problems across ${coding.platforms.length} platforms:\n${coding.platforms
      .map((p) => `• ${p.name}: ${p.solved}`)
      .join('\n')}\n\nCodeforces rating ${coding.totals[3][0]}, max streak ${coding.totals[2][0]} days. See /coding or the full profile: ${coding.profile}`

  if (has(q, 'certif', 'credential', 'course', 'oracle', 'aws', 'azure', 'microsoft'))
    return `Sumit holds ${certifications.filter((c) => c.category !== 'Recognition').length} certifications, including:\n${certifications
      .filter((c) => c.category !== 'Recognition')
      .slice(0, 5)
      .map((c) => `• ${c.title} — ${c.issuer} (${c.date})`)
      .join('\n')}\n\nSee them all on /certifications.`

  if (has(q, 'award', 'hackathon', 'win', 'achiev', 'recogn', 'research', 'paper', 'publication'))
    return achievements.map((a) => `• **${a.title}** (${a.year}) — ${a.detail}`).join('\n')

  if (has(q, 'skill', 'stack', 'tech', 'language', 'tool', 'know', 'framework'))
    return Object.entries(skills)
      .map(([g, list]) => `**${g}:** ${list.join(', ')}`)
      .join('\n')

  if (has(q, 'educat', 'college', 'university', 'degree', 'study', 'school'))
    return education.map((e) => `• ${e.degree} — ${e.school}, ${e.place} (${e.period})`).join('\n')

  if (has(q, 'experiment', 'side', 'other project', 'more project'))
    return `Some experiments: ${experiments
      .slice(0, 6)
      .map((e) => e.name)
      .join(', ')} and more. Browse them on /experiments.`

  if (has(q, 'project', 'built', 'build', 'portfolio', 'deployed', 'live', 'show'))
    return `Sumit’s live products:\n${projects
      .map((p) => `• **${p.name}** — ${p.tagline} ${p.live}`)
      .join('\n')}\n\nHe also has ${experiments.length} experiments (RAG bots, text-to-SQL, pose tracking…) on /experiments.`

  if (has(q, 'who', 'about', 'yourself', 'sumit', 'introduce'))
    return `${profile.name} is a ${profile.role.toLowerCase()} from ${profile.location}. He’s a Software Engineer at Pharmaco Evidence (backend, APIs, Kafka), previously built AI modules at EOXS, and ships products like RideBridge and Kite.`

  if (has(q, 'resume', 'cv'))
    return `You can ask Sumit for his latest resume at ${profile.email}, or see the full picture on LinkedIn: ${profile.linkedin}`

  return `I’m not sure about that one. I can tell you about Sumit’s projects, experience, skills, certifications or how to contact him — or email him directly at ${profile.email}.`
}
