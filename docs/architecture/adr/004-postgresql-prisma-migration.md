# ADR-004: PostgreSQL 16 và Prisma, quản lý schema bằng migration

| Trạng thái | Accepted |
|---|---|
| Ngày | 04/11/2026 |

## Bối cảnh

Đề bài bắt buộc PostgreSQL và yêu cầu migration/seed tái tạo được database. Dữ liệu có quan hệ chặt (đơn hàng, món, topping, thanh toán) và cần transaction. Nhóm cần công cụ truy cập dữ liệu có kiểu dữ liệu an toàn và kiểm thử được.

## Quyết định

1. Dùng **PostgreSQL 16**, chạy bằng Docker (volume lưu trữ bền) ở local; ở production dùng dịch vụ PostgreSQL của nền tảng, không mở ra Internet.
2. Dùng **Prisma** làm ORM; `datasource` phải khai báo `provider = "postgresql"`.
3. Quản lý schema bằng **Prisma Migrate**:
   - Phát triển: `prisma migrate dev`.
   - CI/CD và production: `prisma migrate deploy`, chạy **trước** khi khởi động phiên bản mới.
   - Dữ liệu mẫu: `prisma db seed`, chạy được lặp lại.
4. Tiền tệ lưu bằng **số nguyên VNĐ** (`Int`), không dùng số thực.
5. Đơn hàng lưu **snapshot** tên, giá, size, topping tại thời điểm đặt (xem ADR-009).
6. Migration theo hướng **tương thích ngược** (thêm trước, xoá sau) để rollback ứng dụng không phải rollback schema.

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| MySQL (schema khởi tạo ban đầu dùng provider này) | Đề bắt buộc PostgreSQL |
| TypeORM | Kiểu dữ liệu và migration kém tiện hơn Prisma với nhóm hiện tại |
| SQL thuần | Tốn thời gian viết và kiểm thử truy vấn, dễ sai |

## Hệ quả

**Ưu điểm**
- Schema là một nguồn sự thật, migration có lịch sử trong Git; ai cũng tái tạo được database.
- Kiểu dữ liệu sinh tự động giảm lỗi; `$transaction` hỗ trợ tạo đơn nhiều bước.
- PostgreSQL hỗ trợ tốt transaction và ràng buộc unique dùng cho idempotency.

**Hạn chế / đánh đổi**
- Prisma bổ sung một bước sinh client (`prisma generate`) trong build và Dockerfile.
- Truy vấn phức tạp có thể phải dùng `$queryRaw`.
- Migration chạy khi triển khai phải xử lý cẩn thận để không khoá bảng lâu; quy trình chạy an toàn mô tả trong `docs/deployment.md`.
- Đổi provider từ MySQL sang PostgreSQL yêu cầu tạo lại migration gốc (baseline).

## Liên quan

Ràng buộc C3, C4; `apps/api/prisma`; `docker-compose.yml`.
