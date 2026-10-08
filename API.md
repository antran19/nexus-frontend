# Nexus API Reference

Tài liệu này liệt kê toàn bộ API thật của backend (lấy trực tiếp từ code, không suy đoán).
Dùng cho FE tích hợp.

## 1. Tổng quan

- **Base URL**: `http://localhost:8080` (qua `api-gateway`, không gọi thẳng từng service)
- **Auth**: gắn header `Authorization: Bearer <token>` cho API cần đăng nhập (token lấy từ
  `POST /api/v1/auth/login`)
- **Mọi response đều bọc trong 1 envelope chung**:

```json
// Thành công
{ "success": true, "data": { ... }, "error": null }

// Thất bại
{ "success": false, "data": null, "error": { "code": "...", "message": "...", "fieldErrors": [] } }
```

`fieldErrors` chỉ có giá trị khi lỗi do validate field (vd thiếu `price`), dạng
`[{ "field": "price", "message": "must not be null" }]`.

### Mã lỗi HTTP dùng chung

| HTTP | Khi nào |
|---|---|
| 400 | Dữ liệu gửi lên sai định dạng / thiếu field bắt buộc (`error.fieldErrors` có chi tiết) |
| 401 | Chưa đăng nhập hoặc token sai/hết hạn (`error.code = "UNAUTHENTICATED"`) |
| 403 | Đã đăng nhập nhưng thiếu quyền (`error.code = "PRIVILEGE_DENIED"`) |
| 404 | Không tìm thấy resource |
| 409 | Xung đột nghiệp vụ (vd email đã tồn tại, đặt giá quá thấp, request đã duyệt rồi) |

### Quyền (privilege) theo vai trò

| Vai trò | Có thể làm |
|---|---|
| **BUYER** (mặc định khi đăng ký) | Xem mọi thứ công khai, đặt giá đấu giá, mua trực tiếp (giỏ hàng/checkout/đơn hàng), chấm điểm uy tín đối tác, gửi yêu cầu lên SELLER |
| **SELLER** | Như BUYER, cộng thêm: tạo/sửa/xóa sản phẩm và phiên đấu giá **của chính mình**; chỉ xem được đơn hàng, không mua/hủy |
| **SUPPORT_STAFF** | Xem/hủy mọi đơn hàng, xử lý hoàn tiền, xem lịch sử phạt điểm uy tín; không tự mua hàng/chấm điểm |
| **ADMIN** | Toàn quyền: quản lý danh mục, duyệt yêu cầu lên SELLER, can thiệp sản phẩm/đấu giá/đơn hàng của người khác |

Tài khoản mới đăng ký luôn là **BUYER** — muốn bán hàng phải gửi yêu cầu và chờ ADMIN duyệt
(mục 2.4).

---

## 2. User & Auth (`user-service`)

### 2.1. Đăng ký

`POST /api/v1/users/register` — không cần đăng nhập

```json
// Request
{ "email": "a@b.com", "password": "ít nhất 6 ký tự", "fullName": "Nguyễn Văn A" }
```
```json
// Response 201
{ "success": true, "data": { "id": "...", "email": "a@b.com", "fullName": "Nguyễn Văn A" } }
```
Lỗi: `409 EMAIL_ALREADY_REGISTERED` nếu email đã tồn tại.

### 2.2. Đăng nhập

`POST /api/v1/auth/login` — không cần đăng nhập

```json
// Request
{ "email": "a@b.com", "password": "..." }
```
```json
// Response 200
{ "success": true, "data": { "token": "<JWT>" } }
```
Lỗi: `401` nếu sai email/mật khẩu (dùng chung lỗi xác thực, không nói rõ sai cái nào).

Token JWT giải mã ra có `sub` = userId và `privileges` = mảng quyền — FE không cần tự đọc,
chỉ cần đính kèm nguyên token vào header.

### 2.3. Đổi mật khẩu

`PUT /api/v1/users/me/password` — cần đăng nhập

