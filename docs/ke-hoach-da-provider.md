# Kế hoạch đa provider — chọn nơi chạy suy luận

> **Trạng thái:** đã chốt phạm vi ngày **2026-10-26**; **đã triển khai F1–F5** trong `extension/`
> cùng ngày. Đã kiểm bằng `typecheck`, ESLint, Vitest và `vite build`; **chưa chạy kiểm thử thủ công
> với Gemini/Cloudflared** vì môi trường phát triển không có Chrome, API key hay `llama-server`.
> Mặc định vẫn là `llama-server` tại `127.0.0.1:8080`; remote chỉ chạy sau khi người dùng chọn
> endpoint, cấp quyền host và đồng ý theo origin.
> Tài liệu này là nguồn hiện hành cho thay đổi "chọn nơi chạy suy luận"; trạng thái chi tiết nằm ở
> §8 và `docs/DEVIATIONS.md`, checklist chạy tay ở `docs/kiem-thu-demo.md` §8.

---

## 0. Quyết định đã chốt

| # | Quyết định | Hệ quả |
|---|---|---|
| 1 | **Localhost vẫn là mặc định** | Người dùng mới không phải cấu hình gì; không có dữ liệu rời máy nếu không opt-in |
| 2 | Cho phép chọn **một endpoint OpenAI-compatible** bất kỳ | Cùng một pipeline; Gemini, Groq, OpenRouter, máy trạm… chỉ khác base URL/key/model |
| 3 | **Gemini là một cấu hình cụ thể**, không phải adapter riêng | Ưu tiên endpoint OpenAI-compatible của Gemini; chỉ thêm adapter native nếu kiểm chứng cho thấy schema/thinking không đáp ứng |
| 4 | Máy trạm ở nhà demo qua **Cloudflared** | Endpoint là HTTPS công khai; cần API key cho `llama-server` và quyền host cấp lúc chạy |
| 5 | **Remote phải opt-in**, cảnh báo một lần cho mỗi origin | Lưu mốc đồng ý theo origin; có nút thu hồi; đổi origin phải đồng ý lại |
| 6 | API key **chỉ lưu cục bộ**, không xuất JSON, không ghi log | Key nằm trong `LlmSettings` (IndexedDB); nút xoá key; `clearAll` xoá luôn |
| 7 | Phạm vi là **demo + vài người thử**, chưa phát hành Chrome Web Store | Chưa làm privacy policy/CRX review; vẫn phải có consent và tài liệu minh bạch |
| 8 | Giữ nguyên các quy tắc lõi | Chỉ đọc khi người dùng bấm; không bịa trường; kết quả vẫn là `nhap` chờ duyệt |

**Định nghĩa "local":** host là `127.0.0.1`, `::1` hoặc `localhost`. Mọi host khác — kể cả
IP LAN, Tailscale hay Cloudflared trỏ về máy của chính người dùng — đều được xem là **remote**
và cần consent, vì dữ liệu đã rời khỏi trình duyệt.

---

## 1. Mục tiêu và tiêu chí nghiệm thu

### 1.1. Mục tiêu

Người dùng chọn được nơi chạy suy luận ngay trong **Cài đặt**:

- **Máy này (mặc định):** `llama-server` tại `127.0.0.1:8080` như hiện tại.
- **Dịch vụ ngoài:** một base URL + API key + model theo chuẩn OpenAI-compatible.
- **Máy trạm của tôi:** cùng cơ chế trên, ví dụ `https://<tên-ngẫu-nhiên>.trycloudflare.com`
  trỏ về `llama-server` ở nhà.

### 1.2. Tiêu chí nghiệm thu

> **Cách đọc:** `[x]` = đã có code + test tự động; `[ ]` = còn phải chạy tay trong Chrome với
> endpoint thật. Không đánh dấu `[x]` cho phần chưa đo thật.

- [x] Đổi provider trong Cài đặt → **Kiểm tra kết nối** báo đúng model/endpoint (unit test;
      chưa chạy Chrome).
