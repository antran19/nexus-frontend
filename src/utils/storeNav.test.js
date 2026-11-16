import assert from 'node:assert/strict'
import test from 'node:test'
import { displayUserName, navLinks, roleLabel, searchPath, sellEntry } from './storeNav.js'

const paths = (user) => navLinks(user).map((link) => link.to)

test('a visitor sees only the product list', () => {
  assert.deepEqual(paths(null), ['/products'])
})

test('a buyer sees their auctions and orders but nothing for selling or admin', () => {
  assert.deepEqual(paths({ role: 'BUYER' }), ['/products', '/me/dashboard', '/me/bidding', '/me/orders', '/me'])
})

test('a seller also sees the auctions they run and the orders to ship', () => {
  assert.deepEqual(paths({ role: 'SELLER' }), ['/products', '/me/dashboard', '/me/bidding', '/me/orders', '/me/selling/dashboard', '/me/selling', '/me/selling/orders', '/me'])
})

test('an admin sees every page, support staff only the order and user pages', () => {
  assert.ok(paths({ role: 'ADMIN' }).includes('/admin/seller-requests'))
  assert.ok(paths({ role: 'ADMIN' }).includes('/me/selling'))
  assert.ok(!paths({ role: 'ADMIN' }).includes('/me/selling/dashboard'))
  const support = paths({ role: 'SUPPORT_STAFF' })
  assert.ok(support.includes('/admin/orders') && support.includes('/admin/users'))
  assert.ok(!support.includes('/admin/seller-requests') && !support.includes('/me/selling'))
})

test('the amber button leads sellers to their channel and others to the sign-up steps', () => {
  assert.equal(sellEntry({ role: 'SELLER' }).to, '/me/selling')
  assert.equal(sellEntry({ role: 'BUYER' }).to, '/register/seller')
  assert.equal(sellEntry(null).to, '/register/seller')
})

test('searchPath keeps only what is filled in', () => {
  assert.equal(searchPath({}), '/products')
  assert.equal(searchPath({ q: '  đồng hồ ' }), '/products?q=%C4%91%E1%BB%93ng+h%E1%BB%93')
  assert.equal(searchPath({ q: '', categoryId: 'c1' }), '/products?categoryId=c1')
  assert.equal(searchPath({ q: 'a', categoryId: 'c1' }), '/products?q=a&categoryId=c1')
})

test('the name falls back to the email, never to an id', () => {
  assert.equal(displayUserName({ fullName: 'An' }), 'An')
  assert.equal(displayUserName({ sub: 'an@example.com' }), 'an')
  assert.equal(displayUserName({ sub: '2548b5ec-0000-0000-0000-000000000000' }), 'Tài khoản')
  assert.equal(displayUserName(null), 'Tài khoản')
})

test('roleLabel is empty for an unknown role', () => {
  assert.equal(roleLabel({ role: 'SELLER' }), 'Người bán')
  assert.equal(roleLabel({ role: 'X' }), '')
})
