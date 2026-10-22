# Kế hoạch hai phiên tiếp theo

> Cập nhật **2026-10-22** sau khi người dùng rà soát thủ công toàn bộ checklist và bổ sung
> mục **Vấn đề tồn đọng** / **Gợi ý cải thiện** trong [`docs/kiem-thu-demo.md`](./kiem-thu-demo.md).
>
> Kế hoạch VĐ-01…VĐ-08 của phiên trước đã hoàn tất; tóm tắt ở **Phụ lục A**.
> Tài liệu này thay thế kế hoạch cũ và chia việc còn lại thành **2 phiên độc lập**.

---

## 0. Mốc hiện tại

| Hạng mục | Trạng thái |
|---|---|
| Nhánh / commit | `main` · `cbc316f` — *docs: thêm bảng đối chiếu chức năng demo vs kế hoạch* |
| Demo | `extension/` load unpacked từ `extension/dist` |
| Quality gate | `typecheck`, `lint`, `test`, `build` đều xanh tại `b307b0b` (40 test) |
| Kiểm thử thủ công | Người dùng **đã rà soát toàn bộ checklist**; các mục còn `[ ]` là chưa đạt hoặc chưa xác nhận lại |
| Phạm vi | Không ML/LLM, không nhắc việc, không Gmail API — xem [`DEVIATIONS.md`](./DEVIATIONS.md) |

**Hai tồn đọng mới**

| ID | Nội dung | Ưu tiên | Phiên |
|---|---|---|---|
| VĐ-09 | Trang động (Gmail) vượt ngưỡng giới hạn của chức năng quét + raw DOM | **P0** | 2 |
| VĐ-10 | Giao diện chọn ngày/giờ chi tiết vẫn tràn khi UI hẹp | **P0** | 1 |

**Sáu gợi ý cải thiện**

| ID | Nội dung | Ưu tiên | Phiên |
|---|---|---|---|
| YC-01 | Ưu tiên hiển thị sự kiện gần nhất chưa diễn ra thay vì xếp toàn bộ theo thời gian tuyệt đối | P1 | 1 |
| YC-02 | Context menu **“Quét nội dung trên trang”** khi chuột phải | P1 | 1 |
| YC-03 | Cho phép người dùng tạo nhãn tuỳ chỉnh | P1 | 2 |
| YC-04 | Tab **Tổng quan** hiển thị kế hoạch của từng hồ sơ theo dạng tab | P1 | 1 |
| YC-05 | UI **“Quét nội dung”** nằm trong tab riêng | P1 | 1 |
| YC-06 | Bỏ chuỗi hệ thống (“demo”, “IndexedDB”…) khỏi UI thường; thêm **“Về phiên bản này”** trong Cài đặt | P2 | 1 |

---

## 1. Nguyên tắc chia phiên

- **Phiên 1 — Điều hướng & trải nghiệm:** chỉ UI/UX, sắp xếp và sửa lỗi hiển thị.
  **Không đổi schema dữ liệu**, không thêm permission, không đụng pipeline capture.
- **Phiên 2 — Dữ liệu & trang động:** thay đổi hợp đồng `Event` (nhãn tuỳ chỉnh) và
  cải thiện capture cho trang SPA. Đây là phần rủi ro cao hơn, cần test kỹ và có thể
  phải ghi nhận giới hạn thay vì “sửa xong hoàn toàn”.
- **P0 trước P1/P2.** Nếu hết thời gian, cắt từ cuối danh sách; không bỏ P0.
- Mỗi phiên kết thúc bằng: quality gate xanh → cập nhật checklist → commit sạch.
  **Không bắt đầu phiên 2 khi phiên 1 chưa commit** (tránh trộn thay đổi UI và schema).

---

## 2. Phiên 1 — Điều hướng & trải nghiệm

**Mục tiêu:** sửa lỗi tràn ngày/giờ, tách khu vực quét nội dung, thêm menu chuột phải
cho trang, tab hồ sơ ở Tổng quan, thứ tự sự kiện hợp lý và dọn chuỗi hệ thống.

**Không làm trong phiên 1:** nhãn tuỳ chỉnh (schema), Gmail/trang động, thay đổi
`NormalizedDocument`/`Event` ngoài các trường UI.

### Kết quả phiên 1 (2026-10-22)

