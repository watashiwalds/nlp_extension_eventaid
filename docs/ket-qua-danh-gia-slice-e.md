# Kết quả đánh giá Slice E

> **Trạng thái:** đã đo **4 model** bằng `llama-server` thật: Qwen3.5-9B IQ4_XS và
> Qwen3.5-4B Q5_K_S ngày 2026-10-24, Ternary-Bonsai-2-27B PTQ1_0 ngày 2026-10-26,
> Ternary-Bonsai-2-9B PQ2_0 ngày 2026-11-09.
> **Kết luận:** giữ **Qwen3.5-9B IQ4_XS** cho demo; **Qwen3.5-4B Q5_K_S bị loại** vì recall
> dưới ngưỡng 80%; **Ternary-Bonsai-2-27B PTQ1_0 bị loại** vì p95 127,3 s vượt ngưỡng 90 s,
> dù recall ngang 9B và không bịa ngày; **Ternary-Bonsai-2-9B PQ2_0** đạt đủ tiêu chí cứng và
> nhanh nhất (p95 6,7 s) nhưng recall chỉ 81,8% / 80,0% — sát ngưỡng hơn 9B IQ4_XS — nên
> 9B IQ4_XS vẫn được giữ (§5).
> **Lưu ý (cập nhật 2026-11-10):** các bảng §1–§6 dùng **prompt v4** (hồ sơ lịch sử).
> Prompt hiện là **v5** (suy đoán có gắn cờ: `nam_suy_doan`, `gio_suy_doan`), bộ mẫu 17
> (E08 lật kỳ vọng, thêm E16/E17) — số đo v5 cho cả hai model 9B nằm ở §7
> (xem `ke-hoach-llm-trich-xuat.md` §6.1).
> Số liệu dưới đây không phải `MockProvider`.

## 1. Cấu hình đo

| Trường | Qwen3.5-9B IQ4_XS | Qwen3.5-4B Q5_K_S | Ternary-Bonsai-2-27B PTQ1_0 | Ternary-Bonsai-2-9B PQ2_0 |
|---|---|---|---|---|
| Ngày chạy | 2026-10-24 | 2026-10-24 | 2026-10-26 | 2026-11-09 |
| Người chạy | OpenCode agent | OpenCode agent | OpenCode agent | OpenCode agent |
| Build llama.cpp | b10101 (`4310aa4f8`) | b10101 (`4310aa4f8`) | b10827 (`c96baf4ab`) | b10827 (`c96baf4ab`) |
| File GGUF | `Qwen_Qwen3.5-9B-IQ4_XS.gguf` | `Qwen_Qwen3.5-4B-Q5_K_S.gguf` | `Ternary-Bonsai-2-27B-PTQ1_0.gguf` | `Ternary-Bonsai-2-9B-PQ2_0-MTP-Q8_0.gguf` |
| Quant | IQ4_XS (4.25 bpw) | Q5_K_S | PTQ1_0 ternary (1,75 bpw, group 128) | PQ2_0 (2,13 bpw, group 128; biến thể MTP) |
| Kích thước / tham số | ~5,5 GB / 9,2B | ~3,2 GB / 4,3B | ~5,9 GB / 26,9B | ~2,66 GB / 9,2B |
| Context (`-c`) | 8192 | 8192 | 8192 | 6144 (đọc từ `/props`, server chạy 2 slot) |
| `-ngl` | 16 | 99 | 32 | Không đọc được từ server; `llama-server` chiếm 2780/4096 MiB VRAM → gần như toàn bộ model trên GPU |
| GPU / CPU | RTX 3050 Laptop 4 GB + CPU, 6 threads | RTX 3050 Laptop 4 GB + CPU, 6 threads | RTX 3050 Laptop 4 GB + CPU, 6 threads (Ryzen 5 5600H) | RTX 3050 Laptop 4 GB + CPU (cùng máy Ryzen 5 5600H) |
| `temperature` / `maxTokens` | 0.1 / 1200 | 0.1 / 1200 | 0.1 / 1200 | 0.1 / 1200; server để mặc định `top_k 20`, `top_p 0,8`, `presence_penalty 1,5` (request chỉ ghi đè `temperature`) |
| `chunkChars` / `maxChunks` | 5000 / 4 | 5000 / 4 | 5000 / 4 | 5000 / 4 |
| Prompt version | v4 | v4 | v4 | v4 |
| Chrome / extension build | Không qua Chrome; harness Node/Vitest, extension 0.1.0 | Không qua Chrome; harness Node/Vitest, extension 0.1.0 | Không qua Chrome; harness Node/Vitest, extension 0.1.0 (`29ab44f`) | Không qua Chrome; harness Node/Vitest, extension 0.1.0 |
| Ghi chú | KV cache `q8_0`; mỗi mẫu 2 lần; E12 lần 2 quét lại, lần 3 paraphrase | KV cache `q8_0`; cùng bộ mẫu và cùng prompt | KV cache `q8_0`; cùng bộ mẫu và cùng prompt; model ternary 27B | Model ternary 9B lượng tử hoá mạnh (2,13 bpw); sampler ngoài `temperature` là mặc định của build b10827; mỗi mẫu 2 lần; E12 lần 2 quét lại, lần 3 paraphrase |

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

