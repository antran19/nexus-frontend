// What the staff's order list and the buyer's order list share: one page is PAGE_SIZE orders, the days a person picks
// become the moments the server filters by. Pure, so `npm test` can cover it.

export const PAGE_SIZE = 20

// A day picked in a date input ("2026-11-20") as the first / last moment of that day in the person's own time zone.
export const startOfDay = (day) => (day ? new Date(`${day}T00:00:00`).toISOString() : undefined)
export const endOfDay = (day) => (day ? new Date(`${day}T23:59:59.999`).toISOString() : undefined)

// The server answers a full page while there are more orders behind it; a short page is the last one.
export const hasNextPage = (receivedCount) => receivedCount >= PAGE_SIZE

export function validateDays(fromDay, toDay) {
  return fromDay && toDay && fromDay > toDay ? 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.' : ''
}

// Drops what was not chosen so it is not sent to the server.
export const withoutEmpty = (query) => Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined))
