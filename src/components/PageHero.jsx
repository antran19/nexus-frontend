// Dark title band shared by the inner pages, matching the landing page's ink + gold look.
// `children` goes in a right-hand slot (search box, step hint...).
export default function PageHero({ eyebrow, title, subtitle, children }) {
  return (
    <section className="relative bg-ink text-white border-b border-gold/30">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-60" />
      <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          {eyebrow && (
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold">{eyebrow}</p>
          )}
          <h1 className="mt-3 text-3xl md:text-5xl font-light leading-tight">{title}</h1>
          {subtitle && <p className="mt-3 max-w-xl text-white/70">{subtitle}</p>}
        </div>
        {children}
      </div>
    </section>
  )
}
