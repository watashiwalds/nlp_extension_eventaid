# Kế hoạch tích hợp bước sàng lọc nội dung PhoBERT (ml_hasevent_filter)

> Trạng thái: **F0 + F1 đã triển khai (2026-10-26 / 2026-10-27); F2–F4 chưa triển khai.**
> Hợp đồng, lõi thuần, HTTP client và card cài đặt đã có trong mã nhưng **chưa nối vào job** — bước
> sàng lọc **chưa chạy** khi trích xuất; xem nhật ký §12.4. Tài liệu liên quan đã đồng bộ ngày
> 2026-10-26 và cập nhật tiếp ngày 2026-10-27 (xem §13); điểm lệch cổng `8081` ghi ở §0.2.
> Chia phiên triển khai chi tiết ở §12.1 (P0–P12); các điểm bổ sung khi rà soát code ở §0.1–§0.2.
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
| Q3 | Alias loopback | Giữ **cả** `http://127.0.0.1:8000/*` và `http://localhost:8000/*` (Q10 bổ sung cổng **8081** làm mặc định) |
| Q4 | Ngưỡng tự bỏ qua tài liệu | **`0.85`** và **tối thiểu 3 câu** |
| Q5 | Chế độ thứ ba | **Giữ `report`** (chỉ báo cáo, luôn gửi toàn văn cho LLM) làm đường đo và đường lùi |
| Q6 | Cách gọi | Dùng từ **"sàng lọc"** trên UI và tài liệu; mã nguồn dùng `screen`/`filter` |

Hệ quả quan trọng của Q1: pipeline **không cắt bớt câu** gửi cho LLM. Vì vậy kế hoạch này
**không** hứa giảm số đoạn/giảm latency LLM trên tài liệu có sự kiện; giá trị nằm ở
(a) bỏ hẳn lần gọi LLM trên tài liệu không liên quan, (b) giảm sự kiện rác, (c) tín hiệu rõ ràng
cho người dùng. Đổi lại, rủi ro mất ngữ cảnh khi cắt câu biến mất hoàn toàn.

### 0.1. Bổ sung khi rà soát code (2026-10-26)

Ba điểm dưới đây được phát hiện khi đối chiếu kế hoạch với mã nguồn hiện tại; đã chốt để không
phải quyết định lại trong lúc code.

| # | Vấn đề | Quyết định |
|---|---|---|
| Q7 | Bản trước xếp E01–E15 là mẫu dương, nhưng `E06` trong `tests/fixtures/eval/cases-b.ts` là mẫu âm: `category: 'negative'`, `expected: []`, `source: 'paste'` | Bộ dương là **14 mẫu E01–E05, E07–E15**; E06 chuyển sang bộ âm. Chỉ số “0 tài liệu dương bị bỏ sót” tính trên 14 mẫu. Vì `source = 'paste'`, E06 chỉ đo được ở mức model, không đo qua pipeline (Q2 luôn bỏ qua `paste`). |
| Q8 | §9.2 cần hiển thị “chắc chắn 91%” và “1,8 s” nhưng §5.3 thiếu trường | Thêm `filterConfidence` và `filterLatencyMs` vào `ExtractionJobSchema` và `JOB_DONE`, đều có mặc định để tương thích ngược. |
| Q9 | Chưa viết rõ thứ tự ưu tiên của `filterRunMode`, tài liệu rỗng và nghĩa của `filterApplied` | `filterRunMode = 'off'` thắng mọi cấu hình; `'force'` chạy `screen`; `'auto'`/không có thì theo `settings.mode`; `selection`/`paste` luôn `off`. Không có cửa sổ nào ⇒ `uncertain`. `filterApplied = true` chỉ khi **tất cả** cửa sổ phân tích xong; lỗi/timeout bất kỳ ⇒ `false` + `filterNote` (fail-open). |

### 0.2. Bổ sung khi triển khai F1 (2026-10-27)

| # | Vấn đề | Quyết định |
|---|---|---|
| Q10 | Máy dev hiện chạy `uvicorn` ở **cổng 8081**, không phải 8000 như Q3/§14 | `DEFAULT_FILTER_ENDPOINT = 'http://127.0.0.1:8081'`. Manifest khai báo **cả hai** cổng trên cả `127.0.0.1` và `localhost` (`8000` và `8081`) để 8000 vẫn là alias hợp lệ; UI chỉ nhận loopback ở đúng hai cổng này (khớp `host_permissions`), từ chối path/query/hash. Đổi cổng sau này chỉ cần sửa hằng số + manifest. |

### 0.3. Bổ sung khi triển khai F2 (2026-10-27)

