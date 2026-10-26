# NLP for Schedule Arrangement — Tổng hợp kiến trúc kỹ thuật và phương án triển khai

## 1. Mục tiêu dự án

Phát triển một Chrome Extension có khả năng thu thập thông tin từ nhiều nguồn, nhận diện nội dung liên quan đến lịch trình, trích xuất sự kiện và chuẩn hóa dữ liệu để phục vụ quản lý lịch cá nhân.

Trong giai đoạn hiện tại, dự án tập trung vào hai chức năng chính:

1. **Gmail API:** Truy xuất email và tệp đính kèm để tìm kiếm thông tin lịch trình.
2. **Browser Page Parser:** Phân tích nội dung văn bản của trang web đang mở, bao gồm email Gmail đang được xem, như một phương án bổ sung cho Gmail API.

Định hướng kiến trúc là tách biệt việc thu thập dữ liệu khỏi quy trình NLP, giúp hệ thống có thể mở rộng sang Outlook, PDF, DOCX, trang web và các nguồn dữ liệu khác trong tương lai.

## 2. Kiến trúc tổng thể

```text
Data Sources
├── Gmail API
│   ├── Email body
│   └── Attachments
└── Browser Page Parser
    ├── Current webpage
    ├── Opened Gmail message
    └── Visible attachment metadata
             |
             v
    Document Processing
    ├── HTML / text extraction
    ├── PDF / DOCX parsing
    └── OCR (nếu cần)
             |
             v
    Shared NLP Pipeline
    ├── Schedule relevance screening (PhoBERT cục bộ — Slice F, chưa triển khai)
    ├── Schedule information extraction ──► Inference provider
    │                                       (local llama.cpp mặc định;
    │                                        endpoint OpenAI-compatible tuỳ chọn)
    ├── Date/time normalization
    ├── Validation
    └── Deduplication
             |
             v
    Schedule Store / Review UI
    ├── Display extracted events
    ├── User correction
    └── Export / calendar integration
```

## 3. Phương án A — Thu thập dữ liệu bằng Gmail API

Gmail API là phương án chính để truy xuất email và tệp đính kèm một cách có cấu trúc, không phụ thuộc vào giao diện Gmail.

### Các API quan trọng

- `users.messages.list`: Tìm kiếm email theo điều kiện.
- `users.messages.get`: Lấy thông tin và nội dung email.
- `users.messages.attachments.get`: Lấy dữ liệu của tệp đính kèm.
- `users.getProfile`: Kiểm tra thông tin tài khoản đang kết nối.

### Quy trình xử lý

1. Người dùng đăng nhập Google và cấp quyền Gmail cho extension.
2. Extension tìm kiếm email theo thời gian hoặc điều kiện lọc.
3. Truy xuất nội dung email và duyệt cấu trúc MIME để lấy phần văn bản.
4. Xác định tệp đính kèm và tải dữ liệu cần thiết.
5. Chuyển nội dung email và tệp đính kèm sang quy trình xử lý chung.

### OAuth và quyền truy cập

Developer cấu hình Google Cloud Project, bật Gmail API, đăng ký OAuth client cho Chrome Extension và thiết lập OAuth consent screen. Người dùng cuối chỉ cần cài extension, đăng nhập và cấp quyền theo yêu cầu; không cần tự tạo OAuth client.

Nên sử dụng scope `https://www.googleapis.com/auth/gmail.readonly` nếu chỉ cần đọc email. Đây là restricted scope, vì vậy ứng dụng phân phối công khai có thể phải trải qua quy trình xác minh OAuth và đáp ứng các yêu cầu bảo mật dữ liệu tương ứng.

## 4. Phương án B — Browser Page Parser

Browser Page Parser cho phép người dùng yêu cầu extension phân tích văn bản trên trang web hiện đang mở mà không cần xây dựng tích hợp API riêng cho từng website.

### Công nghệ và quyền cần thiết