| Bước | Task | Trạng thái | Ghi chú |
|---|---|---|---|
| 1 | S1-01 — tách ô ngày/giờ | ✅ | `splitDateTimeLocal`/`joinDateTimeLocal` + `.datetime-row`; `EventDraft` giữ 4 chuỗi ngày/giờ thay vì `start`/`end` để không mất dữ liệu khi validate lỗi |
| 2 | S1-02 — tab Quét nội dung | ✅ | `ui/views/capture.ts`; quét thành công tự chuyển tab; form dán chỉ mở trong tab này |
| 3 | S1-03 — menu chuột phải cấp trang | ✅ | `PAGE_MENU_ID`; quét bỏ qua vùng bôi đen còn sót (`ignoreSelection`) |
| 4 | S1-04 — tab hồ sơ ở Tổng quan | ✅ | `overviewProfileId` + `eventsForProfile`; thống kê vẫn toàn cục |
| 5 | S1-05 — ưu tiên sự kiện sắp diễn ra | ✅ | `sortEvents(events, now)` chia 3 nhóm |
| 6 | S1-06 — dọn chuỗi hệ thống | ✅ | Header “Cá nhân”; “Về phiên bản này” dạng `<details>`; badge **Nội dung chính / Toàn trang (dự phòng)** |
| 7 | Quality gate | ✅ | `typecheck`, `lint`, `test` (47 test), `build` đều xanh |
| 8 | Nghiệm thu thủ công | ✅ | KT-05…KT-10 đã xác nhận trên Chrome (commit `70566e8`) |
| 9 | Sửa vấn đề phát sinh | ✅ | Thanh tab ghim nút Cài đặt; nút không bẻ chữ; hover chip hồ sơ đúng màu |

**Trạng thái:** Phiên 1 đã đóng. Có thể bắt đầu **Phiên 2** (nhãn tuỳ chỉnh & trang động).

### Thứ tự thực hiện & commit

| Bước | Task | Commit gợi ý |
|---|---|---|
| 1 | S1-01 — VĐ-10: hết tràn ngày/giờ | `fix(ui): tách ô ngày và giờ trong form sự kiện` |
| 2 | S1-02 — YC-05: tab Quét nội dung | `feat(ui): tách tab quét nội dung` |
| 3 | S1-03 — YC-02: context menu quét trang | `feat(context-menu): quét nội dung trang đang mở` |
| 4 | S1-04 — YC-04: tab hồ sơ ở Tổng quan | `feat(overview): kế hoạch theo hồ sơ` |
| 5 | S1-05 — YC-01: ưu tiên sự kiện sắp diễn ra | `feat(events): ưu tiên sự kiện sắp diễn ra` |
| 6 | S1-06 — YC-06: dọn chuỗi hệ thống | `fix(ui): dọn chuỗi hệ thống, thêm về phiên bản` |
| 7 | Quality gate + checklist + docs | `docs: cập nhật kiểm thử sau phiên 1` |

---

### S1-01 — VĐ-10: Hết tràn ô chọn ngày/giờ (P0)

**Hiện trạng:** form dùng `<input type="datetime-local">` trong `.grid-2`. CSS trước chỉ
xử lý grid (`minmax(0, 1fr)`) và stack ở `≤ 420px`, nhưng control native vẫn có
min-content width / popup lịch rộng, gây tràn khi side panel hẹp.

**Hướng làm:**

1. Tái hiện ở **320 / 360 / 400px**, ghi lại `scrollWidth` vs `clientWidth` và xác định
   tràn do ô input hay do popup lịch của Chrome.
2. Tách mỗi mốc thành cặp ô **ngày** + **giờ**:
   ```html
   <div class="datetime-row">
     <input class="input" type="date" name="startDate" ...>
     <input class="input" type="time" name="startTime" ...>
   </div>
   ```
   Làm tương tự cho `endDate` / `endTime`.
3. Thêm helper thuần trong `extension/src/core/dates.ts`:
   - `splitDateTimeLocal(value)` → `{ date, time }`
   - `joinDateTimeLocal(date, time)` → `YYYY-MM-DDTHH:mm` hoặc lỗi
   - Test round-trip, giá trị rỗng, chuỗi không hợp lệ.
4. Giữ `EventDraft.start/end` là chuỗi ISO local; view tách khi render, actions ghép khi submit.
5. CSS `.datetime-row` dùng `grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr)`,
   `gap: 8px`, `min-width: 0`; stack 1 cột dưới `340px`.
6. **Cửa quyết định:** nếu popup native vẫn tràn, thay bằng hai ô text
   `placeholder="dd/mm/yyyy"` + `HH:mm`, validate trong `core/dates.ts` (không dùng
   native picker). Chỉ chọn một hướng sau khi đo thực tế, ghi lý do vào commit.

**File:** `ui/views/event-form.ts`, `core/dates.ts`, `ui/actions/events.ts`,
`ui/styles.css`, `tests/core/dates.test.ts`, `tests/ui/smoke.test.ts`.