```json
// Request
{ "oldPassword": "...", "newPassword": "..." }
```
Response 200, `data: null`. Lỗi: `401` nếu `oldPassword` sai.

### 2.4. Yêu cầu trở thành người bán

`POST /api/v1/users/me/seller-requests` — cần đăng nhập (bất kỳ ai, không cần quyền đặc biệt)

Không cần body. Response 201:
```json
{ "success": true, "data": {
    "id": "...", "userId": "...", "status": "PENDING",
    "requestedAt": "2026-10-07T02:48:38Z", "reviewedAt": null, "reviewedBy": null
} }
```
Lỗi: `409 ALREADY_SELLER` (đã là SELLER/ADMIN) hoặc `409 SELLER_REQUEST_ALREADY_PENDING`
(đang có 1 yêu cầu chưa được duyệt).

### 2.5. (Admin) Danh sách yêu cầu chờ duyệt

`GET /api/v1/users/seller-requests?status=PENDING` — cần quyền `USER.REVIEW_SELLER_REQUESTS`
(chỉ ADMIN)

`status` nhận `PENDING` / `APPROVED` / `REJECTED`, mặc định `PENDING`.

### 2.6. (Admin) Duyệt / Từ chối yêu cầu

`POST /api/v1/users/seller-requests/{id}/approve` — duyệt, user tự động đổi thành SELLER
`POST /api/v1/users/seller-requests/{id}/reject` — từ chối, không đổi role

Cả 2 không cần body, cần quyền `USER.REVIEW_SELLER_REQUESTS`. Response giống mục 2.4 nhưng
`status` = `APPROVED`/`REJECTED`, có `reviewedAt`/`reviewedBy`.
Lỗi: `409 SELLER_REQUEST_ALREADY_REVIEWED` nếu gọi lại trên yêu cầu đã xử lý.

### 2.7. Đánh giá sau giao dịch (Rating)

`POST /api/v1/ratings` — cần quyền `REPUTATION.RATE` (BUYER/SELLER)

```json
// Request
{ "ratedUserId": "...", "transactionType": "ORDER", "transactionId": "order-hoặc-auction-id",
  "score": 5, "comment": "Giao dịch tốt" }
```
`transactionType` nhận `ORDER` hoặc `AUCTION`. FE **tự lấy** `ratedUserId` và `transactionId` từ
response của Order (mục 6.5) hoặc Auction (mục 5.1) — backend không tự tra lại giao dịch có
thật hay đã xong chưa, nên gửi sai `ratedUserId`/`transactionId` sẽ không bị chặn ở tầng này.
`raterId` tự lấy từ token, không gửi lên.

Response 201 trả về rating vừa tạo. Lỗi: `409 CANNOT_RATE_SELF` (tự chấm cho mình),
`409 RATING_ALREADY_SUBMITTED` (đã chấm giao dịch này rồi — mỗi người chỉ chấm 1 lần/giao dịch),
`404 USER_NOT_FOUND` (ratedUserId không tồn tại).

### 2.8. Xem điểm uy tín 1 người dùng

`GET /api/v1/users/{userId}/reputation` — cần quyền `REPUTATION.VIEW` (mọi role)

```json
{ "success": true, "data": {
    "userId": "...", "score": 54, "trustLevel": "TRUSTED",
    "totalRatings": 1, "averageRating": 5.0
} }
```
`score` chạy từ 0-100, mặc định `50` (trung lập) cho user chưa có rating/phạt nào — **không
phải lỗi 404**. `trustLevel`: `LOW` (score < 40, không được đặt giá đấu giá) / `NORMAL`
(40-49, được đặt giá nhưng không được tạo đấu giá) / `TRUSTED` (≥ 50, làm được mọi thứ) — khớp
đúng ngưỡng `MIN_REPUTATION_TO_BID`/`MIN_REPUTATION_TO_SELL` trong SRS. **Lưu ý**: `trustLevel`
hiện mới mang tính hiển thị, auction-service **chưa** tự chặn đặt giá/tạo đấu giá dựa trên giá
trị này (cần nhúng vào JWT ở bản sau).

