# BrewLite – Mô hình kiến trúc C4 (Context và Container)

| Mục | Nội dung |
|---|---|
| Phương pháp | C4 Model: mức 1 (System Context) và mức 2 (Container); kiến trúc phân lớp bên trong Backend |
| Phiên bản | 1.2 |
| Nguồn sơ đồ (PlantUML) | [`../diagrams/c4-context.puml`](../diagrams/c4-context.puml), [`../diagrams/c4-container.puml`](../diagrams/c4-container.puml) |
| Ảnh kết xuất | `../diagrams/c4-context.png`, `../diagrams/c4-container.png` |
| Quyết định kiến trúc | [`adr/`](adr/README.md) |
| Liên quan | `../requirements/context-and-scope.md`, `../traceability-matrix.md` |

---

## 1. C1 – System Context

Cho thấy BrewLite trong môi trường của nó: ai dùng hệ thống và hệ thống ngoài nào nó phụ thuộc vào.

![C1 – System Context](../diagrams/c4-context.png)

| Thành phần | Loại | Vai trò |
|---|---|---|
| **Customer** | Person | Khách hàng: xem menu, chọn size/topping, đặt đơn, thanh toán, theo dõi và xem lịch sử đơn (stakeholder S1). |
| **Admin** | Person | Nhân viên quầy hoặc quản lý (vai trò `ADMIN`): tiếp nhận đơn, cập nhật trạng thái chế biến, quản lý sản phẩm (S2, S3). |
| **BrewLite System** | Software System | Hệ thống đặt đồ uống trực tuyến: menu, giỏ hàng, đặt đơn chống bán vượt tồn kho (khóa lạc quan), thanh toán chống trùng lặp (idempotent), theo dõi đơn. |
| **Mock Payment Service** | External System | Dịch vụ thanh toán mô phỏng Ví/Thẻ, trả kết quả thành công hoặc thất bại (S6). |

| Từ | Đến | Mục đích | Giao thức |
|---|---|---|---|
| Customer | BrewLite System | Sử dụng ứng dụng trên thiết bị di động / PWA | HTTPS |
| Admin | BrewLite System | Quản lý đơn hàng và thực đơn qua trình duyệt | HTTPS |
| BrewLite System | Mock Payment Service | Gửi yêu cầu thanh toán (kèm Idempotency-Key), nhận kết quả | HTTPS, JSON |

---

## 2. C2 – Container

Mở hộp BrewLite System thành các container chạy và triển khai được độc lập. "Container" ở đây là một ứng dụng hoặc kho dữ liệu chạy riêng, không nhất thiết là Docker container.

![C2 – Container](../diagrams/c4-container.png)

### 2.1 Vai trò của từng container

| Container | Công nghệ | Mã nguồn | Cổng | Vai trò |
|---|---|---|---|---|
| **Frontend** | Next.js (mobile-first, PWA) | `../../apps/web` | 3000 | Hiển thị giao diện menu, giỏ hàng, checkout, lịch sử và theo dõi đơn, màn hình Admin. Gọi Backend qua REST, không truy cập trực tiếp cơ sở dữ liệu. |
| **Backend** | NestJS REST API | `../../apps/api` | 3001 | Xác thực và phân quyền JWT, validate dữ liệu, xử lý nghiệp vụ (tạo đơn, trừ tồn kho bằng khóa lạc quan qua trường `version`, thanh toán idempotent, Order State Machine), health check `GET /health`. Là thành phần duy nhất truy cập cơ sở dữ liệu. |
| **Database** | PostgreSQL 16 (Docker) | Migration và seed trong `../../apps/api` | 5432 | Lưu người dùng, sản phẩm, kích cỡ/topping, đơn hàng, thanh toán, mã giảm giá (Coupon), điểm tích lũy (Loyalty), thông báo; schema quản lý qua Prisma migration. |

### 2.2 Giao thức giữa các khối

| Từ | Đến | Giao thức | Nội dung trao đổi |
|---|---|---|---|
| Customer / Admin | Frontend | HTTPS | Tải trang và tài nguyên PWA |
| Frontend | Backend | REST, JSON qua HTTPS, header `Authorization: Bearer <JWT>` | `GET /products`, `GET /products/:id`, đăng ký/đăng nhập, tạo đơn, thanh toán, lịch sử và trạng thái đơn |
| Backend | Database | Prisma Client qua TCP, cổng 5432 | Truy vấn và ghi dữ liệu; transaction khi tạo đơn và cập nhật tồn kho |
| Backend | Mock Payment Service | HTTPS, JSON, kèm `Idempotency-Key` | Yêu cầu thanh toán và kết quả thành công/thất bại |

