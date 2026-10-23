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
| **SELLER** | Như BUYER, cộng thêm: tạo/sửa/xóa sản phẩm và phiên đấu giá **của chính mình**; xem đơn hàng có sản phẩm của mình và đánh dấu đã giao (mục 6.11), không mua/hủy |
| **SUPPORT_STAFF** | Xem/hủy mọi đơn hàng, xử lý hoàn tiền và yêu cầu trả hàng (mục 6.12–6.14), xem lịch sử phạt điểm uy tín; không tự mua hàng/chấm điểm |
| **ADMIN** | Toàn quyền: quản lý danh mục, duyệt yêu cầu lên SELLER, can thiệp sản phẩm/đấu giá/đơn hàng của người khác |

Tài khoản mới đăng ký luôn là **BUYER** — muốn bán hàng phải gửi yêu cầu và chờ ADMIN duyệt
(mục 2.4).

---

## 2. User & Auth (`user-service`)

### 2.1. Đăng ký

`POST /api/v1/users/register` — không cần đăng nhập

```json
// Request
{ "email": "a@b.com", "password": "8 đến 72 ký tự", "confirmPassword": "nhập lại đúng mật khẩu trên", "fullName": "Nguyễn Văn A" }
```
```json
// Response 201
{ "success": true, "data": { "id": "...", "email": "a@b.com", "fullName": "Nguyễn Văn A" } }
```
Lỗi: `409 EMAIL_ALREADY_REGISTERED` nếu email đã tồn tại.

Lỗi `400 VALIDATION_ERROR` kèm `error.fieldErrors` (`field` + `message`), mỗi lỗi ở đúng ô nhập:
- `password`: ngoài khoảng 8 đến 72 ký tự (72 là giới hạn của BCrypt).
- `confirmPassword`: thiếu, hoặc **không giống hệt** `password` (phân biệt hoa thường, có tính khoảng trắng).
- `email`, `fullName`: tối đa 255 ký tự.

FE vẫn nên tự kiểm hai ô mật khẩu trước khi gửi để báo lỗi ngay, nhưng server kiểm lại.

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
{ "oldPassword": "...", "newPassword": "8 đến 72 ký tự", "confirmNewPassword": "nhập lại newPassword" }
```
Response 200, `data: null`. Lỗi: `401` nếu `oldPassword` sai; `400` nếu `newPassword` ngoài 8 đến 72 ký tự
hoặc `confirmNewPassword` khác `newPassword` (lỗi gắn vào `confirmNewPassword`).

Đặt lại mật khẩu sau khi quên (`POST /api/v1/auth/reset-password`, body `token`, `newPassword`,
`confirmNewPassword`) dùng cùng quy tắc.

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
đúng ngưỡng `MIN_REPUTATION_TO_BID`/`MIN_REPUTATION_TO_SELL` trong SRS.

**`trustLevel` giờ có tác dụng chặn thật** (không chỉ hiển thị nữa) — được nhúng vào JWT ngay
lúc đăng nhập (mục 2.2), `auction-service` tự đọc từ token để chặn `POST .../bids` và
`POST /api/v1/auctions`. Vì nhúng vào token lúc login, **điểm cập nhật sau đó không có hiệu lực
ngay** — phải đăng nhập lại (hoặc đợi token hết hạn, 60 phút) để `trustLevel` mới được áp dụng.
Lỗi khi bị chặn: `403 INSUFFICIENT_TRUST_TO_BID` / `403 INSUFFICIENT_TRUST_TO_CREATE_AUCTION`.

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
**Cẩn thận hai mã:** `id` là mã **sản phẩm**, `skuId` là mã SKU riêng của catalog. **Tồn kho và
mua hàng đều tính theo `id` (mã sản phẩm), không phải `skuId`** (mục 6.17).

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
  "imageUrls": ["https://..."],
  "initialStock": 20
}
```
`initialStock` (số lượng đang có, tuỳ chọn, mặc định 0, từ 0 đến 1.000.000) sẽ mở tồn kho cho
sản phẩm. Muốn người mua đặt được hàng thì tồn kho phải lớn hơn 0, nhập thêm ở mục 6.17.
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
Từ 2026-10-17 sản phẩm phải **của chính seller, đang `ACTIVE` và còn ít nhất 1 trong kho**:
`403 NOT_THE_PRODUCT_OWNER` nếu là sản phẩm của người khác; `409 PRODUCT_NOT_AVAILABLE` nếu sản
phẩm không tồn tại hoặc chưa/không còn `ACTIVE`; `409 INSUFFICIENT_STOCK` nếu kho bằng 0 (nhập
kho ở mục nhập kho rồi thử lại). Sản phẩm vừa chuyển `ACTIVE` hoặc vừa nhập kho cần **vài giây**
mới tạo phiên được. Từ lúc tạo phiên, **1 cái được giữ riêng cho phiên** (không ai mua thẳng được,
thêm giỏ báo `409 INSUFFICIENT_STOCK`); không ai đặt giá hoặc phiên bị huỷ → trả lại kho; người
thắng trả tiền → trừ kho. Hiếm khi kho vừa hết đúng lúc tạo phiên (số tồn kho của auction trễ vài
giây): phiên được tạo nhưng vài giây sau tự chuyển `CANCELLED` (`cancelledBy: "SYSTEM"`), FE nên
tải lại trạng thái phiên. Người thắng bỏ cọc (tự huỷ đơn hoặc quá 24h) → sản phẩm từ `SOLD` về
lại `ACTIVE`, seller bán tiếp hoặc tạo phiên mới được; đơn còn treo bị huỷ (`PAYMENT_TIMEOUT`).

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

