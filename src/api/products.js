import { apiClient } from './client'

// Real search/list endpoint is the base path with query params -- there is
// no separate /products/search route in catalog-service.
export function getProducts({ q, categoryId, status, page, size } = {}) {
  return apiClient.get('/api/v1/products', {
    params: { q, categoryId, status, page, size },
  })
}

export function getDiscoverProducts() {
  return apiClient.get('/api/v1/products/discover')
}

export function getProductById(id) {
  return apiClient.get(`/api/v1/products/${id}`)
}