- [ ] Trích đúng trên **1–2 trang mẫu** với cả ba nơi: localhost, Gemini (hoặc dịch vụ
      OpenAI-compatible khác), máy trạm qua Cloudflared. **Chưa chạy** — thiếu API key/Chrome.
- [x] Lần đầu dùng một origin remote: hiện cảnh báo rõ, chỉ chạy sau khi người dùng đồng ý;
      từ chối thì không gửi request và giữ provider cũ.
- [x] Thu hồi consent → lần chạy sau bị chặn cho tới khi đồng ý lại.
- [x] API key không xuất hiện trong file JSON xuất dữ liệu, log console hay thông báo lỗi.
- [x] Quay về **Máy này** hoạt động lại bình thường, không cần đăng nhập/xoá key.
- [x] Tài liệu + checklist được cập nhật; không cần chạy lại toàn bộ 15 fixtures.

### 1.3. Không làm trong phạm vi này

- Adapter native cho từng hãng (OpenAI, Groq, Anthropic…); chỉ dùng giao thức chung.
- OAuth, streaming, đếm chi phí, so sánh chất lượng trên toàn bộ golden set.
- Gmail/PDF/DOCX, nhắc việc sự kiện, đồng bộ calendar.
- Privacy policy, CRX, quy trình Chrome Web Store.
- Tự động chọn provider theo loại trang hoặc theo mạng.

---

## 2. Kiến trúc đề xuất

Tận dụng seam đã có: `src/core/ports/inference.ts` (`InferenceProvider`) và
`runExtractionJob()` không biết provider cụ thể. Thay đổi chính nằm ở `platform/` + `ui/`.

```text
src/platform/offscreen/main.ts
        │  createProvider(settings)
        ▼
src/platform/inference/factory.ts
        ├─ LlamaCppProvider          (local, /health + /v1/chat/completions)
        └─ OpenAiCompatibleProvider  (remote, /v1/models + /v1/chat/completions)
                    │
                    ▼
        endpoint do người dùng nhập (HTTPS, hoặc HTTP localhost)
```

### 2.1. Provider

- Giữ `LlamaCppProvider` cho localhost để không phá hành vi `/health` (503 khi đang tải model).
- Thêm `OpenAiCompatibleProvider` cho endpoint remote:
  - `GET {base}/models` để health + lấy tên model (chấp nhận cả `{data:[…]}` và `{models:[…]}`).
  - `POST {base}/chat/completions` với `response_format` JSON schema như hiện tại.
  - Header `Authorization: Bearer <key>`; không đưa key vào query string.
  - `AbortSignal`, timeout, phân loại lỗi dùng lại `InferenceError`.
- Factory chọn provider theo `settings.provider` và host; không để UI tự `new` provider.
- Quy ước base URL: người dùng nhập phần trước `/chat/completions` (thường kết thúc bằng `/v1`);
  extension chuẩn hoá bỏ `/` cuối, không tự thêm `/v1` nếu người dùng đã nhập. Nếu người dùng dán
  cả URL hoàn chỉnh, phần đuôi `/chat/completions`, `/models` hoặc `/health` cũng được bỏ.
- Nếu endpoint remote là Gemini và `/v1beta/openai/` không ép được schema/không tắt được
  thinking → mở **nhánh native tối thiểu** `GeminiProvider` (xem §6.1). Đây là quyết định
  tăng phạm vi, chỉ làm sau khi có kết quả kiểm chứng. **F6 chưa triển khai** vì chưa có bằng
  chứng thật; code hiện chỉ dùng giao thức OpenAI-compatible.

**Đã triển khai (F1–F2):**
`src/platform/inference/openai-compatible.ts` (provider + map lỗi + `finishReason`/`promptFeedback`),
`src/platform/inference/http.ts` (helper HTTP dùng chung), `src/platform/inference/factory.ts`
(chọn provider), `src/core/inference/provider-choice.ts` (quy tắc thuần cho endpoint/consent) và
`src/platform/offscreen/run-job.ts` (chặn chạy khi thiếu consent).

### 2.2. Hợp đồng dữ liệu dự kiến

`LlmSettingsSchema` được mở rộng (giữ default để bản ghi cũ vẫn đọc được):

