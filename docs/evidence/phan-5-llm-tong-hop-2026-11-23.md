# Tổng hợp số liệu Chương 5 (phần LLM) — đợt đo 2026-11-23

> **Mục đích:** một file duy nhất chứa toàn bộ số liệu cần để sửa **Chương 5 (phần LLM)** của
> `Bao_cao_NLP_FINAL_Lan2.docx`. Mọi số trong file này truy vết được về các JSON evidence liệt kê
> ở §6. Phiên sau chỉ cần mở DOCX và bám theo §7 (bản đồ số → mục báo cáo) và §8 (câu văn mẫu).
>
> **Điều kiện chốt:** prompt v5, bộ giữ kín (held-out) 50 mẫu — 30 dương (39 sự kiện kỳ vọng) +
> 20 âm, `EVAL_NOW = 2026-10-22T08:00+07:00`, mỗi mẫu chạy 2 lần, temperature 0,1 + sampler mặc
> định của server, `max_tokens 1200`, reasoning off, context 8192, commit `f1643a7`, cây sạch.

---

## 1. Bảng so sánh chính (5 model, bộ giữ kín, prompt v5)

Phạm vi thống kê: **chỉ 30 mẫu dương** (39 sự kiện kỳ vọng) để mọi model cùng một cơ sở —
riêng cột "sự kiện trên mẫu âm" đo riêng trên 20 mẫu âm × 2 lượt.

| Chỉ số | Qwen3.5-2B Q4_K_L | Qwen3.5-4B Q4_K_S | Qwen3.5-9B IQ4_XS | Bonsai-2 9B PQ2_0 | Bonsai-2 27B PTQ1_0 |
|---|---:|---:|---:|---:|---:|
| Recall L1 | 59,0% (23/39) | 92,3% (36/39) | **92,3%** (36/39) | 74,4% (29/39) | **94,9%** (37/39) |
| Recall L2 | 61,5% (24/39) | 87,2% (34/39) | 89,7% (35/39) | 74,4% (29/39) | **94,9%** (37/39) |
| Precision L1 (mẫu dương) | 71,9% | 87,8% | **90,0%** | 78,4% | **90,2%** |
| Sự kiện thừa L1 (mẫu dương) | 9 | 5 | 4 | 8 | 4 |
| Ngày ngoài whitelist L1 (mẫu dương) | 1 | 2 | **0** | 1 | **0** |
| Sự kiện trên mẫu âm | 4/40 lượt (N14, N17) | 4/40 lượt (N14, N16) | **0/40 lượt** | 5/40 lượt (N14–N16) | Không có¹ |
| p95 L1 (mẫu dương) | 4,2 s | 10,5 s | 41,9 s | 6,4 s | 126,6 s |
| Median L1 (mẫu dương) | 2,1 s | 4,2 s | 19,8 s | 4,2 s | 58,4 s |
| JSON lỗi (2 lượt) | 0 | 0 | 0 | 2 (đã retry) | 0 |
| Lượt bị cắt (truncated) | 0 | 0 | 0 | 0 | 0 |

¹ *Không có:* model 27B không giữ được trạng thái ổn định trên máy cá nhân xuyên suốt 20 mẫu âm
(đã đo được 12/20 mẫu, tất cả trả 0 sự kiện) nên phần này **không đưa vào thống kê** — xem §4.

Ngưỡng nghiệm thu của dự án (áp cho model chốt): recall ≥ 80% hai lượt, 0 ngày bịa, p95 ≤ 90 s.

---

## 2. Điều kiện đo từng model

| | 2B Q4_K_L | 4B Q4_K_S | 9B IQ4_XS | PQ2_0 9B | PTQ1_0 27B |
|---|---|---|---|---|---|
| File GGUF | `Qwen_Qwen3.5-2B-Q4_K_L` | `Qwen_Qwen3.5-4B-Q4_K_S` | `Qwen_Qwen3.5-9B-IQ4_XS` | `Ternary-Bonsai-2-9B-PQ2_0-MTP-Q8_0` | `Ternary-Bonsai-2-27B-PTQ1_0` |
| Dung lượng | ~1,52 GB | ~2,85 GB | ~5,50 GB | ~2,68 GB | ~27B tham số |
| Build llama.cpp | b10101 (4310aa4f8) | b10101 (4310aa4f8) | b10101 (4310aa4f8)² | b10827 (c96baf4ab) | b10827 (c96baf4ab) |
| `-ngl` / VRAM | 99 — full GPU (1,7/4 GB) | 99 — full GPU (3,7/4 GB) | **16 — offload một phần**² | 99 — full GPU (2,5/4 GB) | 36 — offload một phần (3,6/4 GB) |
| flash-attn | on | on | không bật² | on | on |
| Nguồn số | đo mới 23/11 | đo mới 23/11 | **tái dùng evidence sáng 23/11** | đo mới 23/11 | đo mới 23/11 (3 lượt gộp) |

