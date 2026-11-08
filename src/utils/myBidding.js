// Pure helpers for the "my auctions" page, kept apart from React so `npm test` can cover them.

export const PAGE_SIZE = 20

// Adds the next page after the ones already shown. The list is ordered by latest activity, so a bid
// placed meanwhile can push an auction onto a later page too: it is kept once, where it first appeared.
export function appendPage(shown, nextPage) {
  const seen = new Set(shown.map((item) => item.auctionId))
  return [...shown, ...nextPage.filter((item) => !seen.has(item.auctionId))]
}

// A full page may be followed by another; a short one is the last.
export function hasMorePages(page, size = PAGE_SIZE) {
  return page.length >= size
}

// Filter tabs. ACTIVE groups the two live standings, so "where do I need to act" is one click.
export const FILTERS = {
  ALL: { label: 'Tất cả', matches: () => true },
  ACTIVE: { label: 'Đang diễn ra', matches: (item) => item.myStatus === 'LEADING' || item.myStatus === 'OUTBID' },
  ENDED: { label: 'Đã kết thúc', matches: (item) => item.myStatus === 'WON' || item.myStatus === 'LOST' },
}

export function filterItems(items, filterKey) {
  const filter = FILTERS[filterKey] ?? FILTERS.ALL
  return items.filter(filter.matches)
}

// How many are live and how many of those I am leading, for the one-line summary above the list.
export function summarize(items) {
  const live = items.filter(FILTERS.ACTIVE.matches)
  return { live: live.length, leading: live.filter((item) => item.myStatus === 'LEADING').length }
}