### 2.4. Ternary-Bonsai-2-9B PQ2_0

| Mẫu | Lần | Đúng / kỳ vọng | Thiếu | Thừa | Ngày bịa | JSON lỗi / retry | Latency (s) | Ghi chú |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| E01 | 1 | 2/2 | 0 | 0 | 0 | 0 / 0 | 6,01 | Giữ `start.date` cho hạn nộp; cờ `nam_chua_ro` thừa (nguồn có ghi năm) |
| E01 | 2 | 2/2 | 0 | 0 | 0 | 0 / 0 | 3,57 | Ổn định |
| E02 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 3,85 | Giữ start/end, không tách đôi |
| E02 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 3,41 | Ổn định |
| E03 | 1 | 3/3 | 0 | 0 | 0 | 0 / 0 | 6,08 | 3 phiên cùng ngày |
| E03 | 2 | 3/3 | 0 | 0 | 0 | 0 / 0 | 5,50 | Ổn định |
| E04 | 1 | 0/2 | 2 | 2 | 0 | 0 / 0 | 4,33 | “Hạn nộp hồ sơ” mất ngày/giờ dù quote đúng; trả “Mở đơn đăng ký thực tập” thay buổi giới thiệu |
| E04 | 2 | 0/2 | 2 | 2 | 0 | 0 / 0 | 3,72 | Lặp lại cùng lỗi |
| E05 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 2,95 | Trích đúng sự kiện, ngày/giờ khớp |
| E05 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 2,42 | Ổn định |
| E06 | 1 | 0/0 | 0 | 0 | 0 | 0 / 0 | 0,65 | Mẫu âm đạt |
| E06 | 2 | 0/0 | 0 | 0 | 0 | 0 / 0 | 0,14 | Mẫu âm đạt |
| E07 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 2,12 | Chỉ có ngày → `start.date` |
| E07 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 1,63 | Ổn định |
| E08 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 2,31 | Thiếu năm → không đoán năm |
| E08 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 1,83 | Ổn định |
| E09 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 3,65 | Giữ `end` |
| E09 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 3,16 | Ổn định |
| E10 | 1 | 0/1 | 1 | 1 | 0 | 0 / 0 | 2,25 | Trả `start=null`, `ngay_tuong_doi`; không quy đổi |
| E10 | 2 | 0/1 | 1 | 1 | 0 | 0 / 0 | 1,76 | Lặp lại cùng hành vi |
| E11 | 1 | 3/3 | 0 | 0 | 0 | 0 / 0 | 6,72 | 3 hoạt động cùng ngày |
| E11 | 2 | 3/3 | 0 | 0 | 0 | 0 / 0 | 6,11 | Ổn định |
| E12 | 1 | 2/2 | 0 | 0 | 0 | 0 / 0 | 4,44 | Hai sự kiện gốc |
| E12 | 2 (quét lại) | 0 mới | — | — | — | 0 / 0 | 3,90 | 2 bản trùng bị chặn |
| E12 | 3 (paraphrase) | 0/2 | 2 | 0 | 0 | 0 / 0 | 4,47 | Trích được 2 sự kiện, dedup chặn cả 2; không có gợi ý (như 9B IQ4_XS) |
| E13 | 1 | 0/1 | 1 | 1 | 0 | 0 / 0 | 2,07 | Ngày/giờ đúng 9:00 ngày 2/11, không theo injection; tiêu đề “Lớp họp nhóm đồ án” chứa từ thừa nên không khớp matcher |
| E13 | 2 | 0/1 | 1 | 1 | 0 | 0 / 0 | 1,96 | Lặp lại cùng hành vi |
| E14 | 1 | 1/1 | 0 | 0 | 0 | 0 / 0 | 5,11 | `truncated`; 4 chunk |
| E14 | 2 | 1/1 | 0 | 0 | 0 | 0 / 0 | 5,11 | `truncated`; 4 chunk |
| E15 | 1 | 2/2 | 0 | 0 | 0 | 0 / 0 | 4,33 | Trích đúng 2 sự kiện |
| E15 | 2 | 2/2 | 0 | 0 | 0 | 0 / 0 | 3,82 | Ổn định |

