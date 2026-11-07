# Architecture Decision Records (ADR)

Mỗi quyết định kiến trúc quan trọng của BrewLite được ghi thành một ADR ngắn trong thư mục này. ADR đã ở trạng thái *Accepted* không sửa nội dung; khi thay đổi quyết định, tạo ADR mới và đánh dấu ADR cũ là *Superseded by ADR-xxx*. Mọi thay đổi đi qua pull request và ghi rõ lý do.

## Danh mục

| ADR | Quyết định | Trạng thái |
|---|---|---|
| [001](001-monorepo.md) | Dùng monorepo cho web, API, tài liệu và test | Accepted |
| [002](002-nextjs-pwa-frontend.md) | Frontend Next.js mobile-first/PWA, giỏ hàng ở phía client | Accepted |
| [003](003-nestjs-modular-layered-backend.md) | Backend NestJS: modular monolith theo domain, phân lớp | Accepted |
| [004](004-postgresql-prisma-migration.md) | PostgreSQL 16 + Prisma, quản lý schema bằng migration | Accepted |
| [005](005-jwt-authentication-rbac.md) | Xác thực JWT (Bearer) và phân quyền theo vai trò | Accepted |
| [006](006-optimistic-locking-stock.md) | Khóa lạc quan (`version`) khi trừ tồn kho | Accepted |
| [007](007-idempotent-payment.md) | Thanh toán idempotent bằng `Idempotency-Key` | Accepted |
| [008](008-mock-payment-service.md) | Mock Payment Service sau interface `PaymentGateway` | Proposed |
| [009](009-order-state-machine-and-snapshot.md) | Order State Machine, snapshot giá, giữ tồn kho | Accepted |
| [010](010-logging-health-config.md) | Logging JSON, health check, quản lý cấu hình | Accepted |

ADR về nền tảng triển khai production (Render, Railway, Fly.io, VPS…) sẽ được thêm khi nhóm chốt nền tảng, cùng với deployment diagram.

## Mẫu ADR

```markdown
# ADR-xxx: Tiêu đề quyết định

| Trạng thái | Proposed / Accepted / Superseded by ADR-xxx |
|---|---|
| Ngày | dd/mm/yyyy |

## Bối cảnh
Vấn đề cần quyết định và các lực tác động (yêu cầu, ràng buộc).

## Quyết định
Nhóm chọn gì.

## Phương án đã cân nhắc
Các lựa chọn khác và lý do không chọn.

## Hệ quả
Ưu điểm, hạn chế và đánh đổi.

## Liên quan
Yêu cầu, tài liệu, mã nguồn.
```
