# Thiết kế demo & mức sẵn sàng tích hợp llama.cpp

> **Mốc tham chiếu:** `main` @ `3cafd8f` (2026-10-22).
> **Đã kiểm chứng:** `npm run typecheck`, `npm run lint`, `npm test` (**72 test**), `npm run build` đều xanh.
> **Phạm vi:** mô tả thiết kế đang có trong `extension/`, sau đó đánh giá khoảng cách tới việc
> gọi API cục bộ của `llama-server` để trích xuất sự kiện. Đây là tài liệu đánh giá, không phải
> đặc tả thay thế `ke_hoach_phat_trien.md` hay `script.md`.

**Kết luận nhanh**

- Demo có nền tảng tốt: capture → `NormalizedDocument` → IndexedDB → review thủ công.
- **Chưa có lớp suy luận**: không `InferenceProvider`, không offscreen, không job queue, không gọi mạng.
- Ba việc chặn tích hợp: hợp đồng `EventCandidate`/`origin`; offscreen + host permission; review/prefill + cài đặt.
- Có thể bắt đầu bằng `EventCandidate` + `MockProvider` + prompt/normalize trong `core/` mà không đổi runtime.

---

## 1. Kiến trúc runtime hiện tại

Demo chạy được với **4 context**, nhưng đường đi ngắn hơn kiến trúc đích: không có content
script thường trú, không có offscreen document, không có job queue.

```text
Popup                         Side panel                     Service worker
  │                              │                               │
  │ chrome.storage.session       │ chrome.storage.session        │ contextMenus
  │ (PendingCapture)             │ (đọc cờ, tự quét)             │ sidePanel.open()
  └──────────────► side panel ◄──┴───────────────────────────────┘
                          │
                          │ chrome.scripting.executeScript(activeTab)
                          ▼
                 Tab đang mở: page-snapshot.ts
                 (chọn main/landmark, xoá menu/khung ẩn, cắt 4M ký tự)
                          │ CapturePayload {html,url,title,selection,...}
                          ▼
                 Side panel: parse.ts
                 (ưu tiên selection → Readability → raw DOM)
                          │ NormalizedDocument
                          ▼
                 IndexedDB (Zod validate khi đọc/ghi)
                          │
                          ▼
                 UI 5 tab: Tổng quan · Quét nội dung · Sự kiện · Hồ sơ · Cài đặt
```

Điểm quan trọng: **Readability chạy trong side panel**, không chạy trong content script.
`page-snapshot.ts` là hàm tự chứa được inject bằng `executeScript`, chỉ chụp DOM đã lọc.
Cách này giữ permission tối thiểu và tránh bundle thư viện vào content script, nhưng cũng
có nghĩa là **chưa có lớp content script thường trú** để xử lý SPA phức tạp.

Nguồn: `extension/manifest.config.ts`, `src/platform/capture/{tab,page-snapshot,parse}.ts`,
`src/ui/sidepanel.ts`, `src/platform/background/index.ts`.

---

## 2. Các thiết kế chính đang có

### 2.1. Hợp đồng một nguồn, validate ở biên

`src/shared/contracts.ts` là nguồn duy nhất cho `Profile`, `Event`, `NormalizedDocument`,
`SourceRef`, `DateTimeRef` và các enum (`Label`, `EventStatus`, `SourceKind`,
`ExtractionMethod`). `documents`, `profiles`, `events` được `Zod.parse` khi ghi và
`safeParse` khi đọc; bản ghi hỏng bị bỏ qua thay vì làm sập UI (`src/platform/storage/db.ts`).
Riêng `settings` chưa được validate dù `SettingSchema` đã có trong contracts.

**Ý nghĩa cho LLM:** output của model có thể được validate bằng đúng một schema, không cần
lớp kiểm tra thứ hai. Đây là điểm mạnh nhất của demo để nối pipeline.

### 2.2. Phân lớp nghiêm ngặt

`core/**` là TypeScript thuần, không `chrome.*`, không `window`, không `document`; ESLint
chặn import ngược từ `core` sang `platform`/`ui` (`eslint.config.js`). `platform/**` là
adapter Chrome; `ui/**` là view functions + event delegation, không framework.