## 3. So sánh tổng hợp

| Chỉ số | 9B IQ4_XS | 4B Q5_K_S | 27B PTQ1_0 | 9B PQ2_0 | Ngưỡng | Kết luận |
|---|---:|---:|---:|---:|---:|---|
| Recall lần 1 | **90,9%** (20/22) | **72,7%** (16/22) | **90,9%** (20/22) | 81,8% (18/22) | ≥ 80% | 9B, 27B, PQ2_0 đạt; 4B không đạt; PQ2_0 chỉ dư 1 sự kiện so với ngưỡng |
| Recall lần 2 | **90,0%** (18/20) | **75,0%** (15/20) | **90,0%** (18/20) | 80,0% (16/20) | ≥ 80% | 9B, 27B, PQ2_0 đạt; 4B không đạt; PQ2_0 đúng bằng ngưỡng |
| Precision lần 1 | 95,2% | 80,0% | 90,9% | 81,8% | — | 9B cao nhất |
| Số ngày/giờ bịa | **0** | **0** | **0** | **0** | 0 | Cả bốn đạt |
| JSON hợp lệ sau ≤ 1 retry | **100%** (0 lỗi, 0 retry) | **100%** (0 lỗi, 0 retry) | **100%** (0 lỗi, 0 retry) | **100%** (0 lỗi, 0 retry) | ≥ 95% | Cả bốn đạt |
| Latency p95 | 34,0 s | 10,1 s | **127,3 s** | **6,7 s** | ≤ 90 s | PQ2_0 nhanh nhất; **27B không đạt** |
| Latency trung vị | 19,6 s | 5,0 s | 52,4 s | **3,9 s** | — | PQ2_0 nhanh nhất; 27B chậm hơn 9B ~2,7 lần |
| Quét lại E12: bản ghi mới | **0** | **0** | **0** | **0** | 0 | Cả bốn đạt |
| E12 paraphrase | 2 bản bị dedup chặn, không gợi ý | 2 bản bị dedup chặn, không gợi ý | 1/2, 1 gợi ý trùng | 2 bản bị dedup chặn, không gợi ý | — | PQ2_0 giống 9B/4B; nhánh “gợi ý trùng” chỉ có 27B chứng minh một phần |
| Số mẫu bị cắt (`truncated`) | 1 (E14) | 1 (E14) | 1 (E14) | 1 (E14) | — | Như nhau |
| Thời gian duyệt trung bình | Chưa đo | Chưa đo | Chưa đo | Chưa đo | ≤ 2 phút/trang | Chưa đo |

