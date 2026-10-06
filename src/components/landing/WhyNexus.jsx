import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useRef } from 'react'
import Reveal from './Reveal'

gsap.registerPlugin(ScrollTrigger)

const REASONS = [
  { title: 'Thời gian thực', body: 'Mỗi lượt ra giá được xử lý tuần tự và đẩy sự kiện qua Kafka gần như tức thì.' },
  { title: 'Minh bạch', body: 'Toàn bộ lịch sử đặt giá được lưu lại, không thể chỉnh sửa sau khi đã đặt.' },
  { title: 'An toàn', body: 'Xác thực JWT và phân quyền chặt chẽ cho mọi thao tác mua, bán, đấu giá.' },
  { title: 'Công bằng', body: 'Mọi người dùng cùng một quy tắc, cùng một đồng hồ đếm ngược cho mỗi phiên.' },
  { title: 'Rõ ràng', body: 'Giá khởi điểm, bước giá và thời gian kết thúc hiển thị đầy đủ trước khi bạn tham gia.' },
  { title: 'Luôn mở', body: 'Theo dõi và đặt giá mọi lúc, trên máy tính lẫn điện thoại.' },
]

export default function WhyNexus() {
  const bgRef = useRef(null)

  useGSAP(() => {
    gsap.to(bgRef.current, {
      yPercent: 15,
      ease: 'none',
      scrollTrigger: {
        trigger: bgRef.current,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    })
  })

  return (
    <section className="relative overflow-hidden py-20">
      <div
        ref={bgRef}
        className="absolute inset-[-10%] bg-cover bg-center"
        style={{ backgroundImage: "url('/images/why-nexus.jpg')" }}
      />
      <div className="absolute inset-0 bg-ink/80" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <Reveal as="div" className="text-center max-w-2xl mx-auto mb-12 text-white">
          <h2 className="text-3xl md:text-4xl font-bold">Vì sao chọn Nexus</h2>
          <p className="mt-3 text-white/70">
            Không chỉ là nơi đặt giá, Nexus là sàn đấu giá bạn có thể tin tưởng từng lượt ra giá.
          </p>
        </Reveal>

        <Reveal as="div" stagger={0.08} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REASONS.map((reason, index) => (
            <article
              key={reason.title}
              className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-6 text-white"
            >
              <span className="text-sm font-semibold text-gold-soft">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="mt-3 text-lg font-semibold">{reason.title}</h3>
              <p className="mt-2 text-sm text-white/70 leading-relaxed">{reason.body}</p>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
