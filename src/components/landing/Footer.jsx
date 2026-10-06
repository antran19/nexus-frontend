import { Link } from 'react-router-dom'
import { CONTACT, FOOTER_CATEGORY_LIMIT, GITHUB_URL } from './footerData'
import { scrollToTarget } from './useSmoothScroll'
import { useCategories } from './useLandingData'

const CURRENT_YEAR = new Date().getFullYear()

const linkClass = 'hover:text-gold-soft transition-colors'
const headingClass = 'text-lg font-light text-white'
const EXTERNAL_LINK = { target: '_blank', rel: 'noopener noreferrer' }

// Small outlined glyphs for the contact rows (inline SVG, no icon library).
const ICON_PATHS = {
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  phone: (
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  code: <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" />,
}

function ContactIcon({ name }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-0.5 shrink-0 text-gold-soft"
    >
      {ICON_PATHS[name]}
    </svg>
  )
}

export default function Footer() {
  const categories = useCategories().slice(0, FOOTER_CATEGORY_LIMIT)

  // Order follows EVCare: address, phone, email, hours. The first three come
  // from footerData.js and are skipped while blank.
  const contactRows = [
    CONTACT.address && { icon: 'pin', text: CONTACT.address },
    CONTACT.phone && { icon: 'phone', text: CONTACT.phone, href: `tel:${CONTACT.phone.replace(/\s/g, '')}` },
    CONTACT.email && { icon: 'mail', text: CONTACT.email, href: `mailto:${CONTACT.email}` },
    { icon: 'clock', text: 'Phiên đấu giá mở 24/7, bạn có thể ra giá bất cứ lúc nào.' },
    GITHUB_URL && { icon: 'code', text: GITHUB_URL.replace(/^https?:\/\//, ''), href: GITHUB_URL, external: true },
  ].filter(Boolean)

  const columns = categories.length > 0 ? 'md:grid-cols-4' : 'md:grid-cols-3'

  return (
    <footer className="bg-ink text-white/70">
      <div className={`max-w-6xl mx-auto px-6 pt-20 pb-16 grid grid-cols-1 gap-x-10 gap-y-12 ${columns}`}>
        <div>
          <h3 className="text-4xl font-bold text-gold">Nexus</h3>
          <p className="mt-6 text-[15px] leading-8">
            Nền tảng đấu giá trực tuyến đáng tin cậy. Mọi lượt ra giá được ghi lại công khai, mọi phiên
            dùng chung một quy tắc và một đồng hồ đếm ngược, để bạn yên tâm trả giá.
          </p>
        </div>

        <nav aria-label="Liên kết nhanh">
          <h4 className={headingClass}>Liên kết nhanh</h4>
          <ul className="mt-6 space-y-4 text-[15px]">
            <li>
              <Link to="/" className={linkClass}>
                Trang chủ
              </Link>
            </li>
            <li>
              <Link to="/products" className={linkClass}>
                Sản phẩm
              </Link>
            </li>
            <li>
              <a
                href="#how-it-works"
                onClick={(event) => {
                  event.preventDefault()
                  scrollToTarget('#how-it-works')
                }}
                className={linkClass}
              >
                Cách hoạt động
              </a>
            </li>
            <li>
              <Link to="/login" className={linkClass}>
                Đăng nhập
              </Link>
            </li>
            <li>
              <Link to="/register" className={linkClass}>
                Đăng ký
              </Link>
            </li>
          </ul>
        </nav>

        {categories.length > 0 && (
          <nav aria-label="Danh mục">
            <h4 className={headingClass}>Danh mục</h4>
            <ul className="mt-6 space-y-4 text-[15px]">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link to={`/products?categoryId=${category.id}`} className={linkClass}>
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div>
          <h4 className={headingClass}>Thông tin liên hệ</h4>
          <ul className="mt-6 space-y-5 text-[15px] leading-7">
            {contactRows.map((row) => (
              <li key={row.icon} className="flex gap-4">
                <ContactIcon name={row.icon} />
                {row.href ? (
                  <a href={row.href} className={linkClass} {...(row.external && EXTERNAL_LINK)}>
                    {row.text}
                  </a>
                ) : (
                  <span>{row.text}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* The call-to-action straddles the divider, as on EVCare. */}
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="border-t border-white/15" />
        <div className="absolute inset-x-0 top-0 flex justify-center -translate-y-1/2">
          <Link
            to="/products"
            className="rounded-xl bg-gold px-8 py-3.5 text-[15px] font-semibold text-ink shadow-lg shadow-black/40 hover:bg-gold-soft transition-colors"
          >
            Xem đấu giá ngay
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-10 pb-24 md:pb-8 flex flex-col items-center justify-between gap-3 text-sm md:flex-row">
        <p>© {CURRENT_YEAR} Nexus. Bảo lưu mọi quyền.</p>
        <p className="text-white/50">Project Nexus · Spring Boot · Kafka · React</p>
      </div>
    </footer>
  )
}