| # | Vấn đề | Quyết định |
|---|---|---|
| Q11 | Q1/D3 chốt mặc định `screen`, nhưng F3 **chưa** đo và lần dò tay với dịch vụ thật cho thấy model còn dương tính giả trên văn bản nhiễu (§12.4, ghi chú F2) | Hạ mặc định về **`report`** bằng hằng số `DEFAULT_FILTER_MODE` trong `src/shared/contracts.ts`. Bật `screen` mặc định là tuyên bố "đã sàng lọc" khi chưa có số của §11.4 — trái §12.3. F3/P9 nâng lại `'screen'` **chỉ khi** chỉ số "tài liệu dương bị bỏ sót" = 0 (chỉ sửa hằng số, không sửa logic). Người dùng vẫn tự chọn `screen` trong Cài đặt; test phủ cả ba chế độ. |
| Q12 | Chưa nói rõ `filterDecision`/`filterNote` khác nhau thế nào giữa "không chạy", "chạy xong" và "chạy nhưng lỗi" | `filterDecision = null` **chỉ khi** bước sàng lọc không chạy (chế độ `off`, nguồn `selection`/`paste`). Chạy xong: `filterApplied = true`, `filterNote = null` — kể cả `uncertain` (UI dùng `FILTER_DECISION_TEXT`). Hai ca có ghi chú: (a) lỗi/timeout/health lỗi/tài liệu rỗng ⇒ `filterApplied = false` + `failOpenNote()` hoặc `FILTER_EMPTY_NOTE`; (b) `report` + `no_event` ⇒ `filterApplied = true` + `FILTER_REPORT_NOTE` để UI nói rõ vì sao **vẫn** gọi LLM. UI coi "đã bỏ qua" = `no_event && savedCount === 0 && filterNote === null`. |
| Q13 | Checkbox ở §9.2 gửi `filterRunMode` nào? | Checked = **`auto`** (không gửi trường, theo `settings.mode`); unchecked = gửi `'off'`. Ẩn khi `contentFilter.mode === 'off'` hoặc nguồn `selection`/`paste` (Q2). Nút "Trích xuất toàn bộ" **luôn** gửi `'off'`, kể cả khi checkbox đang bật. |
| Q14 | Sau khi bị bỏ qua, panel có nhảy sang tab Sự kiện như mọi lần xong không? | **Không.** Giữ tab Quét nội dung để thấy dòng kết luận + nút "Trích xuất toàn bộ". `lastExtraction` được lưu **cả khi** không bật toast, nên đóng/mở lại panel vẫn thấy kết luận của lần trích gần nhất cho đúng tài liệu. |
| Q15 | `donePatch` và ghi chú trạng thái cần chỗ dùng chung | Thêm `donePatch(message)` vào `platform/background/jobs.ts` và `FILTER_SKIPPED_STAGE` vào `shared/constants.ts` để `background/index.ts` và `sidepanel.ts` không vượt `max-lines`; chuỗi trạng thái "bỏ qua" chỉ định nghĩa một nơi. |

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
| **D1** | Gọi model qua **HTTP cục bộ** (`127.0.0.1`; nay mặc định cổng **8081**, `8000` là alias — Q10), không nhúng model vào extension | Không được thêm WASM/ONNX/remote code (AGENTS §4); PyTorch + `pyvi` không chạy trong MV3 |
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
   ├─► [MỚI] Sàng lọc nội dung (PhoBERT @ 127.0.0.1:8081)     src/core/extraction/prefilter.ts
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
  // Q10: mặc định cổng 8081; 8000 vẫn là alias trong manifest
  endpoint: z.string().url().default(DEFAULT_FILTER_ENDPOINT), // 'http://127.0.0.1:8081'
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
filterApplied: z.boolean().default(false),        // đã chạy và có kết quả dùng được cho toàn tài liệu
filterDecision: z.enum(['has_event', 'no_event', 'uncertain']).nullable().default(null),
filterEvidenceCount: z.number().int().nonnegative().default(0),   // số câu TASK
filterTotalSentences: z.number().int().nonnegative().default(0),
/** Xác suất của quyết định (TASK nếu has_event, NON_TASK nếu no_event); null nếu không có. */
filterConfidence: z.number().min(0).max(1).nullable().default(null),
filterLatencyMs: z.number().int().nonnegative().default(0),
filterNote: z.string().nullable().default(null),  // vd "Sàng lọc không phản hồi — đã trích xuất toàn bộ"
```

`JOB_DONE` mang đúng bộ trường trên (1 cờ + 1 enum + 4 số + 1 ghi chú); cập nhật mọi
sender/receiver và `tests/shared/filter-contracts.test.ts` (tách khỏi `contracts.test.ts` ở F1).

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
| Không có cửa sổ nào (văn bản rỗng) | `'uncertain'` |
| Có cửa sổ lỗi/timeout | `'uncertain'` (fail-open) |
| `Σ totalSentences < minSentencesToSkip` | `'uncertain'` (tài liệu quá ngắn để kết luận) |
| `min(confidence)` của mọi cửa sổ ≥ `skipConfidence` | `'no_event'` |
| Còn lại | `'uncertain'` |

`min(...)` (không phải `max`) là cố ý: lấy **bằng chứng yếu nhất**, bảo thủ cho recall. Khi tất cả
cửa sổ đều `has_task = false`, `confidence` của từng cửa sổ là xác suất NON_TASK cao nhất — đúng
đại lượng cần so với `skipConfidence`.

`filterApplied` chỉ `true` khi **tất cả** cửa sổ phân tích thành công (kể cả ở `report`); lỗi giữa
chừng chuyển sang fail-open với `filterApplied = false` và `filterNote` cụ thể.

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
| `src/ui/views/filter-settings.ts` | Card "Sàng lọc nội dung (PhoBERT)" (§9.1) | 120 |
| `src/ui/actions/filter-settings.ts` | `readFilterForm`, `validateFilterEndpoint`, lưu cài đặt, health check | 160 |
| `src/ui/settings-wiring.ts` | Gộp handler form Cài đặt (LLM + sàng lọc) để `sidepanel.ts` không phình | 30 |

### 7.2. Sửa

| File | Thay đổi |
|---|---|
| `src/shared/contracts.ts` | `FilterSettingsSchema` + `DEFAULT_FILTER_MODE` (`report` ở F2, Q11), mở rộng `ExtractionJobSchema` (§5.3) |
| `src/shared/messages.ts` | `RUN_EXTRACTION` (cả 2 chiều) thêm `filterRunMode?: 'auto' \| 'force' \| 'off'`; `JOB_DONE` thêm bộ trường lọc |
| `src/shared/constants.ts` | `FILTER_SETTINGS_KEY`, text hiển thị chế độ/quyết định, `FILTER_FAIL_OPEN_NOTE`, `FILTER_EMPTY_NOTE`, `FILTER_REPORT_NOTE`, `FILTER_SKIPPED_STAGE` |
| `src/platform/offscreen/run-job.ts` | Chèn bước sàng lọc; `deps.loadFilterSettings`, `deps.createFilter`; trả `filterDecision`… |
| `src/platform/offscreen/main.ts` | Khởi tạo `PhobertTaskFilter`; nhận `filterRunMode`; nhận diện `FilterError('aborted')` |
| `src/platform/background/index.ts` | Chuyển tiếp `filterRunMode`; map bộ trường lọc vào job |
| `src/platform/background/jobs.ts` | `makeJob` khởi tạo mặc định mới; `donePatch()` (P5) gộp trạng thái + trường lọc |
| `src/platform/background/notifications.ts` | Tiêu đề/nội dung thông báo riêng cho ca bị bỏ qua |
| `src/ui/store.ts` | `contentFilter: FilterSettings` (đọc trong `loadAll`), `filterScreenEnabled`, `lastExtraction` |
| `src/ui/sidepanel.ts` | Xử lý `extract-events-all` và `toggle-filter-screen` |
| `src/ui/actions/settings.ts` | Giữ nguyên phần LLM; phần sàng lọc tách sang `actions/filter-settings.ts` |
| `src/ui/actions/extract.ts` | `extractEventsAction(filterRunMode)`; nút "Trích xuất toàn bộ" |
| `src/ui/views/settings.ts` | Chèn `filterSettingsCard(state.contentFilter)` vào tab Cài đặt |
| `src/ui/views/capture.ts` | Dòng kết luận của bước sàng lọc + nút chạy lại toàn bộ |
| `manifest.config.ts` | `host_permissions` + CSP `connect-src` thêm `127.0.0.1:8081`, `localhost:8081`, `127.0.0.1:8000`, `localhost:8000` |

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
       'no_event' + mode 'screen' → JOB_DONE (0 sự kiện, filterDecision = 'no_event',
                                    KHÔNG tạo provider/health LLM)
       'no_event' + mode 'report' → đi tiếp, filterNote = "Chế độ chỉ báo cáo…" (Q12)
       còn lại → extractEvents(document NGUYÊN VĂN)   // không đổi tham số
  7. lưu nháp như hiện tại
  8. JOB_DONE kèm filterApplied / filterDecision / evidenceCount / totalSentences /
     confidence / latencyMs / note
```

