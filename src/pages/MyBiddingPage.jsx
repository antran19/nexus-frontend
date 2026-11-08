import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyBidding } from '../api/auctions'
import { getProductById } from '../api/products'
import PageHero from '../components/PageHero'
import { errorMessage } from '../utils/apiError'
import { appendPage, FILTERS, filterItems, hasMorePages, PAGE_SIZE, summarize } from '../utils/myBidding'
import { STANDING } from '../utils/standing'

const money = (value) => `${Number(value).toLocaleString('vi-VN')} đ`

// The auctions the signed-in person has bid in (API.md 5.10), newest activity first.
// The list only carries product ids, so the names are fetched once per product and cached here.
export default function MyBiddingPage() {
  const [items, setItems] = useState([])
  const [names, setNames] = useState({})
  const [page, setPage] = useState(0)
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('ALL')

  const loadNames = useCallback((rows) => {
    const ids = [...new Set(rows.map((row) => row.productId))]
    ids.forEach((id) => {
      getProductById(id)
        .then(({ data }) => setNames((current) => ({ ...current, [id]: data.name })))
        .catch(() => {
          // a product that cannot be read keeps its fallback title
        })
    })
  }, [])

  const load = useCallback(
    async (pageNumber) => {
      setLoading(true)
      setError('')
      try {
        const { data } = await getMyBidding(pageNumber, PAGE_SIZE)
        setItems((current) => (pageNumber === 0 ? data : appendPage(current, data)))
        setPage(pageNumber)
        setMore(hasMorePages(data))
        loadNames(data)
      } catch (err) {
        setError(errorMessage(err, 'Không tải được danh sách phiên, vui lòng thử lại.'))
      } finally {
        setLoading(false)
      }
    },
    [loadNames],
  )

  useEffect(() => {
    load(0)
  }, [load])

  const shown = filterItems(items, filter)
  const { live, leading } = summarize(items)

  return (
    <>
      <PageHero eyebrow="Đấu giá" title="Phiên của tôi" />
      <div className="max-w-5xl mx-auto px-6 py-12">
        {items.length > 0 && (
          <p className="text-sm text-gray-600 mb-4">
            Bạn đang theo {live} phiên diễn ra, dẫn đầu {leading} phiên.
          </p>
        )}

        <div className="flex gap-2 mb-6" role="tablist" aria-label="Lọc phiên">
          {Object.entries(FILTERS).map(([key, { label }]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`text-sm rounded-full px-4 py-1.5 border transition-colors ${
                filter === key ? 'bg-ink text-white border-ink' : 'border-gray-300 text-gray-700 hover:border-gold'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="text-sm text-gray-500">
            Bạn chưa tham gia phiên nào.{' '}
            <Link to="/products" className="underline text-gray-900">
              Xem sản phẩm đang đấu giá
            </Link>
          </p>
        )}
        {items.length > 0 && shown.length === 0 && <p className="text-sm text-gray-500">Không có phiên nào ở mục này.</p>}

        <ul className="space-y-3">
          {shown.map((item) => {
            const standing = STANDING[item.myStatus]
            return (
              <li key={item.auctionId}>
                <Link
                  to={`/products/${item.productId}`}
                  className="block border border-gray-200 bg-white rounded-xl p-4 hover:border-gold hover:shadow-md transition-[border-color,box-shadow]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-gray-900">{names[item.productId] ?? 'Sản phẩm đấu giá'}</span>
                    {standing && (
                      <span className={`text-xs border rounded-full px-3 py-1 ${standing.className}`}>{standing.text}</span>
                    )}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <dt className="text-gray-500">Giá hiện tại</dt>
                      <dd className="text-gray-900">{item.currentHighestBid != null ? money(item.currentHighestBid) : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Giá cao nhất của tôi</dt>
                      <dd className="text-gray-900">{money(item.myHighestBid)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Mức tối đa của tôi</dt>
                      <dd className="text-gray-900">{item.myMaxAutoBid != null ? money(item.myMaxAutoBid) : 'Chưa đặt'}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Kết thúc</dt>
                      <dd className="text-gray-900">{new Date(item.endTime).toLocaleString('vi-VN')}</dd>
                    </div>
                  </dl>
                </Link>
              </li>
            )
          })}
        </ul>

        {loading && <p className="text-sm text-gray-500 mt-4">Đang tải...</p>}
        {more && !loading && (
          <button
            type="button"
            onClick={() => load(page + 1)}
            className="mt-6 border border-ink text-ink rounded px-5 py-2 text-sm hover:bg-ink hover:text-white transition-colors"
          >
            Xem thêm
          </button>
        )}
      </div>
    </>
  )
}
