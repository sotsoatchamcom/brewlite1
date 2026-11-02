# BrewLite – Bối cảnh, Stakeholder và Phạm vi

| Mục | Nội dung |
|---|---|
| Tài liệu | Task 1.1 – Bối cảnh, stakeholder và phạm vi |
| Dự án | BrewLite – Assignment 2 (Requirements to Deployment) |
| Phiên bản | 1.0 |
| Trạng thái | Draft – chờ review qua pull request |
| Liên quan | `srs.md` (Task 1.2), `usecase-checkout.md` (Task 1.3), `../traceability-matrix.md` |

---

## 1. Bối cảnh nghiệp vụ

### 1.1 Lĩnh vực và vấn đề

BrewLite hướng tới một cửa hàng đồ uống (cà phê, trà, trà sữa, nước ép) quy mô nhỏ đến vừa. Quy trình bán hàng truyền thống tại các cửa hàng này thường gặp các vấn đề sau:

| # | Vấn đề hiện tại | Hệ quả |
|---|---|---|
| P1 | Khách phải xếp hàng tại quầy để xem menu và gọi món, đặc biệt vào giờ cao điểm | Thời gian chờ dài, khách bỏ đi, mất doanh thu |
| P2 | Gọi món bằng lời dễ nhầm size, topping, mức đường/đá | Làm sai đơn, phải làm lại, lãng phí nguyên liệu |
| P3 | Menu giấy/bảng cố định, khó cập nhật giá và tình trạng còn/hết hàng | Khách gọi món đã hết, nhân viên phải xin lỗi và đổi món |
| P4 | Không có theo dõi trạng thái đơn, khách không biết khi nào món xong | Khách đứng chờ tại quầy, quầy đông và lộn xộn |
| P5 | Tồn kho, khuyến mãi và lịch sử đơn được ghi thủ công | Sai lệch số liệu, khó đối soát, khó chăm sóc khách quen |

### 1.2 Giải pháp đề xuất

BrewLite là ứng dụng web **mobile-first/PWA** cho phép khách hàng tự xem menu, chọn size/topping, đặt đơn, thanh toán (mô phỏng) và theo dõi trạng thái đơn trên điện thoại. Phía cửa hàng có giao diện quản trị để tiếp nhận đơn và cập nhật trạng thái chế biến.

Luồng nghiệp vụ tối thiểu:

```
Xem menu → Chọn tùy chọn → Giỏ hàng → Đặt đơn → Thanh toán → Theo dõi đơn
```

Vòng đời trạng thái đơn hàng (khớp với mô hình dữ liệu):

```
PENDING → PAID → PREPARING → READY → COMPLETED
   │
   ├──→ PAYMENT_FAILED  (thanh toán thất bại, cho phép thử lại)
   └──→ CANCELLED       (đơn bị huỷ)
```

### 1.3 Mục tiêu hệ thống

| Mã | Mục tiêu | Cách đo |
|---|---|---|
| G1 | Khách hoàn tất một đơn hàng từ menu đến xác nhận hoàn toàn trên điện thoại | Có E2E test cho luồng menu → xác nhận đơn |
| G2 | Giảm sai sót khi gọi món nhờ lựa chọn size/topping có cấu trúc | Đơn hàng lưu snapshot tên, giá, size, topping tại thời điểm đặt |
| G3 | Không bán quá số lượng tồn kho, không trừ tiền hai lần | Có test cho tạo đơn đồng thời và thanh toán lặp (idempotency) |
| G4 | Khách và nhân viên cùng nhìn thấy trạng thái đơn mới nhất | Trạng thái đơn hiển thị đúng ở lịch sử đơn của khách và màn hình quản lý |
| G5 | Hệ thống triển khai được, truy cập qua HTTPS và kiểm tra được sức khỏe | URL production, `GET /health`, pipeline CI/CD chạy thành công |

---

## 2. Stakeholder

