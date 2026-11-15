import { Link } from 'react-router-dom'

// The frame of both sign-up pages (buyer and seller), after the Stitch design: a warm panel with the reasons to join
// on the left, the form on a white card on the right. `points` is a list of { title, text }. On a phone the panel
// goes above the form.
export default function RegisterShell({ badge, title, intro, points, footer, children }) {
  return (
    <div className="bg-peach min-h-[60vh]">
      <div className="max-w-6xl mx-auto px-6 py-10 md:py-14 grid lg:grid-cols-5 gap-8 lg:gap-12">
        <aside className="lg:col-span-2">
          <span className="inline-block text-xs font-semibold tracking-wide text-brand bg-white border border-brand/30 rounded-full px-3 py-1">{badge}</span>
          <h1 className="mt-4 font-display text-3xl md:text-4xl font-bold leading-tight text-cocoa">{title}</h1>
          <p className="mt-3 text-gray-600">{intro}</p>
          <ul className="mt-8 space-y-4">
            {points.map((point) => (
              <li key={point.title} className="flex gap-3 bg-white rounded-xl border border-brand/15 p-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white" aria-hidden="true">✓</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{point.title}</p>
                  <p className="mt-0.5 text-xs text-gray-600">{point.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-gray-600">
            {footer ?? (
              <>
                Đã có tài khoản?{' '}
                <Link to="/login" className="font-medium text-brand underline">Đăng nhập</Link>
              </>
            )}
          </p>
        </aside>

        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">{children}</div>
      </div>
    </div>
  )
}