**Ý nghĩa cho LLM:** prompt builder, chuẩn hoá ngày giờ, validate candidate và dedup có thể
đặt trong `core/` để test bằng Vitest và tái sử dụng từ `tools/eval/` chạy Node. Phần
`fetch` bắt buộc nằm ở `platform/`.

### 2.3. Chuẩn hoá nội dung có thứ tự ưu tiên rõ ràng

`parseCapture()` trong `src/platform/capture/parse.ts` xử lý theo thứ tự:

1. **Vùng bôi đen** (`selection`) — ưu tiên tuyệt đối, không qua Readability.
2. **Readability** — chỉ nhận nếu `textContent` ≥ 120 ký tự.
3. **Raw DOM** — fallback khi Readability lỗi/ngắn, hoặc khi người dùng chọn
   `forceRaw` (“Dùng nội dung thô”).
4. **Dán tay** (`parsePastedText`) — nguồn `paste`, dùng cho email/PDF/DOCX chưa hỗ trợ.

`NormalizedDocument` giữ `source`, `title`, `text`, `sourceUrl`, `capturedAt`,
`extractionMethod`, `contentHash` (FNV-1a 32-bit), `truncated`, `charCount`, `selection`.
Giới hạn cứng `MAX_DOCUMENT_CHARS = 200_000` (`shared/constants.ts`).

**Ý nghĩa cho LLM:** đây là đầu vào sạch, có nguồn gốc và cờ cắt bớt — đủ để làm
`ExtractionInput`. Nhưng **chưa có chunker/token budget**: 200.000 ký tự vượt xa context
8.192 token của llama.cpp.

### 2.4. Lưu trữ tối giản, có kiểm tra kiểu

`db.ts` dùng IndexedDB trực tiếp (không Dexie), 4 object store: `documents`, `profiles`,
`events`, `settings`, DB version 1. Có export/import JSON, `clearAll()`, index `status` và
`start.value`. `settings` đã có API `getSetting`/`setSetting` nhưng demo chưa dùng và chưa
validate giá trị.

**Ý nghĩa cho LLM:** có sẵn chỗ để thêm `jobs` và cấu hình endpoint/model. Tuy nhiên DB
chưa có migration thật: `onupgradeneeded` chỉ tạo store nếu thiếu, chưa xử lý `onblocked`
hay `onversionchange` khi side panel đang giữ kết nối cũ.

### 2.5. Mô hình sự kiện đúng 7 trường, có cờ “chưa chắc chắn”

`Event` giữ 7 trường của `base_idea.md`, cộng `tags`, `status`, `validation.uncertain`,
`notifications`, `origin`, `createdAt/updatedAt/completedAt`. Trạng thái:
`nhap → dang_theo_doi → hoan_thanh | huy` với `TRANSITIONS` trong `core/events.ts`.

`makeEvent()` / `updateEvent()` tự tính `durationMinutes` từ start/end và tự sinh
`validation.uncertain` khi thiếu start/end/hồ sơ. `sources` chỉ được dựng từ
`NormalizedDocument` ở UI (`sourceFromDocument()` trong `ui/actions/shared.ts`) rồi truyền
vào `makeEvent`; model không có đường ghi trực tiếp.

**Ý nghĩa cho LLM:** tư duy “không bịa trường thiếu” đã có trong code. Nhưng `origin` đang là
`z.literal('manual')`, nên **không thể lưu sự kiện do model tạo với đúng nguồn gốc** nếu không
sửa hợp đồng.

### 2.6. UI không framework, an toàn XSS

Store pub/sub tự viết (~50 dòng), view functions trả HTML, event delegation ở `sidepanel.ts`.
Mọi dữ liệu động đi qua `escapeHtml`/`escapeAttr` (`ui/components.ts`); CSP
`script-src 'self'`, không remote code. UI đã có form sự kiện đầy đủ, lọc/tìm, tab hồ sơ,
xuất/nhập JSON, toast và trạng thái `busy`.

**Ý nghĩa cho LLM:** có thể tái sử dụng form để review kết quả, nhưng `openEventForm()` hiện
chỉ nhận `eventId` hoặc `sourceDocumentId`, chưa nhận **draft do model sinh**. Chưa có màn hình
review nhiều candidate, tiến trình, hay trạng thái “server chưa chạy”.

