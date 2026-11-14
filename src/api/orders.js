import { apiClient } from './client'

// idempotencyKey: one UUID per "open the checkout page"; sending the same value again returns the
// order created the first time instead of a second one (API.md 6.4).
export function startCheckout(idempotencyKey) {
  return apiClient.post('/api/v1/checkout', null, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
}

export function setShippingAddress(orderId, address) {
  return apiClient.put(`/api/v1/orders/${orderId}/shipping-address`, address)
}

export function createCheckoutSession(orderId, successUrl, cancelUrl) {
  return apiClient.post(`/api/v1/orders/${orderId}/checkout-session`, { successUrl, cancelUrl })
}

export function confirmPayment(orderId, sessionId) {
  return apiClient.post(`/api/v1/orders/${orderId}/confirm-payment`, { sessionId })
}

export function cancelOrder(orderId) {
  return apiClient.post(`/api/v1/orders/${orderId}/cancel`)
}

// Seller: every order that holds at least one of my products, in any status, newest first (commerce-service).
export function getSellingOrders() {
  return apiClient.get('/api/v1/orders/selling')
}

// Seller: "I shipped this". Only a PAID order that has not been shipped yet; answers the order with shippedAt set.
export function markOrderShipped(orderId) {
  return apiClient.post(`/api/v1/orders/${orderId}/mark-shipped`)
}

// Buyer: every order I placed, in any status (commerce-service). Orders won at an auction are in it too.
export function getMyOrders() {
  return apiClient.get('/api/v1/orders/me')
}

// Staff (admin, support): every order of every buyer, any status (commerce-service).
export function getAllOrders() {
  return apiClient.get('/api/v1/orders')
}

// Staff: refunds a PAID order and sends the money back through the payment provider. The reason is required.
export function refundOrder(orderId, reason) {
  return apiClient.post(`/api/v1/orders/${orderId}/refund`, { reason })
}

// Staff: opens a return request for an order that was shipped and refunded. Answers { id, orderId, reason, status, ... }.
export function createReturnRequest(orderId, reason) {
  return apiClient.post(`/api/v1/orders/${orderId}/returns`, { reason })
}

// Staff: return requests in one status (REQUESTED, RECEIVED or REJECTED), newest first.
export function listReturnRequests(status = 'REQUESTED') {
  return apiClient.get('/api/v1/returns', { params: { status } })
}

// Staff: the goods came back; the stock is restocked.
export function receiveReturn(returnId) {
  return apiClient.post(`/api/v1/returns/${returnId}/receive`)
}

export function rejectReturn(returnId) {
  return apiClient.post(`/api/v1/returns/${returnId}/reject`)
}
