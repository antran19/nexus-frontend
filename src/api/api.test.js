import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// The api modules say which URL, method and parameters each call uses. Nothing here touches the network: the methods
// of the shared axios instance are replaced by ones that record the call. Vite loads the modules the way the app does
// (extension-less imports, import.meta.env), which plain Node cannot.

let server
let apiClient
let calls

const api = {}

before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'silent' })
  ;({ apiClient } = await server.ssrLoadModule('/src/api/client.js'))
  for (const name of ['orders', 'auth', 'cart', 'auctions', 'products', 'categories', 'users', 'sellerRequests', 'ratings', 'notifications', 'wishlist']) {
    api[name] = await server.ssrLoadModule(`/src/api/${name}.js`)
  }
  globalThis.window = new EventTarget() // the cart and checkout calls announce the change to the page
})

after(async () => {
  delete globalThis.window
  await server.close()
})

function record() {
  calls = []
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    apiClient[method] = (url, ...rest) => {
      calls.push({ method, url, rest })
      return Promise.resolve({ data: {} })
    }
  }
}

async function callOnce(run) {
  record()
  await run()
  assert.equal(calls.length, 1, 'exactly one request is sent')
  return calls[0]
}

test('every order call goes to its own url with the method and parameters the backend expects', async () => {
  const o = () => api.orders
  const cases = [
    ['setShippingAddress', () => o().setShippingAddress('o1', { city: 'HCM' }), 'put', '/api/v1/orders/o1/shipping-address', [{ city: 'HCM' }]],
    ['setPaymentMethod', () => o().setPaymentMethod('o1', 'CASH'), 'put', '/api/v1/orders/o1/payment-method', [{ paymentMethod: 'CASH' }]],
    ['confirmCashPayment', () => o().confirmCashPayment('o1'), 'post', '/api/v1/orders/o1/confirm-cash', []],
    ['createCheckoutSession', () => o().createCheckoutSession('o1', 'http://ok', 'http://no'), 'post', '/api/v1/orders/o1/checkout-session', [{ successUrl: 'http://ok', cancelUrl: 'http://no' }]],
    ['confirmPayment', () => o().confirmPayment('o1', 'cs_1'), 'post', '/api/v1/orders/o1/confirm-payment', [{ sessionId: 'cs_1' }]],
    ['cancelOrder', () => o().cancelOrder('o1'), 'post', '/api/v1/orders/o1/cancel', []],
    ['getInvoice', () => o().getInvoice('o1'), 'get', '/api/v1/orders/o1/invoice', []],
    ['getSellingOrders', () => o().getSellingOrders(), 'get', '/api/v1/orders/selling', []],
    ['getCarriers', () => o().getCarriers(), 'get', '/api/v1/orders/carriers', []],
    ['confirmOrderReceived', () => o().confirmOrderReceived('o1'), 'post', '/api/v1/orders/o1/confirm-received', []],
    ['refundOrder', () => o().refundOrder('o1', 'Hàng lỗi'), 'post', '/api/v1/orders/o1/refund', [{ reason: 'Hàng lỗi' }]],
    ['createReturnRequest', () => o().createReturnRequest('o1', 'Trả hàng'), 'post', '/api/v1/orders/o1/returns', [{ reason: 'Trả hàng' }]],
    ['receiveReturn', () => o().receiveReturn('r1'), 'post', '/api/v1/returns/r1/receive', []],
    ['rejectReturn', () => o().rejectReturn('r1'), 'post', '/api/v1/returns/r1/reject', []],
  ]
  for (const [name, run, method, url, rest] of cases) {
    const call = await callOnce(run)
    assert.equal(call.method, method, `${name}: method`)
    assert.equal(call.url, url, `${name}: url`)
    assert.deepEqual(call.rest, rest, `${name}: body and options`)
  }
})

test('the order lists send the page and filters as query parameters', async () => {
  const params = { page: 1, size: 20, status: 'PAID', from: '2026-11-01T00:00:00.000Z' }
  const mine = await callOnce(() => api.orders.getMyOrders(params))
  const all = await callOnce(() => api.orders.getAllOrders(params))

  assert.deepEqual([mine.method, mine.url, mine.rest], ['get', '/api/v1/orders/me', [{ params }]])
  assert.deepEqual([all.method, all.url, all.rest], ['get', '/api/v1/orders', [{ params }]])
})

