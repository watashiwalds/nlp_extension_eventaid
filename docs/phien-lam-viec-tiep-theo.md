# Hướng dẫn phiên làm việc tiếp theo

> Bàn giao sau khi người dùng chạy checklist thủ công và bổ sung mục **VẤN ĐỀ** trong
> [`docs/kiem-thu-demo.md`](./kiem-thu-demo.md).
> Đọc kèm: [`AGENTS.md`](../AGENTS.md), [`docs/DEVIATIONS.md`](./DEVIATIONS.md),
> [`script.md`](../script.md) (Appendix A).

---

## 0. Kết quả phiên triển khai (2026-10-22)

Toàn bộ VĐ-01…VĐ-08 đã được sửa trong mã demo. Trạng thái kiểm tra:

| Hạng mục | Kết quả |
|---|---|
| `npm run typecheck` | ✅ 0 lỗi |
| `npm run lint` | ✅ 0 lỗi |
| `npm test` | ✅ 40 test / 6 file (thêm `tests/platform/parse.test.ts`) |
| `npm run build` | ✅ `dist/` tạo thành công, manifest có `contextMenus` |
| Kiểm thủ công trên Chrome | ⏳ **Chưa chạy lại trong phiên này** — xem checklist cập nhật |

**Quyết định cho các câu hỏi §5:**

1. **Tóm tắt:** cap an toàn **50 ý**; LLM sau này vẫn truyền `maxItems = 5`.
   `script.md` Appendix A và `DEVIATIONS.md` đã sync.
2. **Context menu:** không thêm permission `notifications`. Nếu `sidePanel.open()` bị Chrome
   từ chối, ghi cờ + badge **!**; người dùng mở panel thủ công, panel tự tiêu thụ cờ.
3. **Vùng click:** đã áp dụng toàn bộ nghi phạm đã biết (gradient, toast, busy, hit area,
   transform khi `:active`). Cần người dùng xác nhận lại control cụ thể nếu vẫn lệch.
4. **Focus:** bỏ `autofocus`; chỉ focus ô lỗi đầu tiên sau validate; thêm `:focus-visible`;
   `Esc` đóng form đang mở.
5. **DOM thô:** tạo **document mới**, đặt active, giữ bản cũ để so sánh.
6. **Tóm tắt dài:** hiển thị đầy đủ trong chi tiết (không cắt sau 5 ý).

---

## 1. Mốc hiện tại

| Hạng mục | Trạng thái |
|---|---|
| Nhánh / commit | `main` · trên `e125766` — *docs: thêm hướng dẫn phiên làm việc tiếp theo* (phiên này chưa commit) |
| Demo | `extension/` chạy được, load unpacked từ `extension/dist` |
| Quality gate | `npm run typecheck`, `npm run lint`, `npm test` (40 test), `npm run build` đều xanh |
| Kiểm thử thủ công | **Chưa chạy lại sau thay đổi**; checklist đã cập nhật kỳ vọng mới |
| Vấn đề | **8/8 VĐ đã sửa trong mã**; 5 mục cần xác nhận lại trên Chrome thật |
| Phạm vi | Không ML/LLM, không nhắc việc, không Gmail/PDF — xem `docs/DEVIATIONS.md` |

### 4 mục checklist chưa kiểm thử

| ID | Mục | Lý do | Cách kiểm |
|---|---|---|---|
| KT-01 | Trang SPA → badge **DOM thô** | Chưa có trang mẫu phù hợp; đã thêm nút **Dùng nội dung thô** + test parse | Dùng một trang render bằng JS (dashboard/localhost), hoặc fixture `test-pages/spa.html` phục vụ qua `python3 -m http.server` |
| KT-02 | Dán email có ngày giờ → lưu đúng | Đã sửa VĐ-04 (nút dán luôn hiện) | Chạy lại trên Chrome |
| KT-03 | Dán nội dung trống → toast lỗi | Đã sửa VĐ-04 | Chạy lại trên Chrome |
| KT-04 | Side panel 320/360/400px không tràn ngang | Đã sửa VĐ-06 (CSS) | Kéo hẹp side panel và kiểm tra |

### 8 vấn đề người dùng ghi nhận

