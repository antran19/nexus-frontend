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
