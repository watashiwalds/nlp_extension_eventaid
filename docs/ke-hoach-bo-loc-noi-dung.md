# Kế hoạch tích hợp bước sàng lọc nội dung PhoBERT (ml_hasevent_filter)

> Trạng thái: **kế hoạch đã chốt hướng, chưa triển khai** (chốt 2026-10-26).
> Tài liệu liên quan đã được đồng bộ ngày 2026-10-26 (xem §13); **mã nguồn chưa đổi**.
> Phạm vi: dùng `ml_hasevent_filter` làm **bước sàng lọc cấp tài liệu** trước khi gọi LLM.
> **Không sửa một dòng nào trong `ml_hasevent_filter/`.**
> Liên quan: `script.md` KS-05 (pipeline 6 bước), `ke_hoach_phat_trien.md` §2/§6,
> `docs/ke-hoach-llm-trich-xuat.md`, `docs/DEVIATIONS.md`.

---

## 0. Quyết định đã chốt

| # | Vấn đề | Quyết định |
|---|---|---|
| Q1 | Hành vi mặc định | **Sàng lọc cả tài liệu**: gọi bước sàng lọc để biết tài liệu có nội dung sự kiện hay không; **nếu có thì LLM nhận toàn văn**, nếu không thì chưa gọi LLM và cho người dùng bấm "Trích xuất toàn bộ" |
| Q2 | Vùng bôi đen / văn bản dán | **Không lọc** — giữ nguyên lựa chọn chủ động của người dùng |
| Q3 | Alias loopback | Giữ **cả** `http://127.0.0.1:8000/*` và `http://localhost:8000/*` |
| Q4 | Ngưỡng tự bỏ qua tài liệu | **`0.85`** và **tối thiểu 3 câu** |
| Q5 | Chế độ thứ ba | **Giữ `report`** (chỉ báo cáo, luôn gửi toàn văn cho LLM) làm đường đo và đường lùi |
| Q6 | Cách gọi | Dùng từ **"sàng lọc"** trên UI và tài liệu; mã nguồn dùng `screen`/`filter` |

Hệ quả quan trọng của Q1: pipeline **không cắt bớt câu** gửi cho LLM. Vì vậy kế hoạch này
**không** hứa giảm số đoạn/giảm latency LLM trên tài liệu có sự kiện; giá trị nằm ở
(a) bỏ hẳn lần gọi LLM trên tài liệu không liên quan, (b) giảm sự kiện rác, (c) tín hiệu rõ ràng
cho người dùng. Đổi lại, rủi ro mất ngữ cảnh khi cắt câu biến mất hoàn toàn.

---

## 1. Mục tiêu

1. Thêm bước **phân loại / lọc nhiễu** vào đầu pipeline, đúng vị trí đã mô tả trong `script.md`
   KS-05: `phân loại → trích xuất → chuẩn hoá → kiểm định → khử trùng lặp → so khớp hồ sơ`.
2. Trên tài liệu **không liên quan** (menu, quảng cáo, bình luận, trang trống, email xã giao):
   kết thúc job **mà không gọi LLM** ⇒ tiết kiệm 20–34 s và không sinh sự kiện rác.
3. Trên tài liệu **có liên quan**: LLM nhận **nguyên văn** — không thay đổi chất lượng trích xuất
   so với hiện tại.
4. **Không làm giảm recall một cách âm thầm.** Mọi lần bỏ qua đều phải: hiển thị lý do + độ chắc
   chắn, và có nút chạy lại "Trích xuất toàn bộ".

**Ngoài phạm vi:** huấn luyện lại model, đổi ngưỡng trong `app.py`, thêm endpoint mới, đóng gói
PhoBERT vào extension (ONNX/WASM), lọc theo từng câu (xem §17), Gmail API, nhắc việc KS-10,
chọn provider remote S7.

---

## 2. Hiện trạng mô hình bàn giao

### 2.1. Dịch vụ

| Hạng mục | Giá trị |
|---|---|
| Thư mục | `ml_hasevent_filter/handover_api_code/` (code) + `ml_hasevent_filter/phobert_task_classifier_final/` (trọng số) |
| Nền tảng | Python 3 + FastAPI + `transformers` + `pyvi`, chạy **cục bộ** |
| Địa chỉ Postman | `http://127.0.0.1:8000` |
| CORS | `allow_origins=["*"]`, `allow_credentials=False` |
| Auth | Không có |
| Model | PhoBERT-base-v2, `RobertaForSequenceClassification`, 2 nhãn `0=NON_TASK`, `1=TASK` |

### 2.2. Hợp đồng API

```text
GET /health
  → { status: "ok", model: "PhoBERT TASK/NON_TASK", device: "cpu" | "cuda" }

POST /analyze
  body    { text: string }        // 1 … 5000 ký tự, vượt → 422
  200     {
            has_task: boolean,
            confidence: number,     // 0..1 — ĐỔI NGHĨA theo has_task, xem 2.3
            needs_review: boolean,
            evidence: [{ sentence_index: number,   // 1-based trong `text` đã gửi
                         sentence: string,          // đã làm sạch
                         task_confidence: number }],
            total_sentences: number
          }
```

