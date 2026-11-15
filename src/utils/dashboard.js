// Pure helpers for the buyer's overview page, kept apart from React so `npm test` can cover them.
import { FILTERS } from './myBidding.js'
import { canPay, orderState } from './myOrders.js'

export const MAX_TODO = 6

export const formatMoney = (value) => `${Number(value).toLocaleString('vi-VN')} đ`

const shortId = (id) => String(id ?? '').slice(0, 8)

// The amount of an order: the orders endpoint calls it totalAmount.
export const orderTotal = (order) => Number(order.totalAmount) || 0

// The auctions I have bid in, counted by where I stand: live ones (leading or outbid) and how many of those I lead,
// the ones where I was outbid, and the ones I won.
export function biddingStats(items) {
  const live = items.filter(FILTERS.ACTIVE.matches)
  return {
    live: live.length,
    leading: live.filter((item) => item.myStatus === 'LEADING').length,
    outbid: items.filter((item) => item.myStatus === 'OUTBID').length,
    won: items.filter((item) => item.myStatus === 'WON').length,
  }
}

// My orders counted the way the orders page groups them, plus the money still to pay.
export function orderStats(orders) {
  const awaiting = orders.filter(canPay)
  return {
    awaiting: awaiting.length,
    awaitingTotal: awaiting.reduce((sum, order) => sum + orderTotal(order), 0),
    preparing: orders.filter((order) => orderState(order).key === 'PREPARING').length,
    shipped: orders.filter((order) => orderState(order).key === 'SHIPPED').length,
  }
}

// What the person has to do now, most urgent first: orders waiting for payment (money, and an unpaid auction order
// expires), then auctions where they were outbid. Cut to MAX_TODO so the box stays short.
export function todoItems({ bidding = [], orders = [] }) {
  const pay = orders.filter(canPay).map((order) => ({
    key: `order-${order.id}`,
    tone: 'pay',
    text: `Đơn #${shortId(order.id)} chờ thanh toán ${formatMoney(orderTotal(order))}`,
    to: '/me/orders',
  }))
  const outbid = bidding
    .filter((item) => item.myStatus === 'OUTBID')
    .map((item) => ({
      key: `bid-${item.auctionId}`,
      tone: 'outbid',
      text: `Bạn bị vượt giá ở ${item.productName || 'một phiên đấu giá'}`,
      to: `/products/${item.productId}`,
    }))
  return [...pay, ...outbid].slice(0, MAX_TODO)
}