### 2.9. (Admin/Support) Lịch sử bị phạt điểm uy tín

`GET /api/v1/users/{userId}/reputation/penalties` — cần quyền `REPUTATION.PENALTY.VIEW`
(chỉ ADMIN/SUPPORT_STAFF)

```json
{ "success": true, "data": [ {
    "id": "...", "userId": "...", "reason": "AUCTION_PAYMENT_TIMEOUT", "points": 10,
    "referenceId": "<auctionId>", "appliedAt": "2026-10-08T..."
} ] }
```
Hiện chỉ có 1 loại phạt tự động: thắng đấu giá nhưng không thanh toán trong hạn (24h) — hệ
thống tự trừ 10 điểm, không cần ai thao tác thủ công.

---

## 3. Danh mục — Category (`catalog-service`)

### 3.1. Danh sách danh mục

`GET /api/v1/categories` — public, không cần đăng nhập

```json
{ "success": true, "data": [ { "id": "...", "name": "Watches", "parentId": null } ] }
```

### 3.2. Chi tiết 1 danh mục

`GET /api/v1/categories/{id}` — public

### 3.3. Tạo / Sửa / Xóa danh mục

| | Method | Path | Quyền |
|---|---|---|---|
| Tạo | POST | `/api/v1/categories` | `CATEGORY.CREATE` (chỉ ADMIN) |
| Sửa | PUT | `/api/v1/categories/{id}` | `CATEGORY.UPDATE` (chỉ ADMIN) |
| Xóa | DELETE | `/api/v1/categories/{id}` | `CATEGORY.DELETE` (chỉ ADMIN) |

```json
// Body tạo
{ "name": "Watches", "parentId": null }
// Body sửa
{ "name": "Tên mới" }
```

---

## 4. Sản phẩm — Product (`catalog-service`)

### 4.1. Tìm kiếm / lọc sản phẩm

`GET /api/v1/products` — public. Query param (tất cả optional, kết hợp được với nhau):

| Param | Ý nghĩa |
|---|---|
| `q` | Từ khóa tìm kiếm (full-text trên tên + mô tả) |
| `categoryId` | Lọc theo danh mục |
| `status` | `DRAFT` / `ACTIVE` / `INACTIVE` |
| `sellerId` | Lọc sản phẩm của 1 người bán (vd trang "Sản phẩm của tôi") |
| `page`, `size` | Phân trang, mặc định `page=0&size=20`, tối đa `size=100` |

**Lưu ý quan trọng:** không có path `/products/search` riêng — đây chính là endpoint tìm
kiếm, gọi thẳng vào path gốc.

### 4.2. Sản phẩm nổi bật (trang chủ)

`GET /api/v1/products/discover?categoryId=...` — public. Cố định `status=ACTIVE`, trả về tối
đa 20 sản phẩm mới nhất.

### 4.3. Chi tiết 1 sản phẩm

`GET /api/v1/products/{id}` — public

```json
{ "success": true, "data": {
    "id": "...", "name": "Vintage Watch", "description": "...", "categoryId": "...",
    "status": "ACTIVE", "sellerId": "...", "imageUrls": ["https://..."],
    "skuId": "...", "skuCode": "SKU-XXXX", "price": 500000.00
} }
```

### 4.4. Tạo sản phẩm

`POST /api/v1/products` — cần quyền `PRODUCT.CREATE` (SELLER/ADMIN). `sellerId` tự lấy từ
token, FE **không** gửi field này lên.

```json
// Request
{
  "name": "Vintage Watch",
  "description": "...",
  "categoryId": "...",
  "price": 500000,
  "imageUrls": ["https://..."]
}
```
Response 201, sản phẩm mới luôn có `status: "DRAFT"` (chưa hiện công khai).

