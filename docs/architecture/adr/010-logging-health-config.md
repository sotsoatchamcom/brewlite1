# ADR-010: Logging JSON, health check và quản lý cấu hình

| Trạng thái | Accepted |
|---|---|
| Ngày | 04/11/2026 |

## Bối cảnh

Hệ thống chạy ở ba môi trường (local, CI, production) và phải truy vết được sự cố, kiểm tra được sức khoẻ sau triển khai, và không để lộ secret. Đề bài yêu cầu logging, health check và quản lý cấu hình.

## Quyết định

**Logging**
1. Backend dùng log **có cấu trúc dạng JSON ghi ra stdout** (ví dụ `nestjs-pino`). Không ghi ra file trong container.
2. Mỗi request có `requestId` (nhận từ header `x-request-id` hoặc tự sinh, trả lại trong response) để nối log giữa Frontend, Backend.
3. Mức log theo môi trường qua `LOG_LEVEL` (`debug` ở local, `info` ở production).
4. Tập trung hoá nhờ nền tảng: `docker compose logs` ở local; trình xem log của nền tảng triển khai ở production. MVP không dựng ELK/Loki.
5. **Che dữ liệu nhạy cảm**: không ghi `authorization`, mật khẩu, `passwordHash`, token thanh toán, `JWT_SECRET`.
6. Ghi các sự kiện nghiệp vụ chính: tạo đơn, kết quả thanh toán, xung đột tồn kho, đổi trạng thái đơn, lỗi 5xx.

**Health check**
7. `GET /health` (liveness): trả 200 khi tiến trình sống, không phụ thuộc DB.
8. `GET /health/ready` (readiness): kiểm tra kết nối PostgreSQL (`SELECT 1`, ví dụ bằng `@nestjs/terminus`); trả 503 khi DB không sẵn sàng.
9. Dùng cho `healthcheck` trong `docker-compose.yml`, health check của nền tảng và smoke test sau khi triển khai.

**Quản lý cấu hình**
10. Cấu hình lấy từ **biến môi trường** (12-factor), nạp bằng `@nestjs/config` và **kiểm tra schema khi khởi động**; thiếu biến bắt buộc thì ứng dụng không chạy.
11. `.env.example` liệt kê tên biến, **không chứa giá trị thật**; `.env` nằm trong `.gitignore`.
12. Secret của CI và production lưu trong kho secret của GitHub Actions/nền tảng, không nằm trong repo hay log CI.
13. Với Next.js, biến `NEXT_PUBLIC_*` được nhúng vào bundle lúc **build** nên không bao giờ chứa secret.

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| Log dạng văn bản tự do, ghi file | Khó truy vấn, khó thu thập trong container |
| ELK/Loki/Grafana | Chi phí và công cài đặt vượt phạm vi MVP |
| Một endpoint `/health` duy nhất kiểm tra cả DB | Khi DB lỗi, nền tảng có thể khởi động lại liên tục cả ứng dụng không cần thiết |
| File cấu hình trong repo | Dễ lộ secret, khó đổi theo môi trường |

## Hệ quả

**Ưu điểm**
- Truy vết một request qua nhiều thành phần; log dễ lọc và phân tích.
- Triển khai và smoke test tự động dựa vào health endpoint.
- Cấu hình sai bị phát hiện ngay lúc khởi động thay vì lúc chạy.

**Hạn chế / đánh đổi**
- Không có dashboard, cảnh báo hay lưu log dài hạn; log mất khi nền tảng xoay vòng.
- Log JSON khó đọc bằng mắt ở local nếu không dùng công cụ định dạng (ví dụ `pino-pretty`).
- Đổi `NEXT_PUBLIC_API_URL` cần build lại image Frontend.

## Liên quan

NFR về khả năng triển khai và bảo mật; ràng buộc C10; `docs/deployment.md`; `.env.example`.
