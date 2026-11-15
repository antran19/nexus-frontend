import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyBidding } from '../api/auctions'
import { getMyNotifications } from '../api/notifications'
import { getMyOrders } from '../api/orders'
import { getReputation } from '../api/ratings'
import { getMyProfile } from '../api/users'
import PageHero from '../components/PageHero'
import { useAuth } from '../context/AuthContext'
import { biddingStats, formatMoney, orderStats, todoItems } from '../utils/dashboard'
import { shortenIds, timeAgo } from '../utils/notifications'
import { reputationSummary, TRUST_LABEL } from '../utils/ratings'

const TODO_STYLE = {
  pay: 'border-amber-300 bg-amber-50 text-amber-900',
  outbid: 'border-red-200 bg-red-50 text-red-900',
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

// The buyer's front page: what needs doing now, the numbers of my auctions and orders, my reputation and the latest
// notifications. Every part is read on its own, so one service being down leaves the other parts working; a part
// that failed says so instead of showing a zero that would be wrong.
export default function BuyerDashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([
      getMyProfile(),
      getMyBidding(0, 100),
      getMyOrders(),
      getReputation(user?.sub),
      getMyNotifications({ size: 5 }),
    ]).then(([profile, bidding, orders, reputation, notifications]) => {
      if (cancelled) return
      const take = (result) => (result.status === 'fulfilled' ? result.value.data : null)
      setData({
        profile: take(profile),
        bidding: take(bidding),
        orders: take(orders),
        reputation: take(reputation),
        notifications: take(notifications),
      })
    })
    return () => {
      cancelled = true
    }
  }, [user?.sub])

  if (!data) {
    return (
      <>
        <PageHero eyebrow="Tài khoản" title="Tổng quan" />
        <p role="status" className="max-w-6xl mx-auto px-6 py-12 text-sm text-gray-500">Đang tải...</p>
      </>
    )
  }

  const biddingList = Array.isArray(data.bidding) ? data.bidding : null
  const orderList = Array.isArray(data.orders) ? data.orders : null
  const bids = biddingList ? biddingStats(biddingList) : null
  const orders = orderList ? orderStats(orderList) : null
  const todo = todoItems({ bidding: biddingList ?? [], orders: orderList ?? [] })
  const notifications = Array.isArray(data.notifications) ? data.notifications : null
  const dash = '—'

  return (
    <>
      <PageHero
        eyebrow="Tài khoản"
        title={data.profile?.fullName ? `Xin chào, ${data.profile.fullName}` : 'Tổng quan'}
        subtitle="Những việc cần làm và tình hình đấu giá, đơn hàng của bạn."
      />
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard to="/me/bidding" label="Phiên đang theo" value={bids ? bids.live : dash} note={bids ? `Dẫn đầu ${bids.leading} phiên` : 'Không tải được'} />
          <StatCard to="/me/bidding" label="Bị vượt giá" value={bids ? bids.outbid : dash} note={bids ? 'Phiên cần ra giá lại' : 'Không tải được'} highlight={bids?.outbid > 0} />
          <StatCard to="/me/orders" label="Chờ thanh toán" value={orders ? orders.awaiting : dash} note={orders ? formatMoney(orders.awaitingTotal) : 'Không tải được'} highlight={orders?.awaiting > 0} />
          <StatCard to="/me/orders" label="Đơn đang xử lý" value={orders ? orders.preparing : dash} note={orders ? `${orders.shipped} đơn đã giao` : 'Không tải được'} />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <section aria-labelledby="todo-title" className="lg:col-span-2 rounded-2xl border border-tray bg-white p-5">
            <h2 id="todo-title" className="font-display text-lg font-bold text-cocoa">Cần làm ngay</h2>
            {todo.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">
                {bids && orders ? 'Không có việc nào đang chờ bạn.' : 'Chưa xác định được việc cần làm vì một số dữ liệu không tải được.'}{' '}
                <Link to="/products" className="font-medium text-brand underline">Xem sản phẩm đang đấu giá</Link>
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
            <h2 id="rep-title" className="font-display text-lg font-bold text-cocoa">Uy tín của bạn</h2>
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

        <section aria-labelledby="notif-title" className="rounded-2xl border border-tray bg-white p-5">
          <h2 id="notif-title" className="font-display text-lg font-bold text-cocoa">Thông báo mới</h2>
          {notifications === null && <p className="mt-3 text-sm text-gray-600">Không tải được thông báo.</p>}
          {notifications && notifications.length === 0 && <p className="mt-3 text-sm text-gray-600">Chưa có thông báo nào.</p>}
          {notifications && notifications.length > 0 && (
            <ul className="mt-3 divide-y divide-tray text-sm">
              {notifications.map((item) => (
                <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                  <span className={item.read ? 'text-gray-600' : 'font-medium text-cocoa'}>{shortenIds(item.message)}</span>
                  <span className="text-xs text-gray-500">{timeAgo(item.occurredAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