### 2.7. Bảo mật & quyền tối thiểu

Manifest hiện tại: `activeTab`, `scripting`, `storage`, `sidePanel`, `contextMenus`;
**không host permission, không gọi mạng**. Mọi thao tác đọc trang do người dùng bấm hoặc
chọn menu chuột phải. Đây là các ràng buộc ở `AGENTS.md` §4 và được phản ánh trong UI
(“Chỉ đọc khi bạn bấm”, “Không gửi dữ liệu đi đâu”).

**Ý nghĩa cho LLM:** khi thêm llama.cpp, phải thêm **đúng một host permission**
`http://127.0.0.1:8080/*` và permission `offscreen`. Đây là thay đổi có chủ đích, không phải
mở rộng quyền đọc web.

---

## 3. Điểm nối dự kiến cho llama.cpp

Luồng đích, giữ đúng phân lớp hiện có:

```text
NormalizedDocument
   │  guard: rỗng? quá dài? đã cắt?
   ▼
core/extraction/prepare.ts     ← chunk + token budget + prompt builder
   │  ExtractionInput {document, profiles, now, timezone}
   ▼
InferenceProvider (interface, core/ports)
   │
   ├─ LlamaCppProvider (platform/offscreen/llm.ts)
   │     GET  /health
   │     POST /v1/chat/completions
   │     response_format json_schema
   │
   └─ MockProvider (test / UI work)
   ▼
EventCandidate[]  ← Zod validate ngay tại biên
   │
core/extraction/normalize.ts   ← ngày giờ, nhãn, uncertain, profile id whitelist
   ▼
core/extraction/dedup.ts       ← trùng trong cùng document / với Event đã có
   ▼
Event(status='nhap', origin='llm', sources=[document], extractionMeta=...)
   ▼
Review UI → người dùng sửa → lưu → dang_theo_doi
```

Hợp đồng tối thiểu nên bổ sung (đề xuất, **chưa có trong demo**):

```ts
// shared/contracts.ts
export const EventOriginSchema = z.enum(['manual', 'llm']);

export const EventCandidateSchema = z.object({
  title: z.string().min(1).max(120),
  label: LabelSchema,
  start: DateTimeRefSchema,              // value có thể null, raw giữ chuỗi gốc
  end: DateTimeRefSchema.nullable(),
  durationMinutes: z.number().int().positive().nullable(),
  summary: z.array(z.string().max(300)).max(5),
  relatedProfiles: z.array(z.string()).max(10), // chỉ id trong closed set
  confidence: z.number().min(0).max(1),
  uncertain: z.array(z.string()),
});
export type EventCandidate = z.infer<typeof EventCandidateSchema>;

// Event giữ tương thích bản ghi cũ:
origin: EventOriginSchema.default('manual'),
extractionMeta: z
  .object({
    provider: z.string(),
    model: z.string(),
    promptVersion: z.string(),
    schemaVersion: z.string(),
    confidence: z.number().min(0).max(1).nullable(),
  })
  .optional(),
```

`EventCandidate` **không** có `id`, `status`, `sources`, `createdAt` — các trường này do ứng
dụng sinh. Nhờ vậy model không thể tự đặt nguồn trích; `relatedProfiles` vẫn phải được lọc
theo danh sách hồ sơ thực tế trước khi lưu.

Zod 4 có `z.toJSONSchema()` (đã kiểm tra với `zod@4.6.7`), nên có thể sinh JSON Schema từ
`EventCandidateSchema` để đưa vào `response_format`. Cần đối chiếu subset mà llama.cpp hỗ trợ
(`$ref`, `oneOf`, `format`…) và test bằng server thật, không giả định sinh là dùng được ngay.

---

## 4. Đánh giá mức sẵn sàng

