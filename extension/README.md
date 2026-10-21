# extension — mã nguồn demo

Chrome Extension MV3, TypeScript + Vite (CRXJS), **không UI framework**, **không mô hình học máy**.
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
| `src/core/dates.ts` | Parse/format ngày giờ, nhãn tương đối, thời lượng |
| `src/core/events.ts` | Tạo/cập nhật sự kiện, state machine, lọc/sắp xếp |
| `src/core/profiles.ts` | Tạo/cập nhật/tìm hồ sơ |
| `src/core/forms.ts` | Validate form bằng Zod, map lỗi về từng trường |
| `src/core/text.ts` | Chuẩn hoá, hash, tách tóm tắt/danh sách |
| `src/platform/capture/tab.ts` | `executeScript` đọc HTML/vùng chọn của tab |
| `src/platform/capture/parse.ts` | Readability + fallback DOM thô + dán tay |
| `src/platform/storage/db.ts` | Wrapper IndexedDB, validate khi đọc/ghi, export/import |
| `src/platform/background/index.ts` | Service worker: cấu hình side panel |
| `src/ui/sidepanel.*` | UI chính 3 tab + Cài đặt, event delegation |
| `src/ui/actions/*` | Nghiệp vụ UI: capture, CRUD, filter, export/import |
| `src/ui/views/*` | View functions trả về HTML (không framework) |
| `src/ui/popup.*` | Popup: quét nhanh + mở side panel |
| `tests/` | Vitest: core + smoke UI (jsdom + fake-indexeddb) |

## Quy ước

- `core/**` **không** import `chrome.*`, `platform/**`, `ui/**` (ESLint chặn).
- Mọi dữ liệu vào `innerHTML` phải qua `escapeHtml` (`src/ui/components.ts`).
- Không thêm host permission, không gọi mạng, không remote code.
- File ~300 dòng, một trách nhiệm (`max-lines` cảnh báo ở 320).
