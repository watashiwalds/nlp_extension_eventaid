# Trích xuất & quản lý lịch trình cá nhân — Demo

Chrome Extension **Manifest V3** đọc nội dung trang web, quản lý **hồ sơ** và tạo **sự kiện lịch trình**
thủ công hoặc bằng **LLM**. Mặc định toàn bộ dữ liệu và suy luận nằm trên máy (`llama.cpp` tại
`127.0.0.1:8080`); người dùng có thể chủ động chọn một endpoint **OpenAI-compatible** khác.

> **Đã triển khai (2026-10-26):** chọn nơi chạy suy luận — **Máy này** (mặc định), một endpoint
> **OpenAI-compatible** (ví dụ Gemini), hoặc **máy trạm ở nhà qua Cloudflared** — theo `script.md`
> KS-14 và [`docs/ke-hoach-da-provider.md`](docs/ke-hoach-da-provider.md). Remote chỉ chạy sau khi
> người dùng chọn endpoint, cấp quyền host và đồng ý theo origin. **Chưa chạy checklist thủ công**
> với Gemini/Cloudflared thật; xem [`docs/kiem-thu-demo.md`](docs/kiem-thu-demo.md) §8.
>
> Cùng ngày, dự án chốt thêm **bước sàng lọc nội dung bằng PhoBERT** (dịch vụ Python cục bộ tại
> `127.0.0.1:8000`, dùng model bàn giao trong `ml_hasevent_filter/`) chạy **trước** LLM để bỏ qua
> tài liệu không liên quan. Đây là **Slice F, chưa triển khai**; xem
> [`docs/ke-hoach-bo-loc-noi-dung.md`](docs/ke-hoach-bo-loc-noi-dung.md).

Repo này chứa cả bộ tài liệu kế hoạch (gốc) và mã nguồn demo (`extension/`).

---

## 1. Demo làm được gì

| # | Tính năng | Cách hoạt động |
|---|---|---|
| 1 | **Đọc nội dung trang web** | Bấm nút → `activeTab` + `scripting.executeScript` chụp **nội dung chính** (lọc `main`/landmark, bỏ menu/khung ẩn — hỗ trợ best-effort trang động như Gmail) → **Mozilla Readability**; thất bại thì rơi về **toàn trang**; có thể chủ động **Dùng nội dung thô**; nếu có vùng bôi đen thì ưu tiên vùng bôi đen (kể cả qua menu chuột phải **Quét sự kiện từ vùng chọn**); menu chuột phải cấp trang **Quét nội dung trên trang** |
| 2 | **Hiển thị nội dung đọc được** | Tab riêng **Quét nội dung**: tiêu đề, nguồn, phương thức đọc, số ký tự, cờ cắt bớt, toàn văn (thu gọn/mở rộng), chọn nguồn gần đây, dán văn bản |
| 3 | **Quản lý hồ sơ** | Tạo/sửa/xoá hồ sơ: tên, chức vị, đơn vị, email, biệt danh, từ khoá, ghi chú |
| 4 | **Tạo sự kiện thủ công** | Đủ 7 trường trong `base_idea.md` + **nhãn tuỳ chỉnh** (`tags`, tối đa 5), trạng thái `nhap → dang_theo_doi → hoan_thanh/huy`, gắn hồ sơ + nguồn trích, cờ “cần kiểm tra” khi thiếu dữ liệu; tóm tắt nhập tay tối đa 50 ý (LLM trả 1–5); ô ngày và giờ tách riêng để không tràn khi panel hẹp |
| 5 | **Quản lý dữ liệu** | Lọc/tìm sự kiện (trạng thái, nhãn, **nhãn tuỳ chỉnh**, từ khoá), ưu tiên sự kiện sắp diễn ra, kế hoạch theo từng hồ sơ ở tab Tổng quan, xuất–nhập JSON, xoá toàn bộ dữ liệu |
| 6 | **Trích sự kiện bằng LLM** | Mặc định gọi `llama-server` tại `127.0.0.1:8080`; có thể chọn **Endpoint khác** (OpenAI-compatible: Gemini, máy trạm Cloudflared) sau khi cấp quyền host + đồng ý theo origin. Job chạy trong **offscreen document** nên đóng side panel vẫn tiếp tục; lưu nháp (`nhap`), hiện tiến trình, huỷ được, có **thông báo khi xong** và mở đúng tab Sự kiện lọc Nháp |
| 7 | **Duyệt nháp + chống trùng** | Chế độ **Duyệt nháp**: badge **Máy đề xuất**, mức tin cậy (Thấp/Vừa/Cao, không hiện %), nguồn/trích dẫn đầy đủ; chọn nhiều nháp để **Duyệt đã chọn** (`nhap → dang_theo_doi`) hoặc **Xoá nháp đã chọn** có xác nhận; cảnh báo khi thiếu giờ/ngày; gợi ý **Có thể trùng** cho paraphrase, không tự gộp |
| 8 | **Chọn nơi chạy suy luận** | **Máy này** mặc định; **Endpoint khác** nhập base URL HTTPS + API key + model; **Kiểm tra kết nối** trước khi lưu; consent theo origin + thu hồi; **Xoá key**; quay về local vẫn giữ cấu hình remote để đổi lại |