test('listing return requests asks for the open ones unless told otherwise', async () => {
  assert.deepEqual((await callOnce(() => api.orders.listReturnRequests())).rest, [{ params: { status: 'REQUESTED' } }])
  assert.deepEqual((await callOnce(() => api.orders.listReturnRequests('RECEIVED'))).rest, [{ params: { status: 'RECEIVED' } }])
})

test('shipping an order sends the carrier only when one was chosen', async () => {
  const chosen = await callOnce(() => api.orders.markOrderShipped('o1', 'GHN'))
  const none = await callOnce(() => api.orders.markOrderShipped('o1'))

  assert.equal(chosen.url, '/api/v1/orders/o1/mark-shipped')
  assert.deepEqual(chosen.rest, [undefined, { params: { carrier: 'GHN' } }])
  assert.deepEqual(none.rest, [undefined, { params: undefined }])
})

test('starting a checkout sends the idempotency key and tells the page the cart changed', async () => {
  const { CART_CHANGED } = await server.ssrLoadModule('/src/utils/cartSummary.js')
  let announced = 0
  window.addEventListener(CART_CHANGED, () => { announced += 1 })

  const call = await callOnce(() => api.orders.startCheckout('key-123'))

  assert.deepEqual([call.method, call.url], ['post', '/api/v1/checkout'])
  assert.deepEqual(call.rest, [null, { headers: { 'Idempotency-Key': 'key-123' } }])
  assert.equal(announced, 1, 'the cart change was announced once')
})

test('the cart calls change the cart and announce it; reading it announces nothing', async () => {
  const { CART_CHANGED } = await server.ssrLoadModule('/src/utils/cartSummary.js')
  let announced = 0
  window.addEventListener(CART_CHANGED, () => { announced += 1 })

  const add = await callOnce(() => api.cart.addToCart('p1', 2))
  const addDefault = await callOnce(() => api.cart.addToCart('p1'))
  const update = await callOnce(() => api.cart.updateCartItem('p1', 3))
  const remove = await callOnce(() => api.cart.removeCartItem('p1'))
  assert.equal(announced, 4)
  const read = await callOnce(() => api.cart.getCart())
  assert.equal(announced, 4)

  assert.deepEqual([add.method, add.url, add.rest], ['post', '/api/v1/carts/items', [{ productId: 'p1', quantity: 2 }]])
  assert.deepEqual(addDefault.rest, [{ productId: 'p1', quantity: 1 }])
  assert.deepEqual([update.method, update.url, update.rest], ['put', '/api/v1/carts/items/p1', [{ quantity: 3 }]])
  assert.deepEqual([remove.method, remove.url], ['delete', '/api/v1/carts/items/p1'])
  assert.deepEqual([read.method, read.url], ['get', '/api/v1/carts/me'])
})

test('the auth calls send only what the backend reads', async () => {
  const login = await callOnce(() => api.auth.login({ email: 'a@b.c', password: 'secret', extra: 'ignored' }))
  const forgot = await callOnce(() => api.auth.forgotPassword('a@b.c'))
  const reset = await callOnce(() => api.auth.resetPassword({ token: 't', newPassword: 'n', confirmNewPassword: 'n' }))
  const change = await callOnce(() => api.auth.changePassword({ oldPassword: 'o', newPassword: 'n', confirmNewPassword: 'n' }))

  assert.deepEqual([login.url, login.rest], ['/api/v1/auth/login', [{ email: 'a@b.c', password: 'secret' }]])
  assert.deepEqual([forgot.url, forgot.rest], ['/api/v1/auth/forgot-password', [{ email: 'a@b.c' }]])
  assert.deepEqual([reset.url, reset.rest], ['/api/v1/auth/reset-password', [{ token: 't', newPassword: 'n', confirmNewPassword: 'n' }]])
  assert.deepEqual([change.method, change.url], ['put', '/api/v1/users/me/password'])
})

