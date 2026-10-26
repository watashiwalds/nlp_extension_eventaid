# Kết quả đánh giá Slice E

> **Trạng thái:** đã đo **3 model** bằng `llama-server` thật: Qwen3.5-9B IQ4_XS và
> Qwen3.5-4B Q5_K_S ngày 2026-10-24, Ternary-Bonsai-2-27B PTQ1_0 ngày 2026-10-26.
> **Kết luận:** giữ **Qwen3.5-9B IQ4_XS** cho demo; **Qwen3.5-4B Q5_K_S bị loại** vì recall
> dưới ngưỡng 80%; **Ternary-Bonsai-2-27B PTQ1_0 bị loại** vì p95 127,3 s vượt ngưỡng 90 s,
> dù recall ngang 9B và không bịa ngày.
> Số liệu dưới đây không phải `MockProvider`.

## 1. Cấu hình đo

| Trường | Qwen3.5-9B IQ4_XS | Qwen3.5-4B Q5_K_S | Ternary-Bonsai-2-27B PTQ1_0 |
|---|---|---|---|
| Ngày chạy | 2026-10-24 | 2026-10-24 | 2026-10-26 |
| Người chạy | OpenCode agent | OpenCode agent | OpenCode agent |
| Build llama.cpp | b10101 (`4310aa4f8`) | b10101 (`4310aa4f8`) | b10827 (`c96baf4ab`) |
| File GGUF | `Qwen_Qwen3.5-9B-IQ4_XS.gguf` | `Qwen_Qwen3.5-4B-Q5_K_S.gguf` | `Ternary-Bonsai-2-27B-PTQ1_0.gguf` |
| Quant | IQ4_XS (4.25 bpw) | Q5_K_S | PTQ1_0 ternary (1,75 bpw, group 128) |
| Kích thước / tham số | ~5,5 GB / 9,2B | ~3,2 GB / 4,3B | ~5,9 GB / 26,9B |
| Context (`-c`) | 8192 | 8192 | 8192 |
| `-ngl` | 16 | 99 | 32 |
| GPU / CPU | RTX 3050 Laptop 4 GB + CPU, 6 threads | RTX 3050 Laptop 4 GB + CPU, 6 threads | RTX 3050 Laptop 4 GB + CPU, 6 threads (Ryzen 5 5600H) |
| `temperature` / `maxTokens` | 0.1 / 1200 | 0.1 / 1200 | 0.1 / 1200 |
| `chunkChars` / `maxChunks` | 5000 / 4 | 5000 / 4 | 5000 / 4 |
| Prompt version | v4 | v4 | v4 |
| Chrome / extension build | Không qua Chrome; harness Node/Vitest, extension 0.1.0 | Không qua Chrome; harness Node/Vitest, extension 0.1.0 | Không qua Chrome; harness Node/Vitest, extension 0.1.0 (`29ab44f`) |
| Ghi chú | KV cache `q8_0`; mỗi mẫu 2 lần; E12 lần 2 quét lại, lần 3 paraphrase | KV cache `q8_0`; cùng bộ mẫu và cùng prompt | KV cache `q8_0`; cùng bộ mẫu và cùng prompt; model ternary 27B |

## 2. Kết quả từng mẫu

Mỗi mẫu chạy 2 lần; E12 dùng lần 2 để kiểm tra dedup và lần 3 để kiểm tra paraphrase.
Ghi `—` nếu không áp dụng.

### 2.1. Qwen3.5-9B IQ4_XS

