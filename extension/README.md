# extension — mã nguồn demo

Chrome Extension MV3, TypeScript + Vite (CRXJS), **không UI framework**; có lớp trích xuất
sự kiện bằng **LLM** (mặc định llama.cpp cục bộ, hoặc endpoint OpenAI-compatible do người dùng chọn)
chạy trong offscreen document.
Tổng quan tính năng và cách chạy: xem [`../README.md`](../README.md).

> **Đã có:** chọn nơi chạy suy luận (KS-14) — `LlamaCppProvider` cho localhost mặc định và
> `OpenAiCompatibleProvider` cho endpoint remote, chọn qua `platform/inference/factory.ts`.
> Consent theo origin, quyền host cấp lúc chạy và nút xoá key nằm trong Cài đặt.
> Checklist thủ công với Gemini/Cloudflared vẫn chờ chạy (`../docs/kiem-thu-demo.md` §8).
>
> **Đã có (F1 + F2):** bước **sàng lọc PhoBERT** — client `PhobertTaskFilter`
> (`platform/inference/phobert-filter.ts`), lưu cài đặt (`platform/storage/filter-settings.ts`),
> card "Sàng lọc nội dung (PhoBERT)" trong Cài đặt, kiểm tra kết nối và quyền host loopback. Job
> trích xuất đã chạy **sàng lọc → quyết định → LLM** (`offscreen/run-job.ts`); tab Quét nội dung có
> checkbox, dòng kết luận (độ chắc chắn, số câu giao việc, thời gian) và nút **"Trích xuất toàn bộ"**.
>
> **Chưa có:** mặc định đang là **`report`** (`DEFAULT_FILTER_MODE`) — bước sàng lọc chạy và báo cáo
> nhưng **không bỏ qua** lần gọi LLM. Chỉ đổi sang `screen` (hoặc chọn tay trong Cài đặt) sau khi F3
> đo xong và chứng minh **0 tài liệu dương bị bỏ sót**. Nghiệm thu tay P7 với `uvicorn` thật còn chờ.

## Lệnh

```bash
npm install --legacy-peer-deps
npm run dev        # HMR
npm run build      # tsc --noEmit + vite build → dist/
npm run typecheck
npm run lint
npm test
LLAMA_EVAL=1 npx vitest run tests/eval/extraction.live.eval.test.ts \
  --reporter=verbose --disableConsoleIntercept   # đo thật, cần llama-server
LLAMA_EVAL=1 LLAMA_MODEL=chat npx vitest run tests/eval/postcheck.live.eval.test.ts \
  --reporter=verbose --disableConsoleIntercept   # ablation raw vs hậu kiểm (TASK 01)
```

Số đo của các lần chạy thật (commit, model, sampler, bảng tổng hợp) nằm ở
[`../docs/evidence/`](../docs/evidence/). Baseline luật tất định (TASK 05) chạy
luôn trong `npm test` (`tests/eval/rule-baseline.eval.test.ts`), không cần model.

Load unpacked từ `dist/`.

## Dịch vụ sàng lọc (Slice F — F1 + F2: cài đặt + nối vào job)

Cách chạy dịch vụ (không sửa `ml_hasevent_filter/`):

```bash
cd ../ml_hasevent_filter/handover_api_code
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8081
```

- Không cần đặt `MODEL_DIR`: `app.py` mặc định đọc
  `handover_api_code/models/phobert_task_classifier_final` (thư mục model nằm ngay trong
  `handover_api_code/`). Cần trỏ nơi khác thì đặt `MODEL_DIR=<đường dẫn>`.
- Extension mặc định gọi **8081**; `8000` vẫn dùng được nếu đổi `--port` và ô địa chỉ trong Cài đặt
  (cả hai cổng đã có trong `host_permissions`).
- Health: `curl -s http://127.0.0.1:8081/health` → `{"status":"ok","model":…,"device":"cuda"}`.
- F1 đã chạy `PhobertTaskFilter` với dịch vụ thật ở 8081 (health + `/analyze`, 28 ms); bấm
  "Kiểm tra kết nối" trong Chrome vẫn nằm trong checklist thủ công.
