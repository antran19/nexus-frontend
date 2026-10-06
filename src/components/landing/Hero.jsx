import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useCategories, useDiscoverProducts } from './useLandingData'

const TITLE_LINES = ['Mỗi giây,', 'một lượt ra giá mới.']
const CLIPS = ['/videos/hero.mp4', '/videos/hero-jewelry.mp4', '/videos/hero-watch.mp4']
const HOLD = 6 // seconds each clip stays on screen

export default function Hero() {
  const scope = useRef(null)
  const categories = useCategories()
  const products = useDiscoverProducts()

  // Only numbers we can actually back with data: the two counts come from the
  // API, the other two are properties of the platform, not invented metrics.
  const stats = [
    { value: products.length > 0 ? String(products.length) : '—', label: 'Sản phẩm đang đấu giá' },
    { value: categories.length > 0 ? String(categories.length) : '—', label: 'Danh mục' },
    { value: '24/7', label: 'Phiên đấu giá luôn mở' },
    { value: 'Real-time', label: 'Cập nhật lượt ra giá' },
  ]

  useGSAP(
    () => {
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('[data-hero-eyebrow]', { y: 24, opacity: 0, duration: 0.6 })
        .from('[data-hero-word]', { yPercent: 110, duration: 0.9, stagger: 0.08 }, '-=0.3')
        .from('[data-hero-subtitle]', { y: 24, opacity: 0, duration: 0.7 }, '-=0.5')
        .from('[data-hero-cta]', { y: 16, opacity: 0, duration: 0.6, stagger: 0.1 }, '-=0.4')
        .from('[data-hero-stat]', { y: 24, opacity: 0, duration: 0.6, stagger: 0.08 }, '-=0.3')

      // Slow, continuous zoom on the video stack -- the "moving image" feel
      // even if the footage itself is mostly static.
      gsap.to('[data-hero-media]', {
        scale: 1.08,
        duration: 12,
        ease: 'none',
        repeat: -1,
        yoyo: true,
      })

      // Constant "breathing" pulse on the primary button so it keeps drawing the
      // eye. Runs on touch screens too; skipped for reduced motion. Scale is
      // independent of the x/y that the cursor-follow below drives.
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.to('[data-magnet]', {
          scale: 1.08,
          duration: 0.9,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        })
      }

      // Primary button trails the cursor across the hero. It only moves a
      // fraction of the distance and is clamped, so it never leaves the
      // lower band or covers the headline; it eases back home on leave.
      // Skipped for touch screens and reduced motion.
      const magnet = gsap.matchMedia()
      magnet.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
        const hero = scope.current
        const anchor = hero.querySelector('[data-magnet-anchor]')
        const button = hero.querySelector('[data-magnet]')
        const moveX = gsap.quickTo(button, 'x', { duration: 0.7, ease: 'power3.out' })
        const moveY = gsap.quickTo(button, 'y', { duration: 0.7, ease: 'power3.out' })
        const PULL = 0.35
        const LIMIT_X = 260
        const LIMIT_Y = 70

        const onMove = (event) => {
          const rect = anchor.getBoundingClientRect()
          const dx = event.clientX - (rect.left + rect.width / 2)
          const dy = event.clientY - (rect.top + rect.height / 2)
          moveX(gsap.utils.clamp(-LIMIT_X, LIMIT_X, dx * PULL))
          moveY(gsap.utils.clamp(-LIMIT_Y, LIMIT_Y, dy * PULL))
        }
        const onLeave = () => {
          moveX(0)
          moveY(0)
        }

        hero.addEventListener('pointermove', onMove)
        hero.addEventListener('pointerleave', onLeave)
        return () => {
          hero.removeEventListener('pointermove', onMove)
          hero.removeEventListener('pointerleave', onLeave)
        }
      })

      // Rotate through the background clips with a cross-fade. The next clip
      // starts playing (still invisible) just before the fade so it never
      // shows a frozen first frame.
      const clips = gsap.utils.toArray('[data-hero-clip]')
      const bars = gsap.utils.toArray('[data-hero-bar]')
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      gsap.set(clips.slice(1), { opacity: 0 })
      gsap.set(bars, { scaleX: 0 })
      if (reduced || clips.length < 2) return () => magnet.revert()

      const calls = []
      let current = 0
      const fillBar = (i) => gsap.fromTo(bars[i], { scaleX: 0 }, { scaleX: 1, duration: HOLD, ease: 'none' })
      fillBar(0)

      const cycle = () => {
        const next = (current + 1) % clips.length
        calls.push(
          gsap.delayedCall(HOLD - 1.5, () => {
            clips[next].currentTime = 0
            clips[next].play().catch(() => {})
          }),
          gsap.delayedCall(HOLD, () => {
            const previous = current
            gsap.to(clips[previous], { opacity: 0, duration: 1.2 })
            gsap.to(clips[next], { opacity: 1, duration: 1.2 })
            gsap.set(bars[previous], { scaleX: 0 })
            calls.push(gsap.delayedCall(1.3, () => clips[previous].pause()))
            current = next
            fillBar(next)
            cycle()
          }),
        )
      }
      cycle()

      return () => {
        calls.forEach((call) => call.kill())
        magnet.revert()
      }
    },
    { scope },
  )

  return (
    <section ref={scope} className="relative min-h-screen overflow-hidden bg-ink text-white">
      <div data-hero-media className="absolute inset-0">
        {CLIPS.map((src, index) => (
          <video
            key={src}
            data-hero-clip
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay={index === 0}
            muted
            loop
            playsInline
            preload={index === 0 ? 'auto' : 'none'}
            poster="/images/hero-poster.jpg"
          >
            <source src={src} type="video/mp4" />
          </video>
        ))}
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-ink" />

      <div className="relative z-10 min-h-screen max-w-5xl mx-auto px-6 pt-24 pb-10 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <span
            data-hero-eyebrow
            className="text-xs font-semibold tracking-[0.25em] uppercase text-gold-soft mb-5"
          >
            Đấu giá trực tuyến thời gian thực
          </span>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold uppercase leading-[1.05] tracking-tight">
            {TITLE_LINES.map((line) => (
              <span key={line} className="block">
                {line.split(' ').map((word, index) => (
                  <span key={`${word}-${index}`} className="inline-block overflow-hidden align-bottom pt-[0.25em] -mt-[0.25em] pb-1 mr-[0.25em]">
                    <span data-hero-word className="inline-block">
                      {word}
                    </span>
                  </span>
                ))}
              </span>
            ))}
          </h1>

          <p data-hero-subtitle className="text-white/80 text-base md:text-lg mt-6 max-w-xl">
            Tham gia các phiên đấu giá đang diễn ra trên Nexus — minh bạch, cập nhật tức thì,
            không bỏ lỡ cơ hội nào.
          </p>

          <a
            data-hero-cta
            href="#how-it-works"
            className="mt-9 inline-flex items-center gap-2 rounded-full border border-white/40 px-7 py-3.5 text-white hover:bg-white/10 transition-colors"
          >
            Khám phá thêm
          </a>
        </div>

        {/* Primary action sits low in the hero, away from the headline. Its
            wrapper stays put (it is the anchor the pointer distance is measured
            from) while the link inside follows the cursor. */}
        <div data-hero-cta data-magnet-anchor className="flex justify-center py-10 md:py-14">
          <Link
            data-magnet
            to="/products"
            className="inline-flex items-center rounded-full bg-gold text-ink font-semibold px-9 py-4 shadow-lg shadow-black/40 hover:bg-gold-soft transition-colors will-change-transform"
          >
            Xem đấu giá đang diễn ra
          </Link>
        </div>

        <div className="flex justify-center gap-2 mb-5" aria-hidden>
          {CLIPS.map((src) => (
            <div key={src} className="h-0.5 w-14 bg-white/25 overflow-hidden">
              <div data-hero-bar className="h-full origin-left bg-gold-soft" />
            </div>
          ))}
        </div>

        <dl className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/15 rounded-2xl overflow-hidden backdrop-blur">
          {stats.map((stat) => (
            <div key={stat.label} data-hero-stat className="bg-black/40 px-5 py-5 text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="text-2xl md:text-3xl font-semibold text-gold-soft">{stat.value}</dd>
              <p className="text-xs text-white/70 mt-1">{stat.label}</p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