> p95 của 27B tính trên 15 lượt chạy lần 1 là 127,3 s (cao nhất là E03); gộp cả 29 lượt
> chạy mới là 119,2 s, vẫn vượt ngưỡng 90 s. Trung vị lần 1 là 52,4 s; trung bình 60,7 s.
> p95 của PQ2_0 tính trên 15 lượt chạy lần 1 là 6,7 s (min 0,65 s ở E06, max 6,72 s ở E11);
> trung vị 3,9 s. Lần 2: p95 6,1 s, trung vị 3,2 s.

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

### 4.4. Ternary-Bonsai-2-9B PQ2_0

- **Đạt:** E01–E03, E05–E09, E11, E12 (lần 1 + quét lại), E14, E15. Giữ đúng ngày chỉ có ngày,
  không đoán năm, không sinh sự kiện từ mẫu âm, giữ khoảng thời gian, cắt tài liệu dài đúng.
  E12 paraphrase được trích 2 sự kiện và bị dedup chặn cả 2 — giống hành vi của 9B IQ4_XS.
- **Không đạt:**
  - **E04:** cả hai lần “Hạn nộp hồ sơ” để `start=null` (kèm `gio_chua_ro`, `do_tin_cay_thap`)
    dù quote đúng “17:00 ngày 10/11/2026” → thiếu + thừa; đồng thời trả “Mở đơn đăng ký thực tập”
    (9:00 ngày 3/11) thay cho “buổi giới thiệu”. Đây là lỗi quan trọng vì mốc hạn nộp mất ngày.
  - **E10:** trả `start=null` kèm `ngay_tuong_doi`, `nam_chua_ro`; không quy đổi “Thứ Ba tuần sau”.
    Không bịa ngày nhưng thiếu ngày — cùng hành vi với cả ba model còn lại.
  - **E13:** cả hai lần trả đúng ngày/giờ (9:00 ngày 2/11) và không làm theo injection, nhưng
    tiêu đề “Lớp họp nhóm đồ án” chứa từ thừa nên không khớp matcher → thiếu + thừa.
- **Lưu ý nhỏ:** E01 gắn cờ `nam_chua_ro` thừa cho “Nộp báo cáo giữa kỳ” dù nguồn ghi rõ năm
  (ngày vẫn đúng nên không ảnh hưởng metric).
- **Điểm mạnh:** nhanh nhất trong các model đã đo (p95 6,7 s, median 3,9 s) và file nhỏ nhất
  (~2,66 GB, PQ2_0 2,13 bpw); 0 ngày bịa, 0 lỗi JSON/retry, xử lý 3 sự kiện cùng ngày chính xác,
  chống injection tốt.
- **Điểm yếu:** recall chỉ 81,8% / 80,0% — sát ngưỡng 80% hơn hẳn 9B IQ4_XS (90,9%); lặp lại
  lỗi rơi ngày ở mốc “hạn nộp” (E04) như 4B và 27B. Cấu hình đo khác các lần trước: n_ctx 6144
  (thay vì 8192); sampler mặc định của server đã được kiểm chứng là không ảnh hưởng (§6 —
  output giống hệt giữa presence 1,5 và greedy).

### 4.5. Điểm chung và lưu ý

- Cả bốn model đều **không bịa ngày** và **không có lỗi JSON/retry**.
- Cả bốn đều không quy đổi ngày tương đối ở E10; đây là hành vi an toàn nhưng làm giảm recall.
- E12 paraphrase: 9B, 4B và PQ2_0 đều bị dedup chặn 2 bản nên không tạo ra gợi ý. 27B đổi tiêu đề
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
- **Đo bổ sung 2026-11-09 (chưa đổi chốt):** Ternary-Bonsai-2-9B PQ2_0 (2,13 bpw, ~2,66 GB,
  cùng build b10827) đạt đủ tiêu chí cứng — recall 81,8% / 80,0%, 0 ngày bịa, JSON 100%,
  p95 6,7 s — là model **nhanh nhất và nhỏ nhất** trong các ứng viên đã đo. Tuy nhiên:
  (a) recall chỉ dư 1–2 sự kiện so với ngưỡng (9B IQ4_XS dư 2–3 lần), (b) lặp lại lỗi mất
  ngày ở mốc “hạn nộp” (E04). Đo thêm 4 cấu hình sampler (§6) cho thấy chất lượng **không đổi**
  giữa các cấu hình — lỗi E04/E10/E13 là giới hạn của model/lượng tử hoá, không phải sampler —
  nên điều kiện “đo lại với `presence_penalty = 0`” đã bỏ; điều kiện còn lại là recall sát ngưỡng.
  Nếu người dùng chọn PQ2_0 để dùng (tốc độ/VRAM), cấu hình khuyên dùng là **greedy: đặt
  `temperature 0` trong cài đặt extension**; khi đó ghi nhận đổi chốt vào đây.
