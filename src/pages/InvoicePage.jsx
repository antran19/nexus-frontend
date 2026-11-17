import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getInvoice } from '../api/orders'
import PageHero from '../components/PageHero'
import { invoiceErrorMessage, invoiceIssuedAt, invoiceStatusText, invoiceTotals } from '../utils/invoice'

const money = (value) => `${Number(value).toLocaleString('vi-VN')} đ`

// The invoice of one paid order, laid out to be printed or saved as PDF with the browser's print dialog. The header
// and footer of the site are hidden on paper (print:hidden), so only the invoice is on the page.
export default function InvoicePage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'loading', invoice: null, message: '' })

  useEffect(() => {
    let cancelled = false
    getInvoice(orderId)
      .then(({ data }) => { if (!cancelled) setState({ status: 'ready', invoice: data, message: '' }) })
      .catch((err) => { if (!cancelled) setState({ status: 'error', invoice: null, message: invoiceErrorMessage(err) }) })
    return () => { cancelled = true }
  }, [orderId])

  const { invoice } = state
  const totals = invoice && invoiceTotals(invoice)

  return (
    <>
      <div className="print:hidden"><PageHero eyebrow="Đơn hàng" title="Hóa đơn" /></div>
      <div className="max-w-3xl mx-auto px-6 py-10 print:py-0 print:px-0">
        <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
          <button type="button" onClick={() => navigate(-1)} className="text-sm text-gray-700 underline">← Quay lại</button>
          {state.status === 'ready' && (
            <button
              type="button"
              onClick={() => window.print()}
              className="ml-auto border border-brand text-brand rounded px-5 py-2 text-sm hover:bg-brand hover:text-white transition-colors"
            >
              In hóa đơn
            </button>
          )}
        </div>

        {state.status === 'loading' && <p role="status" className="text-sm text-gray-500">Đang tải...</p>}
        {state.status === 'error' && <p role="alert" className="text-sm text-red-600">{state.message}</p>}

        {state.status === 'ready' && (
          <article aria-label={`Hóa đơn ${invoice.invoiceNumber}`} className="border border-gray-200 bg-white rounded-xl p-6 print:border-0 print:p-0">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4">
              <div>
                <p className="font-display text-2xl font-bold text-gray-900">Nexus</p>
                <p className="text-sm text-gray-500">Sàn thương mại điện tử và đấu giá</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-gray-900">Hóa đơn {invoice.invoiceNumber}</p>
                <p className="text-gray-600">Phát hành: {invoiceIssuedAt(invoice.issuedAt)}</p>
                <p className={invoice.orderStatus === 'REFUNDED' ? 'text-red-600' : 'text-green-700'}>{invoiceStatusText(invoice.orderStatus)}</p>
              </div>
            </header>

            <p className="mt-4 text-sm text-gray-600">Đơn hàng #{invoice.orderId.slice(0, 8)}</p>

            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 font-medium">Sản phẩm</th>
                  <th className="py-2 font-medium text-right">Đơn giá</th>
                  <th className="py-2 font-medium text-right">SL</th>
                  <th className="py-2 font-medium text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.items.map((item) => (
                  <tr key={item.productId}>
                    <td className="py-2 text-gray-900">{item.productName}</td>
                    <td className="py-2 text-right">{money(item.unitPrice)}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{money(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <dl className="mt-4 ml-auto w-full max-w-xs text-sm space-y-1">
              <div className="flex justify-between"><dt className="text-gray-500">Tiền hàng</dt><dd>{money(totals.itemsTotal)}</dd></div>
              {totals.otherAmount !== 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">{totals.otherAmount > 0 ? 'Phí khác (vận chuyển)' : 'Giảm giá'}</dt>
                  <dd>{totals.otherAmount > 0 ? money(totals.otherAmount) : `-${money(-totals.otherAmount)}`}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold text-gray-900">
                <dt>Tổng cộng</dt><dd>{money(totals.total)}</dd>
              </div>
            </dl>
          </article>
        )}
      </div>
    </>
  )
}