```ts
provider: 'local' | 'openai-compatible'   // default: 'local'
endpoint: string                          // default: 'http://127.0.0.1:8080'
apiKey: string                            // default: ''
model: string                             // default: '' (local: model đang nạp)
consentByOrigin: Record<string, string>   // origin -> ISO thời điểm đồng ý; default: {}
```

- `ExtractionMeta.provider` thêm `'openai-compatible'` (và `'gemini'` nếu có nhánh native).
- `InferenceProvider.id` mở rộng tương ứng; mọi chỗ switch theo `id` phải xử lý giá trị mới.
- Không đổi `Event`, `EventCandidate`, `NormalizedDocument`, prompt hay schema output.

### 2.3. Quyền host và CSP

- Giữ static `host_permissions: ["http://127.0.0.1:8080/*"]` để localhost chạy ngay.
- Thêm `optional_host_permissions: ["https://*/*", "http://localhost:8080/*", "http://[::1]:8080/*"]`
  (remote bắt buộc HTTPS; hai mẫu HTTP còn lại chỉ dành cho localhost/`::1` cổng 8080).
- Khi lưu endpoint remote: gọi `chrome.permissions.request({ origins: [originPattern] })`
  trong user gesture (nút Lưu/Kiểm tra), rồi mới lưu. Từ chối quyền → không lưu endpoint.
- Với `localhost`/`[::1]`, cũng xin quyền host lúc chạy nếu chưa có, nhưng **không hỏi consent**
  vì vẫn là local. Endpoint mặc định vẫn là `http://127.0.0.1:8080`.
- Bản này chỉ hỗ trợ local alias ở **cổng 8080**; `llama-server` chạy cổng khác cần thêm mẫu quyền
  tương ứng (ngoài phạm vi S7).
- CSP `connect-src` mở thêm `https://*`; `script-src 'self'` giữ nguyên. Đây là CSP
  của extension page, không thay thế host permission.
- Ghi rõ trong UI: quyền chỉ dùng để gọi đúng endpoint người dùng nhập.

**Đã triển khai:** `manifest.config.ts` có `optional_host_permissions: ["https://*/*",
"http://localhost:8080/*", "http://[::1]:8080/*"]` và `connect-src` tương ứng;
`src/platform/permissions.ts` gọi `chrome.permissions.request()` ngay trong handler để giữ user
gesture, và `removeHostPermission()` khi thu hồi consent.

> **Hệ quả cần chấp nhận:** quyền host động có thể hiện cảnh báo rộng khi cấp lần đầu.
> Với bản demo load unpacked, đây là đánh đổi hợp lý; nếu phát hành store phải thiết kế lại
> luồng quyền và privacy disclosure.

### 2.4. Consent

- Chỉ áp dụng cho origin **không phải localhost**.
- Lần đầu lưu/chạy endpoint remote: hiện modal một lần, nêu rõ:
  - origin sẽ nhận nội dung;
  - dữ liệu rời trình duyệt và có thể đi qua nhà cung cấp (Gemini/Cloudflare…);
  - key được lưu cục bộ, không xuất file;
  - có thể thu hồi trong Cài đặt.
- Đồng ý → ghi `consentByOrigin[origin] = new Date().toISOString()`.
- Thu hồi → xoá entry; lần chạy sau chặn và hiện lại modal.
- Từ chối → giữ provider cũ, không gửi request, không ghi đè endpoint.

**Đã triển khai:** modal `src/ui/consent-dialog.ts` (không dùng `window.confirm`), lưu consent ngay
khi đồng ý kể cả khi health sau đó lỗi; endpoint/key chỉ được ghi khi health thành công. Consent
vừa đồng ý trong phiên được giữ ở bộ nhớ tạm để “Kiểm tra kết nối” rồi “Lưu” không hỏi lại; cache
này bị xoá khi lưu thành công, thu hồi hoặc xoá toàn bộ dữ liệu.

### 2.5. API key

- Lưu trong `LlmSettings` (IndexedDB) như hiện tại; đây là plaintext trên máy — phải ghi rõ
  trong UI và tài liệu.
