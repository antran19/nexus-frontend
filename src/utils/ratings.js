// Pure helpers for rating a seller, kept apart from React so `npm test` can cover them.

export const MAX_COMMENT_LENGTH = 500

export const TRUST_LABEL = { TRUSTED: 'Uy tín cao', NORMAL: 'Bình thường', LOW: 'Uy tín thấp' }

// "4.5 / 5 · 12 đánh giá", or "Chưa có đánh giá" for a seller nobody has rated yet.
export function reputationSummary(reputation) {
  const total = Number(reputation?.totalRatings) || 0
  if (total === 0) return 'Chưa có đánh giá'
  const average = Number(reputation.averageRating)
  return `${(Number.isFinite(average) ? average : 0).toFixed(1)} / 5 · ${total} đánh giá`
}

// What the form sends: the stars as a whole number, the comment trimmed, an empty comment left out.
export function buildRatingBody({ score, comment }) {
  const text = String(comment ?? '').trim()
  return { score: Math.round(Number(score)), comment: text === '' ? undefined : text }
}

// A message for the form, or '' when it can be sent.
export function validateRating({ score, comment }) {
  const value = Number(score)
  if (!Number.isInteger(value) || value < 1 || value > 5) return 'Hãy chọn số sao từ 1 đến 5.'
  if (String(comment ?? '').trim().length > MAX_COMMENT_LENGTH) {
    return `Nhận xét tối đa ${MAX_COMMENT_LENGTH} ký tự.`
  }
  return ''
}

// The codes the rating call can answer with, in words a buyer understands. The server only accepts a deal the
// seller has marked as shipped, between the two people who made it, once each.
export function ratingErrorMessage(err, fallback = 'Không gửi được đánh giá. Vui lòng thử lại.') {
  const status = err?.response?.status
  const code = err?.response?.data?.error?.code
  if (status === 401) return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
  switch (code) {
    case 'TRANSACTION_NOT_FOUND':
      return 'Người bán chưa giao hàng nên chưa đánh giá được. Hãy quay lại sau khi hàng được giao.'
    case 'RATING_ALREADY_SUBMITTED':
      return 'Bạn đã đánh giá giao dịch này rồi.'
    case 'NOT_A_PARTICIPANT':
      return 'Bạn chỉ đánh giá được giao dịch mà mình tham gia.'
    case 'CANNOT_RATE_SELF':
      return 'Bạn không thể tự đánh giá chính mình.'
    default:
      return fallback
  }
}

// An auction can be rated by the person who won it.
export function canRate(item) {
  return item?.myStatus === 'WON'
}
