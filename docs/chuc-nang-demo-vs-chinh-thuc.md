# Đối chiếu chức năng: kế hoạch chính thức vs. demo hiện tại

Tài liệu này liệt kê các chức năng theo **kế hoạch chính thức** (`script.md` KS-01…KS-13,
`proposed_technical.md`, lộ trình S0–S6 trong `ke_hoach_phat_trien.md`) và đánh dấu mức độ
đã có trong **demo** tại `extension/`.

- **Ngày đối chiếu:** 2026-10-24
- **Mốc demo:** sau Slice B (LLM cục bộ) + Slice C (offscreen job + notification) — Slice C đã nghiệm thu 2026-10-24; Slice D là việc tiếp theo
- **Nguồn tham chiếu chéo:** [`DEVIATIONS.md`](./DEVIATIONS.md), [`kiem-thu-demo.md`](./kiem-thu-demo.md)

## Chú giải

| Ký hiệu | Nghĩa |
|---|---|
| ✅ | Đã có trong demo, dùng được |
| 🟡 | Có một phần, hoặc có cách thay thế chưa tương đương kế hoạch |
| ❌ | Chưa có trong demo |

> Đánh giá dựa trên mã nguồn, test tự động và checklist kiểm thử. Các kiểm tra cần Chrome thật
> (menu chuột phải, kéo side panel, vùng click ở 320/360/400px, Gmail/SPA) vẫn nên chạy lại
> trước khi báo cáo — xem `docs/kiem-thu-demo.md` §2 và §7.

---

## Tổng hợp nhanh

| Nhóm | Nội dung | ✅ | 🟡 | ❌ | Tổng |
|---|---|---:|---:|---:|---:|
| A | Nền tảng & kiến trúc | 8 | 2 | 0 | 10 |
| B | Thu thập dữ liệu | 9 | 1 | 3 | 13 |
| C | Pipeline NLP (classifier + LLM) | 5 | 4 | 2 | 11 |
| D | Xem lại & quản lý sự kiện | 6 | 2 | 2 | 10 |
| E | Nhắc việc | 0 | 1 | 5 | 6 |
| F | Mở rộng (KS-12, KS-13) | 1 | 0 | 4 | 5 |
| G | Phi chức năng & chất lượng | 4 | 5 | 2 | 11 |
| **—** | **Tổng** | **33** | **15** | **18** | **66** |

**Kết luận nhanh**

- **Phần lõi của một ứng dụng quản lý lịch trình đã chạy được:** đọc trang, quản lý hồ sơ,
  tạo/sửa/xoá sự kiện đủ 7 trường, máy trạng thái, nguồn trích, xuất–nhập JSON.
- **Phần LLM cục bộ đã có:** `InferenceProvider` cho llama.cpp, prompt + JSON schema, validate
  bằng Zod, normalize, dedup, khớp hồ sơ, chunking; job chạy trong offscreen và lưu nháp.
  **Classifier TF-IDF vẫn chưa có**, nên không có bước lọc trước khi gọi LLM.
- **Các kênh dữ liệu ngoài trang web chưa có:** Gmail API, PDF/DOCX/OCR, ICS. Trang Gmail chỉ được đọc **best-effort** như một trang web.
- **Nhắc việc sự kiện chưa có:** trường dữ liệu tồn tại nhưng luôn rỗng; `notifications` mới
  dùng cho job trích xuất, chưa có `chrome.alarms`/engine KS-10.
- **Nền tảng kỹ thuật đúng kế hoạch:** TypeScript strict, Vite + CRXJS, hợp đồng Zod duy nhất,
  phân lớp core/platform/ui, mạng chỉ tới `127.0.0.1:8080`, CSP `script-src 'self'`.

---

## A. Nền tảng & kiến trúc

