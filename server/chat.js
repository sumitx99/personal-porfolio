// Chat assistant on the site: answers portfolio questions with Claude. Web-standard Request/Response,
// so it runs on any host (see api/, functions/ and netlify/ for the thin per-platform wrappers).
// Needs ANTHROPIC_API_KEY in the host's environment variables; without it the widget falls back to
// its local answers.
import Anthropic from '@anthropic-ai/sdk'
import { buildKnowledge } from '../src/bot/knowledge.js'
import { json } from './http.js'

const SYSTEM = `You are the assistant on Sumit Kumar Ranjan's portfolio website. Visitors are mostly recruiters, engineers and collaborators.

Answer questions about Sumit using only the profile below. Speak about him in the third person, warmly and concisely: two to five short sentences, or a short bulleted list when listing things. Include a relevant link (live demo, GitHub repo, a site page like /experiments, or his email) when it helps. If the profile doesn't cover something, say you don't know and suggest emailing him. Politely decline requests unrelated to Sumit or his work, and never invent facts, dates or numbers.

<profile>
${buildKnowledge()}
</profile>`

// One client per key, reused across requests on warm instances.
const clients = new Map()
function clientFor(apiKey) {
  if (!clients.has(apiKey)) clients.set(apiKey, new Anthropic({ apiKey }))
  return clients.get(apiKey)
}

export async function chat(request, env = {}) {
  if (request.method !== 'POST') return json({ error: 'method' }, 405)

  let messages
  try {
    const body = await request.json()
    // Keep the last few turns and cap message length so the endpoint can't be used as a free general chatbot.
    messages = (body.messages || [])
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 800) }))
    while (messages.length && messages[0].role !== 'user') messages.shift()
    if (!messages.length) throw new Error('empty')
  } catch {
    return json({ error: 'Bad request' }, 400)
  }

  if (!env.ANTHROPIC_API_KEY) return json({ error: 'not configured' }, 503)
  const client = clientFor(env.ANTHROPIC_API_KEY)
  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 2000,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages,
    })

    if (response.stop_reason === 'refusal') {
      return json({ reply: `I can only help with questions about Sumit and his work. For anything else, email him at sumitranjan2207@gmail.com.` })
    }
    const reply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
    return json({ reply })
  } catch (error) {
    console.error('chat error', error?.status, error?.message)
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'unavailable' }, 429)
    if (error instanceof Anthropic.AuthenticationError) return json({ error: 'unavailable' }, 503)
    return json({ error: 'unavailable' }, 502)
  }
}
