@"
# BrewLite - Cashless Coffee Ordering System
Hệ thống đặt cà phê không dùng tiền mặt (Cashless Ordering) theo mô hình Mobile-First/PWA.
Đồ án môn Công nghệ Phần mềm - Trường Đại học Sài Gòn.

## 1. Công nghệ cốt lõi
- Frontend: Next.js (TypeScript, TailwindCSS, Zustand)
- Backend: NestJS (TypeScript, Prisma ORM)
- Database: PostgreSQL
- DevOps: Docker Compose, GitHub Actions (CI/CD)

## 2. Quy ước nhánh (Branching Strategy)
- main: Nhánh production
- develop: Nhánh tích hợp chính
- feat/*: Nhánh phát triển tính năng
- docs/*: Nhánh tài liệu và sơ đồ
  "@ | Out-File -FilePath README.md -Encoding utf8