- **Manifest V3:** Nền tảng Chrome Extension.
- **`activeTab`:** Cấp quyền truy cập tạm thời vào tab sau khi người dùng chủ động gọi extension.
- **`scripting`:** Cho phép inject hàm hoặc content script vào trang được cấp quyền.
- **DOM API:** Đọc nội dung văn bản đang được render.
- **Extension popup:** Cung cấp nút `Analyze current page` để bắt đầu xử lý.

### Quy trình hoạt động

1. Người dùng mở trang web cần phân tích.
2. Người dùng bấm nút `Analyze current page`.
3. Extension truy cập tab hiện tại và trích xuất:
   - Tiêu đề trang.
   - URL nguồn.
   - Văn bản đọc được.
   - Thời điểm trích xuất.
4. Văn bản được chuyển vào pipeline NLP dùng chung.
5. Extension hiển thị các sự kiện được phát hiện để người dùng kiểm tra.

### Giới hạn kỹ thuật

Page parser chủ yếu đọc nội dung có trong DOM của trang. Nó không tự động lấy được toàn bộ dữ liệu của tệp đính kèm chưa mở, dữ liệu PDF gốc, hình ảnh hoặc nội dung trong các vùng bị giới hạn quyền truy cập.

Các trang web động có thể chưa render đầy đủ nội dung tại thời điểm trích xuất. Cần giới hạn kích thước văn bản, xử lý trường hợp không có nội dung và bảo toàn cấu trúc bảng khi có thể.

## 5. Xử lý email Gmail đang mở và tệp đính kèm

Page parser có thể đọc nội dung email Gmail đang hiển thị, chẳng hạn subject, body, sender, ngày gửi và tên tệp đính kèm. Tuy nhiên, khả năng đọc chính xác phụ thuộc vào cấu trúc DOM của Gmail và cách nội dung được render.

**Phương án khuyến nghị là kết hợp Browser Page Parser và Gmail API:**

- Page parser lấy nội dung hiển thị và ngữ cảnh của trang.
- Gmail API lấy cấu trúc email chính xác hơn và dữ liệu tệp đính kèm.
- Parser chuyên biệt xử lý nội dung của từng loại tệp.
- Kết quả được hợp nhất trước khi đưa vào NLP pipeline.

Nếu xác định được Gmail message ID của email đang mở, extension có thể gọi `users.messages.get` để lấy email tương ứng, sau đó gọi `users.messages.attachments.get` khi cần tải dữ liệu tệp đính kèm. Cần có cơ chế nhận diện message ID đủ tin cậy; không nên phụ thuộc hoàn toàn vào selector DOM không ổn định.

## 6. Document Processing Layer

Nên xây dựng parser riêng cho từng định dạng thay vì đặt tất cả logic vào một hàm:

| Định dạng | Phương án xử lý |
|---|---|
| HTML / Web page | DOM extraction; cân nhắc Readability để lấy nội dung chính |
| PDF có text | PDF.js hoặc parser PDF phù hợp |
| PDF scan / hình ảnh | OCR |
| DOCX | Mammoth.js hoặc thư viện tương đương |
| TXT | Đọc và chuẩn hóa văn bản |
| ICS | Parser iCalendar để lấy sự kiện có cấu trúc |

Cần lưu ý rằng việc chuyển PDF hoặc bảng biểu thành plain text có thể làm mất mối quan hệ giữa ngày, giờ, địa điểm và tên sự kiện. Với tài liệu lịch trình, nên bảo toàn cấu trúc bảng và metadata khi khả thi.

## 7. Chuẩn hóa dữ liệu đầu vào

Mọi nguồn dữ liệu cần chuyển thành một cấu trúc thống nhất trước khi xử lý NLP.

Ví dụ:

```typescript
interface NormalizedDocument {
  source: "gmail" | "web_page";
  documentId: string;
  title: string;
  text: string;
  sourceUrl?: string;
  sourceTimestamp?: string;
}
```

