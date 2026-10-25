import { apiClient } from './client'

export function getCart() {
  return apiClient.get('/api/v1/carts/me')
}

export function addToCart(productId, quantity = 1) {
  return apiClient.post('/api/v1/carts/items', { productId, quantity })
}

export function updateCartItem(productId, quantity) {
  return apiClient.put(`/api/v1/carts/items/${productId}`, { quantity })
}

export function removeCartItem(productId) {
  return apiClient.delete(`/api/v1/carts/items/${productId}`)
}