| # | Stakeholder | Vai trò / Mối quan hệ với hệ thống | Mục tiêu | Kỳ vọng |
|---|---|---|---|---|
| S1 | **Khách hàng** | Người dùng cuối, đặt và thanh toán đồ uống qua điện thoại | Gọi món nhanh, không phải xếp hàng; biết đơn của mình đang ở bước nào; tích điểm và dùng mã giảm giá | Giao diện đơn giản, dùng một tay, tải nhanh trên mạng di động; thông tin giá rõ ràng trước khi thanh toán; thanh toán lỗi không bị trừ tiền hai lần; xem lại được lịch sử đơn |
| S2 | **Nhân viên quầy** | Tiếp nhận đơn đã thanh toán, pha chế, cập nhật trạng thái | Nhận đơn chính xác và đúng thứ tự; giảm hỏi lại khách; xử lý đơn nhanh trong giờ cao điểm | Danh sách đơn cập nhật kịp thời; thấy rõ size, topping, số lượng của từng món; đổi trạng thái đơn bằng ít thao tác |
| S3 | **Quản lý cửa hàng** | Chủ/quản lý vận hành, chịu trách nhiệm menu, giá, tồn kho, doanh thu | Tăng doanh thu và tỉ lệ khách quay lại; kiểm soát tồn kho, giá và khuyến mãi; giảm sai sót vận hành | Quản lý được sản phẩm, giá, tồn kho; cảnh báo sắp hết/hết hàng; cấu hình mã giảm giá; dữ liệu đơn hàng đáng tin cậy để đối soát |
| S4 | **Giảng viên / khách hàng nghiệm thu** | Người đánh giá sản phẩm và quy trình thực hiện của nhóm | Kiểm chứng nhóm làm đúng quy trình từ yêu cầu đến triển khai và sản phẩm chạy được | Tài liệu đầy đủ, truy vết được từ yêu cầu đến code và test; lịch sử commit/PR rõ ràng; URL production hoạt động; clone và chạy được theo README |
| S5 | **Nhóm phát triển** | Phân tích, thiết kế, lập trình, kiểm thử, triển khai | Hoàn thành đúng hạn, đạt chất lượng, học và áp dụng quy trình CI/CD | Yêu cầu rõ ràng và ổn định trong phạm vi MVP; phạm vi vừa sức; công cụ và hạ tầng miễn phí hoặc chi phí thấp; có tiêu chí chấp nhận để viết test |
| S6 | **Đơn vị thanh toán** (mô phỏng Ví/Thẻ) | Dịch vụ xử lý giao dịch; trong MVP là Payment Service giả lập | Nhận yêu cầu thanh toán hợp lệ, trả kết quả thành công/thất bại rõ ràng | Yêu cầu có mã idempotency để chống trùng; số tiền và phương thức hợp lệ; kết quả trả về nhất quán để hệ thống cập nhật trạng thái đơn |

**Ma trận ảnh hưởng – quan tâm (tóm tắt)**

| Mức quan tâm \ Ảnh hưởng | Cao | Thấp |
|---|---|---|
| **Cao** | S1 Khách hàng, S3 Quản lý, S4 Giảng viên, S5 Nhóm phát triển | S2 Nhân viên quầy |
| **Thấp** | S6 Đơn vị thanh toán (vì là dịch vụ mô phỏng trong MVP) | — |

---

## 3. Phạm vi

### 3.1 Trong phạm vi MVP (In-scope)

| Nhóm | Chức năng | Ưu tiên |
|---|---|---|
| Menu | Xem danh sách sản phẩm theo danh mục (`GET /products`) với trạng thái loading, empty, error | Must |
| Chi tiết sản phẩm | Xem chi tiết (`GET /products/:id`), chọn size (có phụ thu) và topping | Must |
| Giỏ hàng | Thêm/sửa/xoá món, đổi số lượng, tính tổng tiền | Must |
| Xác thực | Đăng ký, đăng nhập, phân quyền `CUSTOMER`/`ADMIN` bằng JWT | Must |
| Đặt đơn | Tạo đơn trong một transaction, lưu snapshot giá/size/topping, kiểm tra và trừ tồn kho | Must |
| Thanh toán | Thanh toán Ví/Thẻ mô phỏng, xử lý thành công/thất bại, thử lại thanh toán, chống trùng bằng idempotency key | Must |
| Theo dõi đơn | Xem trạng thái đơn và lịch sử đơn của khách | Must |
| Quản lý đơn | Admin/nhân viên xem đơn và cập nhật trạng thái `PAID → PREPARING → READY → COMPLETED` | Must |
| Validate & lỗi | Validate dữ liệu ở cả frontend và backend; thông báo lỗi rõ ràng | Must |
| Vận hành | `GET /health`, migration/seed tái tạo được, `docker-compose.yml` chạy web + API + DB | Must |
| CI/CD | Pipeline Install → Lint → Test → Build; build image, push registry, deploy, smoke test | Must |

