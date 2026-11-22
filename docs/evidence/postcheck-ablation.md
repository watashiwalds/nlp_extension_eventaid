# TASK 01 — Ablation Raw LLM vs LLM + hậu kiểm (Qwen3.5-9B IQ4_XS)

> **Thiết kế:** mỗi đoạn văn bản gọi model **đúng một lần**, output thô đó được
> tách hai đường xử lý để không nhiễm nhiễu sampling:
> - **Raw:** giữ nguyên chuỗi ISO do model trả, không kiểm chứng nguồn, không
>   suy ngày-only, giữ `uncertain` model tự báo, `relatedProfiles: []`.
> - **Post-check:** `normalizeEvents()` (hậu kiểm v5) + `dedupeCandidates()`
>   như pipeline; không khớp hồ sơ ở **cả hai** đường để cô lập tác động ngày/giờ.
>
> Cấu hình chi tiết: `postcheck-iq4_xs-2026-11-22.json` (commit, phần cứng,
> model file, sampler, số đo từng mẫu). Chạy 2026-11-22, prompt v5,
> temperature 0.1, 17 mẫu E01–E17 (gold 25 sự kiện, xem
> `extension/tests/fixtures/eval/README.md`).

## 1. Bảng tổng hợp

| Chỉ số (17 mẫu, 25 kỳ vọng) | Raw | Post-check |
|---|---:|---:|
| Recall L1 | 88,0% (22/25) | 88,0% (22/25) |
| Precision L1 | 91,7% (22/24) | 91,7% (22/24) |
| Thiếu / thừa | 3 / 2 | 3 / 2 |
| **Ngày ngoài whitelist** | **0** | **0** |
| Ngày chính xác (trên cặp ghép) | 22/22 | 22/22 |
| Giờ start chính xác (trên cặp ghép) | 19/19 | 19/19 |
| **Giá trị hậu kiểm trả `null`** | — | **3** (giờ start; E01, E07, E16) |
| **Sự kiện hậu kiểm làm mất** | — | **0** |
| Cờ `nam_suy_doan`/`gio_suy_doan` hậu kiểm thêm | — | 0 (E10 thêm `nam_chua_ro`) |
| Latency p95 / median | 36,5 s / 23,6 s | (chung lần gọi) |

Ba mẫu thiếu: **E04** (paraphrase tiêu đề dưới ngưỡng Jaccard 0,5 — sự kiện còn
lại khớp chính xác tuyệt đối), **E10** (model không đề xuất ngày tuyệt đối nào
cho "Thứ Ba tuần sau"; cả hai đường đều miss), **E13** (model trả mảng rỗng,
từ chối cả injection lẫn sự kiện thật — biến thiên giữa các lần chạy).

## 2. Ba giá trị bị hậu kiểm trả `null` là gì?

Trên cả ba ca (E01, E07, E16), đường raw đặt **chuỗi ngày-only vào sai trường**
(`start.value = "2026-11-20"` không có phần giờ) — vi phạm hình hợp đồng
`DateTimeRef` (`value` chỉ nhận datetime đủ; ngày-only phải nằm ở `date`).
Hậu kiểm chuyển về đúng hợp đồng: `value = null`, `date = "2026-11-20"`,
gắn cờ `gio_chua_ro` cho người dùng duyệt. Đây là **chuẩn hoá hình hợp đồng +
gắn cờ**, không phải "chặn ngày bịa".

## 3. Kết luận trung thực (kịch bản 2 của kế hoạch)

1. **Raw cũng có 0 ngày ngoài whitelist** trong lần chạy này — không thể viết
   "hậu kiểm giảm X ngày bịa → 0". Giá trị đo được của hậu kiểm là:
   - **Sửa 3/24 sự kiện vi phạm hình hợp đồng** (ngày-only nằm trong `value`)
     thành `value=null` + `date` + cờ `gio_chua_ro`;
   - **không mất sự kiện nào** (`falseNegativeByPostcheck = 0`),
   - recall/precision/dateExact **không đổi** giữa hai đường.
2. Nếu không có hậu kiểm, 3 sự kiện đó vào store với `start.value` không có giờ —
   trường `value` được thông báo nhắc việc dùng trực tiếp, nên đây là rủi ro
   thực tế chứ không phải lỗi hình thức.
3. Câu chốt cho báo cáo: *"Với model chốt (IQ4_XS, prompt v5), output thô của
   model đã không chứa ngày nào ngoài whitelist; giá trị của hậu kiểm nằm ở
   chỗ chuẩn hoá hình hợp đồng và gắn cờ giá trị không kiểm chứng được
   (3/24 sự kiện), với 0 sự kiện bị mất."*
4. **Không khẳng định quá mức:** ablation này chạy 1 lần/mẫu; E13 cho thấy biến
   thiên giữa các lần chạy (lần đo 10/2026 model trích đúng, lần này trả rỗng).
   Câu khẳng định phải giới hạn ở "trên lần chạy ghi nhận tại evidence này".
5. Lỗ hổng C6 (ngày tương đối chỉ gắn cờ, không quy đổi) **không được kích hoạt**
   trong lần chạy này vì model không đề xuất ISO nào cho E10 — vẫn là fact về
   code (đọc `normalize.ts`), cần sửa câu §4.6 của báo cáo độc lập với ablation.

## 4. Đối chiếu với lần đo v5 tháng 10

Recall 88,0% / precision 91,7% của lần chạy này **trùng khớp** với số L1 đã ghi
trong `docs/ket-qua-danh-gia-slice-e.md` §7 (IQ4_XS, prompt v5, temp 0.1) —
bằng chứng tái lập được cấu hình chốt. p95 36,5 s khớp 35,2 s đã ghi (sai lệch
~1 s do máy/proxy).
