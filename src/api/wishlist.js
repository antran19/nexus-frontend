import { apiClient } from './client'

const wishlistPath = '/api/v1/wishlist'

export const getWishlist = (page = 0, size = 20) => apiClient.get(`${wishlistPath}/me`, { params: { page, size } })
export const getWishlistStatus = (productId) => apiClient.get(`${wishlistPath}/${productId}`)
export const addToWishlist = (productId) => apiClient.put(`${wishlistPath}/${productId}`)
export const removeFromWishlist = (productId) => apiClient.delete(`${wishlistPath}/${productId}`)
