# ADR-001: Dùng monorepo cho web, API, tài liệu và test

| Trạng thái | Accepted |
|---|---|
| Ngày | 04/11/2026 |

## Bối cảnh

BrewLite gồm hai ứng dụng (Next.js và NestJS), tài liệu Task 1–3, bộ test tích hợp/E2E và cấu hình CI/CD. Đề bài yêu cầu cấu trúc `apps/web`, `apps/api`, `docs`. Nhóm nhỏ, thời gian hai sprint, cần truy vết từ yêu cầu đến code và test.

## Quyết định

Dùng **một repository** với cấu trúc:

```
brewlite/
├── apps/web/            # Next.js
├── apps/api/            # NestJS
├── docs/                # tài liệu, sơ đồ, ADR
├── tests/               # integration / E2E
├── .github/workflows/   # CI/CD
├── docker-compose.yml
└── .env.example
```

Mỗi app có `package.json`, lockfile và `Dockerfile` riêng. MVP không dùng công cụ monorepo nặng (Nx, Turborepo).

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| Nhiều repository (web, api, docs riêng) | Khó truy vết, một thay đổi xuyên web và API phải tách nhiều PR, giảng viên phải clone nhiều nơi |
| Monorepo với Nx/Turborepo | Thêm độ phức tạp cấu hình mà MVP chưa cần |

## Hệ quả

**Ưu điểm**
- Một pull request có thể sửa web, API và tài liệu cùng lúc; lịch sử thay đổi liền mạch.
- Một nơi cho issue board, CI/CD và `docker-compose.yml`; người ngoài nhóm chỉ cần clone một lần.
- Dễ giữ tài liệu và code đồng bộ, phù hợp ma trận truy vết.

**Hạn chế / đánh đổi**
- CI có thể chạy cả web lẫn API dù chỉ một bên thay đổi; cần job riêng và lọc theo đường dẫn nếu pipeline chậm.
- Không tự động chia sẻ kiểu dữ liệu giữa web và API; hợp đồng API dựa vào tài liệu và test.
- Lịch sử commit chung nên cần quy ước commit rõ (ví dụ `feat(api):`, `docs:`).

## Liên quan

Task 4.1 trong đề bài; `docs/architecture/c4-model.md` (mục 2).