| ID | Ưu tiên | Tóm tắt | Trạng thái |
|---|---|---|---|
| VĐ-04 | **P0** | Không thấy nút dán / hướng dẫn dán | ✅ đã sửa |
| VĐ-06 | **P0** | Tràn ngang khi nhập ngày bắt đầu / kết thúc | ✅ đã sửa |
| VĐ-02 | **P0** | Nút “Xem toàn bộ” nên hiển thị mọi lúc | ✅ đã sửa |
| VĐ-05 | **P0** | Vùng click không ổn định, lệch khỏi nút | ✅ đã sửa; cần xác nhận |
| VĐ-07 | P1 | Tóm tắt không nên giới hạn 5 ý khi nhập tay | ✅ đã sửa |
| VĐ-01 | P1 | Chưa rõ điều kiện dùng DOM thô; cần nút “Dùng nội dung thô” | ✅ đã sửa |
| VĐ-03 | P1 | Bôi đen → chuột phải → “Quét sự kiện” | ✅ đã thêm; cần test Chrome |
| VĐ-08 | P2 | Một số focus khi Tab không cần thiết | ✅ đã sửa |

---

## 2. Backlog chi tiết

### VĐ-04 — Nút “Dán văn bản” luôn hiển thị (P0) — ✅ đã sửa

**Hiện trạng:** `overview.ts` chỉ đặt nút `open-paste` trong empty state (khi chưa có
document). Khi đã đọc một trang, hàng actions chỉ còn **Tạo sự kiện / Quét lại / Xoá**,
nên không có đường vào form dán.

**Hướng sửa:**

- Thêm `secondaryButton('open-paste', 'Dán văn bản', 'copy')` vào chuỗi `actions`
  của nhánh `doc` (khoảng dòng 34–37).
- Cân nhắc thêm nút dán cạnh nút quét trên header để luôn thấy ở mọi tab.
- Form dán đã có sẵn (`pasteForm()` + submit handler `savePastedText`); chỉ thiếu điểm vào.

**File:** `extension/src/ui/views/overview.ts`.

**Nghiệm thu:**

- [ ] Có document rồi vẫn thấy nút **Dán văn bản**; bấm mở form.
- [ ] Lưu nội dung → tạo document badge **Văn bản dán**, active ngay.
- [ ] Nội dung trống → toast lỗi, không tạo bản ghi.
- [ ] KT-02, KT-03 chuyển sang đạt.

**Test:** thêm assertion vào `tests/ui/smoke.test.ts`: render khi có document phải chứa
`Dán văn bản`.

---

### VĐ-06 — Hết tràn ngang ô ngày giờ (P0) — ✅ đã sửa

**Hiện trạng:** `.grid-2` chia 2 cột; `input[type="datetime-local"]` của Chrome có
min-width nội tại lớn, làm grid item rộng hơn cột → side panel xuất hiện thanh cuộn ngang.
Media query hiện tại chỉ bật ở `max-width: 340px`, trong khi side panel thường 360–400px.

**Hướng sửa (đề xuất):**

```css
.grid-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.grid-2 > .field {
  min-width: 0;
}
.input,
.select {
  min-width: 0;
  max-width: 100%;
}
input[type='datetime-local'] {
  width: 100%;
  min-width: 0;
}

@media (max-width: 420px) {
  .grid-2,
  .filters__row,
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
```

Ưu tiên **stack 1 cột** cho cặp ngày giờ ở side panel 400px; không dùng
`overflow-x: hidden` để che lỗi.

**File:** `extension/src/ui/styles.css` (`.grid-2`, `.input`, media query cuối file).

**Nghiệm thu:**

- [ ] Ở 320 / 360 / 400px: không có thanh cuộn ngang; hai ô ngày giờ hiển thị trọn.
- [ ] Các select trong bộ lọc và `.detail-grid` cũng không tràn.
- [ ] KT-04 đạt.

---

### VĐ-02 — “Xem toàn bộ” luôn hiển thị (P0) — ✅ đã sửa

**Hiện trạng:** nút chỉ render khi `hidden > 0 || state.expandedDocument`, nên với
document ngắn hoàn toàn không có nút.

**Hướng sửa:** luôn render nút khi có document:

