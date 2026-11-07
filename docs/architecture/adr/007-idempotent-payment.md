# ADR-007: Thanh toán idempotent bằng `Idempotency-Key`

| Trạng thái | Accepted |
|---|---|
| Ngày | 04/11/2026 |

## Bối cảnh

Mạng di động chập chờn khiến client gửi lại yêu cầu thanh toán, hoặc người dùng bấm nhiều lần. Hệ thống không được ghi nhận hai khoản thanh toán cho một lần bấm. Bảng `Payment` có `idempotencyKey` duy nhất (`@unique`).

## Quyết định

1. Client sinh một **UUID v4** cho mỗi *lần người dùng bấm thanh toán* và gửi trong header `Idempotency-Key` của `POST /payments`. Gửi lại do mạng lỗi dùng **cùng key**; một lần bấm mới sau khi thất bại dùng **key mới**.
2. Số tiền lấy từ `Order.finalAmount` ở server, không nhận từ client.
3. Backend xử lý theo bảng sau:

| Tình huống | Kết quả |
|---|---|
| Key mới, đơn chưa thanh toán | Gọi cổng thanh toán, ghi `Payment`, cập nhật đơn |
| Key đã có, cùng `orderId` và `method` | Trả lại kết quả đã lưu (không gọi cổng lần nữa) |
| Key đã có nhưng khác `orderId` hoặc `method` | HTTP 422 |
| Đơn đã `PAID` (key mới) | HTTP 409 |
| Hai request cùng key đến đồng thời | Ràng buộc unique chỉ cho một request ghi; request còn lại đọc và trả lại bản ghi đó |
| Cổng thanh toán quá thời gian chờ (không rõ kết quả) | HTTP 504, không ghi `Payment`, đơn giữ `PENDING`; client gửi lại **cùng key** |

4. Header `Idempotency-Key` được chuyển tiếp cho Mock Payment Service để cổng cũng chống trùng (lớp bảo vệ thứ hai).
5. Khi thanh toán thành công, **một transaction** ghi `Payment(SUCCESS)` và chuyển đơn sang `PAID`. Khi thất bại, ghi `Payment(FAILED)` và chuyển đơn sang `PAYMENT_FAILED`, cho phép thử lại.
6. Mã luôn đặt `status` của `Payment` một cách tường minh; không dựa vào giá trị mặc định của schema.

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| Chỉ vô hiệu nút bấm ở frontend | Không chặn được request gửi lại do mạng hoặc gọi trực tiếp API |
| Khoá theo `orderId` | Chặn luôn việc thử lại hợp lệ sau khi thất bại |
| Hàng đợi/khoá phân tán (Redis) | Thêm hạ tầng, không cần cho MVP |

## Hệ quả

**Ưu điểm**
- Gửi lại an toàn; kết quả cuối nhất quán dù client thử bao nhiêu lần.
- Có thể kiểm thử bằng integration test gửi hai lần cùng key.

**Hạn chế / đánh đổi**
- Client phải sinh và giữ key đúng cách; sai quy ước sẽ gây thanh toán trùng hoặc không thử lại được.
- Schema chưa có trạng thái `PENDING` cho `Payment`, nên bản ghi chỉ được ghi sau khi có kết quả; có khoảng thời gian ngắn giữa lúc gọi cổng và lúc ghi DB, được giảm thiểu nhờ cổng cũng chống trùng theo key.
- Cần dọn hoặc giữ vô thời hạn các key cũ; MVP giữ lại toàn bộ.

## Liên quan

Mục tiêu G3, rủi ro R3; `apps/api` (`PaymentsModule`); ADR-008, 009.