### 4.5. Sửa sản phẩm / Đổi trạng thái / Xóa

| | Method | Path | Quyền | Ghi chú |
|---|---|---|---|---|
| Sửa tên/mô tả | PUT | `/api/v1/products/{id}` | `PRODUCT.UPDATE` | chỉ chủ sở hữu hoặc ADMIN |
| Đổi trạng thái | PATCH | `/api/v1/products/{id}/status` | `PRODUCT.UPDATE` | `{"status":"ACTIVE"}` để đăng bán công khai |
| Xóa | DELETE | `/api/v1/products/{id}` | `PRODUCT.DELETE` | chỉ chủ sở hữu hoặc ADMIN |

```json
// Body sửa
{ "name": "Tên mới", "description": "Mô tả mới" }
// Body đổi trạng thái
{ "status": "ACTIVE" }  // hoặc "INACTIVE"
```
Lỗi `403` nếu không phải chủ sản phẩm và không phải ADMIN.

---

## 5. Đấu giá — Auction (`auction-service`)

### 5.1. Chi tiết 1 phiên đấu giá

`GET /api/v1/auctions/{id}` — public

```json
{ "success": true, "data": {
    "id": "...", "productId": "...", "sellerId": "...",
    "startingPrice": 500000.00, "bidIncrement": 50000.00,
    "currentHighestBid": 550000.00, "currentHighestBidderId": "...",
    "status": "ACTIVE", "startTime": "...", "endTime": "...",
    "extensionCount": 0, "winnerId": null, "finalPrice": null, "paymentDeadline": null,
    "paidAt": null
} }
```
`status`: `PENDING` (chưa tới giờ bắt đầu) → `ACTIVE` (đang diễn ra) → `ENDED` (đã kết thúc,
có thể có `winnerId`) hoặc `CANCELLED`.

**Thanh toán khi thắng đấu giá không nằm ở `auction-service`** — khi 1 phiên `ENDED` có
`winnerId`, `commerce-service` tự động tạo 1 Order (nghe event qua Kafka, FE không cần gọi gì
để "kích hoạt" việc này). FE chờ vài giây rồi gọi `GET /api/v1/orders/me` (mục 6.6) để lấy
`orderId` tương ứng (field `auctionId` trên Order sẽ khớp với `id` của phiên đấu giá), rồi đi
tiếp luồng thanh toán ở mục 6.7–6.8 y hệt đơn hàng mua trực tiếp. `paidAt` ở auction chỉ là
dấu vết nội bộ (auction-service tự cập nhật khi nghe được thanh toán thành công), **không dùng
để quyết định hiển thị UI** — hãy dùng `status` của Order bên commerce-service.

### 5.2. Danh sách phiên đấu giá

`GET /api/v1/auctions` — public. Query param: `status`, `sellerId`, `productId`, `page`, `size`
(đều optional). Dùng `productId` để tìm phiên đấu giá đang chạy của 1 sản phẩm cụ thể (trang
chi tiết sản phẩm cần gọi cái này để biết có đấu giá hay không).

### 5.3. Tạo phiên đấu giá

`POST /api/v1/auctions` — cần quyền `AUCTION.CREATE` (SELLER/ADMIN)

```json
{
  "productId": "...",
  "startingPrice": 500000,
  "bidIncrement": 50000,
  "startTime": "2026-10-07T02:15:31Z",
  "endTime": "2026-10-07T04:15:41Z"
}
```
Phiên mới luôn bắt đầu ở `status: "PENDING"` — có 1 job chạy ngầm mỗi 10 giây tự chuyển
`PENDING → ACTIVE` khi tới `startTime`, và `ACTIVE → ENDED` khi tới `endTime`. FE không cần tự
chuyển trạng thái.
Lỗi `409 TOO_MANY_ACTIVE_AUCTIONS` nếu seller đang có ≥ 5 phiên PENDING/ACTIVE cùng lúc.

### 5.4. Sửa / Hủy phiên đấu giá

