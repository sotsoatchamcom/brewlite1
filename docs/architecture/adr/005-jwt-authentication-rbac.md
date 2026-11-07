# ADR-005: Xác thực JWT (Bearer) và phân quyền theo vai trò

| Trạng thái | Accepted |
|---|---|
| Ngày | 04/11/2026 |

## Bối cảnh

Khách phải đăng nhập để đặt đơn và chỉ được xem đơn của mình; Admin quản lý đơn. Frontend (cổng 3000) và Backend (cổng 3001) chạy khác origin. Đề bài yêu cầu đăng ký, đăng nhập và JWT.

## Quyết định

1. Mật khẩu băm bằng **bcrypt** và lưu ở `passwordHash`; không bao giờ lưu hoặc ghi log mật khẩu gốc.
2. Đăng nhập thành công trả về **JWT access token** có thời hạn ngắn, ký bằng bí mật `JWT_SECRET` lấy từ biến môi trường. Payload gồm `sub` (user id) và `role`.
3. Client gửi `Authorization: Bearer <JWT>` trong mỗi request cần xác thực.
4. Phân quyền bằng `JwtAuthGuard` và `RolesGuard` (`CUSTOMER`, `ADMIN`). Khách chỉ truy cập đơn có `userId` trùng `sub`; Admin được xem và cập nhật mọi đơn.
5. Tài khoản `isActive = false` bị từ chối ở bước đăng nhập và khi xác thực.
6. Endpoint xem menu (`GET /products`, `GET /products/:id`) công khai; tạo đơn, thanh toán, lịch sử đơn yêu cầu đăng nhập.
7. MVP không có refresh token.

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| Session + cookie | Frontend và API khác origin, cấu hình cookie cross-site và CSRF phức tạp hơn |
| Token trong cookie httpOnly | An toàn hơn trước XSS nhưng cần xử lý CSRF và domain; để dành cho giai đoạn sau |
| OAuth / đăng nhập mạng xã hội | Ngoài phạm vi MVP (O7) |

## Hệ quả

**Ưu điểm**
- Stateless, API dễ mở rộng; không cần kho session.
- Một cơ chế dùng được cho cả trình duyệt và test tự động.

**Hạn chế / đánh đổi**
- Không thu hồi được token trước khi hết hạn; giảm thiểu bằng thời hạn ngắn và kiểm tra `isActive`.
- Token lưu phía client (MVP dùng `localStorage`) có rủi ro bị đánh cắp qua XSS; giảm thiểu bằng việc không chèn HTML thô, bật CSP cơ bản.
- Không có refresh token nên khách phải đăng nhập lại khi token hết hạn.

## Liên quan

FR xác thực (SRS); NFR bảo mật; `apps/api` (`AuthModule`).
