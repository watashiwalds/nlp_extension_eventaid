# Demo khác kế hoạch ở đâu?

Bản demo hiện **đã có lớp trích xuất bằng LLM cục bộ** (llama.cpp) chạy trong offscreen document.
Mọi lệch hướng dưới đây đều nhằm giữ demo chạy được, nhưng vẫn giữ đúng hợp đồng dữ liệu và
phân lớp của kế hoạch. Nhắc việc sự kiện (KS-10) và Gmail API vẫn chưa có.

| Hạng mục | Kế hoạch (`ke_hoach_phat_trien.md`) | Demo hiện tại | Vì sao / khi nào bổ sung |
|---|---|---|---|
| Trích xuất sự kiện | Classifier TF-IDF + LLM llama.cpp | **LLM cục bộ** (llama.cpp) qua offscreen + nhập tay; **không có classifier TF-IDF** | Classifier chưa cần cho demo; LLM đã chạy được. Thêm classifier khi cần lọc trước |
| `Event.origin` | `extractionMeta {classifierVersion, llmModel, promptVersion}` | `origin: 'manual' \| 'llm'`; `extractionMeta {runId, documentId, provider, model, promptVersion, chunkIndex, chunkCount, confidence, latencyMs}` | Giữ hợp đồng cũ bằng `.default('manual')`; metadata dùng tên trường hiện tại thay vì `classifierVersion`/`llmModel` |
| `versionHistory` | Có (KS-12 cập nhật nguồn) | **Chưa có** | Cần so sánh nguồn cũ/mới — ngoài phạm vi demo |
| Tóm tắt sự kiện | LLM trả 1–5 ý | **Nhập tay tối đa 50 ý**; candidate từ LLM vẫn truyền `maxItems = 5` | Giữ đúng yêu cầu UX: người dùng không bị chặn ở 5 ý. Cap 50 chỉ để tránh dữ liệu rác |
| DOM thô | Chỉ fallback khi Readability thất bại | Thêm nút **Dùng nội dung thô** (`forceRaw`) tạo document `raw_dom` mới | Người dùng chủ động chọn khi Readability bỏ sót nội dung; giữ bản cũ để so sánh |
| Trang động / Gmail | Gmail API read-only + parser riêng | **Best-effort** đọc trang Gmail đang mở: lọc `main`/landmark, bỏ menu/khung ẩn trước khi chạy Readability; không đọc iframe/shadow DOM | Không thêm host permission/OAuth. Nếu Gmail đổi DOM hoặc chưa render, UI hướng dẫn bôi đen/dán. Ghi nhận là best-effort, không hứa đọc mọi thư |
| Nhãn tuỳ chỉnh | 5 nhãn phân loại cố định | Thêm `Event.tags: string[]` (tối đa 5, mỗi nhãn ≤ 24 ký tự); **giữ nguyên** `label` | Không phá 7 trường/JSON cũ; bản ghi cũ thiếu `tags` được đọc với `[]` |
| Quét vùng chọn | Content script + thao tác trên UI | **Menu chuột phải** “Quét sự kiện từ vùng chọn” (`contextMenus`) | Đúng góp ý UX; không thêm host permission |
| Quét cả trang | Nút trên panel/popup | Thêm **menu chuột phải cấp trang** “Quét nội dung trên trang”; bỏ qua vùng bôi đen còn sót | Dùng nhanh không cần mở popup; vẫn là thao tác người dùng chủ động |
| Form ngày/giờ | Một ô `datetime-local` | **Tách ô ngày + ô giờ**; `EventDraft` giữ 4 chuỗi ngày/giờ | Ô native rộng tối thiểu gây tràn side panel 320–400px (VĐ-10) |
| Mở panel từ menu / notification | `sidePanel.open()` trong user gesture | Menu chuột phải: nếu Chrome từ chối thì ghi cờ + badge **!**. Notification kết quả trích xuất: thử `sidePanel.open()` với fallback badge | `notifications` đã được thêm cho job trích xuất; chưa dùng cho nhắc việc sự kiện |
| Nhắc việc sự kiện | `chrome.alarms` + `notifications`, 2 nút | Trường `notifications` tồn tại nhưng **luôn rỗng**; `notifications` permission chỉ dùng cho job trích xuất | Tránh gợi ý sai rằng đã có nhắc việc; KS-10 vẫn là việc tiếp theo |
| Duyệt nháp (KS-08 bước 4) | Sửa nhanh **tại chỗ** + ghi nhận chỉnh sửa để cải thiện model | Nút **Sửa** mở form đầy đủ; **không** thu thập dữ liệu chỉnh sửa | Giữ một nguồn validate form, tránh nhân đôi logic; feedback loop để Slice E/classifier |
| Duyệt nháp (KS-08 bước 5) | Mục bỏ chọn bị **loại khỏi danh sách nháp** | Bỏ chọn chỉ bỏ lựa chọn; muốn loại phải bấm **Xoá nháp đã chọn** và xác nhận | Tránh xoá im lặng; người dùng có thể để nháp lại để duyệt sau |
| Duyệt nháp (KS-08 bước 7) | Thông báo hệ điều hành **HOÀN THÀNH** | Toast trong side panel (`Đã lưu N sự kiện…`) | Notification hiện có chỉ dành cho job trích xuất; không thêm notification cho thao tác duyệt |
| Địa điểm sự kiện | Trường địa điểm có cấu trúc | Không có; địa điểm nằm trong `summary`/`quote` | Schema 7 trường của `base_idea.md` không có địa điểm; gợi ý trùng so địa điểm qua văn bản |
| Gộp nguồn paraphrase (D4b) | Gộp tự động khi phát hiện trùng | **Không tự gộp**; chỉ gợi ý **Có thể trùng**, người dùng chọn Giữ cả hai / Mở bản kia / Xoá bản này | Giữ quyết định cho người dùng; gộp nguồn thủ công bằng sửa/xoá |
| Gmail / PDF / DOCX | Sprint S5 | Không có Gmail API; Gmail chỉ đọc **best-effort** qua trang web đang mở, PDF/DOCX dùng **Dán văn bản** | Cần OAuth + parser riêng |
| Content script | `src/platform/content` inject Readability | `scripting.executeScript` chạy `page-snapshot.ts` (lọc landmark/nhiễu), **Readability chạy trong side panel** | Tránh phải bundle thư viện vào content script; vẫn chỉ dùng `activeTab`. Khi cần bắt vùng chọn phức tạp/SPA, chuyển sang content script |
| Offscreen document | Chạy classifier + LLM | Có, chỉ cho LLM; tạo theo nhu cầu, tối đa 1, dùng `reasons: ['WORKERS']` | Service worker bị kill sau ~30s nên job dài phải chạy ngoài SW |
| Job queue / pipeline | `Job`, state machine, resume sau SW restart | Có **một** job active trong `chrome.storage.session`; không resume sau khi tắt trình duyệt | Đúng phạm vi đã chốt: đóng panel vẫn chạy, tắt trình duyệt thì huỷ |
| `Settings` store | `settings` | Dùng cho `LlmSettings`; cờ quét và job dùng `chrome.storage.session` | Tách dữ liệu bền (IndexedDB) khỏi trạng thái phiên |
| Classifier | `public/models/classifier.json` | Không có | — |
| Test | Vitest + checklist KS | Vitest **206 test / 25 file** (core, parse Readability/forceRaw, page snapshot, tags, extraction/LLM, duyệt nháp/confidence/similar, job, offscreen runner, smoke UI bằng jsdom) + checklist | Không có Playwright như kế hoạch |
| Thông báo UI | 2 nút theo giới hạn Chrome | Notification kết quả trích xuất dùng **1 nút**; chưa có notification nhắc việc | Giữ dưới giới hạn 2 nút của Chrome |

## Điểm **không** lệch

- 7 trường sự kiện trong `base_idea.md` và Appendix A `script.md`.
- Trạng thái `nhap → dang_theo_doi → hoan_thanh | huy`; hoàn thành thủ công (chưa có auto theo thời gian).
- Không bịa dữ liệu: thiếu thời điểm/kết thúc/hồ sơ → ghi `validation.uncertain`, không tự suy đoán.
- `sources` do ứng dụng gắn, không do người dùng/model tự bịa.
- Readability thất bại → `raw_dom`; ưu tiên vùng bôi đen; người dùng có thể chủ động `forceRaw`.
- `shared/contracts.ts` là nguồn duy nhất; Zod validate ở biên IndexedDB.
- `core/` thuần, không `chrome.*`; UI không framework.
- Escape HTML trước khi render; CSP `script-src 'self'`.
