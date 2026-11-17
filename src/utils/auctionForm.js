// Pure helpers for creating an auction and for talking about its hidden reserve price, kept apart from React so `npm test` covers them.

const MIN_MINUTES = 60
const MAX_HOURS = 168
const money = (value) => `${Number(value).toLocaleString('vi-VN')} đ`

// datetime-local takes the person's own clock, formatted yyyy-MM-ddTHH:mm.
export function toLocalInput(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const hasValue = (value) => String(value ?? '').trim() !== ''

// Mirrors the server rules (auction-service) so the seller hears about a mistake before sending: a reserve is
// optional, and when given it must be at least the starting price or it could never matter.
export function validateAuctionForm(form, { now = Date.now() } = {}) {
  const errors = {}
  const starting = Number(form.startingPrice)
  if (!form.productId) errors.productId = 'Chọn sản phẩm đang bán để đấu giá.'
  if (!(starting > 0)) errors.startingPrice = 'Giá khởi điểm phải lớn hơn 0.'
  if (!(Number(form.bidIncrement) > 0)) errors.bidIncrement = 'Bước giá phải lớn hơn 0.'
  if (hasValue(form.reservePrice)) {
    const reserve = Number(form.reservePrice)
    if (!(reserve > 0)) errors.reservePrice = 'Giá sàn phải lớn hơn 0.'
    else if (starting > 0 && reserve < starting) errors.reservePrice = 'Giá sàn không được thấp hơn giá khởi điểm.'
  }
  const start = new Date(form.startTime)
  const end = new Date(form.endTime)
  if (Number.isNaN(start.getTime())) errors.startTime = 'Chọn thời gian bắt đầu.'
  if (Number.isNaN(end.getTime())) errors.endTime = 'Chọn thời gian kết thúc.'
  if (!errors.startTime && !errors.endTime) {
    const minutes = (end - start) / 60000
    if (minutes <= 0) errors.endTime = 'Thời gian kết thúc phải sau thời gian bắt đầu.'
    else if (minutes < MIN_MINUTES) errors.endTime = `Phiên phải kéo dài ít nhất ${MIN_MINUTES} phút.`
    else if (minutes > MAX_HOURS * 60) errors.endTime = `Phiên không được dài quá ${MAX_HOURS} giờ (7 ngày).`
    if (!errors.endTime && start.getTime() < now - 60000) errors.startTime = 'Thời gian bắt đầu đã qua.'
  }
  return errors
}

export function buildAuctionBody(form) {
  const body = {
    productId: form.productId,
    startingPrice: Number(form.startingPrice),
    bidIncrement: Number(form.bidIncrement),
    startTime: new Date(form.startTime).toISOString(),
    endTime: new Date(form.endTime).toISOString(),
  }
  // Left out entirely (not sent as null) when blank, so an auction without a reserve stays exactly as before.
  if (hasValue(form.reservePrice)) body.reservePrice = Number(form.reservePrice)
  return body
}

// What a bidder may be told: that there is a reserve and whether the bidding has reached it. The amount stays
// hidden (the server never sends it). Returns { tone, text } or null when there is nothing to say.
export function reserveNote(auction) {
  if (!auction.hasReserve) return null
  if (auction.status === 'ENDED') {
    return !auction.reserveMet && auction.currentHighestBid != null
      ? { tone: 'warn', text: 'Phiên đã kết thúc, giá cao nhất chưa đạt giá sàn nên không có người thắng.' }
      : null
  }
  return auction.reserveMet
    ? { tone: 'ok', text: 'Phiên có giá sàn: đã đạt giá sàn, người dẫn đầu sẽ thắng khi hết giờ.' }
    : { tone: 'warn', text: 'Phiên có giá sàn: giá hiện tại chưa đạt giá sàn.' }
}

// What the seller sees about their own reserve in "my auctions": the amount they set and whether it was reached.
export function sellerReserveNote(item) {
  if (item.reservePrice == null) return null
  return {
    amount: item.reservePrice,
    met: Boolean(item.reserveMet),
    text: `Giá sàn ${money(item.reservePrice)}: ${item.reserveMet ? 'đã đạt' : 'chưa đạt'}`,
  }
}
