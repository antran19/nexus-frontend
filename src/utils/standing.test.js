import assert from 'node:assert/strict'
import test from 'node:test'
import { STANDING } from './standing.js'

const STATUSES = ['LEADING', 'OUTBID', 'WON', 'LOST', 'CANCELLED', 'PENDING']

test('every auction standing has Vietnamese text and a class list', () => {
  assert.deepEqual(Object.keys(STANDING).sort(), [...STATUSES].sort())
  for (const status of STATUSES) {
    assert.equal(typeof STANDING[status].text, 'string', status)
    assert.ok(STANDING[status].text.length > 0, status)
    assert.match(STANDING[status].className, /\bbg-\S+/, status)
    assert.match(STANDING[status].className, /\btext-\S+/, status)
    assert.match(STANDING[status].className, /\bborder-\S+/, status)
  }
})

test('each standing says something different', () => {
  const texts = STATUSES.map((status) => STANDING[status].text)
  assert.equal(new Set(texts).size, texts.length)
})

test('good news is green, a warning is amber and the neutral outcomes are grey', () => {
  // Check the background, the text and the border all follow the same colour.
  const palette = (status, colour) => ['bg', 'text', 'border'].every((part) => STANDING[status].className.includes(`${part}-${colour}-`))
  for (const status of ['LEADING', 'WON']) assert.ok(palette(status, 'green'), status)
  assert.ok(palette('OUTBID', 'amber'))
  for (const status of ['LOST', 'CANCELLED', 'PENDING']) assert.ok(palette(status, 'gray'), status)
})

test('a status the API does not know is simply missing', () => {
  assert.equal(STANDING.UNKNOWN, undefined)
})
