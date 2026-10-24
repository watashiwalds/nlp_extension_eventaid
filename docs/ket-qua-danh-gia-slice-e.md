# Kết quả đánh giá Slice E

> **Trạng thái:** mẫu bảng chờ đo — **chưa có số liệu**. Điền sau khi chạy bộ mẫu theo
> [`ban-giao-slice-e.md`](./ban-giao-slice-e.md) §6. Không dùng số liệu của `MockProvider`
> trong bảng này; mock chỉ dùng cho test CI.

## 1. Cấu hình đo

| Trường | Giá trị |
|---|---|
| Ngày chạy |  |
| Người chạy |  |
| Build llama.cpp |  |
| File GGUF / model |  |
| Quant |  |
| Context (`-c`) |  |
| `-ngl` |  |
| GPU / CPU |  |
| `temperature` / `maxTokens` |  |
| `chunkChars` / `maxChunks` |  |
| Prompt version |  |
| Chrome / extension build |  |
| Ghi chú |  |

## 2. Kết quả từng mẫu

Mỗi mẫu chạy tối thiểu 2 lần; E12 dùng lần 2 để kiểm tra dedup. Ghi `—` nếu không áp dụng.

| Mẫu | Lần | Đúng / kỳ vọng | Thiếu | Thừa | Ngày bịa | JSON lỗi / retry | Latency (s) | Ghi chú |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| E01 | 1 |  |  |  |  |  |  |  |
| E01 | 2 |  |  |  |  |  |  |  |
| E02 | 1 |  |  |  |  |  |  |  |
| E02 | 2 |  |  |  |  |  |  |  |
| E03 | 1 |  |  |  |  |  |  |  |
| E03 | 2 |  |  |  |  |  |  |  |
| E04 | 1 |  |  |  |  |  |  |  |
| E04 | 2 |  |  |  |  |  |  |  |
| E05 | 1 |  |  |  |  |  |  |  |
| E05 | 2 |  |  |  |  |  |  |  |
| E06 | 1 |  |  |  |  |  |  |  |
| E06 | 2 |  |  |  |  |  |  |  |
| E07 | 1 |  |  |  |  |  |  |  |
| E07 | 2 |  |  |  |  |  |  |  |
| E08 | 1 |  |  |  |  |  |  |  |
| E08 | 2 |  |  |  |  |  |  |  |
| E09 | 1 |  |  |  |  |  |  |  |
| E09 | 2 |  |  |  |  |  |  |  |
| E10 | 1 |  |  |  |  |  |  |  |
| E10 | 2 |  |  |  |  |  |  |  |
| E11 | 1 |  |  |  |  |  |  |  |
| E11 | 2 |  |  |  |  |  |  |  |
| E12 | 1 |  |  |  |  |  |  |  |
| E12 | 2 (quét lại) |  |  |  |  |  |  |  |
| E13 | 1 |  |  |  |  |  |  |  |
| E13 | 2 |  |  |  |  |  |  |  |
| E14 | 1 |  |  |  |  |  |  |  |
| E14 | 2 |  |  |  |  |  |  |  |
| E15 | 1 |  |  |  |  |  |  |  |
| E15 | 2 |  |  |  |  |  |  |  |

## 3. Tổng hợp

| Chỉ số | Kết quả | Ngưỡng | Đạt? |
|---|---:|---:|---|
| Recall sự kiện quan trọng |  | ≥ 80% |  |
| Precision (tham khảo) |  | — |  |
| Số ngày/giờ bịa |  | 0 |  |
| JSON hợp lệ sau ≤ 1 retry |  | ≥ 95% |  |
| Latency p95 |  | ≤ 90 s |  |
| Latency trung vị |  | — |  |
| Quét lại cùng output: bản ghi mới |  | 0 |  |
| Thời gian duyệt trung bình |  | ≤ 2 phút/trang |  |
| Số mẫu bị cắt (`truncated`) |  | — |  |

## 4. Nhận xét

- **Mẫu đạt tốt:**
- **Mẫu bỏ sót / sai:**
- **Ngày/giờ cần kiểm tra lại:**
- **Vấn đề prompt/model:**
- **Vấn đề pipeline/UI (nếu có):**

## 5. Kết luận model

- **Model khuyến nghị:**
- **Lý do (số đo):**
- **Đánh đổi (latency/VRAM/recall):**
- **Model dự phòng:**
- **Việc cần làm tiếp:**

## 6. Bằng chứng kèm theo

- [ ] Ảnh chụp bảng kết quả hoặc JSON export (nếu có).
- [ ] Log job lỗi/retry (nếu có).
- [ ] Ghi chú các mẫu đã ẩn danh; không kèm dữ liệu cá nhân thật.