```ts
const toggleLabel = state.expandedDocument
  ? 'Thu gọn'
  : hidden > 0
    ? `Xem toàn bộ (+${new Intl.NumberFormat('vi-VN').format(hidden)} ký tự)`
    : 'Xem toàn bộ';
```

Nếu `hidden === 0`, nút vẫn bấm được nhưng không thay đổi nội dung — chấp nhận theo
yêu cầu; hoặc disable kèm tooltip “Nội dung đã hiển thị đầy đủ” (cần hỏi lại người dùng).

**File:** `extension/src/ui/views/overview.ts` (khoảng dòng 85–93).

**Nghiệm thu:**

- [ ] Mọi document đều có nút; document dài hiện số ký tự còn lại; bấm mở/Thu gọn đúng.
- [ ] Không làm xê dịch layout khi đổi trạng thái.

---

### VĐ-05 — Ổn định vùng click (P0) — ✅ đã sửa, cần xác nhận

**Hiện trạng:** người dùng báo “click area không ổn định (không nằm đúng trong khu vực
hiển thị của nút)”. Chưa xác định được control cụ thể — **phải tái hiện trước khi sửa**.

**Quy trình chẩn đoán:**

1. Ghi lại: control nào, side panel rộng bao nhiêu, có toast/busy đang hiện không,
   đang ở tab nào, có cuộn không.
2. Trong DevTools side panel, chạy:
   ```js
   document.addEventListener('click', (e) => {
     console.log(e.target, document.elementFromPoint(e.clientX, e.clientY));
   }, true);
   ```
   So sánh `getBoundingClientRect()` của nút với điểm click thực tế.
3. Kiểm tra các nghi phạm đã biết:
   - `.toast` là `position: fixed`, `z-index: 30`, phủ đáy panel → có thể chặn nút ở cuối card.
   - `.doc-text:not(.doc-text--expanded)::after` là lớp gradient phủ 36px đáy, chưa có
     `pointer-events: none`.
   - `.btn:active { transform: translateY(1px) }` làm nút nhích khi bấm.
   - `.icon-btn` chỉ 30×30px, icon 16px — vùng bấm nhỏ hơn cảm giác.
   - Kiểm tra không có `<button>` thiếu `type="button"` trong form (hiện tại đã đủ).

**Hướng sửa tối thiểu (áp dụng sau khi xác nhận):**

```css
.doc-text::after {
  pointer-events: none;
}

.toast {
  pointer-events: none;
}
.toast__close {
  pointer-events: auto;
}

.icon-btn {
  width: 32px;
  height: 32px;
}
```

Cân nhắc bỏ `transform` khi `:active`, hoặc đổi sang `scale(0.98)`.

**Nghiệm thu:**

- [ ] Ở 320px và 400px, bấm mọi nút hiển thị đúng action, kể cả khi toast đang hiện.
- [ ] `elementFromPoint` tại tâm nút trả về chính nút hoặc phần tử con của nút.
- [ ] Không còn “dead zone” ở đáy card / cuối danh sách.

---

### VĐ-07 — Bỏ giới hạn 5 ý khi nhập tay (P1) — ✅ đã sửa

**Hiện trạng:** giới hạn 5 nằm ở 3 nơi:

- `src/shared/contracts.ts` dòng 70: `.max(5, 'Tóm tắt tối đa 5 ý')`
- `src/core/forms.ts` dòng 86–90: báo lỗi khi `summaryLines.length > 5`
- `src/core/text.ts`: `parseSummaryInput(value, maxItems = 5)`

**Hướng sửa:**

- Form thủ công: bỏ kiểm tra `> 5`; cho phép nhiều ý.
- Schema: nới `max` lên **50** (đề xuất an toàn) hoặc bỏ hẳn `.max` nếu người dùng muốn
  tuyệt đối không giới hạn. Giữ `.max(300)` cho từng ý.
- `parseSummaryInput`: đổi default `maxItems` thành 50; pipeline LLM sau này truyền 5.
- UI chi tiết: nếu > 5 ý, hiển thị đầy đủ hoặc thêm “Xem thêm” — tránh card quá dài.

**Đồng bộ tài liệu (bắt buộc theo AGENTS.md):**

