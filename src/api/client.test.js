import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, test } from 'node:test'
import { AxiosError } from 'axios'
import { createServer } from 'vite'

// The shared client renews an expired access token behind the scenes. Nothing here touches the network: the client's
// adapter is replaced by a small fake server that accepts only the token it was told is current, and a fake
// localStorage stands in for the browser's.

let server
let apiClient
let onSessionEnded
let onTokenRefreshed
let storage
let requests
let sessionEnded
let refreshed
let unregister = []

const envelope = (data) => ({ success: true, data, error: null })

// How the fake server behaves; each test sets what it needs.
let serverState

function respond(config, status, body) {
  const response = { status, statusText: String(status), headers: {}, config, data: body }
  if (status >= 200 && status < 300) return Promise.resolve(response)
  return Promise.reject(new AxiosError(`status ${status}`, 'ERR_BAD_REQUEST', config, null, response))
}

async function fakeServer(config) {
  requests.push({ method: config.method, url: config.url, authorization: config.headers.Authorization ?? null })
  await serverState.gate?.(config)
  if (config.url === '/api/v1/auth/refresh') {
    serverState.refreshCalls += 1
    if (serverState.refreshFailure === 'network') return Promise.reject(new AxiosError('offline', 'ERR_NETWORK', config))
    if (serverState.refreshFailure === 'refused') return respond(config, 401, { success: false })
    const { refreshToken } = JSON.parse(config.data)
    assert.equal(refreshToken, serverState.validRefreshToken, 'the stored refresh token is the one sent')
    return respond(config, 200, envelope({ token: 'new-access', refreshToken: 'new-refresh' }))
  }
  if (config.url === '/api/v1/auth/login') return respond(config, 401, { success: false })
  return config.headers.Authorization === `Bearer ${serverState.validAccessToken}`
    ? respond(config, 200, envelope({ ok: true, url: config.url }))
    : respond(config, 401, { success: false })
}

before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'silent' })
  ;({ apiClient, onSessionEnded, onTokenRefreshed } = await server.ssrLoadModule('/src/api/client.js'))
  apiClient.defaults.adapter = fakeServer
})

after(async () => {
  await server.close()
})

beforeEach(() => {
  storage = new Map([['token', 'old-access'], ['refreshToken', 'old-refresh']])
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  }
  requests = []
  sessionEnded = 0
  refreshed = []
  serverState = { validAccessToken: 'new-access', validRefreshToken: 'old-refresh', refreshCalls: 0 }
  unregister = [onSessionEnded(() => { sessionEnded += 1 }), onTokenRefreshed((token) => refreshed.push(token))]
})

afterEach(() => {
  unregister.forEach((off) => off())
  delete globalThis.localStorage
})

test('an expired access token is renewed and the request is sent again, without the caller noticing', async () => {
  const { data } = await apiClient.get('/api/v1/orders')

  assert.deepEqual(data, { ok: true, url: '/api/v1/orders' })
  assert.deepEqual(requests.map((r) => [r.url, r.authorization]), [
    ['/api/v1/orders', 'Bearer old-access'],
    ['/api/v1/auth/refresh', null],
    ['/api/v1/orders', 'Bearer new-access'],
  ])
  assert.equal(storage.get('token'), 'new-access')
  assert.equal(storage.get('refreshToken'), 'new-refresh')
  assert.deepEqual(refreshed, ['new-access'])
  assert.equal(sessionEnded, 0)
})

test('requests that all hit the expired token at once wait for one single refresh', async () => {
  const results = await Promise.all([apiClient.get('/a'), apiClient.get('/b'), apiClient.get('/c')])

  assert.deepEqual(results.map((r) => r.data.url), ['/a', '/b', '/c'])
  assert.equal(serverState.refreshCalls, 1)
  assert.equal(sessionEnded, 0)
})

test('a request that was sent with the old token and fails after the token was replaced is simply sent again', async () => {
  let release
  const held = new Promise((resolve) => { release = resolve })
  serverState.gate = (config) => (config.url === '/slow' ? held : undefined)

  const slow = apiClient.get('/slow') // leaves with old-access and waits at the server
  await new Promise((resolve) => setImmediate(resolve))
  storage.set('token', 'new-access') // meanwhile another request renewed the token
  storage.set('refreshToken', 'new-refresh')
  release()

  assert.deepEqual((await slow).data, { ok: true, url: '/slow' })
  assert.equal(serverState.refreshCalls, 0, 'no second refresh: the new refresh token is already in use')
  assert.equal(sessionEnded, 0)
})

test('when the refresh token is refused the session ends and the original failure is reported', async () => {
  serverState.refreshFailure = 'refused'

  await assert.rejects(apiClient.get('/api/v1/orders'), (error) => error.response.status === 401)

  assert.equal(sessionEnded, 1)
  assert.equal(storage.has('refreshToken'), false)
})

test('when the refresh cannot be asked at all (offline) the session is kept', async () => {
  serverState.refreshFailure = 'network'

  await assert.rejects(apiClient.get('/api/v1/orders'))

  assert.equal(sessionEnded, 0)
  assert.equal(storage.get('refreshToken'), 'old-refresh')
})

test('without a refresh token a 401 ends the session at once, as before', async () => {
  storage.delete('refreshToken')

  await assert.rejects(apiClient.get('/api/v1/orders'), (error) => error.response.status === 401)

  assert.equal(sessionEnded, 1)
  assert.equal(serverState.refreshCalls, 0)
})

test('a request that still gets 401 after the renewal is not renewed again, and ends the session', async () => {
  serverState.validAccessToken = 'nothing-matches'

  await assert.rejects(apiClient.get('/api/v1/orders'), (error) => error.response.status === 401)

  assert.equal(serverState.refreshCalls, 1)
  assert.equal(sessionEnded, 1)
})

test('a wrong password at login is just a failed login: no refresh, no session ending', async () => {
  storage.delete('token')
  storage.delete('refreshToken')

  await assert.rejects(apiClient.post('/api/v1/auth/login', { email: 'a@b.c', password: 'x' }))

  assert.equal(serverState.refreshCalls, 0)
  assert.equal(sessionEnded, 0)
})

test('the logout call never starts a refresh or ends the session, even when it fails', async () => {
  serverState.validAccessToken = 'something-else'

  await assert.rejects(apiClient.post('/api/v1/auth/logout', {}, { skipSessionHandling: true }))

  assert.equal(serverState.refreshCalls, 0)
  assert.equal(sessionEnded, 0)
})