### 2.3. Sáu chi tiết bắt buộc phải xử lý đúng

1. **`confidence` đổi nghĩa.** Có TASK ⇒ `confidence` = xác suất TASK **cao nhất**; không có TASK
   ⇒ `confidence` = xác suất NON_TASK **cao nhất**. Vì vậy chỉ được dùng `confidence` làm
   "độ tin cậy KHÔNG có việc" khi `has_task === false`. Đây là chỗ dễ hiểu sai nhất.
2. **`evidence` chỉ chứa câu TASK** (ngưỡng cứng `TASK_THRESHOLD = 0.5`). Không có danh sách câu
   NON_TASK và không có xác suất cho từng câu NON_TASK ⇒ client không thể hạ ngưỡng dưới 0.5.
3. **Giới hạn 5000 ký tự/request.** Trang web thường 10–50k ký tự ⇒ client **buộc phải chia cửa sổ**.
4. **`MAX_LENGTH = 128` token/câu.** Câu dài hơn bị cắt phần đuôi khi phân loại ⇒ có thể đánh giá
   sai một câu rất dài. Chấp nhận (chỉ ảnh hưởng quyết định cấp tài liệu), nhưng phải ghi nhận.
5. **Server tự tách câu** bằng `re.split(r"(?<=[.!?])\s+|\n+", text)` rồi bỏ câu < 2 ký tự.
   Vì client **không cần ánh xạ chỉ số về văn bản gốc** (xem §6), chỉ cần biết `total_sentences`
   và `evidence`; không còn phụ thuộc vào việc tách câu khớp 1:1.
6. **`la_cau_xa_giao` chặn sẵn** các câu "cảm ơn / ok / chúc mọi người" nhưng **vẫn tính** vào
   `total_sentences`. Vì thế `total_sentences` lớn hơn số câu thực sự được model chấm — chỉ dùng
   nó làm ngưỡng "tài liệu đủ dài", không dùng làm mẫu số của chất lượng.

### 2.4. Rủi ro ngữ nghĩa (quan trọng nhất)

Model phân loại **"câu giao việc" (TASK)**, không phải **"câu chứa sự kiện lịch trình"**. Ví dụ
trong chính Postman collection:

| Câu | Nhãn theo model | Có phải sự kiện? |
|---|---|---|
| `Cuộc họp tổng kết quý sẽ diễn ra lúc 9 giờ sáng thứ Hai.` | NON_TASK (thông báo, không giao việc) | **Có** |
| `Hải gửi báo cáo tiến độ dự án trước 17 giờ hôm nay.` | TASK | Có |
| `Cảm ơn mọi người.` | xã giao → NON_TASK | Không |

⇒ Một tài liệu **chỉ có thông báo họp** có thể bị xếp vào `no_event` và mất lượt gọi LLM.
Đây là rủi ro được chấp nhận **có kiểm soát** bằng bốn lớp: ngưỡng 0.85 + tối thiểu 3 câu (Q4),
chế độ `report` để đo, nút "Trích xuất toàn bộ" luôn hiện, và chỉ số nghiệm thu "0 tài liệu dương
bị bỏ sót" (§11.4).

---

## 3. Quyết định thiết kế

| # | Quyết định | Lý do |
|---|---|---|
| **D1** | Gọi model qua **HTTP cục bộ** (`127.0.0.1:8000`), không nhúng model vào extension | Không được thêm WASM/ONNX/remote code (AGENTS §4); PyTorch + `pyvi` không chạy trong MV3 |
| **D2** | Chạy trong **offscreen document** | Đã là nơi chạy tác vụ dài, sống độc lập khi đóng panel; content script không được gọi mạng |
| **D3** | Ba chế độ: `off` · `report` · `screen`; **mặc định `screen`** (Q1) | `report` để đo mà không bao giờ chặn; `screen` là hành vi đã chốt |
| **D4** | **Fail-open**: lỗi/timeout/không kết nối ⇒ trích xuất toàn văn, ghi chú | Extension phải dùng được khi chưa bật Python |
| **D5** | **Không lọc** `source = 'selection'` và `'paste'` (Q2) | Người dùng đã tự chọn nội dung |
| **D6** | Quyết định ở **cấp tài liệu**, không cắt câu (Q1) | LLM giữ nguyên ngữ cảnh; đơn giản hơn nhiều so với ánh xạ lại văn bản |
| **D7** | Chỉ bỏ qua khi **rất chắc** và tài liệu **đủ dài** (Q4) | Recall ưu tiên hơn tiết kiệm thời gian |
| **D8** | Luôn có nút **"Trích xuất toàn bộ"** sau lần bị bỏ qua | Cứu đúng trường hợp thông báo họp / thư mời ở §2.4 |
| **D9** | Settings riêng (`contentFilter`), không nhét vào `LlmSettings` | `LlmSettings` đã bị S7 mở rộng (`provider`, `consentByOrigin`) |