- `script.md` Appendix A dòng 430 đang ghi `// 1–5 ý`; sửa thành
  `// 1–5 ý với LLM; nhập tay không giới hạn (demo)` hoặc ghi rõ quyết định.
- `docs/DEVIATIONS.md`: thêm dòng “Tóm tắt thủ công không giới hạn 5 ý; LLM vẫn 1–5”.
- `base_idea.md` là tài liệu gốc lịch sử — **không sửa**, chỉ ghi deviation.

**Test cần cập nhật:**

- `tests/core/forms.test.ts`: test “chặn tóm tắt quá 5 ý” → đổi thành “cho phép 6 ý”.
- `tests/core/text.test.ts`: default giờ trả 6 ý; test `maxItems = 5` vẫn hoạt động.
- Thêm test schema: 51 ý bị chặn (nếu chọn cap 50).

**Nghiệm thu:**

- [ ] Nhập 6–10 dòng → lưu được, chi tiết hiển thị đủ.
- [ ] LLM tương lai vẫn có thể giới hạn 5 bằng tham số.
- [ ] Docs đã đồng bộ; không còn thông báo “tối đa 5 ý” trong form.

---

### VĐ-01 — Làm rõ DOM thô + nút “Dùng nội dung thô” (P1) — ✅ đã sửa

**Hiện trạng:** `parseCapture` dùng Readability; chỉ fallback khi:

- Readability trả `null`, hoặc
- `article.textContent.trim().length < 120` (`MIN_ARTICLE_CHARS`), hoặc
- Readability ném lỗi.

Fallback lấy `dom.body.textContent` và gắn `extractionMethod: 'raw_dom'`. UI chỉ hiện badge
**DOM thô (dự phòng)**, không giải thích vì sao; người dùng không biết khi nào nên chọn thô.

**Hướng sửa:**

1. Hiện alert khi `doc.extractionMethod === 'raw_dom'`:
   > “Readability không tìm thấy nội dung chính (hoặc nội dung dưới 120 ký tự) nên đang
   > dùng toàn bộ DOM. Nếu nội dung bị nhiễu, hãy bôi đen phần cần lấy hoặc bấm
   > **Dùng nội dung thô**.”
2. Thêm action `capture-raw` → `captureCurrentPage({ forceRaw: true })`.
3. `parseCapture(payload, { forceRaw })`: bỏ qua Readability, dùng thẳng `dom.body.textContent`,
   method `raw_dom`, `usedFallback: true`.
4. `captureCurrentPage(options?: { forceRaw?: boolean })` truyền cờ xuống; toast ghi rõ
   “(DOM thô theo yêu cầu)”.
5. Quyết định: tạo **document mới** (giữ bản cũ để so sánh) hay thay thế document hiện tại.
   Đề xuất tạo mới, đặt active; nếu trang đã đóng thì báo lỗi rõ.

**File:** `src/platform/capture/parse.ts`, `src/ui/actions/documents.ts`,
`src/ui/views/overview.ts`, `src/ui/sidepanel.ts` (action `capture-raw`).

**Test:** thêm `tests/platform/parse.test.ts` với `@vitest-environment jsdom`:

- HTML có `<article>` đủ dài → `readability`.
- Cùng HTML với `forceRaw` → `raw_dom`.
- Có selection → `selection` (ưu tiên hơn cả forceRaw).

**Nghiệm thu:**

- [ ] Document raw_dom có alert giải thích + nút “Dùng nội dung thô”.
- [ ] Bấm nút tạo document raw_dom mới, không crash khi trang đã đóng.
- [ ] KT-01 có kết quả rõ ràng (dù Readability vẫn đọc được trang SPA thì ghi nhận).

---

### VĐ-03 — Context menu “Quét sự kiện” cho vùng bôi đen (P1) — ✅ đã sửa, cần test Chrome

**Mục tiêu:** bôi đen → chuột phải → **Quét sự kiện** → side panel mở và đọc đúng vùng chọn.

**Các bước:**

1. `manifest.config.ts`: thêm permission `contextMenus` (đã nằm trong danh sách cho phép
   của AGENTS.md §4).
