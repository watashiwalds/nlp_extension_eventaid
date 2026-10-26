# Kịch bản sử dụng — Trích xuất và quản lý lịch trình cá nhân

> Bản hoàn thiện kịch bản sử dụng dựa trên bản nháp `unfinished_script.svg`, đáp ứng yêu cầu trong `base_idea.md` và kiến trúc kỹ thuật trong `proposed_technical.md`.
>
> **Sản phẩm:** Chrome Extension (Manifest V3). Giai đoạn hiện tại: **Gmail API** (kênh chính) + **Browser Page Parser** (kênh bổ sung, lọc nội dung chính bằng **Mozilla Readability** trước khi đưa vào NLP pipeline), dùng chung Document Processing Layer và NLP Pipeline.
>
> **Nơi chạy suy luận:** mặc định là **máy này** (`llama-server` tại `127.0.0.1:8080`); người dùng có thể chọn một endpoint **OpenAI-compatible** khác (dịch vụ ngoài hoặc máy trạm của mình) theo **KS-14**. Đây là kế hoạch đã chốt ngày 2026-10-26, **chưa triển khai** trong demo hiện tại.

---

## 0. Quy ước chung

| Ký hiệu | Ý nghĩa |
|---|---|
| **ND** | Hành động của người dùng |
| **HT** | Phản hồi của hệ thống (extension: UI, service worker, NLP pipeline; và Gmail API, IndexedDB, Chrome Notification) |
| **Small UI** | Cửa sổ pop-out nhỏ hiển thị tiến trình quét, tự đóng khi thao tác kết thúc |
| **Full UI** | Side panel ở chế độ đầy đủ (main dashboard, danh sách sự kiện, chi tiết sự kiện) |

**Phân rã "HT" — các thành phần hệ thống:**

| Thành phần | Trách nhiệm | Xuất hiện trong |
|---|---|---|
| Side panel (Full UI) | Dashboard, danh sách/chi tiết sự kiện, màn duyệt, cài đặt | KS-01, 04, 08, 09 |
| Small UI (pop-out) | Hiển thị tiến trình quét, tự đóng khi xong | KS-04, 05, 07 |
| Content script / injection | Nhân bản DOM, chạy Readability, lấy vùng chọn | KS-04, 07 |
| Service worker (nền) | Tính mốc thông báo, bù thông báo trễ, tự chuyển "Hoàn thành" khi qua end | KS-04, 05, 09, 10 |
| Gmail API client | OAuth, `messages.list/get`, `attachments.get` | KS-03, 05, 06 |
| Document Processing Layer | Parser theo định dạng (PDF.js, Mammoth.js, ICS, OCR) | KS-06 |
| NLP pipeline | Phân loại, trích xuất, chuẩn hoá, kiểm định, dedup, so khớp hồ sơ | KS-04, 05, 06, 07, 12 |
| Inference provider | Gọi `llama-server` cục bộ hoặc endpoint OpenAI-compatible đã chọn; health, timeout, abort | KS-04, 05, 06, 07, 14 |
| Storage (IndexedDB + chrome.storage) | Sự kiện + metadata; hồ sơ, tuỳ chọn, token | KS-02, 08, 09, 10, 14 |
| Notification engine | Chrome Notification API, trạng thái mốc đã bắn / mute | KS-10 |

**Vòng đời trạng thái của sự kiện** *(trạng thái trong `[...]`; hành động viết thường; kết thúc thô trong `(...)`)*:

```text
[Nháp chờ duyệt] ──duyệt (KS-08)──> [Đang theo dõi] ─── qua thời điểm kết thúc (tự động)
       │                                   │          hoặc ND đánh dấu "Đã xong" (KS-09)
  bỏ chọn tại KS-08                         │                    │
       │                                    │                    v
       v                                    │              [Hoàn thành]
  (nháp bị loại khỏi DB)                    │
                                            ├── Huỷ (KS-09/KS-10) ──> [Đã huỷ] (ẩn khỏi UI, khôi phục được)
                                            └── Xoá (KS-09) ──────> (xóa vĩnh viễn khỏi DB)
```

**Trình tự sử dụng tổng quát:**

```text
Cài đặt → Thiết lập hồ sơ → (Liên kết Gmail) → Quét (trang web / hộp thư)
        → Small UI hiển thị tiến trình → Card tiến trình trên dashboard
        → Full UI duyệt sự kiện → Lưu vào IndexedDB → CRUD → Thông báo theo mốc
        → (Đã xem / Không nhắc lại / Huỷ sự kiện)
        → (Nguồn thay đổi lịch → KS-12: Cập nhật / Giữ nguyên / Tạo riêng)
```

---

## 1. Danh mục kịch bản

| Nhóm | Mã | Tên kịch bản | Nguồn yêu cầu |
|---|---|---|---|
| **A — Khởi tạo** | KS-01 | Cài đặt lần đầu & mở side panel | `unfinished_script.svg` (Cài đặt lần đầu) |
| | KS-02 | Thiết lập hồ sơ người dùng | `base_idea.md` (so khớp cá nhân), SVG |
| | KS-03 | Liên kết Gmail (OAuth) | `proposed_technical.md` §3, SVG |
| **B — Thu thập dữ liệu** | KS-04 | Quét trang web đang mở | `proposed_technical.md` §4, SVG |
| | KS-05 | Quét hộp thư Gmail | `proposed_technical.md` §3, SVG |
| | KS-06 | Xử lý tệp đính kèm email | `proposed_technical.md` §5–6, `base_idea.md` |
| | KS-07 | Trích từ vùng văn bản được chọn (bôi đen) | `base_idea.md` (PDF bôi đen) |
| **C — Xử lý & duyệt** | KS-08 | Xem lại & phê duyệt sự kiện trích được | SVG (Xử lý xong → HOÀN THÀNH) |
| **D — Quản lý** | KS-09 | Quản lý sự kiện (CRUD) | SVG (CRUD), `base_idea.md` |
| | KS-12 | Cập nhật sự kiện khi nguồn thay đổi lịch | Bổ sung sau rà soát (email Reply dời lịch) |
| **E — Nhắc việc** | KS-10 | Thông báo sự kiện sắp tới | SVG (Trước khi sự kiện hoàn thành) |
| **F — Ngoại lệ** | KS-11 | Các luồng lỗi và ngoại lệ | `proposed_technical.md` §9 |
| **G — Mở rộng (Giai đoạn 4)** | KS-13 | Xung đột lịch & xuất ICS/tích hợp calendar | `proposed_technical.md` §10 (Giai đoạn 4) |
| **H — Cấu hình suy luận** | KS-14 | Chọn nơi chạy suy luận (local / dịch vụ ngoài) | Kế hoạch đa provider 2026-10-26 |

