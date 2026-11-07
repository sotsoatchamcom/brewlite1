# ADR-003: Backend NestJS theo modular monolith và kiến trúc phân lớp

| Trạng thái | Accepted |
|---|---|
| Ngày | 04/11/2026 |

## Bối cảnh

Backend cần xử lý nghiệp vụ đơn hàng, tồn kho, thanh toán, xác thực. Đề bài yêu cầu NestJS theo module/domain. Nhóm nhỏ, hai sprint, triển khai trên hạ tầng giới hạn.

## Quyết định

Xây dựng **một ứng dụng NestJS duy nhất (modular monolith)**, chia module theo domain, mỗi module phân lớp:

```
Controller (HTTP, DTO, validate)  →  Service (nghiệp vụ, transaction)  →  Prisma Client (truy cập dữ liệu)
```

| Module | Trách nhiệm |
|---|---|
| `AuthModule` | Đăng ký, đăng nhập, JWT, guard theo vai trò |
| `UsersModule` | Hồ sơ người dùng |
| `CatalogModule` | Sản phẩm, danh mục, size, topping |
| `OrdersModule` | Tạo đơn, trừ kho, trạng thái đơn, lịch sử |
| `PaymentsModule` | Thanh toán, idempotency, gọi `PaymentGateway` |
| `CouponsModule`, `NotificationsModule` | Phạm vi mở rộng (Should/Could) |
| `HealthModule` | `GET /health`, `GET /health/ready` |
| `PrismaModule`, `Common` | Kết nối DB, cấu hình, logging, filter lỗi, pipe validate |

Quy tắc:
- Controller không chứa nghiệp vụ; Service không phụ thuộc `Request`/`Response`.
- Validate đầu vào bằng DTO và `ValidationPipe` toàn cục (`whitelist`, `transform`).
- Lỗi nghiệp vụ trả về mã HTTP và mã lỗi thống nhất qua exception filter.
- Module chỉ gọi module khác qua Service được export, không truy cập bảng của module khác tuỳ tiện.

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| Microservices (order, payment, catalog tách riêng) | Quá nặng cho MVP: nhiều deploy, giao dịch phân tán, chi phí hạ tầng |
| Express thuần | Thiếu cấu trúc module, DI, guard/pipe có sẵn; đề đã chỉ định NestJS |

## Hệ quả

**Ưu điểm**
- Một đơn vị triển khai, một transaction DB cho tạo đơn và trừ kho, không cần giao dịch phân tán.
- Ranh giới module rõ ràng; dễ tách thành dịch vụ riêng sau này nếu cần.
- Dễ unit test từng Service và integration test từng module.

**Hạn chế / đánh đổi**
- Mở rộng theo chiều ngang phải nhân bản cả ứng dụng, không scale riêng từng module.
- Một lỗi nghiêm trọng có thể ảnh hưởng toàn bộ API.
- Kỷ luật phân lớp phụ thuộc vào code review, framework không tự ép.

## Liên quan

Ràng buộc C2, C14; `apps/api`; ADR-004, 006, 007.