- Không thêm key vào `ExportPayload`; không log key; thông báo lỗi chỉ nêu host/status.
- Nút **Xoá key** trong Cài đặt; **Xoá toàn bộ dữ liệu** xoá luôn settings.
- Không dùng `chrome.storage.session` vì người thử sẽ phải nhập lại mỗi phiên; ghi nhận đây là
  đánh đổi của phạm vi demo.

**Đã triển khai:** form Cài đặt có nút **Xoá key đã lưu**; `ExportPayload` không chứa settings;
`clearAllData` xoá settings/key/consent. Key không được đưa vào query string hay thông báo lỗi;
phần body 400/422 được rút gọn và che key trước khi hiển thị.

### 2.6. Health và lỗi

| Tình huống | Phản hồi |
|---|---|
| Local `/health` 200 | OK, đọc model qua `/v1/models` |
| Remote `/models` 200 | OK, hiện model |
| 401/403 | "API key không đúng hoặc chưa được cấp quyền" |
| 404 | "Không thấy model/endpoint; kiểm tra base URL và tên model" |
| 429 | "Đã chạm giới hạn tần suất/quota; thử lại sau" (đọc `Retry-After` nếu có) |
| 5xx | "Dịch vụ đang lỗi; thử lại" (retry có giới hạn với 429/5xx) |
| Timeout/abort | Giữ nguyên thông điệp hiện tại; huỷ job không lưu rác |
| 400 do schema | Không retry vô hạn; báo rõ để kiểm tra provider |

- `response_format` JSON schema là yêu cầu bắt buộc; nếu provider bỏ qua schema, output vẫn
  phải qua `parseRawExtraction` và retry 1 lần như hiện tại.
- Với Gemini: kiểm tra `finishReason` (`MAX_TOKENS`, `SAFETY`, `RECITATION`) và
  `promptFeedback.blockReason`; map sang thông báo tiếng Việt thay vì "output rỗng".

**Đã triển khai:** map case-insensitive cho `LENGTH`/`MAX_TOKENS`, `SAFETY`, `BLOCKLIST`,
`PROHIBITED_CONTENT`, `SPII`, `RECITATION`, `LANGUAGE` và `promptFeedback.blockReason` /
`prompt_feedback.block_reason`. Retry đúng một lần cho 429/5xx, tôn trọng `Retry-After` nhưng
chặn trần 2 giây; 400/422 không retry. Health remote dùng timeout 10 giây; lỗi health hiển thị
endpoint/model khi thành công.

---

## 3. Luồng người dùng (ánh xạ KS-14)

1. **Cài đặt → Nơi chạy suy luận**: chọn **Máy này** (mặc định) hoặc **Endpoint khác**.
2. Chọn **Endpoint khác** → nhập base URL, API key, model (có thể để trống để tự dò).
3. Bấm **Kiểm tra kết nối**:
   - chuẩn hoá URL, từ chối HTTP ngoài localhost (mọi host khác phải dùng HTTPS);
   - xin quyền host cho đúng origin nếu chưa có;
   - hiện consent một lần nếu origin chưa được đồng ý;
   - gọi health; thành công mới cho lưu.
4. **Lưu** → `provider = 'openai-compatible'`; job trích xuất dùng provider này.
5. **Quay về Máy này** → không cần consent; endpoint/key cũ vẫn được giữ để đổi lại.
6. **Thu hồi quyền/đồng ý** → xoá consent (và tuỳ chọn xoá quyền host); chặn chạy remote.
7. **Xoá key** → xoá `apiKey`; health remote sẽ báo thiếu key.

Luồng lỗi chi tiết nằm ở `script.md` KS-11 và KS-14.

---

## 4. Kế hoạch thi công (ước lượng 7–11 ngày công)

