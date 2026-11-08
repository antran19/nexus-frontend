import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getAuction, getBidHistory, getMyAutoBid, placeBid, setAutoBid } from '../../api/auctions'
import { useAuth } from '../../context/AuthContext'
import { applyBid, mergeBid, myStanding, nextMinBid } from '../../utils/auctionLive'
import { bidErrorMessage } from '../../utils/apiError'
import { useAuctionStream } from './useAuctionStream'

const STATUS_LABEL = {
  PENDING: 'Chưa bắt đầu',
  ACTIVE: 'Đang diễn ra',
  ENDED: 'Đã kết thúc',
  CANCELLED: 'Đã hủy',
}

const STANDING = {
  LEADING: { text: 'Bạn đang dẫn đầu', className: 'bg-green-50 text-green-800 border-green-200' },
  OUTBID: { text: 'Bạn đã bị vượt giá', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  WON: { text: 'Bạn đã thắng phiên này', className: 'bg-green-50 text-green-800 border-green-200' },
  LOST: { text: 'Bạn không thắng phiên này', className: 'bg-gray-50 text-gray-700 border-gray-200' },
}

const money = (value) => `${Number(value).toLocaleString('vi-VN')} đ`

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

  return (
    <div className="mt-6 border border-gray-200 bg-white shadow-sm rounded-xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{STATUS_LABEL[auction.status] ?? auction.status}</span>
        <span className="text-sm text-gray-500">Kết thúc: {new Date(auction.endTime).toLocaleString('vi-VN')}</span>
      </div>

      <p className="text-3xl font-semibold text-gray-900 mt-2" aria-live="polite">
        {money(price)}
      </p>
      <p className="text-sm text-gray-500">
        {auction.currentHighestBid ? 'Giá cao nhất hiện tại' : 'Giá khởi điểm'} · bước giá tối thiểu{' '}
        {money(auction.bidIncrement)}
        {auction.status === 'ACTIVE' && <span className="ml-2 text-green-700">· cập nhật trực tiếp</span>}
      </p>

      {standing && (
        <p className={`mt-3 text-sm border rounded px-3 py-2 ${STANDING[standing].className}`} role="status">
          {STANDING[standing].text}
        </p>
      )}

      {auction.status !== 'ACTIVE' ? (
        <p className="text-sm text-gray-500 mt-4">Phiên đấu giá này hiện không nhận giá mới.</p>
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
          <form onSubmit={handleBid} className="flex items-center gap-2 mt-4">
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
              className="bg-ink text-white rounded px-4 py-2 hover:bg-gold hover:text-ink transition-colors disabled:opacity-50"
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
                className="border border-ink text-ink rounded px-4 py-2 hover:bg-ink hover:text-white transition-colors disabled:opacity-50"
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
                  {bid.bidderId === userId && <span className="ml-2 text-xs text-gold">bạn</span>}
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
