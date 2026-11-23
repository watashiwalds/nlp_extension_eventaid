# Kết quả đo sàng lọc đầu-cuối Off / Report / Screen (Slice F3 — TASK 04)

> **Ngày đo:** 23/11/2026. **Bằng chứng:** [`docs/evidence/filter-iq4_xs-2026-11-23.json`](evidence/filter-iq4_xs-2026-11-23.json)
> (commit `142b4bf`, fixtures freeze tại `bdb315c`). Bộ mẫu: `extension/tests/fixtures/filter/`
> (27 tài liệu, freeze). Harness: `extension/tests/eval/filter.live.eval.test.ts` (gate `FILTER_EVAL=1`).

## 1. Cấu hình lần đo

| Hạng mục | Giá trị |
|---|---|
| LLM | Qwen3.5-9B **IQ4_XS** qua llama-swap alias `chat`, build `b10101-4310aa4f8`, ctx 8192, `-ngl 16`, KV q8_0 |
| Sampler | server defaults + `temperature 0.1`, `max_tokens 1200`, reasoning off (prompt **v5**) |
| Bộ lọc | PhoBERT-base-v2 TASK/NON_TASK bàn giao, `device: cuda`, cửa sổ 4000 ký tự, skip confidence 0,85, min 3 câu |
| Bộ mẫu | 14 dương = gold E01–E05/E07–E15 (22 sự kiện) ép nguồn `web_page`; 13 âm = E06 + N01–N12 tự soạn (menu/footer, quảng cáo, bình luận, đăng nhập, email xã giao, bảo trì, FAQ, điều khoản, tin bài) |
| Quy trình | mỗi tài liệu × 3 chế độ `off`/`report`/`screen`, DB in-memory mới mỗi lần (không dedup chéo); 1 lần chạy/mẫu/chế độ |

## 2. Bảng ba chế độ

| Chế độ | Tài liệu | Lỗi | Lượt LLM | SK lưu | Dương bỏ sót | Âm bỏ qua | Recall (dương) | Precision | F1 | Filter p95 | Tổng thời gian |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `off` | 27 | 0 | 30 | 20 | — | — | 72,7% (16/22) | 80,0% (16/20) | 76,2% | — | 394,7 s |
| `report` | 27 | 0 | 30 | 20 | **0** | 0/13 | 72,7% (16/22) | 80,0% | 76,2% | 1,32 s* | 397,1 s |
| `screen` | 27 | 0 | 30 | 20 | **0** | **0/13** | 77,3% (17/22) | 85,0% | 81,0% | 0,05 s* | 393,2 s |

\* p95 `report` cao hơn chỉ vì **1 lần khởi động** ở tài liệu đầu (4,6 s); p95 `screen` tính sau khi
dịch vụ đã ấm. Ngoài hai ca đó, độ trễ lọc điển hình **11–51 ms/cửa sổ**; tài liệu dài nhất (E14,
5 cửa sổ, 228 câu) tốn 1,3 s. Chi phí thêm của bước lọc là không đáng kể.

## 3. Đối chiếu tiêu chí nghiệm thu (§11.4 của kế hoạch sàng lọc)

| Tiêu chí | Kết quả | Đánh giá |
|---|---|---|
| 0 tài liệu dương bị `screen` bỏ | **0/14 bỏ** — 26/28 lần lọc trả `has_event`, 2 lần `uncertain` (E10), 0 lần `no_event` | ✅ **Đạt** |
| 0 sự kiện mất so với `off` | **0 mất** — mọi mẫu dương: matched của `screen` ≥ matched của `off` | ✅ **Đạt** |
| Fail-open không làm hỏng job | 0 lỗi trong 81 lần chạy; 0 ghi chú fail-open | ✅ **Đạt** |
| Bỏ qua ≥ 70% mẫu âm | **0/13 (0%)** — 24/26 lần lọc trên mẫu âm trả `has_event` (confidence 0,51–0,64), 2 lần `uncertain` (N08), **0 lần `no_event`** | ❌ **Không đạt** |
| 0 ngày ngoài whitelist | 0/20 sự kiện lưu ở **cả ba** chế độ | ✅ (phụ) |

## 4. Giải thích kết quả "không tiết kiệm lượt LLM"

Quyết định `no_event` yêu cầu model trả **NON_TASK** với confidence ≥ 0,85 trên **mọi** cửa sổ.
Trên bộ mẫu này model bàn giao gần như luôn trả `has_task` — kể cả trên trang đăng nhập, FAQ,
footer, điều khoản — với confidence thấp (0,51–0,64), tức **dương tính giả ở mức tài liệu** và
không bao giờ chạm ngưỡng bỏ. Đây chính là hiện tượng lần dò tay F2 đã ghi nhận (4 mẫu âm →
không mẫu nào bị bỏ); lần đo đầu-cuối này khẳng định trên bộ 27 mẫu: bộ lọc hiện tại **an toàn
nhưng không tiết kiệm**.

- **Giá trị đo được:** chắn chân — không một tài liệu dương hay một sự kiện nào bị bỏ; chi phí lọc ~ms.
- **Cái giá:** 0 lượt LLM tiết kiệm (mục tiêu ≥ 70% mẫu âm), thêm ~2,4 s tổng thời gian lọc.

## 5. Quyết định theo kết quả

- **Giữ `DEFAULT_FILTER_MODE = 'report'`** (không nâng lên `screen`): điều kiện "0 dương bị bỏ"
  tuy đạt nhưng điều kiện bắt buộc kèm theo — bộ lọc phải thực sự bỏ được mẫu âm — không đạt,
  nên nâng mặc định chỉ thêm chi phí lọc mà không tiết kiệm gì. Người dùng vẫn tự chọn `screen`
  trong Cài đặt; UI có nút "Trích xuất toàn bộ" chạy lại không lọc.
- Không chỉnh ngưỡng `skipConfidence`/`minSentencesToSkip` trong lần này: ngưỡng thuộc cấu hình
  bàn giao (0,85); việc hạ ngưỡng để tăng tỉ lệ bỏ là **tune trên bộ đo**, trái nguyên tắc
  "không sửa pipeline chỉ để làm đẹp số" và cần bộ dữ liệu riêng nếu làm.

## 6. Chênh lệch recall với lần đo 22/11 (ghi chú trung thực)

Recall đường `off` lần này là 72,7% (16/22) — thấp hơn lần đo ablation 22/11 (88,0% trên 25 sự
kiện; quy về 14 mẫu của F3 ≈ 86,4%). Sai khác nằm ở 4 ca **đã biết là điểm yếu model** và có
biến thiên giữa các lần chạy: E03 gộp 3 phiên seminar thành 1 sự kiện (lần 22/11 không gộp),
E04 trả paraphrase không qua cổng tiêu đề, E13 trả sự kiện không khớp gold (lần 22/11 trả rỗng),
E10 không quy đổi ngày tương đối (lỗ hổng C6, đúng như ghi nhận). Lần này mỗi cặp
(tài liệu × chế độ) chỉ chạy 1 lần nên không có khoảng tin cậy; **so sánh screen-vs-off vẫn
công bằng** vì cùng tài liệu, cùng cấu hình, chỉ khác việc có bước lọc. Kết luận chất lượng LLM
không rút từ lần này (dùng TASK 01/02).