- **Đo bổ sung 2026-11-10 (prompt v5, cả hai model 9B):** trên bộ mẫu 17, IQ4_XS đạt
  recall 88,0% / 87,0% (mặc định server + temp 0,1 — ổn định giữa các lượt) và 96,0% /
  78,3% (bộ đề xuất Qwen, temp 0,7 — đỉnh cao L1 nhưng biến động); 0 ngày bịa, 0 lỗi JSON,
  p95 35,2 s. PQ2_0 trên cùng v5: 88,0% / 82,6%, p95 6,6 s (nhanh hơn ~5 lần). Cả hai đạt
  đủ tiêu chí cứng; E04 được giải trọn vẹn trên IQ4_XS ở temp 0,7. **Kết luận: giữ
  Qwen3.5-9B IQ4_XS làm model demo** (recall ổn định cao nhất, p95 35,2 s vẫn ≤ 90 s);
  PQ2_0 là phương án tốc độ/VRAM. Chi tiết §7.
- **Đánh đổi:** 9B dùng ~5,5 GB, chỉ 16 layer lên GPU 4 GB, 20–34 s/trang ngắn. 4B dùng
  ~3,2 GB, toàn bộ layer lên GPU, 2–10 s/trang; nếu tốc độ/VRAM là ưu tiên, cần cải thiện
  prompt cho 4B (tách nhiều sự kiện, giữ ngày/giờ) rồi đo lại. 27B dùng ~5,9 GB, 32 layer lên
  GPU, 22–127 s/trang nhưng vẫn rơi ngày ở mốc “hạn nộp”.
- **Không hard-code model:** ô “Tên model” vẫn để trống được; lựa chọn 9B chỉ ghi trong tài liệu.
- **Việc cần làm tiếp:** giữ nguyên ngưỡng nghiệm thu. Nếu cần tăng tốc/giảm VRAM, cải thiện
  prompt cho 4B (tách nhiều sự kiện, giữ ngày/giờ) rồi đo lại; không hạ ngưỡng recall.
  Khi dùng demo, nạp file 9B IQ4_XS vào `llama-server` (lần đo 2026-11-09 máy đang nạp
  Ternary-Bonsai-2-9B PQ2_0).

## 6. Đo tham số sampling trên 9B PQ2_0 (2026-11-09)

Câu hỏi: sampler mặc định của server b10827 (`presence_penalty 1,5`, `top_k 20`, `top_p 0,8`)
có phải nguyên nhân lỗi mất ngày ở E04 / trôi tiêu đề ở E13 không? Đo lại toàn bộ 15 mẫu
(Slice E, mỗi cấu hình 2 lần + E12 quét lại/paraphrase như §2) qua một proxy chèn tham số
vào request, giữ nguyên prompt v4, `chunkChars 5000 / maxChunks 4 / maxTokens 1200`.
Harness chạy với `LLAMA_ENDPOINT=http://127.0.0.1:8091`; proxy đọc bộ tham số chèn từ file
cho từng request rồi chuyển tiếp tới `:8080` (Node thuần, không đổi code extension).

