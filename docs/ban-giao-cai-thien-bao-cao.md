# Bàn giao tiến độ hoàn thiện báo cáo — TASK 01–10

> **Cập nhật lần cuối:** 23/11/2026 (sau commit `5913ab3`). **Nhánh:** `main`.
> **Báo cáo đang làm việc:** [`bao-cao/Bao_cao_NLP_FINAL_Lan2.docx`](../bao-cao/Bao_cao_NLP_FINAL_Lan2.docx) (bản gốc đối chiếu giữ tại [`bao-cao/Bao_cao_NLP_FINAL_Lan1.docx`](../bao-cao/Bao_cao_NLP_FINAL_Lan1.docx), md5 `9347b164438ef94f3596613be619f8ef`).

---

## 1. Trạng thái 10 TASK trong kế hoạch (`bao-cao/ke-hoach-cai-thien-bao-cao.md`)

| TASK | Nội dung | Trạng thái | Bằng chứng / Ghi chú trong `Bao_cao_NLP_FINAL_Lan2.docx` |
|---|---|---|---|
| **Bước 0** | Kho bằng chứng `docs/evidence/` + bản làm việc `Lan2.docx` | ✅ **Đã hoàn thành** | [`docs/evidence/README.md`](evidence/README.md); `Lan1.docx` giữ nguyên |
| **TASK 01** | Ablation Raw LLM vs LLM + Hậu kiểm thời gian | ✅ **Đã hoàn thành & đưa vào báo cáo** | [`docs/evidence/postcheck-ablation.md`](evidence/postcheck-ablation.md), `postcheck-iq4_xs-2026-11-22.json` → **Mục 5.3.3 & Bảng 5.3** |
| **TASK 02** | Đóng băng Gold Set (17 mẫu / 25 sự kiện) + Quy tắc đối sánh + Field metrics | ✅ **Đã hoàn thành & đưa vào báo cáo** | `gold-freeze.test.ts`, `field-metrics.ts` → **Mục 5.3.1, Mục 5.3.2, Bảng 5.1 & Bảng 5.2** |
| **TASK 03** | Tập kiểm thử giữ kín 50 mẫu (30 dương / 39 sự kiện + 20 âm) | ✅ **Đã hoàn thành & đưa vào báo cáo** | [`docs/evidence/heldout-iq4_xs-2026-11-23.json`](evidence/heldout-iq4_xs-2026-11-23.json), `heldout-freeze.test.ts` → **Mục 5.3.4 & Bảng 5.4** |
| **TASK 04** | Đo đầu-cuối 3 chế độ sàng lọc PhoBERT (`off`/`report`/`screen`) + 3 thí nghiệm chẩn đoán (60 ngưỡng, cấp đoạn văn, tái trọng số lớp) | ✅ **Đã hoàn thành & đưa vào báo cáo** | [`docs/ket-qua-bo-loc.md`](ket-qua-bo-loc.md), `filter-*.json` → **Mục 5.4, Mục 5.5 & Bảng 5.6** |
| **TASK 05** | Phương pháp cơ sở dựa trên luật tất định (Rule-based Baseline) | ✅ **Đã hoàn thành & đưa vào báo cáo** | [`docs/evidence/rule-baseline-2026-11-23.md`](evidence/rule-baseline-2026-11-23.md), `rule-baseline.ts` → **Mục 5.3.5 & Bảng 5.5** |
| **TASK 06** | Rà soát nguồn gốc số liệu huấn luyện PhoBERT + chú thích minh bạch | ✅ **Đã hoàn thành & đưa vào báo cáo** | [`docs/evidence/phobert-handover.md`](evidence/phobert-handover.md) → **Cuối Mục 5.2** (kèm placeholder chữ đỏ nếu cần đính kèm log gốc) |
| **TASK 07** | Chụp 3–5 ảnh màn hình giao diện tiện ích mở rộng thật (S1–S4) | ⏳ **Chưa chụp ảnh — đã gắn Placeholder chữ đỏ** | Đã đặt **2 khung placeholder chữ đỏ** tại cuối **Mục 4.3** (ảnh S1) và cuối **Mục 4.7** (ảnh S2, S3, S4) trong `Lan2.docx` |
| **TASK 08** | Sửa test time-bomb, làm sạch repo, đồng bộ README & đoạn tái lập | ✅ **Đã hoàn thành & đưa vào báo cáo** | `529 test / 53 file` xanh (`461 pass, 68 skip`); đoạn tái lập + link GitHub đã đưa vào **Mục 5.1** |
| **TASK 09** | Bảng phân công công việc của 2 sinh viên | ⏳ **Đã chèn Bảng 1.1 kèm Placeholder chữ đỏ chờ nhóm xác nhận** | Đã chèn **Bảng 1.1** tại **Mục 1.5** kèm dòng nhắc chữ đỏ để hai thành viên xác nhận trước khi nộp |
| **TASK 10** | Cập nhật toàn văn báo cáo, chuẩn hoá thuật ngữ, Mục lục & Danh mục bảng | ✅ **Đã cập nhật vào `Lan2.docx` (còn rà soát các dòng chữ đỏ)** | Đã cập nhật toàn bộ Chương 1, 4, 5, 6, Mục lục và Danh mục hình vẽ/bảng biểu (Bảng 1.1, Hình 4.1, Bảng 5.1 → Bảng 5.6) |

