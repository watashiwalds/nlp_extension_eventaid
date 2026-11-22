# Bộ mẫu đánh giá (gold set) — E01–E17

Bộ mẫu **dev** dùng để đo chất lượng trích xuất. Tài liệu này là hợp đồng đóng băng
(gold freeze): sau khi có lần đo thật, không sửa text, `expected`, `allowedDates`
hay `mockOutput` của mẫu đã đo.

## Nguồn và quy ước chung

- Toàn bộ 17 mẫu **tự soạn**, không chứa dữ liệu cá nhân thật.
- Mốc "hôm nay" cố định cho test tất định: `EVAL_NOW = 2026-10-22T08:00:00+07:00`
  (thứ Năm) — khai báo trong `case-types.ts`. Mẫu nào không tự đặt `now` thì dùng mốc này.
- **Tổng gold: 25 sự kiện kỳ vọng** (bảng dưới). Mẫu âm E06 có `expected: []`.
- `allowedDates` là **whitelist theo từng mẫu**: ngày kỳ vọng + ngày tuyệt đối xuất
  hiện trong văn bản. Đây là căn cứ chấm "ngày nằm ngoài whitelist", **không** phải
  bằng chứng tuyệt đối cho "model không bịa" (không chấm giờ, nhãn hay nội dung).

## Danh mục 17 mẫu

| ID | Nhóm | Tiêu đề | Sự kiện kỳ vọng | Ghi chú |
|---|---|---|---:|---|
| E01 | class | Thông báo lớp XLNNTN | 2 | |
| E02 | meeting | Email mời họp kế hoạch học kỳ | 1 | |
| E03 | seminar | Lịch seminar khoa CNTT | 3 | đa sự kiện |
| E04 | recruitment | Thông báo tuyển dụng thực tập | 2 | |
| E05 | event | Đêm nhạc Mùa thu Hà Nội | 1 | |
| E06 | negative | Bản tin không có sự kiện | 0 | mẫu âm |
| E07 | edge | Hạn nhận vé chỉ có ngày | 1 | date-only |
| E08 | edge | Buổi học bù thiếu năm (v5) | 1 | `nam_suy_doan` |
| E09 | edge | Khoảng thời gian rõ ràng | 1 | start + end |
| E10 | edge | Họp phụ huynh với ngày tương đối | 1 | `ngay_tuong_doi` |
| E11 | event | Ba hoạt động trong cùng một ngày | 3 | đa sự kiện |
| E12 | edge | Quét lại và paraphrase tiêu đề | 2 | `rescan`, xem dưới |
| E13 | edge | Prompt injection trong tài liệu | 1 | mock cố ý trả sự kiện injection |
| E14 | edge | Tài liệu dài vượt giới hạn đoạn | 1 | nhiều chunk |
| E15 | class | Hai hồ sơ, một đoạn không dấu | 2 | ghép hồ sơ |
| E16 | edge | Suy năm từ ngữ cảnh cho 2 sự kiện (v5) | 2 | `nam_suy_doan` |
| E17 | event | Giờ nói mơ hồ được quy ước (v5) | 1 | `gio_suy_doan` |

Tổng: **25 sự kiện**.

## Quy ước E12 (rescan)

E12 đo hành vi **quét lại**: lần chạy 2 dùng lại output lần 1 làm `existing` và
harness chỉ ghi `newRecords` (kỳ vọng 0 bản ghi mới), **không** ghi `metrics`
(xem `tests/eval/extraction.live.eval.test.ts`).

Hệ quả khi tổng hợp số đo thật: **lượt 1 chấm đủ 25 sự kiện; lượt 2 chỉ chấm 23**
(25 − 2 của E12) — vì lượt 2 của E12 là quét lại, không phải lần đo mới. Gold
không hề thay đổi giữa hai lượt. E12 còn có lượt 3 (paraphrase) chỉ dùng cho
gợi ý trùng lặp, không chấm recall/precision.

## Cam kết đóng băng

1. Sau khi có kết quả đo bằng `llama-server` thật (Slice E, `docs/evidence/`),
   **không sửa** `text` / `expected` / `allowedDates` / `mockOutput` của mẫu đã đo.
2. Nếu buộc phải sửa (lỗi gold rõ ràng): chạy lại **toàn bộ** bộ mẫu với cấu hình
   mới, lưu evidence riêng và ghi rõ lý do — không trộn kết quả cũ/mới.
3. `tests/eval/gold-freeze.test.ts` bảo vệ các bất biến trên; test đó đỏ nghĩa là
   gold đã lệch so với hợp đồng này.

## Thêm một mẫu

1. Thêm `EvalCase` vào nhóm phù hợp trong `cases-a/b/c.ts` với id tiếp theo (E18…).
2. Ghi đủ `expected`, `allowedDates`, `mockOutput`, `metrics` kỳ vọng; nếu chỉ là
   ngày thì dùng `startDate`, nếu thiếu năm thì thêm cờ `nam_suy_doan` vào
   `requiredUncertain`.
3. Cập nhật bảng danh mục và tổng gold trong README này **và** tổng 25 trong
   `gold-freeze.test.ts` trong cùng một commit, trước khi có lần đo nào dùng mẫu mới.
4. Chạy `npx vitest run tests/eval`; nếu số đo lệch, sửa fixture hoặc pipeline —
   không nới ngưỡng nghiệm thu.
