# TASK 05 — Baseline rule-based vs Raw LLM vs LLM + hậu kiểm

> **Thiết kế:** `extension/tests/eval/rule-baseline.ts` — bộ luật tất định chạy
> trong Node (không cần model), tái dùng bảng giờ mơ hồ của prompt v5
> (`core/extraction/vague-time.ts`). Chấm bằng **cùng công cụ đo** với LLM:
> `computeMetrics` + `computeFieldMetrics` trên bộ E01–E17 (25 sự kiện kỳ vọng).
>
> Giới hạn có chủ đích (ghi trong header của file): không xử lý đại từ hồi chỉ,
> không tách câu phức tạp, tối đa 2 sự kiện/câu, nhãn luôn `công_vụ`, title =
> mệnh đề trước biểu thức thời gian đầu tiên (fallback 8 từ đầu).

## 1. Bảng so ba

| Chỉ số (17 mẫu, 25 kỳ vọng) | Rule-based | Raw LLM | LLM + hậu kiểm |
|---|---:|---:|---:|
| Recall L1 | 80,0% (20/25) | 88,0% (22/25) | 88,0% (22/25) |
| Precision L1 | 60,6% (20/33) | 91,7% (22/24) | 91,7% (22/24) |
| Thiếu / thừa | 5 / 13 | 3 / 2 | 3 / 2 |
| Ngày ngoài whitelist | 3 | 0 | 0 |
| Ngày chính xác (cặp ghép) | 20/20 | 22/22 | 22/22 |
| Giờ start chính xác (cặp ghép) | 17/17 | 19/19 | 19/19 |

Nguồn số: `rule-baseline-2026-11-23.json` (rule), `postcheck-iq4_xs-2026-11-22.json`
(LLM, model Qwen3.5-9B IQ4_XS, prompt v5, temp 0,1).

## 2. Đọc kết quả

1. **Event-level là lower bound cho baseline** — như thiết kế: title heuristic
   yếu gây 13 sự kiện thừa (false positive trên câu nhiễu: E06 bản tin 1, E13 1,
   E14 1, E17 1…) và sai tiêu đề làm rớt 5 sự kiện dù ngày đúng. Precision 60,6%
   phản ánh đúng giới hạn này, không phải lỗi ngày/giờ.
2. **Temporal-field trên cặp ghép là phép so công bằng**: khi baseline ghép được
   cặp, ngày chính xác **20/20** và giờ start **17/17** — luật tất định rất chuẩn
   trên biểu thức nó nhận diện được. Đây là mốc cho phần "thời gian", không phải
   cho phần "hiểu ngữ nghĩa".
3. **end: 0/1** — baseline tách câu đa ngày thành nhiều sự kiện thay vì ghép
   start/end của MỘT sự kiện (E17: "từ 9:00 ngày 3/12 … buổi tối ngày 7/12").
   LLM xử lý được ca này — khoảng cách chính giữa luật đơn giản và hiểu ngữ nghĩa.
4. Ngày ngoài whitelist của baseline (3) nằm ở các **false positive** (câu không
   phải sự kiện vẫn có ngày) — đúng dạng lỗi kỳ vọng của luật cứng.

## 3. Câu chốt cho báo cáo §5.3.5

*"Baseline luật tất định đạt recall 80,0% nhưng precision chỉ 60,6% do heuristic
tiêu đề; trên các cặp ghép được, ngày và giờ chính xác tuyệt đối (20/20, 17/17) —
xác nhận phần khó của bài toán không phải là đọc ngày giờ mà là hiểu ngữ nghĩa
câu (tiêu đề, ranh giới sự kiện, start/end). Điều này giải thích vì sao pipeline
chọn LLM + hậu kiểm: hậu kiểm giữ độ chuẩn xác của LLM (91,7%) đồng thời bảo đảm
hình hợp đồng của giá trị thời gian."*

## 4. Việc mở liên quan (không làm trong phiên này)

- **P1.5 (tùy chọn):** chuyển resolver "thứ n/tuần sau" vào
  `core/extraction/relative-date.ts` và dùng trong `normalizeDateTime` — chỉ làm
  sau khi cân nhắc, vì phải chạy lại eval toàn bộ và cập nhật §4.6. Baseline hiện
  tự cài resolver riêng (quy ước ghi trong header) nên số liệu không phụ thuộc.