### 3.2 Phạm vi mở rộng (làm nếu còn thời gian, đã có chỗ trong mô hình dữ liệu)

| Chức năng | Ưu tiên | Ghi chú |
|---|---|---|
| Mã giảm giá (Coupon): theo phần trăm hoặc số tiền cố định, giá trị đơn tối thiểu, giới hạn lượt dùng, thời hạn | Should | Đơn lưu `discountCode`, `discountAmount`, `finalAmount` |
| Tích điểm khách hàng (Loyalty Points) | Should | Lưu `loyaltyPointsEarned` trên đơn |
| Thông báo cho Admin/Khách (đơn mới, đổi trạng thái, thanh toán thất bại, đơn huỷ) | Could | Thông báo trong ứng dụng, không gửi email/SMS |
| Cảnh báo sắp hết hàng/hết hàng cho Admin | Could | Dựa trên `stock` của sản phẩm |
| Admin quản lý sản phẩm, size, topping, danh mục (CRUD) | Should | Nếu chưa kịp, dùng dữ liệu seed |
| Khả năng cài đặt PWA (manifest, icon, offline cơ bản cho menu) | Could | Ưu tiên giao diện mobile-first trước |
| Huỷ đơn bởi khách khi đơn chưa vào chế biến | Could | Trạng thái `CANCELLED` |

### 3.3 Ngoài phạm vi (Out-of-scope / Won't)

| # | Nội dung không thực hiện | Lý do |
|---|---|---|
| O1 | Tích hợp cổng thanh toán thật (VNPay, MoMo, ZaloPay, Stripe…) | Đề bài chỉ yêu cầu thanh toán mô phỏng; tránh rủi ro bảo mật và pháp lý |
| O2 | Lưu số thẻ thật hoặc dữ liệu thẻ nhạy cảm | Không cần cho mô phỏng; không đáp ứng yêu cầu tuân thủ thanh toán |
| O3 | Giao hàng tận nơi, theo dõi shipper, tính phí vận chuyển | Chỉ phục vụ nhận món tại cửa hàng |
| O4 | Hệ thống nhiều chi nhánh, nhiều cửa hàng | Vượt quá quy mô MVP |
| O5 | Tích hợp máy POS, máy in hoá đơn/tem ly | Cần phần cứng |
| O6 | Ứng dụng native iOS/Android | Đã chọn PWA bằng Next.js |
| O7 | Đăng nhập bằng mạng xã hội, quên mật khẩu qua email/SMS, xác thực hai lớp | Không thuộc luồng cốt lõi |
| O8 | Hoàn tiền tự động và đối soát với ngân hàng | Thanh toán chỉ mô phỏng |
| O9 | Báo cáo doanh thu, thống kê nâng cao, dashboard phân tích | Không thuộc luồng end-to-end tối thiểu |
| O10 | Đa ngôn ngữ, đa tiền tệ | Chỉ dùng tiếng Việt và VNĐ |
| O11 | Đặt hẹn giờ lấy món, đặt bàn, gọi món theo bàn (QR tại bàn) | Có thể xem xét ở giai đoạn sau |
| O12 | Quản lý nhân sự, ca làm, lương, công thức pha chế và nguyên liệu chi tiết | Không phải trọng tâm của hệ thống đặt đơn |

---

## 4. Giả định

