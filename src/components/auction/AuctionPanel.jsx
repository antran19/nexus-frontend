import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getAuction, getBidHistory, getMyAutoBid, placeBid, setAutoBid } from '../../api/auctions'
import { useAuth } from '../../context/AuthContext'
import { reserveNote } from '../../utils/auctionForm'
import { applyBid, bidLadder, endingSoon, mergeBid, myStanding, nextMinBid, timeLeft } from '../../utils/auctionLive'
import { bidErrorMessage } from '../../utils/apiError'
import { STANDING } from '../../utils/standing'
import SellerReputation from './SellerReputation'
import { useAuctionStream } from './useAuctionStream'

const STATUS_LABEL = {
  PENDING: 'Chưa bắt đầu',
  ACTIVE: 'Đang diễn ra',
  ENDED: 'Đã kết thúc',
  CANCELLED: 'Đã hủy',
}

const money = (value) => `${Number(value).toLocaleString('vi-VN')} đ`

// The clock of the countdown: ticks every second while the auction is live, stands still otherwise.
function useNow(active) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active])
  return now
}

// One auction on the product page: the live price, who is ahead, the bid box and the maximum box.
// `initial` is the auction as first loaded; everything after that comes from the stream and refreshes.
export default function AuctionPanel({ initial }) {
  const location = useLocation()
  const { isAuthenticated, user } = useAuth()
  const userId = user?.sub
  const [auction, setAuction] = useState(initial)
  const [bids, setBids] = useState([])
  const [myMax, setMyMax] = useState(null)

  // null until the person types: then the box follows the least allowed bid as the price moves
  const [typedBid, setTypedBid] = useState(null)
  const [bidError, setBidError] = useState('')
  const [bidding, setBidding] = useState(false)

  const [maxAmount, setMaxAmount] = useState('')
  const [maxError, setMaxError] = useState('')
  const [maxSaved, setMaxSaved] = useState(false)
  const [savingMax, setSavingMax] = useState(false)

  const refresh = useCallback(async () => {
    const [{ data: fresh }, { data: history }] = await Promise.all([getAuction(initial.id), getBidHistory(initial.id)])
    setAuction(fresh)
    setBids(history)
    if (isAuthenticated) {
      try {
        const { data } = await getMyAutoBid(initial.id)
        setMyMax(data.maxAmount)
      } catch (err) {
        // 404 AUTO_BID_NOT_FOUND: no maximum set, which is a normal state
        if (err.response?.status === 404) setMyMax(null)
      }
    }
  }, [initial.id, isAuthenticated])

  useEffect(() => {
    refresh().catch(() => {})
  }, [refresh])

  // At zero the auction is over for the person even if the server has not closed it yet: no more bidding, and the
  // server is asked every few seconds until it has. A bid pushed meanwhile (anti-sniping) moves the end time and
  // the panel is live again.
  const now = useNow(auction.status === 'ACTIVE')
  const timeIsUp = auction.status === 'ACTIVE' && Date.parse(auction.endTime) <= now
  useEffect(() => {
    if (!timeIsUp) return undefined
    const timer = setInterval(() => refresh().catch(() => {}), 3000)
    return () => clearInterval(timer)
  }, [timeIsUp, refresh])

  useAuctionStream(
    auction.id,
    auction.status === 'ACTIVE',
    (bid) => {
      setAuction((current) => applyBid(current, bid))
      setBids((current) => mergeBid(current, bid))
      // The end time may have moved (anti-sniping), and a maximum may have been used up.
      refresh().catch(() => {})
    },
    () => refresh().catch(() => {}),
  )

  async function handleBid(e) {
    e.preventDefault()
    setBidding(true)
    setBidError('')
    try {
      await placeBid(auction.id, Number(bidAmount))
      setTypedBid(null)
      await refresh()
    } catch (err) {
      setBidError(bidErrorMessage(err, 'Đặt giá thất bại, vui lòng thử lại.'))
    } finally {
      setBidding(false)
    }
  }

  async function handleMax(e) {
    e.preventDefault()
    setSavingMax(true)
    setMaxError('')
    setMaxSaved(false)
    try {
      await setAutoBid(auction.id, Number(maxAmount))
      setMaxAmount('')
      setMaxSaved(true)
      await refresh()
    } catch (err) {
      setMaxError(bidErrorMessage(err, 'Không đặt được mức tối đa, vui lòng thử lại.'))
    } finally {
      setSavingMax(false)
    }
  }

  const standing = myStanding(auction, userId, myMax != null || bids.some((b) => b.bidderId === userId))
  const bidAmount = typedBid ?? String(nextMinBid(auction))
  const price = auction.currentHighestBid ?? auction.startingPrice
  const reserve = reserveNote(auction)

  return (
    <div className="mt-6 border border-tray bg-white shadow-sm rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-tray bg-peach px-3 py-1 text-xs font-semibold text-brand">{STATUS_LABEL[auction.status] ?? auction.status}</span>
        {auction.status === 'ACTIVE' && (
          <span
            role="timer"
            aria-label={`Còn lại ${timeLeft(auction.endTime, now)}`}
            className={`rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${endingSoon(auction.endTime, now) ? 'bg-red-600 text-white' : 'bg-cocoa text-white'}`}
          >
            {timeLeft(auction.endTime, now)}
          </span>
        )}
      </div>
      <p className="mt-1 text-right text-xs text-gray-500">Kết thúc: {new Date(auction.endTime).toLocaleString('vi-VN')}</p>

      <p className="font-display text-4xl font-extrabold text-brand mt-2" aria-live="polite">
        {money(price)}
      </p>
      <p className="text-sm text-gray-600">
        {auction.currentHighestBid ? 'Giá cao nhất hiện tại' : 'Giá khởi điểm'} · bước giá tối thiểu{' '}
        {money(auction.bidIncrement)}
        {auction.status === 'ACTIVE' && !timeIsUp && <span className="ml-2 text-green-700">· cập nhật trực tiếp</span>}
      </p>

      <SellerReputation sellerId={auction.sellerId} />

      {reserve && (
        <p
          role="status"
          className={`mt-3 text-sm border rounded px-3 py-2 ${reserve.tone === 'ok' ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}
        >
          {reserve.text}
        </p>
      )}

      {standing && (
        <p className={`mt-3 text-sm border rounded px-3 py-2 ${STANDING[standing].className}`} role="status">
          {STANDING[standing].text}
        </p>
      )}

      {auction.status !== 'ACTIVE' || timeIsUp ? (
        <p className="text-sm text-gray-500 mt-4">
          {timeIsUp ? 'Đã hết giờ, hệ thống đang chốt kết quả phiên.' : 'Phiên đấu giá này hiện không nhận giá mới.'}
        </p>
      ) : !isAuthenticated ? (
        <Link
          to="/login"
          state={{ from: location.pathname }}
          className="inline-block mt-4 text-sm text-gray-900 underline"
        >
          Đăng nhập để đặt giá
        </Link>
      ) : (
        <>
          <div role="group" aria-label="Chọn nhanh mức giá" className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {bidLadder(auction).map((step) => (
              <button
                key={step.amount}
                type="button"
                onClick={() => setTypedBid(String(step.amount))}
                aria-pressed={bidAmount === String(step.amount)}
                aria-label={`Chọn mức ${money(step.amount)}`}
                className={`rounded-lg border px-2 py-2 text-center transition-colors ${
                  bidAmount === String(step.amount) ? 'border-brand bg-brand text-white' : 'border-tray bg-peach text-cocoa hover:border-brand'
                }`}
              >
                <span className="block text-sm font-semibold">{step.delta > 0 ? `+${money(step.delta)}` : 'Tối thiểu'}</span>
                <span className="block text-[11px] opacity-80">{money(step.amount)}</span>
              </button>
            ))}
          </div>
          <form onSubmit={handleBid} className="flex items-center gap-2 mt-3">
            <input
              type="number"
              step="0.01"
              min={nextMinBid(auction)}
              value={bidAmount}
              onChange={(e) => setTypedBid(e.target.value)}
              aria-label="Số tiền đặt giá"
              className="border border-gray-300 rounded px-3 py-2 w-40"
              required
            />
            <button
              type="submit"
              disabled={bidding}
              className="bg-brand text-white rounded px-4 py-2 hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              {bidding ? 'Đang gửi...' : 'Đặt giá'}
            </button>
          </form>
          {bidError && <p className="text-sm text-red-600 mt-2">{bidError}</p>}

          <div className="mt-6 border-t border-gray-200 pt-4">
            <h2 className="text-sm font-medium text-gray-900">Đặt giá tự động</h2>
            <p className="text-xs text-gray-500 mt-1">
              Nhập mức cao nhất bạn chịu trả; hệ thống tự ra giá thay bạn, vừa đủ để dẫn đầu và không vượt mức đó.
              Mức này được giấu, chỉ nâng lên được, không hạ xuống.
            </p>
            {myMax != null && (
              <p className="text-sm text-gray-900 mt-2">
                Mức tối đa của bạn: <strong>{money(myMax)}</strong>
              </p>
            )}
            <form onSubmit={handleMax} className="flex items-center gap-2 mt-2">
              <input
                type="number"
                step="0.01"
                min={myMax != null ? Number(myMax) : nextMinBid(auction)}
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder={myMax != null ? 'Nâng mức tối đa' : 'Mức tối đa'}
                aria-label="Mức tối đa"
                className="border border-gray-300 rounded px-3 py-2 w-40"
                required
              />
              <button
                type="submit"
                disabled={savingMax}
                className="border border-brand text-brand rounded px-4 py-2 hover:bg-brand hover:text-white transition-colors disabled:opacity-50"
              >
                {savingMax ? 'Đang lưu...' : myMax != null ? 'Nâng mức' : 'Đặt mức'}
              </button>
            </form>
            {maxSaved && <p className="text-xs text-green-700 mt-2">Đã lưu mức tối đa.</p>}
            {maxError && <p className="text-sm text-red-600 mt-2">{maxError}</p>}
          </div>
        </>
      )}

      {bids.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-gray-900 mb-2">Lịch sử đặt giá</h2>
          <ul className="text-sm text-gray-600 space-y-1 max-h-48 overflow-y-auto">
            {bids.map((bid) => (
              <li key={bid.id} className="flex justify-between">
                <span>
                  {money(bid.amount)}
                  {bid.bidderId === userId && <span className="ml-2 text-xs text-brand">bạn</span>}
                </span>
                <span className="text-gray-400">{new Date(bid.placedAt).toLocaleTimeString('vi-VN')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