**Chưa có (đúng phạm vi demo hiện tại):** nhắc việc sự kiện (`chrome.alarms`/KS-10), Gmail/PDF/DOCX,
**sàng lọc nội dung PhoBERT (Slice F)**. Gộp nguồn tự động và sửa nhanh tại chỗ chưa làm — xem [`docs/DEVIATIONS.md`](docs/DEVIATIONS.md). Checklist thủ công cho provider (§8) vẫn chờ chạy với endpoint thật.
Chi tiết lệch so với kế hoạch: [`docs/DEVIATIONS.md`](docs/DEVIATIONS.md).
Bảng đối chiếu đầy đủ chức năng chính thức vs. demo: [`docs/chuc-nang-demo-vs-chinh-thuc.md`](docs/chuc-nang-demo-vs-chinh-thuc.md).

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
3. Bấm icon extension → **Quét trang đang mở** (side panel tự mở, đọc trang và chuyển sang tab **Quét nội dung**), hoặc mở side panel rồi bấm nút quét ở góc phải.
   Có thể bôi đen một đoạn trên trang → chuột phải → **Quét sự kiện từ vùng chọn**, hoặc chuột phải vùng trống → **Quét nội dung trên trang**.
4. Tạo **hồ sơ**, sau đó tạo **sự kiện** từ nội dung vừa đọc (hoặc nhập tay hoàn toàn).
5. Muốn trích bằng LLM: chạy `llama-server` tại `127.0.0.1:8080`, mở **Cài đặt** → **Nơi chạy suy luận** → kiểm tra
   kết nối → quay lại tab **Quét nội dung** và bấm **Trích sự kiện**. Có thể đóng side panel;
   job vẫn chạy và sẽ có thông báo khi xong. Kết quả được lưu ở trạng thái **Nháp**.
   Muốn dùng Gemini/dịch vụ OpenAI-compatible/máy trạm Cloudflared: chọn **Endpoint khác**, nhập base
   URL HTTPS + API key + model, cấp quyền host và đồng ý gửi dữ liệu cho đúng origin.
   Bước **sàng lọc PhoBERT** (Slice F) **chưa có**, nên hiện không cần chạy dịch vụ thứ hai;
   job gọi thẳng provider đã chọn. Khi làm Slice F, lệnh chạy dịch vụ sàng lọc nằm trong
   [`extension/README.md`](extension/README.md).

> `dist/` không được commit. Mỗi lần đổi code: `npm run build` rồi bấm **Reload** ở `chrome://extensions`.

### Scripts

