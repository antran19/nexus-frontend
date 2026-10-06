import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useRef } from 'react'
import Reveal from './Reveal'
import { IS_SAMPLE_DATA, TESTIMONIALS } from './testimonialData'

gsap.registerPlugin(ScrollTrigger)

// Pins the section and slides the card track sideways as the user scrolls.
// With reduced motion the cards wrap into a normal grid instead.
export default function Testimonials() {
  const root = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const stage = root.current.querySelector('[data-t-stage]')
        const track = root.current.querySelector('[data-t-track]')
        const cards = gsap.utils.toArray('[data-t-card]')
        const distance = () => Math.max(track.scrollWidth - window.innerWidth + 48, 0)

        gsap.set(track, { flexWrap: 'nowrap', width: 'max-content' })
        gsap.set(stage, { minHeight: '100vh' })
        gsap.set(cards, { flex: '0 0 auto', width: window.innerWidth < 640 ? '82vw' : '26rem' })

        const slide = gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: stage,
            start: 'top top',
            end: () => `+=${distance() * 1.1}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        })

        // Cards lean slightly and settle as they pass through the centre.
        cards.forEach((card) => {
          gsap.fromTo(
            card,
            { rotate: 2.5, scale: 0.94 },
            {
              rotate: 0,
              scale: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: card,
                containerAnimation: slide,
                start: 'left 98%',
                end: 'left 62%',
                scrub: true,
              },
            },
          )
        })
      })

      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section ref={root} className="relative bg-ink text-white" aria-label="Đánh giá của người dùng">
      <img
        src="/images/why-nexus.jpg"
        alt=""
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/70 to-ink" />
      <div data-t-stage className="relative flex flex-col justify-center py-20 overflow-hidden">
        <Reveal as="div" className="max-w-6xl w-full mx-auto px-6 mb-12">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold-soft">Người dùng nói gì</p>
          <h2 className="mt-3 text-3xl md:text-5xl font-bold leading-tight max-w-2xl">
            Những người đã ra giá trên Nexus.
          </h2>
          {IS_SAMPLE_DATA && (
            <p className="mt-3 text-xs text-white/40">Nội dung mô phỏng, chưa phải đánh giá của người dùng thật.</p>
          )}
        </Reveal>

        <div data-t-track className="flex flex-wrap gap-6 px-6 md:px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]">
          {TESTIMONIALS.map((item) => (
            <figure
              key={item.name}
              data-t-card
              className="w-full sm:w-[26rem] overflow-hidden rounded-2xl bg-cream text-ink shadow-[0_0_60px_rgba(241,237,230,0.14)] flex flex-col"
            >
              <div className="relative h-44 overflow-hidden">
                <img src={item.image} alt="" loading="lazy" className="w-full h-full object-cover" />
                <span className="absolute left-4 bottom-4 rounded-full bg-ink/80 px-3 py-1 text-xs font-medium text-gold-soft backdrop-blur">
                  {item.tag}
                </span>
              </div>
              <div className="flex flex-1 flex-col justify-between p-7">
                <blockquote className="italic leading-relaxed text-ink/85">“{item.quote}”</blockquote>
                <figcaption className="mt-6">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-ink/55">{item.role}</p>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
