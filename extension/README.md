# extension — mã nguồn demo

Chrome Extension MV3, TypeScript + Vite (CRXJS), **không UI framework**; có lớp trích xuất
sự kiện bằng **LLM cục bộ** (llama.cpp) chạy trong offscreen document.
Tổng quan tính năng và cách chạy: xem [`../README.md`](../README.md).

## Lệnh

```bash
npm install --legacy-peer-deps
npm run dev        # HMR
npm run build      # tsc --noEmit + vite build → dist/
npm run typecheck
npm run lint
npm test
```

Load unpacked từ `dist/`.

## Bản đồ file

| Đường dẫn | Trách nhiệm |
|---|---|
| `src/shared/contracts.ts` | Zod schema + type cho `Profile`, `Event`, `NormalizedDocument` (nguồn duy nhất) |
| `src/shared/messages.ts` | Hợp đồng message giữa các context |
| `src/shared/constants.ts` | Nhãn tiếng Việt, giới hạn kích thước, key storage |
| `src/core/dates.ts` | Parse/format ngày giờ, tách–ghép ô ngày/giờ, nhãn tương đối, thời lượng |
| `src/core/events.ts` | Tạo/cập nhật sự kiện, state machine, lọc/sắp xếp, lọc theo hồ sơ và nhãn tuỳ chỉnh |
| `src/core/profiles.ts` | Tạo/cập nhật/tìm hồ sơ |
| `src/core/forms.ts` | Validate form bằng Zod, map lỗi về từng trường |
| `src/core/text.ts` | Chuẩn hoá, hash, tách tóm tắt/danh sách/nhãn tuỳ chỉnh |
| `src/core/extraction/*` | Chunk, prompt, schema, normalize, dedup, profile-match, pipeline (thuần, test bằng Node) |
| `src/core/ports/inference.ts` | Interface `InferenceProvider` |
| `src/platform/inference/llama-cpp.ts` | Provider gọi `llama-server` cục bộ (health, models, timeout, abort) |
| `src/platform/offscreen/*` | Offscreen document chạy job trích xuất, lưu nháp, gửi tiến trình |
| `src/platform/background/jobs.ts` | Trạng thái job trong `chrome.storage.session`, validate bằng Zod |
| `src/platform/capture/page-snapshot.ts` | Hàm tự chứa inject vào tab: chọn landmark, lọc menu/khung ẩn, cờ trang động/cắt bớt |
| `src/platform/capture/tab.ts` | `executeScript` chạy page snapshot (HTML đã lọc + vùng chọn) |
| `src/platform/capture/parse.ts` | Readability + fallback DOM thô + dán tay |
| `src/platform/storage/db.ts` | Wrapper IndexedDB, validate khi đọc/ghi, export/import |
| `src/platform/background/index.ts` | Service worker: cấu hình side panel + menu chuột phải vùng chọn/cấp trang |
| `src/ui/sidepanel.*` | UI chính 5 tab (Tổng quan · Quét nội dung · Sự kiện · Hồ sơ · Cài đặt), event delegation |
| `src/ui/actions/*` | Nghiệp vụ UI: capture, CRUD, filter, export/import |
| `src/ui/views/*` | View functions trả về HTML (không framework); `capture.ts` cho tab quét nội dung |
| `src/ui/popup.*` | Popup: quét nhanh + mở side panel |
| `tests/` | Vitest: core + parse + page snapshot + smoke UI (jsdom + fake-indexeddb) |

## Quy ước

- `core/**` **không** import `chrome.*`, `platform/**`, `ui/**` (ESLint chặn).
- Mọi dữ liệu vào `innerHTML` phải qua `escapeHtml` (`src/ui/components.ts`).
- Không thêm host permission ngoài `http://127.0.0.1:8080/*`; không gọi mạng ra ngoài máy, không remote code.
- Kết quả trích xuất luôn lưu ở `status = 'nhap'`; người dùng duyệt mới chuyển trạng thái.
- File ~300 dòng, một trách nhiệm (`max-lines` cảnh báo ở 320).