Các adapter có trách nhiệm thu thập dữ liệu và chuyển đổi sang `NormalizedDocument`. NLP pipeline không cần biết dữ liệu đến từ Gmail hay một trang web thông thường.

Nên giữ lại định danh và tham chiếu nguồn để hỗ trợ truy xuất, kiểm tra và xử lý trùng lặp.

## 8. NLP Pipeline dùng chung

Pipeline được đề xuất gồm:

1. **Relevance screening (Slice F — chưa triển khai):** Dịch vụ PhoBERT cục bộ phân loại **cấp tài liệu**; chỉ quyết định có gọi LLM hay không, không cắt câu. Fail-open khi dịch vụ lỗi; không áp dụng cho vùng bôi đen/văn bản dán tay.
2. **Schedule extraction:** Trích xuất tên sự kiện, ngày giờ, địa điểm, hạn chót và quy tắc lặp.
3. **Normalization:** Chuẩn hóa ngày giờ, múi giờ và các cách diễn đạt thời gian tương đối.
4. **Validation:** Kiểm tra dữ liệu thiếu, ngày không hợp lệ và các giá trị chưa chắc chắn.
5. **Deduplication:** Phát hiện sự kiện trùng lặp giữa email, tệp đính kèm và trang web.
6. **User review:** Cho phép người dùng chỉnh sửa trước khi lưu hoặc xuất lịch.

Không nên tự suy diễn các trường không có trong nguồn. Ví dụ, nếu văn bản không nêu năm hoặc múi giờ, cần lưu trạng thái chưa xác định thay vì tự gán giá trị mà không có căn cứ.

## 9. Lưu trữ, bảo mật và xử lý lỗi

- Chỉ đọc trang khi người dùng chủ động yêu cầu trong giai đoạn đầu.
- Giới hạn kích thước tài liệu và lượng văn bản đưa vào mô hình.
- Không tự động gửi toàn bộ nội dung trang hoặc email đến backend nếu chưa thông báo rõ cho người dùng.
- Nếu dùng backend cho OCR hoặc inference, cần kiểm soát quyền truy cập, mã hóa truyền tải, thời gian lưu trữ và quy trình xóa dữ liệu.
- Xử lý các trường hợp trang không thể inject script, nội dung chưa tải xong, tệp không hỗ trợ và parser thất bại.
- Không thực thi script hoặc macro từ tài liệu đầu vào.

### 9.1. Lựa chọn nơi chạy suy luận (đã chốt 2026-10-26, chưa triển khai)

Mặc định suy luận chạy **trên máy người dùng** qua `llama-server` tại `127.0.0.1:8080`.
Người dùng có thể chọn một endpoint **OpenAI-compatible** khác (dịch vụ ngoài như Gemini, hoặc
máy trạm của chính mình qua Cloudflared) theo kế hoạch `docs/ke-hoach-da-provider.md` và kịch bản
`script.md` KS-14.

Các ràng buộc bắt buộc khi triển khai:

- **Opt-in, không mặc định:** không có dữ liệu rời máy nếu người dùng chưa chọn endpoint remote.
- **Consent theo origin:** cảnh báo một lần cho mỗi origin không phải localhost, lưu mốc đồng ý,
  có nút thu hồi; đổi origin phải đồng ý lại.
- **API key:** chỉ lưu cục bộ, không xuất trong JSON, không ghi log; có nút xoá key.
- **Quyền host:** giữ static cho localhost; endpoint remote xin quyền lúc chạy cho đúng origin,
  không thêm host permission tĩnh trên toàn bộ web.
- **TLS:** endpoint remote phải dùng HTTPS; chỉ localhost (`127.0.0.1`, `::1`, `localhost`) được dùng HTTP.
- **Lỗi:** phân loại 401/403/404/429/5xx, timeout, mất mạng; retry có giới hạn; không lưu sự kiện
  rác khi output không qua schema.
