import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { useEffect } from 'react'

gsap.registerPlugin(ScrollTrigger)

let activeLenis = null

// Smoothly returns to the top of the page. Goes through Lenis when it is
// running (a native scrollTo would fight its inertia); otherwise falls back to
// the browser, which respects reduced motion via CSS.
export function scrollToTop() {
  if (activeLenis) activeLenis.scrollTo(0, { duration: 1.4 })
  else window.scrollTo({ top: 0 })
}

// Smoothly scrolls to the element matching `selector` (same Lenis-or-native
// fallback as scrollToTop).
export function scrollToTarget(selector) {
  const element = document.querySelector(selector)
  if (!element) return
  if (activeLenis) activeLenis.scrollTo(element, { duration: 1.4 })
  else element.scrollIntoView()
}

// Inertial smooth scrolling, driven by GSAP's ticker so every ScrollTrigger
// (pins, scrubs, reveals) reads the same smoothed scroll position. Skipped for
// users who ask for reduced motion.
export default function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, anchors: true })
    activeLenis = lenis
    lenis.on('scroll', ScrollTrigger.update)

    const tick = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      if (activeLenis === lenis) activeLenis = null
    }
  }, [])
}
