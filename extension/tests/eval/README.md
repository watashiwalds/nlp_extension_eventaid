# Đánh giá chất lượng trích xuất — Slice E

Thư mục này chứa **công cụ đo tất định** cho bộ mẫu Slice E. Mục tiêu là bảo vệ
công thức đo và pipeline, không phải chứng minh chất lượng model.

## Thành phần

| File | Vai trò |
|---|---|
| `metrics.ts` | Ghép sự kiện với đáp án, tính recall/precision, phát hiện ngày ngoài whitelist, percentile. |
| `metrics.test.ts` | Test đơn vị cho matching, cổng ngày, ngày ngoài whitelist và percentile. |
| `field-metrics.ts` | Số đo mức trường trên cặp ghép: ngày/giờ/end/nhãn/uncertain chính xác, hồ sơ, đếm `T00:00` điền cho mốc date-only. |
| `field-metrics.test.ts` | Test đơn vị cho các số đo mức trường. |
| `gold-freeze.test.ts` | Khoá gold: 17 id, tổng 25 sự kiện, quy ước E12 rescan, không trùng text. |
| `extraction.eval.test.ts` | Chạy 17 mẫu qua `extractEvents()` với `MockProvider`, assert số đo và các bẫy. |
| `extraction.live.eval.test.ts` | Đo thật bằng `llama-server`; chỉ chạy khi đặt `LLAMA_EVAL=1`. |
| `../fixtures/eval/cases.ts` | Điểm vào bộ mẫu; dữ liệu chia theo nhóm trong `cases-a/b/c.ts`. |
| `../fixtures/eval/case-types.ts` | Kiểu `EvalCase` và helper dựng fixture. |
| `../fixtures/eval/README.md` | Hợp đồng đóng băng gold set (nguồn, 25 sự kiện, quy ước E12, cam kết freeze). |

## Quy tắc đối sánh (matching spec)

Được hiện thực trong `metrics.ts` (`matchExpected` + `computeMetrics`) và dùng
chung cho mọi số đo trong báo cáo:

1. **Tiêu đề**: khớp khi trùng khít sau `normalizeTitleKey()` (bỏ dấu, bỏ ký tự
   trang trí) **hoặc** Jaccard token ≥ 0.5 — cùng hàm với dedup runtime.
2. **Cổng ngày**: đáp án không có ngày → bỏ qua cổng; đáp án có ngày mà sự kiện
   trích ra không có ngày → không ghép; lệch tối đa ±1 ngày thì được ghép.
3. **Ghép 1-1 tham lam theo thứ tự đáp án**: mỗi đáp án lấy sự kiện thật đầu tiên
   còn tự do khớp tiêu đề + cổng ngày; không ghép lại một sự kiện hai lần.
   Còn lại là `missed` (thiếu) và `extra` (thừa).
4. **`inventedDates`** = sự kiện có ngày start/end (phần **ngày**) nằm ngoài
   `allowedDates` của mẫu. **Chỉ chấm phần ngày**: không đo giờ, không đo năm so
   với nguồn, không đo nhãn hay tóm tắt.
5. **`allowedDates` là whitelist theo từng mẫu** (ngày kỳ vọng + ngày tuyệt đối
   có trong văn bản). "0 ngày ngoài whitelist" **không** tương đương "0 ngày giờ
   bịa" — câu chốt trong báo cáo phải dùng đúng giới hạn này.

Số đo mức trường (`field-metrics.ts`) chấm thêm trên các cặp đã ghép: ngày/giờ
start, ngày/giờ end **chính xác tuyệt đối** (cặp ghép lệch ±1 ngày vẫn tính là
không chính xác), nhãn, cờ uncertain (actual phải chứa đủ cờ kỳ vọng, được gắn
thêm), recall/precision hồ sơ theo tên, và `countInventedMidnight` (điền `T00:00`
cho mốc gold chỉ có ngày). `summaryPresent` chỉ là **proxy hiện diện** — gold
không có đáp án tóm tắt để chấm nội dung.

## Chạy

```bash
npm test                 # gồm test eval, không cần mạng hay llama-server
npx vitest run tests/eval
```

### Đo thật bằng llama-server

```bash
LLAMA_EVAL=1 npx vitest run tests/eval/extraction.live.eval.test.ts \
  --reporter=verbose --disableConsoleIntercept
```

Mặc định gọi `http://127.0.0.1:8080`; đổi bằng `LLAMA_ENDPOINT`. Harness chạy mỗi
mẫu 2 lần (E12: lần 2 quét lại, lần 3 paraphrase), in bảng metric và một khối JSON
chi tiết giữa `SLICE_E_LIVE_JSON_BEGIN`/`SLICE_E_LIVE_JSON_END`. Test này bị skip
trong `npm test` để CI không cần model/GPU.

## Giới hạn quan trọng

- Số đo từ `MockProvider` **không** dùng để tuyên bố model đạt recall 80%.
  `mockOutput` là output cố định do người viết fixture đặt, không phải model thật.
- Con số nghiệm thu phải đến từ lần chạy `llama-server` thật theo
  [`docs/ban-giao-slice-e.md`](../../../docs/ban-giao-slice-e.md) §6 và được ghi vào
  [`docs/ket-qua-danh-gia-slice-e.md`](../../../docs/ket-qua-danh-gia-slice-e.md).
- E13 cố ý sai (chỉ trả sự kiện injection) để chứng minh metric bắt được đồng thời
  thiếu, thừa và ngày bịa. Các mẫu còn lại trả đúng đáp án.

## Thêm một mẫu

1. Thêm `EvalCase` vào nhóm phù hợp trong `tests/fixtures/eval/cases-a/b/c.ts`.
2. Ghi `expected`, `allowedDates`, `mockOutput` và `metrics` kỳ vọng.
3. Chạy `npx vitest run tests/eval`; nếu số đo lệch, sửa fixture hoặc pipeline —
   không nới ngưỡng nghiệm thu.