| Cấu hình | Tham số chèn | Recall L1 / L2 | Ngày bịa L1/L2 | JSON lỗi | p95 / median |
|---|---|---:|---:|---:|---:|
| Baseline | không chèn — server: presence 1,5, top_k 20, top_p 0,8, temp 0,1 | 81,8% / 80,0% | 0 / 0 | 0 | 6,7 / 3,9 s |
| A — bỏ presence | `presence_penalty 0` (temp 0,1) | 81,8% / 80,0% | **1** / 0 | 0 | 6,2 / 3,9 s |
| B — sampling sạch | `presence 0, frequency 0, top_k 0, top_p 1,0` (temp 0,1) | 81,8% / 80,0% | 0 / 0 | 0 | 7,0 / 4,2 s |
| C — greedy | `temperature 0` + tham số B | 81,8% / 80,0% | 0 / 0 | 0 | 6,9 / 4,2 s |

Kết quả chính:

- **Output giống nhau giữa các cấu hình:** B và C giống hệt Baseline từng dòng (0/31 bản ghi
  khác biệt, gồm cả E12 quét lại và paraphrase). A khác 2 dòng (E08 lần 1 và E13 lần 1) —
  trong đó **E13 lần 1 của A bị prompt injection đánh lừa**, trả “Tiệc tại sao Hỏa 00:00 ngày
  1/1/2030” — sự kiện bịa duy nhất trong cả 4 cấu hình, xuất hiện ngẫu nhiên ở temp 0,1.
- **Sampling không làm đổi chất lượng:** E04 (mất ngày hạn nộp), E10 (ngày tương đối),
  E13 (trôi tiêu đề) lặp lại đúng như baseline ở mọi cấu hình → đây là giới hạn của
  model/lượng tử hoá PQ2_0 2,13 bpw với prompt hiện tại, không phải lỗi sampler.
- **Đối chiếu khuyến nghị của đội ngũ model (bổ sung 2026-11-09):** nhóm phát triển
  Ternary-Bonsai-2 khuyến nghị cho **non-thinking mode**: `temperature 0,7`, `top_p 0,80`,
  `top_k 20`, `min_p 0`, `presence_penalty 1,5`, `repeat_penalty 1,0`, cửa sổ penalty 64
  token — **trùng khớp cấu hình mặc định của server** (chỉ `temperature` bị harness ghi đè
  thành 0,1 per request; `presence_penalty` không có metadata trong GGUF nên được truyền
  bằng cờ launch, server đã chạy đúng). Cảnh báo "avoid greedy decoding with thinking on"
  không áp dụng trực tiếp vì bộ đo chạy thinking off, nhưng theo khuyến nghị thì **giữ bộ
  tham số của đội ngũ model làm cấu hình chuẩn** — server không cần đổi gì, và vì mọi cấu
  hình ở trên cho output giống nhau nên không đánh đổi chất lượng. Greedy chỉ dùng khi cần
  tái lập tất định cho thí nghiệm.
- `presence_penalty 1,5` của server **không gây hại** cho model này (B ≡ Baseline), nhưng
  server nào launch với cờ mặc định lạ thì vẫn nên kiểm chứng lại.

## 7. Đo prompt v5 trên 9B PQ2_0 (2026-11-09)

Prompt v5 (suy đoán có gắn cờ: `nam_suy_doan`, `gio_suy_doan` — xem
`ke-hoach-llm-trich-xuat.md` §6.1) được đo trên Ternary-Bonsai-2-9B PQ2_0 qua proxy,
bộ mẫu 17 (E08 lật kỳ vọng + E16/E17 mới), mỗi cấu hình 2 lần + E12 quét lại/paraphrase.

| Lần đo | Recall L1 | Recall L2 | Ngày bịa | JSON lỗi | p95 | Ghi chú |
|---|---:|---:|---:|---:|---:|---|
| v4 (tham chiếu, 15 mẫu) | 81,8% (18/22) | 80,0% (16/20) | 0 | 0 | 6,7 s | E04 0/2; E10, E13 |
| v5 đầu (temp 0,7 — khuyến nghị vendor) | 76,0% (19/25) | 78,3% (18/23) | 0 | 0 | 6,1 s | **Hồi quy E03** (3 phiên gộp thành 1); E17 bị tách 1→2 |
| v5 đầu (temp 0,1 — protocol cũ) | 76,0% (19/25) | 73,9% (17/23) | 0 | 0 | 6,3 s | Lặp lại hồi quy → lỗi do prompt, không phải temp |
| **v5 + quy tắc 7 sửa (temp 0,1)** | **88,0% (22/25)** | **82,6% (19/23)** | **0** | **0** | **6,6 s** | **Cấu hình chốt cho PQ2_0** |