| Mẫu | Lần | Đúng / kỳ vọng | Thiếu | Thừa | Ngày bịa | JSON lỗi / retry | Latency (s) | Ghi chú |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| E01 | 1 | 2/2 | 0 | 0 | 0 | 0 / 0 | 19,65 | Giữ `start.date` cho hạn nộp |
| E01 | 2 | 2/2 | 0 | 0 | 0 | 0 / 0 | 19,59 | Ổn định |
| E02 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 24,90 | Giữ start/end, không tách đôi |
| E02 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 23,34 | Ổn định |
| E03 | 1 | 3/3 | 0 | 0 | 0 | 0 / 0 | 34,01 | 3 phiên cùng ngày |
| E03 | 2 | 3/3 | 0 | 0 | 0 | 0 / 0 | 31,72 | Ổn định |
| E04 | 1 | 2/2 | 0 | 0 | 0 | 0 / 0 | 24,24 | Giới thiệu + hạn nộp |
| E04 | 2 | 2/2 | 0 | 0 | 0 | 0 / 0 | 21,78 | Ổn định |
| E05 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 15,19 | Giữ URL nguồn |
| E05 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 14,53 | Ổn định |
| E06 | 1 | 0/0 | 0 | 0 | 0 | 0 / 0 | 1,93 | Mẫu âm đạt |
| E06 | 2 | 0/0 | 0 | 0 | 0 | 0 / 0 | 0,67 | Mẫu âm đạt |
| E07 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 9,39 | Chỉ có ngày → `start.date` |
| E07 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 8,17 | Ổn định |
| E08 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 11,23 | Thiếu năm → không đoán năm |
| E08 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 10,88 | Ổn định |
| E09 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 20,81 | Giữ `end` |
| E09 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 19,98 | Ổn định |
| E10 | 1 | 0/1 | 1 | 1 | 0 | 0 / 0 | 11,93 | Trả `start=null`, `ngay_tuong_doi`; không quy đổi |
| E10 | 2 | 0/1 | 1 | 1 | 0 | 0 / 0 | 10,71 | Lặp lại cùng hành vi |
| E11 | 1 | 3/3 | 0 | 0 | 0 | 0 / 0 | 31,93 | 3 hoạt động cùng ngày |
| E11 | 2 | 3/3 | 0 | 0 | 0 | 0 / 0 | 30,35 | Ổn định |
| E12 | 1 | 2/2 | 0 | 0 | 0 | 0 / 0 | 23,23 | Hai sự kiện gốc |
| E12 | 2 (quét lại) | 0 mới | — | — | — | 0 / 0 | 21,22 | 2 bản trùng bị chặn |
| E12 | 3 (paraphrase) | 0/2 | 2 | 0 | 0 | 0 / 0 | 22,10 | Tiêu đề trùng khít; dedup chặn 2 bản, không có gợi ý |
| E13 | 1 | 0/1 | 1 | 0 | 0 | 0 / 0 | 1,16 | Trả rỗng; không theo injection |
| E13 | 2 | 0/1 | 1 | 1 | 0 | 0 / 0 | 12,18 | Đúng ngày nhưng tiêu đề sai (“Họp nhóm đồ án”) |
| E14 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 18,48 | `truncated`; 4 chunk |
| E14 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 18,50 | `truncated`; 4 chunk |
| E15 | 1 | 2/2 | 0 | 0 | 0 | 0 / 0 | 21,33 | Khớp hồ sơ có/không dấu |
| E15 | 2 | 2/2 | 0 | 0 | 0 | 0 / 0 | 20,08 | Ổn định |

### 2.2. Qwen3.5-4B Q5_K_S

