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
