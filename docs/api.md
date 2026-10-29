# REST API

Base path: `/api`. All endpoints consume/return JSON except book image upload, which uses `multipart/form-data`. Success envelope:

```json
{ "success": true, "message": "...", "data": {} }
```

Errors use `{ "success": false, "message": "...", "data": null }`. Protected routes expect `Authorization: Bearer <JWT>`. `ADMIN` means a valid token with current role `ADMIN`; owner-scoped endpoints only return data belonging to the authenticated user.

## Health and authentication

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/health` | Public | Returns API status. |
| POST | `/auth/register` | Public | Creates customer and cart; returns user and JWT. |
| POST | `/auth/login` | Public | Verifies credentials; returns user and JWT. |
| GET | `/auth/me` | Authenticated | Returns current public user. |

## Storefront and customer APIs

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/books` | Public | Product catalog. Query: `q`/`search`, `categoryId`, `brand`, `minPrice`, `maxPrice`, `rating`, `sort`, `featured`, `page`, `limit`. Returns paged `items`, `total`, `page`, `limit`, `totalPages`. |
| GET | `/books/:idOrSlug` | Public | Product detail by ID or slug, including `brand` and `specifications`. |
| GET | `/books/:idOrSlug/related` | Public | Related active products, same category, up to eight. |
| GET | `/categories` | Public | Active categories. |
| GET | `/users/me` | Authenticated | Current profile. |
| PATCH | `/users/me` | Authenticated | Update name/email/phone/address; email must be unique. |
| PATCH | `/users/me/password` | Authenticated | Change password after checking current password. |
| GET, POST | `/users/me/addresses` | Authenticated | List saved delivery addresses or add one; the first address becomes default. |
| PATCH, DELETE | `/users/me/addresses/:id` | Authenticated | Update or delete an address owned by the current user. |
| PATCH | `/users/me/addresses/:id/default` | Authenticated | Set an owned delivery address as default. |
| PUT | `/users/me/favorites/:bookId` | Authenticated | Toggle favorite for the current user. |
| GET | `/cart` | Authenticated | Get/create current user's cart. |
| POST | `/cart/items` | Authenticated | Body: `bookId`, optional positive integer `quantity` (default 1). |
| PATCH | `/cart/items/:itemId` | Authenticated | Body: positive integer `quantity`. |
| DELETE | `/cart/items/:itemId` | Authenticated | Remove owned cart item. |
| DELETE | `/cart` | Authenticated | Clear current cart. |
| GET | `/orders` | Authenticated | Own orders; query `page`, `limit`. |
| GET | `/orders/track` | Public | Query `orderNumber` and `phone`; returns the order and status history only when both match. |
| POST | `/orders` | Authenticated | Checkout with `receiverName`, `shippingAddress`, `receiverPhone`, `paymentMethod` (`COD` or `VNPAY`), optional `promotionCode`; server calculates all prices. VNPAY returns a signed `paymentUrl`. |
| GET | `/orders/:orderId` | Authenticated, owner | Get own order. |
| POST | `/orders/:orderId/cancel` | Authenticated, owner | Cancel only eligible unpaid orders. |
| GET | `/payments/vnpay/return` | VNPAY callback | Verify signed browser return, update payment once and redirect to the frontend result page. |
| GET | `/payments/vnpay/ipn` | VNPAY callback | Verify signed provider notification and return VNPAY response codes. |
| GET | `/reviews` | Public | Active reviews; optional `bookId`, `page`, `limit`. |
| GET | `/reviews/mine` | Authenticated | Current user's active reviews; query `page`, `limit`. |
| POST | `/reviews` | Authenticated | Body: `bookId`, `rating` (1–5), optional `comment`; delivered purchase required. Creates or updates the user's review for that book. |
| GET | `/membership/tiers` | Public | Active tiers in threshold order. |
| GET | `/membership/me` | Authenticated | Current points, level and progress to next active tier. |
| GET | `/promotions/active` | Public | Active and currently in-date promotions. |
| POST | `/promotions/validate` | Authenticated | Body: `code`; validates against current cart subtotal. |
| POST | `/newsletter/subscribe` | Public | Subscribe an email address. |

