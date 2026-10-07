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
| **BUYER** (mặc định khi đăng ký) | Xem mọi thứ công khai, đặt giá đấu giá, gửi yêu cầu lên SELLER |
| **SELLER** | Như BUYER, cộng thêm: tạo/sửa/xóa sản phẩm và phiên đấu giá **của chính mình** |
| **ADMIN** | Toàn quyền: quản lý danh mục, duyệt yêu cầu lên SELLER, can thiệp sản phẩm/đấu giá của người khác |

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
    "extensionCount": 0, "winnerId": null, "finalPrice": null, "paymentDeadline": null
} }
```
`status`: `PENDING` (chưa tới giờ bắt đầu) → `ACTIVE` (đang diễn ra) → `ENDED` (đã kết thúc,
có thể có `winnerId`) hoặc `CANCELLED`.

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

## 6. Thông báo — Notification (`notification-service`)

### 6.1. Thông báo của tôi

`GET /api/v1/notifications/me` — cần đăng nhập

```json
{ "success": true, "data": [ {
    "id": "...", "eventType": "AuctionWon", "aggregateId": "<auctionId>",
    "recipientUserId": "...", "message": "Bạn đã thắng phiên đấu giá ...",
    "read": false, "payload": "{...}", "occurredAt": "2026-10-07T..."
} ] }
```

### 6.2. Đánh dấu đã đọc

`PATCH /api/v1/notifications/{id}/read` — cần đăng nhập. Không có body, `data: null`.

### 6.3. (Admin) Xem toàn bộ thông báo hệ thống

`GET /api/v1/notifications?eventType=&aggregateId=` — cần quyền `NOTIFICATION.AUDIT` (chỉ
ADMIN), dùng để tra cứu/hỗ trợ, không phải cho user thường.

---

## 7. Những điểm FE hay nhầm (đã tự kiểm chứng trong quá trình build)

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