2. `background/index.ts`:
   ```ts
   const MENU_ID = 'scan-selection';

   chrome.runtime.onInstalled.addListener(() => {
     chrome.contextMenus.removeAll(() => {
       chrome.contextMenus.create({
         id: MENU_ID,
         title: 'Quét sự kiện từ vùng chọn',
         contexts: ['selection'],
       });
     });
   });

   chrome.contextMenus.onClicked.addListener((info, tab) => {
     if (info.menuItemId !== MENU_ID || !tab?.id) return;

     // Gọi open() ngay để giữ user gesture; ghi cờ song song.
     const opening = chrome.sidePanel.open({ tabId: tab.id });
     void chrome.storage.session.set({
       [PENDING_CAPTURE_KEY]: { mode: 'selection', requestedAt: Date.now() },
     });
     opening.catch((error) => {
       console.warn('[background] Không mở được side panel từ context menu', error);
       void chrome.storage.session.remove(PENDING_CAPTURE_KEY);
     });
   });
   ```
3. Panel đã có listener `chrome.storage.onChanged` + `consumePendingCapture`; selection
   được ưu tiên trong `parseCapture`, nên không cần đổi pipeline.
4. Cân nhắc lưu `info.selectionText` vào cờ để dự phòng trường hợp selection mất khi panel mở;
   khi đó panel dùng text đã lưu thay vì đọc lại trang.

**Rủi ro cần test trên Chrome thật:**

- `chrome.sidePanel.open()` có được coi là “user gesture” khi gọi từ
  `contextMenus.onClicked` không? Nếu không, panel không mở.
- Fallback nếu `open()` thất bại:
  - Panel đang mở → chỉ cần storage change là đủ.
  - Panel đang đóng → không thể tự mở; ghi log và (tuỳ chọn) đặt badge
    “Mở side panel để quét” hoặc dùng `chrome.notifications` (cần thêm permission — cân nhắc).
- Không được để cờ `pending_capture` kẹt lại gây quét ngoài ý muốn lần sau.

**Nghiệm thu:**

- [ ] Menu chỉ hiện khi có selection.
- [ ] Panel đóng → bấm menu → panel mở + đọc đúng selection.
- [ ] Panel đang mở → bấm menu → đọc lại selection mới, không tạo trùng.
- [ ] Chọn text trên trang `chrome://` → menu không hiện hoặc báo lỗi mềm.

**Docs:** cập nhật `README.md` §4 (permissions) và `docs/kiem-thu-demo.md` (mục mới).

---

### VĐ-08 — Dọn focus / keyboard (P2) — ✅ đã sửa

**Hiện trạng:** form sự kiện và hồ sơ dùng `autofocus`; input/select có `outline: none`
nhưng thay bằng box-shadow; button/tab dùng outline mặc định của trình duyệt. Người dùng
báo “một số Tab function focus không cần thiết” — cần làm rõ nghĩa.

**Hướng sửa đề xuất:**

- Bỏ `autofocus` khỏi form sự kiện/hồ sơ nếu nó gây nhảy focus/scroll ngoài ý muốn;
  chỉ focus ô lỗi đầu tiên sau khi validate thất bại.
- Thêm style focus chỉ cho bàn phím:
  ```css
  .btn:focus-visible,
  .icon-btn:focus-visible,
  .tab:focus-visible,
  .link-btn:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
  ```
- Giữ `:focus` cho input/select (box-shadow hiện tại) và kiểm tra contrast.
- Rà tab order: header scan → tabs → nội dung; đảm bảo không có phần tử ẩn nào nhận focus.
- Cân nhắc `Esc` đóng form (tuỳ chọn).

**Nghiệm thu:**

- [ ] Mở form không tự nhảy focus ngoài mong muốn.
- [ ] Tab/Shift+Tab đi đúng thứ tự, ring chỉ hiện khi dùng bàn phím.
- [ ] Checklist §7 “Chỉ dùng bàn phím” vẫn đạt.

**Cần hỏi lại người dùng:** “focus không cần thiết” là autofocus khi mở form, outline khi
click chuột, hay thứ tự tab? Ghi câu trả lời vào mục 5.

---

## 3. Thứ tự thực hiện đề xuất

