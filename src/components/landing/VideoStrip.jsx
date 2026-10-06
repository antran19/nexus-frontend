import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useRef } from 'react'
import Reveal from './Reveal'

gsap.registerPlugin(ScrollTrigger)

// `lift` is how far each tile drifts (in % of its own height) over the section,
// so the three tiles move at different speeds while scrolling.
const TILES = [
  { src: '/videos/tile-watch.mp4', label: 'Đồng hồ', caption: 'Chi tiết từng bộ máy', lift: -12, offset: 'md:mt-16' },
  { src: '/videos/cta-gavel.mp4', label: 'Phiên đấu giá', caption: 'Búa gõ là chốt giá', lift: 8, offset: 'md:mt-0' },
  { src: '/videos/hero-jewelry.mp4', label: 'Trang sức', caption: 'Vàng và đá quý', lift: -18, offset: 'md:mt-24' },
]

export default function VideoStrip() {
  const root = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.utils.toArray('[data-tile]').forEach((tile, i) => {
          const video = tile.querySelector('video')

          // Drift at a different speed per tile.
          gsap.to(tile, {
            yPercent: TILES[i].lift,
            ease: 'none',
            scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
          })

          // Only decode video while it is actually on screen.
          ScrollTrigger.create({
            trigger: tile,
            start: 'top bottom',
            end: 'bottom top',
            onToggle: (self) => {
              if (self.isActive) video.play().catch(() => {})
              else video.pause()
            },
          })
        })
      })

      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section ref={root} className="bg-ink text-white py-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal as="div" className="max-w-xl">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold-soft">Khoảnh khắc</p>
          <h2 className="mt-3 text-3xl md:text-5xl font-bold leading-tight">
            Mỗi món đồ đều có câu chuyện của nó.
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {TILES.map((tile) => (
            <figure
              key={tile.label}
              data-tile
              className={`relative aspect-[3/4] overflow-hidden rounded-2xl bg-ink-soft ${tile.offset}`}
            >
              <video
                className="absolute inset-0 w-full h-full object-cover"
                muted
                loop
                playsInline
                preload="metadata"
                poster="/images/hero-poster.jpg"
              >
                <source src={tile.src} type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-transparent to-transparent" />
              <figcaption className="absolute inset-x-0 bottom-0 p-6">
                <p className="text-xl font-semibold">{tile.label}</p>
                <p className="mt-1 text-sm text-white/70">{tile.caption}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