test('registering leaves out the optional phone and birth date when they are empty', async () => {
  const full = await callOnce(() => api.auth.register({
    fullName: 'An', email: 'a@b.c', password: 'p', confirmPassword: 'p', phone: '0912345678', birthDate: '2000-05-20',
    termsAccepted: true, escrowAcknowledged: true,
  }))
  const bare = await callOnce(() => api.auth.register({
    fullName: 'An', email: 'a@b.c', password: 'p', confirmPassword: 'p', phone: '', birthDate: '', termsAccepted: true, escrowAcknowledged: true,
  }))

  assert.equal(full.url, '/api/v1/users/register')
  assert.equal(full.rest[0].phone, '0912345678')
  assert.equal(full.rest[0].birthDate, '2000-05-20')
  assert.equal(bare.rest[0].phone, undefined)
  assert.equal(bare.rest[0].birthDate, undefined)
  assert.equal(bare.rest[0].termsAccepted, true)
})

test('the auction calls', async () => {
  const a = () => api.auctions
  const cases = [
    [() => a().getAuctionsByProduct('p1'), 'get', '/api/v1/auctions', [{ params: { productId: 'p1' } }]],
    [() => a().getAuction('a1'), 'get', '/api/v1/auctions/a1', []],
    [() => a().getBidHistory('a1'), 'get', '/api/v1/auctions/a1/bids', []],
    [() => a().placeBid('a1', 130000), 'post', '/api/v1/auctions/a1/bids', [{ amount: 130000 }]],
    [() => a().getMyAutoBid('a1'), 'get', '/api/v1/auctions/a1/auto-bid', []],
    [() => a().setAutoBid('a1', 500000), 'put', '/api/v1/auctions/a1/auto-bid', [{ maxAmount: 500000 }]],
    [() => a().createAuction({ productId: 'p1' }), 'post', '/api/v1/auctions', [{ productId: 'p1' }]],
    [() => a().getMyBidding(1, 10), 'get', '/api/v1/auctions/mine/bidding', [{ params: { page: 1, size: 10 } }]],
    [() => a().getMySelling({ status: 'ACTIVE', page: 0, size: 5 }), 'get', '/api/v1/auctions/mine/selling', [{ params: { status: 'ACTIVE', page: 0, size: 5 } }]],
    [() => a().getMySelling({ status: '', page: 0, size: 5 }), 'get', '/api/v1/auctions/mine/selling', [{ params: { status: undefined, page: 0, size: 5 } }]],
    [() => a().getWatchlist(2), 'get', '/api/v1/auctions/mine/watchlist', [{ params: { page: 2 } }]],
    [() => a().getWatchStatus('a1'), 'get', '/api/v1/auctions/mine/watchlist/a1', []],
    [() => a().followAuction('a1'), 'put', '/api/v1/auctions/mine/watchlist/a1', []],
    [() => a().unfollowAuction('a1'), 'delete', '/api/v1/auctions/mine/watchlist/a1', []],
  ]
  for (const [run, method, url, rest] of cases) {
    const call = await callOnce(run)
    assert.deepEqual([call.method, call.url, call.rest], [method, url, rest])
  }
})

