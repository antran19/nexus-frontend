# nexus-frontend

Giao diện Web cho Project Nexus. React + Vite + Tailwind CSS, gọi API qua
`api-gateway` (cổng 8080).

## Bắt đầu

```bash
npm install
cp .env.example .env.local   # chỉnh VITE_API_BASE_URL nếu Gateway chạy ở cổng khác
npm run dev
```

Lệnh hay dùng:

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy dev server (Vite) |
| `npm test` | Chạy test (`node --test`, không cần trình duyệt) |
| `npm run lint` | Kiểm tra mã bằng oxlint |
| `npm run build` | Build bản production vào `dist/` |

Các trang gọi API thật qua `api-gateway` (cổng 8080) nên cần backend đang chạy (xem
`infra/README.md` trong repo `infra`): đăng nhập, hồ sơ, sản phẩm cần `user-service` và
`catalog-service` (kèm `discovery-server` và Postgres); giỏ hàng, thanh toán, đơn hàng cần thêm
`commerce-service`; đấu giá cần thêm `auction-service`.

## Cấu trúc thư mục

```
src/
├── api/            # 1 file = 1 nhóm endpoint (axios instance dùng chung ở client.js)
├── components/     # Component dùng lại được nhiều nơi (Header, ProductCard, PrivateRoute)
├── context/        # AuthContext: giữ token, decode JWT, login()/logout()
├── pages/          # 1 file = 1 route, khai báo route trong App.jsx
├── utils/          # Hàm thuần (định dạng, kiểm tra form, đổi lỗi API sang tiếng Việt...);
│                   # mỗi file có file `*.test.js` ngay cạnh
├── App.jsx         # Khai báo toàn bộ route
└── main.jsx        # Entry point
```

## Quy ước

- Token JWT lưu trong `localStorage` (key `token`), tự động gắn vào header
  `Authorization` qua interceptor trong `src/api/client.js`.
- **Mọi response backend đều bọc trong `{ success, data, error }`** (`ApiResponse<T>`
  bên Java) — `client.js` đã tự unwrap qua response interceptor, nên code gọi API chỉ
  cần đọc `response.data` như payload thật, không cần tự bóc thêm 1 lớp nữa.
- Trang cần đăng nhập mới xem được thì bọc trong `<Route element={<PrivateRoute />}>`
  (xem ví dụ route `/me` trong `App.jsx`) — chưa đăng nhập sẽ tự động chuyển về `/login`.
- Endpoint tìm kiếm/lọc sản phẩm là `GET /api/v1/products` (không có path `/search`
  riêng) — xem `src/api/products.js`.
- Styling dùng class Tailwind trực tiếp trong JSX, không tạo file `.css` riêng cho
  từng component trừ khi thật sự cần.
- Hiệu ứng cuộn/chuyển động dùng GSAP (`gsap` + `@gsap/react`). Component
  `src/components/landing/Reveal.jsx` là wrapper dùng chung cho fade-in-on-scroll —
  dùng lại nó thay vì tự viết `useGSAP`/`ScrollTrigger` riêng mỗi chỗ.

## Các trang (route)

Khai báo trong `src/App.jsx`. Nhóm "cần đăng nhập" nằm trong `<PrivateRoute />` (chưa đăng
nhập sẽ chuyển về `/login`); trang có header chung nằm trong `<SiteLayout />`.

**Không cần đăng nhập**

| Route | File | Mô tả |
|---|---|---|
| `/` | `pages/LandingPage.jsx` | Trang chủ (xem mục Landing page bên dưới) |
| `/login` | `pages/LoginPage.jsx` | Đăng nhập |
| `/forgot-password` | `pages/ForgotPasswordPage.jsx` | Yêu cầu mã đặt lại mật khẩu |
| `/reset-password` | `pages/ResetPasswordPage.jsx` | Tạo mật khẩu mới |
| `/register` | `pages/RegisterPage.jsx` | Đăng ký |
| `/register/seller` | `pages/SellerRegisterPage.jsx` | Đăng ký làm người bán |
| `/products` | `pages/ProductListPage.jsx` | Danh sách và tìm kiếm sản phẩm (đọc `?categoryId=`) |
| `/products/:id` | `pages/ProductDetailPage.jsx` | Chi tiết sản phẩm |

**Cần đăng nhập** (người mua)

| Route | File | Mô tả |
|---|---|---|
| `/me` | `pages/ProfilePage.jsx` | Thông tin tài khoản, chỉnh sửa |
| `/me/dashboard` | `pages/BuyerDashboardPage.jsx` | Tổng quan của người mua |
| `/me/bidding` | `pages/MyBiddingPage.jsx` | Các phiên đã đặt giá |
| `/me/orders` | `pages/MyOrdersPage.jsx` | Đơn hàng của tôi |
| `/me/orders/:orderId/invoice` | `pages/InvoicePage.jsx` | Hóa đơn của một đơn |
| `/cart` | `pages/CartPage.jsx` | Giỏ hàng |
| `/checkout` | `pages/CheckoutPage.jsx` | Thanh toán, địa chỉ giao hàng |
| `/payment/success` | `pages/PaymentSuccessPage.jsx` | Xác nhận thanh toán sau khi quay về |
| `/payment/cancel` | `pages/PaymentCancelPage.jsx` | Thanh toán chưa hoàn tất |

