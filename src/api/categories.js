import { apiClient } from './client'

export function getCategories() {
  return apiClient.get('/api/v1/categories')
}