---

## 4. Vị trí trong pipeline

```text
NormalizedDocument
   │
   ├─► [MỚI] Sàng lọc nội dung (PhoBERT @ 127.0.0.1:8000)     src/core/extraction/prefilter.ts
   │        chia cửa sổ ≤ 4000 ký tự → POST /analyze
   │        → FilterDecision: has_event | no_event | uncertain
   │
   ├─► no_event  → KẾT THÚC, không gọi LLM (có nút "Trích xuất toàn bộ")
   │
   ├─► has_event / uncertain → LLM nhận **toàn văn** (nguyên trạng, không cắt)
   │
   ├─► chunkText(document.text)                                (không đổi)
   ├─► buildPrompt → LlamaCppProvider                          (không đổi)
   ├─► parse → normalize → profile-match → dedup                (không đổi)
   └─► lưu nháp `nhap`                                          (không đổi)
```

Tiến trình hiển thị (dùng lại `JOB_PROGRESS.stage`, **không thêm trạng thái job**):

```text
"Đang kiểm tra bước sàng lọc…"
"Đang sàng lọc nội dung 1/3…"        ← chunkIndex/chunkCount = số cửa sổ
"Sàng lọc: có nội dung đáng trích (5/48 câu giao việc)."
"Đang đọc đoạn 1/2…"                 ← như hiện tại
```

---

## 5. Hợp đồng dữ liệu

### 5.1. Port (thuần, `src/core/ports/content-filter.ts`)

```ts
export interface FilterSentenceAnalysis {
  sentence: string;
  taskConfidence: number;
}

export interface FilterAnalysis {
  hasTask: boolean;
  /** Xác suất TASK cao nhất nếu hasTask; ngược lại là xác suất NON_TASK cao nhất. */
  confidence: number;
  needsReview: boolean;
  evidence: FilterSentenceAnalysis[];
  totalSentences: number;
  latencyMs: number;
}

export type FilterErrorKind = 'network' | 'timeout' | 'aborted' | 'http' | 'invalid-response';

export class FilterError extends Error {
  constructor(readonly kind: FilterErrorKind, message: string, readonly status?: number) {}
}

export function isFilterAborted(error: unknown): boolean {
  return error instanceof FilterError && error.kind === 'aborted';
}

export interface ContentFilter {
  readonly id: 'phobert-task';
  health(): Promise<{ ok: true; device?: string } | { ok: false; reason: string }>;
  analyze(text: string, options?: { signal?: AbortSignal }): Promise<FilterAnalysis>;
}
```

### 5.2. Cấu hình (`FilterSettingsSchema` trong `src/shared/contracts.ts`)

```ts
export const FILTER_MODES = ['off', 'report', 'screen'] as const;

export const FilterSettingsSchema = z.object({
  mode: z.enum(FILTER_MODES).default('screen'),   // Q1
  endpoint: z.string().url().default('http://127.0.0.1:8000'),
  timeoutMs: z.number().int().positive().max(60_000).default(15_000),
  /** < 5000 của server; 4000 để chừa biên. */
  windowChars: z.number().int().min(200).max(4_800).default(4_000),
  /** Ngưỡng "chắc chắn không có việc" để được phép bỏ qua tài liệu. */
  skipConfidence: z.number().min(0.5).max(1).default(0.85),
  minSentencesToSkip: z.number().int().min(1).max(20).default(3),
});
export type FilterMode = z.infer<typeof FilterSettingsSchema>['mode'];
export type FilterDecision = 'has_event' | 'no_event' | 'uncertain';
```

Lưu ở object store `settings`, khoá `contentFilter` (`FILTER_SETTINGS_KEY`), cùng cơ chế
`load/save` + validate như `platform/storage/settings.ts`; đọc hỏng ⇒ mặc định.

### 5.3. Trạng thái job

Mở rộng **tương thích ngược** (mọi trường mới có `.default()`):

```ts
// ExtractionJobSchema
filterApplied: z.boolean().default(false),        // đã chạy và có kết quả dùng được
filterDecision: z.enum(['has_event', 'no_event', 'uncertain']).nullable().default(null),
filterEvidenceCount: z.number().int().nonnegative().default(0),   // số câu TASK
filterTotalSentences: z.number().int().nonnegative().default(0),
filterNote: z.string().nullable().default(null),  // vd "Sàng lọc không phản hồi — đã trích xuất toàn bộ"
```

`JOB_DONE` mang đúng bộ trường trên (1 cờ + 1 enum + 2 số + 1 ghi chú); cập nhật mọi
sender/receiver và `tests/shared/contracts.test.ts`.

---

## 6. Thuật toán (phần thuần, test được bằng Node)

### 6.1. Chia cửa sổ

