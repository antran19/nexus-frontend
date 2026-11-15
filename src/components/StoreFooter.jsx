import { Link } from 'react-router-dom'

const CURRENT_YEAR = new Date().getFullYear()

const COLUMNS = [
  {
    title: 'Dành cho người mua',
    links: [
      { to: '/products', label: 'Xem sản phẩm đang đấu giá' },
      { to: '/register', label: 'Tạo tài khoản người mua' },
      { to: '/me/bidding', label: 'Phiên của tôi' },
      { to: '/me/orders', label: 'Đơn của tôi' },
    ],
  },
  {
    title: 'Dành cho người bán',
    links: [
      { to: '/register/seller', label: 'Trở thành người bán' },
      { to: '/me/selling', label: 'Phiên đang bán' },
      { to: '/me/selling/orders', label: 'Đơn cần giao' },
    ],
  },
  {
    title: 'Tài khoản',
    links: [
      { to: '/login', label: 'Đăng nhập' },
      { to: '/me', label: 'Hồ sơ của tôi' },
      { to: '/cart', label: 'Giỏ hàng' },
    ],
  },
]

// The footer of every page except the landing page: the five-column layout of the Stitch design reduced to what the
// site really has (no hotline, certificates or partner logos that do not exist).
export default function StoreFooter() {
  return (
    <footer className="border-t border-tray bg-peach text-cocoa">
      <div className="max-w-6xl mx-auto px-6 py-12 grid gap-10 md:grid-cols-5">
        <div className="md:col-span-2">
          <p className="font-display text-2xl font-extrabold tracking-tight text-brand">NEXUS</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-gray-600">
            Nền tảng đấu giá trực tuyến. Mọi lượt ra giá được ghi lại công khai, mọi phiên dùng chung một quy tắc và một đồng hồ đếm ngược.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="font-display text-sm font-bold">{column.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="hover:text-brand">{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-tray">
        <p className="max-w-6xl mx-auto px-6 py-4 text-xs text-gray-500">© {CURRENT_YEAR} Nexus. Bảo lưu mọi quyền.</p>
      </div>
    </footer>
  )
}
