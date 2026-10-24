# Lưu trữ tài liệu

Thư mục này chứa tài liệu **lịch sử** của dự án: biên bản nghiệm thu, kế hoạch đã hoàn tất,
và bản đánh giá đã bị thay thế. **Không dùng các tệp trong đây làm nguồn hiện hành** khi
bắt đầu phiên mới.

Mục đích của thư mục là giữ lại số đo, quyết định và bối cảnh để tra cứu, đồng thời giảm
số tài liệu phải đọc trong các phiên tiếp theo.

## Nguồn hiện hành thay thế

| Chủ đề | Đọc tệp |
|---|---|
| Trạng thái demo, tính năng, cách chạy | [`../../README.md`](../../README.md), [`../../extension/README.md`](../../extension/README.md) |
| Kế hoạch và trạng thái lớp LLM (Slice A–E) | [`../ke-hoach-llm-trich-xuat.md`](../ke-hoach-llm-trich-xuat.md) |
| Bàn giao và phạm vi Slice D | [`../ban-giao-slice-d.md`](../ban-giao-slice-d.md) |
| Demo khác kế hoạch ở đâu | [`../DEVIATIONS.md`](../DEVIATIONS.md) |
| Đối chiếu chức năng chính thức vs demo | [`../chuc-nang-demo-vs-chinh-thuc.md`](../chuc-nang-demo-vs-chinh-thuc.md) |
| Checklist kiểm thử thủ công còn hiệu lực | [`../kiem-thu-demo.md`](../kiem-thu-demo.md) |

## Danh mục đã lưu trữ

| Tệp | Loại | Lý do lưu trữ | Thay thế bởi |
|---|---|---|---|
| [`phien-lam-viec-tiep-theo.md`](./phien-lam-viec-tiep-theo.md) | Kế hoạch 2 phiên (S1/S2) | Đã hoàn tất; tài liệu tự ghi là lịch sử | `README.md` §6, `ban-giao-slice-d.md` |
| [`thiet-ke-demo-va-san-sang-llama-cpp.md`](./thiet-ke-demo-va-san-sang-llama-cpp.md) | Đánh giá trước tích hợp LLM | Nhiều kết luận đã lỗi thời sau Slice B/C | `ke-hoach-llm-trich-xuat.md` |
| [`kiem-tra-slice-b.md`](./kiem-tra-slice-b.md) | Biên bản nghiệm thu Slice B | Slice B đã đóng; checklist và tồn đọng cũ | `ke-hoach-llm-trich-xuat.md` §9–§11 |
| [`ke-hoach-sau-nghiem-thu-b.md`](./ke-hoach-sau-nghiem-thu-b.md) | Kế hoạch sửa sau Slice B | SB-01, SB-03, SB-12 đã xong | `ke-hoach-llm-trich-xuat.md` §9 |
| [`kiem-tra-slice-c.md`](./kiem-tra-slice-c.md) | Biên bản nghiệm thu Slice C | Slice C đã đóng; checklist KT-C đã đóng | `ban-giao-slice-d.md` §2–§3 |

## Quy ước

- Tệp trong thư mục này **không cần cập nhật** khi code thay đổi.
- Nếu cần trích dẫn số đo lịch sử, ghi rõ đây là tài liệu lưu trữ và kèm ngày.
- Khi một tài liệu hiện hành hoàn thành sứ mệnh, chuyển vào đây bằng `git mv` và thêm một
  dòng vào bảng trên; không xoá lịch sử.