- Chỉ sàng lọc **vùng sẽ được trích xuất**: `effectiveChars ≈ min(text.length, chunkChars × maxChunks)`
  (chồng lấn 200 ký tự làm vùng phủ thực tế hẹp hơn một chút — sàng lọc dư vài trăm ký tự là
  chấp nhận được, thiếu thì không). Không sàng lọc phần đuôi mà `chunkText` chắc chắn bỏ.
- Cắt tại ranh giới đoạn văn → xuống dòng → cuối câu; không cắt giữa từ; mỗi cửa sổ ≤ `windowChars`.
- Gửi `window.text` (nguyên văn, không ghép lại) — mỗi cửa sổ là một `POST /analyze` độc lập.

### 6.2. Gộp thành quyết định cấp tài liệu

```ts
function aggregateDecision(windows, results, settings): FilterDecision
```

| Trường hợp | Kết quả |
|---|---|
| Có **bất kỳ** cửa sổ `hasTask = true` | `'has_event'` |
| Có cửa sổ lỗi/timeout | `'uncertain'` (fail-open) |
| `Σ totalSentences < minSentencesToSkip` | `'uncertain'` (tài liệu quá ngắn để kết luận) |
| `min(confidence)` của mọi cửa sổ ≥ `skipConfidence` | `'no_event'` |
| Còn lại | `'uncertain'` |

`min(...)` (không phải `max`) là cố ý: lấy **bằng chứng yếu nhất**, bảo thủ cho recall. Khi tất cả
cửa sổ đều `has_task = false`, `confidence` của từng cửa sổ là xác suất NON_TASK cao nhất — đúng
đại lượng cần so với `skipConfidence`.

### 6.3. Hành vi theo chế độ

| `decision` | `mode = screen` (mặc định) | `mode = report` |
|---|---|---|
| `has_event` | LLM nhận **toàn văn** | LLM nhận toàn văn |
| `uncertain` | LLM nhận toàn văn + `filterNote` | LLM nhận toàn văn |
| `no_event` | **Không gọi LLM**, kết thúc job với `filterDecision = 'no_event'` | LLM nhận toàn văn + `filterNote` |

`mode = off` (hoặc lỗi cấu hình): không gọi dịch vụ lọc, mọi thứ như hiện tại.

### 6.4. Không đổi gì ở phần cắt đoạn / LLM

Vì LLM nhận **nguyên văn**, `chunkText`, cờ `truncated`, prompt, normalize, dedup và
`extractEvents` đều **không cần sửa**. Đây là lợi ích lớn nhất của Q1 so với phương án lọc theo câu.

---

## 7. Danh sách file

### 7.1. Thêm mới

| File | Trách nhiệm | ~dòng |
|---|---|---|
| `src/core/ports/content-filter.ts` | Port `ContentFilter`, `FilterError`, `isFilterAborted()` | 50 |
| `src/core/extraction/filter-types.ts` | `FilterWindow`, `WindowAnalysis`, `FilterReport`, `FilterDecision` | 45 |
| `src/core/extraction/prefilter.ts` | `buildFilterWindows`, `aggregateDecision`, `summarizeFilter` | 140 |
| `src/core/extraction/mock-filter.ts` | `MockContentFilter` (scripted) cho test/UI | 50 |
| `src/platform/inference/phobert-filter.ts` | `PhobertTaskFilter`: `/analyze`, `/health`, timeout, abort, validate response bằng Zod | 180 |
| `src/platform/storage/filter-settings.ts` | `loadFilterSettings` / `saveFilterSettings` / `DEFAULT_FILTER_SETTINGS` | 40 |

### 7.2. Sửa

| File | Thay đổi |
|---|---|
| `src/shared/contracts.ts` | `FilterSettingsSchema`, mở rộng `ExtractionJobSchema` (§5.3) |
| `src/shared/messages.ts` | `RUN_EXTRACTION` (cả 2 chiều) thêm `filterRunMode?: 'auto' \| 'force' \| 'off'`; `JOB_DONE` thêm bộ trường lọc |
| `src/shared/constants.ts` | `FILTER_SETTINGS_KEY`, text hiển thị chế độ/quyết định |
| `src/platform/offscreen/run-job.ts` | Chèn bước sàng lọc; `deps.loadFilterSettings`, `deps.createFilter`; trả `filterDecision`… |
| `src/platform/offscreen/main.ts` | Khởi tạo `PhobertTaskFilter`; nhận `filterRunMode`; nhận diện `FilterError('aborted')` |
| `src/platform/background/index.ts` | Chuyển tiếp `filterRunMode`; map bộ trường lọc vào job |
| `src/platform/background/jobs.ts` | `makeJob` khởi tạo mặc định mới |
| `src/ui/store.ts` | `filter: FilterSettings`, `filterHealth` |
| `src/ui/actions/settings.ts` | `saveFilterSettingsFromForm`, `checkFilterHealthAction` |
| `src/ui/actions/extract.ts` | `extractEventsAction(filterRunMode)`; nút "Trích xuất toàn bộ" |
| `src/ui/views/settings.ts` | Card "Sàng lọc nội dung (PhoBERT)" |
| `src/ui/views/capture.ts` | Dòng kết luận của bước sàng lọc + nút chạy lại toàn bộ |
| `manifest.config.ts` | `host_permissions` + CSP `connect-src` thêm `127.0.0.1:8000`, `localhost:8000` |