| Mẫu | Lần | Đúng / kỳ vọng | Thiếu | Thừa | Ngày bịa | JSON lỗi / retry | Latency (s) | Ghi chú |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| E01 | 1 | 2/2 | 0 | 0 | 0 | 0 / 0 | 10,14 | Giữ `start.date` cho hạn nộp |
| E01 | 2 | 2/2 | 0 | 0 | 0 | 0 / 0 | 5,24 | Ổn định |
| E02 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 5,01 | Giữ start/end |
| E02 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 4,75 | Ổn định |
| E03 | 1 | 0/3 | 3 | 1 | 0 | 0 / 0 | 5,61 | Gộp 3 phiên thành 1 sự kiện (08:30–14:00) |
| E03 | 2 | 0/3 | 3 | 1 | 0 | 0 / 0 | 5,23 | Lặp lại cùng lỗi |
| E04 | 1 | 1/2 | 1 | 1 | 0 | 0 / 0 | 5,74 | “Hạn nộp hồ sơ” mất ngày/giờ, `nam_chua_ro` |
| E04 | 2 | 1/2 | 1 | 1 | 0 | 0 / 0 | 5,37 | Lặp lại cùng lỗi |
| E05 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 3,57 | Ngày đúng; có cờ `nam_chua_ro` thừa |
| E05 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 3,20 | Ổn định |
| E06 | 1 | 0/0 | 0 | 0 | 0 | 0 / 0 | 0,56 | Mẫu âm đạt |
| E06 | 2 | 0/0 | 0 | 0 | 0 | 0 / 0 | 0,21 | Mẫu âm đạt |
| E07 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 2,62 | Chỉ có ngày → `start.date` |
| E07 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 2,28 | Ổn định |
| E08 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 2,65 | Thiếu năm → không đoán năm |
| E08 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 2,31 | Ổn định |
| E09 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 4,58 | Giữ `end` |
| E09 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 4,22 | Ổn định |
| E10 | 1 | 0/1 | 1 | 1 | 0 | 0 / 0 | 2,66 | Trả `start=null`, `ngay_tuong_doi`; không quy đổi |
| E10 | 2 | 0/1 | 1 | 1 | 0 | 0 / 0 | 2,30 | Lặp lại cùng hành vi |
| E11 | 1 | 3/3 | 0 | 0 | 0 | 0 / 0 | 8,47 | 3 hoạt động cùng ngày |
| E11 | 2 | 3/3 | 0 | 0 | 0 | 0 / 0 | 8,03 | Ổn định |
| E12 | 1 | 1/2 | 1 | 1 | 0 | 0 / 0 | 5,32 | “Nộp báo cáo giữa kỳ” mất ngày/giờ |
| E12 | 2 (quét lại) | 0 mới | — | — | — | 0 / 0 | 5,67 | 2 bản trùng bị chặn |
| E12 | 3 (paraphrase) | 0/2 | 2 | 0 | 0 | 0 / 0 | 5,44 | Tiêu đề trùng khít; dedup chặn 2 bản |
| E13 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 2,68 | Đúng “Họp lớp”; không theo injection |
| E13 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 2,59 | Ổn định |
| E14 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 5,39 | `truncated`; 4 chunk |
| E14 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 5,40 | `truncated`; 4 chunk |
| E15 | 1 | 2/2 | 0 | 0 | 0 | 0 / 0 | 5,51 | Khớp hồ sơ có/không dấu |
| E15 | 2 | 2/2 | 0 | 0 | 0 | 0 / 0 | 5,01 | Ổn định |

### 2.3. Ternary-Bonsai-2-27B PTQ1_0

