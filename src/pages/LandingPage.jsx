import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef } from 'react'
import BackToTop from '../components/landing/BackToTop'
import CategoryGrid from '../components/landing/CategoryGrid'
import CategoryMarquee from '../components/landing/CategoryMarquee'
import CtaBand from '../components/landing/CtaBand'
import FeatureCards from '../components/landing/FeatureCards'
import FeaturedAuctions from '../components/landing/FeaturedAuctions'
import Footer from '../components/landing/Footer'
import Hero from '../components/landing/Hero'
import HowItWorks from '../components/landing/HowItWorks'
import ScrollStory from '../components/landing/ScrollStory'
import Testimonials from '../components/landing/Testimonials'
import useSmoothScroll from '../components/landing/useSmoothScroll'
import { useCategories, useDiscoverProducts } from '../components/landing/useLandingData'
import VideoStrip from '../components/landing/VideoStrip'
import WhyNexus from '../components/landing/WhyNexus'

gsap.registerPlugin(ScrollTrigger)

export default function LandingPage() {
  const categories = useCategories()
  const products = useDiscoverProducts()
  const progress = useRef(null)

  useSmoothScroll()

  // The marquee, category grid and product grid mount once their data arrives
  // and shift everything below them. Recompute pinned/scroll trigger positions
  // so the pinned sections and the reveals still fire at the right scroll offset.
  useEffect(() => {
    ScrollTrigger.refresh()
  }, [categories.length, products.length])

  // Thin page-progress bar along the top edge.
  useEffect(() => {
    gsap.set(progress.current, { scaleX: 0 })
    const tween = gsap.to(progress.current, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
    })
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [])

  return (
    <div>
      <div
        ref={progress}
        className="fixed top-0 left-0 right-0 z-50 h-0.5 origin-left bg-gold"
      />
      <Hero />
      <VideoStrip />
      <FeatureCards />
      <CategoryMarquee />
      <HowItWorks />
      <ScrollStory />
      <WhyNexus />
      <CategoryGrid />
      <FeaturedAuctions />
      <Testimonials />
      <CtaBand />
      <Footer />
      <BackToTop />
    </div>
  )
}
