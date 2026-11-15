import assert from 'node:assert/strict'
import test from 'node:test'
import { isTokenExpired, readStoredSession, returnPath, shouldEndSession, tokenExpiresAt } from './session.js'

const NOW = Date.UTC(2026, 10, 15, 12, 0, 0)
const b64 = (object) => Buffer.from(JSON.stringify(object)).toString('base64url')
const tokenWith = (payload) => `${b64({ alg: 'HS256' })}.${b64(payload)}.signature`
const valid = tokenWith({ exp: NOW / 1000 + 3600 })
const expired = tokenWith({ exp: NOW / 1000 - 60 })

test('the expiry is read from the exp claim, in milliseconds', () => {
  assert.equal(tokenExpiresAt(valid), NOW + 3600 * 1000)
  assert.equal(tokenExpiresAt(tokenWith({ role: 'BUYER' })), null)
  assert.equal(tokenExpiresAt('not-a-token'), null)
  assert.equal(tokenExpiresAt(null), null)
})

test('a token is expired only when its exp has passed', () => {
  assert.equal(isTokenExpired(valid, NOW), false)
  assert.equal(isTokenExpired(expired, NOW), true)
  assert.equal(isTokenExpired(tokenWith({ exp: NOW / 1000 }), NOW), true)
  assert.equal(isTokenExpired(tokenWith({ role: 'BUYER' }), NOW), false)
  assert.equal(isTokenExpired('garbage', NOW), false)
})

test('the stored session keeps a good token and drops an expired one, remembering why', () => {
  assert.deepEqual(readStoredSession(null, NOW), { token: null, expired: false })
  assert.deepEqual(readStoredSession(valid, NOW), { token: valid, expired: false })
  assert.deepEqual(readStoredSession(expired, NOW), { token: null, expired: true })
})

test('only a 401 on a request that carried the current token ends the session', () => {
  const failure = (status, header) => ({ response: { status }, config: { headers: { Authorization: header } } })
  assert.equal(shouldEndSession(failure(401, 'Bearer abc'), 'abc'), true)
  assert.equal(shouldEndSession(failure(403, 'Bearer abc'), 'abc'), false)
  assert.equal(shouldEndSession(failure(500, 'Bearer abc'), 'abc'), false)
  // wrong password at login: a 401 but no token was sent
  assert.equal(shouldEndSession(failure(401, undefined), 'abc'), false)
  // answer to a request sent with an older token, after a new login
  assert.equal(shouldEndSession(failure(401, 'Bearer old'), 'new'), false)
  // already signed out
  assert.equal(shouldEndSession(failure(401, 'Bearer abc'), null), false)
  assert.equal(shouldEndSession(new Error('network'), 'abc'), false)
})

test('the return path keeps the query', () => {
  assert.equal(returnPath({ pathname: '/admin/users', search: '?q=an' }), '/admin/users?q=an')
  assert.equal(returnPath({ pathname: '/me' }), '/me')
})