**Lưu ý quan trọng khi thêm vào giỏ (đổi từ 2026-10-17):** FE chỉ gửi `productId` và `quantity`.
Giá, tên và người bán do `commerce-service` tự lấy từ bản sao thông tin sản phẩm của nó (cập nhật
qua sự kiện từ `catalog-service`); `sellerId`/`productName`/`unitPrice` nếu FE vẫn gửi thì bị
**bỏ qua**. Chỉ thêm được sản phẩm đang `ACTIVE`. Sản phẩm vừa chuyển sang `ACTIVE` cần **vài giây**
(thường dưới 5 giây) mới mua được, trước đó trả `409 PRODUCT_NOT_AVAILABLE`. Sản phẩm tạo trước
2026-10-17 không có bản sao nên không thêm vào giỏ được.

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
{ "productId": "...", "quantity": 1 }
```
Nếu `productId` đã có trong giỏ, `quantity` được **cộng dồn** (không ghi đè). Response trả về
giỏ hàng đầy đủ sau khi thêm (giống mục 6.1), giá trong đó là giá thật của sản phẩm.
Lỗi `409 PRODUCT_NOT_AVAILABLE` nếu sản phẩm không tồn tại, chưa/không còn `ACTIVE` (DRAFT,
INACTIVE, SOLD), hoặc vừa mở bán chưa tới vài giây.
Lỗi `409 INSUFFICIENT_STOCK` nếu (số đã có trong giỏ + `quantity`) vượt số còn bán; message có
dạng `Only 5 left of product <id>, requested 6`, FE có thể hiện "chỉ còn 5". Số tồn kho mà
commerce dùng trễ vài giây so với kho thật, nên đây là báo sớm: hiếm khi hai người cùng mua
món cuối, một đơn vẫn có thể bị huỷ sau vài giây vì hết hàng (`OrderCancelled`, mục 6.4).

### 6.3. Sửa số lượng / Xóa sản phẩm khỏi giỏ

| | Method | Path | Quyền |
|---|---|---|---|
| Sửa số lượng | PUT | `/api/v1/carts/items/{productId}` | `CART.UPDATE` |
| Xóa | DELETE | `/api/v1/carts/items/{productId}` | `CART.REMOVE_ITEM` |

Body sửa số lượng: `{ "quantity": 3 }`. Lỗi `404 CART_ITEM_NOT_FOUND` nếu sản phẩm không có
trong giỏ, `409 INSUFFICIENT_STOCK` nếu số lượng mới vượt số còn bán.

### 6.4. Checkout (tạo đơn hàng từ giỏ)

`POST /api/v1/checkout` — cần quyền `CHECKOUT.START` (BUYER), không cần body

**Header tuỳ chọn `Idempotency-Key`** (chuỗi tối đa 100 ký tự, FE tự tạo, ví dụ `crypto.randomUUID()`):
tạo **một lần** khi người dùng mở trang thanh toán và gửi lại **đúng mã đó** nếu phải gọi lại (bấm
lần hai, mạng chậm, tự thử lại). Server trả **lại đúng đơn đã tạo** ở lần đầu, không tạo đơn thứ hai.
Không gửi header thì vẫn chạy như cũ; khi bấm hai lần liền, lần sau nhận `409 CART_EMPTY`. Mã chỉ
được nhớ 24 giờ và tính riêng cho từng người mua. Mã dài quá 100 ký tự → `400 VALIDATION_ERROR`.
Hai request cùng lúc luôn chỉ tạo tối đa **một** đơn, dù có gửi mã hay không.

```json
{ "success": true, "data": {
    "id": "...", "buyerId": "...", "auctionId": null,
    "items": [ { "productId": "...", "sellerId": "...", "productName": "...",
                 "unitPrice": 500000.00, "quantity": 1, "subtotal": 500000.00 } ],
    "totalAmount": 500000.00, "status": "AWAITING_PAYMENT",
    "createdAt": "2026-10-07T...", "paidAt": null, "shippedAt": null,
    "shippingAddress": null
} }
```
Đơn mới tạo **chưa có địa chỉ giao hàng** (`shippingAddress: null`), người mua phải đặt địa chỉ
ở mục 6.16 trước khi tạo phiên thanh toán (mục 6.7).
Giỏ hàng tự động bị xóa sạch sau khi checkout thành công. Lỗi `409 CART_EMPTY` nếu giỏ rỗng.
Lúc checkout giá được **tính lại** theo giá hiện tại của sản phẩm. Nếu có sản phẩm trong giỏ không
còn bán (người bán tắt, đã SOLD...) thì trả `409 CART_ITEM_UNAVAILABLE` (message có `productId`),
**giỏ được giữ nguyên**; FE nên báo người mua bỏ sản phẩm đó khỏi giỏ (mục 6.3) rồi checkout lại.
Tương tự, `409 INSUFFICIENT_STOCK` nếu kho đã tụt dưới số lượng trong giỏ (người khác vừa mua):
giỏ giữ nguyên, FE cho người mua giảm số lượng (mục 6.3).
`auctionId` luôn `null` cho đơn hàng loại này (phân biệt với đơn hàng từ đấu giá — xem mục 5.1
ghi chú về `auctionId`).

### 6.5. Chi tiết 1 đơn hàng

`GET /api/v1/orders/{orderId}` — cần quyền `ORDER.VIEW`. Đơn hàng có địa chỉ và số điện thoại
của người mua nên **chỉ người mua, seller có sản phẩm trong đơn, ADMIN và SUPPORT_STAFF** xem
được; người khác nhận `403 NOT_ALLOWED_TO_VIEW_ORDER`. Response có thêm `shippingAddress`
(xem mục 6.16), là `null` nếu chưa đặt.

`status`: `AWAITING_PAYMENT` → `PAID` (sau khi thanh toán xong, mục 6.8) hoặc `CANCELLED`
(mục 6.9). Đơn `PAID` có thể chuyển tiếp sang `REFUNDED` (mục 6.12). Field `shippedAt` là
`null` cho tới khi seller đánh dấu đã giao (mục 6.11).

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
(`403 NOT_THE_BUYER` / `409 ORDER_NOT_AWAITING_PAYMENT` nếu sai). Đơn chưa có địa chỉ giao hàng
trả `409 SHIPPING_ADDRESS_REQUIRED`, hãy gọi mục 6.16 trước.

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

Không cần lo nếu khách tắt tab trước khi về trang success: Stripe tự gọi webhook
`POST /api/v1/payments/webhook` (chỉ Stripe gọi, FE không dùng) và server vẫn đánh dấu đơn
`PAID`. Vì vậy khi gọi `confirm-payment` có thể thấy đơn đã `PAID` sẵn, đó là bình thường.

Nếu khách trả tiền lúc đơn **đã bị huỷ** (quá 30 phút hoặc đã bấm huỷ), server tự hoàn tiền và
đơn chuyển sang `status: "REFUNDED"`. FE nên hiện: "Đơn đã hết hạn, tiền đã được hoàn lại".

### 6.9. Hủy đơn hàng

`POST /api/v1/orders/{orderId}/cancel` — cần quyền `ORDER.CANCEL` (BUYER/ADMIN/SUPPORT_STAFF,
**không có SELLER**)

Chỉ hủy được khi đơn còn `AWAITING_PAYMENT` — đơn đã `PAID` không hủy được qua API này
(`409 ORDER_NOT_CANCELLABLE`). Đơn đã thanh toán muốn lấy lại tiền phải qua hoàn tiền (mục 6.12).

### 6.10. Danh sách tất cả đơn hàng (Admin/Support)

`GET /api/v1/orders` — cần quyền `ORDER.LIST`, **nhưng chỉ ADMIN và SUPPORT_STAFF** được gọi
(`403 ORDER_LIST_ALL_FORBIDDEN` với role khác). Trả về mảng `OrderResponse` của mọi buyer. User
thường dùng `GET /api/v1/orders/me` (mục 6.6).

### 6.11. Đơn hàng cần giao (Seller) và đánh dấu đã giao

| | Method | Path | Quyền |
|---|---|---|---|
| Danh sách đơn có hàng của tôi | GET | `/api/v1/orders/selling` | `ORDER.LIST` |
| Đánh dấu đã giao | POST | `/api/v1/orders/{orderId}/mark-shipped` | `ORDER.MARK_SHIPPED` (SELLER, ADMIN) |

`/orders/selling` trả mảng `OrderResponse` của các đơn có ít nhất 1 sản phẩm do chính người gọi
bán. `mark-shipped` không cần body, trả về `OrderResponse` với `shippedAt` đã có giá trị. Lỗi:

| Mã | Khi nào |
|---|---|
| `403 NOT_THE_SELLER` | Người gọi không có sản phẩm nào trong đơn |
| `409 ORDER_NOT_SHIPPABLE` | Đơn chưa `PAID` (chưa thanh toán, đã hủy hoặc đã hoàn tiền) |
| `409 ORDER_ALREADY_SHIPPED` | Đơn đã được đánh dấu đã giao trước đó |

Việc đánh dấu này chỉ là cờ xác nhận thủ công (không có đơn vị vận chuyển, không có mã vận
đơn); nó quyết định luồng hoàn tiền ở mục 6.13.

### 6.12. Hoàn tiền (Admin/Support Staff)

`POST /api/v1/orders/{orderId}/refund` — cần quyền `ORDER.REFUND` (ADMIN, SUPPORT_STAFF)

```json
{ "reason": "Khách đổi ý" }   // bắt buộc, không được để trống
```
Hoàn tiền thật qua Stripe cho đơn `PAID`, response là `OrderResponse` với `status: "REFUNDED"`.
Gọi lại với đơn đã `REFUNDED` là an toàn (idempotent, trả về cùng kết quả, không hoàn 2 lần).
Lỗi `409 ORDER_NOT_REFUNDABLE` nếu đơn chưa `PAID` (đang chờ thanh toán hoặc đã hủy).

### 6.13. Hàng sau khi hoàn tiền: nhập lại kho hay phải trả hàng?

Việc hàng có về kho tự động hay không phụ thuộc vào `shippedAt` **tại thời điểm hoàn tiền**:

| Tình huống | Điều xảy ra |
|---|---|
| `shippedAt = null` (chưa giao) | Hệ thống **tự nhập lại kho** ngay khi hoàn tiền, không cần làm gì thêm |
| `shippedAt` đã có (đã giao) | Hàng đang ở chỗ khách, **không** tự nhập kho — cần tạo yêu cầu trả hàng (mục 6.14) và chờ xác nhận nhận lại hàng |

Việc nhập kho chạy bất đồng bộ qua Kafka, nên số lượng tồn có thể cập nhật sau vài giây.

### 6.14. Yêu cầu trả hàng (Admin/Support Staff)

Chỉ áp dụng cho đơn **đã hoàn tiền và đã giao** (mục 6.13). Cả 3 endpoint đều cần quyền
`ORDER.REFUND` (ADMIN, SUPPORT_STAFF).

| | Method | Path |
|---|---|---|
| Tạo yêu cầu trả hàng | POST | `/api/v1/orders/{orderId}/returns` |
| Xác nhận đã nhận lại hàng | POST | `/api/v1/returns/{returnId}/receive` |
| Từ chối nhận hàng trả | POST | `/api/v1/returns/{returnId}/reject` |

Body tạo yêu cầu: `{ "reason": "Hàng bị lỗi" }` (bắt buộc). `receive` và `reject` không cần
body. Response của cả 3 là:

```json
{ "success": true, "data": {
    "id": "...", "orderId": "...", "reason": "Hàng bị lỗi",
    "status": "REQUESTED",            // REQUESTED | RECEIVED | REJECTED
    "createdAt": "2026-10-13T...", "resolvedAt": null, "resolvedBy": null
} }
```

- `receive` đổi trạng thái sang `RECEIVED`, `resolvedAt`/`resolvedBy` được điền, và hàng được
  nhập lại kho (bất đồng bộ). Gọi lại với yêu cầu đã `RECEIVED` là an toàn (không nhập kho 2 lần).
- `reject` đổi sang `REJECTED`, **không** nhập kho.

Lỗi khi tạo yêu cầu: `409 RETURN_NOT_APPLICABLE` (đơn chưa hoàn tiền hoặc chưa giao),
`409 RETURN_ALREADY_REQUESTED` (đơn đã có yêu cầu `REQUESTED` chưa xử lý).

### 6.15. Hoá đơn của đơn hàng

`GET /api/v1/orders/{orderId}/invoice` — cần quyền `ORDER.VIEW`

```json
{ "success": true, "data": {
    "invoiceNumber": "INV-2026-3F9A1C2B",
    "orderId": "...", "buyerId": "...",
    "items": [ { "productId": "...", "sellerId": "...", "productName": "Vintage Watch",
                 "unitPrice": 500000.00, "quantity": 1, "subtotal": 500000.00 } ],
    "totalAmount": 500000.00,
    "orderStatus": "PAID",            // PAID | REFUNDED
    "issuedAt": "2026-10-14T03:00:00Z"   // = thời điểm thanh toán
} }
```

- **Ai xem được:** người mua của đơn, seller có sản phẩm trong đơn, và ADMIN/SUPPORT_STAFF.
  Người khác nhận `403 NOT_ALLOWED_TO_VIEW_INVOICE`.
- **Khi nào có hoá đơn:** đơn đã thanh toán (`PAID`) hoặc đã hoàn tiền (`REFUNDED`). Đơn chưa
  thanh toán hoặc đã hủy nhận `409 INVOICE_NOT_AVAILABLE`.
- **Số hoá đơn:** dạng `INV-<năm thanh toán>-<8 ký tự đầu của orderId>`, tự sinh từ đơn hàng,
  không lưu riêng nên luôn khớp với đơn.
- `404 ORDER_NOT_FOUND` nếu đơn không tồn tại.

### 6.16. Địa chỉ giao hàng

`PUT /api/v1/orders/{orderId}/shipping-address` — cần quyền `CHECKOUT.START` (BUYER)

```json
// Request (cả 4 trường đều bắt buộc)
{ "recipientName": "Nguyen Van A", "phone": "0901234567",
  "addressLine": "12 Le Loi, Phuong Ben Nghe, Quan 1", "city": "Ho Chi Minh" }