Kết thúc sớm ở bước 6 **không phải lỗi**: `JOB_DONE` với `savedCount = 0`,
`filterDecision = 'no_event'`, toast *"Sàng lọc không thấy nội dung công việc nào (độ chắc chắn 91%).
Bạn có thể trích xuất toàn bộ."* + nút hành động.

Hiện thực (P5–P6): bước 2–6 nằm ở `src/platform/offscreen/run-job.ts` (`screenDocument`); deps của job
nhận thêm `loadFilterSettings()` và `createFilter(settings)`. Bước 8 ghi qua `donePatch()` ở
`src/platform/background/jobs.ts`. Kiểm tra consent provider vẫn **đứng trước** bước sàng lọc, còn
việc tạo provider + health LLM **đứng sau** quyết định bỏ qua — nên tài liệu bị bỏ qua không bao giờ
chạm tới endpoint suy luận.

---

## 9. UI

### 9.1. Card cài đặt

```text
Sàng lọc nội dung (PhoBERT)
Máy chủ Python phân loại từng câu thành "câu giao việc", chạy trên chính máy bạn.
Nội dung chỉ được gửi tới dịch vụ cục bộ (mặc định http://127.0.0.1:8081).
Khi tài liệu có nội dung công việc, LLM vẫn nhận toàn văn; bước này chỉ quyết định có gọi LLM hay không.

Chế độ
  ( ) Tắt                              — không gọi bước sàng lọc
  ( ) Chỉ báo cáo (an toàn)            — luôn gửi toàn văn cho LLM, chỉ ghi nhận kết luận
  (•) Sàng lọc trước khi trích xuất    — bỏ qua lần gọi LLM khi chắc chắn không có nội dung công việc

Địa chỉ máy chủ   [http://127.0.0.1:8081]
Timeout (ms) [15000]   Ngưỡng bỏ qua [0.85]   Số câu tối thiểu [3]
[Lưu cài đặt]  [Kiểm tra kết nối]
```

Health hiển thị thiết bị (`cpu`/`cuda`) vì ảnh hưởng trực tiếp tới thời gian sàng lọc.
Ô địa chỉ chỉ nhận `127.0.0.1`/`localhost` ở cổng **8000** hoặc **8081** (đúng các cổng đã khai
trong `host_permissions`); path/query/hash bị từ chối ngay trên form (Q10).

### 9.2. Tab Quét nội dung

- Checkbox **"Sàng lọc nội dung trước khi trích xuất"**, mặc định theo `settings.mode`
  (ẩn khi `mode === 'off'`; luôn ẩn với nguồn `selection`/`paste`). Checked = theo cài đặt
  (`auto`), unchecked = `filterRunMode: 'off'` cho lần chạy đó (Q13); gợi ý dưới checkbox đổi theo
  chế độ đang lưu.
- Sau khi xong, hiện một dòng kết luận (chỉ khi kết quả thuộc **đúng tài liệu đang mở**):
  - `Sàng lọc: có nội dung đáng trích (5/48 câu giao việc) · 1,8 s`
  - `Sàng lọc: không thấy nội dung công việc (chắc chắn 91%) · đã bỏ qua lần gọi LLM`
  - `Sàng lọc không phản hồi — đã trích xuất toàn bộ` (alert vàng, không phải lỗi)
  - `report` + `no_event`: `… · Chế độ chỉ báo cáo nên vẫn trích xuất toàn bộ.` (Q12)
- Khi `savedCount === 0 && filterDecision === 'no_event' && filterNote === null`: nút
  **"Trích xuất toàn bộ"** (`filterRunMode: 'off'`) và panel **ở lại** tab này (Q14).
- Số liệu hiển thị lấy từ `store.lastExtraction` (tóm tắt job), không đọc lại
  `chrome.storage.session`; thời gian < 1 s hiện `ms`, từ 1 s hiện `x,y s`.

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
+   'http://127.0.0.1:8081/*',   // mặc định hiện tại (Q10)
+   'http://localhost:8081/*',
+   'http://127.0.0.1:8000/*',   // alias
+   'http://localhost:8000/*',
+ ],