**Không sửa:** `src/core/extraction/{pipeline,chunk,prompt,normalize,schema,dedup,profile-match}.ts`,
`src/platform/inference/llama-cpp.ts`, `ml_hasevent_filter/**`.

---

## 8. Luồng job (tuần tự)

```text
side panel ──RUN_EXTRACTION {documentId, filterRunMode}──► background
background  ──RUN_EXTRACTION {jobId, documentId, filterRunMode}──► offscreen
offscreen   runExtractionJob(documentId, deps, onProgress, signal)
  1. getDocument, listProfiles, listEvents, loadLlmSettings, loadFilterSettings
  2. resolveMode(settings.mode, filterRunMode, document.source)   // off | report | screen
       → document.source ∈ {selection, paste} ⇒ 'off'             // Q2
  3. nếu 'off' → chạy như hiện tại, filterApplied = false
  4. health() dịch vụ sàng lọc (timeout 2 s)
       ✗ → filterNote = "Sàng lọc không phản hồi — đã trích xuất toàn bộ", chạy như 'off'
  5. buildFilterWindows(document.text, budget) → analyze từng cửa sổ
       onProgress("Đang sàng lọc nội dung i/n…")
       ✗ lỗi giữa chừng → fail-open, filterNote, đi tiếp
       ✗ signal.aborted → FilterError('aborted') → JOB_CANCELLED
  6. decision = aggregateDecision(...)
       'no_event' + mode 'screen' → JOB_DONE (0 sự kiện, filterDecision = 'no_event')
       còn lại → extractEvents(document NGUYÊN VĂN)   // không đổi tham số
  7. lưu nháp như hiện tại
  8. JOB_DONE kèm filterApplied / filterDecision / evidenceCount / totalSentences / note
```

Kết thúc sớm ở bước 6 **không phải lỗi**: `JOB_DONE` với `savedCount = 0`,
`filterDecision = 'no_event'`, toast *"Sàng lọc không thấy nội dung công việc nào (độ chắc chắn 91%).
Bạn có thể trích xuất toàn bộ."* + nút hành động.

---

## 9. UI

### 9.1. Card cài đặt

```text
Sàng lọc nội dung (PhoBERT)
Máy chủ Python phân loại từng câu thành "câu giao việc", chạy trên chính máy bạn.
Nội dung chỉ được gửi tới http://127.0.0.1:8000.
Khi tài liệu có nội dung công việc, LLM vẫn nhận toàn văn; bước này chỉ quyết định có gọi LLM hay không.

Chế độ
  ( ) Tắt                              — không gọi bước sàng lọc
  ( ) Chỉ báo cáo (an toàn)            — luôn gửi toàn văn cho LLM, chỉ ghi nhận kết luận
  (•) Sàng lọc trước khi trích xuất    — bỏ qua lần gọi LLM khi chắc chắn không có nội dung công việc

Địa chỉ máy chủ   [http://127.0.0.1:8000]
Timeout (ms) [15000]   Ngưỡng bỏ qua [0.85]   Số câu tối thiểu [3]
[Lưu cài đặt]  [Kiểm tra kết nối]
```

Health hiển thị thiết bị (`cpu`/`cuda`) vì ảnh hưởng trực tiếp tới thời gian sàng lọc.

### 9.2. Tab Quét nội dung

- Checkbox **"Sàng lọc nội dung trước khi trích xuất"**, mặc định theo `settings.mode`
  (ẩn khi `mode === 'off'`; luôn ẩn với nguồn `selection`/`paste`).
- Sau khi xong, hiện một dòng kết luận:
  - `Sàng lọc: có nội dung đáng trích (5/48 câu giao việc) · 1,8 s`
  - `Sàng lọc: không thấy nội dung công việc (chắc chắn 91%) · đã bỏ qua lần gọi LLM`
  - `Sàng lọc không phản hồi — đã trích xuất toàn bộ` (alert vàng, không phải lỗi)
- Khi `savedCount === 0 && filterDecision === 'no_event'`: nút **"Trích xuất toàn bộ"**
  (`filterRunMode: 'off'`).

### 9.3. Nhãn tiếng Việt

| Khoá | Text |
|---|---|
| `filterMode.off` | `Tắt` |
| `filterMode.report` | `Chỉ báo cáo` |
| `filterMode.screen` | `Sàng lọc trước khi trích xuất` |
| `has_event` | `Có nội dung đáng trích` |
| `no_event` | `Không thấy nội dung công việc` |
| `uncertain` | `Chưa đủ chắc để bỏ qua` |
| fail-open | `Sàng lọc không phản hồi — đã trích xuất toàn bộ` |
| rỗng | `Sàng lọc không thấy nội dung công việc nào. Bạn có thể trích xuất toàn bộ.` |

