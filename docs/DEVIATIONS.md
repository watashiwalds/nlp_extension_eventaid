# Demo khác kế hoạch ở đâu?

Bản demo hiện **đã có lớp trích xuất bằng LLM** (llama.cpp cục bộ mặc định, hoặc endpoint
OpenAI-compatible do người dùng chọn). Mọi lệch hướng dưới đây đều nhằm giữ demo chạy được, nhưng
vẫn giữ đúng hợp đồng dữ liệu và phân lớp của kế hoạch. Nhắc việc sự kiện (KS-10), Gmail API và
**sàng lọc nội dung (Slice F)** vẫn chưa có; **chọn nơi chạy suy luận (KS-14) đã có trong code**
nhưng chưa chạy checklist thủ công với endpoint thật.

| Hạng mục | Kế hoạch (`ke_hoach_phat_trien.md`) | Demo hiện tại | Vì sao / khi nào bổ sung |
|---|---|---|---|
| Trích xuất sự kiện | Sàng lọc tài liệu + LLM llama.cpp | **LLM** qua offscreen + nhập tay; mặc định llama.cpp cục bộ, có thể chọn endpoint OpenAI-compatible; **chưa có bước sàng lọc** | Slice F đã chốt 2026-10-26 (PhoBERT cục bộ) nhưng chưa triển khai; demo gọi LLM trực tiếp |
| `Event.origin` | `extractionMeta {filterVersion?, llmModel, promptVersion}` | `origin: 'manual' \| 'llm'`; `extractionMeta {runId, documentId, provider, model, promptVersion, chunkIndex, chunkCount, confidence, latencyMs}` | Giữ hợp đồng cũ bằng `.default('manual')`; metadata dùng tên trường hiện tại thay vì `filterVersion`/`llmModel` |
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
| Duyệt nháp (KS-08 bước 4) | Sửa nhanh **tại chỗ** + ghi nhận chỉnh sửa để cải thiện model | Nút **Sửa** mở form đầy đủ; **không** thu thập dữ liệu chỉnh sửa | Giữ một nguồn validate form, tránh nhân đôi logic; feedback loop để Slice E/sàng lọc |
| Duyệt nháp (KS-08 bước 5) | Mục bỏ chọn bị **loại khỏi danh sách nháp** | Bỏ chọn chỉ bỏ lựa chọn; muốn loại phải bấm **Xoá nháp đã chọn** và xác nhận | Tránh xoá im lặng; người dùng có thể để nháp lại để duyệt sau |
| Duyệt nháp (KS-08 bước 7) | Thông báo hệ điều hành **HOÀN THÀNH** | Toast trong side panel (`Đã lưu N sự kiện…`) | Notification hiện có chỉ dành cho job trích xuất; không thêm notification cho thao tác duyệt |
| Địa điểm sự kiện | Trường địa điểm có cấu trúc | Không có; địa điểm nằm trong `summary`/`quote` | Schema 7 trường của `base_idea.md` không có địa điểm; gợi ý trùng so địa điểm qua văn bản |
| Gộp nguồn paraphrase (D4b) | Gộp tự động khi phát hiện trùng | **Không tự gộp**; chỉ gợi ý **Có thể trùng**, người dùng chọn Giữ cả hai / Mở bản kia / Xoá bản này | Giữ quyết định cho người dùng; gộp nguồn thủ công bằng sửa/xoá |
| Gmail / PDF / DOCX | Sprint S5 | Không có Gmail API; Gmail chỉ đọc **best-effort** qua trang web đang mở, PDF/DOCX dùng **Dán văn bản** | Cần OAuth + parser riêng |
| Content script | `src/platform/content` inject Readability | `scripting.executeScript` chạy `page-snapshot.ts` (lọc landmark/nhiễu), **Readability chạy trong side panel** | Tránh phải bundle thư viện vào content script; vẫn chỉ dùng `activeTab`. Khi cần bắt vùng chọn phức tạp/SPA, chuyển sang content script |
| Offscreen document | Chạy bước sàng lọc + LLM | Có, **hiện chỉ cho LLM**; tạo theo nhu cầu, tối đa 1, dùng `reasons: ['WORKERS']` | Service worker bị kill sau ~30s nên job dài phải chạy ngoài SW. Slice F sẽ thêm lời gọi sàng lọc tại đây trước LLM |
| Job queue / pipeline | `Job`, state machine, resume sau SW restart | Có **một** job active trong `chrome.storage.session`; không resume sau khi tắt trình duyệt | Đúng phạm vi đã chốt: đóng panel vẫn chạy, tắt trình duyệt thì huỷ |
| `Settings` store | `settings` | Dùng cho `LlmSettings`; cờ quét và job dùng `chrome.storage.session` | Tách dữ liệu bền (IndexedDB) khỏi trạng thái phiên |
| Sàng lọc nội dung (Slice F) | Dịch vụ PhoBERT cục bộ `127.0.0.1:8000` chạy trước LLM | **Không có**; job gọi LLM trực tiếp | Kế hoạch `docs/ke-hoach-bo-loc-noi-dung.md` (5–6,5 ngày công); chỉ bỏ lần gọi LLM trên tài liệu âm, không cắt câu |
| Model LLM chốt | 3B Q4 + KV q8_0 trong ~3 GB VRAM | **9B IQ4_XS** (16 layer lên GPU, ~5,5 GB) sau Slice E; 4B Q5_K_S bị loại vì recall 72,7%/75,0% | 4B nhanh hơn ~3,4 lần nhưng dưới ngưỡng recall 80%; giữ nguyên ngưỡng, ghi rõ đánh đổi. Có thể cải thiện prompt cho 4B rồi đo lại |
| Test | Vitest + checklist KS | Vitest **354 test / 36 file** (core, parse Readability/forceRaw, page snapshot, tags, extraction/LLM, duyệt nháp/confidence/similar, job, offscreen runner, provider remote/factory/permissions, form Cài đặt, smoke UI bằng jsdom, Slice E eval) + **17 test live skip** khi không có `LLAMA_EVAL=1` + checklist | Không có Playwright như kế hoạch |
| Thông báo UI | 2 nút theo giới hạn Chrome | Notification kết quả trích xuất dùng **1 nút**; chưa có notification nhắc việc | Giữ dưới giới hạn 2 nút của Chrome |
| **Chọn nơi chạy suy luận (KS-14)** | `LlmSettings.provider`: `local` \| `openai-compatible`; factory chọn provider; consent theo origin; quyền host cấp lúc chạy | **Đã có phần code + test**: `OpenAiCompatibleProvider`, `factory.ts`, `provider-choice.ts`, form provider, consent/thu hồi/xoá key, `optional_host_permissions`; đã sửa lỗi Gemini 404 do health ghi đè model (2026-10-26) | Chưa chạy checklist §8 với Gemini/Cloudflared thật; **không có adapter native Gemini (F6)**. Code vẫn giữ localhost làm mặc định và chặn remote khi thiếu consent |

## Điểm **không** lệch

- 7 trường sự kiện trong `base_idea.md` và Appendix A `script.md`.
- Trạng thái `nhap → dang_theo_doi → hoan_thanh | huy`; hoàn thành thủ công (chưa có auto theo thời gian).
- Không bịa dữ liệu: thiếu thời điểm/kết thúc/hồ sơ → ghi `validation.uncertain`, không tự suy đoán.
- `sources` do ứng dụng gắn, không do người dùng/model tự bịa.
- Readability thất bại → `raw_dom`; ưu tiên vùng bôi đen; người dùng có thể chủ động `forceRaw`.
- `shared/contracts.ts` là nguồn duy nhất; Zod validate ở biên IndexedDB.
- `core/` thuần, không `chrome.*`; UI không framework.
- Escape HTML trước khi render; CSP `script-src 'self'`.