- connect-src http://127.0.0.1:8080
+ connect-src http://127.0.0.1:8080 http://127.0.0.1:8081 http://localhost:8081 http://127.0.0.1:8000 http://localhost:8000
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
| `tests/platform/offscreen-job.test.ts` (mở rộng) | hành vi cũ của job khi **tắt** sàng lọc (`loadFilterSettings` trả `mode: 'off'`) — giữ nguyên toàn bộ kỳ vọng Slice B/C |
| `tests/platform/offscreen-filter.test.ts` | (F2) 10 ca hành vi job: `screen` + `no_event` ⇒ **không** tạo provider, `savedCount = 0`, tiến trình có bước sàng lọc; `screen` + `has_event` ⇒ provider nhận **nguyên văn**; `report` + `no_event` ⇒ **vẫn** gọi provider + `FILTER_REPORT_NOTE`; `selection`/`paste` ⇒ không tạo filter (Q2); `filterRunMode: 'off'` ⇒ không lọc dù cài đặt `screen`; `'force'` ⇒ lọc dù cài đặt `off`; lỗi `/analyze` và `health` lỗi ⇒ fail-open + toàn văn + `filterApplied = false`; nhiều cửa sổ ⇒ một cửa sổ có việc là `has_event`; huỷ giữa bước sàng lọc ⇒ `FilterError('aborted')`, không lưu nháp |
| `tests/ui/filter-capture.test.ts` | (F2) 7 ca render (checkbox hiện/ẩn theo chế độ và theo nguồn, kết luận `no_event` có %/thời gian/nút toàn bộ, `has_event` có `x/y câu giao việc`, fail-open là alert vàng, không lộ kết luận của tài liệu khác) + 3 ca payload (`auto` không gửi trường, checkbox tắt gửi `off`, nút toàn bộ luôn gửi `off`) |
| `tests/shared/contracts.test.ts` (mở rộng) | job cũ thiếu trường lọc vẫn parse được (mặc định) |
| `tests/shared/filter-contracts.test.ts` | (F1) phần hợp đồng sàng lọc tách khỏi `contracts.test.ts`: `FilterSettings` mặc định + ngưỡng, job cũ, `JOB_DONE` cũ/mới, `filterRunMode` hai chiều |
| `tests/platform/filter-settings.test.ts` | (F1) mặc định, lưu/đọc khoá `contentFilter`, bản ghi hỏng/cũ, từ chối giá trị sai |
| `tests/ui/filter-settings.test.ts` | (F1) card render, lưu từ form, chặn endpoint ngoài loopback, health 200/503/lỗi mạng, `validateFilterEndpoint` |
| `tests/ui/smoke.test.ts` (mở rộng) | card cài đặt render, không lỗi escape |

### 11.2. Bộ mẫu

`tests/fixtures/filter/`:
- **Dương (14 mẫu E01–E05, E07–E15 sẵn có)** — mọi mẫu đều phải cho `has_event`. Đây là phép thử
  "không bỏ sót" quan trọng nhất. E06 **không** thuộc bộ dương: đây là bản tin không có sự kiện,
  `expected: []`, `source: 'paste'` (§0.1 Q7).
- **Âm (E06 + 10–15 mẫu mới tự soạn)** — menu điều hướng, footer, quảng cáo, luồng bình luận, trang
  đăng nhập, email xã giao, thông báo bảo trì không có mốc thời gian. Không có dữ liệu cá nhân thật.
  Vì E06 là `paste`, nó chỉ đo được ở mức model; không dùng nó để đo tỉ lệ bỏ qua của pipeline.

`tests/eval/filter.eval.test.ts` (tất định, `MockContentFilter`): kiểm tra **hành vi pipeline** —
`screen` chặn đúng khi mock trả `no_event`, vẫn trích xuất khi `has_event`/`uncertain`, không gọi
filter với `selection`. Test này **không** đo model và **không** được dùng để tuyên bố độ chính xác.

### 11.3. Đo thật (có model)

`tests/eval/filter.live.eval.test.ts`, gate bằng `FILTER_EVAL=1`, endpoint `FILTER_ENDPOINT`
(mặc định `http://127.0.0.1:8081`), bỏ qua khi không đặt biến — cùng pattern `LLAMA_EVAL=1`.
In bảng: case, `decision`, `confidence`, `evidence/total`, latency, và **kết quả trích xuất đầy đủ
khi chạy `screen`** để so với baseline không lọc. Đây là nguồn số duy nhất cho §11.4.

### 11.4. Chỉ số nghiệm thu

| Chỉ số | Ngưỡng |
|---|---|
| **Tài liệu dương bị bỏ sót** (14 mẫu E01–E05, E07–E15 → `no_event`) | **0** |
| Tỉ lệ bỏ qua trên mẫu âm | ≥ 70% |
| Sự kiện bị mất khi so `screen` với baseline không lọc (trên mẫu dương) | **0** |
| Latency sàng lọc/tài liệu | p95 ≤ 8 s (CPU), ≤ 2 s (CUDA) |
| Lỗi bước sàng lọc | **không lần nào** làm hỏng job (fail-open) |
| `npm run typecheck` / `lint` / `test` / `build` | pass; test mới chạy trong CI không cần Python |

> Bộ dương gồm **14 mẫu** (E01–E05, E07–E15); E06 là mẫu âm và là `paste` nên chỉ đo ở mức model
> (§0.1 Q7, §11.2). Không dùng E06 để tính chỉ số “tài liệu dương bị bỏ sót”.

> Quy tắc chốt: nếu chỉ số đầu tiên > 0, nâng `skipConfidence`/`minSentencesToSkip` hoặc hạ mặc định
> về `report` **trước khi** phát hành. Không tuyên bố "đã sàng lọc" khi chưa có số từ §11.3.

> **Trạng thái F2 (2026-10-27):** chưa có số từ §11.3, nên mặc định đã hạ về **`report`**
> (`DEFAULT_FILTER_MODE`, Q11). Hệ quả: bước sàng lọc **chạy** và hiện kết luận, nhưng **không**
> bỏ qua lần gọi LLM. Chỉ số ở bảng trên vẫn là điều kiện để P9 nâng lại `screen`.

---

## 12. Chia slice & tiêu chí nghiệm thu

### 12.1. Chia phiên thực hiện (P0–P12)

Mỗi phiên là một đơn vị giao việc độc lập: một mục tiêu, danh sách file đóng, gate xanh và báo cáo
ngắn. P0–P12 ánh xạ vào các slice F0–F3 bên dưới; **tổng công không đổi**, chỉ tăng số điểm kiểm tra.

