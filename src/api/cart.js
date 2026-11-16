import { CART_CHANGED } from '../utils/cartSummary'
import { apiClient } from './client'

// After a change that went through, tell the rest of the page (the header badge) that the cart is different now.
const announce = (response) => {
  window.dispatchEvent(new Event(CART_CHANGED))
  return response
}

export function getCart() {
  return apiClient.get('/api/v1/carts/me')
}

export function addToCart(productId, quantity = 1) {
  return apiClient.post('/api/v1/carts/items', { productId, quantity }).then(announce)
}

export function updateCartItem(productId, quantity) {
  return apiClient.put(`/api/v1/carts/items/${productId}`, { quantity }).then(announce)
}

export function removeCartItem(productId) {
  return apiClient.delete(`/api/v1/carts/items/${productId}`).then(announce)
}