Kết quả v5 (quy tắc 7 sửa):

- **E08 đạt**: “15/11 lúc 8h” → `2026-11-15T08:00` kèm `nam_suy_doan` — suy năm từ ngữ
  cảnh hoạt động trên model thật.
- **E16 đạt 2/2**: mốc có giờ nhận đủ `YYYY-MM-DDTHH:mm`; mốc chỉ có ngày giữ dạng
  `YYYY-MM-DD` kèm `nam_suy_doan` + `gio_chua_ro` đúng thiết kế.
- **E17 đạt 1/1 (cả hai lượt)**: “mở cửa … đóng cửa vào buổi tối” → MỘT sự kiện có
  `end=2026-12-07T19:00`, `raw` giữ cụm “buổi tối”, cờ `nam_suy_doan` + `gio_suy_doan`.
- **E04 cải thiện 0/2 → 1/2**: “Hạn nộp hồ sơ” có `2026-11-10T17:00` — lỗi mất ngày ở
  mốc hạn nộp của v4 được sửa nhờ suy năm. Phần còn thiếu là trôi tiêu đề (“Mở đơn đăng
  ký thực tập” ≠ “Buổi giới thiệu chương trình thực tập”) — giới hạn model.
- **E03 L1 3/3, L2 2/3** (trôi tiêu đề “Seminar khoa CNTT” ≠ “Khai mạc seminar”) — còn
  dao động nhẹ, theo dõi khi đo lại.
- E10 (ngày tương đối) và E13 (trôi tiêu đề sau injection) không đổi — giới hạn model.
- **Kết luận:** prompt v5 (quy tắc 7 sửa) vừa thêm tính năng suy đoán có gắn cờ vừa tăng
  recall so với v4 (88,0% so với 81,8% lần 1); giữ đủ tiêu chí cứng (0 ngày bịa, JSON
  100%, p95 6,6 s ≤ 90 s). Đây là cấu hình chốt cho PQ2_0: server giữ sampler mặc định
  theo khuyến nghị đội ngũ model; harness/extension dùng `temperature 0,1` như các lần
  đo trước để so sánh được (temp 0,7 cho kết quả tương đương về chất lượng).

**Bổ sung 2026-11-10 — IQ4_XS trên cùng prompt v5** (server nạp `Qwen_Qwen3.5-9B-IQ4_XS.gguf`,
n_ctx 8192, 2 slot; harness ghi đè `temperature 0,1` trừ dòng bộ đề xuất; mỗi cấu hình
2 lần + E12 quét lại/paraphrase):

| Cấu hình IQ4_XS | Recall L1 | Recall L2 | Precision L1 | Ngày bịa | JSON lỗi | p95 / median | Ghi chú |
|---|---:|---:|---:|---:|---:|---:|---|
| Mặc định server (`top_k 40`, `top_p 0,95`, `presence 0`, `min_p 0,05`) + temp 0,1 | 88,0% (22/25) | 87,0% (20/23) | 91,7% | 0 | 0 | 35,2 / 21,0 s | Ổn định: E03 đạt cả 2 lượt; fail E04 (trôi tiêu đề “Mở đơn”), E10, E13 |
| Đề xuất Qwen non-thinking (`temp 0,7`, `top_p 0,8`, `top_k 20`, `min_p 0`, `presence 1,5`) | **96,0% (24/25)** | 78,3% (18/23) | 100% | 0 | 0 | 39,5 / 19,4 s | L1 chỉ fail E10; **L2 rơi vì E03 gộp 3 phiên thành 1** (temp 0,7 biến động) |
| *Tham chiếu: PQ2_0 chốt (Ternary-rec + temp 0,1)* | *88,0% (22/25)* | *82,6% (19/23)* | *88,0%* | *0* | *0* | *6,6 / 4,0 s* | *Nhanh hơn ~5 lần* |

