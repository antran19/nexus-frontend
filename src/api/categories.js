import { apiClient } from './client'

export function getCategories() {
  return apiClient.get('/api/v1/categories')
}

export function createCategory(body) {
  return apiClient.post('/api/v1/categories', body)
}

export function updateCategory(id, body) {
  return apiClient.put(`/api/v1/categories/${id}`, body)
}

export function deleteCategory(id) {
  return apiClient.delete(`/api/v1/categories/${id}`)
}