| Mã | Giả định | Ảnh hưởng nếu sai |
|---|---|---|
| A1 | Cửa hàng có một điểm bán duy nhất; khách nhận món trực tiếp tại quầy | Phải bổ sung chi nhánh/giao hàng, mở rộng mô hình dữ liệu |
| A2 | Khách hàng có điện thoại và kết nối Internet, dùng trình duyệt hiện đại (Chrome, Safari bản mới) | Cần hỗ trợ trình duyệt cũ hoặc chế độ offline |
| A3 | Khách phải đăng nhập mới được đặt đơn; xem menu thì không cần đăng nhập | Phải thiết kế luồng đặt đơn cho khách vãng lai |
| A4 | Tiền tệ là VNĐ, lưu bằng số nguyên, không có số lẻ | Phải đổi kiểu dữ liệu và cách làm tròn |
| A5 | Một đơn hàng thanh toán một lần; nếu thất bại, khách được thử lại trên cùng đơn (nhiều bản ghi `Payment` cho một đơn) | Phải thiết kế lại luồng thanh toán |
| A6 | Tồn kho được trừ khi tạo đơn thành công, trong cùng transaction | Quy tắc hoàn kho khi huỷ đơn hoặc thanh toán thất bại phải được làm rõ trong SRS |
| A7 | Dịch vụ thanh toán mô phỏng luôn phản hồi trong thời gian ngắn và có thể giả lập cả thành công lẫn thất bại | Cần thêm cơ chế timeout và xử lý giao dịch treo |
| A8 | Nhân viên và quản lý dùng chung vai trò `ADMIN` trong MVP | Phải bổ sung vai trò riêng (ví dụ `STAFF`) và phân quyền chi tiết |
| A9 | Giá, size, topping được quản lý bởi cửa hàng; đơn hàng luôn lưu snapshot nên thay đổi giá về sau không ảnh hưởng đơn cũ | Lịch sử đơn sẽ sai nếu tham chiếu trực tiếp đến giá hiện tại |
| A10 | Dữ liệu mẫu (seed) đủ đại diện để kiểm thử và demo | Phải bổ sung dữ liệu để kiểm thử các trường hợp biên |

---

## 5. Ràng buộc

### 5.1 Ràng buộc công nghệ (bắt buộc theo đề bài)

| Mã | Ràng buộc |
|---|---|
| C1 | Frontend dùng **Next.js**, hướng mobile-first/PWA |
| C2 | Backend dùng **NestJS**, tổ chức theo module/domain |
| C3 | Cơ sở dữ liệu dùng **PostgreSQL**, có cơ chế migration và seed để tái tạo |
| C4 | Đóng gói và chạy bằng **Docker**; `docker-compose.yml` chạy được web, API và database ở local |
| C5 | Được bổ sung công nghệ khác (ORM, thư viện kiểm thử…) nhưng **không thay thế** ba thành phần Next.js, NestJS, PostgreSQL |

### 5.2 Ràng buộc quy trình và bàn giao

| Mã | Ràng buộc |
|---|---|
| C6 | Năm task thực hiện tuần tự; tạo phẩm của task trước phải có trên repository trước khi nghiệm thu task sau |
| C7 | Toàn bộ tài liệu nằm trong `docs/`; mọi thay đổi yêu cầu, sơ đồ, kiến trúc đi qua commit/pull request và ghi rõ lý do |
| C8 | Pull request chỉ được merge khi lint, test và build đều thành công |
| C9 | Hệ thống phải có URL production truy cập qua HTTPS tại thời điểm chấm; nếu không, phần triển khai không được tính |
| C10 | Secret không được xuất hiện trong repository hoặc log CI; database production không public trực tiếp |
| C11 | Người ngoài nhóm clone repository và chạy theo README phải truy cập được hệ thống |

### 5.3 Ràng buộc nguồn lực và kỹ thuật

