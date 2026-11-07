# ADR-002: Frontend Next.js mobile-first/PWA, giỏ hàng ở phía client

| Trạng thái | Accepted |
|---|---|
| Ngày | 04/11/2026 |

## Bối cảnh

Khách chủ yếu đặt đồ uống bằng điện thoại, cần tải nhanh và có thể thêm vào màn hình chính. Đề bài bắt buộc Next.js theo hướng mobile-first/PWA. Mô hình dữ liệu hiện tại không có bảng giỏ hàng; đơn chỉ được tạo khi khách bấm đặt.

## Quyết định

1. Dùng **Next.js** (App Router), thiết kế mobile-first, bổ sung PWA (web manifest, icon, service worker tối thiểu).
2. Trang menu và chi tiết sản phẩm dùng **render phía server** (SSR) để tải nhanh; các thao tác tương tác (giỏ hàng, checkout) chạy phía trình duyệt.
3. **Giỏ hàng lưu phía client** (state, có thể lưu lại bằng `localStorage` để không mất khi tải lại trang). Server chỉ nhận giỏ hàng khi `POST /orders`, và **tính lại toàn bộ giá phía server**, không tin giá từ client.
4. Theo dõi trạng thái đơn bằng **polling** định kỳ trên trang chi tiết đơn.
5. Frontend không truy cập cơ sở dữ liệu; chỉ gọi Backend qua REST (JSON/HTTPS, Bearer JWT).

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| SPA thuần (Vite + React) | Menu tải chậm hơn, thiếu SSR; đề đã chỉ định Next.js |
| Giỏ hàng lưu trong DB (bảng Cart) | Thêm bảng, API và đồng bộ; không cần cho MVP |
| WebSocket/SSE cho trạng thái đơn | Phức tạp hơn polling, khó triển khai trên gói hạ tầng miễn phí |

## Hệ quả

**Ưu điểm**
- Menu hiển thị nhanh trên mạng di động; có thể cài đặt như ứng dụng.
- Không phải xây thêm API và bảng cho giỏ hàng; Backend đơn giản hơn.
- Giá luôn được kiểm tra lại ở server nên khách không thể sửa giá phía client.

**Hạn chế / đánh đổi**
- Giỏ hàng không đồng bộ giữa các thiết bị.
- Polling tạo thêm request và có độ trễ vài giây khi đổi trạng thái đơn.
- SSR gọi API từ container Frontend nên cần hai địa chỉ API: địa chỉ nội bộ cho SSR và địa chỉ công khai cho trình duyệt (xem ADR-010).
- Service worker chỉ cache tài nguyên tĩnh; không hỗ trợ đặt đơn offline.

## Liên quan

FR về menu, giỏ hàng, theo dõi đơn (SRS); ràng buộc C1, C15 trong `context-and-scope.md`; `apps/web`.