Nhận xét IQ4_XS trên v5:

- **Tính năng suy đoán có gắn cờ hoạt động trọn vẹn**: E08 → `2026-11-15T08:00` +
  `nam_suy_doan`; E16 2/2 (mốc chỉ có ngày giữ `YYYY-MM-DD` + `nam_suy_doan`,
  `gio_chua_ro`); E17 → MỘT sự kiện có `end=2026-12-07T19:00` kèm `nam_suy_doan`,
  `gio_suy_doan` (đúng ở cả hai cấu hình).
- **E04 giải được trọn vẹn**: ở bộ đề xuất (temp 0,7) L1 trả đúng cả hai tiêu đề và ngày
  (“Buổi giới thiệu chương trình thực tập” 3/11 9:00 + “Hạn nộp hồ sơ thực tập” 10/11
  17:00) — chứng tỏ lỗi “Mở đơn…” ở các lần khác chỉ là trôi tiêu đề, không phải mất khả
  năng trích mốc hạn.
- **Đánh đổi temp**: 0,7 cho đỉnh cao (96,0% L1, precision 100%, chỉ fail E10) nhưng L2
  rơi 78,3% do E03 gộp bản — biến động giữa các lượt; 0,1 ổn định 88,0/87,0. Với
  extension cần tin cậy thì **giữ temp 0,1**; hai đội ngũ model đề xuất cùng một bộ
  sampler (khác mỗi temp) nên bộ đề xuất dùng được khi chấp nhận dao động.
- **So với PQ2_0** (cùng v5, cùng temp 0,1): IQ4_XS recall ổn định cao hơn (87,0 so với
  82,6 lần 2), precision cao hơn (91,7 so với 88,0), nhưng chậm ~5 lần (p95 35,2 so với
  6,6 s). Cả hai đều đạt đủ tiêu chí cứng.
- E12 paraphrase trên IQ4_XS: dedup chặn 1/2, tạo 1 bản mới và 1 gợi ý trùng (`[1,-1]`) —
  nhánh “gợi ý trùng” có thêm bằng chứng một phần (như 27B trước đây).

## 8. Bằng chứng kèm theo

- [x] Log JSON 9B: `/tmp/opencode/slice-e-live-9b.log` (tệp tạm, không commit).
- [x] Log JSON 4B: `/tmp/opencode/slice-e-live-4b.log` (tệp tạm, không commit).
- [x] Log JSON 27B: `/tmp/opencode/slice-e-live-27b-ternary.log` (tệp tạm, không commit).
- [x] Log JSON 9B PQ2_0: `/tmp/opencode/slice-e-live-9b-ternary-pq2.log` (tệp tạm, không commit).
- [x] Log JSON sampler A/B/C trên 9B PQ2_0: `/tmp/opencode/slice-e-live-9b-pq2-sampler{A,B,C}.log` (tệp tạm, không commit).
- [x] Log JSON prompt v5 trên 9B PQ2_0: `slice-e-live-9b-pq2-promptV5.log` (temp 0,7), `…promptV5-t01.log` (temp 0,1), `…promptV5-r7.log` (quy tắc 7 sửa — chốt) trong `/tmp/opencode/` (tệp tạm, không commit).
- [x] Log JSON prompt v5 trên IQ4_XS: `/tmp/opencode/slice-e-live-9b-iq4xs-promptV5.log` (mặc định server + temp 0,1) và `…promptV5-rec.log` (bộ đề xuất Qwen, temp 0,7) (tệp tạm, không commit).
- [ ] Ảnh chụp bảng kết quả hoặc JSON export (nếu có).
- [x] Log job lỗi/retry: không có lỗi; 0 retry ở cả ba model.
- [x] Ghi chú các mẫu đã ẩn danh; không kèm dữ liệu cá nhân thật.