| Mã | Ràng buộc |
|---|---|
| C12 | Hai sprint trong một học kỳ, nhóm sinh viên; nguồn lực và thời gian có hạn nên phải ưu tiên theo MoSCoW |
| C13 | Chi phí hạ tầng thấp hoặc miễn phí (gói free của Render, Railway, Fly.io hoặc tương đương); hiệu năng và dung lượng bị giới hạn theo gói |
| C14 | Dữ liệu tiền, tồn kho phải nhất quán: tạo đơn và trừ kho trong một transaction, thanh toán có idempotency key, sản phẩm có khóa lạc quan (`version`) để tránh bán vượt tồn kho khi đặt đồng thời |
| C15 | Giao diện thiết kế cho màn hình điện thoại trước, sau đó mới mở rộng cho màn hình lớn |

---

## 6. Rủi ro ban đầu

| Mã | Rủi ro | Xác suất | Tác động | Biện pháp giảm thiểu |
|---|---|---|---|---|
| R1 | Phạm vi phình to (coupon, điểm thưởng, thông báo…) làm không kịp luồng cốt lõi | Cao | Cao | Chốt MVP theo MoSCoW; chỉ làm mục 3.2 sau khi luồng end-to-end chạy ổn |
| R2 | Race condition khi nhiều khách đặt cùng món sắp hết hàng, dẫn đến bán vượt tồn kho | Trung bình | Cao | Transaction, khóa lạc quan theo `version`, integration test cho đặt đơn đồng thời |
| R3 | Thanh toán bị gửi lặp do mạng chậm hoặc người dùng bấm nhiều lần | Cao | Cao | Idempotency key duy nhất cho mỗi lần thanh toán; test gửi lại cùng một yêu cầu |
| R4 | Triển khai production thất bại hoặc nền tảng miễn phí giới hạn tài nguyên, ngủ đông | Trung bình | Cao | Chọn nền tảng sớm, triển khai thử từ Sprint 1; smoke test và hướng dẫn rollback |
| R5 | Lộ secret (JWT secret, mật khẩu DB) trong repository hoặc log CI | Thấp | Cao | `.env.example` không chứa giá trị thật; dùng secret của CI/nền tảng; rà soát trước khi merge |
| R6 | Yêu cầu, sơ đồ và mô hình dữ liệu mâu thuẫn nhau vì làm tuần tự | Trung bình | Trung bình | Duy trì ma trận truy vết; review chéo khi có thay đổi; mọi thay đổi qua pull request |
| R7 | Thiếu thời gian cho kiểm thử, đặc biệt integration và E2E | Cao | Trung bình | Viết test song song với tính năng; xác định sớm kịch bản E2E tối thiểu |
| R8 | Hiểu sai yêu cầu của stakeholder (ví dụ nhân viên cần thông tin gì khi pha chế) | Trung bình | Trung bình | Xác nhận yêu cầu qua use-case và tiêu chí chấp nhận; demo sớm cho giảng viên ở cuối Sprint 1 |
| R9 | Thành viên nhóm chưa quen công nghệ (NestJS, Docker, CI/CD) | Trung bình | Trung bình | Phân công theo thế mạnh, làm việc cặp, ghi lại hướng dẫn trong README |
| R10 | Lệch môi trường giữa local, CI và production (phiên bản Node, PostgreSQL) | Trung bình | Trung bình | Cố định phiên bản trong Dockerfile và CI; dùng cùng migration cho mọi môi trường |

---

## 7. Liên kết với các tạo phẩm khác

| Nội dung | Tài liệu |
|---|---|
| Yêu cầu chức năng, phi chức năng, MoSCoW, tiêu chí chấp nhận | `docs/requirements/srs.md` (Task 1.2) |
| Đặc tả use-case "Đặt và thanh toán đơn hàng" | `docs/requirements/usecase-checkout.md` (Task 1.3) |
| Sơ đồ activity, sequence, class | `docs/diagrams/` (Task 2) |
| Kiến trúc và ADR | `docs/architecture/` (Task 3) |
| Truy vết | `docs/traceability-matrix.md` |

---

## 8. Lịch sử thay đổi

| Phiên bản | Ngày | Người thực hiện | Nội dung / Lý do |
|---|---|---|---|
| 1.0 | 02/11/2026 | Nhóm BrewLite | Khởi tạo tài liệu bối cảnh và phạm vi |