**Nghiệm thu:**

- [x] Ở 320/360/400px không có thanh cuộn ngang; hai ô ngày/giờ hiển thị trọn.
- [x] Sự kiện cũ có `start`/`end` vẫn load và hiển thị đúng.
- [x] Bỏ trống vẫn lưu được (cờ “chưa xác định”); `end < start` vẫn báo lỗi.
- [x] Bàn phím nhập được cả ngày và giờ; không mất dữ liệu khi validate lỗi.

---

### S1-02 — YC-05: Tab “Quét nội dung” riêng (P1)

**Hiện trạng:** `documentCard()` và form dán nằm trong `overview.ts`; tab Tổng quan vừa
thống kê vừa quét nội dung nên khá nặng.

**Hướng làm:**

1. Thêm `'capture'` vào `Tab` trong `ui/store.ts`.
2. Tạo `ui/views/capture.ts`, chuyển `documentCard`, `captureMeta`, `pasteForm` từ
   `overview.ts` sang; giữ nguyên hành vi `capture-raw`, `open-paste`, `select-document`,
   `delete-document`, `toggle-document`.
3. `ui/render.ts`: tab mới **Quét nội dung** (thứ tự: Tổng quan · Quét nội dung · Sự kiện · Hồ sơ · Cài đặt).
4. `overview.ts`: bỏ card nội dung; thêm CTA nhỏ **“Quét nội dung”** (action `goto-capture`)
   khi chưa có document.
5. Actions:
   - `capture-page` / `capture-raw` thành công → `store.set({ tab: 'capture' })`.
   - `open-paste` → `{ tab: 'capture', pasteOpen: true }`.
   - Thêm `goto-capture` trong `sidepanel.ts`.
6. Nếu capture lỗi, vẫn ở tab hiện tại và hiện toast; không tự chuyển tab.

**File:** `ui/store.ts`, `ui/render.ts`, `ui/views/overview.ts`, `ui/views/capture.ts`,
`ui/actions/documents.ts`, `ui/sidepanel.ts`, `tests/ui/smoke.test.ts`.

**Nghiệm thu:**

- [x] Tab Quét nội dung hiển thị document, nút quét lại, dùng nội dung thô, dán, xoá.
- [x] Quét thành công từ header hoặc popup tự chuyển sang tab Quét nội dung.
- [x] Form dán chỉ mở trong tab Quét nội dung.
- [x] Tổng quan không còn card nội dung dài; không vỡ layout.

---

### S1-03 — YC-02: Context menu “Quét nội dung trên trang” (P1)

**Hiện trạng:** chỉ có menu `contexts: ['selection']`. Cần thêm menu cấp trang để dùng
nhanh mà không phải mở popup.

**Hướng làm:**

1. Thêm hằng `PAGE_MENU_ID = 'scan-page'` trong `shared/constants.ts`.
2. `background/index.ts` đăng ký thêm:
   ```ts
   chrome.contextMenus.create({
     id: PAGE_MENU_ID,
     title: 'Quét nội dung trên trang',
     contexts: ['page'],
   });
   ```
3. Khi click menu trang: ghi `PendingCapture` với `mode: 'page'`, mở side panel như menu
   vùng chọn; dùng chung fallback badge **!** nếu `sidePanel.open()` bị từ chối.
4. `sidepanel.ts` khi `mode === 'page'` gọi `captureCurrentPage({ ignoreSelection: true })`
   để không vô tình lấy vùng bôi đen còn sót.
5. Thêm `ignoreSelection?: boolean` vào `CaptureOptions`; trong `captureCurrentPage`,
   xoá `selection` của payload khi cờ bật.
6. Đổi tiêu đề badge fallback thành câu trung tính: “Mở bảng điều khiển để quét nội dung”.

**File:** `shared/constants.ts`, `platform/background/index.ts`, `shared/messages.ts`,
`ui/actions/documents.ts`, `ui/sidepanel.ts`.

**Nghiệm thu:**

- [x] Chuột phải trên vùng trống → thấy **Quét nội dung trên trang**.
- [x] Panel đóng → bấm menu → panel mở và quét đúng trang, bỏ qua selection cũ.
- [x] Panel đang mở → quét lại, không tạo document trùng.
- [x] Menu vùng chọn vẫn hoạt động như cũ; không thêm permission mới.

---

### S1-04 — YC-04: Tab kế hoạch theo hồ sơ ở Tổng quan (P1)

**Hiện trạng:** Tổng quan có “Sắp diễn ra” và dải avatar hồ sơ, nhưng không xem được
kế hoạch riêng của từng người.

**Hướng làm:**

