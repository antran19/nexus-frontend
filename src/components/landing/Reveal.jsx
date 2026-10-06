import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useRef } from 'react'

gsap.registerPlugin(ScrollTrigger)

// Fades + slides its children up as they scroll into view. Wrap any section
// (or list of items, via `stagger`) in this instead of hand-rolling
// ScrollTrigger/useGSAP boilerplate per component.
export default function Reveal({ children, as: Tag = 'div', stagger = 0, y = 32, className }) {
  const ref = useRef(null)

  useGSAP(
    () => {
      const targets = stagger ? gsap.utils.toArray(ref.current.children) : ref.current

      gsap.from(targets, {
        y,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        stagger,
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      })
    },
    { scope: ref },
  )

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}