| Lát cắt | Nội dung | Ước lượng |
|---|---|---|
| **F1** | `OpenAiCompatibleProvider` + factory + mở rộng `InferenceProvider.id`/`ExtractionMeta.provider` | 1,5–2 ngày |
| **F2** | `LlmSettings` mở rộng + migration default local + form Cài đặt có điều kiện | 1–1,5 ngày |
| **F3** | Optional host permission + CSP + luồng xin quyền/consent/thu hồi | 1–1,5 ngày |
| **F4** | Health/lỗi/429/5xx/thinking/schema; kiểm chứng Gemini compat | 1–2 ngày |
| **F5** | Test unit + checklist 3 endpoint + docs/DEVIATIONS/AGENTS | 1,5–2 ngày |
| **F6** | (Tuỳ chọn) adapter native Gemini nếu F4 thất bại | 1–2 ngày |

Thứ tự khuyến nghị: **spike F4 trước** (một curl/script nhỏ) để biết có cần F6 không, rồi
làm F1 → F2 → F3 → F5.

**Trạng thái triển khai (2026-10-26):** F1–F5 đã xong phần code + test tự động. F6 **không làm**
vì chưa có kết quả kiểm chứng Gemini thật; nếu spike sau này thất bại mới mở F6. Ước lượng 7–11
ngày công vẫn giữ cho phần chạy thật và xử lý lỗi endpoint, chưa gồm thời gian chạy checklist thủ công.

---

## 5. Kiểm thử

### 5.1. Tự động (Vitest) — đã có

- `tests/platform/openai-compatible.test.ts`: dựng URL/header/body, parse `models`/`choices`,
  map 401/403/404/429/5xx, abort/timeout, `finishReason`/`promptFeedback`.
- `tests/platform/provider-factory.test.ts`: chọn provider theo settings/host; default local.
- `tests/core/provider-choice.test.ts`: chuẩn hoá/validate endpoint, local vs remote, consent,
  giữ endpoint/key remote khi quay về local.
- `tests/platform/permissions.test.ts`: xin/thu hồi quyền host, nhận diện origin tĩnh.
- `tests/platform/settings.test.ts` + `tests/shared/contracts.test.ts`: settings cũ (không có
  `provider`/`consentByOrigin`) vẫn đọc được; `ExtractionMeta.provider` nhận giá trị mới; bản xuất
  dữ liệu không chứa API key hay consent.
- `tests/ui/settings.test.ts`: form hiện/ẩn field, consent chặn lưu, thu hồi, xoá key.
- `tests/ui/extract-guard.test.ts`: chưa consent/chưa có quyền host thì không gửi job.
- Không đưa key thật vào test/CI; dùng `fetch` mock.

### 5.2. Thủ công (Chrome) — còn chờ

- Localhost: health + trích 1 trang như hiện tại.
- Gemini (hoặc endpoint OpenAI-compatible khác): health, trích 1 trang, kiểm tra JSON hợp lệ.
- Máy trạm qua Cloudflared: health, trích 1 trang ngắn; thử trang dài để thấy giới hạn timeout.
- Consent: lần đầu, từ chối, đồng ý, thu hồi, đổi origin.
- Key: kiểm tra không có trong file xuất, không hiện trong toast/log.
- Quay về localhost sau khi dùng remote.

Chi tiết checkbox: `docs/kiem-thu-demo.md` §8. Code đã xong nhưng **các mục thật vẫn để trống**
cho tới khi có Chrome + endpoint; không đánh dấu đã kiểm thử thủ công.

---

## 6. Rủi ro và câu hỏi mở

1. **Gemini OpenAI-compatible có thật sự ép `response_format` schema không?** Nếu không,
   phải dùng native `generateContent` + `responseSchema` (dịch `nullable`, bỏ
   `additionalProperties`). Đây là câu hỏi **vẫn mở**; F1–F5 đã làm theo giả định
   OpenAI-compatible, chưa có bằng chứng từ Gemini thật. Lần chạy 2026-10-26 với
   `gemini-3.5-flash-lite` trả 400 `INVALID_ARGUMENT` khi gửi schema đầy đủ; đã gửi schema rút
   gọn + fallback `json_object` (§8.5) nhưng **chưa xác nhận** trên endpoint thật.
