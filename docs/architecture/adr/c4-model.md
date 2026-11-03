# BrewLite – Mô hình kiến trúc C4 (Context và Container)

| Mục | Nội dung |
|---|---|
| Phương pháp | C4 Model: mức 1 (System Context) và mức 2 (Container) |
| Phiên bản | 1.1 |
| Nguồn sơ đồ (PlantUML) | [`../diagrams/c4-context.puml`](../diagrams/c4-context.puml), [`../diagrams/c4-container.puml`](../diagrams/c4-container.puml) |
| Ảnh kết xuất | `../diagrams/c4-context.png`, `../diagrams/c4-container.png` |
| Liên quan | `../requirements/context-and-scope.md`, `../traceability-matrix.md` |

---

## 1. C1 – System Context

Cho thấy BrewLite trong môi trường của nó: ai dùng hệ thống và hệ thống ngoài nào nó phụ thuộc vào.

![C1 – System Context](../diagrams/c4-context.png)

| Thành phần | Loại | Vai trò |
|---|---|---|
| **Customer** | Person | Khách hàng: xem menu, chọn size/topping, đặt đơn, thanh toán, theo dõi và xem lịch sử đơn (stakeholder S1). |
| **Admin** | Person | Nhân viên quầy hoặc quản lý (vai trò `ADMIN`): tiếp nhận đơn, cập nhật trạng thái chế biến, quản lý sản phẩm (S2, S3). |
| **BrewLite System** | Software System | Hệ thống bán cà phê trực tuyến: menu, giỏ hàng, đặt đơn với Khóa lạc quan, thanh toán an toàn lũy biến, tích điểm. |
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
| **Frontend** | Next.js (mobile-first, PWA) | `apps/web` | 3000 | Hiển thị giao diện menu, giỏ hàng, checkout, lịch sử và theo dõi đơn, màn hình Admin. Gọi Backend qua REST, không truy cập trực tiếp cơ sở dữ liệu. |
| **Backend** | NestJS REST API | `apps/api` | 3001 | Xác thực và phân quyền JWT, validate dữ liệu, xử lý nghiệp vụ (tạo đơn, trừ tồn kho bằng Khóa lạc quan qua trường version, thanh toán có Idempotency, Order State Machine), health check `GET /health`. Là thành phần duy nhất truy cập cơ sở dữ liệu. |
| **Database** | PostgreSQL 16 (Docker) | Migration và seed trong `apps/api` | 5432 | Lưu người dùng, sản phẩm, kích cỡ/topping, đơn hàng, thanh toán, mã giảm giá (Coupon), điểm tích lũy (Loyalty); schema quản lý qua Prisma migration. |

### 2.2 Giao thức giữa các khối

| Từ | Đến | Giao thức | Nội dung trao đổi |
|---|---|---|---|
| Customer / Admin | Frontend | HTTPS | Tải trang và tài nguyên PWA |
| Frontend | Backend | REST, JSON qua HTTPS, header `Authorization: Bearer <JWT>` | `GET /products`, `GET /products/:id`, đăng ký/đăng nhập, tạo đơn, thanh toán, lịch sử và trạng thái đơn |
| Backend | Database | Prisma Client qua TCP, cổng 5432 | Truy vấn và ghi dữ liệu; transaction khi tạo đơn và cập nhật tồn kho |
| Backend | Mock Payment Service | HTTPS, JSON, kèm Idempotency-Key | Yêu cầu thanh toán và kết quả thành công/thất bại |

Ghi chú:

- Cổng 3000, 3001, 5432 là cổng khi chạy local bằng `docker-compose.yml`. Ở production, người dùng chỉ truy cập qua HTTPS (443) và cơ sở dữ liệu không mở ra Internet.
- Frontend gọi Backend từ cả phía server (SSR) lẫn trình duyệt, nên Backend cần bật CORS cho domain của Frontend và địa chỉ API lấy từ biến môi trường.

---

## 3. Truy vết

| Thành phần | Mã nguồn | Liên quan |
|---|---|---|
| Frontend | `apps/web` | Ràng buộc C1, C15 trong `context-and-scope.md` |
| Backend | `apps/api` | Ràng buộc C2, C14 |
| Database | `apps/api` (migration, seed), `docker-compose.yml` | Ràng buộc C3, C4 |
| Mock Payment Service | Mô phỏng (sẽ có ADR riêng) | Stakeholder S6, giả định A7 |

---

## 4. Cách chỉnh sửa và kết xuất sơ đồ

Sửa file `.puml`, kết xuất lại ra PNG rồi commit cả hai file cùng nhau:

```bash
docker run --rm -v "$(pwd)/docs/diagrams:/data" plantuml/plantuml -tpng /data/c4-context.puml /data/c4-container.puml
```

(PowerShell: thay `$(pwd)` bằng `${PWD}`.) Hoặc dùng extension **PlantUML** trong VS Code / WebStorm rồi chọn *Export Current Diagram* định dạng PNG.

---

## 5. Lịch sử thay đổi

| Phiên bản | Ngày | Nội dung / Lý do |
|---|---|---|
| 1.0 | 02/11/2026 | Khởi tạo C1 và C2 |
| 1.1 | 04/11/2026 | Chuyển sang định dạng PNG, đồng bộ thực thể cơ sở dữ liệu và cơ chế Khóa lạc quan |