| Khu vực | Bằng chứng hiện có | Mức | Khoảng trống chính |
|---|---|---|---|
| Thu thập & chuẩn hoá văn bản | `page-snapshot.ts`, `parse.ts`, `NormalizedDocument` | 🟡 Cần bổ sung | Chưa có chunker/token budget; 200k ký tự > context 8k token |
| Lưu trữ | `db.ts`, 4 store, Zod | 🟡 Cần bổ sung | Chưa có `jobs`; DB v1; chưa xử lý upgrade bị block |
| Mô hình `Event` | `contracts.ts`, `core/events.ts` | 🔴 Chưa sẵn sàng | `origin: 'manual'`; thiếu `EventCandidate`, `extractionMeta`, `confidence` |
| Ranh giới suy luận | Không có `platform/offscreen`, không `fetch` | 🔴 Chưa sẵn sàng | Thiếu `InferenceProvider`, prompt, JSON schema, health check |
| Điều phối runtime | `background/index.ts`, `messages.ts` | 🔴 Chưa sẵn sàng | Không có `onMessage`, job queue, offscreen; capture đang đồng bộ |
| Review UI | `views/event-form.ts`, `actions/events.ts` | 🔴 Chưa sẵn sàng | Form chỉ nhập tay; không prefill candidate, không tiến trình, không badge “cần kiểm tra” |
| Cài đặt | `views/settings.ts`, store `settings` | 🔴 Chưa sẵn sàng | Chưa có endpoint/model/timeout/API key; store `settings` chưa dùng |
| Bảo mật & riêng tư | Manifest tối thiểu, `escapeHtml`, CSP | 🟡 Cần bổ sung | Cần host permission + prompt-injection test; copy “không gọi mạng” sẽ sai |
| Kiểm thử & đánh giá | 72 test Vitest, jsdom, fake-indexeddb | 🟡 Cần bổ sung | Chưa có provider test, mock server, golden set/F1 |
| Vận hành | Chưa có | 🔴 Chưa sẵn sàng | Chưa có health check, timeout/retry, màn hình hướng dẫn khi server tắt |

**Kết luận mức sẵn sàng: một phần.** Demo đã hoàn thành tốt nửa “thu thập → chuẩn hoá → lưu
trữ → review thủ công”, nhưng **chưa có bất kỳ mắt nối suy luận nào**. Không nên chỉ thêm
`fetch` vào side panel hiện tại: request 20–60 giây có thể mất khi panel đóng, không có
validate/chunking, và không có chỗ review kết quả.

Điểm có thể bắt đầu ngay mà **không đổi runtime**:

- Viết `EventCandidateSchema`, `InferenceProvider`, `MockProvider`.
- Viết prompt builder + `normalize` + `dedup` thuần trong `core/`, test bằng Vitest.
- Viết test hợp đồng cho JSON mẫu của model (đúng/sai/thiếu trường).

---

## 5. Thay đổi tối thiểu trước khi gọi llama.cpp

### P0 — chặn tích hợp

| # | Việc | File chạm |
|---|---|---|
| 1 | `Event.origin` thành enum; thêm `extractionMeta`; thêm `EventCandidateSchema` | `shared/contracts.ts`, `core/events.ts`, `core/forms.ts` |
| 2 | Thêm `offscreen` + host permission `http://127.0.0.1:8080/*` | `manifest.config.ts` |
| 3 | `InferenceProvider` + `LlamaCppProvider` (`/health`, `/v1/chat/completions`) | `core/ports.ts` (mới), `platform/offscreen/llm.ts` (mới) |
| 4 | Offscreen document + service worker điều phối | `platform/offscreen/index.ts`, `platform/background/index.ts` |
| 5 | `jobs` store + message `JOB_PROGRESS`/`JOB_RESULT` + DB v2 | `platform/storage/db.ts`, `shared/messages.ts` |
| 6 | Review UI: prefill từ candidate, tiến trình, lỗi server, badge “cần kiểm tra” | `ui/actions/events.ts`, `ui/views/review.ts` (mới), `ui/sidepanel.ts` |
| 7 | Cài đặt endpoint/model/timeout/API key | `ui/views/settings.ts`, `platform/storage/db.ts` |

### P1 — đúng chất lượng

- **Chunking:** chia theo đoạn/heading, có overlap, ưu tiên ~4.000 token nội dung; ghi cờ
  `truncated`/`chunkCount` vào `extractionMeta`.
