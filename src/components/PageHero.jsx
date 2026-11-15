// Title band shared by the inner pages, in the warm marketplace look of the Stitch design.
// `children` goes in a right-hand slot (search box, step hint...).
export default function PageHero({ eyebrow, title, subtitle, children }) {
  return (
    <section className="bg-white border-b border-tray">
      <div className="max-w-6xl mx-auto px-6 py-8 md:py-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          {eyebrow && (
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-brand">{eyebrow}</p>
          )}
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold leading-tight text-cocoa">{title}</h1>
          {subtitle && <p className="mt-2 max-w-xl text-gray-600">{subtitle}</p>}
        </div>
        {children}
      </div>
    </section>
  )
}