2. **Thinking của Gemini** có thể ăn hết `maxTokens`; cần tắt/hạ mức (`thinkingBudget` với 2.5,
   `thinkingLevel`/`reasoning_effort` với 3) và kiểm tra model cụ thể. Gemini 3 **không tắt được**
   thinking; token suy luận tính vào `max_tokens` (mặc định 1200, trần hợp đồng 2048) nên có thể
   bị cắt trước khi trả JSON. **Chưa đo** — provider remote không gửi `chat_template_kwargs`.
3. **Cloudflared free** có timeout proxy ~100 giây; trang dài hoặc model chậm có thể lỗi 524
   trước timeout 120 giây của extension. Giảm chunk hoặc chấp nhận lỗi trong demo. **Chưa đo.**
4. **Quyền host động** hiện cảnh báo rộng; nếu chuyển sang phát hành store phải thiết kế lại.
5. **Key plaintext** trong IndexedDB là rủi ro đã biết; chấp nhận cho demo, phải ghi rõ.
6. **Model remote thay đổi/deprecate**; không hard-code tên, cho phép để trống để dò hoặc nhập
   `…-latest`.
7. **Chi phí/quota** không được kiểm soát trong bản này; chỉ hiển thị lỗi 429 và không retry vô hạn.
8. **Prompt injection** không đổi: nội dung vẫn là dữ liệu; output vẫn qua Zod; nhưng nhà cung
   cấp remote có thể có hành vi khác — cần thử 1–2 mẫu adversarial.
9. **Context của endpoint remote có thể nhỏ hơn tưởng tượng.** Đo nhanh trên một `llama-server`
   local cho thấy `n_ctx = 3328` trong khi system prompt đã ~1.260 token, chỉ còn ~2.068 token
   cho chunk + output. Trước khi lưu endpoint, health check nên đọc/ghi lại context nếu API cho
   biết; nếu không, giảm `chunkChars` và cảnh báo khi output bị cắt.
10. **Model lớn làm latency sát ngưỡng.** Đo nhanh một model 27B lượng tử hoá trên CPU cho
    ~87 s/tài liệu — gần mức timeout 120 s của extension và vượt xa ngưỡng proxy ~100 s của
    Cloudflared. Đo đầy đủ Slice E ngày 2026-10-26 trên Ternary-Bonsai-2-27B PTQ1_0 cho p95
    127,3 s/tài liệu. Khuyến nghị model ≤ 9B cho demo remote, hoặc giảm chunk và đặt timeout
    thấp hơn để báo lỗi sớm thay vì treo.

**Trạng thái rủi ro (2026-10-26):** các rủi ro 1–3 và 9–10 vẫn **mở** vì chưa chạy đủ checklist
§8 trên Chrome với Gemini/Cloudflared thật (Gemini key đã dùng được nhưng chưa nghiệm thu đủ
các mục §8). Code đã xử lý `finishReason`/`promptFeedback`, retry có giới hạn và
hiển thị lỗi theo host/status, nhưng chưa chứng minh trên Gemini/Cloudflared thật. Adapter native
Gemini (F6) **không triển khai**.

---

## 7. Truy vết tài liệu

- `script.md` — KS-14 (luồng người dùng) + KS-11 (lỗi remote) + Phụ lục B.
- `proposed_technical.md` §9 — lựa chọn nơi chạy suy luận và consent.
- `ke_hoach_phat_trien.md` §0/§1/§2/§4.3/§5/§7/§9/§10–§13/§15 — S7.
- `ke_hoach_thiet_ke_frontend.md` — board B26–B28 + flow P1.
- `docs/ke-hoach-llm-trich-xuat.md` §16 — mở rộng lớp LLM.
- `docs/DEVIATIONS.md`, `docs/kiem-thu-demo.md`, `README.md`, `extension/README.md`,
  `AGENTS.md` — trạng thái và quy ước.

---

## 8. Ghi chú triển khai (2026-10-26)

### 8.1. File đã thêm/sửa