---

## 2. Kịch bản chi tiết

### KS-01 — Cài đặt lần đầu & mở side panel

**Mục tiêu:** Cài đặt extension, làm quen với giao diện Small UI / Full UI.
**Tiền điều kiện:** Trình duyệt Chromium hỗ trợ Manifest V3.

| # | Người dùng | Hệ thống |
|---|---|---|
| 1 | Tải và cài đặt đủ extension (+ container nếu có) từ nguồn phân phối. | Ghi nhận cài đặt; đăng ký service worker, side panel, các quyền `activeTab`, `scripting`, `storage`, `notifications`. |
| 2 | Chạy extension trên trình duyệt (extension chạy nền khi mở trình duyệt). | Service worker khởi động; tải cấu hình mặc định (mốc thông báo: 1 tuần trước / 1 ngày trước / ngày diễn ra). |
| 3 | Nhấp icon extension trên thanh công cụ. | Mở **side panel** ở chế độ **Full UI** (main dashboard). |
| 4 | Quan sát màn hình chào mừng. | Hiển thị hướng dẫn 3 bước: *(1) Thiết lập hồ sơ người dùng → (2) Quét trang đang mở → (3) Liên kết Gmail để mở khoá "Quét hộp thư"*. |
| 5 | (Tuỳ chọn) Bật/tắt chế độ hiển thị **Small UI** khi quét trong phần Cài đặt. | Lưu tuỳ chọn vào `chrome.storage`. |

**Kết quả:** Extension sẵn sàng; người dùng đã biết đường vào các chức năng chính.

---

### KS-02 — Thiết lập hồ sơ người dùng

**Mục tiêu:** Tạo hồ sơ định danh để NLP pipeline **so khớp sự kiện với thông tin cá nhân** của người dùng (`base_idea.md`).
**Tiền điều kiện:** KS-01 hoàn tất.

| # | Người dùng | Hệ thống |
|---|---|---|
| 1 | Trong side panel, chọn **"Thiết lập hồ sơ người dùng để trích sự kiện"**. | Mở biểu mẫu hồ sơ. |
| 2 | Nhập hồ sơ định danh: **tên, chức vị, công ty/đơn vị, danh hiệu**, email cá nhân, số hiệu/nickname thường dùng, từ khoá bổ sung (dự án đang tham gia, mã nhóm...). | Validate trường bắt buộc (tên); gợi ý từ khoá từ các trường đã nhập. |
| 3 | Nhấn **Lưu hồ sơ**. | Lưu hồ sơ vào `chrome.storage.local` (dữ liệu nhạy cảm — không rời khỏi máy). Thông báo "Hồ sơ đã sẵn sàng cho việc so khớp". |
| 4 | (Tuỳ chọn) Tạo **nhiều bối cảnh hồ sơ** (VD: "Nhân sự công ty A", "Sinh viên HK9") và chọn bối cảnh đang hoạt động. | Các sự kiện trích được sau này sẽ ghi nhận **hồ sơ liên quan** (trong số các hồ sơ người dùng đã thiết lập) theo cấu trúc sự kiện. |

**Kết quả:** Hồ sơ cá nhân sẵn sàng; các bước quét về sau có khả năng đánh dấu *"Liên quan đến tôi"*.

---

### KS-03 — Liên kết Gmail (OAuth)

**Mục tiêu:** Cấp quyền đọc email để mở khoá chức năng **"Quét hộp thư"** (kênh Gmail API).
**Tiền điều kiện:** KS-01; Google Cloud Project đã bật Gmail API và đăng ký OAuth client (phía developer — người dùng cuối không cần tự tạo client).

| # | Người dùng | Hệ thống |
|---|---|---|
| 1 | Nhấn **"Liên kết Gmail"** trên dashboard. | Kiểm tra chưa có token hợp lệ → khởi động OAuth flow với scope `https://www.googleapis.com/auth/gmail.readonly` (chỉ đọc). |
| 2 | Chọn tài khoản Google, đọc màn hình xin quyền và **follow-through quy trình liên kết** (đồng ý). | Chrome Identity nhận authorization code → đổi lấy access/refresh token; lưu token trong `chrome.storage` khu vực riêng. |
| 3 | Chờ xác nhận. | Gọi `users.getProfile` để xác minh kết nối, hiển thị "Đã liên kết: <email>"; **mở khoá chức năng "Quét hộp thư"** trên dashboard. |
| 4 | (Sau này) Muốn ngắt kết nối. | Nút **"Huỷ liên kết"**: thu hồi token, xoá token khỏi máy, khoá lại "Quét hộp thư". Dữ liệu đã trích vẫn giữ nguyên. |

**Ngoài lề:** Nếu người dùng **chưa liên kết Gmail**, chức năng **"Quét trang đang mở"** vẫn dùng được đầy đủ — đúng định hướng hai kênh thu thập độc lập.

**Luồng thay thế:**
- 3a. Người dùng từ chối cấp quyền → HT quay về dashboard, hiển thị giải thích tác động (chỉ mất kênh hộp thư), không ép buộc.
- 3b. Token hết hạn khi dùng → HT tự refresh; nếu refresh thất bại → yêu cầu liên kết lại tại bước quét tiếp theo (xem KS-11).

**Kết quả:** Gmail đã liên kết — chức năng "Quét hộp thư" mở khoá; token lưu trong `chrome.storage` trên máy người dùng. Nếu từ chối cấp quyền: mọi chức năng không cần Gmail vẫn dùng được đầy đủ.

---

### KS-04 — Quét trang web đang mở (Browser Page Parser)

**Mục tiêu:** Trích sự kiện từ nội dung trang web/email Gmail đang mở, theo yêu cầu chủ động của người dùng (`activeTab` + `scripting`).

**Tiền điều kiện:** KS-01 (cần KS-02 để có so khớp cá nhân; không cần KS-03).