- F2 đã chạy `runExtractionJob` với dịch vụ thật (`device: cuda`) và `MockProvider`: tài liệu dương
  → `has_event` (3/3 câu giao việc, 23 ms) và LLM được gọi; 4 tài liệu âm (menu/footer, bách khoa,
  công thức, bản tin) → không mẫu nào bị bỏ qua (2 `uncertain`, 2 `has_event` do model dương tính
  giả). Vì vậy mặc định vẫn là `report`.
- Biến `FILTER_EVAL=1` cho bộ đo thật sẽ được thêm ở F3 cùng `tests/eval/filter.live.eval.test.ts`.
- Chi tiết hợp đồng, chế độ `off`/`report`/`screen`, ngưỡng 0.85 và tiêu chí nghiệm thu:
  [`../docs/ke-hoach-bo-loc-noi-dung.md`](../docs/ke-hoach-bo-loc-noi-dung.md).

## Bản đồ file

| Đường dẫn | Trách nhiệm |
|---|---|
| `src/shared/contracts.ts` | Zod schema + type cho `Profile`, `Event`, `NormalizedDocument` (nguồn duy nhất) |
| `src/shared/messages.ts` | Hợp đồng message giữa các context |
| `src/shared/constants.ts` | Nhãn tiếng Việt, giới hạn kích thước, key storage |
| `src/core/dates.ts` | Parse/format ngày giờ, tách–ghép ô ngày/giờ, nhãn tương đối, thời lượng |
| `src/core/events.ts` | Tạo/cập nhật sự kiện, state machine, lọc/sắp xếp, lọc theo hồ sơ và nhãn tuỳ chỉnh |
| `src/core/event-review.ts` | Hàm thuần cho duyệt nháp: thứ tự ưu tiên, cảnh báo thiếu thời điểm, làm sạch lựa chọn |
| `src/core/extraction/confidence.ts` | Ngưỡng/mức độ tin cậy dùng chung (Thấp/Vừa/Cao) |
| `src/core/extraction/similar.ts` | Gợi ý sự kiện gần trùng (paraphrase) — chỉ hiển thị, không ghi DB |
| `src/core/profiles.ts` | Tạo/cập nhật/tìm hồ sơ |
| `src/core/forms.ts` | Validate form bằng Zod, map lỗi về từng trường |
| `src/core/text.ts` | Chuẩn hoá, hash, tách tóm tắt/danh sách/nhãn tuỳ chỉnh |
| `src/core/extraction/*` | Chunk, prompt, schema, normalize, dedup, profile-match, pipeline (thuần, test bằng Node) |
| `src/core/ports/inference.ts` | Interface `InferenceProvider` (`llama.cpp`, `openai-compatible`, `mock`) |
| `src/core/inference/provider-choice.ts` | Quy tắc thuần: chuẩn hoá/validate endpoint, local vs remote, consent, endpoint hiệu lực |
| `src/core/ports/content-filter.ts` | Interface `ContentFilter`, `FilterError`, `isFilterAborted()` (Slice F) |
| `src/core/extraction/{filter-types,prefilter,mock-filter}.ts` | Chia cửa sổ, gộp quyết định, `MockContentFilter` (thuần, test bằng Node) |
| `src/platform/inference/phobert-filter.ts` | Client gọi dịch vụ PhoBERT cục bộ `127.0.0.1:8081` (health 2 s, `/analyze`, timeout, abort, Zod) |
| `src/platform/storage/filter-settings.ts` | `loadFilterSettings` / `saveFilterSettings` (khoá `contentFilter`) |
| `src/ui/views/filter-settings.ts` + `src/ui/actions/filter-settings.ts` + `src/ui/settings-wiring.ts` | Card sàng lọc, validate endpoint loopback, lưu + kiểm tra kết nối, dispatcher form Cài đặt |
| `src/platform/inference/llama-cpp.ts` | Provider local: `llama-server` (health, models, timeout, abort) |
| `src/platform/inference/openai-compatible.ts` | Provider remote: `/models`, `/chat/completions`, Bearer key, retry 429/5xx, lỗi 401/403/404/429/5xx; gửi schema rút gọn và hạ một lần sang `json_object` khi 400/422 |
| `src/platform/inference/http.ts` | Helper HTTP dùng chung: timeout/abort, header, parse model, map lỗi, che key |
| `src/platform/inference/factory.ts` | Chọn provider theo `LlmSettings.provider` (local mặc định) |
| `src/platform/permissions.ts` | Xin/thu hồi quyền host động cho đúng origin |
| `src/ui/consent-dialog.ts` | Modal consent theo origin (không dùng `window.confirm`) |
| `src/ui/provider-panels.ts` | Ẩn/hiện panel local/remote khi đổi radio |
| `src/platform/offscreen/*` | Offscreen document: `run-job.ts` chạy **sàng lọc → quyết định (bỏ qua được) → LLM**, lưu nháp, gửi tiến trình |
| `src/platform/background/jobs.ts` | Trạng thái job trong `chrome.storage.session`, validate bằng Zod, `donePatch()` gộp kết quả + kết luận sàng lọc |
| `src/platform/capture/page-snapshot.ts` | Hàm tự chứa inject vào tab: chọn landmark, lọc menu/khung ẩn, cờ trang động/cắt bớt |
| `src/platform/capture/tab.ts` | `executeScript` chạy page snapshot (HTML đã lọc + vùng chọn) |
| `src/platform/capture/parse.ts` | Readability + fallback DOM thô + dán tay |
| `src/platform/storage/db.ts` | Wrapper IndexedDB, validate khi đọc/ghi, export/import |
| `src/platform/background/index.ts` | Service worker: cấu hình side panel + menu chuột phải vùng chọn/cấp trang |
| `src/ui/sidepanel.*` | UI chính 5 tab (Tổng quan · Quét nội dung · Sự kiện · Hồ sơ · Cài đặt), event delegation |
| `src/ui/actions/*` | Nghiệp vụ UI: capture, CRUD, filter, duyệt nháp (`review.ts`), export/import |
| `src/ui/views/*` | View functions trả về HTML (không framework); `capture.ts` cho tab quét nội dung, `event-card.ts` cho thẻ/chi tiết sự kiện, `event-review.ts` cho thanh duyệt |
| `src/ui/popup.*` | Popup: quét nhanh + mở side panel |
| `tests/` | Vitest: core + parse + page snapshot + smoke UI (jsdom + fake-indexeddb) |
| `tests/eval/*` | Slice E + cải thiện báo cáo: metric + field metrics, gold freeze, test tất định `MockProvider`, ablation raw/hậu kiểm (`LLAMA_EVAL=1`), baseline luật tất định, harness đo thật `llama-server` |

## Quy ước

- `core/**` **không** import `chrome.*`, `platform/**`, `ui/**` (ESLint chặn).
- Mọi dữ liệu vào `innerHTML` phải qua `escapeHtml` (`src/ui/components.ts`).
- Không thêm host permission tĩnh ngoài các host loopback đã khai: `http://127.0.0.1:8080/*` (LLM),
  `http://127.0.0.1:8081/*` + `http://localhost:8081/*` (sàng lọc, mặc định) và
  `http://127.0.0.1:8000/*` + `http://localhost:8000/*` (alias). Không remote code.
  Endpoint remote dùng `optional_host_permissions` + `chrome.permissions.request` cho đúng origin và
  chỉ chạy sau consent; không thêm `https://*/*` vào `host_permissions` tĩnh. Mặc định vẫn là local.
  Dịch vụ sàng lọc chỉ chạy trên máy người dùng, không phải backend từ xa.
- Kết quả trích xuất luôn lưu ở `status = 'nhap'`; người dùng duyệt mới chuyển trạng thái.
- File ~300 dòng, một trách nhiệm (`max-lines` cảnh báo ở 320).
