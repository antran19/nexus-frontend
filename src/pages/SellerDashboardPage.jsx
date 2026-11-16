import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMySelling } from '../api/auctions'
import { getSellingOrders } from '../api/orders'
import { getReputation } from '../api/ratings'
import PageHero from '../components/PageHero'
import { useAuth } from '../context/AuthContext'
import { formatMoney } from '../utils/dashboard'
import { isSeller } from '../utils/mySelling'
import { reputationSummary, TRUST_LABEL } from '../utils/ratings'
import { orderStatsForSeller, sellerTodo, sellingStats } from '../utils/sellerDashboard'

const TODO_STYLE = {
  ship: 'border-amber-300 bg-amber-50 text-amber-900',
  late: 'border-red-200 bg-red-50 text-red-900',
}

function StatCard({ to, label, value, note, highlight }) {
  return (
    <Link to={to} className="block rounded-2xl border border-tray bg-white p-5 shadow-sm hover:border-brand/40 hover:shadow-md transition-[border-color,box-shadow]">
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <p className={`mt-2 font-display text-3xl font-extrabold ${highlight ? 'text-brand' : 'text-cocoa'}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-500">{note}</p>
    </Link>
  )
}

// The seller's front page: what needs doing now, the numbers of my auctions and orders, the money that came in and
// my reputation. Every part is read on its own, so one service being down leaves the other parts working; a part
// that failed says so instead of showing a zero that would be wrong.
export default function SellerDashboardPage() {
  const { user } = useAuth()
  const seller = isSeller(user)
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!seller) return undefined
    let cancelled = false
    Promise.allSettled([getMySelling({ page: 0, size: 100 }), getSellingOrders(), getReputation(user.sub)]).then(([selling, orders, reputation]) => {
      if (cancelled) return
      const take = (result) => (result.status === 'fulfilled' ? result.value.data : null)
      setData({ selling: take(selling), orders: take(orders), reputation: take(reputation) })
    })
    return () => {
      cancelled = true
    }
  }, [seller, user?.sub])

  if (!seller) {
    return (
      <>
        <PageHero eyebrow="Bán hàng" title="Tổng quan bán hàng" />
        <div className="max-w-6xl mx-auto px-6 py-12">
          <p role="alert" className="text-sm text-gray-700">
            Chỉ người bán mới xem được trang này.{' '}
            <Link to="/register/seller" className="font-medium text-brand underline">Tìm hiểu cách trở thành người bán</Link>
          </p>
        </div>
      </>
    )
  }

  if (!data) {
    return (
      <>
        <PageHero eyebrow="Bán hàng" title="Tổng quan bán hàng" />
        <p role="status" className="max-w-6xl mx-auto px-6 py-12 text-sm text-gray-500">Đang tải...</p>
      </>
    )
  }

  const items = Array.isArray(data.selling) ? data.selling : null
  const orders = Array.isArray(data.orders) ? data.orders : null
  const sales = items ? sellingStats(items) : null
  const money = orders ? orderStatsForSeller(orders, user.sub) : null
  const todo = sellerTodo({ items: items ?? [], orders: orders ?? [] }, user.sub)
  const dash = '—'
  const failed = 'Không tải được'

  return (
    <>
      <PageHero eyebrow="Bán hàng" title="Tổng quan bán hàng" subtitle="Những việc cần làm, phiên đang bán và doanh thu của bạn." />
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard to="/me/selling" label="Phiên đang chạy" value={sales ? sales.live : dash} note={sales ? `${sales.liveBids} lượt đặt giá, ${sales.pending} chưa bắt đầu` : failed} />
          <StatCard to="/me/selling/orders" label="Đơn cần giao" value={money ? money.toShip : dash} note={money ? `${money.shipped} đơn đã giao` : failed} highlight={money?.toShip > 0} />
          <StatCard to="/me/selling/orders" label="Doanh thu đã thanh toán" value={money ? formatMoney(money.revenue) : dash} note={money ? `${formatMoney(money.awaitingAmount)} đang chờ người mua` : failed} />
          <StatCard
            to="/me/selling"
            label="Phiên đã chốt"
            value={sales ? sales.paid + sales.awaitingPayment + sales.overdue : dash}
            note={sales ? `${sales.paid} đã thanh toán, ${sales.awaitingPayment} chờ thanh toán, ${sales.overdue} quá hạn · ${sales.unsold} không có người mua` : failed}
            highlight={sales?.overdue > 0}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <section aria-labelledby="todo-title" className="lg:col-span-2 rounded-2xl border border-tray bg-white p-5">
            <h2 id="todo-title" className="font-display text-lg font-bold text-cocoa">Cần làm ngay</h2>
            {todo.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">
                {sales && money ? 'Không có việc nào đang chờ bạn.' : 'Chưa xác định được việc cần làm vì một số dữ liệu không tải được.'}{' '}
                <Link to="/me/selling" className="font-medium text-brand underline">Xem phiên đang bán</Link>
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {todo.map((item) => (
                  <li key={item.key}>
                    <Link to={item.to} className={`block rounded-lg border px-4 py-3 text-sm hover:brightness-95 ${TODO_STYLE[item.tone]}`}>{item.text}</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="rep-title" className="rounded-2xl border border-tray bg-white p-5">
            <h2 id="rep-title" className="font-display text-lg font-bold text-cocoa">Uy tín người bán</h2>
            {data.reputation ? (
              <>
                <p className="mt-3 text-sm text-gray-700">
                  Điểm <strong className="font-display text-2xl text-cocoa">{data.reputation.score}</strong> / 100
                </p>
                {TRUST_LABEL[data.reputation.trustLevel] && (
                  <span className="mt-2 inline-block rounded-full border border-tray bg-peach px-3 py-1 text-xs font-medium text-brand">{TRUST_LABEL[data.reputation.trustLevel]}</span>
                )}
                <p className="mt-3 text-xs text-gray-500">Đánh giá: {reputationSummary(data.reputation)}</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-gray-600">Không tải được điểm uy tín.</p>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
