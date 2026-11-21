# Đề cương 7 phần

Tài liệu này là nguồn hướng dẫn khi soạn từng phần. Mỗi phần: mục tiêu → cấu trúc → bắt buộc →
nguồn → cấm → độ dài gợi ý. Số từ chỉ là gợi ý cho báo cáo 25–40 trang; hỏi người dùng nếu trường
quy định khác.

---

## Phần 1. Giới thiệu bài toán (~3–4 trang)

**Mục tiêu:** người đọc hiểu vấn đề là gì, vì sao đáng làm, báo cáo giải quyết bằng cách nào.

**Cấu trúc**

- `## 1.1. Bối cảnh và vấn đề` — tình huống thực tế (thông tin lịch trình phân tán ở web, email,
  tin nhắn; chi phí nhập tay; rủi ro bỏ sót hạn). Nêu hệ quả cụ thể, tránh câu chung chung.
- `## 1.2. Phát biểu bài toán` — đầu vào (văn bản/trang web/email), đầu ra (sự kiện 7 trường:
  thời gian bắt đầu, kết thúc, nhãn, tiêu đề, tóm tắt, hồ sơ liên quan, nguồn), ràng buộc
  (chạy cục bộ, không gửi dữ liệu ra ngoài theo mặc định, không bịa trường).
- `## 1.3. Cách tiếp cận đề xuất` — 1 đoạn tổng quan + 4–6 gạch đầu dòng: thu thập đa nguồn →
  chuẩn hoá tài liệu → sàng lọc → trích xuất bằng LLM cục bộ → chuẩn hoá/kiểm định → khử trùng →
  duyệt và nhắc việc.
- `## 1.4. Đóng góp chính` — 3–4 gạch đầu dòng, mỗi ý phải kiểm chứng được ở phần sau.
- `## 1.5. Bố cục báo cáo` — một đoạn ngắn mô tả 7 phần.

**Nguồn:** `base_idea.md`, `README.md`, `docs/chuc-nang-demo-vs-chinh-thuc.md`.

**Cấm:** mô tả kiến trúc chi tiết (để Phần 4), số liệu đo (để Phần 5).

---

## Phần 2. Tổng quan nghiên cứu (~4–6 trang)

**Mục tiêu:** chứng minh đã đọc tài liệu, chỉ ra khoảng trống mà codebase lấp được.

**Cấu trúc**

- `## 2.1. Phương pháp tiếp cận bài toán` — phân nhóm theo hướng: (a) trích xuất bằng luật/mẫu
  chính quy; (b) mô hình học sâu/NER; (c) LLM + sinh cấu trúc; (d) trợ lý lịch cá nhân thương mại.
- `## 2.2. Các công trình và sản phẩm liên quan` — mỗi nhóm 2–4 đại diện, nêu **họ làm gì**,
  **kết quả**, **hạn chế**, có trích dẫn.
- `## 2.3. Khoảng trống nghiên cứu` — bảng `Khoảng trống | Hệ quả | Cách báo cáo xử lý`.
  Mỗi dòng phải nối được tới một thành phần thật của codebase (ví dụ: thiếu bước sàng lọc trước
  LLM → tốn thời gian, sinh sự kiện rác → bước sàng lọc tài liệu).
- `## 2.4. Kết luận chương` — vì sao hướng tiếp cận của báo cáo là hợp lý.

**Nguồn:** `docs/ke-hoach-bo-loc-noi-dung.md` §2.4 (rủi ro ngữ nghĩa của bộ lọc), `proposed_technical.md`
§8–9, `docs/DEVIATIONS.md`; tài liệu ngoài phải tự tìm và trích.

**Cấm:** chê chung chung ("các nghiên cứu trước chưa tốt"); mọi nhận định về công trình khác phải
có nguồn; không trích sản phẩm thương mại bằng blog không kiểm chứng được.

---

## Phần 3. Các kiến thức nền tảng (~6–8 trang)

**Mục tiêu:** dựng đủ lý thuyết để hiểu Phần 4–5, bằng ngôn ngữ học thuật.

**QUY TẮC CỨNG:** không nhắc tên codebase, không tên file/hàm/biến, không số liệu đo của codebase,
không câu kiểu "trong đồ án này...". Công nghệ nêu như **khái niệm** (Manifest V3, Readability,
PhoBERT, llama.cpp) thì được.

**Cấu trúc gợi ý (chọn các mục có dùng thật)**

- `## 3.1. Biểu diễn và xử lý văn bản tiếng Việt` — tách từ, **BPE**, **subword tokenization**,
  đặc thù tiếng Việt (dấu, khoảng trắng giữa âm tiết).
- `## 3.2. Biểu diễn ngữ nghĩa và mô hình ngôn ngữ tiền huấn luyện` — **Transformer**,
  **self-attention**, **masked language modeling**, **RoBERTa**, **PhoBERT**, **fine-tuning**,
  **sequence classification**, **softmax**, **cross-entropy**.
- `## 3.3. Sinh văn bản có ràng buộc cấu trúc` — **prompt engineering**, **few-shot**,
  **constrained decoding**, **JSON Schema**, **grammar-based sampling**, **temperature/top-p**.
