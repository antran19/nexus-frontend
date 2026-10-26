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
