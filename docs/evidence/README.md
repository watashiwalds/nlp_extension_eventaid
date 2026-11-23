# Evidence — số đo cho báo cáo

Mọi số xuất hiện trong báo cáo phải truy vết được về thư mục này: mỗi lần chạy
lưu một file JSON theo template dưới đây, kèm một file `.md` tổng hợp bảng.

## Quy tắc

1. **Không để log ở `/tmp`** — log ở đó đã từng bị mất; mọi output của lần chạy
   sống trong commit này.
2. Mỗi file JSON ghi đủ: commit hash, ngày chạy, phần cứng, endpoint, model file,
   prompt version, cấu hình sampler.
3. Sau khi bộ mẫu đã đo (`tests/fixtures/eval/README.md` — cam kết freeze),
   không sửa fixture; nếu buộc phải sửa thì chạy lại toàn bộ và lưu evidence mới,
   không trộn kết quả cũ/mới.
4. Tên file: `<chủ-đề>-<model>-<ngày YYYY-MM-DD>.json`, ví dụ
   `postcheck-iq4_xs-2026-11-22.json`.

## Template JSON

```json
{
  "commit": "<git hash khi chạy>",
  "date": "<ISO 8601>",
  "hardware": "<GPU/CPU>",
  "endpoint": "<URL llama-server hoặc dịch vụ>",
  "model": {
    "file": "<tên file .gguf>",
    "alias": "<alias trên server>",
    "quant": "<loại lượng tử hoá>",
    "contextSize": 8192,
    "sampler": "server defaults + temperature 0.1"
  },
  "promptVersion": "v5",
  "cases": "<bộ mẫu và tổng sự kiện, ví dụ 'E01-E17 dev set, 25 expected events'>",
  "metrics": { "<chỉ số>": 0 },
  "rawRecords": []
}
```

## Danh sách lần chạy

| File | Chủ đề | Model | Ngày |
|---|---|---|---|
| `postcheck-iq4_xs-2026-11-22.json` | TASK 01 — ablation Raw LLM vs LLM + hậu kiểm | Qwen3.5-9B IQ4_XS | 2026-11-22 |
| `postcheck-ablation.md` | Bảng + kết luận TASK 01 | Qwen3.5-9B IQ4_XS | 2026-11-22 |
| `rule-baseline-2026-11-23.json` | TASK 05 — baseline rule-based trên E01–E17 | không dùng model | 2026-11-23 |
| `rule-baseline-2026-11-23.md` | Bảng so ba rule vs raw vs post-check | — | 2026-11-23 |
| `filter-iq4_xs-2026-11-23.json` | TASK 04 — đo đầu-cuối Off/Report/Screen, 27 tài liệu × 3 chế độ | Qwen3.5-9B IQ4_XS + PhoBERT | 2026-11-23 |
| [`../ket-qua-bo-loc.md`](../ket-qua-bo-loc.md) | Kết luận F3: 0 dương bị bỏ, 0 sự kiện mất, 0% mẫu âm bị bỏ → giữ `report` | IQ4_XS + PhoBERT | 2026-11-23 |
| `filter-threshold-sweep-2026-11-23.json` | Quét lưới 60 ngưỡng PhoBERT: không điểm nào đạt cả hai tiêu chí; nút thắt là model | PhoBERT (không LLM) | 2026-11-23 |
| `heldout-iq4_xs-2026-11-23.json` | TASK 03 — bộ giữ kín 50 mẫu: recall L1 92,3% (36/39), precision 90,0%, 0 ngày ngoài whitelist, 0 sự kiện trên 20 mẫu âm | Qwen3.5-9B IQ4_XS | 2026-11-23 |
| `heldout-qwen35-4b-q4ks-2026-11-23.json` (+`.log`) | Phần 5 mới — bộ giữ kín 50 mẫu: recall L1 92,3% (36/39), precision 83,7%, 4 ngày ngoài whitelist, 4/40 lượt âm có sự kiện, p95 7,8 s, full GPU | Qwen3.5-4B Q4_K_S | 2026-11-23 |
| `heldout-qwen35-2b-q4kl-2026-11-23.json` (+`.log`) | Phần 5 mới — bộ giữ kín 50 mẫu: recall L1 59,0% (23/39), precision 67,7%, dưới ngưỡng 80%; p95 3,7 s, median 1,8 s, full GPU | Qwen3.5-2B Q4_K_L | 2026-11-23 |
| `heldout-bonsai2-9b-pq2-2026-11-23.json` (+`.log`) | Phần 5 mới — bộ giữ kín 50 mẫu: recall L1 74,4% (29/39), precision 72,5%, 3 mẫu âm tự tạo sự kiện, 2 response JSON lỗi (đã retry); p95 6,3 s, full GPU; build b10827 | Ternary-Bonsai-2-9B PQ2_0 | 2026-11-23 |
| `heldout-bonsai2-27b-ptq1-2026-11-23.json` (+`.log`, 2 log bổ sung) | Phần 5 mới — thống kê chỉ trên mẫu dương: recall L1/L2 94,9% (37/39), precision L1 90,2%, 0 ngày ngoài whitelist, p95 126,6 s; lượt âm **Không có** (hạn chế máy cá nhân, xem trade-off trong file tổng hợp) | Ternary-Bonsai-2-27B PTQ1_0 | 2026-11-23 |
| [`phan-5-llm-tong-hop-2026-11-23.md`](phan-5-llm-tong-hop-2026-11-23.md) | **File tổng hợp Chương 5 (LLM)**: bảng so sánh 5 model, điều kiện đo, trade-off, bản đồ số → mục báo cáo | 5 model | 2026-11-23 |
| `filter-input-granularity-2026-11-23.json` | Phép thử đoạn-văn-vs-câu: cấp đoạn xấu hơn cả hai chiều (mất 3/14 dương, âm vẫn 10/13 báo nhầm) | PhoBERT (không LLM) | 2026-11-23 |
| `filter-class-weight-2026-11-23.json` | Phép thử trọng số lớp: AUC 0,335 bất kể w (66/34 chỉ dời ngưỡng, không tách nhãn) | PhoBERT (không LLM) | 2026-11-23 |