| Phiên | Slice | Phạm vi chính | File chính | DoD tham chiếu | Phụ thuộc | Công |
|---|---|---|---|---|---|---|
| **P0** | Chuẩn bị | Chạy `uvicorn`, xác nhận `/health` + `/analyze`; không sửa mã nguồn/tài liệu | — | §14 | — | 0,25 |
| **P1** | F0a | Port, `filter-types`, `FilterSettingsSchema`, mở rộng job + message | `src/core/ports/content-filter.ts`, `src/core/extraction/filter-types.ts`, `src/shared/{contracts,messages,constants}.ts` | §5; contract test | — | 0,5 |
| **P2** | F0b | Chia cửa sổ, gộp quyết định, mock filter | `src/core/extraction/{prefilter,mock-filter}.ts` | §6; §11.1 (core) | P1 | 0,5 |
| **P3** | F1a | HTTP client PhoBERT + test mock `fetch` | `src/platform/inference/phobert-filter.ts` | §11.1 (client) | P1 | 0,5 |
| **P4** | F1b | Lưu cài đặt, card UI, health, manifest/CSP | `src/platform/storage/filter-settings.ts`, `src/ui/{store.ts,views/filter-settings.ts,views/settings.ts,actions/filter-settings.ts,actions/index.ts,settings-wiring.ts,sidepanel.ts}`, `manifest.config.ts` | §9.1, §10 | P3 | 0,75 |
| **P5** | F2a | Nối sàng lọc vào job, background, notification | `src/platform/offscreen/**`, `src/platform/background/**` | §8; §11.1 (job) | P1, P2, P3 | 0,75 |
| **P6** | F2b | Checkbox, dòng kết luận, nút “Trích xuất toàn bộ” | `src/ui/actions/extract.ts`, `src/ui/views/capture.ts`, `src/ui/{store.ts,sidepanel.ts}`, `tests/ui/smoke.test.ts` | §9.2 | P4, P5 | 0,5 |
| **P7** | F2c | Nghiệm thu tay 5 kịch bản + huỷ giữa bước sàng lọc | `docs/kiem-tra-slice-f.md`, `docs/kiem-thu-demo.md` §9 | §12.2 | P6, P0 | 0,25 |
| **P8** | F3a | Mẫu âm + eval tất định | `tests/fixtures/filter/**`, `tests/eval/filter.eval.test.ts` | §11.2 | P2, P5 | 0,5 |
| **P9** | F3b | Đo thật, chốt ngưỡng, ghi kết quả | `tests/eval/filter.live.eval.test.ts`, `docs/ket-qua-bo-loc.md` | §11.3–§11.4 | P7, P8, P0 | 0,75 |
| **P10** | F4a | Đồng bộ tài liệu kiến trúc | `AGENTS.md` §3–§5, `docs/DEVIATIONS.md`, `proposed_technical.md`, `ke_hoach_phat_trien.md` | §13 | P6 | 0,25 |
| **P11** | F4b | Đồng bộ tài liệu hành vi | `script.md` KS-05, `README.md`, `extension/README.md`, `ke_hoach_thiet_ke_frontend.md` | §13 | P6, P7 | 0,25 |
| **P12** | Đóng slice | Trạng thái cuối, số đo, gate cuối | `AGENTS.md` §11, `docs/ke-hoach-bo-loc-noi-dung.md`, `docs/ket-qua-bo-loc.md` | §12 + AGENTS §11 | P9, P10, P11 | 0,25 |

**Thứ tự & chạy song song**

- Đường bắt buộc: `P1 → P2 → P5 → P6 → P7 → P9 → P12`.
- Nhánh client: `P1 → P3 → P4`; P4 có thể chạy song song P5.
- Nhánh đo: `P2 → P8`; P8 có thể chạy song song P4/P6.
- Tài liệu: `P6 → P10` và `P6 → P11`; P10/P11 có thể chạy song song P9 nhưng số liệu cuối chỉ
  điền ở P12.
- **Không chạy song song:** P4 với P6 (cùng `src/ui/store.ts`, `src/ui/sidepanel.ts`); P7 với P9
  (P9 cần kết quả nghiệm thu tay).
- P0 phải xong trước P4 (kiểm tra health thật), P7 và P9.
- P9 cần thêm `llama-server` cho baseline không lọc; nếu chỉ đo bước sàng lọc thì không cần.
- P0 có thể dùng venv ngoài `ml_hasevent_filter/` để giữ thư mục bàn giao sạch (xem §14).
- Nếu chạy nhiều agent: mỗi phiên một branch/worktree; P1 merge trước tất cả.

### 12.2. Phiên nghiệm thu tay P7

Chạy trong Chrome với `uvicorn` (và `llama-server` cho các ca cần LLM):

- (a) `off` → hành vi giống hệt hiện tại.
- (b) `report` → có dòng kết luận, số sự kiện không đổi so với baseline.
- (c) `screen` + tài liệu dương → sự kiện y hệt baseline không lọc.
- (d) `screen` + tài liệu âm → 0 sự kiện, có nút “Trích xuất toàn bộ”; bấm lại thì chạy LLM.
- (e) tắt Python giữa chừng → job vẫn xong với toàn văn + cảnh báo vàng.
- Huỷ giữa bước sàng lọc → `Đã huỷ`, không lưu nháp.

Ghi kết quả từng ca vào `docs/kiem-tra-slice-f.md`. Ca lỗi tách thành phiên sửa riêng, không gộp
vào P8/P9.

### 12.3. Quy tắc chung cho mọi phiên

- Mỗi phiên kết thúc bằng `npm run typecheck && npm run lint && npm test && npm run build` xanh;
  không để nợ kiểm tra sang phiên sau.
- Không sửa `ml_hasevent_filter/**`, `src/core/extraction/{pipeline,chunk,prompt,normalize,schema,dedup,profile-match}.ts`,
  `src/platform/inference/llama-cpp.ts` (trừ phiên được nêu rõ).