- **Không đổi pipeline:** prompt, JSON schema, normalize, dedup và trạng thái `nhap` giữ nguyên.

### 9.2. Sàng lọc nội dung trước LLM (Slice F — đã chốt 2026-10-26, chưa triển khai)

Dùng **dịch vụ PhoBERT TASK/NON_TASK cục bộ** tại `127.0.0.1:8000` (model bàn giao trong
`ml_hasevent_filter/`) để quyết định **cấp tài liệu** trước khi gọi LLM. Đây vẫn là suy luận trên
máy người dùng; không gửi nội dung ra ngoài.

- Chỉ bỏ qua khi `has_task = false`, `confidence ≥ 0.85` và `total_sentences ≥ 3`.
- Mọi trường hợp khác **fail-open**: gọi LLM như hiện tại.
- Không lọc vùng bôi đen/văn bản dán tay; không cắt câu — tài liệu dương nhận **toàn văn**.
- Mọi lần bỏ qua hiện lý do + nút **Trích xuất toàn bộ**.
- Host permission chỉ thêm loopback `127.0.0.1:8000` / `localhost:8000`.
- Chi tiết, hợp đồng và tiêu chí nghiệm thu: `docs/ke-hoach-bo-loc-noi-dung.md`.

## 10. Lộ trình triển khai

### Giai đoạn 1 — Browser Page Parser cơ bản

- Thêm nút `Analyze current page`.
- Inject hàm trích xuất vào tab hiện tại.
- Thu thập title, URL và text.
- Kết nối dữ liệu với pipeline dùng chung (sàng lọc PhoBERT — Slice F, chưa triển khai — và extractor).

### Giai đoạn 2 — Kết hợp Gmail API

- Xác định email đang mở.
- Truy xuất email bằng Gmail API.
- Lấy tệp đính kèm và xử lý theo định dạng.
- Hợp nhất nội dung email và attachment, tránh trùng lặp.

### Giai đoạn 3 — Cải thiện chất lượng trích xuất

- Xử lý trang động và nội dung dài.
- Bảo toàn bảng và cấu trúc tài liệu.
- Bổ sung PDF/DOCX parser và OCR khi cần.

### Giai đoạn 4 — Hoàn thiện quản lý lịch

- Giao diện review và chỉnh sửa sự kiện.
- Lưu trữ sự kiện và nguồn tham chiếu.
- Phát hiện trùng lặp và xung đột lịch.
- Xem xét tích hợp calendar hoặc xuất dữ liệu.

### Giai đoạn 5 — Chọn nơi chạy suy luận (đã chốt 2026-10-26)

- Giữ localhost là mặc định.
- Thêm provider OpenAI-compatible (Gemini, máy trạm qua Cloudflared) + factory chọn provider.
- Consent theo origin, quyền host cấp lúc chạy, API key cục bộ không xuất JSON.
- Kiểm thử 3 nơi chạy + lỗi 401/403/404/429/5xx; không chạy lại toàn bộ golden set.
- Chi tiết và tiêu chí nghiệm thu: `docs/ke-hoach-da-provider.md`, `script.md` KS-14.

> Giai đoạn 5 nằm **sau** phạm vi demo hiện tại; bản demo vẫn chỉ chạy local cho tới khi triển khai.

## Kết luận

Phương án phù hợp nhất ở giai đoạn hiện tại là giữ **Gmail API làm kênh truy xuất email và attachment chính**, đồng thời bổ sung **Browser Page Parser để xử lý trang web đang mở theo yêu cầu của người dùng**.

Hai đường thu thập dữ liệu phải độc lập nhưng cùng sử dụng một Document Processing Layer và một NLP Pipeline. Thiết kế này giúp tận dụng phần Gmail API đã xây dựng, tránh phụ thuộc vào giao diện Gmail và tạo nền tảng mở rộng sang các nguồn dữ liệu khác trong tương lai.