// Limit live card contexts and always give visible/nearer cards first choice.
// A priority function is re-read on every reconciliation so fast scrolling cannot
// leave an old offscreen card holding a slot ahead of a newly visible card.
export class CanvasBudget {
  constructor(limit) {
    this.limit = limit
    this.candidates = new Map()
    this.selected = new Set()
    this.listeners = new Set()
  }

  subscribe = (listener) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  has(id) { return this.selected.has(id) }

  setLimit(limit) {
    if (limit === this.limit) return
    this.limit = limit
    this.reconcile()
  }

  request(id, priority) {
    this.candidates.set(id, priority)
    this.reconcile()
  }

  release(id) {
    this.candidates.delete(id)
    this.reconcile()
  }

  reconcile() {
    const ranked = [...this.candidates].map(([id, priority]) => [id, priority()])
      .filter(([, priority]) => Number.isFinite(priority))
      .sort((a, b) => a[1] - b[1])
    const next = new Set(ranked.slice(0, this.limit).map(([id]) => id))
    if (next.size === this.selected.size && [...next].every((id) => this.selected.has(id))) return
    this.selected = next
    this.listeners.forEach((listener) => listener())
  }
}
