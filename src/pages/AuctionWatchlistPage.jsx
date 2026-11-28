import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWatchlist, unfollowAuction } from '../api/auctions'
import PageHero from '../components/PageHero'

const statusLabels = {
  PENDING: 'Sắp bắt đầu',
  ACTIVE: 'Đang diễn ra',
  ENDED: 'Đã kết thúc',
  CANCELLED: 'Đã hủy',
}
const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
const date = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

export default function AuctionWatchlistPage() {
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState(null)
  const [removingId, setRemovingId] = useState(null)
  const [actionError, setActionError] = useState('')
  const current = result?.page === page && result.revision === revision ? result : null

  useEffect(() => {
    let active = true
    getWatchlist(page)
      .then(({ data }) => { if (active) setResult({ page, revision, data }) })
      .catch(() => { if (active) setResult({ page, revision, error: true }) })
    return () => { active = false }
  }, [page, revision])

  async function remove(auctionId) {
    setRemovingId(auctionId)
    setActionError('')
    try {
      await unfollowAuction(auctionId)
      if (page > 0 && current.data.items.length === 1) setPage(page - 1)
      setRevision((value) => value + 1)
    } catch {
      setActionError('Không bỏ theo dõi được phiên này. Vui lòng thử lại.')
    } finally {
      setRemovingId(null)
    }
  }

  return <>
    <PageHero eyebrow="Đấu giá" title="Phiên đang theo dõi" />
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-4 flex justify-end">
        <button type="button" disabled={!current || removingId != null}
          className="text-sm font-medium text-brand underline disabled:opacity-50"
          onClick={() => setRevision((value) => value + 1)}>Làm mới</button>
      </div>
      {!current && <p role="status" className="text-sm text-gray-600">Đang tải danh sách…</p>}
      {current?.error && <p role="alert" className="text-sm text-red-700">Không tải được danh sách theo dõi. Hãy thử làm mới.</p>}
      {actionError && <p role="alert" className="mb-3 text-sm text-red-700">{actionError}</p>}
      {current?.data?.items.length === 0 && (
        <div className="rounded-xl border border-tray bg-white p-6">
          <p className="text-cocoa">{page === 0 ? 'Bạn chưa theo dõi phiên nào.' : 'Trang này không còn phiên theo dõi.'}</p>
          {page === 0 && <Link to="/products" className="mt-2 inline-block text-sm font-medium text-brand underline">Khám phá sản phẩm</Link>}
        </div>
      )}
      {current?.data?.items.length > 0 && <ul className="divide-y divide-tray overflow-hidden rounded-xl border border-tray bg-white">
        {current.data.items.map((entry) => (
          <li key={entry.auctionId} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
            <div>
              <Link to={`/products/${entry.productId}?auction=${entry.auctionId}`}
                className="font-medium text-cocoa hover:text-brand hover:underline">
                {entry.productName || `Phiên #${entry.auctionId.slice(0, 8)}`}
              </Link>
              <p className="mt-1 text-sm text-gray-600">
                {entry.status === 'PENDING' ? 'Bắt đầu' : 'Kết thúc'} {date.format(new Date(entry.status === 'PENDING' ? entry.startTime : entry.endTime))}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="font-display text-lg font-bold text-cocoa tabular-nums">{money.format(entry.price)}</p>
              <p className={`text-xs ${entry.status === 'ACTIVE' ? 'font-semibold text-green-700' : 'text-gray-600'}`}>
                {statusLabels[entry.status] || entry.status}
              </p>
            </div>
            <button type="button" disabled={removingId != null}
              className="w-fit rounded-lg border border-tray px-3 py-2 text-sm text-cocoa hover:border-brand disabled:opacity-50"
              onClick={() => remove(entry.auctionId)}>
              {removingId === entry.auctionId ? 'Đang bỏ theo dõi…' : 'Bỏ theo dõi'}
            </button>
          </li>
        ))}
      </ul>}
      {current?.data && (page > 0 || current.data.hasNext) && (
        <nav className="mt-5 flex items-center justify-center gap-4 text-sm" aria-label="Trang danh sách theo dõi">
          <button type="button" disabled={page === 0 || removingId != null} className="underline disabled:opacity-40"
            onClick={() => setPage(page - 1)}>Trang trước</button>
          <span>Trang {page + 1}</span>
          <button type="button" disabled={!current.data.hasNext || removingId != null} className="underline disabled:opacity-40"
            onClick={() => setPage(page + 1)}>Trang sau</button>
        </nav>
      )}
    </div>
  </>
}