---

## 2. Danh sách các vị trí đánh dấu Placeholder chữ đỏ trong `Bao_cao_NLP_FINAL_Lan2.docx` cần hoàn tất

Khi mở `bao-cao/Bao_cao_NLP_FINAL_Lan2.docx`, các mục chưa đủ thông tin hoặc cần người dùng/nhóm xác nhận đã được tô **chữ đỏ đậm (`#CC0000`)** để dễ tìm và xử lý:

1. **Trang bìa (dòng Giảng viên hướng dẫn):**
   - `[Học vị GV?]` cạnh tên giảng viên *Nguyễn Quang Trung* — xác nhận học vị chuẩn (ThS. / TS.) rồi xoá placeholder đỏ.
2. **Mục 1.5 (Bảng 1.1 — Phân công công việc, TASK 09):**
   - `[CẦN NHÓM XÁC NHẬN CHÍNH THỨC BẢNG PHÂN CÔNG VÀ TỈ LỆ ĐÓNG GÓP]` và đoạn ghi chú dưới Bảng 1.1 — hai thành viên xác nhận nội dung phân công (đặc biệt phần huấn luyện PhoBERT ngoài repo) rồi xoá chữ đỏ.
3. **Cuối Mục 4.3 (TASK 07 — Ảnh chụp giao diện S1):**
   - `[CẦN BỔ SUNG HÌNH ẢNH GIAO DIỆN (TASK 07 - S1): Ảnh chụp màn hình thẻ Quét nội dung trên Side Panel...]` — chụp từ Chrome (`extension/dist`), chèn ảnh + caption `Hình 4.2` rồi xoá chữ đỏ.
4. **Cuối Mục 4.7 (TASK 07 — Ảnh chụp giao diện S2, S3, S4):**
   - `[CẦN BỔ SUNG HÌNH ẢNH GIAO DIỆN (TASK 07 - S2, S3, S4): Ảnh chụp màn hình danh sách bản nháp...]` — chụp từ Chrome, chèn ảnh + caption rồi xoá chữ đỏ.
5. **Cuối Mục 5.2 (TASK 06 — Lưu ý log huấn luyện PhoBERT):**
   - `[LƯU Ý / CẦN BỔ SUNG NẾU GIẢNG VIÊN YÊU CẦU: Trong kho mã nguồn hiện chỉ lưu trọng số mô hình đã huấn luyện, chưa đính kèm tệp dữ liệu gốc 200 câu, nhật ký quá trình huấn luyện (training logs)...]` — nếu có file dataset/log từ Colab thì bổ sung vào `docs/evidence/`, nếu không thì chỉ cần xoá dòng nhắc chữ đỏ và giữ nguyên câu chú thích in nghiêng màu đen đứng trước nó.

---

## 3. Việc kỹ thuật tùy chọn còn lại (ngoài báo cáo)

- **Vệ sinh trước khi đóng gói nộp thư mục ngoài git:** Tệp `ml_hasevent_filter/handover_api_code/models/phobert_task_classifier_final/training_args.bin` (đang được `.gitignore` bỏ qua, không nằm trên git) chứa đường dẫn Colab cá nhân `/content/drive/MyDrive/...`; xoá tệp này nếu nén cả thư mục máy cục bộ gửi đi (không ảnh hưởng suy luận của `app.py`).
- **Tùy chọn P1.5 (không bắt buộc cho báo cáo hiện tại):** Đưa bộ quy đổi ngày tương đối tất định (`"thứ n tuần sau"`, đã chạy trong `rule-baseline.ts`) vào `src/core/extraction/normalize.ts`. Hiện báo cáo đã mô tả trung thực ở Mục 4.6, Mục 6.2 và đặt làm hướng phát triển ngắn hạn ở Mục 6.3.
