# ☕ BrewLite - Cashless Coffee Ordering System

> Hệ thống đặt và thanh toán cà phê không dùng tiền mặt (Cashless Ordering) với kiến trúc Mobile-First, tích hợp các cơ chế chịu lỗi hệ thống (Robustness), khóa lạc quan (Optimistic Locking) và bảo đảm tính toàn vẹn dữ liệu (Data Integrity).

---

## 1. Giới thiệu tổng quan (Project Overview)

**BrewLite** là giải pháp phần mềm toàn diện hỗ trợ chuỗi cửa hàng cà phê hiện đại vận hành quy trình bán hàng khép kín không tiền mặt. Hệ thống giải quyết các bài toán quan trọng trong thương mại điện tử và dịch vụ F&B:
- **Trải nghiệm khách hàng mượt mà:** Xem thực đơn theo danh mục, tùy biến size/topping, áp dụng mã voucher giảm giá, tích lũy điểm thành viên BrewLite Beans.
- **Thanh toán linh hoạt:** Tích hợp giả lập cổng thanh toán không tiền mặt đa dạng (VietQR động, MoMo, ZaloPay, Thẻ ngân hàng nội địa/quốc tế).
- **Độ tin cậy & Chịu tải cao:** Đảm bảo không xảy ra hiện tượng bán vượt tồn kho (Overselling) khi nhiều khách đặt cùng một ly nước cuối cùng, chống trừ tiền hai lần (Double Spending) và tự động hoàn trả kho/voucher khi giao dịch bị bỏ quên.

---

## 2. Công nghệ cốt lõi (Tech Stack)