1. Thêm `overviewProfileId: string | null` vào `AppState` (mặc định `null` = tất cả).
2. Core: `eventsForProfile(events, profileId)` (thuần) lọc theo `relatedProfiles`.
3. UI: đầu tab Tổng quan thêm dải tab:
   - **Tất cả** + từng hồ sơ (tên hoặc avatar + tên, cuộn ngang nếu đông).
   - Nút dùng `data-action="select-overview-profile"` + `data-profile-id`.
4. Khi chọn hồ sơ:
   - “Sắp diễn ra” chỉ hiện sự kiện của hồ sơ đó (tối đa 5, sắp xếp theo S1-05).
   - Thêm dòng mô tả “Kế hoạch của …” và empty state riêng.
   - Thống kê (Nháp/Đang theo dõi/Hoàn thành) **giữ toàn cục** để tránh hiểu nhầm.
5. Nếu hồ sơ bị xoá, reset `overviewProfileId` về `null`.
6. Chưa có hồ sơ → giữ CTA tạo hồ sơ, không render dải tab rỗng.

**File:** `ui/store.ts`, `core/events.ts`, `ui/views/overview.ts`, `ui/sidepanel.ts`,
`tests/core/events.test.ts`, `tests/ui/smoke.test.ts`.

**Nghiệm thu:**

- [x] Có 2 hồ sơ → thấy tab “Tất cả”, tên từng hồ sơ; bấm qua lại đúng.
- [x] Chọn hồ sơ → chỉ hiện sự kiện có `relatedProfiles` chứa id đó.
- [x] Hồ sơ không có sự kiện → empty state + gợi ý tạo sự kiện.
- [x] Xoá hồ sơ đang chọn → tự về “Tất cả”, không crash.

---

### S1-05 — YC-01: Ưu tiên sự kiện sắp diễn ra (P1)

**Hiện trạng:** `sortEvents` xếp tăng dần theo `start`, nên sự kiện cũ (đã qua) nằm trên
sự kiện ngày mai trong tab Sự kiện.

**Hướng làm:**

1. Đổi `sortEvents(events, now = new Date())` thành 3 nhóm:
   - **Sắp diễn ra / đang diễn ra:** `start >= now`, tăng dần.
   - **Đã qua:** `start < now`, giảm dần (gần nhất trước).
   - **Chưa có thời điểm:** cuối, `createdAt` giảm dần.
2. Giữ `filterEvents` gọi `sortEvents`; `upcomingEvents` vẫn lọc tương lai và lấy `limit`.
3. Cân nhắc chia tab Sự kiện thành 3 nhóm có tiêu đề nhỏ (“Sắp diễn ra”, “Đã qua”,
   “Chưa có thời điểm”) — chỉ làm nếu không phá vỡ danh sách hiện tại.
4. Không đổi trạng thái/`isOverdue`; chỉ đổi thứ tự hiển thị.

**File:** `core/events.ts`, `ui/views/events.ts`, `tests/core/events.test.ts`.

**Nghiệm thu:**

- [ ] Sự kiện ngày mai đứng trên sự kiện tháng trước.
- [ ] Trong nhóm đã qua, sự kiện gần nhất đứng trước.
- [ ] Sự kiện chưa có `start` nằm cuối, không bị mất khi lọc.
- [ ] `filterEvents` theo trạng thái/nhãn/từ khoá vẫn giữ thứ tự mới.

---

### S1-06 — YC-06: Dọn chuỗi hệ thống + “Về phiên bản này” (P2)

**Hiện trạng:** UI còn nhiều chữ kỹ thuật: “demo cục bộ”, “Giới hạn của bản demo”,
“IndexedDB”, “Readability”, “classifier/LLM”…

**Hướng làm:**

1. Grep UI (không grep docs) các từ: `demo`, `IndexedDB`, `Readability`, `classifier`,
   `LLM`, `llama.cpp`, `Manifest`, `Zod`, `Vite`. Các vị trí đã biết:
   `ui/render.ts`, `ui/views/events.ts`, `ui/views/overview.ts`, `ui/views/profiles.ts`,
   `ui/views/settings.ts`, `shared/constants.ts` (`METHOD_TEXT`).
2. Đổi ngôn ngữ thường:
   - Header: “Cá nhân · demo cục bộ” → “Cá nhân”.
   - Settings: “Bản demo lưu mọi thứ…” → “Dữ liệu được lưu trên thiết bị này.”
   - Danger zone: “khỏi IndexedDB” → “khỏi trình duyệt”.
   - Danh sách sự kiện: “lưu cục bộ trong IndexedDB” → “lưu trên thiết bị này”.
   - Empty state/overview/profiles bỏ chữ “demo”, giữ hướng dẫn hành động.
   - `METHOD_TEXT.readability` → **“Nội dung chính”**; `raw_dom` → **“Toàn trang (dự phòng)”**.
     Cảnh báo `raw_dom` viết lại cho người dùng cuối, không nhắc Readability/DOM.