| Mã | Chức năng theo kế hoạch | Trạng thái | Demo hiện tại / ghi chú |
|---|---|---|---|
| A1 | Chrome Extension Manifest V3 | ✅ | `manifest.config.ts`; side panel + popup hoạt động |
| A2 | TypeScript 5 strict + Vite + `@crxjs/vite-plugin` | ✅ | `tsc --noEmit` + `vite build` → `dist/` |
| A3 | `shared/contracts.ts` là nguồn hợp đồng duy nhất, Zod validate ở biên IndexedDB | ✅ | Đủ `Document`, `Profile`, `Event`, `Settings`; có test parse |
| A4 | Phân lớp `core/` → `platform/` → `ui/`, không import ngược | ✅ | ESLint `no-restricted-imports` + `no-restricted-globals` |
| A5 | IndexedDB + wrapper typed (~150 dòng), không Dexie | ✅ | `platform/storage/db.ts`; 4 object store |
| A6 | CI: typecheck + lint + test + build | ✅ | `.github/workflows/ci.yml`; 180 test Vitest / 21 file |
| A7 | Content script inject Readability theo yêu cầu | 🟡 | `scripting.executeScript` chạy page snapshot (lọc `main`/landmark, bỏ menu/khung ẩn), **Readability chạy trong side panel**; chưa có content script thường trú |
| A8 | Job queue bền, tiến trình, resume sau service worker restart | 🟡 | Có **một** job active trong `chrome.storage.session`, tiến trình + huỷ; SW restart vẫn thấy job/offscreen; **không resume sau khi tắt trình duyệt** |
| A9 | Offscreen document chạy classifier + LLM | ✅ | Offscreen chỉ cho LLM; classifier chưa có. Tạo theo nhu cầu, đóng sau khi xong |
| A10 | `Settings` store được đọc/ghi trong luồng thật | ✅ | `LlmSettings` đọc/ghi qua IndexedDB; cờ quét và job dùng `chrome.storage.session` |

## B. Thu thập dữ liệu

| Mã | Chức năng theo kế hoạch | Trạng thái | Demo hiện tại / ghi chú |
|---|---|---|---|
| B1 | **KS-01** Cài đặt lần đầu & mở side panel | 🟡 | Mở panel từ popup/action và từ menu chuột phải; chưa có luồng onboarding nhiều bước |
| B2 | **KS-02** Thiết lập hồ sơ người dùng (CRUD, biệt danh, từ khoá) | ✅ | Tạo/sửa/xoá; validate tên, email; chip biệt danh/từ khoá |
| B3 | **KS-03** Liên kết Gmail OAuth `gmail.readonly` | ❌ | Không có `identity`, không có OAuth |
| B4 | **KS-04** Quét trang web đang mở | ✅ | `activeTab` + page snapshot (lọc landmark/nhiễu) + Readability; ưu tiên vùng bôi đen nếu có; menu chuột phải cấp trang **Quét nội dung trên trang** |
| B5 | Lọc nhiễu nội dung bằng Mozilla Readability | ✅ | Badge phương thức = **Nội dung chính**; HTML được lọc `main`/`article`, bỏ `nav/header/footer/aside` và khung ẩn trước khi parse |
| B6 | Fallback `raw_dom` khi Readability lỗi/rỗng, kèm cảnh báo | ✅ | Dùng DOM **đã lọc nhiễu**; có cảnh báo + nút **Dùng nội dung thô** (`forceRaw`) tạo document mới |
| B7 | Giới hạn kích thước văn bản, báo khi cắt bớt | ✅ | `MAX_DOCUMENT_CHARS = 200.000`; snapshot giới hạn HTML và báo khi cắt; hiển thị số ký tự + cờ cắt bớt |
| B8 | **KS-05** Quét hộp thư Gmail | ❌ | Không có Gmail API/OAuth; chỉ đọc **best-effort** trang Gmail đang mở như một trang web, không hứa đọc mọi thư |
| B9 | **KS-06** Xử lý tệp đính kèm: PDF, DOCX, TXT, ICS, OCR | ❌ | Không có; dùng **Dán văn bản** thay thế một phần |
| B10 | **KS-07** Trích từ vùng văn bản được chọn (bôi đen) | ✅ | Nút quét vùng chọn + menu chuột phải **Quét sự kiện từ vùng chọn** |
| B11 | Dán văn bản thủ công | ✅ | Có (ngoài kế hoạch, dùng thay Gmail/PDF); badge **Văn bản dán** |
| B12 | Xem lại document: tiêu đề, nguồn, phương thức, số ký tự, toàn văn | ✅ | Tab **Quét nội dung**; thu gọn/mở rộng, nút **Xem toàn bộ** luôn hiển thị |
| B13 | Nhiều nguồn gần đây, chọn qua lại | ✅ | Danh sách document trong tab **Quét nội dung** (tách khỏi Tổng quan) |

