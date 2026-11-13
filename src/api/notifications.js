import { apiClient } from './client'

// The signed-in person's notifications, newest first (notification-service). `unread` keeps only the new ones.
export function getMyNotifications({ unread = false, page = 0, size = 10 } = {}) {
  return apiClient.get('/api/v1/notifications/me', { params: { unread, page, size } })
}

// { unreadCount } -- cheap enough to poll for the badge on the bell.
export function getUnreadCount() {
  return apiClient.get('/api/v1/notifications/me/unread-count')
}

export function markNotificationRead(id) {
  return apiClient.patch(`/api/v1/notifications/${id}/read`)
}

// { updated } -- how many were unread.
export function markAllNotificationsRead() {
  return apiClient.patch('/api/v1/notifications/me/read-all')
}