3. Giữ một mục **“Về phiên bản này”** trong Cài đặt, dạng `<details>` thu gọn:
   - Phiên bản, môi trường (MV3/TS/Vite), nơi lưu dữ liệu, giới hạn hiện tại
     (chưa có LLM/nhắc việc/Gmail API), chính sách không gửi dữ liệu.
   - Chuyển nội dung “Giới hạn của bản demo” vào đây, viết lại cho người dùng cuối.
4. Giữ các thông tin riêng tư quan trọng ở phần thường: “Chỉ đọc khi bạn bấm”,
   “Không gửi dữ liệu đi đâu”.

**File:** `ui/render.ts`, `ui/views/settings.ts`, `ui/views/overview.ts`,
`ui/views/events.ts`, `ui/views/profiles.ts`, `shared/constants.ts`, `tests/ui/smoke.test.ts`.

**Nghiệm thu:**

- [ ] UI thường không còn “demo”, “IndexedDB”, “Readability”, “classifier/LLM”.
- [ ] Badge phương thức dùng **Nội dung chính / Toàn trang (dự phòng)**; cảnh báo `raw_dom`
      không còn thuật ngữ kỹ thuật.
- [ ] Cài đặt có mục **Về phiên bản này** mở/đóng được, nội dung đủ ý.
- [ ] Cảnh báo riêng tư vẫn hiển thị rõ, không bị chôn trong `<details>`.
- [ ] Test smoke cũ cập nhật theo chuỗi mới.

---

### Definition of Done — Phiên 1