| Lệnh | Việc |
|---|---|
| `npm run dev` | Vite dev server + CRXJS HMR |
| `npm run build` | `tsc --noEmit` + `vite build` → `dist/` |
| `npm run typecheck` | TypeScript strict, 0 lỗi |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Vitest: 354 test / 36 file (core, parse, page snapshot, extraction/LLM, provider remote/factory/permissions, form Cài đặt, duyệt nháp, job, Slice E eval, smoke test UI bằng jsdom); 17 test live skip nếu không có `LLAMA_EVAL=1` |
| `npm run icons` | Sinh lại icon PNG |

---

## 3. Cấu trúc repo

```
.
├─ base_idea.md                  # Yêu cầu gốc (7 trường sự kiện)
├─ proposed_technical.md         # Kiến trúc kỹ thuật
├─ script.md                     # Kịch bản sử dụng KS-01…KS-14
├─ ke_hoach_phat_trien.md        # Kế hoạch 7 sprint + S7 hậu demo
├─ ke_hoach_thiet_ke_frontend.md # Kế hoạch thiết kế UI
├─ AGENTS.md                     # Hướng dẫn cho agent/contributor
├─ docs/
│  ├─ DEVIATIONS.md              # Demo khác kế hoạch ở đâu và vì sao
│  ├─ chuc-nang-demo-vs-chinh-thuc.md # Đối chiếu chức năng kế hoạch vs demo
│  ├─ kiem-thu-demo.md           # Checklist kiểm thử thủ công theo KS
│  ├─ ke-hoach-llm-trich-xuat.md # Kế hoạch lớp trích xuất LLM (Slice A–E)
│  ├─ ke-hoach-da-provider.md    # Kế hoạch + ghi chú triển khai chọn nơi chạy suy luận (KS-14)
│  ├─ ke-hoach-bo-loc-noi-dung.md # Kế hoạch sàng lọc PhoBERT trước LLM (Slice F, chưa triển khai)
│  ├─ ban-giao-slice-d.md        # Bàn giao & phạm vi Slice D (đã nghiệm thu)
│  ├─ kiem-tra-slice-d.md        # Bản ghi nghiệm thu Slice D
│  ├─ ban-giao-slice-e.md        # Bàn giao & phạm vi Slice E (đo chất lượng)
│  ├─ ket-qua-danh-gia-slice-e.md # Mẫu bảng đo chất lượng trích xuất
│  └─ archive/                   # Biên bản/kế hoạch lịch sử, không dùng làm nguồn hiện hành
├─ extension/                    # Mã nguồn demo
│  ├─ src/shared/                # contracts.ts (Zod), messages.ts, constants.ts
│  ├─ src/core/                  # Thuần TS: dates, events, profiles, forms, text
│  ├─ src/platform/              # Adapter Chrome: background, capture (page snapshot + parse), storage
│  ├─ src/ui/                    # Side panel + popup (HTML/CSS/TS view functions)
│  ├─ tests/                     # Vitest (core + smoke UI)
│  └─ scripts/                   # Sinh icon
├─ ml_hasevent_filter/           # Model PhoBERT + dịch vụ FastAPI bàn giao (không sửa)
└─ .github/workflows/ci.yml      # typecheck + lint + test + build
```

**Phân lớp:** `core/` không được import `chrome.*`, `platform/`, `ui/` (ESLint `no-restricted-imports` + `no-restricted-globals`).
`shared/contracts.ts` là nguồn hợp đồng duy nhất; mọi bản ghi đọc từ IndexedDB đều được validate bằng Zod.

---

## 4. Quyền & quyền riêng tư

- Permissions: `activeTab`, `scripting`, `storage`, `offscreen`, `notifications`, `sidePanel`, `contextMenus`.
- Host permission tĩnh duy nhất: `http://127.0.0.1:8080/*` cho `llama-server` cục bộ. Endpoint remote dùng
  `optional_host_permissions` (`https://*/*`, `http://localhost:8080/*`, `http://[::1]:8080/*`) và xin
  quyền lúc chạy cho **đúng origin** người dùng nhập.