Ghi chú:

- Cổng 3000, 3001, 5432 là cổng khi chạy local bằng `../../docker-compose.yml`. Ở production, người dùng chỉ truy cập qua HTTPS (443) và cơ sở dữ liệu không mở ra Internet.
- Frontend gọi Backend từ cả phía server (SSR) lẫn trình duyệt, nên Backend cần bật CORS cho domain của Frontend và địa chỉ API lấy từ biến môi trường (mục 4.3).
- Mock Payment Service là hệ thống ngoài về mặt logic. Trong MVP nó chạy dưới dạng module trong `apps/api` (xem [ADR-008](adr/008-mock-payment-service.md)); deployment diagram phải thể hiện đúng điều này.

---

## 3. Thuyết minh kiến trúc và trade-off

### 3.1 Phong cách kiến trúc

BrewLite dùng **kiến trúc ba tầng (Frontend – Backend – Database)**, trong đó Backend là **modular monolith** chia module theo domain và phân lớp bên trong; toàn bộ nằm trong **một monorepo** ([ADR-001](adr/001-monorepo.md), [ADR-003](adr/003-nestjs-modular-layered-backend.md)).

Lý do chọn:
- Nghiệp vụ cốt lõi (tạo đơn, trừ kho, thanh toán) cần **một transaction cơ sở dữ liệu duy nhất**; microservices sẽ buộc phải xử lý giao dịch phân tán.
- Nhóm nhỏ, hai sprint, hạ tầng giới hạn: một đơn vị triển khai cho Backend là đủ và dễ vận hành.
- Ranh giới module rõ ràng cho phép tách dịch vụ riêng sau này nếu cần.

### 3.2 Cấu trúc bên trong Backend

```
Controller (HTTP, DTO, validate)  →  Service (nghiệp vụ, transaction)  →  Prisma Client  →  PostgreSQL
                                          └──→ PaymentGateway (HTTP)  →  Mock Payment Service
```

| Module | Trách nhiệm | Mã nguồn |
|---|---|---|
| `AuthModule`, `UsersModule` | Đăng ký, đăng nhập, JWT, phân quyền `CUSTOMER`/`ADMIN` | `../../apps/api/src/auth`, `users` |
| `CatalogModule` | Sản phẩm, danh mục, size, topping | `../../apps/api/src/catalog` |
| `OrdersModule` | Tạo đơn, trừ kho, Order State Machine, lịch sử đơn | `../../apps/api/src/orders` |
| `PaymentsModule` | Thanh toán, idempotency, gọi `PaymentGateway` | `../../apps/api/src/payments` |
| `CouponsModule`, `NotificationsModule` | Mở rộng (Should/Could) | `../../apps/api/src/coupons`, `notifications` |
| `HealthModule`, `Common` | Health check, cấu hình, logging, filter lỗi | `../../apps/api/src/health`, `common` |

Tên thư mục là quy ước đề xuất; cập nhật bảng này nếu cấu trúc code thực tế khác.

### 3.3 Lý do chọn, ưu điểm, hạn chế và đánh đổi