- [x] S1-01…S1-06 hoàn tất (không cắt mục nào).
- [x] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` xanh.
- [x] Kiểm thủ công: 320/360/400px, menu chuột phải cấp trang, tab Quét nội dung,
      tab hồ sơ, thứ tự sự kiện, chuỗi UI.
- [x] `docs/kiem-thu-demo.md` cập nhật kết quả + mục kiểm thử mới.
- [x] `README.md`, `extension/README.md`, `docs/chuc-nang-demo-vs-chinh-thuc.md` đồng bộ.
- [x] Commit sạch trên `main`, không chứa `dist/`/`node_modules/`.

---

## 3. Phiên 2 — Nhãn tuỳ chỉnh & trang động

**Mục tiêu:** cho người dùng tạo nhãn riêng ngoài 5 nhãn cố định, và cải thiện việc đọc
trang động/Gmail ở mức “best-effort” của web UI.

**Không làm trong phiên 2:** Gmail API/OAuth (S5), OCR/PDF/DOCX, nhắc việc, pipeline LLM.
Không hứa “đọc được mọi trang Gmail”; nếu không đọc được, phải có hướng dẫn rõ.

### Thứ tự thực hiện & commit

> Ưu tiên P0: làm **S2-02 (trang động)** trước, rồi **S2-01 (nhãn tags)**. Nếu S2-02 kéo dài,
> vẫn phải ghi kết quả Gmail trung thực trước khi cắt sang tags.

| Bước | Task | Commit gợi ý |
|---|---|---|
| 1 | S2-02a — lọc nội dung chính khi capture (P0) | `feat(capture): lọc nội dung chính cho trang động` |
| 2 | S2-02b — thông báo/giới hạn (P0) | `feat(capture): hướng dẫn khi trang chưa render` |
| 3 | S2-01a — schema + core tags (P1) | `feat(events): thêm nhãn tuỳ chỉnh vào hợp đồng` |
| 4 | S2-01b — form/filter/display (P1) | `feat(ui): nhập, lọc và hiển thị nhãn tuỳ chỉnh` |
| 5 | S2-03 — regression + docs | `docs: cập nhật kiểm thử và đối chiếu sau phiên 2` |

---

### S2-01 — YC-03: Nhãn tuỳ chỉnh (P1)

> Làm **sau S2-02** (VĐ-09 là P0). Nếu S2-02 vượt thời gian, ghi kết quả rồi mới cắt tags.

**Quyết định thiết kế mặc định:** thêm `tags: string[]` vào `Event`, **giữ nguyên**
`label` là 5 nhãn phân loại cố định.

Lý do:

- Không phá vỡ 7 trường trong `base_idea.md`; `label` vẫn là phân loại bắt buộc.
- Không phải đổi enum `Label` → `string`, không làm hỏng dữ liệu/tệp JSON cũ.
- Người dùng vẫn tạo được nhãn riêng (tags) và lọc theo chúng.
- Nếu sau này cần “quản lý nhãn” (màu, thứ tự, xoá hàng loạt), có thể nâng cấp tags
  thành bảng `labels` riêng — ghi thành ADR khi cần.

**Hướng làm:**

1. `shared/contracts.ts`:
   ```ts
   export const MAX_EVENT_TAGS = 5;
   export const EventTagSchema = z.string().trim().min(1).max(24);
   // trong EventSchema:
   tags: z.array(EventTagSchema).max(MAX_EVENT_TAGS).default([]),
   ```
   `.default([])` để bản ghi cũ (chưa có `tags`) vẫn đọc được.
2. `core/text.ts`: `parseTagsInput(value)` tách theo dấu phẩy/chấm phẩy, trim, bỏ rỗng,
   dedupe không phân biệt hoa/thường, giới hạn 5; trả `{ tags, errors }` hoặc ném lỗi
   có thông điệp rõ.
3. `core/events.ts`: thêm `tags?: string[]` vào `EventInput` (mặc định `[]` để không phá
   call-site cũ); `makeEvent`/`updateEvent` chuẩn hoá; `filterEvents` tìm cả trong tags.
4. `core/forms.ts`: `EventFormValues.tags` (chuỗi thô); validate số lượng/độ dài; gán vào input.
5. `ui/store.ts`: `EventDraft.tags`; `EventFilterState.tag: string | 'all'`; reset trong
   `EMPTY_EVENT_DRAFT` và `clearFilter`.
6. `ui/views/event-form.ts`: ô **Nhãn tuỳ chỉnh** (text), placeholder
   “Ví dụ: đồ án, họp nhóm”, hint “Tối đa 5 nhãn, cách nhau bằng dấu phẩy”.
7. `ui/views/events.ts`: hiển thị chips tags ở card + chi tiết; thêm select lọc tag
   (options lấy từ toàn bộ events, sắp xếp alphabet, có “Tất cả”).
8. `ui/actions/events.ts` + `ui/actions/data.ts`: đọc/ghi tags, xử lý filter tag.
9. Xuất/nhập JSON: event cũ không có tags → `[]`; event mới có tags → giữ nguyên.
10. Docs: `script.md` Appendix A, `docs/DEVIATIONS.md`, `README.md`,
    `docs/chuc-nang-demo-vs-chinh-thuc.md`.

**Nghiệm thu:**

- [ ] Tạo sự kiện với 2 nhãn tuỳ chỉnh → lưu, hiện chips ở card/chi tiết.
- [ ] Sửa sự kiện → tags load đúng, sửa/xoá được.
- [ ] Lọc theo tag; tìm kiếm theo tag; “Tất cả” trả lại đầy đủ.
- [ ] Quá 5 tags hoặc tag > 24 ký tự → lỗi rõ, không lưu.
- [ ] Nhập tệp JSON cũ (không có tags) → không lỗi, tags rỗng.
- [ ] Xuất rồi nhập lại → tags khôi phục đúng.

**Test:** `tests/core/text.test.ts` (parse/dedupe/cap), `tests/core/events.test.ts`
(filter/search), `tests/core/forms.test.ts` (validate), `tests/shared/contracts.test.ts`
hoặc test schema trong `tests/platform` (default `[]`), smoke UI.

---

### S2-02 — VĐ-09: Trang động/Gmail (P0)

**Hiện trạng:** `captureTab` gửi `document.documentElement.outerHTML` (tối đa 4M ký tự).
Gmail là SPA lớn: HTML chứa nhiều menu/khung ẩn, dễ vượt ngưỡng hoặc làm Readability
thất bại → fallback `raw_dom` lấy toàn bộ `body.textContent`, đầy nhiễu.

**Phạm vi:** cải thiện **web UI** của trang động. Không dùng Gmail API, không đọc
iframe cross-origin, không xử lý shadow DOM. Nếu Gmail vẫn không đọc được, UI phải
hướng dẫn bôi đen/dán thay vì báo lỗi chung.

**Hướng làm:**

1. Tạo hàm **tự chứa** (self-contained) trong `platform/capture/page-snapshot.ts`,
   dùng làm `func` cho `chrome.scripting.executeScript`:
   - Chọn root theo thứ tự: `main`, `[role="main"]`, `article`, `[role="article"]`, `body`.
   - Clone root; xoá `script, style, noscript, template, svg, canvas, iframe, nav,
     header, footer, aside`, `[role="navigation"|"banner"|"contentinfo"]`,
     `[aria-hidden="true"]`, `[hidden]`.
   - Trả `{ html, title, url, selection, textLength, root, likelyDynamic }`.
   - Nếu root chính quá ngắn (< 200 ký tự) nhưng body có nhiều chữ hơn, dùng body đã lọc.
   - Giới hạn HTML sau lọc (giữ `MAX_HTML_CHARS`, thêm cờ `htmlTruncated`).
2. `captureTab` dùng hàm trên; mở rộng `CapturePayload` trong `shared/messages.ts` với
   `likelyDynamic?: boolean` và `htmlTruncated?: boolean`. Nếu `htmlTruncated`, vẫn parse
   phần còn lại và cảnh báo “Trang quá lớn, đã lấy phần nội dung chính”.
3. `parse.ts`: fallback `raw_dom` dùng HTML đã lọc; không đổi thứ tự ưu tiên selection.
4. `actions/documents.ts`:
   - Nếu `likelyDynamic` hoặc text < ngưỡng → toast/alert hướng dẫn: “Trang có thể chưa
     tải xong. Cuộn đến phần cần đọc, chờ nội dung hiện ra rồi quét lại; hoặc bôi đen
     phần cần lấy.”
   - Nếu vẫn quá lớn → gợi ý bôi đen/dán, không chỉ báo “trang quá lớn”.
5. **Cân nhắc** mở `allFrames: true` và chọn frame có `textLength` lớn nhất nếu Gmail
   đặt nội dung trong iframe; chỉ làm sau khi kiểm tra thực tế, không mặc định.
6. Fixture/test:
   - `tests/fixtures/gmail-like.html`: có `role="main"`, menu `nav`, `aside`, `aria-hidden`,
     nội dung thư dài.
   - `tests/platform/page-snapshot.test.ts` (jsdom): chọn main, xoá nhiễu, fallback body,
     giữ selection, cờ dynamic.
   - `tests/platform/parse.test.ts`: parse fixture đã lọc → text chứa nội dung thư,
     không chứa “Inbox/Compose”.
7. Kiểm thủ công:
   - Gmail: mở một thư → quét trang → kiểm tra nội dung chính.
   - Trang SPA local (dashboard) → quét được hoặc có hướng dẫn đúng.
   - Bài báo thường → không hồi quy.
   - Bôi đen trên Gmail → vẫn ưu tiên selection.

**Nghiệm thu:**

- [ ] Gmail (best-effort): document chứa tiêu đề/nội dung thư, không phải toàn bộ menu;
      nếu không đạt, ghi rõ lý do và luồng bôi đen/dán vẫn hoạt động.
- [ ] Trang bài báo: kết quả Readability không đổi.
- [ ] Trang động chưa render: có thông báo hành động, không crash.
- [ ] Trang quá lớn: không treo; có cảnh báo cắt bớt.
- [ ] Không thêm host permission; CSP không đổi.

**Rủi ro & fallback:**

- Gmail thay đổi DOM thường xuyên → không viết selector riêng cho Gmail; dùng ARIA/landmark.
- Nếu `executeScript` không chờ hàm async, bỏ phần chờ; dựa vào thao tác người dùng.
- Nếu chất lượng vẫn kém, ghi vào `DEVIATIONS.md` là “best-effort”, không cố đạt 100%.

---

### S2-03 — Regression, docs & đối chiếu

1. Chạy lại toàn bộ checklist; các mục mới của phiên 2 là **KT-11…KT-15** trong
   `docs/kiem-thu-demo.md` (tags, JSON cũ, Gmail, SPA/bài báo, giới hạn tag).
2. Cập nhật `docs/chuc-nang-demo-vs-chinh-thuc.md`:
   - Đổi trạng thái các mục mới: tab quét, context menu trang, tab hồ sơ, sắp xếp,
     nhãn tuỳ chỉnh, trang động.
   - Cập nhật số lượng ✅/🟡/❌ và kết luận nhanh.
3. Cập nhật `README.md` (tính năng, quyền), `extension/README.md` (view mới),
   `docs/DEVIATIONS.md` (tags, Gmail best-effort), `script.md` Appendix A (tags).
4. Ghi kết quả Gmail thực tế: **đạt / một phần / không đạt** + lý do, không tô hồng.

---

### Definition of Done — Phiên 2

- [ ] S2-01, S2-02 hoàn tất; S2-03 cập nhật đủ.
- [ ] Quality gate xanh; test mới cho tags + page snapshot.
- [ ] Không có thay đổi schema ngoài `tags` (có default, tương thích ngược).
- [ ] Kết quả Gmail được ghi trung thực; giới hạn được ghi trong `DEVIATIONS.md`.
- [ ] Checklist, README, bảng đối chiếu đồng bộ.
- [ ] Commit sạch trên `main`.

---

## 4. Quality gate chung

Chạy sau **mỗi bước**, không chỉ cuối phiên:

```bash
cd extension
npm run typecheck
npm run lint
npm test
npm run build
```

Sau đó load unpacked `extension/dist`, **Reload** ở `chrome://extensions`, và kiểm thủ công
các mục tương ứng trong [`docs/kiem-thu-demo.md`](./kiem-thu-demo.md).

