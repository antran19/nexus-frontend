import { useEffect, useState } from 'react'
import { createAuction } from '../../api/auctions'
import { getProducts } from '../../api/products'
import { buildAuctionBody, toLocalInput, validateAuctionForm } from '../../utils/auctionForm'
import { errorMessage } from '../../utils/apiError'
import LabeledField from '../auth/LabeledField'

function blankForm(productId = '') {
  const start = new Date(Date.now() + 5 * 60 * 1000)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { productId, startingPrice: '', bidIncrement: '', reservePrice: '', startTime: toLocalInput(start), endTime: toLocalInput(end) }
}

// A seller starts an auction on one of their active products. The reserve price is optional and hidden: bidders only
// learn whether the bidding has reached it. onCreated tells the page to reload "my auctions".
export default function CreateAuctionForm({ sellerId, onCreated }) {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(() => blankForm())
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    let cancelled = false
    getProducts({ sellerId, status: 'ACTIVE', size: 100 })
      .then(({ data }) => {
        // The list may not filter by seller on every server, so keep only this seller's products.
        const own = (Array.isArray(data) ? data : []).filter((product) => !product.sellerId || product.sellerId === sellerId)
        if (!cancelled) setProducts(own)
      })
      .catch(() => { if (!cancelled) setNotice({ kind: 'error', text: 'Không tải được danh sách sản phẩm của bạn.' }) })
    return () => { cancelled = true }
  }, [sellerId])

  const productId = form.productId || products[0]?.id || ''
  const change = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value })
    setErrors({ ...errors, [field]: undefined })
    setNotice(null)
  }

  async function submit(event) {
    event.preventDefault()
    const values = { ...form, productId }
    const found = validateAuctionForm(values)
    setErrors(found)
    setNotice(null)
    if (Object.keys(found).length > 0) return
    setSubmitting(true)
    try {
      await createAuction(buildAuctionBody(values))
      setNotice({ kind: 'success', text: 'Đã tạo phiên đấu giá. Phiên sẽ tự bắt đầu đúng giờ.' })
      setForm(blankForm(productId))
      onCreated?.()
    } catch (err) {
      const fields = {}
      for (const item of err.response?.data?.error?.fieldErrors ?? []) fields[item.field] = item.message
      setErrors(fields)
      setNotice({ kind: 'error', text: errorMessage(err, 'Không tạo được phiên đấu giá, vui lòng thử lại.') })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mb-10 border border-gray-200 bg-white rounded-xl p-5">
      <h2 className="font-display text-lg font-semibold text-gray-900">Tạo phiên đấu giá mới</h2>
      <fieldset disabled={submitting} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="auction-product" className="block text-sm font-medium text-gray-800">Sản phẩm <span className="text-brand">*</span></label>
          <select
            id="auction-product"
            value={productId}
            onChange={change('productId')}
            aria-invalid={errors.productId ? 'true' : undefined}
            className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
          >
            {products.length === 0 && <option value="">Chưa có sản phẩm đang bán</option>}
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
          {errors.productId && <p role="alert" className="mt-1 text-xs text-red-600">{errors.productId}</p>}
        </div>
        <LabeledField label="Giá khởi điểm (đ)" required type="number" min="1" step="1000" inputMode="numeric" value={form.startingPrice} onChange={change('startingPrice')} error={errors.startingPrice} />
        <LabeledField label="Bước giá (đ)" required type="number" min="1" step="1000" inputMode="numeric" value={form.bidIncrement} onChange={change('bidIncrement')} error={errors.bidIncrement} />
        <div className="sm:col-span-2">
          <LabeledField
            label="Giá sàn (đ), không bắt buộc"
            type="number" min="1" step="1000" inputMode="numeric"
            value={form.reservePrice}
            onChange={change('reservePrice')}
            error={errors.reservePrice}
            hint="Giá sàn được giữ kín: người mua chỉ thấy phiên có giá sàn và đã đạt hay chưa, không thấy số tiền. Hết giờ mà giá cao nhất chưa đạt giá sàn thì phiên kết thúc và không có người thắng."
          />
        </div>
        <LabeledField label="Bắt đầu" required type="datetime-local" value={form.startTime} onChange={change('startTime')} error={errors.startTime} />
        <LabeledField label="Kết thúc" required type="datetime-local" value={form.endTime} onChange={change('endTime')} error={errors.endTime} />
        <p className="text-xs text-gray-500 sm:col-span-2">Phiên kéo dài từ 60 phút đến 7 ngày. Mỗi sản phẩm chỉ có một phiên chưa bắt đầu hoặc đang diễn ra cùng lúc.</p>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={submitting || products.length === 0} className="bg-brand text-white rounded px-5 py-2 text-sm hover:bg-brand-dark transition-colors disabled:opacity-50">
            {submitting ? 'Đang tạo...' : 'Tạo phiên đấu giá'}
          </button>
          {notice && <p role={notice.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${notice.kind === 'error' ? 'text-red-600' : 'text-green-700'}`}>{notice.text}</p>}
        </div>
      </fieldset>
    </form>
  )
}
