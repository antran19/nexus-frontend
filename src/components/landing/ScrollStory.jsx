import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useRef } from 'react'
import { Link } from 'react-router-dom'

gsap.registerPlugin(ScrollTrigger)

const SCENES = [
  {
    name: 'Đồng hồ',
    image: '/images/scenes/watch.jpg',
    title: 'Đồng hồ',
    body: 'Từ đồng hồ bỏ túi cổ đến những mẫu hiện đại, mỗi món đều có mô tả, giá khởi điểm và thời điểm kết thúc rõ ràng.',
  },
  {
    name: 'Đồ cổ',
    image: '/images/scenes/antique.jpg',
    title: 'Đồ cổ',
    body: 'Gốm sứ, đồ trang trí và những món sưu tầm có tuổi đời. Người bán mô tả nguồn gốc, bạn tự quyết định mức giá của mình.',
  },
  {
    name: 'Trang sức',
    image: '/images/scenes/jewelry.jpg',
    title: 'Trang sức',
    body: 'Vàng, đá quý và những thiết kế thủ công. Theo dõi từng lượt ra giá cho đến giây cuối cùng của phiên.',
  },
  {
    name: 'Máy ảnh cổ',
    image: '/images/scenes/camera.jpg',
    title: 'Máy ảnh cổ',
    body: 'Máy ảnh phim và thiết bị một thời, dành cho người sưu tầm và người yêu nhiếp ảnh.',
  },
  {
    name: 'Nghệ thuật',
    image: '/images/scenes/art.jpg',
    title: 'Nghệ thuật',
    body: 'Tranh và tác phẩm trang trí từ nhiều người bán. Mỗi phiên công khai lịch sử trả giá để bạn ra giá có cơ sở.',
  },
]

const pad = (n) => String(n).padStart(2, '0')

// Pins the stage while the user scrolls and cross-fades between scenes (image +
// text). With reduced motion the scenes simply stack as normal sections.
export default function ScrollStory() {
  const root = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const q = gsap.utils.selector(root)
        const stage = q('[data-stage]')[0]
        const scenes = q('[data-scene]')
        const visuals = q('[data-visual]')
        const bgs = q('[data-bg]')
        const texts = q('[data-text]')
        const names = q('[data-name]')
        const counter = q('[data-counter]')[0]
        const bar = q('[data-bar]')[0]
        const hud = q('[data-hud]')
        const last = scenes.length - 1

        gsap.set(stage, { height: '100vh' })
        gsap.set(scenes, { position: 'absolute', inset: 0, height: '100%' })
        gsap.set(hud, { display: 'flex' })
        gsap.set(bar, { scaleY: 0 })
        gsap.set(visuals.slice(1), { opacity: 0 })
        gsap.set(texts.slice(1), { opacity: 0, y: 48 })

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: stage,
            start: 'top top',
            end: () => `+=${window.innerHeight * last * 0.9}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
          onUpdate: () => {
            const active = Math.min(Math.round(tl.time()), last)
            if (counter) counter.textContent = `${pad(active + 1)} / ${pad(scenes.length)}`
            names.forEach((el, i) => el.classList.toggle('is-active', i === active))
          },
        })

        // Slow push-in on every image while it is on screen.
        bgs.forEach((bg, i) => {
          tl.fromTo(bg, { scale: 1.18 }, { scale: 1, duration: 1.2 }, Math.max(i - 0.6, 0))
        })

        for (let i = 1; i <= last; i++) {
          tl.to(texts[i - 1], { opacity: 0, y: -40, duration: 0.3, ease: 'power1.in' }, i - 0.5)
          tl.to(visuals[i], { opacity: 1, duration: 0.45 }, i - 0.25)
          tl.to(texts[i], { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }, i + 0.05)
        }

        tl.to(bar, { scaleY: 1, duration: last, ease: 'none' }, 0)
        // Hold the last scene for a moment before releasing the pin.
        tl.to({}, { duration: 0.4 }, last)
      })

      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <section ref={root} className="bg-ink text-white" aria-label="Các nhóm đấu giá">
      <div data-stage className="relative overflow-hidden">
        {SCENES.map((scene) => (
          <article key={scene.name} data-scene className="relative min-h-[80vh] overflow-hidden">
            <div data-visual className="absolute inset-0">
              <div
                data-bg
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${scene.image}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/30" />
              <div className="absolute inset-0 bg-gradient-to-r from-ink/70 to-transparent" />
            </div>

            <div
              data-text
              className="relative z-10 h-full min-h-[80vh] max-w-6xl mx-auto px-6 pb-24 flex flex-col justify-end"
            >
              <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold-soft">
                Nhóm đấu giá
              </p>
              <h2 className="mt-3 text-5xl md:text-8xl font-bold uppercase leading-none tracking-tight">
                {scene.title}
              </h2>
              <p className="mt-6 max-w-xl text-base md:text-lg text-white/80 leading-relaxed">
                {scene.body}
              </p>
              <Link
                to="/products"
                className="mt-8 self-start rounded-full border border-white/40 px-6 py-3 text-sm hover:bg-white hover:text-ink transition-colors"
              >
                Xem sản phẩm
              </Link>
            </div>
          </article>
        ))}

        <div
          data-hud
          className="hidden pointer-events-none absolute inset-y-0 right-0 z-20 pr-6 md:pr-10 items-center gap-5"
        >
          <ul className="hidden md:flex flex-col gap-3 text-right text-sm">
            {SCENES.map((scene, i) => (
              <li
                key={scene.name}
                data-name
                className={`story-name${i === 0 ? ' is-active' : ''}`}
              >
                {scene.name}
              </li>
            ))}
          </ul>
          <div className="relative h-40 w-px bg-white/25">
            <div data-bar className="absolute inset-0 origin-top bg-gold" />
          </div>
        </div>

        <p
          data-hud
          data-counter
          className="hidden pointer-events-none absolute left-6 md:left-auto md:right-10 bottom-8 z-20 text-sm tracking-widest text-white/70"
        >
          {`01 / ${pad(SCENES.length)}`}
        </p>
      </div>
    </section>
  )
}