- `src/core/**` vẫn thuần: không `chrome.*`, không import `platform/**`/`ui/**`.
- File mới dưới ~320 dòng (ESLint `max-lines`), một trách nhiệm.
- Không thêm host remote, không `<all_urls>`, không remote code.
- Không tuyên bố “đã sàng lọc” trên tài liệu trước khi P9 có số thật; nếu có dương bị bỏ sót thì
  đổi mặc định về `report` hoặc nâng ngưỡng trước khi phát hành.

Mẫu giao phiên:

```text
Bối cảnh: repo Chrome Extension MV3 trong extension/.
Đọc trước: AGENTS.md, docs/ke-hoach-bo-loc-noi-dung.md, docs/DEVIATIONS.md.

Phiên: P5 — F2a (nối sàng lọc vào job).
Phạm vi được sửa: <danh sách file ở bảng §12.1>.
Không sửa: ml_hasevent_filter/**, các file core/pipeline và llama-cpp.ts.

Việc cần làm: <mục Phạm vi chính + các bước §8>.
Test bắt buộc: <các ca §11.1 tương ứng>.
Gate: cd extension && npm run typecheck && npm run lint && npm test && npm run build.

Báo cáo: file đã sửa, test đã thêm, kết quả gate, điểm lệch so với kế hoạch.
```

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
- Mẫu âm, `filter.eval.test.ts`, `filter.live.eval.test.ts`; đo 14 mẫu dương + E06 + mẫu âm +
  10 trang thật.
- **DoD:** bảng §11.4 có số từ lần chạy thật; ghi vào `docs/ket-qua-bo-loc.md`; xác nhận mặc định
  `screen` hoặc hạ về `report` kèm lý do; cập nhật `docs/DEVIATIONS.md` + `AGENTS.md` §11.

Tổng: **5–6,5 ngày công**, không phụ thuộc S7.

### 12.4. Nhật ký tiến độ (P0–P12)

Chỉ ghi một phiên là "xong" khi gate ở §12.3 đã xanh. "Xong" ở cấp phiên **không** có nghĩa tính
năng đã chạy: bước sàng lọc chỉ hoạt động sau P5–P6 và chỉ được tuyên bố "đã sàng lọc" sau P9.

| Phiên | Trạng thái | Ngày | Bằng chứng / ghi chú |
|---|---|---|---|
| P0 | **Xong** | 2026-10-27 | Dịch vụ chạy sẵn ở `127.0.0.1:8081` (không phải 8000 — Q10). `GET /health` → `{"status":"ok","model":"PhoBERT TASK/NON_TASK","device":"cuda"}`; `POST /analyze` trả `has_task/confidence/needs_review/evidence/total_sentences`. |
| P1 | **Xong** | 2026-10-26 | `content-filter.ts`, `filter-types.ts`; `FilterSettingsSchema` + 7 trường job; `filterRunMode` hai chiều; +4 contract test. |
| P2 | **Xong** | 2026-10-26 | `prefilter.ts`, `mock-filter.ts`; +27 test (21 prefilter + 6 mock). |
| P3 | **Xong** | 2026-10-27 | `src/platform/inference/phobert-filter.ts`: `/health` timeout 2 s (map `device`, 503 = đang tải model), `/analyze` timeout theo cài đặt + `AbortSignal`, Zod validate response, `FilterError` (`network`/`timeout`/`http`/`invalid-response`/`aborted`), gợi ý 5000 ký tự khi 422, `latencyMs` đo phía client. +12 test |
| P4 | **Xong** | 2026-10-27 | Lưu cài đặt (`filter-settings.ts`, khoá `contentFilter`), card UI + health (`views/filter-settings.ts`, `actions/filter-settings.ts`), `settings-wiring.ts` gộp handler, `store.contentFilter` + `loadAll`, manifest/CSP 4 origin (8081 mặc định + 8000 alias). +18 test (5 storage, 11 UI, 2 contract tách ra) |
| P5 | **Xong** | 2026-10-27 | `run-job.ts`: chọn chế độ bằng `resolveFilterMode`, `health` 2 s, chia cửa sổ theo `filterCharBudget(text, chunkChars, maxChunks)`, `analyze` tuần tự với tiến trình (`Đang kiểm tra bước sàng lọc…`, `Đang sàng lọc nội dung i/n…`), gộp bằng `summarizeFilter`, dừng sớm khi `screen` + `no_event` + `applied` (không tạo provider). Fail-open ghi `filterApplied = false` + `filterNote`; huỷ ⇒ `FilterError('aborted')`. `offscreen/main.ts` truyền `loadFilterSettings`/`PhobertTaskFilter`/`filterRunMode` và map abort sang `JOB_CANCELLED`; `donePatch` ở `background/jobs.ts`; notification có tiêu đề/nội dung riêng cho ca bỏ qua. +10 test |
| P6 | **Xong** | 2026-10-27 | `store`: `filterScreenEnabled`, `lastExtraction`; `actions/extract.ts`: `extractEventsAction(filterRunMode?)`, `skippedByFilter`, `summaryOf`, không nhảy tab khi bị bỏ qua (Q14); `views/capture.ts`: checkbox + dòng kết luận + nút "Trích xuất toàn bộ"; `sidepanel.ts` xử lý `extract-events-all`/`toggle-filter-screen`; CSS `.screening-toggle`/`.screening-result`. +10 test |
| P7–P12 | Chưa làm | — | Giữ nguyên thứ tự và phụ thuộc ở §12.1. **Mặc định là `report` (Q11)**: bước sàng lọc đã chạy nhưng chưa bỏ qua lần gọi LLM nào cho tới khi P9 có số. |

Gate F0 (2026-10-26): `typecheck` / `lint` / `test` / `build` xanh; **295 passed, 17 skipped (30 file)**.