## Admin APIs

Every `/admin` path requires authentication and `ADMIN` role.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/admin/dashboard` | Dashboard metrics, low-stock list and best sellers. |
| GET, POST | `/admin/books` | Search/list or create books. |
| GET, PATCH, DELETE | `/admin/books/:id` | Read/update a book; PATCH `status` to hide/reactivate; DELETE permanently deletes only books with no cart, order, review or favorite references (409 otherwise). |
| POST, DELETE | `/admin/books/:id/image` | Upload one `image` file or remove the book image. Upload accepts JPG/JPEG/PNG/WEBP up to 5 MB. |
| GET, POST | `/admin/categories` | List/create categories. |
| GET, PATCH, DELETE | `/admin/categories/:id` | Read/update a category; PATCH `status` to hide/reactivate; DELETE permanently deletes only categories with no books (409 otherwise). |
| GET | `/admin/orders` | Search/list orders. |
| GET | `/admin/orders/:id` | Order detail. |
| PATCH | `/admin/orders/:id/status` | Body: `orderStatus`; validates allowed transition and payment constraints. |
| GET | `/admin/customers` | Search/list customers. |
| GET | `/admin/customers/:id` | Customer details. |
| PATCH | `/admin/customers/:id/lock` | Set customer inactive. |
| PATCH | `/admin/customers/:id/unlock` | Set customer active. |
| GET | `/admin/reviews` | Search/list reviews, including hidden ones. |
| PATCH | `/admin/reviews/:id/approve` | Set review active. |
| PATCH | `/admin/reviews/:id/hide` | Set review inactive. |
| DELETE | `/admin/reviews/:id` | Delete review. |
| GET, POST | `/admin/promotions` | List/create promotions. |
| PATCH, DELETE | `/admin/promotions/:id` | Update/delete promotion. |
| PATCH | `/admin/promotions/:id/activate` | Activate promotion. |
| PATCH | `/admin/promotions/:id/deactivate` | Deactivate promotion. |
| GET, POST | `/admin/membership` | List/create membership tiers. List accepts `status`, `page` and `limit`; level codes are dynamic strings. |
| PATCH, DELETE | `/admin/membership/:id` | Update/reactivate or soft-deactivate a tier. Send `{ "status": "ACTIVE" }` to reactivate; deactivation is blocked for the BRONZE fallback and tiers assigned to customers. |
| GET | `/admin/reports` | Paid revenue, all orders and successful payment counts grouped by month or day; query `from`, `to`, `type=month|day`. |
| GET, POST | `/admin/gift-cards` | List/create gift cards. |
| PATCH, DELETE | `/admin/gift-cards/:id` | Update/deactivate gift card. |
| GET, POST | `/admin/gifts` | List/create gifts. |
| PATCH, DELETE | `/admin/gifts/:id` | Update/deactivate gift. |

Admin list endpoints support some combination of `q`, `status`, page/limit and feature-specific filters. Default page size is 20 and maximum is 100 in `admin.service.js`; see the service for the filters supported by each resource.

## Validation, status codes and limits

Zod schemas validate route bodies; many schemas reject unknown fields. Invalid inputs return 422. Common statuses: 400 malformed JSON/upload, 401 missing/invalid/expired JWT or invalid credentials, 403 role/account restriction, 404 route/resource not found, 409 uniqueness/state/stock conflict, 413 image over 5 MB, 422 validation/business-rule failure, 429 rate limit, 500 unexpected error. Auth routes are limited to 10 requests per IP per 15 minutes; image uploads to 30 per IP per 15 minutes. The configured limiter is in-memory.

VNPAY requires `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` and `VNPAY_RETURN_URL`; checkout fails safely with `503 VNPAY_NOT_CONFIGURED` when these are missing. The browser return is not trusted until its HMAC-SHA512 signature is checked.

## Dashboard biểu đồ

GET /api/admin/dashboard vẫn yêu cầu ADMIN. Response bổ sung:
- revenueTrend: 12 tháng liên tiếp, gồm period (YYYY-MM), revenue và orders. Chỉ tính đơn PAID, nhóm theo tháng tạo đơn UTC. Tháng không giao dịch trả 0.
- orderStatuses: status và count của đơn toàn thời gian.
- categoryDistribution: id, name, count; count chỉ tính sách ACTIVE.
- generatedAt: thời điểm tạo response ISO.
- metrics.lowStock đếm đầy đủ sách ACTIVE có stock <= 5; lowStock vẫn chỉ trả tối đa 8 sách.

Frontend chọn 6/12 tháng cho biểu đồ doanh thu, có tương tác từng điểm và bảng số liệu. Các KPI và biểu đồ còn lại là toàn thời gian. Top sách tính đơn DELIVERED. Không thay schema hay tạo dữ liệu minh họa.

## Sách yêu thích

- `GET /api/users/me/favorites`: yêu cầu JWT, trả `data` là danh sách sách đã lưu của người đăng nhập, mới lưu trước. Không nhận userId từ client.
- `PUT /api/users/me/favorites/:bookId`: yêu cầu JWT, thêm/bỏ yêu thích; trả `{ bookId, isFavorite }`. Chỉ thêm sách ACTIVE; sách đã ẩn vẫn được phép bỏ khỏi danh sách.
- Dùng model `Favorite` hiện có, không cần migration. Khách chưa đăng nhập được hướng dẫn đăng nhập.
- Header mở hộp thoại với ảnh bìa, tên, tác giả, giá, tình trạng, thêm giỏ và bỏ yêu thích. Nút trái tim ở card và chi tiết dùng chung `FavoritesContext`; dữ liệu khởi tạo từ API khi đăng nhập/tải trang. Sách ngừng mở bán không cho thêm giỏ từ danh sách này.

## Tư vấn chọn sách

`POST /api/advisor` (công khai, giới hạn 30 yêu cầu/phút/IP). Body: `{ "messages": ["Sách thời trang tầm 800.000đ"] }`; tối đa 8 tin nhắn khách, mỗi tin tối đa 500 ký tự. Response chuẩn, `data` chứa `message`, `books`, và tùy trường hợp `criteria`, `alternative`, `categories`.

- Tư vấn theo quy tắc, không gọi LLM hay dịch vụ AI bên ngoài. Hiểu tên danh mục hiện có (có/không dấu), giá VNĐ, k/nghìn/triệu, khoảng từ–đến, tối đa/tối thiểu; “tầm/khoảng” là ±20% và được thông báo trên UI.
- Tìm tối đa 3 sách ACTIVE, còn hàng, danh mục ACTIVE. Giá hiệu lực giống danh sách sách: dùng discountPrice khi >0 và thấp hơn price; nếu không, dùng price. Điều kiện thể loại và giá kết hợp bằng AND.
- Không tìm thấy: thử cùng danh mục ngoài khoảng giá, sau đó thể loại khác trong khoảng giá. Các kết quả này luôn được ghi là gợi ý thay thế, không phải khớp yêu cầu.
- Khung chat ở CustomerLayout, hỗ trợ Enter, gửi tiếp để đổi ngân sách, bắt đầu lại, đóng/mở, trạng thái chờ/lỗi và liên kết sách. Hội thoại chỉ ở bộ nhớ trình duyệt trong phiên layout, không lưu DB; không thay đổi schema.

### ISBN khi viết đánh giá

`POST /api/reviews` giữ trường `bookId` tương thích với client cũ, đồng thời nhận ID nội bộ, slug hoặc ISBN. ISBN có/không có dấu gạch nối và khoảng trắng được tra cứu trước khi chuyển sang Book.id thật. Backend dùng ID đã tra cứu cho cả kiểm tra đơn DELIVERED và lưu/upsert đánh giá. Vẫn yêu cầu đăng nhập, sách ACTIVE và đã mua trong đơn được giao; lỗi sách không tồn tại và chưa đủ điều kiện mua được trả bằng tiếng Việt. Không thay schema.

### Sửa form sách quản trị

- BookFormFields giữ chuỗi nhập và chụp giá trị event trước khi cập nhật state; giá/tồn kho dùng text + inputMode để không bị cơ chế step của number input thay đổi ngoài ý muốn. Mô tả dùng textarea, giữ xuống dòng.
- adminBookForm tạo payload theo các trường được chỉnh sửa; PATCH không gửi lại giá/tồn kho nếu không sửa. Giá ưu đãi để trống gửi null, không chuyển null sang 0; chấp nhận cách ghi giá 900.000. Validation bắt số âm, số tồn kho lẻ và giá ưu đãi không hợp lệ.
- Backend cho phép description null theo Prisma, giới hạn tác giả 180 ký tự đúng schema.
- Kiểm tra đã chạy: 4 unit tests frontend, 13 tests backend; integration script `backend/scripts/check-book-edit.js` tạo một sách tạm, kiểm tra API + MySQL cho tất cả trường, quyền 401/403 và dữ liệu sai, rồi xóa sách tạm trong finally. Trình duyệt kiểm tra nhập tất cả 8 trường, phím lên/xuống không đổi số, sau đó Hủy để giữ nguyên sách thật.

### Duyệt đánh giá trước khi công khai

Đánh giá khách hàng tạo mới hoặc gửi lại qua POST `/api/reviews` luôn lưu INACTIVE, không nhận trạng thái do client cung cấp. ADMIN duyệt qua PATCH `/api/admin/reviews/:id/approve` mới chuyển ACTIVE. Khi khách sửa/gửi lại, đánh giá trở lại INACTIVE và cần duyệt lại. Ẩn đánh giá chuyển INACTIVE.

Danh sách công khai, điểm trung bình, số lượng đánh giá và bộ lọc rating chỉ tính ACTIVE. GET `/api/reviews/mine` trả mọi trạng thái của đúng người đăng nhập, bao gồm chưa duyệt/đã ẩn. ADMIN có cột trạng thái và bộ lọc tương ứng. Enum hiện tại chỉ có ACTIVE/INACTIVE nên chưa phân biệt riêng chưa duyệt với bị ẩn.

Theo lựa chọn chủ dự án: giữ nguyên đánh giá ACTIVE cũ; chỉ áp dụng quy trình này cho đánh giá mới hoặc gửi lại. Không reset dữ liệu, không migration.

### Tra cứu sách trong chat tư vấn

POST `/api/advisor` nhận tên sách (không phân biệt hoa/thường, dấu), ISBN có/không gạch nối, ID nội bộ hoặc slug trong tin nhắn. Ưu tiên tra cứu sách trước khi phân tích ngân sách; không dùng ISBN/tên sách ở lịch sử làm điều kiện giá. Chỉ tra cứu sách ACTIVE thuộc danh mục ACTIVE; sách hết hàng vẫn được tìm đúng và có thông báo hết hàng.

Nếu không tìm thấy tên/mã: trả thông báo rõ cùng tối đa 3 sách bán chạy còn hàng. Thứ hạng được truy vấn mỗi request, theo SUM(OrderItem.quantity) của đơn DELIVERED, loại FAILED/REFUNDED; không dùng số bán giả hoặc danh sách cố định. Không có lịch sử bán phù hợp thì trả danh sách rỗng và thông báo. Frontend hiển thị nhãn “Sách bán chạy hiện tại”.