### Backend (`apps/api`)
- **Framework:** [NestJS](https://nestjs.com/) (Node.js LTS)
- **Cơ sở dữ liệu & ORM:** [PostgreSQL 16](https://www.postgresql.org/) kết hợp [Prisma ORM 5.x](https://www.prisma.io/)
- **Xác thực & Bảo mật:** Passport JWT, Bcrypt, Class-Validator, ValidationPipe (whitelist)
- **Tác vụ nền:** `@nestjs/schedule` (Cron jobs quét đơn tồn)
- **Tài liệu API:** Swagger / OpenAPI 3.0
- **Kiểm thử tự động:** Jest Runner (Unit Test, Concurrency Simulation)

### Frontend (`apps/web`)
- **Framework:** [Next.js](https://nextjs.org/) (App Router, Turbopack, React Server Components & Client Components)
- **Ngôn ngữ:** TypeScript
- **Giao diện & Styling:** Tailwind CSS, Radix UI / shadcn/ui
- **Icons & Thông báo:** Lucide Icons, Sonner Toast
- **Cơ chế cập nhật:** Real-time polling timeline đơn hàng, chuông thông báo thông minh

### DevOps & Triển khai
- **Docker & Docker Compose:** Đóng gói độc lập 3 container (`postgres`, `api`, `web`)
- **Data Persistence:** Docker Named Volumes cho cơ sở dữ liệu và thư mục tải lên hình ảnh

---

## 3. Các cơ chế chịu lỗi & Toàn vẹn dữ liệu (Core Robustness Criteria)

Dự án BrewLite được thiết kế để vượt qua các tiêu chí kỹ thuật khắt khe về độ tin cậy của hệ thống giao dịch phân tán:

### 3.1. Máy trạng thái đơn hàng (Order State Machine Transition Guard)
Quy trình chuyển đổi trạng thái đơn hàng được bảo vệ bằng bảng chuyển dịch nghiêm ngặt (`allowedTransitions`):
```text
[PENDING] ────┬───> [PAID] ───> [PREPARING] ───> [READY] ───> [COMPLETED]
              │       ▲
              ├───> [PAYMENT_FAILED] ───┘ (Thanh toán lại)
              │       │
              ▼       ▼
          [CANCELLED] (Hoàn tồn kho, hoàn voucher, thu hồi điểm)
```
- **Chặn nhảy cóc phi logic:** Chặn chuyển từ `PENDING` trực tiếp sang `COMPLETED` hoặc `READY`.
- **Bảo vệ đơn hoàn tất:** Một khi đơn đã `COMPLETED` hoặc `CANCELLED`, hệ thống nghiêm cấm chuyển ngược về `PENDING` hoặc `PAID`.
- **Hỗ trợ thanh toán lại (Repay):** Cho phép đơn từ `PAYMENT_FAILED` chuyển sang `PAID` khi khách hàng thanh toán thành công hoặc sang `CANCELLED` khi hết thời gian chờ.

### 3.2. Chống tạo trùng lặp giao dịch (Dual-Layer Idempotency Key)
- Mỗi yêu cầu thanh toán bắt buộc mang theo một `Idempotency-Key` (chuẩn UUID v4).
- **Tầng 1 (Pre-check):** Kiểm tra sự tồn tại của key trong cơ sở dữ liệu. Nếu key đã được xử lý thành công, API trả ngay kết quả giao dịch trước đó kèm cờ `isDuplicate: true` mà không tạo giao dịch mới, không trừ ví và không cộng trùng điểm Beans.
- **Tầng 2 (Database Constraint):** Ràng buộc `@unique` trên trường `idempotencyKey` trong bảng `Payment` ở cấp độ PostgreSQL, bọc bắt mã lỗi `P2002` để xử lý xung đột trong tích tắc.
- **Tầng giao diện (UI Lock):** Nút thanh toán tự khóa (`disabled`) và hiển thị trạng thái đang xử lý để ngăn người dùng nhấp đúp (double click) do đường truyền mạng lag.

### 3.3. Khóa lạc quan chống bán vượt tồn kho (Optimistic Locking & Overselling Prevention)
- Mỗi sản phẩm trong bảng `Product` được quản lý bởi trường số hiệu phiên bản `version: Int`.
- Khi trừ tồn kho, câu lệnh thực thi có điều kiện đồng thời:
  ```typescript
  prisma.product.updateMany({
    where: {
      id: productId,
      version: currentVersion,      // Khóa lạc quan
      stock: { gte: orderQuantity }  // Điều kiện nguyên tử tồn kho
    },
    data: {
      stock: { decrement: orderQuantity },
      version: { increment: 1 }
    }
  });
  ```
- Nếu 2 hoặc nhiều người cùng đặt món nước cuối cùng tại cùng một thời điểm: chỉ duy nhất 1 request đầu tiên cập nhật thành công (`count: 1`), các request còn lại sẽ nhận `count: 0` và bị ngắt ngay lập tức với lỗi `ConflictException (409)`.

### 3.4. Tự động dọn dẹp & Hoàn hủy tự động (Cron Scheduler & Rollback)
- Một tiến trình ngầm chạy định kỳ mỗi phút (`@Cron(CronExpression.EVERY_MINUTE)`).
- Tự động hủy (`CANCELLED`) các đơn hàng ở trạng thái `PENDING` hoặc `PAYMENT_FAILED` bị bỏ quên quá 15 phút.
- **Cơ chế hoàn trả tài nguyên (Safe Rollback):**
  - Tăng lại số lượng tồn kho nguyên vẹn (`stock: { increment: quantity }`).
  - Tăng `version` của sản phẩm để đồng bộ nhất quán.
  - Hoàn lại lượt sử dụng mã giảm giá (`usedCount: { decrement: 1 }`).
  - Gửi thông báo đến tài khoản khách hàng về việc đơn đã quá hạn thanh toán.

---

## 4. Bộ kiểm thử tự động (Automated Test Suites - 18/18 Tests)

Hệ thống đi kèm trọn bộ 18 kịch bản unit test chứng minh tính toàn vẹn nghiệp vụ:

| Tệp kiểm thử | Tiêu chí đánh giá | Số lượng test case | Trạng thái |
| :--- | :--- | :---: | :---: |
| `orders-state-machine.spec.ts` | **(a) Order State Machine Guard:** Chặn 7 trường hợp đổi trạng thái sai; duyệt 8 bước chuyển trạng thái hợp lệ | 15 tests | **PASSED** |
| `payments-idempotency.spec.ts` | **(b) Idempotency Key:** Kiểm thử gọi 2 lần cùng key chỉ tạo 1 giao dịch, không nhân đôi đơn/điểm | 2 tests | **PASSED** |
| `orders-concurrency.spec.ts` | **(c) Concurrency Control:** 3 request tranh chấp 1 ly nước tồn kho, chỉ 1 đơn thành công, 2 đơn báo lỗi 409 | 1 test | **PASSED** |

### Lệnh chạy kiểm thử:
Tại thư mục `apps/api`:
```powershell
npm run test:robustness
```
*Hoặc qua Docker:*
```powershell
docker compose exec api npm run test:robustness
```

---

## 5. Cấu trúc thư mục (Project Structure)

```text
brewlite1/
├── apps/
│   ├── api/                            # Backend NestJS
│   │   ├── prisma/
│   │   │   ├── schema.prisma           # Cấu trúc CSDL PostgreSQL
│   │   │   └── seed.ts                 # Dữ liệu mẫu khởi tạo
│   │   ├── src/
│   │   │   ├── auth/                   # Đăng ký, Đăng nhập, JWT Strategy
│   │   │   ├── orders/                 # Nghiệp vụ đơn hàng, State Machine, Concurrency
│   │   │   │   ├── orders-concurrency.spec.ts
│   │   │   │   ├── orders-state-machine.spec.ts
│   │   │   │   └── orders.service.ts
│   │   │   ├── payments/               # Thanh toán, Idempotency, Quản lý giao dịch
│   │   │   │   ├── payments-idempotency.spec.ts
│   │   │   │   └── payments.service.ts
│   │   │   ├── coupons/                # Quản lý mã giảm giá
│   │   │   ├── products/               # Quản lý đồ uống, danh mục, topping
│   │   │   └── notifications/          # Chuông thông báo & cảnh báo
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── web/                            # Frontend Next.js (App Router)
│       ├── src/
│       │   ├── app/
│       │   │   ├── shop/
│       │   │   │   ├── checkout/       # Màn hình thanh toán & popup VietQR
│       │   │   │   │   ├── fail/       # Màn hình chuyên biệt khi thanh toán thất bại
│       │   │   │   │   ├── success/    # Màn hình khi thanh toán thành công
│       │   │   │   │   └── page.tsx
│       │   │   │   ├── orders/         # Lịch sử đơn hàng, timeline, nút thanh toán lại
│       │   │   │   ├── cart/           # Giỏ hàng
│       │   │   │   └── profile/        # Thẻ thành viên BrewLite & điểm Beans
│       │   │   └── login/              # Đăng nhập & Đăng ký
│       │   ├── components/             # UI components, timeline, modal
│       │   └── contexts/               # AuthContext, CartContext
│       ├── Dockerfile
│       └── package.json
│
├── docker-compose.yml                  # Điều phối container (Postgres, API, Web)
├── .env.example                        # Mẫu cấu hình môi trường
└── README.md
```

---

## 6. Hướng dẫn cài đặt & Khởi chạy hệ thống

### Cách 1: Khởi chạy bằng Docker Compose

Phương pháp này đóng gói sẵn môi trường, không lo lỗi sai phiên bản Node hay xung đột thư viện.

#### 1. Chuẩn bị tệp cấu hình môi trường
Sao chép `.env.example` thành `.env` ở thư mục gốc:
```powershell
cp .env.example .env
```

#### 2. Xây dựng và khởi chạy toàn bộ dịch vụ
```powershell
docker compose up -d --build
```

#### 3. Tạo cấu trúc bảng và nạp dữ liệu mẫu
Khi các container đã ở trạng thái chạy (`running`), chạy lệnh sau để khởi tạo cơ sở dữ liệu:
```powershell
# Tạo bảng dữ liệu
docker compose exec api npx prisma migrate deploy

# Nạp dữ liệu mẫu (Sản phẩm, Topping, Voucher, Tài khoản Admin)
docker compose exec api npx prisma db seed
```

#### 4. Các lệnh theo dõi thường dùng
- Xem log toàn hệ thống: `docker compose logs -f`
- Xem log riêng backend: `docker compose logs -f api`
- Dừng hệ thống (giữ nguyên dữ liệu): `docker compose down`
- Dừng và xóa toàn bộ dữ liệu để cài lại từ đầu: `docker compose down -v`

---

### Cách 2: Chạy trực tiếp trên máy cục bộ (Dành cho Lập trình viên)

Yêu cầu máy đã cài **Node.js >= 20.x** và cơ sở dữ liệu **PostgreSQL 16**.

#### 1. Khởi động PostgreSQL (qua Docker)
```powershell
docker compose up -d postgres
```

#### 2. Khởi chạy Backend (`apps/api`)
```powershell
cd apps/api
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
```
*API sẽ chạy tại: `http://localhost:3001`*

#### 3. Khởi chạy Frontend (`apps/web`)
Mở một cửa sổ Terminal mới:
```powershell
cd apps/web
npm install --legacy-peer-deps
npm run dev
```
*Giao diện Web sẽ chạy tại: `http://localhost:3000`*

---

## 7. Danh mục Endpoints & Màn hình hệ thống

| Tên màn hình / Dịch vụ | Địa chỉ URL | Chức năng chính |
| :--- | :--- | :--- |
| **Trang chủ / Thực đơn** | `http://localhost:3000/shop` | Chọn thức uống, chọn size, thêm topping, xem giỏ hàng |
| **Đăng nhập / Đăng ký** | `http://localhost:3000/login` | Xác thực người dùng, cấp Token JWT |
| **Màn hình Thanh toán** | `http://localhost:3000/shop/checkout` | Áp dụng voucher, chọn phương thức, quét VietQR |
| **Màn hình Đặt thành công** | `http://localhost:3000/shop/checkout/success` | Thông báo thanh toán thành công, hiển thị điểm tích lũy |
| **Màn hình Đặt thất bại** | `http://localhost:3000/shop/checkout/fail` | Thông báo lỗi cổng thanh toán, nút điều hướng thử lại |
| **Lịch sử & Tiến trình đơn** | `http://localhost:3000/shop/orders` | Theo dõi timeline 5 bước, hỗ trợ thanh toán lại |
| **Thẻ thành viên / Profile** | `http://localhost:3000/shop/profile` | Xem điểm Beans, hạng thành viên, lịch sử ưu đãi |
| **Swagger API Documentation**| `http://localhost:3001/api/docs` | Danh sách toàn bộ REST API và schema DTO |
| **Health Check API** | `http://localhost:3001/api/health` | Kiểm tra tình trạng hoạt động của backend |

---

## 8. Tài khoản kiểm thử mặc định (Seed Credentials)

Hệ thống đã nạp sẵn dữ liệu kiểm thử phục vụ việc chấm điểm:

| Loại tài khoản | Email đăng nhập | Mật khẩu | Quyền hạn |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@brewlite.com` | `Admin@2026` | Quản lý sản phẩm, đơn hàng, duyệt trạng thái |
| **Khách hàng mẫu (Customer)**| `customer@brewlite.com` | `Customer@2026` | Đặt hàng, thanh toán, tích điểm thành viên |

*(Bạn cũng có thể tự đăng ký một tài khoản mới bất kỳ ngay trên trang `/login`)*.

---

## 9. Kịch bản kiểm thử & Trình diễn thực tế (Demo Script)
1. **Kịch bản 1: Luồng thanh toán chuẩn (Happy Path)**
  - Đăng nhập tài khoản khách hàng -> Chọn món nước và chọn thêm topping trân châu -> Bấm thanh toán.
  - Chọn mã giảm giá -> Bấm thanh toán bằng VietQR -> Bấm **"Xác nhận đã chuyển khoản (Demo)"**.
  - Màn hình chuyển sang `/shop/checkout/success`, thông báo nhận điểm Beans -> Bấm theo dõi đơn hàng để thấy timeline chuyển sang **PAID**.

2. **Kịch bản 2: Luồng xử lý sự cố & Thanh toán lại (Robustness Flow)**
  - Tạo một đơn hàng mới -> Tại modal thanh toán, bấm **"Giả lập thanh toán thất bại (Demo)"**.
  - Hệ thống chuyển ngay sang màn hình đỏ `/shop/checkout/fail` -> Bấm nút **"Thanh toán lại ngay"**.
  - Màn hình điều hướng đến `/shop/orders`, thẻ đơn hiển thị trạng thái đỏ `PAYMENT_FAILED` cùng nút **"Thanh toán lại"**.
  - Bấm "Thanh toán lại", mã VietQR thật hiện ra -> Bấm xác nhận chuyển khoản -> Đơn hàng đổi sang `PAID` thành công.

3. **Kịch bản 3: Kiểm chứng kỹ thuật bằng Unit Test (Automated Verification)**
  - Mở Terminal chạy `npm run test:robustness`.
  - Xem 18 test case passed màu xanh lá để chứng minh tính đúng đắn của State Machine, Idempotency và Concurrency Control.
