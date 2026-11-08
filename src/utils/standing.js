// How the signed-in person stands in an auction (the myStatus of API.md 5.10), as text and colours.
// Shared by the auction panel and the "my auctions" page so both say the same thing.
export const STANDING = {
  LEADING: { text: 'Bạn đang dẫn đầu', className: 'bg-green-50 text-green-800 border-green-200' },
  OUTBID: { text: 'Bạn đã bị vượt giá', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  WON: { text: 'Bạn đã thắng phiên này', className: 'bg-green-50 text-green-800 border-green-200' },
  LOST: { text: 'Bạn không thắng phiên này', className: 'bg-gray-50 text-gray-700 border-gray-200' },
  CANCELLED: { text: 'Phiên đã hủy', className: 'bg-gray-50 text-gray-700 border-gray-200' },
  PENDING: { text: 'Phiên chưa bắt đầu', className: 'bg-gray-50 text-gray-700 border-gray-200' },
}