Gate F1 (2026-10-27): `typecheck` / `lint` / `test` / `build` xanh; **385 passed, 17 skipped (40 file)**
(39 file chạy + 1 file live `llama-server` bị skip). `PhobertTaskFilter` đã được chạy **với dịch vụ
thật** ở `127.0.0.1:8081`: `health()` → `{ok: true, device: "cuda"}`, `analyze()` map đúng
`hasTask/confidence/needsReview/evidence/totalSentences` (28 ms). Nghiệm thu tay P4 **trong Chrome**
vẫn chưa chạy: cần bấm "Kiểm tra kết nối" trong Cài đặt với `uvicorn` thật (checklist §9 của
`docs/kiem-thu-demo.md`, làm cùng P7).

**Điểm lệch F0:** `src/platform/offscreen/run-job.ts` (file của P5) đã phải thêm 7 trường lọc trung
tính vào `ExtractionJobResult` để `JOB_DONE` biên dịch với schema mới. Không đổi hành vi; P5 thay
giá trị trung tính bằng kết quả thật. Ngoài ra chưa có thay đổi nào ở UI, cài đặt, manifest hay
luồng chạy job.

**Điểm lệch F1:**
- **Cổng mặc định 8081** thay vì 8000 (§0.2 Q10). Manifest/CSP khai báo cả `8081` và `8000` trên
  `127.0.0.1` + `localhost`; UI từ chối mọi cổng khác để lỗi hiện ngay trên form thay vì `fetch`
  bị Chrome chặn.
- **Tách file để giữ `max-lines` 320:** card sàng lọc và action của nó nằm ở hai file mới thay vì
  nhồi vào `views/settings.ts` (249 → 252 dòng) và `actions/settings.ts` (352 dòng). `sidepanel.ts`
  gọi một dispatcher `settings-wiring.ts` cho cả hai form Cài đặt.
- **Phần hợp đồng sàng lọc** chuyển từ `tests/shared/contracts.test.ts` sang
  `tests/shared/filter-contracts.test.ts` (file cũ đã vượt 320 dòng).
- P4 **không** chạm `run-job.ts`, `run-job` vẫn trả trường lọc trung tính như F0.
- **Mặc định `screen`** trong schema theo Q1/D3, nhưng vì sàng lọc chưa nối vào job nên **chưa có
  hành vi nào thay đổi**. Trước khi F2 bật mặc định cho người dùng, F3 phải chứng minh **0 tài liệu
  dương bị bỏ sót**; nếu không, hạ mặc định về `report` và ghi lý do.

Gate F2 (2026-10-27, commit `a30bbd5`): `typecheck` / `lint` (**0 warning**) / `test` / `build` xanh;
**405 passed, 17 skipped (42 file)**. `run-job` đã được chạy với `PhobertTaskFilter` **thật** ở
`127.0.0.1:8081` (`device: cuda`) và `MockProvider`:

| Mẫu | `decision` | evidence/câu | confidence | latency | LLM có được gọi? |
|---|---|---|---|---|---|
| Dương (3 câu giao việc rõ) | `has_event` | 3/3 | 0,64 | 23 ms | có (1 lần) |
| Âm — menu/footer | `has_event` (dương tính giả) | 3/4 | 0,55 | 1 354 ms | có |
| Âm — văn bản bách khoa | `uncertain` | 0/4 | — | ~1,3 s | có |
| Âm — công thức nấu ăn | `has_event` (dương tính giả) | 2/4 | 0,60 | ~0,9 s | có |
| Âm — bản tin thị trường | `uncertain` | 0/4 | — | ~0,9 s | có |

Kết luận: **chưa có mẫu âm nào bị bỏ qua** — model bàn giao còn dương tính giả trên văn bản nhiễu,
nên hướng sai lệch hiện tại là *an toàn cho recall* nhưng làm giảm mức tiết kiệm của bước sàng lọc.
Đây chính là lý do hạ mặc định về `report` (Q11) và là dữ liệu vào cho P9. Đường bỏ qua thật vẫn
được kiểm bằng `MockContentFilter` (§11.1) — chưa tuyên bố "đã sàng lọc" trên tài liệu thật.

**Điểm lệch F2:**
- **Mặc định hạ về `report`** (Q11) thay vì `screen` như Q1/D3, vì P9 chưa có số. Sửa một hằng số
  `DEFAULT_FILTER_MODE` là đủ để nâng lại; phụ đề "Mặc định" trong card Cài đặt đọc từ hằng số này.
- **`filterNote` được định nghĩa lại** (Q12): không còn dùng ghi chú cho kết luận bình thường; nó chỉ
  mang fail-open/rỗng/báo cáo. Nhờ vậy UI phân biệt "đã bỏ qua" với "vẫn gọi LLM" bằng ba trường
  thay vì so chuỗi.
- **Tách `donePatch` + `FILTER_SKIPPED_STAGE`** (Q15) để giữ `max-lines`: `background/index.ts` và
  `sidepanel.ts` đều đã ở sát 320 dòng.
- **`screeningResult` chỉ hiện khi `lastExtraction.documentId` khớp tài liệu đang mở**, và
  `lastExtraction` được lưu cả khi `notify = false` — nếu không, mở lại panel sẽ mất kết luận.
- **Tiến trình sàng lọc dùng chính `chunkIndex/chunkCount` của job** (không thêm trường message mới),
  nên thanh tiến trình hiện "cửa sổ i/n" rồi chuyển sang "đoạn i/n" khi vào LLM.

**Nghiệm thu tay P7 vẫn còn:** 5 ca §12.2 trong Chrome (kể cả "Kiểm tra kết nối" ở Cài đặt và huỷ
giữa bước sàng lọc) chưa chạy; checklist §9 của `docs/kiem-thu-demo.md` chưa thêm.

---

## 13. Đồng bộ tài liệu (bắt buộc trong cùng PR)

