// Pure helpers for the seller's overview page, kept apart from React so `npm test` can cover them.
import { saleOutcome, summarizeSelling } from './mySelling.js'
import { MAX_TODO, formatMoney } from './dashboard.js'
import { myTotal, ORDER_TABS } from './sellerOrders.js'

const tab = (value) => ORDER_TABS.find((entry) => entry.value === value)

// My auctions counted by where they stand: live ones with the bids they drew, and what the finished ones left me:
// sold and paid, sold and waiting for the buyer (some of them overdue), or nobody bought.
export function sellingStats(items, now = new Date()) {
  const outcomes = items.map((item) => saleOutcome(item, now))
  const count = (kind) => outcomes.filter((outcome) => outcome?.kind === kind).length
  return {
    ...summarizeSelling(items),
    pending: items.filter((item) => item.status === 'PENDING').length,
    paid: count('PAID'),
    awaitingPayment: count('AWAITING_PAYMENT'),
    overdue: count('OVERDUE'),
    unsold: count('NO_WINNER'),
  }
}

// My orders: what to ship, what is shipped, and the money of MY lines only (an order can hold other sellers' lines):
// paid in total, and still waiting for the buyer.
export function orderStatsForSeller(orders, sellerId) {
  const sum = (list) => list.reduce((total, order) => total + myTotal(order, sellerId), 0)
  const paid = orders.filter((order) => order.status === 'PAID')
  const awaiting = orders.filter(tab('AWAITING').matches)
  return {
    toShip: orders.filter(tab('TO_SHIP').matches).length,
    shipped: orders.filter(tab('SHIPPED').matches).length,
    revenue: sum(paid),
    awaitingAmount: sum(awaiting),
  }
}

// What the seller has to do now, most urgent first: orders to ship (the buyer has paid), then auctions whose buyer
// is past the payment deadline. Cut to MAX_TODO.
export function sellerTodo({ items = [], orders = [] }, sellerId, now = new Date()) {
  const ship = orders.filter(tab('TO_SHIP').matches).map((order) => ({
    key: `ship-${order.id}`,
    tone: 'ship',
    text: `Đơn #${String(order.id).slice(0, 8)} đã thanh toán ${formatMoney(myTotal(order, sellerId))}, cần giao`,
    to: '/me/selling/orders',
  }))
  const overdue = items
    .filter((item) => saleOutcome(item, now)?.kind === 'OVERDUE')
    .map((item) => ({
      key: `late-${item.auctionId}`,
      tone: 'late',
      text: `Người thắng ${item.productName || 'một phiên'} đã quá hạn thanh toán ${formatMoney(item.finalPrice)}`,
      to: '/me/selling',
    }))
  return [...ship, ...overdue].slice(0, MAX_TODO)
}