| # | Người dùng | Hệ thống |
|---|---|---|
| 1 | Mở trang web cần phân tích (bài đăng lịch họp, trang thông báo, email Gmail đang xem...). | — |
| 2 | Nhấp icon extension → **mở side panel** → nhấn **"Quét trang đang mở"** (Analyze current page). | Yêu cầu quyền `activeTab` cho tab hiện tại (tạm thời, không kéo dài). |
| 3 | Quan sát **Small UI pop-out hiển thị quá trình quét nội dung** (tiến trình: thu thập → **lọc nhiễu** → phân tích → trích xuất). | Inject hàm trích xuất vào tab; **nhân bản DOM** (không làm hỏng trang đang mở) rồi chạy **Mozilla Readability** để lấy nội dung chính — loại menu, quảng cáo, thanh bên, footer. URL nguồn lấy từ tab, thời điểm trích xuất ghi tại thời điểm chạy. Chi tiết ở "Giai đoạn lọc nhiễu" bên dưới. |
| 4 | **Thao tác tiếp trên web — Small UI sẽ tự đóng** khi bước thu thập xong (người dùng không phải chờ). | Đóng Small UI; văn bản sau khi lọc nhiễu được chuyển thành `NormalizedDocument` (source=`web_page`, documentId, title, text, sourceUrl, sourceTimestamp, extractionMethod). |
| 5 | Nhấp icon extension → **mở side panel** bất cứ lúc nào sau đó. | Hiển thị **main dashboard như bình thường, có card hiển thị tiến trình xử lý nội dung** (pipeline: sàng lọc → trích xuất → chuẩn hoá → kiểm định → khử trùng lặp → so khớp hồ sơ). |
| 6 | Chờ xử lý xong (hoặc làm việc khác). | **Xử lý xong** → chuyển sang KS-08 (Full UI, danh sách sự kiện chờ duyệt). |

**Giai đoạn lọc nhiễu — Mozilla Readability (chạy trong tab, trước khi vào pipeline):**

```text
DOM gốc ──nhân bản (không ảnh hưởng trang đang mở)──> Readability
   ├─ Thành công (trang dạng bài viết)
   │     → article.textContent làm văn bản chính (đã loại menu/quảng cáo/thanh bên/footer)
   │     → article.title ưu tiên hơn document.title
   │     → article.publishedTime (nếu có) → sourceTimestamp
   ├─ Thất bại / rỗng / quá ngắn (web app: Gmail, dashboard, trang bảng)
   │     → fallback: văn bản DOM thô (innerText), gắn cờ `raw_fallback`
   └─ Phát hiện bảng lịch trình trong vùng nội dung chính
         → trích riêng vùng bảng, hợp nhất vào văn bản chính
           (bảo toàn quan hệ ngày–giờ–địa điểm–tên sự kiện)
→ NormalizedDocument (extractionMethod: "readability" | "raw_dom")
```

**Lợi ích:** văn bản vào bước sàng lọc sạch hơn → ít cảnh báo nhiễu, đồng thời giảm kích thước văn bản đưa vào mô hình (giúp giới hạn kích thước theo §9 `proposed_technical.md`).

**Luồng xử lý nội bộ (NLP pipeline dùng chung):**

```text
Văn bản chính (sau lọc nhiễu) → Sàng lọc PhoBERT (Slice F, chưa triển khai) — tài liệu có liên quan?
           → Schedule extraction (tên sự kiện, ngày giờ, địa điểm, hạn chót, quy tắc lặp)
           → Normalization (ngày giờ, múi giờ, diễn đạt tương đối: "thứ Tư tới", "tuần sau")
           → Validation (thiếu năm? thiếu múi giờ? → đánh dấu "chưa xác định", KHÔNG tự suy diễn)
           → Deduplication (so với sự kiện đã lưu)
           → So khớp hồ sơ người dùng (liên quan đến tôi? nhãn: công vụ/giải trí/cá nhân/kỷ niệm...)
```

**Luồng thay thế:**
- 2a. Tab không inject được (`chrome://`, Web Store, iframe bị chặn) → HT thông báo lý do, đề xuất copy văn bản và dùng KS-07.
- 3a. Trang động chưa render xong → HT phát hiện nội dung rỗng/quá ngắn, gợi ý "Cuộn hết trang rồi thử lại".
- 3b. Readability trả về rỗng/quá ngắn hoặc không nhận diện được nội dung chính (web app như Gmail, dashboard, trang bảng) → tự động fallback sang văn bản DOM thô, gắn cờ `raw_fallback`; kết quả duyệt ở KS-08 có thể nhiều nhiễu hơn và được ghi rõ.
- 3c. Readability làm mất bảng lịch trình khi lọc nhiễu → heuristic phát hiện bảng trong DOM, trích riêng và hợp nhất vùng bảng để bảo toàn quan hệ ngày–giờ–địa điểm–tên sự kiện.
- 6a. Không tìm thấy sự kiện nào → HT hiển thị kết quả rỗng kèm giải thích, không tạo sự kiện ảo.

**Kết quả:** Một `NormalizedDocument` (`extractionMethod = "readability" | "raw_dom"`) vào pipeline; sự kiện trích được (nếu có) chờ duyệt tại KS-08. Không có gì được lưu vĩnh viễn nếu người dùng không duyệt.

---

### KS-05 — Quét hộp thư Gmail (Gmail API — kênh chính)

**Mục tiêu:** Quét email và tệp đính kèm để tìm sự kiện, không phụ thuộc giao diện Gmail.
**Tiền điều kiện:** KS-03 (đã liên kết Gmail); KS-02 (khuyến nghị).

| # | Người dùng | Hệ thống |
|---|---|---|
| 1 | Trên dashboard, chọn **"Quét hộp thư"** → đặt phạm vi (khoảng thời gian, nhãn, từ khoá như "lịch", "họp", "deadline", "invite") → nhấn **Bắt đầu quét**. | Gọi `users.messages.list` với query tương ứng; hiển thị Small UI tiến trình (số email đã duyệt / tổng). |
| 2 | Chờ / làm việc khác. | Lần lượt gọi `users.messages.get` cho từng email hợp lệ; **duyệt cấu trúc MIME** để lấy phần văn bản (subject, sender, ngày gửi, body). |
| 3 | — | Với mỗi email có tệp đính kèm → ghi nhận metadata, gọi `users.messages.attachments.get` khi cần (chuyển sang KS-06). |
| 4 | — | Mỗi email → một `NormalizedDocument` (source=`gmail`, documentId = Gmail message ID, giữ lại định danh nguồn để dedup và truy vết). |
| 5 | Small UI tự đóng khi thu thập xong. | Đưa toàn bộ tài liệu vào **NLP pipeline dùng chung** (giống KS-04 bước 6). |
| 6 | Nhấp icon → mở side panel. | Dashboard hiển thị card tiến trình xử lý nội dung. |
| 7 | Chờ xử lý xong. | Xong → sang KS-08. Các sự kiện trùng giữa nhiều email/web được **gộp và liệt kê nguồn trích hợp nhất**. |

**Luồng thay thế:**
- 1a. Quá nhiều email → HT quét theo lô (batch) và cho phép dừng; kết quả từng lô vẫn được duyệt riêng.
- 4a. Email không liên quan → bị bước sàng lọc (PhoBERT, Slice F — chưa triển khai) loại bỏ sớm, không đưa vào extractor (tiết kiệm, giảm nhiễu).