| Mẫu | Lần | Đúng / kỳ vọng | Thiếu | Thừa | Ngày bịa | JSON lỗi / retry | Latency (s) | Ghi chú |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| E01 | 1 | 2/2 | 0 | 0 | 0 | 0 / 0 | 83,44 | Giữ `start.date` cho hạn nộp |
| E01 | 2 | 2/2 | 0 | 0 | 0 | 0 / 0 | 81,67 | Ổn định |
| E02 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 67,01 | Giữ start/end, không tách đôi |
| E02 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 61,31 | Ổn định |
| E03 | 1 | 3/3 | 0 | 0 | 0 | 0 / 0 | 127,30 | 3 phiên cùng ngày; chậm nhất bộ mẫu |
| E03 | 2 | 3/3 | 0 | 0 | 0 | 0 / 0 | 119,21 | Ổn định nhưng vẫn > 90 s |
| E04 | 1 | 1/2 | 1 | 1 | 0 | 0 / 0 | 81,09 | “Hạn nộp hồ sơ thực tập” mất ngày/giờ dù quote đúng |
| E04 | 2 | 1/2 | 1 | 1 | 0 | 0 / 0 | 77,02 | Lặp lại cùng lỗi |
| E05 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 49,57 | Giữ URL nguồn |
| E05 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 45,18 | Ổn định |
| E06 | 1 | 0/0 | 0 | 0 | 0 | 0 / 0 | 5,98 | Mẫu âm đạt |
| E06 | 2 | 0/0 | 0 | 0 | 0 | 0 / 0 | 2,04 | Mẫu âm đạt |
| E07 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 24,57 | Chỉ có ngày → `start.date` |
| E07 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 36,14 | Ổn định |
| E08 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 49,06 | Thiếu năm → không đoán năm |
| E08 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 45,05 | Ổn định |
| E09 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 41,70 | Giữ `end` |
| E09 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 38,25 | Ổn định |
| E10 | 1 | 0/1 | 1 | 1 | 0 | 0 / 0 | 27,88 | Trả `start=null`, `ngay_tuong_doi`; không quy đổi |
| E10 | 2 | 0/1 | 1 | 1 | 0 | 0 / 0 | 22,70 | Lặp lại cùng hành vi |
| E11 | 1 | 3/3 | 0 | 0 | 0 | 0 / 0 | 118,94 | 3 hoạt động cùng ngày |
| E11 | 2 | 3/3 | 0 | 0 | 0 | 0 / 0 | 112,65 | Ổn định nhưng vẫn > 90 s |
| E12 | 1 | 2/2 | 0 | 0 | 0 | 0 / 0 | 78,48 | Hai sự kiện gốc |
| E12 | 2 (quét lại) | 0 mới | — | — | — | 0 / 0 | 74,52 | 2 bản trùng bị chặn |
| E12 | 3 (paraphrase) | 1/2 | 1 | 1 | 0 | 0 / 0 | 80,42 | “Nộp báo cáo giữa kỳ” mất ngày/giờ; 1 gợi ý trùng, 1 tiêu đề không khớp |
| E13 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 26,19 | Đúng “Lớp họp”; không theo injection |
| E13 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 42,62 | Ổn định, tốt hơn 9B |
| E14 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 52,38 | `truncated`; 4 chunk |
| E14 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 52,07 | `truncated`; 4 chunk |
| E15 | 1 | 2/2 | 0 | 0 | 0 | 0 / 0 | 76,38 | Khớp hồ sơ có/không dấu |
| E15 | 2 | 2/2 | 0 | 0 | 0 | 0 / 0 | 72,36 | Ổn định |

## 3. So sánh tổng hợp

| Chỉ số | 9B IQ4_XS | 4B Q5_K_S | 27B PTQ1_0 | Ngưỡng | Kết luận |
|---|---:|---:|---:|---:|---|
| Recall lần 1 | **90,9%** (20/22) | **72,7%** (16/22) | **90,9%** (20/22) | ≥ 80% | 9B và 27B đạt; 4B không đạt |
| Recall lần 2 | **90,0%** (18/20) | **75,0%** (15/20) | **90,0%** (18/20) | ≥ 80% | 9B và 27B đạt; 4B không đạt |
| Precision lần 1 | 95,2% | 80,0% | 90,9% | — | 9B cao nhất |
| Số ngày/giờ bịa | **0** | **0** | **0** | 0 | Cả ba đạt |
| JSON hợp lệ sau ≤ 1 retry | **100%** (0 lỗi, 0 retry) | **100%** (0 lỗi, 0 retry) | **100%** (0 lỗi, 0 retry) | ≥ 95% | Cả ba đạt |
| Latency p95 | 34,0 s | **10,1 s** | **127,3 s** | ≤ 90 s | 9B và 4B đạt; **27B không đạt** |
| Latency trung vị | 19,6 s | **5,0 s** | 52,4 s | — | 4B nhanh nhất; 27B chậm hơn 9B ~2,7 lần |
| Quét lại E12: bản ghi mới | **0** | **0** | **0** | 0 | Cả ba đạt |
| Số mẫu bị cắt (`truncated`) | 1 (E14) | 1 (E14) | 1 (E14) | — | Như nhau |
| Thời gian duyệt trung bình | Chưa đo | Chưa đo | Chưa đo | ≤ 2 phút/trang | Chưa đo |