² *Số IQ4_XS tái sử dụng từ lần đo held-out sáng cùng ngày (`heldout-iq4_xs-2026-11-23.json`) —
đúng model, đúng bộ mẫu, đúng prompt v5, cùng build; khác ở chỗ chưa bật flash-attn và `-ngl 16`.*

Cờ server chung (ngoài bảng trên): `--jinja`, `-c 8192`, `--parallel 1`, `-t 6`,
KV cache `q8_0`, `--reasoning off`. Build khác nhau theo họ model: Qwen chạy trên b10101,
ternary (prismml) chạy trên b10827 — giống đúng protocol của các lần đo trước trong dự án.

---

## 3. Đọc kết quả — phát hiện chính

1. **2B Q4_K_L dưới ngưỡng rõ rệt** (recall 59,0%/61,5%): lỗi tập trung ở mẫu đa sự kiện
   (H09, H12, H13, H14) — trích thiếu sự kiện và lệch tiêu đề. Loại cho bài toán trích xuất.
2. **PQ2_0 (ternary 9B) không đạt ngưỡng trên bộ giữ kín** (74,4% cả hai lượt) dù đạt trên bộ
   dev (81,8%/80,0% ở v4; 88,0%/82,6% ở v5). Bộ giữ kín khó hơn bộ dev; bên cạnh đó PQ2_0 tự
   tạo sự kiện từ 3 mẫu âm (N14–N16) — precision thấp nhất trong các model từ 9B trở lên.
3. **4B Q4_K_S ngang recall IQ4_XS ở lần 1** (92,3%) nhưng kém hơn ở lần 2 (87,2%), precision
   thấp hơn (87,8% so với 90,0%), có 2 ngày ngoài whitelist và tự tạo sự kiện trên 2 mẫu âm.
4. **IQ4_XS vẫn là lựa chọn cân bằng nhất**: recall 92,3%/89,7%, precision 90,0%, **0 ngày ngoài
   whitelist, 0 sự kiện trên mẫu âm** — mô hình duy nhất trong đợt đo sạch trên cả hai tiêu chí
   sai soát. p95 41,9 s chịu ảnh hưởng offload một phần (§4).
5. **27B PTQ1_0 có recall và precision cao nhất** (94,9%/90,2%, 0 ngày ngoài whitelist) nhưng
   p95 126,6 s vượt ngưỡng 90 s khoảng 2 lần — trùng khớp với lần đo cũ trên bộ dev (127,3 s),
   khẳng định đây là giới hạn của model/hạ tầng chứ không phải nhiễu đo. Không phù hợp chạy
   thời gian thực trên máy cá nhân.
6. **H25 là mẫu thất bại chung** ("hạn chốt bài viết là thứ Sáu tuần sau" — ngày tương đối
   không có mốc dương lịch): cả 5 model đều không ghép được ở cả hai lượt — xác nhận hạn chế
   đã ghi ở §4.6 của báo cáo (ngày tương đối chỉ gắn cờ `ngay_tuong_doi`, chưa quy đổi).

---

## 4. Trade-off: model quá lớn trên máy cá nhân

Câu gợi ý để đưa vào báo cáo (sửa theo giọng văn của từng mục):

> Model 27B đạt chất lượng trích xuất cao nhất trong đợt đo (recall 94,9%, precision 90,2%),
> song khi chạy trên GPU laptop 4 GB, phần lớn trọng số phải đặt trên CPU (`-ngl 36`) khiến
> p95 tăng lên 126,6 s — vượt ngưỡng 90 s của hệ thống — và tiến trình suy luận không giữ
> được ổn định xuyên suốt 20 mẫu âm, nên số liệu mẫu âm của model này được ghi là "không có"
> thay vì đưa vào thống kê. Đây là hạn chế cố hữu khi sử dụng model quá lớn trên máy cá nhân:
> dưới ngưỡng bộ nhớ GPU, hiệu năng suy luận giảm theo số lớp phải tính trên CPU và độ ổn định
> giảm theo áp lực bộ nhớ; vì vậy lựa chọn model chốt của demo (IQ4_XS) ưu tiên cân bằng giữa
> chất lượng và khả năng vận hành thực tế thay vì chất lượng tối đa đơn thuần.

Đối chiếu cụ thể trong đợt đo:

- **2B/4B/PQ2_0** nạp trọn GPU (`-ngl 99`) → nhanh và ổn định qua 100 lượt.
- **IQ4_XS** (~5,5 GB) chỉ vừa 16 lớp trên GPU → phần lớn suy luận trên CPU; p95 41,9 s là
  chi phí của chính model đã chốt, không phải lỗi đo.
- **27B** vừa 36 lớp, p95 126,6 s và không ổn định qua đủ bộ âm → chỉ dùng được khi có hạ
  tầng GPU lớn hơn (không thuộc phạm vi demo máy cá nhân).

---

## 5. Ghi chú phương pháp

