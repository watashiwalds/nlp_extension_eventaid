# Đánh giá chất lượng trích xuất — Slice E

Thư mục này chứa **công cụ đo tất định** cho bộ mẫu Slice E. Mục tiêu là bảo vệ
công thức đo và pipeline, không phải chứng minh chất lượng model.

## Thành phần

| File | Vai trò |
|---|---|
| `metrics.ts` | Ghép sự kiện với đáp án, tính recall/precision, phát hiện ngày bịa, percentile. |
| `metrics.test.ts` | Test đơn vị cho matching, cổng ngày, ngày bịa và percentile. |
| `extraction.eval.test.ts` | Chạy 15 mẫu qua `extractEvents()` với `MockProvider`, assert số đo và các bẫy. |
| `extraction.live.eval.test.ts` | Đo thật bằng `llama-server`; chỉ chạy khi đặt `LLAMA_EVAL=1`. |
| `../fixtures/eval/cases.ts` | Điểm vào bộ mẫu; dữ liệu chia theo nhóm trong `cases-a/b/c.ts`. |
| `../fixtures/eval/case-types.ts` | Kiểu `EvalCase` và helper dựng fixture. |

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