---

## 5. Quyết định đã chốt / cần xác nhận

Các mặc định dưới đây được chọn để phiên làm việc không bị chặn. Nếu người dùng muốn khác,
sửa mục này **trước khi** bắt đầu phiên tương ứng.

1. **Nhãn tuỳ chỉnh = `tags` trên sự kiện**, không thay enum `label`.
   Muốn “quản lý nhãn” có màu/xoá hàng loạt → cần thiết kế riêng, có thể làm sau.
2. **Gmail = best-effort qua web UI**, không chờ Gmail API. API read-only vẫn ở S5.
3. **Ngày/giờ:** ưu tiên tách `date` + `time` native; chỉ chuyển sang ô text nếu popup
   native vẫn tràn. Ghi lại quyết định sau khi đo ở 320px.
4. **Tab hồ sơ ở Tổng quan** chỉ lọc danh sách “Sắp diễn ra”; số liệu thống kê giữ toàn cục.
5. **“Về phiên bản này”** đặt trong Cài đặt, dạng `<details>` thu gọn; thông tin riêng tư
   quan trọng vẫn hiển thị thường.

---

## 6. Ràng buộc không được vi phạm

- MV3; permission chỉ trong danh sách `AGENTS.md` §4. **Không** thêm host permission,
  không `<all_urls>`.