| | Method | Path | Quyền |
|---|---|---|---|
| Sửa | PUT | `/api/v1/auctions/{id}` | `AUCTION.UPDATE` |
| Người bán tự hủy | DELETE | `/api/v1/auctions/{id}` | `AUCTION.CANCEL` |
| Admin hủy (bất kỳ) | POST | `/api/v1/auctions/{id}/admin-cancel` | `AUCTION.ADMIN_CANCEL` (chỉ ADMIN) |

Body sửa giống hệt body tạo (không có `productId`):
```json
{ "startingPrice": 500000, "bidIncrement": 50000, "startTime": "...", "endTime": "..." }
```

### 5.5. Đặt giá

`POST /api/v1/auctions/{auctionId}/bids` — cần quyền `AUCTION.BID` (mọi role đều có, kể cả
BUYER mặc định)

```json
// Request
{ "amount": 600000 }
```
```json
// Response 201
{ "success": true, "data": {
    "id": "...", "auctionId": "...", "bidderId": "...", "amount": 600000.00,
    "placedAt": "2026-10-07T02:16:44Z"
} }
```
Giá hợp lệ phải ≥ `currentHighestBid + bidIncrement` (hoặc ≥ `startingPrice + bidIncrement`
nếu chưa ai đặt). Lỗi `400 VALIDATION_ERROR`, chi tiết số tiền tối thiểu nằm trong
`error.fieldErrors[0].message` (vd `"Bid must be at least 600000.00"`) — **nên hiện message
này cho người dùng thay vì message chung ở `error.message`**.

### 5.6. Lịch sử đặt giá

`GET /api/v1/auctions/{auctionId}/bids?page=0&size=20` — public

---

## 6. Mua trực tiếp & Thanh toán — Commerce (`commerce-service`)

Luồng e-commerce tiêu chuẩn (ngoài đấu giá): giỏ hàng → checkout → đơn hàng → thanh toán qua
Stripe. Mỗi buyer chỉ có **1 giỏ hàng** duy nhất (tự tạo khi thêm sản phẩm đầu tiên, không cần
gọi API "tạo giỏ hàng" riêng).

**Lưu ý quan trọng khi thêm vào giỏ:** `commerce-service` **không** tự tra cứu lại sản phẩm từ
`catalog-service` — FE phải tự gửi `productId`, `sellerId`, `productName`, `unitPrice` (snapshot
tại thời điểm thêm vào giỏ, lấy từ `GET /api/v1/products/{id}` mục 4.3). Nếu giá sản phẩm thay
đổi sau đó, giỏ hàng **không tự cập nhật** — đây là hành vi cố ý (chốt giá tại thời điểm thêm).

### 6.1. Xem giỏ hàng

`GET /api/v1/carts/me` — cần quyền `CART.VIEW` (BUYER)

```json
{ "success": true, "data": {
    "id": "...", "buyerId": "...",
    "items": [ { "productId": "...", "sellerId": "...", "productName": "Vintage Watch",
                 "unitPrice": 500000.00, "quantity": 1, "subtotal": 500000.00 } ],
    "totalAmount": 500000.00
} }
```
Buyer chưa có giỏ hàng nào → trả về giỏ rỗng (`items: []`), không phải lỗi 404.

### 6.2. Thêm sản phẩm vào giỏ

`POST /api/v1/carts/items` — cần quyền `CART.CREATE` (BUYER)

```json
{ "productId": "...", "sellerId": "...", "productName": "Vintage Watch",
  "unitPrice": 500000, "quantity": 1 }
```
Nếu `productId` đã có trong giỏ, `quantity` được **cộng dồn** (không ghi đè). Response trả về
giỏ hàng đầy đủ sau khi thêm (giống mục 6.1).

### 6.3. Sửa số lượng / Xóa sản phẩm khỏi giỏ