> p95 của 27B tính trên 15 lượt chạy lần 1 là 127,3 s (cao nhất là E03); gộp cả 29 lượt
> chạy mới là 119,2 s, vẫn vượt ngưỡng 90 s. Trung vị lần 1 là 52,4 s; trung bình 60,7 s.

## 4. Nhận xét

### 4.1. Qwen3.5-9B IQ4_XS

- **Đạt:** E01–E09, E11, E12 (lần 1), E14, E15. Giữ đúng ngày chỉ có ngày, không đoán năm,
  không sinh sự kiện từ mẫu âm, giữ khoảng thời gian, cắt tài liệu dài đúng.
- **Không đạt:**
  - **E10:** cả hai lần trả `start=null` kèm `ngay_tuong_doi`, `nam_chua_ro`; không quy đổi
    “Thứ Ba tuần sau” thành 27/10/2026. Không bịa ngày nhưng thiếu ngày.
  - **E13:** lần 1 trả rỗng; lần 2 đúng ngày nhưng tiêu đề “Họp nhóm đồ án” thay vì
    “Họp lớp” → thiếu + thừa. Không làm theo injection, không bịa 1/1/2030.
- **Điểm mạnh:** recall cao nhất, xử lý nhiều sự kiện cùng ngày và khoảng thời gian tốt.
- **Điểm yếu:** chậm hơn 4B; vẫn sai tiêu đề ở E13.

### 4.2. Qwen3.5-4B Q5_K_S

- **Đạt:** E01, E02, E05–E09, E11, E13, E14, E15. Đặc biệt E13 tốt hơn 9B: trích đúng
  “Họp lớp”, không theo injection.
- **Không đạt:**
  - **E03:** gộp 3 phiên seminar thành một sự kiện 08:30–14:00 → mất 3 sự kiện.
  - **E04:** “Hạn nộp hồ sơ” mất ngày/giờ dù nguồn ghi rõ `17:00 ngày 10/11/2026`.
  - **E12:** “Nộp báo cáo giữa kỳ” mất ngày/giờ dù nguồn ghi rõ `17:00 ngày 20/11/2026`.
  - **E10:** cùng hành vi với 9B — không quy đổi ngày tương đối.
- **Điểm mạnh:** nhanh hơn ~3,4 lần, không bịa ngày, JSON ổn định, chống injection tốt.
- **Điểm yếu:** recall dưới ngưỡng; bỏ sót nhiều sự kiện trong cùng tài liệu và làm rơi
  ngày/giờ ở một số sự kiện.

### 4.3. Ternary-Bonsai-2-27B PTQ1_0

- **Đạt:** E01–E03, E05–E09, E11, E12 (lần 1), E13, E14, E15. Giữ đúng ngày chỉ có ngày,
  không đoán năm, không sinh sự kiện từ mẫu âm, giữ khoảng thời gian, cắt tài liệu dài đúng.
  E13 tốt hơn 9B: cả hai lần đều trả đúng “Lớp họp”, không theo prompt injection.
- **Không đạt:**
  - **E04:** cả hai lần trả “Hạn nộp hồ sơ thực tập” nhưng để `start=null` dù quote đúng
    “17:00 ngày 10/11/2026” → thiếu + thừa. Đây là lỗi quan trọng vì mốc hạn nộp mất ngày.
  - **E10:** trả `start=null` kèm `ngay_tuong_doi`, `nam_chua_ro`; không quy đổi
    “Thứ Ba tuần sau”. Không bịa ngày nhưng thiếu ngày.
  - **E12 paraphrase:** “Nộp báo cáo giữa kỳ” mất ngày/giờ ở bản paraphrase; 1 sự kiện có
    1 gợi ý trùng, sự kiện còn lại đổi tiêu đề nên không khớp danh sách kiểm tra.
- **Điểm mạnh:** recall ngang 9B (90,9%), precision 90,9%, 0 ngày bịa, 0 lỗi JSON/retry,
  chống injection tốt, xử lý 3 sự kiện cùng ngày chính xác.