**Kết quả:** Danh sách `NormalizedDocument` (source=`gmail`) đã qua pipeline; sự kiện mới chờ duyệt (KS-08); sự kiện khớp một bản đã duyệt nhưng lệch giá trị → chuyển KS-12.

> **Ghi chú (2026-10-26):** bước "phân loại" dùng **dịch vụ PhoBERT TASK/NON_TASK cục bộ**
> (`127.0.0.1:8000`, model bàn giao trong `ml_hasevent_filter/`). Đây là **Slice F, chưa triển khai**.
> Quy tắc đã chốt: chỉ sàng lọc **cấp tài liệu**; **không lọc vùng bôi đen/văn bản dán**; fail-open
> khi dịch vụ lỗi; tài liệu dương thì LLM nhận **toàn văn** (không cắt câu); mọi lần bỏ qua đều có
> lý do + nút **Trích xuất toàn bộ**. Chi tiết: `docs/ke-hoach-bo-loc-noi-dung.md`.

---

### KS-06 — Xử lý tệp đính kèm email

**Mục tiêu:** Trích sự kiện từ attachment (PDF/DOCX/ICS/TXT) — trả lời bài toán *"mail attachment: quyền, cách xử lý file khi chưa mở"* trong `base_idea.md`.
**Tiền điều kiện:** KS-05 đang chạy và phát hiện attachment.

| # | Người dùng | Hệ thống |
|---|---|---|
| 1 | — | Phát hiện attachment trong cấu trúc MIME; đọc **metadata chưa cần mở file** (tên file, loại MIME, kích thước) và hiển thị trong danh sách đang xử lý. |
| 2 | — | Tải dữ liệu attachment qua `users.messages.attachments.get`, chuyển base64 → Blob. |
| 3 | — | **Chọn parser theo định dạng** (Document Processing Layer): HTML → DOM extraction + Readability (lọc nhiễu giống KS-04); PDF có text → PDF.js; PDF scan/hình ảnh → OCR; DOCX → Mammoth.js; TXT → chuẩn hoá văn bản; ICS → parser iCalendar lấy sự kiện có cấu trúc sẵn. |
| 4 | — | Với tài liệu lịch trình dạng bảng: **bảo toàn cấu trúc bảng và metadata** (tránh mất quan hệ ngày–giờ–địa điểm–tên sự kiện). |
| 5 | — | Kết quả hợp nhất với body email (tránh trùng lặp giữa body và attachment) → pipeline dùng chung. |

**Nguyên tắc bảo mật:** không thực thi script/macro từ tài liệu đầu vào; chỉ phân tích nội dung, không chạy mã nhúng.

**Kết quả:** Nội dung attachment được parse đúng định dạng và hoà vào pipeline chung; tệp thất bại được liệt kê kèm lý do (KS-11), không chặn các tệp khác.

---

### KS-07 — Trích từ vùng văn bản được chọn (bôi đen)

**Mục tiêu:** Trả lời bài toán *"PDF: người dùng có thể bôi đen"* trong `base_idea.md` — trích nhanh từ vùng người dùng chủ động chọn.
**Tiền điều kiện:** KS-01; hoạt động trên trang web/PDF mở bằng trình xem của trình duyệt.

| # | Người dùng | Hệ thống |
|---|---|---|
| 1 | **Bôi đen** đoạn văn bản chứa thông tin sự kiện trên trang/PDF đang mở. | — |
| 2 | Nhấp chuột phải → menu ngữ cảnh **"Trích sự kiện từ vùng chọn"** (hoặc phím tắt). | Dùng quyền `activeTab` vừa được chủ động cấp; lấy `window.getSelection()` + URL + tiêu đề trang. |
| 3 | Quan sát Small UI ngắn. | Tạo `NormalizedDocument` (text = vùng chọn) → pipeline dùng chung. |
| 4 | Xem kết quả trong side panel. | Danh sách sự kiện trích từ vùng chọn, kèm nguồn trích (URL + đoạn nguyên văn). Duyệt như KS-08. |

**Lưu ý:** Vùng chọn do người dùng chỉ định sẵn nên **bỏ qua bước lọc nhiễu Readability**; văn bản vào pipeline nguyên vẹn như đã bôi đen (gắn `extractionMethod = "selection"`).

**Kết quả:** Sự kiện trích từ vùng chọn chờ duyệt tại KS-08; nguồn trích gồm URL + đúng đoạn người dùng đã chọn.

---

### KS-08 — Xem lại & phê duyệt sự kiện trích được (Review UI)

**Mục tiêu:** Người dùng kiểm soát kết quả cuối cùng trước khi lưu — bắt buộc trước khi sự kiện vào lịch (`proposed_technical.md` §8 bước 6).

**Tiền điều kiện:** KS-04/05/07 đã xử lý xong.

| # | Người dùng | Hệ thống |
|---|---|---|
| 1 | — | **Xử lý xong** → **mở Full UI, hiển thị danh sách sự kiện trích được và chờ approve từ người dùng**. |
| 2 | Xem danh sách. | Mỗi thẻ sự kiện hiển thị đủ cấu trúc theo `base_idea.md`: **thời điểm bắt đầu; kết thúc/thời lượng; nhãn (công vụ, giải trí, cá nhân, kỷ niệm...); tiêu đề; nội dung tóm gọn 1–5 ý với LLM (nhập tay có thể nhiều hơn, demo cap 50); hồ sơ liên quan; nguồn trích**. Các trường chưa chắc chắn được gắn nhãn "chưa xác định" thay vì đoán. |
| 3 | Bấm vào một sự kiện để xem chi tiết + **đoạn văn bản gốc trích dẫn** (bấm được để mở lại nguồn). | Hiển thị chi tiết, làm nổi phần pipeline tự đánh dấu cần kiểm tra (VD: "chưa rõ năm", "múi giờ giả định theo máy"). |
| 4 | **Sửa nhanh** tại chỗ (tiêu đề, thời gian, nhãn...) nếu trích sai. | Cập nhật bản nháp; ghi nhận chỉnh sửa để cải thiện chất lượng trích xuất. |
| 5 | **Chọn các sự kiện muốn theo dõi và nhấn Xác nhận** (bỏ chọn những sự kiện không cần). | Chỉ duyệt các mục được chọn. |
| 6 | — | **Lưu sự kiện với metadata vào IndexedDB**: dữ liệu sự kiện + trạng thái + nguồn trích + kết quả so khớp hồ sơ. |
| 7 | — | Thông báo **HOÀN THÀNH**: "Đã lưu N sự kiện vào lịch của bạn". Sự kiện chuyển trạng thái **Đang theo dõi** và có sẵn trong KS-09, KS-10. |