- **Chuẩn hoá ngày giờ:** `parseLocalDateTime` hiện chỉ nhận đúng `YYYY-MM-DDTHH:mm`.
  Cần `core/normalize.ts` xử lý chuỗi model trả về (ISO, ngày không giờ, thiếu năm, múi giờ),
  giữ `raw`, và sinh cờ tương ứng. Hiện `deriveUncertain()` chỉ sinh `chua_ro_thoi_diem`,
  `chua_ro_ket_thuc`, `chua_ro_ho_so`; `nam_chua_ro` và `mui_gio_gia_dinh` mới chỉ được nhắc
  trong `AGENTS.md` §6, chưa có trong code; `chua_ro_dia_diem` có trong `UNCERTAIN_TEXT` nhưng
  không được sinh — cần đồng bộ Appendix A `script.md` và `shared/constants.ts`.
- **Dedup:** `contentHash` mới chỉ phát hiện trùng tài liệu; chưa có dedup sự kiện (hash
  chuẩn hoá + fuzzy) và gộp `sources`.
- **Prompt injection:** delimiter `<document>`, system prompt nói rõ nội dung là dữ liệu,
  JSON schema ép đầu ra, whitelist profile id, `sources` do ứng dụng gắn. Bộ test 20 mẫu.
- **Health/retry:** `/health` trả 503 khi model đang load; UI phải hiện hướng dẫn thay vì
  lỗi chung. Timeout + `AbortController`; retry **một lần** khi JSON không parse được,
  không retry lỗi 4xx.
- **Đồng bộ tài liệu:** đổi copy “Không gửi dữ liệu đi đâu / không gọi mạng” trong
  `ui/views/settings.ts`, `README.md`, `docs/kiem-thu-demo.md` thành “chỉ gọi
  `127.0.0.1:8080` trên máy này”.

### P2 — sau khi chạy được

- Classifier tiền lọc để giảm số lần gọi LLM (hiện chưa có).
- Chọn model 1.5B/3B, đo p95 trên máy demo.
- Golden set + eval precision/recall/F1; log không chứa nội dung nhạy cảm.

---

## 6. Ghi chú API llama.cpp (đã đối chiếu tài liệu chính thức)

- Endpoint chat: `POST /v1/chat/completions`, header `Authorization: Bearer <api-key>` nếu
  server chạy `--api-key`.
- `GET /health` là public, trả **503** khi model đang load và **200** `{"status":"ok"}` khi sẵn
  sàng.
- Theo tài liệu hiện tại, `response_format` của llama.cpp dùng dạng
  `{"type":"json_schema","schema":{...}}`; không nên giả định giống hệt cấu trúc lồng
  `json_schema` của OpenAI. Cần pin phiên bản server và test hợp đồng.
- `--port` mặc định của bản mới là **9931**, không phải 8080. Kế hoạch dùng
  `--port 8080`; extension nên đọc endpoint từ cài đặt thay vì hard-code. Tuy nhiên endpoint
  vẫn phải nằm trong host permission đã khai báo (`127.0.0.1:8080`); không mở `<all_urls>`.
- Offscreen document cần permission `"offscreen"`; chỉ dùng được `chrome.runtime` để
  messaging; một extension chỉ có một offscreen document. Không có reason dành riêng cho HTTP;
  `WORKERS` (lựa chọn của kế hoạch) không đặt giới hạn thời gian sống, khác `AUDIO_PLAYBACK`.
  Dù vậy service worker vẫn có thể bị kill — job phải lưu bền.

---

## 7. Thứ tự tích hợp đề xuất

1. **Lát cắt hợp đồng (không mạng):** `EventCandidateSchema`, `InferenceProvider`,
   `MockProvider`, prompt builder, normalize, test JSON mẫu. Chạy được toàn bộ pipeline bằng
   mock, không cần llama-server.
2. **Lát cắt vận chuyển:** manifest + offscreen + `LlamaCppProvider` + health check + cài đặt
   endpoint. Kiểm thủ công bằng một document ngắn.
3. **Lát cắt một sự kiện:** gửi prompt thật, validate `EventCandidate`, tạo `Event` nháp,
   gắn `sources`, hiển thị trong form review.