```
Response là `OrderResponse` (mục 6.5) với `shippingAddress` đã có giá trị:

```json
"shippingAddress": { "recipientName": "Nguyen Van A", "phone": "0901234567",
                     "addressLine": "12 Le Loi, Phuong Ben Nghe, Quan 1", "city": "Ho Chi Minh" }
```

- Dùng cho **cả đơn mua trực tiếp lẫn đơn tạo từ đấu giá** (người thắng chưa có địa chỉ, cần đặt
  trước khi thanh toán).
- Gọi lại để **sửa địa chỉ** được, miễn là đơn còn `AWAITING_PAYMENT`. Đơn đã thanh toán, hủy
  hoặc hoàn tiền nhận `409 ORDER_NOT_AWAITING_PAYMENT`.
- Số điện thoại 8 đến 15 chữ số (có thể bắt đầu bằng `+`, khoảng trắng, dấu chấm và gạch ngang
  được bỏ đi). Trường rỗng hoặc quá dài trả `400` kèm `fieldErrors`. Người gọi không phải buyer
  của đơn nhận `403 NOT_THE_BUYER`.
- **Seller** thấy địa chỉ này trong `GET /api/v1/orders/selling` (mục 6.11) để biết giao đi đâu.

### 6.17. Tồn kho (`fulfillment-service`)

Tồn kho tính theo **mã sản phẩm** (`id` ở mục 4.3), không phải `skuId`. Tồn kho của sản phẩm tự
được mở khi tạo sản phẩm (qua `initialStock`, mục 4.4); người bán nhập thêm ở đây. Thiếu hàng thì
đơn bị hủy lúc đặt.

| | Method | Path | Quyền |
|---|---|---|---|
| Xem tồn kho | GET | `/api/v1/inventory/{productId}` | `INVENTORY.VIEW` (Admin, Seller, Support) |
| Người bán nhập thêm | POST | `/api/v1/inventory/{productId}/restock` | `INVENTORY.RESTOCK` (Seller, Admin) |
| Admin nhập kho (bất kỳ sản phẩm) | POST | `/api/v1/inventory/intake` | `INVENTORY.MANAGE` (Admin) |

```json
// Nhập thêm (Seller / Admin)
{ "quantity": 10 }                       // 1 đến 1.000.000
// Nhập kho (Admin)
{ "productId": "...", "quantity": 10 }
// Response của xem tồn kho và nhập thêm
{ "success": true, "data": {
    "productId": "...", "warehouseId": "MAIN",
    "totalQuantity": 30, "reservedQuantity": 2, "unavailableQuantity": 0, "availableQuantity": 28
} }
```
- `availableQuantity` = tổng trừ số đang giữ cho các đơn chưa thanh toán.
- **Người bán chỉ nhập thêm được cho sản phẩm của chính mình**, người khác nhận
  `403 NOT_THE_PRODUCT_OWNER`. Admin nhập được mọi sản phẩm.
- Sản phẩm chưa từng được nhập kho vẫn trả về tồn kho bằng 0, không phải 404.
- Sản phẩm tạo trước khi có tính năng này chưa có chủ kho nên người bán chưa nhập thêm được; nhờ
  Admin nhập kho giúp.

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
8. Điểm uy tín **giờ chặn thật** — nhưng chặn theo `trustLevel` **trong JWT tại thời điểm
   đăng nhập**, không phải điểm hiện tại. User bị trừ điểm sau khi đã login vẫn đặt giá được
   bình thường cho tới khi đăng nhập lại/token hết hạn. FE nên bắt lỗi `403
   INSUFFICIENT_TRUST_TO_BID`/`INSUFFICIENT_TRUST_TO_CREATE_AUCTION` và gợi ý đăng nhập lại,
   thay vì tự ẩn nút dựa theo `GET .../reputation` (API đó luôn trả điểm mới nhất, có thể lệch
   với token đang dùng).
9. Rating (mục 2.7) **không giới hạn theo role đối phương** — BUYER có thể chấm điểm cho một
   BUYER khác (không bắt buộc 1 bên phải là SELLER), miễn không tự chấm cho chính mình và đúng
   `transactionId` thật.
10. **Tồn kho theo `id` sản phẩm, không phải `skuId`.** Response sản phẩm có cả hai mã; dùng
   nhầm `skuId` để nhập kho thì đơn đặt hàng sẽ báo hết hàng dù kho có hàng. Xem mục 6.17.
