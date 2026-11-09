import { useEffect, useRef } from 'react'

// Behind the coding page's desk: a slow lime glow and fragments of DSA code drifting up, now and then an
// "Accepted" from the judge. A 2D canvas at 30fps that sleeps offscreen and holds still for reduced motion.
const SNIPPETS = [
  'dp[i][j]', 'O(n log n)', 'while (lo < hi)', 'mid = lo + (hi - lo) / 2', 'q.push(node)', 'return ans;',
  'for (int i = 0; i < n; i++)', 'graph[u].push_back(v)', 'heap.pop()', 'memo[n]', 'sort(a.begin(), a.end())',
  'O(1)', 'vis[v] = true', 'stack.top()', 'prefix[i + 1]', 'if (l > r) return', 'bfs(src)', 'dfs(child)',
  'two pointers', '// solved', 'll ans = 0;', 'unordered_map', '#include <bits/stdc++.h>', 'binary_search',
]
const ACCEPTED = '✓ Accepted'
const COUNT = 34
const FPS = 30
const rgb = (hex) => (hex.length === 4 ? [...hex.slice(1)].map((c) => parseInt(c + c, 16)) : [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)))

export default function CodeBackdrop() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const styles = getComputedStyle(document.documentElement)
    const accent = styles.getPropertyValue('--accent').trim() || '#d4ff3a'
    const [r, g, b] = rgb(/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(accent) ? accent : '#d4ff3a')
    const near = `rgb(${(r + 154) >> 1}, ${(g + 154) >> 1}, ${(b + 160) >> 1})` // accent mixed with grey, for the closest snippets
    const mono = styles.getPropertyValue('--mono').trim() || 'monospace'
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let frame = 0
    let last = 0
    let time = 0
    let running = false
    let onScreen = true

    const spawn = (token, anywhere) => {
      token.depth = 0.45 + Math.random() * 0.55 // 1 is closest: bigger, brighter, faster
      token.accepted = Math.random() < 0.08
      token.text = token.accepted ? ACCEPTED : SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)]
      token.x = Math.random() * w
      token.y = anywhere ? Math.random() * h : h + 20
      token.speed = 6 + token.depth * 16
      token.phase = Math.random() * Math.PI * 2
      return token
    }
    const tokens = []

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!tokens.length) for (let i = 0; i < COUNT; i++) tokens.push(spawn({}, true))
    }

    const draw = (dt) => {
      time += dt
      ctx.clearRect(0, 0, w, h)
      // the glow behind the monitor, breathing over ~7s
      const pulse = 0.14 + Math.sin(time * 0.9) * 0.04
      const glow = ctx.createRadialGradient(w * 0.55, h * 0.48, 0, w * 0.55, h * 0.48, Math.max(w, h) * 0.45)
      glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${pulse})`)
      glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, w, h)
      ctx.textBaseline = 'middle'
      for (const t of tokens) {
        t.y -= t.speed * dt
        if (t.y < -20) spawn(t, false)
        const x = t.x + Math.sin(time * 0.6 + t.phase) * 6 * t.depth
        // fade in from the bottom edge and out towards the top
        const edge = Math.min(1, (h - t.y) / (h * 0.25), t.y / (h * 0.3))
        const flash = t.accepted ? 0.5 + Math.sin(time * 3 + t.phase) * 0.25 : 0
        ctx.globalAlpha = Math.max(0, edge) * (t.accepted ? 0.45 + flash : 0.08 + t.depth * 0.2)
        ctx.fillStyle = t.accepted ? accent : t.depth > 0.8 ? near : '#8a8a90'
        ctx.font = `${Math.round(9 + t.depth * 6)}px ${mono}`
        ctx.fillText(t.text, x, t.y)
      }
      ctx.globalAlpha = 1
    }

    const loop = (now) => {
      frame = requestAnimationFrame(loop)
      if (now - last < 1000 / FPS - 1) return
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0
      last = now
      draw(dt)
    }
    const update = () => {
      const go = !still && onScreen && !document.hidden
      if (go && !running) {
        running = true
        last = 0
        frame = requestAnimationFrame(loop)
      } else if (!go && running) {
        running = false
        cancelAnimationFrame(frame)
      }
    }

    resize()
    draw(0)
    const sizer = new ResizeObserver(() => {
      resize()
      if (!running) draw(0)
    })
    sizer.observe(canvas)
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting
      update()
    })
    io.observe(canvas)
    document.addEventListener('visibilitychange', update)
    update()
    return () => {
      cancelAnimationFrame(frame)
      sizer.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  return <canvas ref={ref} className="code-backdrop" aria-hidden="true" />
}
