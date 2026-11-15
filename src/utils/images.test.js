import assert from 'node:assert/strict'
import test from 'node:test'
import { productImages, resolveProductImage, SCENE_FALLBACKS } from './images.js'

test('productImages lists the pictures once each and skips empty ones', () => {
  const product = { id: 'p1', imageUrls: ['https://x/a.jpg', '', null, 'https://x/b.jpg', 'https://x/a.jpg', '  '] }
  assert.deepEqual(productImages(product), ['https://x/a.jpg', 'https://x/b.jpg'])
})

test('a product without pictures gets the same stand-in as the list', () => {
  const product = { id: 'p1', imageUrls: [] }
  assert.deepEqual(productImages(product), [resolveProductImage(product)])
  assert.ok(SCENE_FALLBACKS.includes(productImages({ id: 'p2' })[0]))
  assert.equal(productImages(null).length, 1)
})
