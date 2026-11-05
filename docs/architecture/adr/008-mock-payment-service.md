# ADR-008: Mock Payment Service sau interface `PaymentGateway`

| Trạng thái | Proposed (cần nhóm xác nhận cách hiện thực) |
|---|---|
| Ngày | 04/11/2026 |

## Bối cảnh

Đề bài chỉ yêu cầu thanh toán Ví/Thẻ mô phỏng; tích hợp cổng thật nằm ngoài phạm vi (O1, O2). Sơ đồ C1/C2 vẽ Mock Payment Service là **hệ thống ngoài**, giao tiếp HTTPS/JSON và nhận `Idempotency-Key`. Cần thiết kế để sau này thay bằng cổng thật mà không sửa nghiệp vụ.

## Quyết định

1. Nghiệp vụ thanh toán chỉ phụ thuộc vào interface `PaymentGateway`:
   ```ts
   charge(input: { idempotencyKey; orderId; amount; method; token }):
     Promise<{ status: 'SUCCESS' | 'FAILED'; transactionId?: string; reason?: string }>
   ```
2. Hiện thực `HttpPaymentGateway` gọi `POST {PAYMENT_GATEWAY_URL}/charges` (HTTPS, JSON) với header `Idempotency-Key`, thời gian chờ `PAYMENT_TIMEOUT_MS`.
3. Trong MVP, **Mock Payment Service chạy dưới dạng module `mock-payment` bên trong `apps/api`** (tiền tố route `/mock-payment`, bật bằng `PAYMENT_MOCK_ENABLED`); `PAYMENT_GATEWAY_URL` trỏ tới chính API. Nhờ đó không cần thêm container nhưng luồng vẫn là một cuộc gọi HTTP thật, khớp với C2.
4. Quy tắc mô phỏng (cấu hình được, mặc định):
   - `CARD`: token `tok_success` → thành công; `tok_declined` → thất bại; `tok_timeout` → không phản hồi trong thời gian chờ.
   - `WALLET`: thành công nếu số tiền không vượt hạn mức `WALLET_LIMIT`, ngược lại thất bại (không đủ số dư).
5. **Không nhận, không lưu số thẻ, CVV hay dữ liệu thẻ thật**; client chỉ gửi token mô phỏng.
6. Mock cũng áp dụng idempotency theo key (cùng key trả cùng kết quả).

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| Gọi hàm trực tiếp trong tiến trình, không qua HTTP | Nhanh hơn nhưng C1/C2 phải sửa nhãn giao thức; khó thay bằng cổng thật |
| Container riêng cho mock | Thêm một dịch vụ cần build, deploy và vẽ trong deployment diagram; chưa cần cho MVP |
| Cổng sandbox thật (VNPay, Stripe…) | Ngoài phạm vi, rủi ro bảo mật và phụ thuộc bên ngoài |

## Hệ quả

**Ưu điểm**
- Thay bằng cổng thật chỉ cần viết adapter mới cho `PaymentGateway`.
- Kịch bản thành công, thất bại, quá thời gian đều kiểm thử được, kể cả E2E.

**Hạn chế / đánh đổi**
- Mock nằm cùng tiến trình với API nên khi triển khai, **deployment diagram phải ghi rõ** đây không phải container riêng; sơ đồ C1/C2 mô tả ranh giới logic.
- API tự gọi chính mình qua HTTP, thêm một bước mạng trong cùng máy.
- Nếu nhóm chọn gọi trực tiếp trong tiến trình hoặc tách container riêng, cần cập nhật ADR này, C2 và deployment diagram.

## Liên quan

Stakeholder S6, giả định A7, ngoài phạm vi O1, O2, O8; ADR-007; `apps/api`.