- Không remote code/CDN, không gọi mạng; CSP `script-src 'self'`.
- `src/core/**` thuần: không `chrome.*`, không `platform/`, không `ui/`.
- `src/shared/contracts.ts` là nguồn hợp đồng duy nhất; đổi schema phải sync
  `script.md` Appendix A + `docs/DEVIATIONS.md`.
- Escape HTML trước `innerHTML`; không UI framework; file ~300 dòng.
- Tài liệu tiếng Việt; giữ ID `KS-xx`; không sửa/xoá `unfinished_script.svg`.
- npm 9: dùng `npm install --legacy-peer-deps`; `dist/` và `node_modules/` không commit.
- Không đọc nền: mọi thao tác capture phải do người dùng bấm/chọn menu.

---

## Phụ lục A — Phiên trước (đã xong)

- VĐ-01…VĐ-08 đã sửa trong commit `b307b0b`; 40 test, quality gate xanh.
- Đã thêm context menu vùng chọn, `forceRaw`, cap tóm tắt 50 ý, sửa CSS/focus.
- Người dùng đã rà soát thủ công; hai tồn đọng mới là VĐ-09/Gmail và VĐ-10/ngày-giờ.
- Bảng đối chiếu chức năng: [`chuc-nang-demo-vs-chinh-thuc.md`](./chuc-nang-demo-vs-chinh-thuc.md)
  (commit `cbc316f`).
- Chi tiết từng VĐ cũ nằm trong lịch sử git của tệp này và trong `docs/kiem-thu-demo.md`.

## Phụ lục B — File sẽ chạm

| Khu vực | File chính |
|---|---|
| Form sự kiện / ngày giờ | `extension/src/ui/views/event-form.ts`, `extension/src/core/dates.ts`, `extension/src/ui/actions/events.ts`, `extension/src/ui/styles.css` |
| Tab & điều hướng | `extension/src/ui/render.ts`, `extension/src/ui/store.ts`, `extension/src/ui/sidepanel.ts`, `extension/src/ui/views/capture.ts` (mới) |
| Context menu | `extension/src/shared/constants.ts`, `extension/src/platform/background/index.ts`, `extension/src/ui/actions/documents.ts` |
| Tổng quan | `extension/src/ui/views/overview.ts`, `extension/src/core/events.ts` |
| Nhãn tuỳ chỉnh | `extension/src/shared/contracts.ts`, `extension/src/core/{text,events,forms}.ts`, `extension/src/ui/views/{event-form,events}.ts`, `extension/src/ui/store.ts` |
| Trang động | `extension/src/platform/capture/{tab,parse,page-snapshot}.ts`, `extension/src/shared/messages.ts`, `extension/tests/platform/*` |
| Docs | `docs/kiem-thu-demo.md`, `docs/DEVIATIONS.md`, `docs/chuc-nang-demo-vs-chinh-thuc.md`, `script.md`, `README.md`, `extension/README.md` |
