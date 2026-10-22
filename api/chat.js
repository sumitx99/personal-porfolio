// Vercel serverless function: answers portfolio questions with Claude.
// Needs ANTHROPIC_API_KEY in the Vercel project's environment variables.
import { Buffer } from 'node:buffer'
import process from 'node:process'
import Anthropic from '@anthropic-ai/sdk'
import { buildKnowledge } from '../src/bot/knowledge.js'

const SYSTEM = `You are the assistant on Sumit Kumar Ranjan's portfolio website. Visitors are mostly recruiters, engineers and collaborators.

Answer questions about Sumit using only the profile below. Speak about him in the third person, warmly and concisely: two to five short sentences, or a short bulleted list when listing things. Include a relevant link (live demo, GitHub repo, a site page like /experiments, or his email) when it helps. If the profile doesn't cover something, say you don't know and suggest emailing him. Politely decline requests unrelated to Sumit or his work, and never invent facts, dates or numbers.

<profile>
${buildKnowledge()}
</profile>`

let client

async function readBody(req) {
  if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const chunks = []
  for await (const c of req) chunks.push(c)
  return JSON.parse(Buffer.concat(chunks).toString() || '{}')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405
    return res.end()
  }

  let messages
  try {
    const body = await readBody(req)
    // Keep the last few turns and cap message length so the endpoint can't be used as a free general chatbot.
    messages = (body.messages || [])
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 800) }))
    while (messages.length && messages[0].role !== 'user') messages.shift()
    if (!messages.length) throw new Error('empty')
  } catch {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ error: 'Bad request' }))
  }

  res.setHeader('Content-Type', 'application/json')
  if (!process.env.ANTHROPIC_API_KEY) {
    res.statusCode = 503
    return res.end(JSON.stringify({ error: 'not configured' }))
  }
  client ??= new Anthropic()
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
      return res.end(JSON.stringify({ reply: `I can only help with questions about Sumit and his work. For anything else, email him at sumitranjan2207@gmail.com.` }))
    }
    const reply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
    return res.end(JSON.stringify({ reply }))
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) res.statusCode = 429
    else if (error instanceof Anthropic.AuthenticationError) res.statusCode = 503
    else res.statusCode = 502
    console.error('chat error', error?.status, error?.message)
    return res.end(JSON.stringify({ error: 'unavailable' }))
  }
}