## C. Pipeline NLP dùng chung

| Mã | Chức năng theo kế hoạch | Trạng thái | Demo hiện tại / ghi chú |
|---|---|---|---|
| C1 | Classifier TF-IDF + Logistic Regression (có/không sự kiện + score) | ❌ | Không có; mọi sự kiện do người dùng tạo |
| C2 | `core/classifier.ts` + `public/models/classifier.json` | ❌ | Không có model, không có script train |
| C3 | LLM cục bộ llama.cpp qua `fetch` (`127.0.0.1:8080`) | ✅ | `platform/inference/llama-cpp.ts` + `InferenceProvider`; `host_permissions` và CSP chỉ mở `127.0.0.1:8080` |
| C4 | `MockProvider` để làm UI trước khi có model | ✅ | `core/extraction/mock-provider.ts`; dùng trong test pipeline/offscreen |
| C5 | Prompt + JSON schema + `LlmEvent` validate bằng Zod | ✅ | `prompt.ts`, `schema.ts`, `contracts.ts`; retry 1 lần khi JSON sai |
| C6 | Chuẩn hoá ngày giờ tiếng Việt ("8h tối mai", "thứ 3 tuần sau") | 🟡 | Hỗ trợ `d/m/yyyy`, `d-m-yyyy`, `yyyy-mm-dd`, "ngày d tháng m năm yyyy"; thiếu năm/giờ → `uncertain`, không bịa. Chưa phủ hết "8h tối mai" |
| C7 | Validate kết quả và gắn `validation.uncertain[]`, không bịa dữ liệu | 🟡 | Đã validate output model + đối chiếu ngày với nguồn, giữ `DateTimeRef.date`; vẫn cần đo chất lượng trên bộ mẫu (Slice E) |
| C8 | Dedup + merge sự kiện trùng từ nhiều nguồn | 🟡 | Có dedup candidate trong lần chạy + với sự kiện cũ; **chưa có gợi ý/gộp paraphrase** (Slice D) |
| C9 | So khớp hồ sơ tự động theo tên/biệt danh/từ khoá | ✅ | `profile-match.ts` chạy sau normalize, event-first; người dùng vẫn sửa được |
| C10 | Chunking văn bản dài + merge kết quả từng đoạn | ✅ | `chunk.ts` + `pipeline.ts`; `maxChunks × chunkChars`, báo khi cắt |
| C11 | Phòng chống prompt injection từ nội dung tài liệu | 🟡 | Prompt coi `<document>` là dữ liệu và output vẫn qua Zod; chưa có red-team/đo prompt injection |

## D. Xem lại & quản lý sự kiện

| Mã | Chức năng theo kế hoạch | Trạng thái | Demo hiện tại / ghi chú |
|---|---|---|---|
| D1 | **KS-08** Review card 7 trường + trích dẫn nguồn + duyệt | 🟡 | Form nhập tay đủ 7 trường, gắn hồ sơ + nguồn trích, có badge "Cần kiểm tra"; **chưa có đề xuất từ model** để duyệt |
| D2 | **KS-09** CRUD sự kiện | ✅ | Tạo, xem, sửa, xoá; giữ `id`/trạng thái/nguồn khi sửa |
| D3 | Máy trạng thái `nhap → dang_theo_doi → hoan_thanh \| huy` | ✅ | Chuyển trạng thái thủ công; quay lại được; `completedAt` được set/xoá đúng |
| D4 | Tự động hoàn thành khi qua giờ kết thúc (service worker) | ❌ | Chỉ hiển thị viền đỏ + nhãn "đã qua"; hoàn thành phải bấm tay |
| D5 | Lọc theo trạng thái/nhãn, tìm theo tiêu đề/tóm tắt/nguồn | ✅ | Thêm lọc/tìm theo **nhãn tuỳ chỉnh**; có empty state + nút **Xoá bộ lọc**; danh sách ưu tiên sự kiện sắp/đang diễn ra |
| D6 | Mục **"Cần bổ sung thời gian"** cho sự kiện thiếu `start` | 🟡 | Có cờ `chua_ro_thoi_diem` + badge trong chi tiết; chưa có mục/tab tổng hợp riêng |
| D7 | Nhãn sự kiện | ✅ | Giữ 5 nhãn phân loại cố định (`label`) và thêm **nhãn tuỳ chỉnh** `tags` (tối đa 5, mỗi nhãn ≤ 24 ký tự) để lọc/tìm |
| D8 | **KS-12** `versionHistory` + cập nhật khi nguồn đổi lịch | ❌ | Không có; sửa tay thì mất dấu vết thay đổi |
| D9 | Huỷ mềm + khôi phục từ bộ lọc "Đã huỷ" | ✅ | `huy` không xoá cứng; lọc và đổi lại trạng thái được |
| D10 | Tab Tổng quan: sắp diễn ra, thống kê, nguồn gần đây | ✅ | Có; thêm **tab kế hoạch theo hồ sơ** (Tất cả + từng hồ sơ); nguồn gần đây chuyển sang tab **Quét nội dung** |

