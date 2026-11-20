// The parcel of an order (order.shipment): which carrier took it, its tracking code and how far it got.
// An order has at most one. Orders shipped before carriers existed only have shippedAt.

const STATUS_LABELS = { SHIPPED: 'Đã gửi hàng', IN_TRANSIT: 'Đang vận chuyển', DELIVERED: 'Đã giao tới nơi', RECEIVED: 'Đã nhận hàng' }
const CARRIER_NAMES = { SIMULATED: 'Nexus Express (mô phỏng)', GHN: 'Giao Hàng Nhanh' }
const ORDER = ['SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RECEIVED']

export const shipmentStatusLabel = (status) => STATUS_LABELS[status] ?? 'Chưa gửi hàng'

export const carrierName = (code) => CARRIER_NAMES[code] ?? code ?? ''

// Only a delivered parcel can be confirmed; a received one cannot be confirmed again.
export const canConfirmReceived = (order) => order?.shipment?.status === 'DELIVERED'

// The four steps of the journey with the time each one happened (null until it did).
export function shipmentSteps(order) {
  const shipment = order?.shipment
  // shippedAt alone (an order shipped before carriers existed) still counts as the first step.
  const reached = shipment ? ORDER.indexOf(shipment.status) : order?.shippedAt ? 0 : -1
  const times = [order?.shippedAt ?? null, null, shipment?.deliveredAt ?? null, shipment?.receivedAt ?? null]
  return ORDER.map((key, index) => ({
    key,
    label: STATUS_LABELS[key],
    done: index <= reached,
    time: index <= reached ? times[index] : null,
  }))
}

export function confirmReceivedError(err) {
  const status = err?.response?.status
  const code = err?.response?.data?.error?.code
  if (status === 401) return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
  switch (code) {
    case 'SHIPMENT_NOT_DELIVERED':
      return 'Hàng chưa giao tới nơi nên chưa xác nhận nhận hàng được.'
    case 'NOT_YOUR_ORDER':
      return 'Đây không phải đơn của bạn.'
    case 'ORDER_NOT_FOUND':
      return 'Không tìm thấy đơn này.'
    default:
      return 'Không xác nhận được. Vui lòng thử lại.'
  }
}
