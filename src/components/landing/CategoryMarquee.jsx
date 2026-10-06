import { useCategories } from './useLandingData'

// Replaces EVCare's brand-logo strip: we have no partner logos, but we do have
// real category names from the catalog service.
export default function CategoryMarquee() {
  const categories = useCategories()

  if (categories.length === 0) return null

  // Duplicate the list so translating by -50% loops seamlessly.
  const loop = [...categories, ...categories]

  return (
    <section className="bg-ink border-y border-white/10 py-8 overflow-hidden" aria-label="Danh mục sản phẩm">
      <p className="text-center text-xs font-semibold tracking-[0.25em] uppercase text-white/50 mb-5">
        Các danh mục trên Nexus
      </p>
      <div className="flex w-max animate-marquee motion-reduce:animate-none">
        {loop.map((category, index) => (
          <span
            key={`${category.id}-${index}`}
            className="mx-8 whitespace-nowrap text-xl md:text-2xl font-semibold text-white/70"
          >
            {category.name}
            <span aria-hidden className="ml-16 inline-block h-px w-10 bg-gold align-middle" />
          </span>
        ))}
      </div>
    </section>
  )
}