- **Remote là opt-in:** endpoint ngoài phải dùng HTTPS (chỉ localhost được HTTP); chỉ chạy sau khi
  người dùng chọn + đồng ý một lần cho mỗi origin; có nút thu hồi; API key lưu cục bộ, không xuất
  JSON/log. Xem [`docs/ke-hoach-da-provider.md`](docs/ke-hoach-da-provider.md).
- **Slice F (chưa có trong code):** thêm host tĩnh `http://127.0.0.1:8000/*` và
  `http://localhost:8000/*` cho dịch vụ sàng lọc PhoBERT cục bộ. Đây vẫn là loopback, **không phải**
  backend từ xa.
- Chỉ đọc khi người dùng bấm hoặc chọn menu chuột phải; Readability chạy trong side panel, không inject thư viện vào trang.
- CSP giữ `script-src 'self'`; `connect-src` gồm `http://127.0.0.1:8080`, `http://localhost:8080`,
  `http://[::1]:8080` và `https://*` cho endpoint người dùng chọn; không remote code, không WASM.
  Khi làm Slice F, `connect-src` mở thêm `http://127.0.0.1:8000` + `http://localhost:8000` cho dịch vụ sàng lọc (loopback).
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

1. **Slice E đã đo ngày 2026-10-24:** chốt **9B IQ4_XS**; 4B Q5_K_S bị loại vì recall
   dưới 80%. Xem [`docs/ket-qua-danh-gia-slice-e.md`](docs/ket-qua-danh-gia-slice-e.md).
2. **Chọn nơi chạy suy luận** (KS-14): **đã triển khai F1–F5** — localhost mặc định + endpoint
   OpenAI-compatible (Gemini, máy trạm Cloudflared), consent theo origin, key cục bộ. Việc còn lại
   là chạy checklist thủ công với endpoint thật. Xem
   [`docs/ke-hoach-da-provider.md`](docs/ke-hoach-da-provider.md) §8 và
   [`docs/kiem-thu-demo.md`](docs/kiem-thu-demo.md) §8.
3. **Sàng lọc nội dung bằng PhoBERT** (Slice F — chưa triển khai): dịch vụ Python cục bộ tại
   `127.0.0.1:8000` quyết định tài liệu có nội dung sự kiện hay không **trước khi gọi LLM**; tài
   liệu không liên quan không tốn 20–34 s gọi model. Không cắt câu gửi LLM; lọc vùng chọn bị bỏ qua.
   Xem [`docs/ke-hoach-bo-loc-noi-dung.md`](docs/ke-hoach-bo-loc-noi-dung.md).
4. **Nhắc việc sự kiện** bằng `chrome.alarms` + `notifications` (KS-10, tối đa 2 nút).
5. Gmail read-only + PDF/DOCX ở sprint cuối.

Xem lộ trình đầy đủ trong [`ke_hoach_phat_trien.md`](ke_hoach_phat_trien.md) §9.
Kế hoạch lớp trích xuất bằng LLM cục bộ: [`docs/ke-hoach-llm-trich-xuat.md`](docs/ke-hoach-llm-trich-xuat.md).
Bản ghi Slice D: [`docs/kiem-tra-slice-d.md`](docs/kiem-tra-slice-d.md); bàn giao gốc: [`docs/ban-giao-slice-d.md`](docs/ban-giao-slice-d.md).
Bàn giao Slice E: [`docs/ban-giao-slice-e.md`](docs/ban-giao-slice-e.md); kết quả đo: [`docs/ket-qua-danh-gia-slice-e.md`](docs/ket-qua-danh-gia-slice-e.md).
Tài liệu lịch sử (đã lưu trữ): [`docs/archive/`](docs/archive/README.md).