**Cần đăng nhập** (người bán)

| Route | File | Mô tả |
|---|---|---|
| `/me/selling` | `pages/MySellingPage.jsx` | Các phiên đang bán |
| `/me/selling/dashboard` | `pages/SellerDashboardPage.jsx` | Tổng quan bán hàng |
| `/me/selling/orders` | `pages/SellerOrdersPage.jsx` | Đơn cần giao |

**Cần đăng nhập** (quản trị)

| Route | File | Mô tả |
|---|---|---|
| `/admin/seller-requests` | `pages/SellerRequestsAdminPage.jsx` | Duyệt yêu cầu làm người bán |
| `/admin/orders` | `pages/AdminOrdersPage.jsx` | Quản lý đơn hàng |
| `/admin/categories` | `pages/AdminCategoriesPage.jsx` | Danh mục sản phẩm (thêm, đổi tên, xóa) |
| `/admin/users` | `pages/AdminUsersPage.jsx` | Người dùng và uy tín |

Mọi đường dẫn khác hiện `pages/NotFoundPage.jsx`.

## Kiểm thử

Test nằm cạnh mã cần kiểm tra, tên `*.test.js` (ví dụ `src/utils/session.test.js`), dùng bộ chạy
test có sẵn của Node (`node:test` và `node:assert`), nên chạy `npm test` là đủ, không cần mở
trình duyệt. Logic cần kiểm tra (ánh xạ lỗi API, kiểm tra form, tính toán hiển thị) được tách
thành hàm thuần trong `src/utils/` để test không phải dựng giao diện. Khi thêm một file mới vào
`src/utils/`, thêm luôn file `.test.js` của nó.

## Landing page (`src/components/landing/`)

Thứ tự section nằm trong `pages/LandingPage.jsx`. Cuộn mượt bằng Lenis nối với GSAP
ScrollTrigger (`useSmoothScroll.js`, tự tắt khi người dùng bật giảm chuyển động).

- `Hero.jsx` — xoay vòng 3 video nền, tiêu đề tách từng từ, nút chính bám theo chuột
  (`gsap.quickTo`, tắt trên màn cảm ứng).
- `VideoStrip.jsx` — dải 3 video dọc, trôi theo nhịp cuộn.
- `FeatureCards.jsx`, `HowItWorks.jsx`, `WhyNexus.jsx` — nội dung tĩnh, không có số liệu bịa.
- `CategoryMarquee.jsx`, `CategoryGrid.jsx`, `FeaturedAuctions.jsx` — dữ liệu thật từ
  `useLandingData.js` (gọi `getCategories()` / `getDiscoverProducts()` một lần, dùng chung);
  tự ẩn khi rỗng nên khi DB chưa có dữ liệu các section này không hiện.
- `ScrollStory.jsx` — section ghim, cuộn để đổi cảnh ảnh + chữ (5 nhóm hàng).
- `Testimonials.jsx` — thẻ trượt ngang khi cuộn. **Nội dung trong `testimonialData.js` là
  mẫu**; thay bằng đánh giá thật rồi đặt `IS_SAMPLE_DATA = false` để bỏ dòng chú thích.
- `CtaBand.jsx`, `Footer.jsx` — khối CTA cuối trang (video nền) và chân trang. Footer lấy
  danh mục từ API; cột "Liên hệ" chỉ hiện khi điền `CONTACT` trong `footerData.js`
  (email/điện thoại/địa chỉ, đang để trống để không đưa thông tin bịa lên trang).

Header (`components/Header.jsx`) trong suốt đè lên hero ở trang chủ, đặc lại khi cuộn;
các trang khác giữ header trắng. Bấm "Nexus" ở trang chủ sẽ cuộn lên đầu trang.

Ảnh/video trong `public/images` và `public/videos` lấy từ Pexels (Pexels License —
miễn phí dùng, kể cả thương mại), tải về host trong repo thay vì hotlink. Nguồn từng
file nằm ở `public/CREDITS.md`; `hero-poster.jpg` và `hero.mp4` có từ trước, chưa ghi nguồn.

## Form đăng nhập/đăng ký (`src/components/auth/`)

Layout split-screen (panel trái tối + ảnh, panel phải là form) — dùng chung giữa
`LoginPage.jsx` và `RegisterPage.jsx`:

- `AuthLayout.jsx` — khung 2 cột, nhận `title`/`subtitle` cho panel trái, có nút
  "Trang chủ" và GSAP fade-in khi vào trang.
- `FormField.jsx` — input kiểu gạch chân kèm icon bên trái; `type="password"` tự có
  nút hiện/ẩn mật khẩu, không cần khai báo thêm state riêng ở từng trang.
- `icons.jsx` — bộ icon SVG inline dùng cho form (mail/lock/user/eye), không phụ
  thuộc thư viện icon ngoài.