---

## 10. Manifest, quyền, CSP

```diff
- host_permissions: ['http://127.0.0.1:8080/*'],
+ host_permissions: [
+   'http://127.0.0.1:8080/*',
+   'http://127.0.0.1:8000/*',
+   'http://localhost:8000/*',
+ ],

- connect-src http://127.0.0.1:8080
+ connect-src http://127.0.0.1:8080 http://127.0.0.1:8000 http://localhost:8000
```

- Vẫn **không** có `<all_urls>`, không host remote, không remote code. Đây là dịch vụ **cục bộ thứ hai**
  cạnh `llama-server`; `AGENTS.md` §3–§4 phải cập nhật (mục 13).
- CORS `*` phía server không thay thế host permission: extension page vẫn cần quyền host để `fetch`.

---

## 11. Test & đo lường

### 11.1. Unit (Vitest, không cần Python)

| File | Nội dung |
|---|---|
| `tests/core/extraction-prefilter.test.ts` | cửa sổ ≤ `windowChars`, phủ kín `effectiveChars`, không cắt giữa từ, tài liệu rỗng/1 cửa sổ, tài liệu dài hơn ngân sách; `aggregateDecision` bảng chân trị (8 ca: có task ở cửa sổ 2, lỗi 1 cửa sổ, tài liệu 2 câu, confidence 0.84/0.85, nhiều cửa sổ lấy min, …); `summarizeFilter` |
| `tests/platform/phobert-filter.test.ts` | mock `fetch` như `llama-cpp.test.ts`: 200 hợp lệ; 200 thiếu trường ⇒ `invalid-response`; 422 (quá 5000) ⇒ `http` kèm gợi ý; 500; timeout; abort; `/health` 200/503/không kết nối; cắt `/` cuối endpoint |
| `tests/platform/offscreen-job.test.ts` (mở rộng) | `screen` + `no_event` ⇒ không gọi provider, `savedCount = 0`; `screen` + `has_event` ⇒ provider nhận **nguyên văn**; `report` + `no_event` ⇒ **vẫn** gọi provider; `selection`/`paste` ⇒ không gọi filter; lỗi filter ⇒ toàn văn + `filterNote`; `filterRunMode: 'off'` ⇒ không gọi filter; huỷ giữa bước sàng lọc ⇒ `aborted` |
| `tests/shared/contracts.test.ts` (mở rộng) | job cũ thiếu trường lọc vẫn parse được (mặc định) |
| `tests/ui/smoke.test.ts` (mở rộng) | card cài đặt render, không lỗi escape |

### 11.2. Bộ mẫu

`tests/fixtures/filter/`:
- **Dương (15 mẫu E01–E15 sẵn có)** — mọi mẫu đều phải cho `has_event`. Đây là phép thử
  "không bỏ sót" quan trọng nhất.
- **Âm (10–15 mẫu mới tự soạn)** — menu điều hướng, footer, quảng cáo, luồng bình luận, trang
  đăng nhập, email xã giao, thông báo bảo trì không có mốc thời gian. Không có dữ liệu cá nhân thật.

`tests/eval/filter.eval.test.ts` (tất định, `MockContentFilter`): kiểm tra **hành vi pipeline** —
`screen` chặn đúng khi mock trả `no_event`, vẫn trích xuất khi `has_event`/`uncertain`, không gọi
filter với `selection`. Test này **không** đo model và **không** được dùng để tuyên bố độ chính xác.

### 11.3. Đo thật (có model)

`tests/eval/filter.live.eval.test.ts`, gate bằng `FILTER_EVAL=1`, endpoint `FILTER_ENDPOINT`
(mặc định `http://127.0.0.1:8000`), bỏ qua khi không đặt biến — cùng pattern `LLAMA_EVAL=1`.
In bảng: case, `decision`, `confidence`, `evidence/total`, latency, và **kết quả trích xuất đầy đủ
khi chạy `screen`** để so với baseline không lọc. Đây là nguồn số duy nhất cho §11.4.

### 11.4. Chỉ số nghiệm thu

| Chỉ số | Ngưỡng |
|---|---|
| **Tài liệu dương bị bỏ sót** (15 mẫu E01–E15 → `no_event`) | **0** |
| Tỉ lệ bỏ qua trên mẫu âm | ≥ 70% |
| Sự kiện bị mất khi so `screen` với baseline không lọc (trên mẫu dương) | **0** |
| Latency sàng lọc/tài liệu | p95 ≤ 8 s (CPU), ≤ 2 s (CUDA) |
| Lỗi bước sàng lọc | **không lần nào** làm hỏng job (fail-open) |
| `npm run typecheck` / `lint` / `test` / `build` | pass; test mới chạy trong CI không cần Python |