| | Method | Path | Quyền |
|---|---|---|---|
| Sửa số lượng | PUT | `/api/v1/carts/items/{productId}` | `CART.UPDATE` |
| Xóa | DELETE | `/api/v1/carts/items/{productId}` | `CART.REMOVE_ITEM` |

Body sửa số lượng: `{ "quantity": 3 }`. Lỗi `404 CART_ITEM_NOT_FOUND` nếu sản phẩm không có
trong giỏ.

### 6.4. Checkout (tạo đơn hàng từ giỏ)

`POST /api/v1/checkout` — cần quyền `CHECKOUT.START` (BUYER), không cần body

```json
{ "success": true, "data": {
    "id": "...", "buyerId": "...", "auctionId": null,
    "items": [ { "productId": "...", "sellerId": "...", "productName": "...",
                 "unitPrice": 500000.00, "quantity": 1, "subtotal": 500000.00 } ],
    "totalAmount": 500000.00, "status": "AWAITING_PAYMENT",
    "createdAt": "2026-10-07T...", "paidAt": null
} }
```
Giỏ hàng tự động bị xóa sạch sau khi checkout thành công. Lỗi `409 CART_EMPTY` nếu giỏ rỗng.
`auctionId` luôn `null` cho đơn hàng loại này (phân biệt với đơn hàng từ đấu giá — xem mục 5.1
ghi chú về `auctionId`).

### 6.5. Chi tiết 1 đơn hàng

`GET /api/v1/orders/{orderId}` — cần quyền `ORDER.VIEW` (mọi role)

`status`: `AWAITING_PAYMENT` → `PAID` (sau khi thanh toán xong, mục 6.8) hoặc `CANCELLED`
(mục 6.9).

### 6.6. Danh sách đơn hàng của tôi

`GET /api/v1/orders/me` — cần quyền `ORDER.LIST` (mọi role), trả về mảng `OrderResponse`
(giống mục 6.5), mới nhất trước. Dùng cái này để tìm đơn hàng tự sinh ra từ 1 phiên đấu giá đã
thắng (lọc theo field `auctionId`).

### 6.7. Tạo phiên thanh toán Stripe

`POST /api/v1/orders/{orderId}/checkout-session` — cần quyền `CHECKOUT.START`

```json
// Request
{ "successUrl": "https://your-fe.app/payment/success", "cancelUrl": "https://your-fe.app/payment/cancel" }
```
```json
// Response
{ "success": true, "data": { "sessionId": "cs_test_...", "checkoutUrl": "https://checkout.stripe.com/..." } }
```
FE điều hướng (redirect) trình duyệt sang `checkoutUrl` để người dùng nhập thẻ trên trang của
Stripe. Chỉ cho phép khi đơn hàng đang `AWAITING_PAYMENT` và người gọi đúng là buyer của đơn
(`403 NOT_THE_BUYER` / `409 ORDER_NOT_AWAITING_PAYMENT` nếu sai).

Sau khi thanh toán xong trên Stripe, Stripe tự redirect về `successUrl` kèm query param
`?session_id=cs_test_...` — FE đọc `session_id` từ URL đó để gọi bước tiếp theo.

### 6.8. Xác nhận thanh toán

`POST /api/v1/orders/{orderId}/confirm-payment` — cần quyền `CHECKOUT.START`

```json
{ "sessionId": "cs_test_..." }  // lấy từ query param session_id ở successUrl
```
Response trả về `OrderResponse` với `status: "PAID"` và `paidAt` đã có giá trị. Gọi lại nhiều
lần (vd người dùng bấm back rồi vào lại trang success) là an toàn — idempotent, trả về cùng kết
quả, không thanh toán 2 lần. Lỗi `409 PAYMENT_NOT_CONFIRMED` nếu gọi trước khi Stripe thực sự
ghi nhận thanh toán xong (hiếm, có thể do mạng chậm — FE nên thử lại sau 1-2 giây).

### 6.9. Hủy đơn hàng