- `## 3.4. Trích xuất thông tin thời gian` — **temporal expression parsing**, **normalization**,
  **grounding**, hiện tượng **hallucination**.
- `## 3.5. Trích xuất nội dung trang web` — **DOM**, **boilerplate removal**, thuật toán
  **Readability**, **content extraction**.
- `## 3.6. Kiến trúc tiện ích mở rộng trình duyệt` — **Manifest V3**, **service worker**,
  **offscreen document**, **content script**, **message passing**, **IndexedDB**, **CSP**.
- `## 3.7. Lượng tử hoá và suy luận cục bộ` — **quantization** (Q4/Q5, **bpw**, **GGUF**),
  đánh đổi **bộ nhớ – độ chính xác – độ trễ**, **p95 latency**.
- `## 3.8. Độ đo đánh giá` — **precision**, **recall**, **F1**, **confusion matrix**,
  **ngưỡng quyết định**, **kiểm định trên tập mẫu nhỏ**.

Mỗi mục: định nghĩa → trực giác → công thức (nếu có) → ý nghĩa với bài toán, **có trích dẫn**.
Keyword chuyên ngành in đậm ở lần xuất hiện đầu.

**Nguồn:** `proposed_technical.md`, `ke_hoach_phat_trien.md` §6–7, và tài liệu gốc (bài PhoBERT,
bài RoBERTa, tài liệu Chrome MV3, bài Readability...).

**Kiểm tra trước khi chốt:**

```bash
grep -n -iE "extension/|src/|run-job|contracts\.ts|offscreen|codebase|đồ án này" \
  bao-cao/noi-dung/03-kien-thuc-nen-tang.md
```

Kết quả phải rỗng (trừ khi từ đó nằm trong tên tài liệu được trích).

---

## Phần 4. Đề xuất giải pháp (~6–8 trang)

**Mục tiêu:** giới thiệu codebase như một giải pháp kỹ thuật, giải thích **vì sao** chứ không chỉ
**cái gì**.

**Cấu trúc**

- `## 4.1. Giới thiệu codebase` — mục tiêu, phạm vi (làm gì / không làm gì), nền tảng.
- `## 4.2. Kiến trúc tổng thể` — sơ đồ thành phần (chèn hình), bảng `Thành phần | Trách nhiệm |
  Công nghệ`. Nêu rõ tách **thu thập dữ liệu** khỏi **pipeline NLP dùng chung**.
- `## 4.3. Luồng xử lý` — từ hành động người dùng đến sự kiện được lưu; nêu các ranh giới
  (service worker, offscreen, side panel) và thông điệp trao đổi.
- `## 4.4. Các quyết định kỹ thuật chính` — mỗi quyết định: vấn đề → lựa chọn → lý do → đánh đổi.
  Ví dụ: Readability + fallback DOM; LLM cục bộ mặc định; sàng lọc tài liệu trước LLM; Zod kiểm
  tra đầu ra; lưu nháp `nhap` thay vì tự động theo dõi; provider remote phải có consent.
- `## 4.5. Hợp đồng dữ liệu và kiểm soát chất lượng` — mô hình sự kiện 7 trường, trạng thái,
  cờ không chắc chắn, khử trùng lặp, so khớp hồ sơ.
- `## 4.6. Bảo mật và quyền riêng tư` — quyền tối thiểu, dữ liệu không rời máy mặc định, consent
  theo origin, khoá API lưu cục bộ.

**Nguồn:** `AGENTS.md` §5, `extension/README.md`, `extension/src/shared/contracts.ts`,
`proposed_technical.md`, `docs/DEVIATIONS.md`.

**Cấm:** biến Phần 4 thành hướng dẫn cài đặt; không dán code dài (tối đa 1 khối ngắn minh hoạ).

---

## Phần 5. Thực nghiệm và kết quả (~8–12 trang)

**Mục tiêu:** chứng minh pipeline chạy được và định lượng vai trò của PhoBERT.

### 5.1. Pipeline xử lý của codebase

Sơ đồ + mô tả từng bước theo đúng thứ tự đang chạy:
`thu thập (Readability/raw DOM/vùng chọn) → chuẩn hoá tài liệu → sàng lọc PhoBERT (off/report/screen)
→ trích xuất bằng LLM theo đoạn → chuẩn hoá ngày giờ → kiểm định → khử trùng lặp → so khớp hồ sơ
→ lưu nháp → người dùng duyệt`.
Nêu rõ: sàng lọc chỉ quyết định **có gọi LLM hay không**, không cắt bớt văn bản gửi LLM.

### 5.2. Mô hình PhoBERT và quá trình fine-tuning

- Kiến trúc: PhoBERT-base-v2, `RobertaForSequenceClassification`, 2 nhãn `0=NON_TASK`,
  `1=TASK`, `max_length = 128`.
- Bài toán: phân loại **câu giao việc** (không đồng nghĩa "câu chứa sự kiện") — nêu rõ giới hạn
  ngữ nghĩa này.