4. **Lát cắt nhiều sự kiện & bền vững:** chunking, dedup, `jobs` store, resume sau SW restart,
   tiến trình trong UI.
5. **Lát cắt chất lượng:** prompt few-shot, đo F1, prompt injection, xử lý ngày giờ tiếng Việt,
   chọn model.

Cách này giữ cho mỗi bước đều có test và có thể dừng mà không để lại nửa pipeline.

---

## 8. Rủi ro & câu hỏi mở

| Rủi ro | Ảnh hưởng | Cách giảm |
|---|---|---|
| Model 1.5B đọc ngày giờ tương đối tiếng Việt kém | Sinh sai `start`, bỏ sót sự kiện | Giữ `raw`, cờ uncertain, eval trên golden set; không tự đoán năm/múi giờ |
| Latency 20–60s trên CPU | UI tưởng treo, SW bị kill | Offscreen + job bền + tiến trình + cancel |
| `response_format` thay đổi giữa các bản llama.cpp | Parse lỗi/hợp đồng vỡ | Pin phiên bản, test tích hợp, adapter cô lập |
| Nội dung web chứa prompt injection | Model làm theo chỉ thị trong trang | Delimiter, schema, whitelist, test 20 mẫu, không thực thi nội dung |
| DB v2 bị block bởi side panel đang mở | Không thêm được `jobs` | `onversionchange` đóng kết nối, `onblocked` báo UI, reload |
| Copy riêng tư sai sau khi thêm mạng | Người dùng hiểu sai dữ liệu được gửi đi | Cập nhật Settings/README/checklist cùng lúc với manifest |
| Không có dedup sự kiện | Trùng sự kiện khi quét lại/nhiều chunk | Hash chuẩn hoá + fuzzy + gộp sources |
| Số test trong tài liệu dễ lệch khi thêm test | Báo cáo sai | Đã đồng bộ 72 ở lần cập nhật này; CI là nguồn xác nhận |

**Câu hỏi cần chốt trước khi code:**

1. API key của llama-server lưu ở đâu: `settings` (IndexedDB) hay `chrome.storage.session`?
   Khuyến nghị không lưu lâu dài; nếu lưu, không log và hiển thị cảnh báo.
2. Có cho phép nhiều sự kiện/document không? Nếu có, review UI phải là danh sách candidate,
   không phải một form đơn.
3. Có giữ `origin: 'manual'` cho bản ghi cũ và chỉ thêm `'llm'`, hay đổi hẳn sang
   `extractionMeta`? Khuyến nghị union + optional metadata để tương thích JSON cũ.
4. Có cần `versionHistory` ngay từ đầu cho KS-12 không? Nếu chưa, ghi nhận là nợ kỹ thuật.
5. Kế hoạch yêu cầu ADR-001 (runtime inference), ADR-002 (model), ADR-003 (build stack)
   nhưng repo chưa có `docs/decisions/`. Nên ghi ADR-001/002 trước khi chốt provider và model.

---

## 9. Kết luận

Demo là một **nền dữ liệu tốt**: hợp đồng Zod tập trung, phân lớp rõ, capture có fallback,
lưu trữ có validate, UI review thủ công đầy đủ và bảo mật tối thiểu. Để nối llama.cpp, không
cần viết lại kiến trúc, nhưng phải mở ba đường nối còn thiếu: **hợp đồng candidate/origin**,
**runtime offscreen + job bền vững**, và **UI review + cài đặt**. Khi ba đường nối này có,
pipeline trích xuất có thể chạy mà vẫn giữ nguyên các ràng buộc “không bịa trường thiếu”,
“nguồn do ứng dụng gắn” và “chỉ gọi máy cục bộ”.

---

## 10. Nguồn tham chiếu

- `ke_hoach_phat_trien.md` §2 (kiến trúc), §5 (hợp đồng), §7 (LLM cục bộ), §8 (pipeline).
- `proposed_technical.md` §7 (`NormalizedDocument`), §8 (bảo mật).
- `AGENTS.md` §4 (ràng buộc nền tảng), §6 (mô hình sự kiện).
- llama.cpp server: <https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md>
- Chrome Offscreen API: <https://developer.chrome.com/docs/extensions/reference/api/offscreen>