| Bước | Việc | Commit gợi ý | Trạng thái |
|---|---|---|---|
| 1 | VĐ-04 + VĐ-02 + VĐ-06 (quick wins, cùng file overview/CSS) | `fix(ui): luôn hiện nút dán & xem toàn bộ, hết tràn ngang` | ✅ |
| 2 | VĐ-05: tái hiện, sửa overlay/hit area | `fix(ui): ổn định vùng click trong side panel` | ✅ (cần xác nhận) |
| 3 | VĐ-01: forceRaw + alert + test parse | `feat(capture): chủ động dùng DOM thô` | ✅ |
| 4 | VĐ-07: bỏ giới hạn tóm tắt thủ công + đồng bộ docs | `feat(events): bỏ giới hạn 5 ý khi nhập tay` | ✅ |
| 5 | VĐ-03: context menu + test Chrome | `feat(context-menu): quét vùng chọn` | ✅ (cần test Chrome) |
| 6 | VĐ-08 + chạy lại toàn bộ checklist, cập nhật kết quả | `fix(a11y): focus bàn phím; cập nhật checklist` | ✅ mã; ⏳ checklist thủ công |

Sau mỗi bước: chạy quality gate, cập nhật `docs/kiem-thu-demo.md`, commit nhỏ.

---

## 4. Lệnh kiểm tra

```bash
cd extension
npm run typecheck
npm run lint
npm test
npm run build
```

Load unpacked `extension/dist` → `chrome://extensions` → **Reload** sau mỗi build.

Kiểm thử thủ công: làm theo `docs/kiem-thu-demo.md`; thêm mục cho VĐ-01/VĐ-03/VĐ-07.

---

## 5. Câu hỏi cần chốt với người dùng

> Đã chốt trong phiên 2026-10-22 — xem §0. Nếu người dùng muốn khác, sửa lại mục này
> trước khi đổi mã.

1. **Tóm tắt:** cap an toàn 50 ý; `script.md` Appendix A đã ghi “1–5 với LLM, nhập tay cap 50”.
2. **Context menu:** fallback badge **!** + mở panel thủ công; không thêm `notifications`.
3. **Vùng click:** đã sửa các nghi phạm đã biết; nếu vẫn lệch cần control cụ thể + kích thước.
4. **Focus:** đã bỏ autofocus, thêm focus ô lỗi đầu tiên, `:focus-visible`, `Esc`.
5. **DOM thô:** tạo document mới, giữ bản cũ.
6. **Hiển thị tóm tắt dài:** hiện tất cả trong chi tiết.

---

## 6. Ràng buộc không được vi phạm

- MV3; permission chỉ trong danh sách AGENTS.md §4 (`contextMenus` được phép).
  **Không** thêm host permission, không `<all_urls>`.
- Không remote code/CDN, không gọi mạng; CSP `script-src 'self'`.
- `src/core/**` thuần: không `chrome.*`, không `platform/`, không `ui/`.
- `src/shared/contracts.ts` là nguồn hợp đồng duy nhất; đổi schema phải sync
  `script.md` Appendix A + `docs/DEVIATIONS.md`.
- Escape HTML trước `innerHTML`; không UI framework; file ~300 dòng.
- Tài liệu tiếng Việt; giữ ID `KS-xx`; không sửa/xoá `unfinished_script.svg`.
- npm 9: dùng `npm install --legacy-peer-deps`; `dist/` và `node_modules/` không commit.

---

## 7. Definition of Done cho phiên tới

- [x] 8 VĐ được sửa (mã + kiểm tra tự động).
- [x] `typecheck`, `lint`, `test` (40 test), `build` xanh; có test mới cho VĐ-01/VĐ-07.
- [x] `docs/kiem-thu-demo.md` cập nhật checkbox + mục “VẤN ĐỀ” trạng thái mới.
- [x] `docs/DEVIATIONS.md` / `script.md` / `README.md` / `extension/README.md` đồng bộ.
- [ ] 4 mục KT-01…KT-04: logic/UI đã sửa; **cần chạy lại thủ công trên Chrome** (lý do: phiên này không thao tác được trình duyệt).
- [ ] Commit sạch trên `main`, không chứa `dist/` hay `node_modules/`.