## E. Nhắc việc

| Mã | Chức năng theo kế hoạch | Trạng thái | Demo hiện tại / ghi chú |
|---|---|---|---|
| E1 | `chrome.alarms` + `chrome.notifications` | ❌ | `notifications` đã khai báo nhưng chỉ dùng cho job trích xuất; **chưa có `alarms`/engine nhắc việc sự kiện** |
| E2 | 3 mốc: 1 tuần trước / 1 ngày trước / ngày diễn ra | ❌ | Hằng số `MILESTONE_TEXT` có, nhưng `notifications` luôn rỗng |
| E3 | Bật/tắt từng mốc trong Cài đặt, áp dụng cho sự kiện mới | ❌ | Chưa có UI |
| E4 | Thông báo có 2 nút (Theo dõi / Huỷ), hành động thứ 3 vào side panel | ❌ | Chưa có thông báo |
| E5 | Bù thông báo trễ sau khi Chrome đóng | ❌ | Chưa có |
| E6 | Loại sự kiện thiếu `start` khỏi lịch nhắc | 🟡 | Cờ dữ liệu đã có; chưa có bộ lập lịch để loại trừ |

## F. Mở rộng (Giai đoạn 4)

| Mã | Chức năng theo kế hoạch | Trạng thái | Demo hiện tại / ghi chú |
|---|---|---|---|
| F1 | **KS-12** Phát hiện nguồn đổi lịch, so sánh cũ/mới, 3 lựa chọn | ❌ | Không có |
| F2 | **KS-13** Phát hiện xung đột lịch, chỉ cảnh báo không tự đổi | ❌ | Không có |
| F3 | Xuất **ICS** chuẩn iCalendar | ❌ | Chưa có; mới có JSON |
| F4 | Xuất/nhập JSON toàn bộ dữ liệu | ✅ | Có `documents/profiles/events`; nhập tệp rác bị chặn, dữ liệu cũ nguyên vẹn |
| F5 | Tích hợp Google Calendar/Outlook | ❌ | Không có, đúng phạm vi Giai đoạn 4 |

## G. Phi chức năng & chất lượng

