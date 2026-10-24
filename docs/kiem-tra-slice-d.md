# Kiểm tra Slice D — duyệt nháp và chống trùng

> **Trạng thái:** đã triển khai và **được nghiệm thu ngày 2026-10-24**. Quality gate tự động
> **xanh**; người dùng đã chạy checklist thủ công trong Chrome và xác nhận đạt.
> Phạm vi gốc và quyết định đã chốt: [`ban-giao-slice-d.md`](./ban-giao-slice-d.md).

## 1. Đã giao

| Hạng mục | Kết quả |
|---|---|
| D1 — hiển thị | Badge **Máy đề xuất** (`origin='llm'`), mức tin cậy **Thấp/Vừa/Cao** (không hiện %), dòng **Nguồn tạo** trong chi tiết, chip **thiếu thời điểm**/**chưa gắn hồ sơ**/**Có thể trùng**, quote dài dùng **Xem trích dẫn đầy đủ**, nút **Mở nguồn** chỉ khi có `url` |
| D1 — chế độ duyệt | Nút **Duyệt nháp (N)**; giữ bộ lọc từ khoá/nhãn, ép `status='nhap'`; `sortDraftsForReview()` xếp `llm` cần chú ý → `llm` còn lại → nhập tay; thoát khôi phục trạng thái cũ; `Escape` thoát; empty state **Đã duyệt hết nháp** có nút quay lại |
| D2 — duyệt hàng loạt | `selectedDraftIds` chỉ trong UI; checkbox ngoài nút mở thẻ; chọn tất cả đang hiển thị + `indeterminate`; duyệt bằng `Promise.allSettled`, mục lỗi giữ `nhap` và giữ lựa chọn; cảnh báo nháp chỉ có ngày/không có ngày trước khi lưu |
| D3 — sửa/xoá | **Sửa** mở form đầy đủ, giữ `origin`/`extractionMeta`; **Xoá nháp đã chọn** có xác nhận, chỉ xoá `nhap`, không undo |
| D4 — gợi ý trùng | `suggestDuplicates()` thuần: cổng thời gian (lệch > 1 ngày → bỏ), tối thiểu 2 tín hiệu có tiêu đề/văn bản, tối đa 3 gợi ý/sự kiện, bỏ sự kiện `huy`, giới hạn 300 sự kiện; UI **Giữ cả hai / Mở bản kia / Xoá bản này**; **không tự gộp** |

**Không làm (đúng phạm vi):** nhắc việc KS-10, Gmail/PDF/DOCX, classifier, `versionHistory`,
gộp nguồn tự động (D4b), sửa nhanh nội tuyến (D3a), thu thập feedback chỉnh sửa.

## 2. Bằng chứng tự động

```bash
cd extension
npm run typecheck   # xanh
npm run lint        # xanh
npm test            # 206 test / 25 file
npm run build       # xanh
```

Test mới:

| File | Nội dung |
|---|---|
| `tests/core/extraction-confidence.test.ts` | Ngưỡng `<0.5`, `0.5`, `0.79`, `0.8`; manual không có confidence |
| `tests/core/event-review.test.ts` | Thứ tự duyệt 3 nhóm, uncertain/thiếu hồ sơ lên trước, cảnh báo ngày, prune lựa chọn, sửa giữ `origin` |
| `tests/core/extraction-similar.test.ts` | Cùng ngày + tiêu đề gần, lệch > 1 ngày, paraphrase theo quote, thiếu ngày, cùng hồ sơ, bỏ `huy`, không mutate |
| `tests/ui/review.test.ts` | Badge/confidence/quote dài, thanh duyệt + checkbox, `indeterminate`, duyệt/xoá hàng loạt, huỷ cảnh báo ngày, chip **Có thể trùng** |

## 3. Checklist thủ công (đã chạy)

Các mục dưới đây nằm trong [`kiem-thu-demo.md`](./kiem-thu-demo.md) §4.1 và đã được
người dùng xác nhận trong Chrome ngày **2026-10-24**:

- [x] 5 nháp duyệt trong **≤ 30 giây** không mở form.
- [x] Chỉ mục được chọn chuyển `dang_theo_doi`; mục khác giữ `nhap`.
- [x] Badge/confidence/quote/nguồn đúng; manual không có confidence.
- [x] Checkbox tổng `indeterminate`; chọn tất cả chỉ chọn mục đang hiện.
- [x] Cảnh báo nháp chỉ có ngày/không có ngày; huỷ thì không lưu.
- [x] Xoá nháp có xác nhận, không xoá mục đang theo dõi.
- [x] Quét lại cùng trang (cùng output) → 0 bản ghi mới; paraphrase → **Có thể trùng**.
- [x] Side panel 320/360/400 px không tràn; `Escape` thoát chế độ duyệt.

## 4. Lệch KS-08

Đã ghi tại [`DEVIATIONS.md`](./DEVIATIONS.md): sửa nhanh tại chỗ, thu thập feedback,
bỏ chọn không tự loại khỏi danh sách, toast thay notification hệ điều hành,
`notifications.milestones` vẫn rỗng, không có trường địa điểm, không tự gộp paraphrase.

## 5. Tiếp theo

Slice E — đo chất lượng trên bộ mẫu và chốt model khuyến nghị. Bàn giao, bộ mẫu đề xuất
và quy trình đo: [`ban-giao-slice-e.md`](./ban-giao-slice-e.md); bảng kết quả:
[`ket-qua-danh-gia-slice-e.md`](./ket-qua-danh-gia-slice-e.md).
