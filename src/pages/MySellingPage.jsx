import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMySelling } from '../api/auctions'
import PageHero from '../components/PageHero'
import { useProductNames } from '../components/useProductNames'
import { errorMessage } from '../utils/apiError'
import { appendPage, hasMorePages, PAGE_SIZE } from '../utils/myBidding'
import { saleOutcome, STATUS_BADGE, STATUS_TABS, summarizeSelling } from '../utils/mySelling'

const money = (value) => `${Number(value).toLocaleString('vi-VN')} đ`
const when = (value) => new Date(value).toLocaleString('vi-VN')

function outcomeText(outcome) {
  switch (outcome.kind) {
    case 'NO_WINNER':
      return { text: 'Không có người mua', className: 'text-gray-600' }
    case 'PAID':
      return { text: `Đã thanh toán ${money(outcome.amount)}`, className: 'text-green-700' }
    case 'OVERDUE':
      return { text: `Quá hạn thanh toán ${money(outcome.amount)}`, className: 'text-red-600' }
    default:
      return {
        text: `Chờ thanh toán ${money(outcome.amount)}${outcome.deadline ? `, hạn ${when(outcome.deadline)}` : ''}`,
        className: 'text-amber-700',
      }
  }
}

// The auctions the signed-in seller created (API.md 5.11), newest first, with how many bids each drew.
export default function MySellingPage() {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(0)
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const { nameOf, loadMissing } = useProductNames()

  const load = useCallback(async (pageNumber, statusFilter) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getMySelling({ status: statusFilter, page: pageNumber, size: PAGE_SIZE })
      setItems((current) => (pageNumber === 0 ? data : appendPage(current, data)))
      setPage(pageNumber)
      setMore(hasMorePages(data))
      loadMissing(data)
    } catch (err) {
      setItems([])
      setMore(false)
      setError(
        err.response?.status === 403
          ? 'Chỉ tài khoản người bán mới có danh sách phiên đang bán.'
          : errorMessage(err, 'Không tải được danh sách phiên, vui lòng thử lại.'),
      )
    } finally {
      setLoading(false)
    }
  }, [loadMissing])

  useEffect(() => {
    load(0, status)
  }, [load, status])

  const { live, liveBids } = summarizeSelling(items)

  return (
    <>
      <PageHero eyebrow="Đấu giá" title="Phiên đang bán" />
      <div className="max-w-5xl mx-auto px-6 py-12">
        {live > 0 && (
          <p className="text-sm text-gray-600 mb-4">
            {live} phiên đang diễn ra, đã có {liveBids} lượt giá.
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Lọc theo trạng thái">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value || 'ALL'}
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              onClick={() => setStatus(tab.value)}
              className={`text-sm rounded-full px-4 py-1.5 border transition-colors ${
                status === tab.value ? 'bg-ink text-white border-ink' : 'border-gray-300 text-gray-700 hover:border-gold'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="text-sm text-gray-500">
            {status ? 'Không có phiên nào ở mục này.' : 'Bạn chưa tạo phiên đấu giá nào.'}
          </p>
        )}

        <ul className="space-y-3">
          {items.map((item) => {
            const badge = STATUS_BADGE[item.status]
            const outcome = saleOutcome(item)
            const result = outcome && outcomeText(outcome)
            return (
              <li key={item.auctionId}>
                <Link
                  to={`/products/${item.productId}`}
                  className="block border border-gray-200 bg-white rounded-xl p-4 hover:border-gold hover:shadow-md transition-[border-color,box-shadow]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-gray-900">{nameOf(item)}</span>
                    {badge && <span className={`text-xs border rounded-full px-3 py-1 ${badge.className}`}>{badge.text}</span>}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <dt className="text-gray-500">{item.currentHighestBid != null ? 'Giá hiện tại' : 'Giá khởi điểm'}</dt>
                      <dd className="text-gray-900">{money(item.currentHighestBid ?? item.startingPrice)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Lượt giá</dt>
                      <dd className="text-gray-900">{item.bidCount}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Người đặt giá</dt>
                      <dd className="text-gray-900">{item.bidderCount}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Kết thúc</dt>
                      <dd className="text-gray-900">{when(item.endTime)}</dd>
                    </div>
                  </dl>
                  {result && <p className={`mt-3 text-sm ${result.className}`}>{result.text}</p>}
                </Link>
              </li>
            )
          })}
        </ul>

        {loading && <p className="text-sm text-gray-500 mt-4">Đang tải...</p>}
        {more && !loading && (
          <button
            type="button"
            onClick={() => load(page + 1, status)}
            className="mt-6 border border-ink text-ink rounded px-5 py-2 text-sm hover:bg-ink hover:text-white transition-colors"
          >
            Xem thêm
          </button>
        )}
      </div>
    </>
  )
}
