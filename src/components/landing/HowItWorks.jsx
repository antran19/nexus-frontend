import Reveal from './Reveal'

const STEPS = [
  {
    title: 'Tạo tài khoản',
    body: 'Đăng ký miễn phí và đăng nhập. Hồ sơ của bạn dùng để đặt giá và theo dõi các phiên đã tham gia.',
  },
  {
    title: 'Chọn sản phẩm',
    body: 'Duyệt theo danh mục hoặc tìm kiếm. Mỗi sản phẩm hiển thị rõ giá khởi điểm, giá hiện tại và thời gian còn lại.',
  },
  {
    title: 'Ra giá',
    body: 'Nhập mức giá cao hơn giá hiện tại. Lượt ra giá được ghi nhận ngay và hiển thị cho mọi người tham gia.',
  },
  {
    title: 'Thắng phiên',
    body: 'Khi phiên kết thúc, người trả giá cao nhất thắng. Bạn nhận thông báo kết quả ngay lập tức.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-ink text-white py-20 scroll-mt-4">
      <div className="max-w-5xl mx-auto px-6">
        <Reveal as="div" className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold-soft">Quy trình trọng tâm</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold leading-tight">
            Đấu giá cần sự minh bạch trong từng bước. Bạn biết chính xác cần “Làm gì”, “Khi nào”, “Ra sao”.
          </h2>
        </Reveal>

        <Reveal as="ol" stagger={0.1} className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-5">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-2xl bg-ink-soft border border-white/10 p-7 flex gap-5">
              <span className="shrink-0 w-12 h-12 rounded-full bg-gold text-ink font-bold flex items-center justify-center">
                {index + 1}
              </span>
              <div>
                <h3 className="text-lg font-semibold">
                  Bước {index + 1}: {step.title}
                </h3>
                <p className="mt-2 text-sm text-white/70 leading-relaxed">{step.body}</p>
              </div>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