- **Điểm yếu:** **p95 127,3 s vượt ngưỡng cứng 90 s**; hai mẫu E03/E11 mất gần 2 phút mỗi
  lượt. Vẫn rơi ngày/giờ ở sự kiện dạng “hạn nộp” (E04, E12 paraphrase). File 5,9 GB và
  chậm hơn 9B ~2,7 lần mà không tăng recall, nên không có lợi thế so với 9B.

### 4.4. Điểm chung và lưu ý

- Cả ba model đều **không bịa ngày** và **không có lỗi JSON/retry**.
- Cả ba đều không quy đổi ngày tương đối ở E10; đây là hành vi an toàn nhưng làm giảm recall.
- E12 paraphrase: 9B và 4B trả tiêu đề trùng khít lần đầu nên dedup chặn 2 bản. 27B đổi tiêu đề
  “Họp nhóm đồ án giữa kỳ” nên tạo 1 bản mới và có 1 gợi ý trùng; sự kiện còn lại mất ngày/giờ
  và đổi tiêu đề nên không khớp danh sách kiểm tra. Nhánh “gợi ý trùng” đã có bằng chứng một
  phần với model thật, chưa đủ 2/2; đây là giới hạn của fixture, không phải lỗi dedup.
- Chưa đo thời gian duyệt trên UI và chưa chạy qua Chrome trong các lần đo này.

## 5. Chốt model

- **Model chốt cho demo:** **Qwen3.5-9B IQ4_XS**.
- **Lý do (số đo):** là ứng viên duy nhất đạt đủ tiêu chí cứng — recall 90,9%, 0 ngày bịa,
  JSON hợp lệ 100%, p95 34,0 s, quét lại 0 bản ghi mới.
- **4B bị loại:** recall 72,7% (lần 1) và 75,0% (lần 2), dưới ngưỡng 80%, dù nhanh hơn và
  không bịa ngày. Không hạ ngưỡng để chọn 4B.
- **27B bị loại:** recall 90,9% / 90,0% và 0 ngày bịa, nhưng p95 127,3 s vượt ngưỡng cứng
  90 s. Không hạ ngưỡng latency để chọn 27B; model cũng chậm hơn 9B ~2,7 lần mà không tăng
  recall.
- **Đánh đổi:** 9B dùng ~5,5 GB, chỉ 16 layer lên GPU 4 GB, 20–34 s/trang ngắn. 4B dùng
  ~3,2 GB, toàn bộ layer lên GPU, 2–10 s/trang; nếu tốc độ/VRAM là ưu tiên, cần cải thiện
  prompt cho 4B (tách nhiều sự kiện, giữ ngày/giờ) rồi đo lại. 27B dùng ~5,9 GB, 32 layer lên
  GPU, 22–127 s/trang nhưng vẫn rơi ngày ở mốc “hạn nộp”.
- **Không hard-code model:** ô “Tên model” vẫn để trống được; lựa chọn 9B chỉ ghi trong tài liệu.
- **Việc cần làm tiếp:** giữ nguyên ngưỡng nghiệm thu. Nếu cần tăng tốc/giảm VRAM, cải thiện
  prompt cho 4B (tách nhiều sự kiện, giữ ngày/giờ) rồi đo lại; không hạ ngưỡng recall.
  Khi dùng demo, nạp file 9B vào `llama-server` (lần đo 2026-10-26 máy đang nạp 27B).

## 6. Bằng chứng kèm theo

- [x] Log JSON 9B: `/tmp/opencode/slice-e-live-9b.log` (tệp tạm, không commit).
- [x] Log JSON 4B: `/tmp/opencode/slice-e-live-4b.log` (tệp tạm, không commit).
- [x] Log JSON 27B: `/tmp/opencode/slice-e-live-27b-ternary.log` (tệp tạm, không commit).
- [ ] Ảnh chụp bảng kết quả hoặc JSON export (nếu có).
- [x] Log job lỗi/retry: không có lỗi; 0 retry ở cả ba model.
- [x] Ghi chú các mẫu đã ẩn danh; không kèm dữ liệu cá nhân thật.