**Kết quả:** Sự kiện được chọn chuyển **Đang theo dõi** trong IndexedDB (kèm metadata); mục bỏ chọn bị loại khỏi danh sách nháp; mốc thông báo mặc định áp theo cấu hình KS-10.

---

### KS-09 — Quản lý sự kiện (CRUD)

**Mục tiêu:** Quản lý đầu ra theo `base_idea.md` ("CRUD sự kiện thế nào") — đúng 4 thao tác cơ bản trong bản nháp SVG.

**Tiền điều kiện:** Có ít nhất một sự kiện đang theo dõi trong IndexedDB.

| Thao tác | Người dùng | Hệ thống |
|---|---|---|
| **Read — Xem danh sách** | Mở tab **"Sự kiện"** trong Full UI; lọc theo nhãn (công vụ/giải trí/cá nhân/kỷ niệm), khoảng thời gian, trạng thái (sắp tới/đã huỷ/đã hoàn thành). | Liệt kê sự kiện đã lưu sắp theo thời gian; badge "Liên quan đến tôi" cho các sự kiện khớp hồ sơ. |
| **Read — Xem chi tiết** | Bấm một sự kiện cụ thể. | Hiển thị đầy đủ 7 trường cấu trúc + nguồn trích dẫn (mở được email/trang gốc) + lịch sử thông báo của sự kiện. |
| **Update — Sửa** | Mở chi tiết → **Sửa thông tin của sự kiện** (tiêu đề, thời gian, nhãn, tóm tắt, hồ sơ liên quan). | Lưu bản chỉnh sửa, ghi `updatedAt`, giữ nguyên nguồn trích gốc. |
| **Delete — Xoá** | Xoá sự kiện khỏi danh sách (kèm xác nhận). | Xoá khỏi IndexedDB; sự kiện không còn được thông báo. |
| **Đánh dấu hoàn thành** | Bấm "✓ Đã xong" trên chi tiết sự kiện (tuỳ chọn). | Chuyển **Hoàn thành**, dừng mốc thông báo còn lại, ghi `completedAt`. *(Service worker cũng tự chuyển khi sự kiện qua thời điểm kết thúc — khớp với KS-10.)* |

**Ngoài luồng CRUD:** nút **"Huỷ sự kiện"** từ thông báo (KS-10) chỉ **ẩn sự kiện khỏi giao diện và đánh dấu "Huỷ"** (không xoá cứng) — người dùng có thể khôi phục trong bộ lọc "Đã huỷ". Sự kiện **thiếu thời điểm bắt đầu hợp lệ** nằm trong mục **"Cần bổ sung thời gian"** cho đến khi ND điền xong (chưa xếp được mốc thông báo — xem KS-10).

**Kết quả:** IndexedDB luôn phản ánh đúng thao tác vừa thực hiện; mọi thay đổi về mốc thông báo có hiệu lực từ lần kiểm tra kế tiếp của service worker.

---

### KS-10 — Thông báo sự kiện sắp tới

**Mục tiêu:** *"Cách thông báo khi có sự kiện đến"* (`base_idea.md`) — nhắc việc trước khi sự kiện hoàn thành, đúng ba nhánh quyết định trong bản nháp SVG.
**Tiền điều kiện:** Có sự kiện **Đang theo dõi**; extension chạy nền khi mở trình duyệt.

**Cấu hình trước (một lần, trong Cài đặt — ngoài luồng runtime):** ND **chọn khi được thông báo**: bật/tắt từng mốc **1 tuần trước / 1 ngày trước / ngày diễn ra**. HT lưu tuỳ chọn, áp dụng cho sự kiện mới (sự kiện cũ giữ cấu hình riêng nếu ND đã chỉnh).

| # | Người dùng | Hệ thống |
|---|---|---|
| 1 | Mở trình duyệt như bình thường. | **Extension chạy khi mở trình duyệt**: service worker định kỳ so sánh thời điểm hiện tại với các mốc thông báo của từng sự kiện (bù lại các mốc bị lỡ khi máy tắt — nhắc muộn nhất một lần kèm ghi chú "trễ"). |
| 2 | Nhận thông báo hệ điều hành khi tới mốc: *"Họp dự án XLNNTN — 9:00 thứ Tư tại B404 (còn X ngày)"* kèm 3 nút. | Hiển thị notification qua Chrome Notification API; đánh dấu mốc này "đã bắn" để không lặp. |
| 3 | Chọn một trong ba phản ứng: | Xử lý theo bảng dưới. |

| Người dùng chọn | Hệ thống phản ứng |
|---|---|
| **"Đã xem"** | Ghi nhận đã đọc mốc này → **chờ đến thời điểm thông báo tiếp theo** (mốc kế tiếp trong cấu hình vẫn được nhắc). |
| **"Không nhắc lại"** | Đặt cờ mute cho sự kiện → **không thông báo trong các mốc tiếp theo**; sự kiện vẫn hiển thị bình thường trong danh sách. |
| **"Huỷ sự kiện"** | **Ẩn sự kiện khỏi giao diện và đánh dấu sự kiện là "Huỷ"**; dừng mọi thông báo; có thể khôi phục qua KS-09 (bộ lọc "Đã huỷ"). |

**Loại trừ khỏi nhắc việc:** Sự kiện **Đang theo dõi nhưng chưa có thời điểm bắt đầu hợp lệ** (nằm trong `validation.uncertain`) **không được xếp mốc** — hiển thị ở mục "Cần bổ sung thời gian" (KS-09) chờ ND điền; mốc chỉ kích hoạt sau khi thời gian được xác nhận.

**Sau khi diễn ra:** service worker tự chuyển sự kiện **qua thời điểm kết thúc** sang **Hoàn thành** (KS-09) — huỷ mọi mốc còn lại, không nhắc việc đã qua hạn.

**Kết quả:** Người dùng luôn được nhắc đúng hạn, có quyền kiểm soát từng mức độ can thiệp, và không bao giờ bị nhắc lại những gì đã quyết định bỏ qua.

---

### KS-11 — Các luồng lỗi và ngoại lệ

Theo nguyên tắc §9 của `proposed_technical.md`: chỉ đọc khi người dùng chủ động yêu cầu; kiểm soát dữ liệu gửi đi; không bao nhiễu khi lỗi.