- Bộ giữ kín được freeze trước khi chạy (`tests/fixtures/eval-heldout/`, `heldout-freeze.test.ts`);
  không sửa fixture/gold sau khi đo. Quy ước chấm: tiêu đề trùng khít sau chuẩn hoá hoặc
  Jaccard ≥ 0,5; cổng ngày lệch ≤ 1 ngày; "ngày ngoài whitelist" = ngày start/end nằm ngoài
  `allowedDates` của mẫu (đo phần ngày, chưa đo giờ — xem §5.3.1 của báo cáo).
- Mỗi mẫu chạy 2 lần độc lập; E12 (quét lại/paraphrase) không thuộc bộ giữ kín.
- 27B: thống kê chỉ trên 30 mẫu dương × 2 lượt; 12/20 mẫu âm đã đo được đều trả 0 sự kiện
  (ghi nhận trong rawRecords) nhưng không dùng để chấm.
- Harness chạy: `LLAMA_EVAL=1 EVAL_SET=heldout LLAMA_MODEL=chat npx vitest run
  tests/eval/extraction.live.eval.test.ts --reporter=verbose --disableConsoleIntercept`;
  đo bổ sung từng phần dùng thêm `EVAL_IDS=N09,N10,…` (đã thêm biến này vào harness, không
  đụng gold/chấm điểm; `typecheck` + `lint` xanh).

---

## 6. File evidence truy vết

| File | Nội dung |
|---|---|
| `heldout-iq4_xs-2026-11-23.json` | IQ4_XS — đo sáng 23/11 (TASK 03), tái dùng cho bảng này |
| `heldout-qwen35-2b-q4kl-2026-11-23.json` (+`.log`) | 2B Q4_K_L — đo mới |
| `heldout-qwen35-4b-q4ks-2026-11-23.json` (+`.log`) | 4B Q4_K_S — đo mới |
| `heldout-bonsai2-9b-pq2-2026-11-23.json` (+`.log`) | PQ2_0 — đo mới |
| `heldout-bonsai2-27b-ptq1-2026-11-23.json` (+`.log`, 2 log bổ sung) | 27B PTQ1_0 — 3 lượt gộp, thống kê trên mẫu dương |
| `phan-5-llm-tong-hop-2026-11-23.md` | chính là file này |

---

## 7. Bản đồ số → mục báo cáo (Chương 5)

| Mục báo cáo | Cách dùng số mới |
|---|---|
| §5.1 (môi trường thực nghiệm) | thêm dòng phần cứng/commit/build theo §2; nêu hai build (b10101/b10827) |
| Bảng 5.1 (v4, bộ dev) | **giữ nguyên** — là thí nghiệm khác (prompt v4, E01–E15), không trộn số |
| Bảng 5.2 (v5, bộ dev, IQ4_XS + PQ2_0) | **giữ nguyên**; dẫn thêm bảng mới dưới đây |
| Bảng 5.3 (mới — đề xuất) | dán bảng §1: so sánh 5 model trên bộ giữ kín, prompt v5 |
| §5.3.4 (tập giữ kín) | cập nhật: từ 1 model (IQ4_XS) thành 5 model; số recall/precision lấy từ bảng §1 |
| §5.5 / §6.1–6.2 | kết luận chọn model: IQ4_XS giữ vai trò chốt (điểm 4, §3); 27B bị loại vì p95 + hạn chế máy cá nhân (§4); PQ2_0 không đạt ngưỡng trên held-out (điểm 2, §3) |
| Câu trade-off | dán câu ở §4 vào mục luận giải lựa chọn model (§5.5 hoặc §6.1) |

**Không được làm:** trộn số bộ dev (Bảng 5.1/5.2) với số bộ giữ kín (bảng §1); gọi số 27B trên
mẫu âm là "đã đo"; bỏ điều kiện offload khi so latency giữa các model.

---

## 8. Câu văn mẫu cho DOCX

- **Kết luận chọn model:** "Trên bộ giữ kín 50 mẫu với prompt v5, Qwen3.5-9B IQ4_XS là mô hình
  duy nhất đồng thời đạt recall ≥ 80% ở cả hai lượt (92,3%/89,7%), precision 90,0%, không sinh
  ngày ngoài whitelist và không trích sự kiện trên mẫu không lịch trình; p95 41,9 s nằm trong
  ngưỡng 90 s."
- **Vì sao không chọn model nhỏ hơn:** "Qwen3.5-4B Q4_K_S đạt recall tương đương ở lần đo đầu
  (92,3%) nhưng giảm ở lần hai (87,2%), precision thấp hơn (87,8%) và tự sinh sự kiện trên hai
  mẫu âm; Qwen3.5-2B Q4_K_L chỉ đạt 59,0% — dưới ngưỡng 80%. Ternary-Bonsai-2-9B PQ2_0 đạt
  74,4% trên bộ giữ kín, thấp hơn mức 81,8% từng đo trên bộ dev, cho thấy kết quả trên bộ dev
  không tự động chuyển sang dữ liệu chưa quen."
- **Vì sao không chọn model lớn hơn:** xem câu trade-off ở §4.