test('the product, category, user, seller request, rating and notification calls', async () => {
  const cases = [
    [() => api.products.getDiscoverProducts(), 'get', '/api/v1/products/discover'],
    [() => api.products.getProductById('p1'), 'get', '/api/v1/products/p1'],
    [() => api.categories.getCategories(), 'get', '/api/v1/categories'],
    [() => api.categories.createCategory({ name: 'x' }), 'post', '/api/v1/categories'],
    [() => api.categories.updateCategory('c1', { name: 'y' }), 'put', '/api/v1/categories/c1'],
    [() => api.categories.deleteCategory('c1'), 'delete', '/api/v1/categories/c1'],
    [() => api.users.getMyProfile(), 'get', '/api/v1/users/me'],
    [() => api.users.updateMyProfile({ fullName: 'An', phone: '0912345678', ignored: 1 }), 'put', '/api/v1/users/me'],
    [() => api.users.getUserById('u1'), 'get', '/api/v1/users/u1'],
    [() => api.users.getUsers(), 'get', '/api/v1/users'],
    [() => api.users.getPenalties('u1'), 'get', '/api/v1/users/u1/reputation/penalties'],
    [() => api.users.getAdjustments('u1'), 'get', '/api/v1/users/u1/reputation/adjustments'],
    [() => api.users.adjustReputation('u1', { delta: -5, reason: 'x' }), 'post', '/api/v1/users/u1/reputation/adjust'],
    [() => api.sellerRequests.requestSellerUpgrade(), 'post', '/api/v1/users/me/seller-requests'],
    [() => api.sellerRequests.listSellerRequests(), 'get', '/api/v1/users/seller-requests'],
    [() => api.sellerRequests.approveSellerRequest('s1'), 'post', '/api/v1/users/seller-requests/s1/approve'],
    [() => api.sellerRequests.rejectSellerRequest('s1'), 'post', '/api/v1/users/seller-requests/s1/reject'],
    [() => api.ratings.getReputation('u1'), 'get', '/api/v1/users/u1/reputation'],
    [() => api.ratings.rateTransaction({ ratedUserId: 'u1', transactionType: 'ORDER', transactionId: 'o1', score: 5, comment: 'tốt' }), 'post', '/api/v1/ratings'],
    [() => api.notifications.getMyNotifications(), 'get', '/api/v1/notifications/me'],
    [() => api.notifications.getUnreadCount(), 'get', '/api/v1/notifications/me/unread-count'],
    [() => api.notifications.markNotificationRead('n1'), 'patch', '/api/v1/notifications/n1/read'],
    [() => api.notifications.markAllNotificationsRead(), 'patch', '/api/v1/notifications/me/read-all'],
  ]
  for (const [run, method, url] of cases) {
    const call = await callOnce(run)
    assert.deepEqual([call.method, call.url], [method, url])
  }
  assert.deepEqual((await callOnce(() => api.users.updateMyProfile({ fullName: 'An', phone: '1', ignored: 1 }))).rest, [{ fullName: 'An', phone: '1' }])
  assert.deepEqual((await callOnce(() => api.notifications.getMyNotifications())).rest, [{ params: { unread: false, page: 0, size: 10 } }])
  assert.deepEqual((await callOnce(() => api.sellerRequests.listSellerRequests())).rest, [{ params: { status: 'PENDING' } }])
})

test('the wishlist calls', async () => {
  const w = () => api.wishlist
  const cases = [
    [() => w().getWishlist(2, 10), 'get', '/api/v1/wishlist/me', [{ params: { page: 2, size: 10 } }]],
    [() => w().getWishlist(), 'get', '/api/v1/wishlist/me', [{ params: { page: 0, size: 20 } }]],
    [() => w().getWishlistStatus('p1'), 'get', '/api/v1/wishlist/p1', []],
    [() => w().addToWishlist('p1'), 'put', '/api/v1/wishlist/p1', []],
    [() => w().removeFromWishlist('p1'), 'delete', '/api/v1/wishlist/p1', []],
  ]
  for (const [run, method, url, rest] of cases) {
    const call = await callOnce(run)
    assert.deepEqual([call.method, call.url, call.rest], [method, url, rest])
  }
})

test('the shared client adds the token to every request and hands over the payload without its envelope', async () => {
  const stored = new Map([['token', 'jwt-123']])
  globalThis.localStorage = { getItem: (key) => stored.get(key) ?? null }
  try {
    const [request] = apiClient.interceptors.request.handlers.filter(Boolean)
    const [response] = apiClient.interceptors.response.handlers.filter(Boolean)

    assert.equal(request.fulfilled({ headers: {} }).headers.Authorization, 'Bearer jwt-123')
    stored.delete('token')
    assert.equal(request.fulfilled({ headers: {} }).headers.Authorization, undefined)

    const unwrapped = response.fulfilled({ data: { success: true, data: { id: 'o1' }, error: null } })
    assert.deepEqual(unwrapped.data, { id: 'o1' })
  } finally {
    delete globalThis.localStorage
  }
})