| Tình huống | Phản hồi hệ thống | Liên quan |
|---|---|---|
| Trang không inject được script (trang hệ thống, Web Store, CSP chặn) | Thông báo rõ lý do; đề xuất bôi đen + dùng KS-07. | KS-04 |
| Trang động chưa render xong / nội dung rỗng | Cảnh báo "nội dung có vẻ chưa tải đủ", gợi ý cuộn hết trang rồi quét lại. | KS-04 |
| Readability không nhận diện được nội dung chính (trang không phải bài viết: web app, Gmail đang mở, dashboard) | Fallback tự động sang văn bản DOM thô, gắn cờ `raw_fallback`; cảnh báo kết quả có thể chứa nhiễu. | KS-04 |
| Readability làm mất bảng lịch trình khi lọc nhiễu | Heuristic phát hiện bảng: trích riêng và hợp nhất vùng bảng, bảo toàn quan hệ ngày–giờ–địa điểm–tên sự kiện. | KS-04, KS-06 |
| Văn bản quá lớn | Cắt/giới hạn kích thước đưa vào mô hình, báo phần đã xử lý. | KS-04, KS-05 |
| Không phát hiện sự kiện nào | Hiển thị kết quả rỗng kèm giải thích; không suy diễn sự kiện ảo. | KS-04, 05, 07 |
| Trường thiếu căn cứ (năm, múi giờ không nêu trong văn bản) | Đánh dấu **"chưa xác định"**, đưa vào diện cần người dùng kiểm tra ở KS-08; **không tự gán giá trị**. | Pipeline |
| Phát hiện sự kiện trùng lặp (email ↔ attachment ↔ web) | Gộp thành một sự kiện, liệt kê tất cả nguồn trích; người dùng quyết định ở màn duyệt. | KS-05, KS-08 |
| Token Gmail hết hạn / bị thu hồi | Tự refresh; nếu thất bại → dừng quét, yêu cầu liên kết lại (KS-03), giữ an toàn dữ liệu đã có. | KS-03, KS-05 |
| Tệp đính kèm không hỗ trợ / parser thất bại / PDF scan cần OCR | Bỏ qua tệp, ghi vào danh sách "chưa xử lý được" kèm lý do; các phần khác vẫn chạy. | KS-06 |
| OCR/inference cần backend | Chỉ gửi khi có thông báo rõ cho người dùng; kiểm soát quyền truy cập, mã hoá truyền tải, thời gian lưu trữ và quy trình xoá dữ liệu. | KS-05, KS-06 |
| Endpoint remote trả 401/403/404/429/5xx | Báo đúng loại lỗi (key/quyền, model, giới hạn, dịch vụ); không lưu sự kiện rác; cho phép đổi provider về **Máy này**. | KS-14 |
| Chưa đồng ý gửi nội dung tới origin remote | Chặn job, hiện lại cảnh báo consent; không gửi request. | KS-14 |
| Đổi origin remote (Cloudflared cấp URL mới) | Yêu cầu đồng ý lại; không tự dùng endpoint cũ. | KS-14 |
| Máy tắt → lỡ mốc thông báo | Khi mở trình duyệt, bù một thông báo muộn nhất kèm nhãn "trễ"; không bắn dồn nhiều notification cũ. | KS-10 |
| Sự kiện đã duyệt xuất hiện lại ở lần quét sau nhưng **thay đổi lịch** (VD: email Reply dời giờ họp) | Không tạo trùng lặp — chuyển luồng KS-12: so sánh, gợi ý cập nhật, ND quyết định. | KS-12 |
| Sự kiện đang theo dõi **thiếu thời điểm bắt đầu hợp lệ** | Không xếp mốc thông báo; đưa vào "Cần bổ sung thời gian" (KS-09) chờ ND xác nhận. | KS-09, KS-10 |

---

### KS-12 — Cập nhật sự kiện khi nguồn thay đổi lịch

**Mục tiêu:** Lịch thay đổi là thực tế phổ biến nhất (email Reply "dời giờ họp", thông báo mới đè lịch cũ) — hệ thống không được tạo trùng lặp, cũng không được tự ý ghi đè.
**Tiền điều kiện:** Có sự kiện **Đang theo dõi**; một lần quét (KS-04/05/06/07) trích được thông tin khớp sự kiện đó nhưng khác giá trị.

| # | Người dùng | Hệ thống |
|---|---|---|
| 1 | — | Dedup phát hiện bản trùng *không giống hệt* một sự kiện đã duyệt (so tiêu đề gần đúng + nguồn cùng chuỗi email + thời gian lệch nhau) → đánh dấu "nghi thay đổi", **không tạo sự kiện mới**. |
| 2 | Xem card cảnh báo trên dashboard: *"Lịch 'Họp dự án' có thể đã đổi: 9:00 → 14:00 (nguồn: email Reply)"*. | Hiển thị so sánh **cũ ↔ mới** theo từng trường (thời điểm, địa điểm, tóm tắt), kèm nguồn trích của bản mới. |
| 3 | Chọn một trong ba: | Xử lý theo bảng dưới. |

| Người dùng chọn | Hệ thống phản ứng |
|---|---|
| **"Cập nhật"** | Ghi đè các trường thay đổi lên sự kiện (bản cũ lưu vào `versionHistory`), thêm nguồn mới vào `sources`, tính lại mốc thông báo. |
| **"Giữ nguyên"** | Bỏ qua bản cập nhật; nếu nội dung lặp lại giống hệt từ cùng nguồn thì không nhắc lại lần nữa. |
| **"Tạo sự kiện riêng"** | Thêm như sự kiện mới — dùng khi thực chất là hai buổi khác nhau. |

**Kết quả:** Không phát sinh lịch trùng sai lệch; mọi thay đổi đều do ND quyết định và để lại dấu vết (lịch sử phiên bản + nguồn trích).

---

### KS-13 — Xung đột lịch & xuất dữ liệu *(định hình Giai đoạn 4)*

**Mục tiêu:** Hỗ trợ quản lý sau khi đã trích: phát hiện xung đột lịch và mang dữ liệu ra ngoài extension.
**Trạng thái:** placeholder cho Giai đoạn 4 (`proposed_technical.md` §10) — chưa triển khai, ghi trước để Phụ lục B có mã tham chiếu.

| # | Người dùng | Hệ thống |
|---|---|---|
| 1 | Xem danh sách/chi tiết sự kiện. | Phát hiện **xung đột lịch**: hai sự kiện Đang theo dõi có khoảng thời gian chồng lấn → gắn nhãn cảnh báo "Trùng lịch" ở cả hai. |
| 2 | Xem cảnh báo và tự xử lý (sửa/huỷ một bên). | Cảnh báo chỉ là nhãn — HT không tự đổi lịch; tính lại sau mỗi thay đổi. |
| 3 | Chọn **"Xuất ICS"** (toàn bộ hoặc từng sự kiện). | Sinh tệp `.ics` chuẩn iCalendar (DTSTART/DTEND/SUMMARY/DESCRIPTION/LOCATION) — ND tự nhập vào Google Calendar/Outlook nếu muốn. |
| 4 | *(Định hướng)* Chọn "Đồng bộ calendar". | Viết sự kiện trực tiếp vào calendar bên ngoài (đọc-ghi) — cần đánh giá scope OAuth và luồng xác minh riêng trước khi làm. |

