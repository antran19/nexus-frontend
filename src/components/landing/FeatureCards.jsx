import Reveal from './Reveal'

const FEATURES = [
  { title: 'Đặt giá tức thì', body: 'Ra giá chỉ với một thao tác, kết quả cập nhật ngay cho mọi người tham gia.' },
  { title: 'Lịch sử minh bạch', body: 'Mọi lượt đặt giá được ghi lại và không thể chỉnh sửa sau khi đã đặt.' },
  { title: 'Thông báo kịp thời', body: 'Nhận thông báo khi có người trả giá cao hơn hoặc khi phiên sắp kết thúc.' },
  { title: 'Tài khoản an toàn', body: 'Xác thực JWT và phân quyền chặt chẽ cho mọi thao tác mua, bán, đấu giá.' },
  { title: 'Theo dõi dễ dàng', body: 'Xem các phiên bạn quan tâm và trạng thái từng sản phẩm tại một nơi.' },
]

export default function FeatureCards() {
  return (
    <section className="bg-ink py-16">
      <Reveal
        as="div"
        stagger={0.08}
        className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
      >
        {FEATURES.map((feature, index) => (
          <article
            key={feature.title}
            className="border-t border-white/20 pt-5 hover:border-gold transition-[border-color]"
          >
            <p className="text-sm text-gold-soft tabular-nums">{String(index + 1).padStart(2, '0')}</p>
            <h3 className="mt-4 text-base font-semibold text-white">{feature.title}</h3>
            <p className="mt-2 text-sm text-white/65 leading-relaxed">{feature.body}</p>
          </article>
        ))}
      </Reveal>
    </section>
  )
}
