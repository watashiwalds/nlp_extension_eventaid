# Trích xuất & quản lý lịch trình cá nhân — Demo

Chrome Extension **Manifest V3** đọc nội dung trang web, quản lý **hồ sơ** và cho phép tạo **sự kiện lịch trình thủ công**.
Bản demo **chưa dùng mô hình học máy/học sâu** — toàn bộ dữ liệu nằm trong trình duyệt.

Repo này chứa cả bộ tài liệu kế hoạch (gốc) và mã nguồn demo (`extension/`).

---

## 1. Demo làm được gì

| # | Tính năng | Cách hoạt động |
|---|---|---|
| 1 | **Đọc nội dung trang web** | Bấm nút → `activeTab` + `scripting.executeScript` lấy HTML → **Mozilla Readability**; thất bại thì rơi về **DOM thô**; nếu có vùng bôi đen thì ưu tiên vùng bôi đen |
| 2 | **Hiển thị nội dung đọc được** | Tiêu đề, nguồn, phương thức đọc, số ký tự, cờ cắt bớt, toàn văn (thu gọn/mở rộng), chọn nguồn gần đây |
| 3 | **Quản lý hồ sơ** | Tạo/sửa/xoá hồ sơ: tên, chức vị, đơn vị, email, biệt danh, từ khoá, ghi chú |
| 4 | **Tạo sự kiện thủ công** | Đủ 7 trường trong `base_idea.md`, trạng thái `nhap → dang_theo_doi → hoan_thanh/huy`, gắn hồ sơ + nguồn trích, cờ “cần kiểm tra” khi thiếu dữ liệu |
| 5 | **Quản lý dữ liệu** | Lọc/tìm sự kiện, xuất–nhập JSON, xoá toàn bộ dữ liệu |

**Chưa có (đúng phạm vi demo):** classifier, LLM cục bộ, nhắc việc (`alarms`/`notifications`), Gmail/PDF/DOCX, tự động so khớp hồ sơ, tự động trích xuất sự kiện.
Chi tiết lệch so với kế hoạch: [`docs/DEVIATIONS.md`](docs/DEVIATIONS.md).

---

## 2. Chạy thử

Yêu cầu: **Node.js ≥ 20** (đã kiểm với Node 22), **Chrome ≥ 120**.

```bash
cd extension
npm install --legacy-peer-deps   # npm 9 cần cờ này với peer deps hiện tại
npm run build
```

1. Mở `chrome://extensions` → bật **Developer mode** → **Load unpacked** → chọn `extension/dist`.
2. Mở một trang web bất kỳ (bài báo, thông báo lịch, email dạng web).
3. Bấm icon extension → **Quét trang đang mở** (side panel tự mở và đọc trang), hoặc mở side panel rồi bấm nút quét ở góc phải.
4. Tạo **hồ sơ**, sau đó tạo **sự kiện** từ nội dung vừa đọc (hoặc nhập tay hoàn toàn).

> `dist/` không được commit. Mỗi lần đổi code: `npm run build` rồi bấm **Reload** ở `chrome://extensions`.

### Scripts

| Lệnh | Việc |
|---|---|
| `npm run dev` | Vite dev server + CRXJS HMR |
| `npm run build` | `tsc --noEmit` + `vite build` → `dist/` |
| `npm run typecheck` | TypeScript strict, 0 lỗi |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Vitest: 34 test (core + smoke test UI bằng jsdom) |
| `npm run icons` | Sinh lại icon PNG |

---

## 3. Cấu trúc repo

```
.
├─ base_idea.md                  # Yêu cầu gốc (7 trường sự kiện)
├─ proposed_technical.md         # Kiến trúc kỹ thuật
├─ script.md                     # Kịch bản sử dụng KS-01…KS-13
├─ ke_hoach_phat_trien.md        # Kế hoạch 7 sprint
├─ ke_hoach_thiet_ke_frontend.md # Kế hoạch thiết kế UI
├─ AGENTS.md                     # Hướng dẫn cho agent/contributor
├─ docs/
│  ├─ DEVIATIONS.md              # Demo khác kế hoạch ở đâu và vì sao
│  └─ kiem-thu-demo.md           # Checklist kiểm thử thủ công theo KS
├─ extension/                    # Mã nguồn demo
│  ├─ src/shared/                # contracts.ts (Zod), messages.ts, constants.ts
│  ├─ src/core/                  # Thuần TS: dates, events, profiles, forms, text
│  ├─ src/platform/              # Adapter Chrome: background, capture, storage
│  ├─ src/ui/                    # Side panel + popup (HTML/CSS/TS view functions)
│  ├─ tests/                     # Vitest (core + smoke UI)
│  └─ scripts/                   # Sinh icon
└─ .github/workflows/ci.yml      # typecheck + lint + test + build
```

**Phân lớp:** `core/` không được import `chrome.*`, `platform/`, `ui/` (ESLint `no-restricted-imports` + `no-restricted-globals`).
`shared/contracts.ts` là nguồn hợp đồng duy nhất; mọi bản ghi đọc từ IndexedDB đều được validate bằng Zod.

---

## 4. Quyền & quyền riêng tư

- Permissions: `activeTab`, `scripting`, `storage`, `sidePanel`. **Không** có host permission, **không** gọi mạng.
- Chỉ đọc khi người dùng bấm; Readability chạy trong side panel, không inject thư viện vào trang.
- CSP giữ `script-src 'self'`, không remote code, không WASM.
- Toàn bộ nội dung động được escape trước khi chèn vào `innerHTML`.

---

## 5. Kiểm thử

```bash
cd extension
npm run typecheck && npm run lint && npm test && npm run build
```

Checklist thủ công (theo kịch bản KS): [`docs/kiem-thu-demo.md`](docs/kiem-thu-demo.md).

---

## 6. Bước tiếp theo

1. Bổ sung **classifier từ khoá** (không cần train) để gợi ý “trang có sự kiện”.
2. Tích hợp **LLM cục bộ** (llama.cpp) + `InferenceProvider` + offscreen document.
3. **Nhắc việc** bằng `chrome.alarms` + `notifications` (2 nút).
4. Gmail read-only + PDF/DOCX ở sprint cuối.

Xem lộ trình đầy đủ trong [`ke_hoach_phat_trien.md`](ke_hoach_phat_trien.md) §9.