`POST /api/v1/orders/{orderId}/cancel` — cần quyền `ORDER.CANCEL` (BUYER/ADMIN/SUPPORT_STAFF,
**không có SELLER**)

Chỉ hủy được khi đơn còn `AWAITING_PAYMENT` — đơn đã `PAID` không hủy được qua API này
(`409 ORDER_NOT_CANCELLABLE`, tính năng hoàn tiền chưa làm ở bản này).

---

## 7. Thông báo — Notification (`notification-service`)

### 7.1. Thông báo của tôi

`GET /api/v1/notifications/me` — cần đăng nhập

```json
{ "success": true, "data": [ {
    "id": "...", "eventType": "AuctionWon", "aggregateId": "<auctionId>",
    "recipientUserId": "...", "message": "Bạn đã thắng phiên đấu giá ...",
    "read": false, "payload": "{...}", "occurredAt": "2026-10-07T..."
} ] }
```

### 7.2. Đánh dấu đã đọc

`PATCH /api/v1/notifications/{id}/read` — cần đăng nhập. Không có body, `data: null`.

### 7.3. (Admin) Xem toàn bộ thông báo hệ thống

`GET /api/v1/notifications?eventType=&aggregateId=` — cần quyền `NOTIFICATION.AUDIT` (chỉ
ADMIN), dùng để tra cứu/hỗ trợ, không phải cho user thường.

---

## 8. Những điểm FE hay nhầm (đã tự kiểm chứng trong quá trình build)

1. **`response.data` đã là payload thật**, không phải `response.data.data` — axios
   interceptor trong `src/api/client.js` đã tự bóc lớp `{success,data,error}` rồi.
2. Tìm sản phẩm **không có** `/products/search` — endpoint tìm kiếm chính là
   `GET /api/v1/products?q=...`.
3. Muốn biết 1 sản phẩm có đang đấu giá hay không: gọi
   `GET /api/v1/auctions?productId=<id>&status=ACTIVE`, không có field nào trên
   `ProductResponse` cho biết điều này trực tiếp.
4. Tài khoản mới luôn là BUYER — muốn test tính năng bán hàng phải gọi mục 2.4 rồi nhờ admin
   duyệt (mục 2.6), không có cách nào tự nâng cấp.
5. Lỗi đặt giá quá thấp: đọc `error.fieldErrors[0].message` để biết số tiền tối thiểu thật,
   đừng chỉ hiện `error.message` (message đó chỉ nói chung chung "dữ liệu không hợp lệ").
6. Thắng đấu giá **không tự có nút "Thanh toán" ngay lập tức** — đơn hàng (Order) được
   `commerce-service` tạo ngầm qua Kafka, có độ trễ vài giây. FE nên poll `GET /api/v1/orders/me`
   (mục 6.6) vài lần hoặc thêm nút "Kiểm tra đơn hàng" trên trang chi tiết đấu giá đã thắng, thay
   vì giả định đơn hàng đã có ngay khi `status` chuyển `ENDED`.
7. Giỏ hàng **không đồng bộ giá với catalog** — `unitPrice` gửi lên khi thêm vào giỏ (mục 6.2)
   được lưu nguyên vẹn tới lúc checkout, kể cả khi sản phẩm đã đổi giá trên `catalog-service`
   sau đó. Đây là hành vi đúng, không phải bug.
8. Điểm uy tín (mục 2.8) **không chặn hành động thật** ở bản hiện tại — `trustLevel` chỉ để
   hiển thị, `AUCTION.BID`/`AUCTION.CREATE` chưa bị chặn khi điểm thấp. Đừng FE tự ý ẩn nút
   "Đặt giá" dựa theo `trustLevel` vì backend vẫn chấp nhận request bình thường.
9. Rating (mục 2.7) **không giới hạn theo role đối phương** — BUYER có thể chấm điểm cho một
   BUYER khác (không bắt buộc 1 bên phải là SELLER), miễn không tự chấm cho chính mình và đúng
   `transactionId` thật.
