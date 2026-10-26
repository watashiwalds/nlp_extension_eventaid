# extension — mã nguồn demo

Chrome Extension MV3, TypeScript + Vite (CRXJS), **không UI framework**; có lớp trích xuất
sự kiện bằng **LLM cục bộ** (llama.cpp) chạy trong offscreen document.
Tổng quan tính năng và cách chạy: xem [`../README.md`](../README.md).

> **Chưa có trong code:** chọn provider remote. Demo chỉ tạo `LlamaCppProvider` và chỉ gọi
> `127.0.0.1:8080`. Kế hoạch S7 (`../docs/ke-hoach-da-provider.md`, `../script.md` KS-14) sẽ thêm
> `platform/inference/factory.ts` + `openai-compatible.ts`; chưa triển khai.
>
> **Cũng chưa có:** bước **sàng lọc PhoBERT** trước LLM (Slice F). Kế hoạch
> `../docs/ke-hoach-bo-loc-noi-dung.md` sẽ nối dịch vụ FastAPI cục bộ tại `127.0.0.1:8000` vào
> `offscreen/run-job.ts`; hiện job gọi LLM trực tiếp như trước.

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
```

Load unpacked từ `dist/`.

## Dịch vụ sàng lọc (Slice F — chưa triển khai)

Khi làm Slice F, extension sẽ gọi thêm dịch vụ PhoBERT cục bộ. Cách chạy dịch vụ (không sửa
`ml_hasevent_filter/`):

```bash
cd ../ml_hasevent_filter/handover_api_code
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
MODEL_DIR=../phobert_task_classifier_final \
  uvicorn app:app --host 127.0.0.1 --port 8000
```

- `MODEL_DIR` là bắt buộc vì `app.py` mặc định trỏ tới đường dẫn không tồn tại.
- Health: `curl -s http://127.0.0.1:8000/health`.
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
| `src/core/ports/inference.ts` | Interface `InferenceProvider` |
| *(Slice F, chưa có)* `src/core/ports/content-filter.ts` | Interface `ContentFilter` + type quyết định sàng lọc cấp tài liệu |
| *(Slice F, chưa có)* `src/core/filter/*` | Chia cửa sổ, gộp quyết định, `MockFilter` (thuần, test bằng Node) |
| *(Slice F, chưa có)* `src/platform/inference/phobert-filter.ts` | Client gọi dịch vụ PhoBERT `127.0.0.1:8000` (health, `/analyze`, timeout, fail-open) |
| `src/platform/inference/llama-cpp.ts` | Provider gọi `llama-server` cục bộ (health, models, timeout, abort) — **provider duy nhất hiện có** |
| *(S7, chưa có)* `src/platform/inference/factory.ts` | Chọn provider theo `LlmSettings.provider` (kế hoạch `../docs/ke-hoach-da-provider.md`) |
| *(S7, chưa có)* `src/platform/inference/openai-compatible.ts` | Provider remote (`/models`, `/chat/completions`, Bearer key, lỗi 401/403/404/429/5xx) |
| `src/platform/offscreen/*` | Offscreen document chạy job trích xuất, lưu nháp, gửi tiến trình |
| `src/platform/background/jobs.ts` | Trạng thái job trong `chrome.storage.session`, validate bằng Zod |
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
| `tests/eval/*` | Slice E: metric, test tất định `MockProvider`, harness đo thật `llama-server` (`LLAMA_EVAL=1`) |

## Quy ước

- `core/**` **không** import `chrome.*`, `platform/**`, `ui/**` (ESLint chặn).
- Mọi dữ liệu vào `innerHTML` phải qua `escapeHtml` (`src/ui/components.ts`).
- Không thêm host permission tĩnh ngoài `http://127.0.0.1:8080/*`; không gọi mạng ra ngoài máy, không remote code.
  Khi làm S7, endpoint remote dùng `optional_host_permissions` + `chrome.permissions.request` cho đúng
  origin và chỉ chạy sau consent; không thêm `https://*/*` vào `host_permissions` tĩnh.
  Khi làm Slice F, thêm đúng hai host loopback `http://127.0.0.1:8000/*` và `http://localhost:8000/*`
  cho dịch vụ sàng lọc; đó vẫn là máy người dùng, không phải backend từ xa.
- Kết quả trích xuất luôn lưu ở `status = 'nhap'`; người dùng duyệt mới chuyển trạng thái.
- File ~300 dòng, một trách nhiệm (`max-lines` cảnh báo ở 320).