> Quy tắc chốt: nếu chỉ số đầu tiên > 0, nâng `skipConfidence`/`minSentencesToSkip` hoặc hạ mặc định
> về `report` **trước khi** phát hành. Không tuyên bố "đã sàng lọc" khi chưa có số từ §11.3.

---

## 12. Chia slice & tiêu chí nghiệm thu

### Slice F0 — Hợp đồng + lõi thuần (1–1,5 ngày)
- Port, types, `prefilter.ts`, `mock-filter.ts`, `FilterSettingsSchema`.
- **DoD:** unit test §11.1 (phần core) xanh; `core/**` không import `chrome.*`/`platform/**`;
  chưa thay đổi hành vi nào của extension.

### Slice F1 — HTTP client + cài đặt + quyền (1,5–2 ngày)
- `PhobertTaskFilter`, settings card, health check, manifest/CSP.
- **DoD:** test mock `fetch` xanh; chạy `uvicorn` thật rồi bấm "Kiểm tra kết nối" hiện đúng model +
  device; tắt server ⇒ báo lỗi rõ, **không** crash panel; `dist/` load unpacked được.

### Slice F2 — Nối vào job + UI (1,5 ngày)
- `run-job`, messages, job state, dòng kết luận, nút trích xuất toàn bộ, tiến trình.
- **DoD:** 5 kịch bản tay: (a) `off` giống hệt hiện tại; (b) `report` ra kết luận, số sự kiện không
  đổi; (c) `screen` + tài liệu dương ⇒ sự kiện y hệt baseline; (d) `screen` + tài liệu âm ⇒ 0 sự kiện,
  có nút trích xuất toàn bộ và bấm lại thì chạy LLM; (e) tắt Python giữa chừng ⇒ job vẫn xong với toàn văn +
  cảnh báo. Huỷ giữa bước sàng lọc ⇒ `Đã huỷ`, không lưu nháp.

### Slice F3 — Đo & chốt (1–1,5 ngày)
- Mẫu âm, `filter.eval.test.ts`, `filter.live.eval.test.ts`; đo 15 mẫu + mẫu âm + 10 trang thật.
- **DoD:** bảng §11.4 có số từ lần chạy thật; ghi vào `docs/ket-qua-bo-loc.md`; xác nhận mặc định
  `screen` hoặc hạ về `report` kèm lý do; cập nhật `docs/DEVIATIONS.md` + `AGENTS.md` §11.

Tổng: **5–6,5 ngày công**, không phụ thuộc S7.

---

## 13. Đồng bộ tài liệu (bắt buộc trong cùng PR)

| File | Sửa gì |
|---|---|
| `AGENTS.md` §3 | Hàng "Classifier": TF-IDF→JSON→TS **thay bằng** "PhoBERT TASK/NON_TASK microservice (FastAPI, `127.0.0.1:8000`), dùng để sàng lọc cấp tài liệu" |
| `AGENTS.md` §4 | Host permission tối thiểu thêm `127.0.0.1:8000` + `localhost:8000`; nêu rõ là dịch vụ cục bộ, không phải remote |
| `AGENTS.md` §5 | Sơ đồ runtime: thêm nhánh `phobert-filter.ts ──HTTP──► 127.0.0.1:8000` trước `llama-cpp.ts` |
| `AGENTS.md` §11 | Trạng thái: "sàng lọc PhoBERT (Slice F, **chưa triển khai**)" + mặc định `screen` khi ship |
| `ke_hoach_phat_trien.md` §2, §6 | §6 viết lại: classifier là **dịch vụ Python cục bộ**, không còn `classifier.json`; nêu rõ quyết định **không cắt câu** |
| `docs/DEVIATIONS.md` | Hàng "Classifier" thay bằng "Sàng lọc nội dung (Slice F)" — trạng thái **chưa có**; hàng "Offscreen document" ghi rõ hiện chỉ chạy LLM |
| `script.md` KS-05 | Ghi chú bước "phân loại" dùng PhoBERT cục bộ + quy tắc fail-open / không lọc vùng chọn / LLM nhận toàn văn |
| `proposed_technical.md` §2/§8/§9.1 | Thêm dịch vụ sàng lọc và ràng buộc cục bộ |
| `extension/README.md` | Bản đồ file mới + lệnh chạy `uvicorn` + biến `FILTER_EVAL` |
| `README.md` | Mục tính năng + cách chạy 2 dịch vụ cục bộ |
| `docs/kiem-thu-demo.md` | Mục 9 mới: "Sàng lọc nội dung (PhoBERT)" với checklist tay |
| `ke_hoach_thiet_ke_frontend.md` | B7 đã có 6 bước — ghi chú bước "phân loại" nay có thật |

---

## 14. Cách chạy dịch vụ (không sửa `ml_hasevent_filter`)

```bash
cd ml_hasevent_filter/handover_api_code
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
# BẮT BUỘC: đường dẫn mặc định trong app.py trỏ tới handover_api_code/models/... (không tồn tại)
MODEL_DIR=../phobert_task_classifier_final \
  uvicorn app:app --host 127.0.0.1 --port 8000
```