| File | Nội dung |
|---|---|
| `extension/src/platform/inference/openai-compatible.ts` | Provider remote: `/models`, `/chat/completions`, Bearer key, retry 429/5xx, map lỗi và `finishReason`/`promptFeedback`; **giữ model người dùng nhập**, chỉ tự dò khi ô model trống; gửi `EXTRACTION_WIRE_SCHEMA` và hạ một lần sang `json_object` khi 400/422 (§8.5) |
| `extension/src/core/extraction/schema.ts` | Zod + JSON Schema của output; `EXTRACTION_WIRE_SCHEMA` bỏ các ràng buộc sinh (`maxItems`, `minLength`, `minimum`…) cho endpoint remote, giữ `required`/`enum`/`additionalProperties` |
| `extension/src/platform/inference/http.ts` | Helper dùng chung: timeout/abort, header auth, parse model, **chuẩn hoá tiền tố `models/` của Gemini + chọn model chat đầu tiên**, map lỗi HTTP, che key trong body lỗi |
| `extension/src/core/inference/provider-choice.ts` | Hàm thuần: chuẩn hoá/validate endpoint, local vs remote, consent, endpoint hiệu lực khi chọn local |
| `extension/src/platform/inference/factory.ts` | `createInferenceProvider(settings)` |
| `extension/src/platform/permissions.ts` | `ensureHostPermission`, `removeHostPermission`, `needsHostPermission` |
| `extension/src/ui/consent-dialog.ts` | Modal consent thân thiện, thay `window.confirm` |
| `extension/src/ui/views/settings.ts` + `ui/provider-panels.ts` | Form chọn provider, panel local/remote, danh sách consent, nút thu hồi/xoá key |
| `extension/src/ui/actions/settings.ts` | Đọc form, xin quyền/consent, health, lưu, thu hồi, xoá key |
| `extension/manifest.config.ts` | `optional_host_permissions` + `connect-src` cho HTTPS/local alias |
| `extension/src/shared/contracts.ts` | `provider`, `consentByOrigin`, `ExtractionMeta.provider = 'openai-compatible'` |

### 8.2. Quyết định triển khai

- **Lưu remote cần health thành công.** Consent được ghi ngay khi đồng ý (kể cả health sau đó
  lỗi), nhưng `provider`/`endpoint`/`apiKey`/`model` chỉ được lưu khi `/models` trả OK.
- **Giữ cấu hình remote khi quay về local.** Nếu `endpoint` đang là remote, provider local bỏ qua
  endpoint/key/model đó và dùng `http://127.0.0.1:8080`; local alias (`localhost`, `[::1]`) vẫn
  được dùng nếu người dùng nhập.
- **Health không đi qua store.** Kết quả hiển thị trực tiếp trong `#llm-health` để không render
  lại form và mất giá trị đang nhập; `llmHealth` không còn trong `AppState`.
- **Consent trong phiên.** Cache module-level cho phép “Kiểm tra kết nối” rồi “Lưu” mà không hỏi
  lại; cache bị xoá sau khi lưu thành công, thu hồi hoặc xoá toàn bộ dữ liệu.
- **Chặn hai lớp.** UI chặn trước khi gửi job; `runExtractionJob()` kiểm tra lại
  `providerAccessProblem(settings)` để không gửi nếu settings bị sửa trong lúc chờ.
- **Không có adapter native Gemini.** Chỉ dùng OpenAI-compatible; F6 để mở nếu kiểm chứng thật thất bại.
- **`clearAllData` xoá cả consent + cache**, không chỉ dữ liệu sự kiện.

### 8.3. Sửa lỗi Gemini 404 sau khi health OK (2026-10-26)

- **Hiện tượng:** **Kiểm tra kết nối** báo thành công nhưng lúc trích xuất lại báo
  “Không thấy model/endpoint” (HTTP 404).
- **Nguyên nhân:** `health()` lấy model đầu tiên từ `/models` rồi **ghi đè model người dùng đã nhập**.
  Gemini trả ID dạng `models/gemini-…` trong khi `/chat/completions` cần `gemini-…`; danh sách cũng
  có thể bắt đầu bằng model embedding. Vì `runExtractionJob()` gọi health trước khi trích, model bị
  đổi sang ID không dùng được → Gemini trả 404.