**Kết quả (khi hoàn thiện):** Xung đột phát hiện sớm, dữ liệu không bị nhốt trong extension — xuất mở, đồng bộ là tuỳ chọn nâng cao.

---

### KS-14 — Chọn nơi chạy suy luận (local / dịch vụ ngoài)

**Mục tiêu:** Người dùng kiểm soát suy luận chạy ở đâu — máy mình (mặc định), một dịch vụ
OpenAI-compatible, hay máy trạm riêng — mà không đổi pipeline trích xuất.
**Trạng thái:** đã chốt ngày 2026-10-26, **chưa triển khai** trong demo hiện tại.
**Tiền điều kiện:** đã có nội dung cần trích (KS-04/05/06/07); extension đang dùng provider mặc định.

| # | Người dùng | Hệ thống |
|---|---|---|
| 1 | Mở **Cài đặt → Nơi chạy suy luận**. | Hiển thị hai lựa chọn: **Máy này** (đang chọn, `127.0.0.1:8080`) và **Endpoint khác**. |
| 2 | Chọn **Endpoint khác**, nhập base URL, API key (nếu cần) và tên model. | Chuẩn hoá URL; từ chối HTTP ngoài localhost (mọi host khác phải dùng HTTPS); yêu cầu quyền host cho đúng origin nếu chưa có. |
| 3 | Bấm **Kiểm tra kết nối**. | Nếu origin chưa được đồng ý: hiện cảnh báo một lần — *"Nội dung trang sẽ được gửi tới `<host>`. Dữ liệu rời trình duyệt và có thể đi qua nhà cung cấp. API key chỉ lưu trên máy này."* — kèm **Đồng ý** / **Huỷ**. |
| 4 | Chọn **Đồng ý**. | Gọi health; thành công thì lưu `provider`, `endpoint`, `apiKey`, `model` + mốc đồng ý theo origin; hiện model/endpoint. |
| 5 | Quay lại **Quét nội dung** và bấm **Trích sự kiện**. | Job dùng provider đã chọn; pipeline, prompt, schema, dedup, lưu `nhap` không đổi; tiến trình ghi rõ provider/model. |
| 6 | (Tuỳ chọn) Chọn **Máy này** rồi trích lại. | Dùng lại `llama-server` cục bộ; không hỏi consent; endpoint/key remote vẫn được giữ để đổi lại. |
| 7 | (Tuỳ chọn) Bấm **Thu hồi đồng ý** hoặc **Xoá key**. | Xoá mốc đồng ý/key tương ứng; lần chạy remote sau bị chặn cho tới khi đồng ý lại. |

**Luồng thay thế / lỗi:**

| Tình huống | Phản hồi |
|---|---|
| Người dùng **Huỷ** ở bước đồng ý | Không lưu endpoint, không gửi request; giữ provider cũ. |
| Origin đã đổi (ví dụ Cloudflared cấp URL mới) | Yêu cầu đồng ý lại cho origin mới; endpoint cũ không tự chạy. |
| 401/403 | "API key không đúng hoặc chưa được cấp quyền"; không lưu trạng thái "đã kết nối". |
| 404 | "Không thấy model/endpoint"; gợi ý kiểm tra base URL và tên model. |
| 429 / 5xx | Báo giới hạn tần suất/dịch vụ lỗi; retry có giới hạn, không lưu rác. |
| Timeout / mất mạng | Job dừng, báo lỗi; sự kiện đã lưu trước đó vẫn nguyên. |
| Provider remote bỏ qua JSON schema | Output vẫn qua `parseRawExtraction`; retry 1 lần rồi báo lỗi, không lưu sự kiện rác. |
| Người dùng xoá toàn bộ dữ liệu | Xoá cả settings, key và mốc đồng ý. |

**Kết quả:** Người dùng chủ động chọn nơi suy luận; mặc định vẫn là máy này; dữ liệu chỉ rời
máy sau khi có đồng ý rõ ràng, và có thể thu hồi bất cứ lúc nào.

---

## 3. Ma trận phủ yêu cầu

**Từ `base_idea.md`:**

| Yêu cầu | Kịch bản đáp ứng |
|---|---|
| Đầu vào: nội dung web raw | KS-04 (Mozilla Readability lọc nhiễu + fallback DOM thô; bỏ qua Readability khi bôi đen — KS-07) |
| Đầu vào: PDF bôi đen / tự động | KS-07 (bôi đen), KS-05+KS-06 (tự động qua attachment) |
| Đầu vào: mail attachment khi chưa mở | KS-06 (metadata trước, tải qua Gmail API khi xử lý) |
| Phân loại nội dung có chứa "sự kiện" | Pipeline — Relevance classification (KS-04/05 bước nội bộ) |
| So khớp sự kiện với thông tin cá nhân | KS-02 (hồ sơ) + bước matching trong pipeline; cột "Hồ sơ liên quan" (KS-08/09) |
| CRUD sự kiện | KS-09 (đủ 4 thao tác bản nháp SVG) |
| Cách thông báo khi có sự kiện đến | KS-10 (3 mốc, 3 lựa chọn theo bản nháp SVG) |
| Kiểm soát dữ liệu rời máy | KS-14 (chọn local/remote, consent theo origin, thu hồi) |
| Cấu trúc 7 trường của sự kiện | Mô hình dữ liệu Phụ lục A; hiển thị ở KS-08, KS-09 |

**Từ `proposed_technical.md`:**

| Yêu cầu | Kịch bản đáp ứng |
|---|---|
| Gmail API: list / get / attachments.get / getProfile | KS-03, KS-05, KS-06 |
| Browser Page Parser: activeTab, scripting, popup Analyze | KS-04 (kèm giai đoạn lọc nhiễu Readability) |
| Kết hợp hai kênh, hợp nhất kết quả | KS-05 (body + attachment) + dedup (KS-11, KS-12) |
| §6 — Parser theo định dạng (HTML/PDF/DOCX/TXT/ICS/OCR) | KS-06 |
| §7 — Chuẩn hoá dữ liệu đầu vào (`NormalizedDocument`) | Phụ lục A; tạo tại KS-04/05/06/07 |
| NLP pipeline 6 bước | Mô tả trong KS-04 (bước 6), áp dụng chung mọi kênh |
| Lưu trữ + review UI | KS-08, KS-09 (IndexedDB) |
| Bảo mật & xử lý lỗi | Rải khắp các kịch bản; tổng hợp tại KS-11 |
| §9 — lựa chọn nơi chạy suy luận, consent, key | KS-14 |
| Lộ trình 4 giai đoạn | Xem Phụ lục B |

