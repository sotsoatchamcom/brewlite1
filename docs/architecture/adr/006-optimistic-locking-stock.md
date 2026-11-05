# ADR-006: Khóa lạc quan (`version`) khi trừ tồn kho

| Trạng thái | Accepted |
|---|---|
| Ngày | 04/11/2026 |

## Bối cảnh

Nhiều khách có thể đặt cùng một món sắp hết hàng cùng lúc, hoặc Admin sửa tồn kho/giá khi đơn đang được tạo. Hệ thống không được bán vượt tồn kho. Bảng `Product` có sẵn cột `stock` và `version`.

## Quyết định

Trừ tồn kho **trong cùng transaction với việc tạo đơn**, bằng cập nhật có điều kiện theo `version`:

```ts
const result = await tx.product.updateMany({
  where: { id: productId, version: seenVersion, stock: { gte: qty } },
  data:  { stock: { decrement: qty }, version: { increment: 1 } },
});
// result.count === 0  → có xung đột hoặc hết hàng
```

Quy trình cho mỗi sản phẩm trong đơn:
1. Gộp các dòng cùng `productId` thành một tổng số lượng.
2. Đọc `stock` và `version` hiện tại trong transaction.
3. Nếu `stock < qty` → từ chối với lỗi hết hàng (HTTP 409).
4. Thực hiện `updateMany` như trên. Nếu `count = 0` → đọc lại và **thử lại tối đa 3 lần**; hết số lần thử thì trả HTTP 409 để khách thử lại.
5. Chỉ khi mọi sản phẩm trừ kho thành công mới tạo `Order`, `OrderItem` và commit. Lỗi ở bất kỳ bước nào → rollback toàn bộ.

Admin khi sửa sản phẩm cũng phải tăng `version`.

## Phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| Khóa bi quan (`SELECT ... FOR UPDATE`) | Giữ khoá hàng suốt transaction, dễ nghẽn và deadlock khi nhiều món; hạ tầng miễn phí có ít kết nối |
| Chỉ dùng `stock >= qty` trong `UPDATE`, không có `version` | Đủ chống bán vượt tồn nhưng không phát hiện được xung đột với chỉnh sửa khác (giá, trạng thái) |
| Không kiểm soát đồng thời | Bán vượt tồn kho, vi phạm mục tiêu G3 |

## Hệ quả

**Ưu điểm**
- Không giữ khoá lâu; thông lượng tốt khi ít tranh chấp (trường hợp thường gặp của một cửa hàng).
- Điều kiện `stock >= qty` nằm trong cùng câu lệnh nên kiểm tra và trừ là nguyên tử.
- Kiểm thử được bằng integration test gửi nhiều đơn đồng thời.

**Hạn chế / đánh đổi**
- Với món rất hot, tranh chấp cao gây nhiều lần thử lại hoặc trả 409.
- Frontend phải xử lý lỗi 409 (hết hàng hoặc thử lại) với thông báo rõ ràng.
- Mọi đường ghi vào `Product` phải tuân thủ quy ước tăng `version`, nếu không cơ chế mất tác dụng.

## Liên quan

Ràng buộc C14; rủi ro R2; mục tiêu G3 trong `context-and-scope.md`; `apps/api` (`OrdersModule`); ADR-009.
