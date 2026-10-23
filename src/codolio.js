import { useEffect, useState } from 'react'

// Live profile data from Codolio through /api/codolio, fetched once per visit and shared by pages.
let cache = null
export function useCodolio() {
  const [state, setState] = useState(() => (cache ? { status: 'ready', data: cache } : { status: 'loading' }))
  useEffect(() => {
    if (cache) return
    let alive = true
    fetch('/api/codolio')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        cache = data
        if (alive) setState({ status: 'ready', data })
      })
      .catch(() => alive && setState({ status: 'error' }))
    return () => {
      alive = false
    }
  }, [])
  return state
}