| File | Sửa gì |
|---|---|
| `AGENTS.md` §3 | Hàng "Classifier": TF-IDF→JSON→TS **thay bằng** "PhoBERT TASK/NON_TASK microservice (FastAPI, `127.0.0.1:8081`, `8000` alias), dùng để sàng lọc cấp tài liệu" |
| `AGENTS.md` §4 | Host permission tối thiểu thêm `8081` + `8000` trên `127.0.0.1`/`localhost`; nêu rõ là dịch vụ cục bộ, không phải remote |
| `AGENTS.md` §5 | Sơ đồ runtime: thêm nhánh `phobert-filter.ts ──HTTP──► 127.0.0.1:8081` trước `llama-cpp.ts` |
| `AGENTS.md` §11 | Trạng thái: "sàng lọc PhoBERT (Slice F, **F0 + F1 + F2 xong**, **mặc định `report`**)"; P7 + F3 còn chờ |
| `ke_hoach_phat_trien.md` §2, §6 | §6 viết lại: classifier là **dịch vụ Python cục bộ**, không còn `classifier.json`; nêu rõ quyết định **không cắt câu** |
| `docs/DEVIATIONS.md` | Hàng "Classifier" thay bằng "Sàng lọc nội dung (Slice F)" — trạng thái **chưa có**; hàng "Offscreen document" ghi rõ hiện chỉ chạy LLM |
| `script.md` KS-05 | Ghi chú bước "phân loại" dùng PhoBERT cục bộ + quy tắc fail-open / không lọc vùng chọn / LLM nhận toàn văn |
| `proposed_technical.md` §2/§8/§9.1 | Thêm dịch vụ sàng lọc và ràng buộc cục bộ |
| `extension/README.md` | Bản đồ file mới + lệnh chạy `uvicorn` + biến `FILTER_EVAL` |
| `README.md` | Mục tính năng + cách chạy 2 dịch vụ cục bộ |
| `docs/kiem-thu-demo.md` | Mục 9 mới: "Sàng lọc nội dung (PhoBERT)" với checklist tay |
| `ke_hoach_thiet_ke_frontend.md` | B7 đã có 6 bước — ghi chú bước "phân loại" nay có thật |

> Bảng này được viết trước khi `AGENTS.md` §3–§5 được đồng bộ một phần (2026-10-26). Khi làm P10,
> chỉ chuyển trạng thái "planned" → "đã triển khai" và bổ sung nhánh runtime; không lặp lại nội dung
> đã có. `AGENTS.md` §11 chỉ đổi sau khi P9 có số thật (P12).
>
> F1 (2026-10-27) đã cập nhật trước `AGENTS.md` §3–§5, §11 và `extension/README.md` cho đúng phần
> **đã có thật** (client + card cài đặt + quyền), vẫn ghi rõ bước sàng lọc **chưa nối vào job**;
> `docs/DEVIATIONS.md` và `docs/kiem-thu-demo.md` §9 để P6/P10 làm cùng lúc với F2.

---

## 14. Cách chạy dịch vụ (không sửa `ml_hasevent_filter`)

```bash
cd ml_hasevent_filter/handover_api_code
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
# BẮT BUỘC: đường dẫn mặc định trong app.py trỏ tới handover_api_code/models/... (không tồn tại)
MODEL_DIR=../phobert_task_classifier_final \
  uvicorn app:app --host 127.0.0.1 --port 8081
```

Cổng **8081** là mặc định của extension (Q10). Muốn dùng **8000** thì đổi `--port 8000` và sửa ô
"Địa chỉ máy chủ" trong Cài đặt cho khớp; cả hai cổng đều đã nằm trong `host_permissions`.

Kiểm tra:

```bash
curl -s http://127.0.0.1:8081/health
curl -s -X POST http://127.0.0.1:8081/analyze \
  -H 'Content-Type: application/json' \
  -d '{"text":"Hải gửi báo cáo tiến độ trước 17 giờ hôm nay."}'
```

Kết quả đã đo trên máy dev (2026-10-27, GPU):

```json
{"status":"ok","model":"PhoBERT TASK/NON_TASK","device":"cuda"}
{"has_task":true,"confidence":0.6447,"needs_review":true,
 "evidence":[{"sentence_index":1,"sentence":"Hải gửi báo cáo tiến độ trước 17 giờ hôm nay.","task_confidence":0.6447}],
 "total_sentences":1}
```

Lưu ý vận hành (không phải thay đổi code):
- `MODEL_DIR` là bắt buộc vì `app.py` mặc định tìm `handover_api_code/models/phobert_task_classifier_final`.
- Có thể đặt venv ngoài `ml_hasevent_filter/` (ví dụ `/tmp/opencode/phobert-venv`) nếu muốn thư mục
  bàn giao không có thêm file; khi đó trỏ `MODEL_DIR` bằng đường dẫn tuyệt đối.
- `pyvi` là gói cũ; nếu cài trên Python 3.13 thất bại, dùng venv Python 3.11/3.12.
- `requirements.txt` cho `transformers<6.0` nhưng trọng số ghi `transformers_version 5.20.2`; nếu
  load lỗi tokenizer, ghim `transformers==5.20.2`.
- Cổng 8000 hay bị chiếm; extension mặc định gọi **8081** (Q10) và chấp nhận cả 8000, nhưng phải
  khớp `host_permissions`.

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

**Không còn câu hỏi mở.** Toàn bộ hành vi đã chốt ở §0 và §0.1; hai điểm phạm vi cuối đã được trả lời:

1. **Giữ `report`** — làm ngay trong F1/F2 (~0,5 ngày); đây là đường đo và đường lùi nếu F3 phát
   hiện bỏ sót.
2. **Dùng từ "sàng lọc"** trên UI và tài liệu; mã nguồn giữ `screen` / `filter`.

Điều kiện sẵn sàng code (Definition of Ready):

- [x] Chốt 6 quyết định ở §0 (2026-10-26).
- [x] Chốt 3 điểm bổ sung khi rà soát code ở §0.1 (2026-10-26).
- [x] Chia phiên triển khai P0–P12 (§12.1, 2026-10-26).
- [x] Máy dev chạy được `uvicorn` cục bộ (2026-10-27, cổng 8081, `device: cuda`).
- [x] Đồng ý thay đổi `manifest.config.ts`: thêm `8081` + `8000` trên `127.0.0.1`/`localhost` (đã làm ở F1).
- [x] Không có thay đổi nào trong `ml_hasevent_filter/` (ràng buộc của yêu cầu).
- [x] Chốt cổng mặc định 8081 và quy tắc alias (§0.2 Q10, 2026-10-27).

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