| Quyết định | Lý do chọn | Ưu điểm | Hạn chế / đánh đổi | ADR |
|---|---|---|---|---|
| **Monorepo** | Hai ứng dụng, tài liệu và test cần truy vết cùng nhau | Một PR sửa cả web, API, docs; clone một lần | CI có thể chạy thừa; không tự chia sẻ kiểu dữ liệu | [001](adr/001-monorepo.md) |
| **Next.js PWA, giỏ hàng ở client** | Khách dùng điện thoại; không có bảng Cart | Tải nhanh nhờ SSR, cài được như app; Backend đơn giản | Giỏ hàng không đồng bộ giữa thiết bị; polling có độ trễ | [002](adr/002-nextjs-pwa-frontend.md) |
| **NestJS modular monolith** | Cần transaction duy nhất, nhóm nhỏ | Dễ vận hành, dễ test, có thể tách sau | Scale cả khối, lỗi lan toàn API | [003](adr/003-nestjs-modular-layered-backend.md) |
| **PostgreSQL + Prisma migration** | Đề bắt buộc; dữ liệu quan hệ cần ACID | Schema có lịch sử, kiểu an toàn, tái tạo DB dễ | Thêm bước `prisma generate`; truy vấn phức tạp cần SQL thô | [004](adr/004-postgresql-prisma-migration.md) |
| **JWT Bearer, RBAC** | Frontend và API khác origin, API stateless | Không cần kho session | Không thu hồi token; rủi ro XSS khi lưu token ở client | [005](adr/005-jwt-authentication-rbac.md) |
| **Khóa lạc quan khi trừ kho** | Không bán vượt tồn khi đặt đồng thời | Không giữ khoá lâu, thông lượng tốt | Món hot có thể phải thử lại/409 | [006](adr/006-optimistic-locking-stock.md) |
| **Thanh toán idempotent** | Mạng chập chờn, bấm nhiều lần | Gửi lại an toàn, kết quả nhất quán | Client phải quản lý key đúng cách | [007](adr/007-idempotent-payment.md) |
| **Mock Payment sau `PaymentGateway`** | Chỉ cần thanh toán mô phỏng, nhưng phải thay được | Đổi sang cổng thật bằng adapter | Mock cùng tiến trình với API | [008](adr/008-mock-payment-service.md) |
| **Order State Machine, snapshot** | Nhiều bên đổi trạng thái; giá có thể đổi | Trạng thái dự đoán được, lịch sử đúng | Đơn bỏ dở giữ tồn kho; không huỷ được đơn đã thanh toán | [009](adr/009-order-state-machine-and-snapshot.md) |
| **Log JSON, health, cấu hình env** | Truy vết, smoke test, an toàn secret | Truy vết theo `requestId`; fail-fast khi thiếu cấu hình | Không có dashboard/cảnh báo | [010](adr/010-logging-health-config.md) |

### 3.4 Thuộc tính chất lượng

| Thuộc tính | Cách kiến trúc đáp ứng | Giới hạn |
|---|---|---|
| Hiệu năng | SSR cho menu, truy vấn có chỉ mục, không giữ khoá lâu | Chưa có cache; phụ thuộc gói hạ tầng miễn phí |
| Bảo mật | Băm mật khẩu, JWT, RBAC, validate hai phía, secret ngoài repo, DB không public | Không refresh token; token lưu ở client |
| Tính khả dụng | Health/readiness, restart theo nền tảng | Một bản sao Backend, không dự phòng |
| Nhất quán dữ liệu | Transaction, khóa lạc quan, idempotency | Đơn bỏ dở giữ kho (ADR-009) |
| Khả năng kiểm thử | Phân lớp, `PaymentGateway` thay được bằng mock | Cần dựng DB test cho integration test |
| Khả năng triển khai | Docker, migration, health check, CI/CD | Chạy migration an toàn cần quy trình riêng (`docs/deployment.md`) |

### 3.5 Hạn chế đã biết và hướng mở rộng

- Chưa có hàng đợi hay cache; thanh toán xử lý đồng bộ trong một request.
- Trạng thái đơn cập nhật bằng polling, chưa có đẩy thời gian thực.
- Chưa tự động huỷ đơn quá hạn để nhả tồn kho.
- Chưa có refresh token và chưa thu hồi được phiên đăng nhập.
- Hướng mở rộng: tách Mock Payment thành dịch vụ riêng hoặc thay bằng cổng thật qua `PaymentGateway`, thêm cache menu, thêm tác vụ nền (huỷ đơn quá hạn, thông báo).

---

## 4. Quản trị hệ thống

### 4.1 Logging

Chi tiết tại [ADR-010](adr/010-logging-health-config.md).

| Nội dung | Giải pháp |
|---|---|
| Định dạng | JSON có cấu trúc, ghi ra stdout (ví dụ `nestjs-pino`) |
| Truy vết | `requestId` từ header `x-request-id` hoặc tự sinh, trả lại trong response |
| Mức log | `LOG_LEVEL`: `debug` ở local, `info` ở production |
| Tập trung | `docker compose logs` ở local; trình xem log của nền tảng ở production |
| Che dữ liệu nhạy cảm | Không ghi `authorization`, mật khẩu, `passwordHash`, token thanh toán, `JWT_SECRET` |
| Sự kiện ghi lại | Tạo đơn, kết quả thanh toán, xung đột tồn kho, đổi trạng thái đơn, lỗi 5xx |

### 4.2 Health check

| Endpoint | Mục đích | Phản hồi |
|---|---|---|
| `GET /health` | Liveness: tiến trình còn sống | 200 `{"status":"ok"}` |
| `GET /health/ready` | Readiness: kiểm tra kết nối PostgreSQL (`SELECT 1`) | 200 khi sẵn sàng, 503 khi DB lỗi |

