// Pure helpers for the cart badge in the header, kept apart from React so `npm test` can cover them.

// The name of the browser event the cart API fires after it changed the cart, so the header (which lives far from
// the page that did the change) can read the cart again.
export const CART_CHANGED = 'cart:changed'

// How many things are in the cart (quantities added up, not lines) and what they cost. A missing or empty cart is
// zero of both. The total is the server's own figure when it sent one, else the sum of the line subtotals.
export function cartSummary(cart) {
  const items = Array.isArray(cart?.items) ? cart.items : []
  const count = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
  const fromLines = items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0)
  const total = Number.isFinite(Number(cart?.totalAmount)) && cart?.totalAmount != null ? Number(cart.totalAmount) : fromLines
  return { count, total }
}
