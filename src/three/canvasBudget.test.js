import test from 'node:test'
import assert from 'node:assert/strict'
import { CanvasBudget } from './canvasBudget.js'

test('visible card priorities win over preload cards without exceeding the context budget', () => {
  const budget = new CanvasBudget(3)
  for (let i = 0; i < 5; i++) budget.request(`near${i}`, () => 1000 + i)
  budget.request('visible1', () => 20)
  budget.request('visible2', () => 40)
  assert.deepEqual([...budget.selected], ['visible1', 'visible2', 'near0'])
  assert.equal(budget.selected.size, 3)
})

test('a fast scroll re-evaluates old card positions before choosing a new visible card', () => {
  const budget = new CanvasBudget(2)
  const positions = { a: 0, b: 10, c: 1000 }
  for (const id of ['a', 'b', 'c']) budget.request(id, () => positions[id])
  assert.deepEqual([...budget.selected], ['a', 'b'])
  positions.a = 2000
  positions.b = 1500
  positions.c = 10
  budget.request('d', () => 0)
  assert.deepEqual([...budget.selected], ['d', 'c'])
  budget.release('d')
  assert.deepEqual([...budget.selected], ['c', 'b'])
})

test('filtering/unmounting releases slots and repeated flings keep the mobile cap', () => {
  const budget = new CanvasBudget(3)
  for (let i = 0; i < 100; i++) {
    budget.request(i, () => -i)
    assert.ok(budget.selected.size <= 3)
    if (i > 4) budget.release(i - 5)
  }
  for (const id of [...budget.candidates.keys()]) budget.release(id)
  assert.equal(budget.selected.size, 0)
  assert.equal(budget.candidates.size, 0)
})

test('orientation changes shrink/grow the budget and stable selections do not notify React', () => {
  const budget = new CanvasBudget(6)
  let notifications = 0
  const unsubscribe = budget.subscribe(() => notifications++)
  for (let i = 0; i < 6; i++) budget.request(i, () => i)
  budget.setLimit(3)
  assert.deepEqual([...budget.selected], [0, 1, 2])
  const settled = notifications
  budget.request(20, () => 2000)
  budget.setLimit(3)
  assert.equal(notifications, settled)
  budget.setLimit(6)
  assert.equal(budget.selected.size, 6)
  unsubscribe()
  budget.release(0)
  assert.equal(notifications, settled + 1)
})
