import { useState } from 'react'
import { confirmOrderReceived } from '../api/orders'
import { canConfirmReceived, carrierName, confirmReceivedError, shipmentStatusLabel, shipmentSteps } from '../utils/shipment'

const when = (value) => new Date(value).toLocaleString('vi-VN')

// Where the parcel of an order is: carrier, tracking code and the four steps with their times. A buyer also gets the
// "Đã nhận hàng" button once the parcel is delivered (readOnly hides it, for the seller).
// onChanged(order) gets the order the server answered; onNotice({ kind, text }) is the line shown above the list.
export default function ShipmentTracker({ order, onChanged, onNotice, readOnly = false }) {
  const [busy, setBusy] = useState(false)
  if (!order.shippedAt && !order.shipment) return null

  const shipment = order.shipment
  const steps = shipmentSteps(order)

  async function confirm() {
    setBusy(true)
    onNotice?.(null)
    try {
      const { data: updated } = await confirmOrderReceived(order.id)
      onChanged?.(updated)
      onNotice?.({ kind: 'success', text: `Đã xác nhận nhận hàng đơn #${order.id.slice(0, 8)}.` })
    } catch (err) {
      onNotice?.({ kind: 'error', text: confirmReceivedError(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Vận chuyển" className="mt-3 rounded border border-gray-200 bg-gray-50 p-3">
      <p className="text-sm font-medium text-gray-800">
        {shipment ? shipmentStatusLabel(shipment.status) : 'Đã gửi hàng'}
        {shipment?.carrier && <span className="font-normal text-gray-600"> · {carrierName(shipment.carrier)}</span>}
      </p>
      {shipment?.trackingCode && (
        <p className="mt-1 text-xs text-gray-600">Mã vận đơn: <span className="font-mono font-semibold text-gray-900">{shipment.trackingCode}</span></p>
      )}
      <ol className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {steps.map((step) => (
          <li key={step.key} className={`text-xs ${step.done ? 'text-green-700' : 'text-gray-400'}`}>
            <span aria-hidden="true">{step.done ? '●' : '○'} </span>
            {step.label}
            {step.time && <span className="block text-gray-500">{when(step.time)}</span>}
          </li>
        ))}
      </ol>
      {!readOnly && canConfirmReceived(order) && (
        <div className="mt-3">
          <p className="mb-2 text-xs text-gray-600">Hàng đã tới nơi. Chỉ xác nhận khi bạn đã thực sự nhận được hàng.</p>
          <button
            type="button"
            disabled={busy}
            onClick={confirm}
            className="bg-brand text-white rounded px-4 py-1.5 text-sm hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {busy ? 'Đang xác nhận...' : 'Đã nhận hàng'}
          </button>
        </div>
      )}
    </section>
  )
}