Dùng trong `healthcheck` của `docker-compose.yml` (API chỉ được gọi khi DB sẵn sàng), health check của nền tảng và smoke test sau triển khai.

### 4.3 Quản lý cấu hình

Cấu hình đọc từ biến môi trường, kiểm tra schema khi khởi động (thiếu biến bắt buộc thì không chạy). `.env.example` chỉ chứa tên biến, `.env` nằm trong `.gitignore`.

| Biến | Thành phần | Mô tả | Bí mật |
|---|---|---|---|
| `NODE_ENV` | API, Web | `development` / `production` | Không |
| `PORT` | API | Cổng lắng nghe (3001) | Không |
| `DATABASE_URL` | API | Chuỗi kết nối PostgreSQL | **Có** |
| `JWT_SECRET` | API | Khoá ký JWT | **Có** |
| `JWT_EXPIRES_IN` | API | Thời hạn access token | Không |
| `CORS_ORIGIN` | API | Domain Frontend được phép gọi | Không |
| `LOG_LEVEL` | API | Mức log | Không |
| `PAYMENT_GATEWAY_URL` | API | Địa chỉ cổng thanh toán (mock) | Không |
| `PAYMENT_MOCK_ENABLED` | API | Bật module mock thanh toán | Không |
| `PAYMENT_TIMEOUT_MS` | API | Thời gian chờ cổng thanh toán | Không |
| `NEXT_PUBLIC_API_URL` | Web | Địa chỉ API cho trình duyệt (nhúng lúc build) | Không |
| `API_INTERNAL_URL` | Web | Địa chỉ API cho SSR trong mạng nội bộ | Không |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Database | Khởi tạo PostgreSQL | **Có** (mật khẩu) |

| Môi trường | Nguồn giá trị |
|---|---|
| Local | File `.env` (sao chép từ `.env.example`), nạp qua `docker-compose.yml` |
| CI | Secret của GitHub Actions |
| Production | Secret/biến môi trường của nền tảng triển khai |

Biến `NEXT_PUBLIC_*` được nhúng vào bundle lúc build nên không bao giờ chứa secret.

### 4.4 Migration và seed

| Môi trường | Lệnh | Ghi chú |
|---|---|---|
| Local | `prisma migrate dev`, `prisma db seed` | Tạo và áp dụng migration, nạp dữ liệu mẫu |
| CI/CD, production | `prisma migrate deploy` | Chạy trước khi khởi động phiên bản mới; migration tương thích ngược để rollback ứng dụng không cần rollback schema |

---

## 5. Truy vết

| Thành phần | Mã nguồn | Liên quan |
|---|---|---|
| Frontend | `../../apps/web` | Ràng buộc C1, C15 trong `context-and-scope.md`; ADR-002 |
| Backend | `../../apps/api` | Ràng buộc C2, C14; ADR-003, 005, 006, 007, 009 |
| Database | `../../apps/api/prisma` (migration, seed), `../../docker-compose.yml` | Ràng buộc C3, C4; ADR-004 |
| Mock Payment Service | Module `mock-payment` trong `../../apps/api` | Stakeholder S6, giả định A7; ADR-008 |
| Logging, health, cấu hình | `../../apps/api/src/common`, `health`; `../../.env.example` | Ràng buộc C10; ADR-010 |

---

## 6. Cách chỉnh sửa và kết xuất sơ đồ

Sửa file `.puml`, kết xuất lại ra PNG rồi commit cả hai file cùng nhau:

```bash
docker run --rm -v "$(pwd)/docs/diagrams:/data" plantuml/plantuml -tpng /data/c4-context.puml /data/c4-container.puml
```

(PowerShell: thay `$(pwd)` bằng `${PWD}`.) Hoặc dùng extension **PlantUML** trong VS Code / WebStorm rồi chọn *Export Current Diagram* định dạng PNG.

---

## 7. Lịch sử thay đổi

| Phiên bản | Ngày | Nội dung / Lý do |
|---|---|---|
| 1.0 | 02/11/2026 | Khởi tạo C1 và C2 |
| 1.1 | 04/11/2026 | Chuyển sang định dạng PNG, đồng bộ thực thể cơ sở dữ liệu và cơ chế khóa lạc quan |
| 1.2 | 04/11/2026 | Thêm thuyết minh và trade-off (mục 3), quản trị hệ thống gồm logging, health, cấu hình (mục 4), liên kết ADR; sửa mô tả BrewLite System ở C1 |