Kiểm tra:

```bash
curl -s http://127.0.0.1:8000/health
curl -s -X POST http://127.0.0.1:8000/analyze \
  -H 'Content-Type: application/json' \
  -d '{"text":"Hải gửi báo cáo tiến độ trước 17 giờ hôm nay."}'
```

Lưu ý vận hành (không phải thay đổi code):
- `MODEL_DIR` là bắt buộc vì `app.py` mặc định tìm `handover_api_code/models/phobert_task_classifier_final`.
- `pyvi` là gói cũ; nếu cài trên Python 3.13 thất bại, dùng venv Python 3.11/3.12.
- `requirements.txt` cho `transformers<6.0` nhưng trọng số ghi `transformers_version 5.20.2`; nếu
  load lỗi tokenizer, ghim `transformers==5.20.2`.
- Cổng 8000 hay bị chiếm; endpoint trong cài đặt cho phép đổi nhưng phải khớp `host_permissions`.

---

## 15. Rủi ro & đối sách

| Rủi ro | Mức | Đối sách |
|---|---|---|
| Model nhận "giao việc" ≠ "sự kiện" ⇒ bỏ sót tài liệu chỉ có thông báo họp/thư mời (§2.4) | **Cao** | Ngưỡng 0.85 + ≥ 3 câu (Q4); đo "0 tài liệu dương bị bỏ sót" ở §11.4; chế độ `report`; nút trích xuất toàn bộ |
| Người dùng không biết vì sao không có kết quả | Trung bình | Dòng kết luận + lý do + độ chắc chắn + nút chạy lại; không bao giờ im lặng |
| Câu dài bị `MAX_LENGTH=128` cắt đuôi khi phân loại | Thấp (chỉ ảnh hưởng quyết định cấp tài liệu) | Chấp nhận; ghi trong `docs/DEVIATIONS.md` |
| Tài liệu rất dài, nhiều cửa sổ ⇒ chậm | Thấp | Chỉ sàng lọc vùng sẽ trích (`effectiveChars`); p95 ≤ 8 s; gọi tuần tự để không thrash CPU |
| Bước sàng lọc là tiến trình người dùng phải tự bật | Trung bình | Fail-open + thông điệp rõ; health check; hướng dẫn trong Cài đặt và README |
| Thêm quyền `127.0.0.1:8000` làm người dùng e ngại | Thấp | Chỉ loopback; câu chữ "chỉ gửi tới máy của bạn"; không có host remote |
| Bước sàng lọc chạy lại nhiều lần trên cùng tài liệu (retry) | Thấp | Cache in-memory 3 mục theo `contentHash + endpoint` trong offscreen (P2, ngoài F0–F3) |
| Người dùng muốn lọc theo câu để giảm latency LLM | Thấp | Đã ghi nhận ở §17, không làm trong đợt này |

---

## 16. Trạng thái quyết định

**Không còn câu hỏi mở.** Toàn bộ hành vi đã chốt ở §0; hai điểm phạm vi cuối đã được trả lời:

1. **Giữ `report`** — làm ngay trong F1/F2 (~0,5 ngày); đây là đường đo và đường lùi nếu F3 phát
   hiện bỏ sót.
2. **Dùng từ "sàng lọc"** trên UI và tài liệu; mã nguồn giữ `screen` / `filter`.

Điều kiện sẵn sàng code (Definition of Ready):

- [x] Chốt 6 quyết định ở §0 (2026-10-26).
- [ ] Máy dev chạy được `uvicorn` cục bộ (CPU là đủ; không cần GPU) để nghiệm thu F1.
- [ ] Đồng ý thay đổi `manifest.config.ts`: thêm `http://127.0.0.1:8000/*` và `http://localhost:8000/*`.
- [ ] Không có thay đổi nào trong `ml_hasevent_filter/` (ràng buộc của yêu cầu).

---

## 17. Ghi nhận: phương án lọc theo câu (không làm trong đợt này)

Phương án ban đầu — chỉ gửi cho LLM các câu TASK ±1 câu ngữ cảnh — **bị loại** vì Q1 chốt "LLM nhận
toàn văn". Nếu sau này cần giảm latency LLM trên tài liệu dài, có thể bổ sung thành chế độ thứ tư
(`trim`) với các việc phải làm lại:

- Ánh xạ `sentence_index` về offset gốc (phụ thuộc đúng regex tách câu của server + `lam_sach_van_ban`).
- Giữ ±N câu ngữ cảnh để không mất ngày tương đối ("mai", "thứ Hai").
- Cờ `truncated` phải tính trên tài liệu gốc, không trên văn bản đã cắt.
- Đo lại toàn bộ §11.4 và bổ sung chỉ số "cờ `nam_chua_ro`/`gio_chua_ro` không tăng quá 5 điểm %".

Ước lượng thêm: 2–3 ngày. Không nằm trong phạm vi đã chốt.
