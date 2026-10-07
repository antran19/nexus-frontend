import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getAuctionsByProduct, getBidHistory, placeBid } from '../api/auctions'
import { getProductById } from '../api/products'
import { useAuth } from '../context/AuthContext'

const STATUS_LABEL = {
  PENDING: 'Chưa bắt đầu',
  ACTIVE: 'Đang diễn ra',
  ENDED: 'Đã kết thúc',
  CANCELLED: 'Đã hủy',
}

function nextMinBid(auction) {
  const base = auction.currentHighestBid ?? auction.startingPrice
  return Number(base) + Number(auction.bidIncrement)
}

export default function ProductDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [auction, setAuction] = useState(null)
  const [bids, setBids] = useState([])
  const [bidAmount, setBidAmount] = useState('')
  const [bidError, setBidError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    getProductById(id)
      .then(({ data }) => {
        if (!cancelled) setProduct(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function loadAuction() {
    const { data: auctions } = await getAuctionsByProduct(id)
    const active = auctions.find((a) => a.status === 'ACTIVE') ?? auctions[0] ?? null
    setAuction(active)
    if (active) {
      const { data: history } = await getBidHistory(active.id)
      setBids(history)
      setBidAmount(String(nextMinBid(active)))
    }
  }

  useEffect(() => {
    loadAuction().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleBidSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setBidError('')
    try {
      await placeBid(auction.id, Number(bidAmount))
      await loadAuction()
    } catch (err) {
      // Validation errors (e.g. "amount too low") carry the useful detail in
      // fieldErrors, not the generic top-level message -- prefer that when present.
      const apiError = err.response?.data?.error
      const detail = apiError?.fieldErrors?.[0]?.message
      setBidError(detail ?? apiError?.message ?? 'Đặt giá thất bại, vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-500 px-4 py-8">Đang tải...</p>
  if (!product) return <p className="text-sm text-gray-500 px-4 py-8">Không tìm thấy sản phẩm.</p>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-8">
      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
        {product.imageUrls?.[0] && (
          <img src={product.imageUrls[0]} alt={product.name} className="w-full h-full object-cover" />
        )}
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{product.name}</h1>
        <p className="text-gray-600 mt-2">{product.description}</p>

        {!auction ? (
          <p className="text-sm text-gray-500 mt-6">Sản phẩm này chưa có phiên đấu giá nào.</p>
        ) : (
          <div className="mt-6 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{STATUS_LABEL[auction.status] ?? auction.status}</span>
              <span className="text-sm text-gray-500">
                Kết thúc: {new Date(auction.endTime).toLocaleString('vi-VN')}
              </span>
            </div>

            <p className="text-3xl font-semibold text-gray-900 mt-2">
              {Number(auction.currentHighestBid ?? auction.startingPrice).toLocaleString('vi-VN')} đ
            </p>
            <p className="text-sm text-gray-500">
              {auction.currentHighestBid ? 'Giá cao nhất hiện tại' : 'Giá khởi điểm'} · bước giá tối thiểu{' '}
              {Number(auction.bidIncrement).toLocaleString('vi-VN')} đ
            </p>

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
              <form onSubmit={handleBidSubmit} className="flex items-center gap-2 mt-4">
                <input
                  type="number"
                  step="0.01"
                  min={nextMinBid(auction)}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 w-40"
                  required
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-gray-900 text-white rounded px-4 py-2 disabled:opacity-50"
                >
                  {submitting ? 'Đang gửi...' : 'Đặt giá'}
                </button>
              </form>
            )}

            {bidError && <p className="text-sm text-red-600 mt-2">{bidError}</p>}

            {bids.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm font-medium text-gray-900 mb-2">Lịch sử đặt giá</h2>
                <ul className="text-sm text-gray-600 space-y-1 max-h-48 overflow-y-auto">
                  {bids.map((bid) => (
                    <li key={bid.id} className="flex justify-between">
                      <span>{Number(bid.amount).toLocaleString('vi-VN')} đ</span>
                      <span className="text-gray-400">{new Date(bid.placedAt).toLocaleTimeString('vi-VN')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