- **Cách sửa:** model nhập tay luôn thắng danh sách; chỉ tự dò khi ô model trống; bỏ tiền tố
  `models/`; bỏ qua model embedding/ảnh/âm thanh khi tự dò; lỗi 404 giữ thêm phần thân phản hồi
  (đã che key) để biết chính xác model nào bị từ chối.
- **Test:** `tests/platform/openai-compatible.test.ts` — model cấu hình thắng `/models`, tự dò bỏ
  embedding + tiền tố, và 404 giữ chi tiết.
- **Còn lại:** chạy lại checklist §8.2 với Gemini thật để xác nhận; nếu vẫn lỗi thì xem tiếp
  `response_format`/thinking (rủi ro 1–2) trước khi mở F6.

### 8.4. Việc còn lại

- [ ] Chạy `docs/kiem-thu-demo.md` §8 trong Chrome với `llama-server`, Gemini/OpenAI-compatible
      và Cloudflared thật.
- [ ] Kiểm tra Gemini có tôn trọng `response_format` + tắt thinking được không; nếu không, mở F6.
- [ ] Đo lại giới hạn proxy ~100 giây của Cloudflared với trang dài.
- [ ] Kiểm tra Chrome chấp nhận optional host `http://[::1]:8080/*` và CSP tương ứng.

### 8.5. Sửa lỗi Gemini 400 INVALID_ARGUMENT khi trích xuất (2026-10-26)

- **Hiện tượng:** sau khi sửa 404, **Kiểm tra kết nối** vẫn OK nhưng trích xuất bằng
  `gemini-3.5-flash-lite` trả 400 `Request contains an invalid argument.` (không kèm
  `fieldViolations`).
- **Giả thuyết (chưa xác nhận):** schema gửi trong `response_format` sinh quá nhiều trạng thái cho
  constrained decoding. Tài liệu/cộng đồng Gemini nêu đích danh `maxItems` lồng nhau,
  `minimum`/`maximum` và chuỗi/enum dài. Schema cũ có `events.maxItems = 20`,
  `summary.maxItems = 5`, `uncertain.maxItems = 10`, `confidence` 0–1 và `maxLength` — đúng các
  dạng bị nêu. Không lấy được nguyên văn body đầy đủ nên đây là **giả thuyết**, không phải kết luận.
- **Cách sửa:**
  - Thêm `type: 'string'` cho `label`; một số bộ chuyển schema từ chối `enum` không có `type`.
  - `EXTRACTION_WIRE_SCHEMA` gửi cho endpoint remote: bỏ đệ quy `maxItems`, `minItems`,
    `maxLength`, `minLength`, `minimum`, `maximum`, `uniqueItems`; giữ `required`, `enum`,
    `additionalProperties: false` và `type` (kể cả `["string", "null"]`).
  - Local vẫn dùng `EXTRACTION_RESPONSE_SCHEMA` đầy đủ. Zod (`parseRawExtraction`) vẫn kiểm tra
    lại toàn bộ output nên **không nới hợp đồng dữ liệu**.
  - Remote thử `json_schema` trước; nếu 400/422 thì hạ **đúng một lần** sang `json_object` và giữ
    dạng đó cho các đoạn còn lại của job. Retry 429/5xx chạy **trước** bước hạ để lần thử lại trả
    400 vẫn được hạ; khi đã ở `json_object` thì không gửi lặp.
- **Test:** `tests/core/extraction-schema.test.ts` (wire schema bỏ đúng khoá, giữ cấu trúc) và
  `tests/platform/openai-compatible.test.ts` (400 → `json_object` một lần; `json_object` gặp 400
  không lặp; 5xx → 400 vẫn hạ).
- **Còn lại:** build lại, reload extension và chạy lại §8.2 với Gemini thật. Nếu vẫn 400: chép
  nguyên văn body (UI đã hiện body 400/404/422 đã che key); cân nhắc bỏ `additionalProperties`
  hoặc mở F6. **Chưa xác nhận trên endpoint thật.**

---

*Tài liệu này mô tả kế hoạch và ghi chú triển khai; mã nguồn chuẩn nằm trong `extension/`.
Cập nhật mục "Trạng thái" và §8 khi chạy xong checklist thủ công.*
