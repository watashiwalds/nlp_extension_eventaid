# Demo khác kế hoạch ở đâu?

Bản demo này cố tình **không dùng mô hình học máy/học sâu**. Mọi lệch hướng dưới đây đều
nhằm giữ demo chạy được trong 1 buổi, nhưng vẫn giữ đúng hợp đồng dữ liệu và phân lớp của kế hoạch.

| Hạng mục | Kế hoạch (`ke_hoach_phat_trien.md`) | Demo hiện tại | Vì sao / khi nào bổ sung |
|---|---|---|---|
| Trích xuất sự kiện | Classifier TF-IDF + LLM llama.cpp | **Nhập tay 100%**; nội dung trang chỉ đọc & hiển thị | Đúng phạm vi user chốt. Thêm classifier/LLM ở S1–S2 |
| `Event.origin` | `extractionMeta {classifierVersion, llmModel, promptVersion}` | `origin: 'manual'` | Chưa có model nên không có metadata để ghi. Khi thêm LLM, đổi sang `extractionMeta` |
| `versionHistory` | Có (KS-12 cập nhật nguồn) | **Chưa có** | Cần so sánh nguồn cũ/mới — ngoài phạm vi demo |
| Nhắc việc | `chrome.alarms` + `notifications`, 2 nút | Trường `notifications` tồn tại nhưng **luôn rỗng** | Tránh gợi ý sai rằng đã có nhắc việc |
| Gmail / PDF / DOCX | Sprint S5 | Không có; dùng **Dán văn bản** | Cần OAuth + parser riêng |
| Content script | `src/platform/content` inject Readability | `scripting.executeScript` lấy HTML, **Readability chạy trong side panel** | Tránh phải bundle thư viện vào content script; vẫn chỉ dùng `activeTab`. Khi cần bắt vùng chọn phức tạp/SPA, chuyển sang content script |
| Offscreen document | Chạy classifier + LLM | Không có | Không có tác vụ dài |
| Job queue / pipeline | `Job`, state machine, resume sau SW restart | Không có job nền | Đọc trang là thao tác đồng bộ, vài trăm ms |
| `Settings` store | `settings` | Có trong DB nhưng demo chưa dùng; cờ quét dùng `chrome.storage.session` | — |
| Classifier | `public/models/classifier.json` | Không có | — |
| Test | Vitest + checklist KS | Vitest (34 test, gồm smoke UI bằng jsdom) + checklist | Không có Playwright như kế hoạch |
| Thông báo UI | 2 nút theo giới hạn Chrome | Không có | — |

## Điểm **không** lệch

- 7 trường sự kiện trong `base_idea.md` và Appendix A `script.md`.
- Trạng thái `nhap → dang_theo_doi → hoan_thanh | huy`; hoàn thành thủ công (chưa có auto theo thời gian).
- Không bịa dữ liệu: thiếu thời điểm/kết thúc/hồ sơ → ghi `validation.uncertain`, không tự suy đoán.
- `sources` do ứng dụng gắn, không do người dùng/model tự bịa.
- Readability thất bại → `raw_dom`; ưu tiên vùng bôi đen.
- `shared/contracts.ts` là nguồn duy nhất; Zod validate ở biên IndexedDB.
- `core/` thuần, không `chrome.*`; UI không framework.
- Escape HTML trước khi render; CSP `script-src 'self'`.
