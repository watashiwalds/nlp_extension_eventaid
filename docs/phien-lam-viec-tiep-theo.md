# Hướng dẫn phiên làm việc tiếp theo

> Bàn giao sau khi người dùng chạy checklist thủ công và bổ sung mục **VẤN ĐỀ** trong
> [`docs/kiem-thu-demo.md`](./kiem-thu-demo.md).
> Đọc kèm: [`AGENTS.md`](../AGENTS.md), [`docs/DEVIATIONS.md`](./DEVIATIONS.md),
> [`script.md`](../script.md) (Appendix A).

---

## 1. Mốc hiện tại

| Hạng mục | Trạng thái |
|---|---|
| Nhánh / commit | `main` · `6fe8378` — *Human manual test completed with additional review* |
| Demo | `extension/` chạy được, load unpacked từ `extension/dist` |
| Quality gate | `npm run typecheck`, `npm run lint`, `npm test` (34 test), `npm run build` đều xanh |
| Kiểm thử thủ công | **36/40 mục đạt**; 4 mục chưa kiểm thử; 8 vấn đề UX/kỹ thuật cần xử lý |
| Phạm vi | Không ML/LLM, không nhắc việc, không Gmail/PDF — xem `docs/DEVIATIONS.md` |

### 4 mục checklist chưa kiểm thử

| ID | Mục | Lý do | Cách kiểm |
|---|---|---|---|
| KT-01 | Trang SPA → badge **DOM thô** | Chưa có trang mẫu phù hợp | Dùng một trang render bằng JS (dashboard/localhost), hoặc tạo fixture tạm `test-pages/spa.html` phục vụ qua `python3 -m http.server` |
| KT-02 | Dán email có ngày giờ → lưu đúng | Không thấy nút dán (xem VĐ-04) | Sửa VĐ-04 rồi thử lại |
| KT-03 | Dán nội dung trống → toast lỗi | Cùng lý do KT-02 | Sửa VĐ-04 rồi thử lại |
| KT-04 | Side panel ~320px không tràn ngang | Đang tràn ở ô ngày giờ (xem VĐ-06) | Sửa VĐ-06 rồi thử ở 320 / 360 / 400px |

### 8 vấn đề người dùng ghi nhận

| ID | Ưu tiên | Tóm tắt | File chính |
|---|---|---|---|
| VĐ-04 | **P0** | Không thấy nút dán / hướng dẫn dán | `src/ui/views/overview.ts` |
| VĐ-06 | **P0** | Tràn ngang khi nhập ngày bắt đầu / kết thúc | `src/ui/styles.css` |
| VĐ-02 | **P0** | Nút “Xem toàn bộ” nên hiển thị mọi lúc | `src/ui/views/overview.ts` |
| VĐ-05 | **P0** | Vùng click không ổn định, lệch khỏi nút | `src/ui/styles.css`, `components.ts` |
| VĐ-07 | P1 | Tóm tắt không nên giới hạn 5 ý khi nhập tay | `contracts.ts`, `core/forms.ts`, `core/text.ts` |
| VĐ-01 | P1 | Chưa rõ điều kiện dùng DOM thô; cần nút “Dùng nội dung thô” | `capture/parse.ts`, `actions/documents.ts`, `overview.ts` |
| VĐ-03 | P1 | Bôi đen → chuột phải → “Quét sự kiện” | `manifest.config.ts`, `background/index.ts` |
| VĐ-08 | P2 | Một số focus khi Tab không cần thiết | `views/*.ts`, `styles.css` |

---

## 2. Backlog chi tiết

### VĐ-04 — Nút “Dán văn bản” luôn hiển thị (P0)

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

### VĐ-06 — Hết tràn ngang ô ngày giờ (P0)

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

### VĐ-02 — “Xem toàn bộ” luôn hiển thị (P0)

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

### VĐ-05 — Ổn định vùng click (P0)

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

### VĐ-07 — Bỏ giới hạn 5 ý khi nhập tay (P1)

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

### VĐ-01 — Làm rõ DOM thô + nút “Dùng nội dung thô” (P1)

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

### VĐ-03 — Context menu “Quét sự kiện” cho vùng bôi đen (P1)

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

### VĐ-08 — Dọn focus / keyboard (P2)

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

| Bước | Việc | Commit gợi ý |
|---|---|---|
| 1 | VĐ-04 + VĐ-02 + VĐ-06 (quick wins, cùng file overview/CSS) | `fix(ui): luôn hiện nút dán & xem toàn bộ, hết tràn ngang` |
| 2 | VĐ-05: tái hiện, sửa overlay/hit area | `fix(ui): ổn định vùng click trong side panel` |
| 3 | VĐ-01: forceRaw + alert + test parse | `feat(capture): chủ động dùng DOM thô` |
| 4 | VĐ-07: bỏ giới hạn tóm tắt thủ công + đồng bộ docs | `feat(events): bỏ giới hạn 5 ý khi nhập tay` |
| 5 | VĐ-03: context menu + test Chrome | `feat(context-menu): quét vùng chọn` |
| 6 | VĐ-08 + chạy lại toàn bộ checklist, cập nhật kết quả | `fix(a11y): focus bàn phím; cập nhật checklist` |

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

1. **Tóm tắt:** cap an toàn 50 ý hay bỏ hoàn toàn giới hạn? Có cập nhật `script.md`
   Appendix A (1–5 → “1–5 với LLM, thủ công không giới hạn”) không?
2. **Context menu:** nếu `sidePanel.open()` không chạy từ menu, chấp nhận fallback
   “mở panel thủ công” hay thêm permission `notifications` để báo?
3. **Vùng click:** control nào bị lệch? Có thể gửi kèm ảnh/video hoặc các bước tái hiện.
4. **Focus:** chính xác điều gì khó chịu — autofocus, outline khi click, hay tab order?
5. **DOM thô:** tạo document mới hay thay thế document hiện tại?
6. **Hiển thị tóm tắt dài:** hiện tất cả hay thu gọn sau 5 ý kèm “Xem thêm”?

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

- [ ] 4 mục KT-01…KT-04 đạt (hoặc có lý do chưa đạt được ghi rõ).
- [ ] 8 VĐ được sửa hoặc quyết định hoãn kèm lý do.
- [ ] `typecheck`, `lint`, `test`, `build` xanh; có test mới cho VĐ-01/VĐ-07.
- [ ] `docs/kiem-thu-demo.md` cập nhật checkbox + mục “VẤN ĐỀ” trạng thái mới.
- [ ] `docs/DEVIATIONS.md` / `script.md` / `README.md` đồng bộ nếu có thay đổi schema,
      permission hoặc hành vi.
- [ ] Commit sạch trên `main`, không chứa `dist/` hay `node_modules/`.