- Fine-tuning: **bảng thông số** `Nguồn dữ liệu | Số mẫu | Nhãn | Chia tập | epochs | LR |
  batch | optimizer | max_length | phần cứng | thời gian | kết quả test`.
  **Bắt buộc lấy từ người dùng.** Repo chỉ có `model_config.json` và trọng số; không có dataset
  hay log. Thiếu mục nào ghi `[CẦN-BỔ-SUNG]` — tuyệt đối không suy ra từ `training_args.bin`.
- Kết quả test (nếu có): accuracy, precision, recall, F1 + confusion matrix.

### 5.3. Kịch bản thử nghiệm trong pipeline

Bảng `Thông số | Giá trị`: dịch vụ (FastAPI, `127.0.0.1:8081`), endpoint `/health` + `/analyze`,
giới hạn 5000 ký tự/request, ngưỡng câu TASK 0.5, ngưỡng bỏ qua tài liệu 0.85 + tối thiểu 3 câu,
chế độ mặc định `report`, fail-open, không sàng lọc vùng chọn/văn bản dán.
Bộ mẫu: 17 fixture eval + các tài liệu âm; nêu cỡ mẫu và cách chọn (thuận tiện, không ngẫu nhiên).

### 5.4. So sánh có/không dùng PhoBERT

Ba điều kiện, cùng bộ mẫu:

| Điều kiện | Hành vi | Đo gì |
|---|---|---|
| A. `off` | mọi tài liệu gọi LLM | mốc so sánh: số lần gọi, tổng thời gian, số sự kiện |
| B. `report` | vẫn gọi LLM, chỉ ghi nhãn dự đoán | chất lượng bộ lọc độc lập (precision/recall) |
| C. `screen` | bỏ qua tài liệu `no_event` | thời gian tiết kiệm, **số dương tính bị bỏ sót** |

Cột kết quả bắt buộc: số tài liệu, số lần gọi LLM, tổng/trung bình thời gian, số sự kiện đúng,
số sự kiện bị bỏ sót, số lần gọi LLM vô ích, tỉ lệ bỏ qua. Chỉ số quan trọng nhất là **dương tính
bị bỏ sót** — nếu > 0 thì kết luận phải nói rõ bộ lọc chưa đủ an toàn để bật mặc định.

Số liệu có sẵn trong repo (dùng được, phải ghi ngày và điều kiện):
- Probe 2026-10-27 (`device: cuda`): tài liệu dương → `has_event` 3/3, 23 ms; 4 tài liệu âm →
  không tài liệu nào bị bỏ qua (2 `uncertain`, 2 dương tính giả) → đây là lý do mặc định `report`.
- Thời gian LLM tham chiếu: 9B IQ4_XS p95 ≈ 35 s (prompt v5); PQ2_0 p95 ≈ 6,6 s.

Nếu chưa có số đo đủ cho bảng so sánh, phải nói rõ "chưa đo" và đề xuất kịch bản chạy
(`docs/kiem-thu-demo.md` §9), **không** điền số ước lượng.

### 5.5. Kết luận về vai trò của PhoBERT

Trả lời trực tiếp 4 câu: (1) PhoBERT tiết kiệm được gì, bao nhiêu; (2) nó có làm mất sự kiện
không, trong điều kiện nào; (3) vì sao mặc định vẫn là `report`; (4) khi nào nên bật `screen`.
Mọi khẳng định phải trỏ về bảng ở 5.4.

---

## Phần 6. Kết luận (~2–3 trang)

- `## 6.1. Kết quả đạt được` — đối chiếu từng mục tiêu ở Phần 1, nêu bằng chứng (số liệu, tính
  năng chạy được), không lặp lại toàn bộ Phần 5.
- `## 6.2. Hạn chế` — trung thực, có số liệu: bộ mẫu eval nhỏ (17/150 mục tiêu), sàng lọc chưa
  bật mặc định vì chưa đo đủ, Gmail/nhắc việc chưa có, endpoint remote chưa kiểm thử thực tế,
  phụ thuộc dịch vụ cục bộ.
- `## 6.3. Định hướng phát triển` — ngắn hạn (đo F3, bật `screen`, nhắc việc `chrome.alarms`) và
  dài hạn (Gmail/PDF/DOCX, mở rộng bộ vàng, lượng tử hoá nhẹ hơn), có thứ tự ưu tiên.

**Nguồn:** `AGENTS.md` §11, `docs/DEVIATIONS.md`.

**Cấm:** hứa hẹn tính năng chưa có; mô tả hạn chế bằng câu chung chung không kiểm chứng được.

---

## Phần 7. Trích dẫn

Danh mục theo IEEE, đánh số `1.`, `2.`, ... trùng với `[n]` trong thân bài, xếp theo lần xuất
hiện đầu tiên. Xem `references/trich-dan.md` để biết định dạng từng loại nguồn.

Kiểm tra tự động: `check` báo lỗi nếu `[n]` không có trong danh mục, nếu danh mục đánh số không
liên tục, và cảnh báo nếu có tài liệu không được trích.