| Mã | Chức năng theo kế hoạch | Trạng thái | Demo hiện tại / ghi chú |
|---|---|---|---|
| G1 | Toàn bộ xử lý cục bộ, không gửi nội dung ra ngoài | ✅ | Mạng chỉ tới `127.0.0.1:8080` (llama-server); không backend từ xa |
| G2 | Bộ quyền tối thiểu | 🟡 | Đã có `activeTab`, `scripting`, `storage`, `offscreen`, `notifications`, `sidePanel`, `contextMenus`; còn thiếu `alarms`/`unlimitedStorage` cho phần chưa làm |
| G3 | CSP `script-src 'self'`, không remote code, không WASM | ✅ | Giữ đúng |
| G4 | Escape HTML trước khi render | ✅ | Toàn bộ nội dung động đi qua `escapeHtml`/`escapeAttr` |
| G5 | Không thực thi script/macro trong tài liệu đầu vào | ✅ | Chỉ đọc text/HTML tĩnh, không eval |
| G6 | Accessibility: bàn phím, focus ring, nhãn ARIA | 🟡 | Đã bỏ `autofocus`, thêm `:focus-visible`, Esc đóng form, focus ô lỗi đầu tiên; cần kiểm thủ công lại |
| G7 | Side panel 320/360/400px không tràn ngang | 🟡 | Đã tách ô ngày/giờ + grid `minmax(0, 1fr)`, stack khi hẹp; **chưa xác nhận lại trên Chrome thật** |
| G8 | Test tự động + coverage ≥ 70% + Playwright | 🟡 | 180 test Vitest / 21 file (core, parse, page snapshot, extraction/LLM, job, offscreen runner, smoke jsdom); **không có Playwright, không đặt ngưỡng coverage** |
| G9 | Golden set 150 mẫu + `run_eval.ts` + F1/p95 | ❌ | Chưa có dataset, chưa có eval |
| G10 | **KS-11** Luồng lỗi: token hết hạn, quota, model chết, trang không inject được | 🟡 | Có xử lý `chrome://`, nội dung rỗng, JSON rác, trang SPA chưa render, model chết, huỷ/job lỗi; thiếu lỗi OAuth/quota |
| G11 | Đóng gói CRX + privacy policy + báo cáo eval | ❌ | Mới ở mức load unpacked `dist/` |

---

## Tóm tắt theo mốc sprint

| Sprint | Mục tiêu | Demo đạt được |
|---|---|---|
| **S0** | Foundation + de-risk | ✅ Phần lớn: TS/Vite/CRXJS, contracts, CI, Readability; ❌ chưa có benchmark llama.cpp, ADR, golden set |
| **S1** | Capture + classifier | 🟡 Capture ✅ (selection/context menu + lọc nội dung chính cho trang động); ❌ classifier; job nền đã có cho LLM |
| **S2** | LLM extraction | ✅ Phần lớn: provider, pipeline, prompt v4, normalize, dedup, profile match, offscreen job; nghiệm thu Slice B/C 2026-10-23/24 |
| **S3** | Review + CRUD | 🟡 CRUD và form 7 trường ✅; review/duyệt hàng loạt, `versionHistory` ❌ |
| **S4** | Notifications + KS-12 | 🟡 Notification kết quả trích xuất ✅; nhắc việc sự kiện + KS-12 ❌ |
| **S5** | Gmail + attachment | ❌ Chưa có |
| **S6** | Hardening + release | 🟡 Có test/build/CI; chưa có eval, CRX, privacy policy |

## Ghi chú khi dùng cho báo cáo

1. **Có thể nói demo "trích xuất sự kiện bằng LLM cục bộ"**, nhưng phải nói rõ: cần
   `llama-server` trên máy, kết quả là **nháp** để người dùng duyệt, và chưa đo chất lượng trên
   bộ mẫu lớn (Slice E). Vẫn có nhập tay đầy đủ.
2. **Điểm mạnh nên nhấn:** hợp đồng dữ liệu 7 trường, máy trạng thái, nguồn trích, cờ không bịa dữ liệu,
   job offscreen không mất khi đóng panel, kiến trúc tách lớp, và các quy tắc riêng tư
   (suy luận cục bộ, quyền tối thiểu).
3. **Điểm cần nói rõ là giả lập/thay thế:** dán văn bản thay Gmail/PDF; chưa có classifier
   TF-IDF; hoàn thành sự kiện thủ công thay tự động theo giờ; nhắc việc sự kiện chưa có.
4. **Trước khi báo cáo:** chạy lại `npm run typecheck && npm run lint && npm test && npm run build`
   và hoàn tất các ô còn trống trong `docs/kiem-thu-demo.md`.

Xem thêm: [`DEVIATIONS.md`](./DEVIATIONS.md) — giải thích từng chỗ lệch và lý do;
[`ban-giao-slice-d.md`](./ban-giao-slice-d.md) — việc còn lại và hướng triển khai Slice D.
Kế hoạch hai phiên trước đã hoàn tất, lưu ở [`docs/archive/phien-lam-viec-tiep-theo.md`](./archive/phien-lam-viec-tiep-theo.md).
