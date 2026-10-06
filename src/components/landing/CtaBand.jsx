import { Link } from 'react-router-dom'
import Reveal from './Reveal'

// A large rounded panel inset from the page edges, like the closing block on
// EVCare, rather than a full-bleed band.
export default function CtaBand() {
  return (
    <section className="bg-ink px-3 pb-3 md:px-4 md:pb-4 pt-2">
      <div className="relative overflow-hidden rounded-3xl text-white">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster="/images/hero-poster.jpg"
        >
          <source src="/videos/cta-gavel.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-ink/65" />
        <Reveal
          as="div"
          className="relative z-10 max-w-4xl mx-auto px-6 py-32 md:py-44 text-center flex flex-col items-center"
        >
          <h2 className="text-4xl md:text-6xl font-light leading-tight">
            Sẵn sàng ra giá cho món đồ bạn thích?
          </h2>
          <p className="text-white/80 mt-6 max-w-xl text-base md:text-lg">
            Tạo tài khoản miễn phí, theo dõi các phiên đang diễn ra và đặt giá ngay khi bạn thấy phù hợp.
          </p>
          <Link
            to="/register"
            className="mt-10 inline-block rounded-xl bg-gold text-ink font-semibold px-9 py-4 shadow-lg shadow-black/30 hover:bg-gold-soft transition-colors"
          >
            Đăng ký ngay
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
