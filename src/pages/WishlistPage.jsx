import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWishlist, removeFromWishlist } from '../api/wishlist'
import PageHero from '../components/PageHero'
import { resolveProductImage, SCENE_FALLBACKS } from '../utils/images'

const PAGE_SIZE = 20
const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })

export default function WishlistPage() {
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState(null)
  const [removingId, setRemovingId] = useState(null)
  const [actionError, setActionError] = useState('')
  const current = result?.page === page && result.revision === revision ? result : null

  useEffect(() => {
    let active = true
    getWishlist(page, PAGE_SIZE)
      .then(({ data }) => { if (active) setResult({ page, revision, data }) })
      .catch(() => { if (active) setResult({ page, revision, error: true }) })
    return () => { active = false }
  }, [page, revision])

  async function remove(productId) {
    setRemovingId(productId)
    setActionError('')
    try {
      await removeFromWishlist(productId)
      if (page > 0 && current.data.items.length === 1) setPage(page - 1)
      setRevision((value) => value + 1)
    } catch {
      setActionError('Không bỏ được sản phẩm này khỏi danh sách. Vui lòng thử lại.')
    } finally {
      setRemovingId(null)
    }
  }

  const total = current?.data?.total ?? 0
  const hasNext = (page + 1) * PAGE_SIZE < total

  return <>
    <PageHero eyebrow="Tài khoản" title="Sản phẩm yêu thích" />
    <div className="mx-auto max-w-5xl px-6 py-10">
      {!current && <p role="status" className="text-sm text-gray-600">Đang tải danh sách…</p>}
      {current?.error && <p role="alert" className="text-sm text-red-700">Không tải được danh sách yêu thích. Hãy tải lại trang.</p>}
      {actionError && <p role="alert" className="mb-3 text-sm text-red-700">{actionError}</p>}
      {current?.data?.items.length === 0 && (
        <div className="rounded-xl border border-tray bg-white p-6">
          <p className="text-cocoa">{page === 0 ? 'Bạn chưa lưu sản phẩm nào.' : 'Trang này không còn sản phẩm.'}</p>
          {page === 0 && <Link to="/products" className="mt-2 inline-block text-sm font-medium text-brand underline">Khám phá sản phẩm</Link>}
        </div>
      )}
      {current?.data?.items.length > 0 && <ul className="divide-y divide-tray overflow-hidden rounded-xl border border-tray bg-white">
        {current.data.items.map((item) => (
          <li key={item.productId} className="grid gap-3 px-5 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center">
            <img src={resolveProductImage({ id: item.productId, imageUrls: item.imageUrls })} alt=""
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = SCENE_FALLBACKS[0] }}
              className="h-16 w-20 rounded-lg object-cover" />
            <div>
              <Link to={`/products/${item.productId}`} className="font-medium text-cocoa hover:text-brand hover:underline">
                {item.name}
              </Link>
              {!item.available && <p className="mt-1 text-xs font-semibold text-gray-600">Hiện không thể mua</p>}
            </div>
            <p className="font-display text-lg font-bold text-cocoa tabular-nums sm:text-right">
              {item.sellingPrice == null ? '' : money.format(item.sellingPrice)}
            </p>
            <button type="button" disabled={removingId != null}
              className="w-fit rounded-lg border border-tray px-3 py-2 text-sm text-cocoa hover:border-brand disabled:opacity-50"
              onClick={() => remove(item.productId)}>
              {removingId === item.productId ? 'Đang bỏ…' : 'Bỏ khỏi yêu thích'}
            </button>
          </li>
        ))}
      </ul>}
      {current?.data && (page > 0 || hasNext) && (
        <nav className="mt-5 flex items-center justify-center gap-4 text-sm" aria-label="Trang danh sách yêu thích">
          <button type="button" disabled={page === 0 || removingId != null} className="underline disabled:opacity-40"
            onClick={() => setPage(page - 1)}>Trang trước</button>
          <span>Trang {page + 1}</span>
          <button type="button" disabled={!hasNext || removingId != null} className="underline disabled:opacity-40"
            onClick={() => setPage(page + 1)}>Trang sau</button>
        </nav>
      )}
    </div>
  </>
}