---

## Phụ lục A — Mô hình dữ liệu dùng trong kịch bản

```typescript
// Chuẩn hoá đầu vào (proposed_technical.md §7)
interface NormalizedDocument {
  source: "gmail" | "web_page";
  documentId: string;          // Gmail message ID hoặc ID tự sinh
  title: string;
  text: string;
  sourceUrl?: string;
  sourceTimestamp?: string;    // Ưu tiên article.publishedTime của Readability khi có
  extractionMethod: "readability" | "raw_dom" | "selection" | "parser";
}

// Cấu hình nơi chạy suy luận (KS-14; kế hoạch, chưa triển khai)
// Mở rộng `LlmSettings` hiện có trong src/shared/contracts.ts
interface LlmSettings {
  provider: "local" | "openai-compatible";   // mặc định: "local"
  endpoint: string;                          // mặc định: http://127.0.0.1:8080
  apiKey: string;                            // chỉ lưu cục bộ, KHÔNG xuất trong JSON
  model: string;                             // rỗng = model đang nạp (local) hoặc tự dò
  consentByOrigin: Record<string, string>;   // origin -> thời điểm đồng ý; {} nếu chưa
}

// Sự kiện (base_idea.md) + trạng thái vận hành
interface Event {
  id: string;

  // --- 7 trường theo base_idea.md ---
  start: TimeValue;            // Thời điểm bắt đầu
  end?: TimeValue;             // Thời điểm kết thúc / Thời lượng
  label: "công_vụ" | "giải_trí" | "cá_nhân" | "kỷ_niệm" | string;
  tags: string[];             // Nhãn tuỳ chỉnh; mặc định [] khi bản ghi cũ thiếu trường này
  title: string;
  summary: string[];           // 1–5 ý với LLM; nhập tay không giới hạn 5 (demo cap 50)
  relatedProfiles: string[];   // Hồ sơ liên quan (trong số hồ sơ người dùng đã thiết lập)
  sources: SourceRef[];        // Nguồn trích (có thể nhiều nguồn khi gộp trùng lặp)

  // --- Trạng thái ---
  status: "nhap" | "dang_theo_doi" | "hoan_thanh" | "huy";
  validation: { uncertain: string[] };   // VD: ["nam_chua_ro", "mui_gio_gia_dinh"]
  notifications: {
    milestones: ("1_tuan_truoc" | "1_ngay_truoc" | "ngay_dien_ra")[];
    fired: string[];           // Các mốc đã bắn
    mute: boolean;             // "Không nhắc lại"
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;      // Thời điểm chuyển "Hoàn thành" (service worker qua end, hoặc ND đánh dấu — KS-09)
  versionHistory?: { at: string; changedFields: string[]; previous: Record<string, unknown> }[];  // KS-12 "Cập nhật"
}

interface SourceRef {
  documentId: string;
  kind: "gmail" | "web_page" | "attachment" | "selection";
  title: string;
  url?: string;
  quote?: string;              // Đoạn nguyên văn để truy vết
}
```

**Ví dụ một sự kiện đã duyệt:**

```json
{
  "id": "evt_20261021_hop_dua_an",
  "title": "Họp dự án XLNNTN — chốt kế hoạch tuần",
  "label": "công_vụ",
  "tags": ["đồ án", "họp nhóm"],
  "start": { "value": "2026-10-21T09:00:00+07:00", "raw": "9h sáng thứ Tư tới" },
  "end":   { "value": "2026-10-21T10:30:00+07:00" },
  "summary": [
    "Chủ đề: phân công nhiệm vụ giai đoạn 2",
    "Yêu cầu: chuẩn bị báo cáo tiến độ cá nhân",
    "Địa điểm: Phòng B404 / Google Meet",
    "Kết quả: biên bản họp gửi qua email cuối ngày"
  ],
  "relatedProfiles": ["Nguyễn Văn A — Sinh viên, nhóm XLNNTN"],
  "sources": [{
    "documentId": "18f3a0c9...",
    "kind": "gmail",
    "title": "[XLNNTN] Kế hoạch tuần 43",
    "url": "https://mail.google.com/#inbox/18f3a0c9...",
    "quote": "Thứ Tư (21/10) 9h00 họp tại phòng B404..."
  }],
  "status": "dang_theo_doi",
  "notifications": { "milestones": ["1_tuan_truoc", "1_ngay_truoc", "ngay_dien_ra"], "fired": [], "mute": false }
}
```

---

## Phụ lục B — Ánh xạ kịch bản theo lộ trình triển khai

| Giai đoạn (`proposed_technical.md` §10) | Kịch bản |
|---|---|
| 1 — Browser Page Parser cơ bản | KS-01, KS-04 (tích hợp Readability cơ bản + fallback DOM thô), KS-08 (bản đầu), KS-09 (Read) |
| 2 — Kết hợp Gmail API | KS-03, KS-05, KS-06, dedup cơ bản |
| 3 — Cải thiện chất lượng trích xuất | KS-07, heuristic bảo toàn bảng khi lọc nhiễu Readability, xử lý trang động/nội dung dài, PDF/DOCX/OCR đầy đủ |
| 4 — Hoàn thiện quản lý lịch | KS-09 (đầy đủ CRUD + hoàn thành), KS-10, KS-12 (trùng lặp/thay đổi lịch), KS-13 (xung đột lịch, xuất ICS/tích hợp calendar) |
| Bổ sung sau Giai đoạn 4 (đã chốt 2026-10-26) | KS-14 (chọn nơi chạy suy luận: local / dịch vụ ngoài / máy trạm) |

---

*Tài liệu này hoàn thiện kịch bản trong `unfinished_script.svg` — bổ sung: lọc nhiễu Readability (KS-04), trích vùng chọn (KS-07), tệp đính kèm (KS-06), cập nhật lịch từ nguồn (KS-12), placeholder Giai đoạn 4 (KS-13), chọn nơi chạy suy luận (KS-14, chốt 2026-10-26, chưa triển khai), hậu điều kiện đồng bộ cho mọi kịch bản, phân rã thành phần hệ thống, mô hình dữ liệu và ma trận phủ yêu cầu — sẵn sàng dùng làm kịch bản demo/báo cáo tiến độ.*
