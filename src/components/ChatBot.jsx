import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { localAnswer } from '../bot/knowledge'
import { profile } from '../data'

const RobotScene = lazy(() => import('./RobotScene'))

const SUGGESTIONS = ['Show projects', 'Experience highlights', 'Certifications', 'How do I contact Sumit?']
const GREETING = {
  role: 'assistant',
  content: `Hi! I’m Sumit’s portfolio assistant. Ask about his projects, experience, skills, or how to get in touch.`,
}

// Turns URLs, site paths and **bold** in a reply into elements.
function RichText({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+|(?<=\s|^)\/(?:experiments|certifications|analytics)\b)/g)
  return parts.map((part, i) => {
    if (!part) return null
    if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (/^https?:\/\//.test(part)) {
      const clean = part.replace(/[.,]$/, '')
      return (
        <a key={i} href={clean} target="_blank" rel="noreferrer">
          {clean.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
        </a>
      )
    }
    if (part.startsWith('/'))
      return (
        <Link key={i} to={part}>
          {part}
        </Link>
      )
    return <span key={i}>{part}</span>
  })
}

async function ask(history) {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    })
    if (!res.ok) throw new Error(res.status)
    const data = await res.json()
    if (!data.reply) throw new Error('empty')
    return data.reply
  } catch {
    // No backend (local dev, or no API key configured): answer from the portfolio data directly.
    await new Promise((r) => setTimeout(r, 450))
    return localAnswer(history[history.length - 1].content)
  }
}

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [hover, setHover] = useState(false)
  const [teaser, setTeaser] = useState(false)
  const [messages, setMessages] = useState([GREETING])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const show = setTimeout(() => setTeaser(true), 3500)
    const hide = setTimeout(() => setTeaser(false), 11000)
    return () => {
      clearTimeout(show)
      clearTimeout(hide)
    }
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  useEffect(() => {
    if (!open) return
    setTeaser(false)
    inputRef.current?.focus({ preventScroll: true })
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const send = async (text) => {
    const content = text.trim()
    if (!content || busy) return
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setBusy(true)
    // The greeting is UI-only; the API conversation starts with the visitor's first message.
    const reply = await ask(next.slice(1))
    setMessages((m) => [...m, { role: 'assistant', content: reply }])
    setBusy(false)
  }

  if (hidden) {
    return (
      <button className="bot-restore" onClick={() => setHidden(false)} aria-label="Show assistant">
        <span className="dot" /> Ask my AI
      </button>
    )
  }

  return (
    <div className={`bot ${open ? 'is-open' : ''}`}>
      {open && (
        <section className="bot-panel" role="dialog" aria-label="Chat with Sumit’s assistant">
          <header className="bot-head">
            <span className="bot-avatar" aria-hidden="true">
              ◎
            </span>
            <div>
              <h2>Sumit’s assistant</h2>
              <p>Ask about projects, skills &amp; experience.</p>
            </div>
            <button className="bot-x" onClick={() => setOpen(false)} aria-label="Close chat">
              ×
            </button>
          </header>

          <div className="bot-list" ref={listRef} aria-live="polite" data-lenis-prevent>
            {messages.map((m, i) => (
              <div key={i} className={`bot-msg ${m.role}`}>
                <RichText text={m.content} />
              </div>
            ))}
            {busy && (
              <div className="bot-msg assistant typing" aria-label="Typing">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>

          {messages.length < 3 && (
            <div className="bot-chips">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className="bot-input"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Sumit’s work…"
              maxLength={500}
              aria-label="Your question"
            />
            <button type="submit" disabled={!input.trim() || busy} aria-label="Send">
              ➤
            </button>
          </form>
          <p className="bot-foot">
            Answers come from this portfolio. For anything else: <a href={`mailto:${profile.email}`}>email Sumit</a>
          </p>
        </section>
      )}

      <div className="bot-dock">
        {teaser && !open && (
          <button className="bot-teaser" onClick={() => setOpen(true)}>
            Hey! Want a quick tour of Sumit’s work? 👋
          </button>
        )}
        <button
          className="bot-robot"
          onClick={() => setOpen((o) => !o)}
          onPointerEnter={(event) => event.pointerType === 'mouse' && setHover(true)}
          onPointerLeave={() => setHover(false)}
          aria-label={open ? 'Close chat' : 'Open chat with Sumit’s assistant'}
        >
          <Suspense fallback={<span className="bot-fallback">◎</span>}>
            <RobotScene talking={busy} excited={hover || teaser} active={open || hover || busy} />
          </Suspense>
        </button>
        {!open && (
          <>
            <button className="bot-pill" onClick={() => setOpen(true)}>
              <span aria-hidden="true">💬</span> Ask my AI
            </button>
            <button className="bot-min" onClick={() => setHidden(true)} aria-label="Hide assistant">
              −
            </button>
          </>
        )}
      </div>
    </div>
  )
}
