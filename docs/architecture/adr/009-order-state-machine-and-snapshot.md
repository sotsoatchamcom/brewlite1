# ADR-009: Order State Machine, snapshot giá và giữ tồn kho

| Trạng thái | Accepted |
|---|---|
| Ngày | 04/11/2026 |

## Bối cảnh

Đơn hàng đi qua nhiều trạng thái, do cả khách (thanh toán) lẫn Admin (chế biến) tác động. Giá, size, topping có thể đổi sau khi đơn được tạo. Cần quy tắc chuyển trạng thái chặt chẽ và dữ liệu đơn không bị ảnh hưởng khi menu thay đổi.

## Quyết định

**1. Order State Machine.** Mọi chuyển trạng thái đi qua một hàm duy nhất trong `OrdersService`, chỉ cho phép các bước sau:

| Từ | Sang | Do ai / sự kiện |
|---|---|---|
| `PENDING` | `PAID` | Thanh toán thành công |
| `PENDING` | `PAYMENT_FAILED` | Thanh toán thất bại |
| `PAYMENT_FAILED` | `PAID` | Thanh toán lại thành công |
| `PENDING`, `PAYMENT_FAILED` | `CANCELLED` | Khách hoặc Admin huỷ |
| `PAID` | `PREPARING` | Admin |
| `PREPARING` | `READY` | Admin |
| `READY` | `COMPLETED` | Admin |

Mọi chuyển khác bị từ chối (HTTP 409). Huỷ đơn đã `PAID` không hỗ trợ trong MVP vì hoàn tiền nằm ngoài phạm vi (O8). Khi chuyển trạng thái, cập nhật có điều kiện theo trạng thái hiện tại để tránh hai Admin ghi đè nhau.

**2. Snapshot.** Khi tạo đơn, `OrderItem` và `OrderItemTopping` lưu lại tên, đơn giá, size, phụ thu, topping và thành tiền tại thời điểm đặt. Đơn cũ không đổi khi giá hoặc menu thay đổi. `Order.total`, `discountAmount`, `finalAmount` do server tính.

**3. Giữ tồn kho.** Tồn kho trừ khi tạo đơn (ADR-006). Đơn `PAYMENT_FAILED` **vẫn giữ chỗ** để khách thử lại. Khi đơn chuyển sang `CANCELLED`, **hoàn kho** trong cùng transaction.

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| Trừ kho khi thanh toán thành công | Khách đã thanh toán có thể gặp hết hàng; mâu thuẫn với trải nghiệm đặt đơn |
| Tham chiếu giá hiện tại của sản phẩm | Lịch sử đơn sai khi giá đổi |
| Cho đổi trạng thái tự do | Dữ liệu không nhất quán, khó kiểm thử |

## Hệ quả

**Ưu điểm**
- Trạng thái dự đoán được, test được từng bước chuyển; khớp activity diagram.
- Lịch sử đơn và đối soát luôn đúng với thời điểm đặt.

**Hạn chế / đánh đổi**
- Đơn `PENDING`/`PAYMENT_FAILED` bị bỏ dở giữ tồn kho vô thời hạn. MVP xử lý bằng huỷ thủ công; tác vụ tự động huỷ đơn quá hạn là hướng mở rộng.
- Snapshot làm tăng dung lượng lưu trữ và dữ liệu lặp.
- Không huỷ được đơn đã thanh toán trong MVP.

## Liên quan

Enum `OrderStatus`; `OrderItem`, `OrderItemTopping`; giả định A6, A9; ADR-006, 007.
