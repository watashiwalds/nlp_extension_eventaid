# Bàn giao Slice C → Slice D

> **Trạng thái:** Slice C đã nghiệm thu ngày **2026-10-24**. Phiên làm việc tiếp theo
> bắt đầu **Slice D** — duyệt sự kiện nháp, hiển thị nguồn/độ tin cậy và chống trùng.
> Tài liệu này là điểm bắt đầu của phiên đó; không thay thế
> [`ke-hoach-llm-trich-xuat.md`](./ke-hoach-llm-trich-xuat.md) (phạm vi/thứ tự lát cắt)
> hay [`script.md`](../script.md) KS-08 (hành vi duyệt).
>
> **Mốc code:** `d360d52` + thay đổi Slice C trong working tree. Tại thời điểm chốt,
> các thay đổi Slice C **chưa được commit**; nếu người dùng đã commit sau đó, cập nhật
> lại mốc này trước khi bắt đầu.
>
> **Rà soát kế hoạch (2026-10-24):** đã đối chiếu với code hiện tại
> (`src/ui/views/events.ts`, `src/ui/actions/events.ts`, `src/core/events.ts`,
> `src/core/extraction/{dedup,normalize}.ts`, `src/shared/contracts.ts`) và KS-08.
> Bản đầu đúng hướng nhưng có các điểm chưa đảm bảo — liệt kê ở §1 và đã sửa trong
> tài liệu này. **Chưa có dòng code Slice D nào được viết.**

---

## 1. Kết quả rà soát kế hoạch

| # | Điểm trong bản đầu | Vấn đề | Đã sửa thành |
|---|---|---|---|
| 1 | D1 “thêm liên kết mở nguồn nếu có `url`” | Liên kết **đã có sẵn** ở tiêu đề nguồn trong `eventDetail()`; chỉ `quote` là chưa bấm được | Giữ liên kết hiện có; thêm nút “Mở nguồn” cạnh quote và hiển thị quote đầy đủ, có `details` nếu dài |
| 2 | D1 “nhóm/sắp xếp nháp `llm` lên trước” | Xung đột với `sortEvents()` đang sắp theo thời gian và được dùng chung toàn app | Thêm **chế độ Duyệt nháp** (`reviewMode`) chỉ đổi thứ tự trong màn duyệt; không sửa `sortEvents()` toàn cục |
| 3 | D2 “không tự duyệt sự kiện thiếu thời điểm; vẫn cho duyệt” | Câu này mâu thuẫn | Chốt: **vẫn cho duyệt**, nhưng phải xác nhận; phân biệt “chỉ có ngày” và “không có ngày” |
| 4 | D4 “cùng thời điểm/địa điểm/hồ sơ” | `Event` **không có trường địa điểm**; địa điểm chỉ nằm trong `summary`/`quote` | Bỏ so khớp địa điểm có cấu trúc; dùng thời gian + tiêu đề + trùng lặp văn bản + hồ sơ chung |
| 5 | D4 “quét lại cùng trang hai lần → 0 bản ghi mới” | Chỉ đúng khi model trả **cùng tiêu đề** (dedup hiện tại); bản paraphrase sẽ tạo bản nháp mới | Tách tiêu chí: quét lại y hệt → 0 bản ghi mới; paraphrase → được tạo nhưng phải hiện gợi ý, không tự gộp |
| 6 | D3 “sửa nhanh tại chỗ” | Kế hoạch chỉ mở form đầy đủ; KS-08 bước 4 yêu cầu sửa nhanh tại chỗ | Baseline: mở form hiện có; **ghi lệch KS-08** vào `DEVIATIONS.md`. D3a (sửa nhanh nội tuyến) là tuỳ chọn nếu còn thời gian |
| 7 | D3 “bỏ chọn thì xoá hay giữ?” | Để mở, trong khi KS-08 nói mục bỏ chọn bị loại khỏi danh sách nháp | Chốt: **bỏ chọn không xoá**; muốn loại phải bấm “Xoá nháp đã chọn” + xác nhận. Ghi lệch KS-08 |
| 8 | D2/D3 thiếu chi tiết vận hành | Chưa nói lỗi từng phần, làm sạch lựa chọn, trạng thái indeterminate, mốc KS-10, test | Đã bổ sung ở §5–§8 |

**Kết luận:** kế hoạch Slice D giờ đã đủ để bắt đầu code, với các quyết định đã chốt ở §6
và các lệch KS-08 được ghi rõ ở §9.

## 2. Slice C đã giao gì

| Hạng mục | Kết quả |
|---|---|
| Chạy nền | Job trích xuất chạy trong **offscreen document**, không dừng khi đóng side panel |
| Trạng thái job | Lưu trong `chrome.storage.session` dưới `EXTRACTION_JOB_KEY`; một job active tại một thời điểm |
| Mở lại panel | Đọc lại job, hiện tiến trình/toast và chuyển tab **Sự kiện** khi xong |
| Huỷ | Background gửi tín hiệu abort, đóng offscreen và ghi `cancelled`; message hoàn tất đến muộn bị bỏ qua |
| Thông báo | Notification khi xong/lỗi; bấm notification mở tab **Sự kiện**, lọc **Nháp**; fallback badge `!` |
| Kết quả | Sự kiện do LLM tạo vẫn là `status='nhap'`, `origin='llm'`, giữ `sources` và `extractionMeta` |
| Tài liệu | [`kiem-tra-slice-c.md`](./kiem-tra-slice-c.md) ghi kiến trúc, hợp đồng job, checklist và giới hạn |

**Bằng chứng tự động (lần chạy gần nhất 2026-10-23):**

```bash
cd extension
npm run typecheck   # xanh
npm run lint        # xanh
npm test -- --run   # 180 test / 21 file
npm run build       # xanh; dist/src/platform/offscreen/index.html + assets/offscreen-*.js
```

**Nghiệm thu thủ công:** người dùng xác nhận Slice C đạt ngày 2026-10-24. Không có log
chi tiết từng mục KT-C; checklist trong `kiem-tra-slice-c.md` §5 được đóng theo xác nhận này.

## 3. Giới hạn đã biết (không chặn Slice D)

- Không resume job sau khi tắt trình duyệt; `chrome.storage.session` bị xoá.
- Nếu offscreen bị Chrome đóng bất ngờ, job có thể kẹt `running`; người dùng bấm **Huỷ**
  rồi chạy lại. Chưa có watchdog/heartbeat.
- Notification kết quả trích xuất chỉ dùng **1 nút**; giới hạn 2 nút của Chrome để dành
  cho nhắc việc KS-10 sau này.
- Nhắc việc sự kiện (`chrome.alarms`) **chưa có**. Duyệt nháp chỉ đổi `status`; mảng
  `notifications.milestones` vẫn rỗng cho tới khi làm KS-10.
- Chưa có bảng đo latency/recall sau Slice C; đo chất lượng thuộc **Slice E**.

## 4. Hiện trạng trước Slice D

Đã có sẵn trong demo:

- Danh sách sự kiện, lọc theo trạng thái/nhãn/nhãn tuỳ chỉnh/từ khoá; sắp xếp theo thời gian
  bằng `sortEvents()` (đang diễn ra → sắp tới → đã qua → chưa có thời điểm).
- Thẻ sự kiện đã hiển thị nguồn trích, tiêu đề nguồn có **liên kết `url`**, `quote`
  (đang cắt còn 220 ký tự), cờ `validation.uncertain`, tóm tắt, hồ sơ liên quan và nút
  sửa/xoá/chuyển trạng thái.
- Form sửa sự kiện đầy đủ 7 trường; sự kiện LLM nằm trong `nhap`. `updateEvent()` giữ
  nguyên `origin` và `extractionMeta` khi người dùng sửa nội dung.
- Dedup cơ bản trong `src/core/extraction/dedup.ts`: chuẩn hoá tiêu đề, chỉ bỏ khi chắc chắn
  (tiêu đề trùng sau chuẩn hoá và thời điểm lệch ≤ 1 ngày, hoặc cả hai cùng thiếu thời điểm).
- `extractionMeta.confidence` đã có trên bản ghi `llm`; `normalize.ts` đã gắn cờ
  `do_tin_cay_thap` khi `confidence < 0.5`.

Chưa có, cần làm ở Slice D:

- Badge **Máy đề xuất** / `origin='llm'` và mức **confidence** trên thẻ sự kiện.
- Màn/chế độ duyệt nháp để thấy trước nháp `llm`, độ tin cậy thấp, chưa gắn hồ sơ.
- Chọn nhiều nháp + **Duyệt hàng loạt** (`nhap → dang_theo_doi`).
- Xoá/loại nháp không dùng theo thao tác rõ ràng của người dùng.
- Gợi ý gộp trùng paraphrase (khác tiêu đề nhưng cùng sự kiện); **không tự gộp**.
- Checklist/kiểm thử riêng cho luồng duyệt.

## 5. Phạm vi Slice D

**Mục tiêu:** người dùng duyệt 5 sự kiện nháp trong **≤ 30 giây**, không phải mở từng
form; quét lại cùng trang với cùng output **không sinh thêm bản ghi trùng** (paraphrase
được tạo nhưng phải hiện gợi ý); mọi thay đổi trạng thái đều do người dùng xác nhận.

### D1 — Màn duyệt nháp

- **Badge nguồn tạo:**
  - Trong danh sách: chỉ gắn badge **Máy đề xuất** (tone `info`) cho `origin === 'llm'`;
    sự kiện nhập tay không gắn badge để danh sách không bị nhiễu.
  - Trong chi tiết: thêm dòng **Nguồn tạo** cho cả hai (`Máy đề xuất` / `Nhập tay`).
- **Confidence:** chỉ hiển thị khi có `extractionMeta` (tức `origin === 'llm'`), ở cả thẻ
  danh sách và chi tiết:
  - Ba mức: **Thấp** (`< 0.5`), **Vừa** (`0.5 – < 0.8`), **Cao** (`≥ 0.8`).
  - Không hiển thị phần trăm; thêm `title`/`aria-label` ghi rõ “model tự báo, không phải
    xác suất đã hiệu chuẩn”.
  - **Không ẩn chip `do_tin_cay_thap`** trong “Cần kiểm tra”: cờ này còn được `normalize.ts`
    dùng khi ngày/giờ không đáng tin, kể cả khi `confidence` cao. Badge confidence ghi rõ
    “Máy tự báo” để phân biệt; nếu cả hai cùng xuất hiện thì giữ cả hai, không đổi nhãn cờ.
- **Tín hiệu cần kiểm tra trên thẻ:** giữ chip `thiếu thời điểm`; thêm chip **Chưa gắn hồ sơ**
  khi `validation.uncertain` có `chua_ro_ho_so`; các cờ khác chỉ hiện trong chi tiết để thẻ
  không quá tải.
- **Nguồn trích/quote:**
  - Giữ liên kết tiêu đề nguồn hiện có; thêm nút **Mở nguồn** cạnh quote khi `source.url`
    tồn tại.
  - Hiển thị đầy đủ `quote` đã lưu; nếu dài hơn 220 ký tự thì dùng `<details>` hoặc
    nút “Xem đầy đủ”, không cắt im lặng.
  - Nguồn không có `url` (paste/selection): không tạo link giả; hiện nhãn loại nguồn.
- **Chế độ Duyệt nháp:**
  - Thêm `reviewMode: boolean` và `reviewReturnStatus: EventStatus | 'all'` vào `AppState`
    (chỉ UI, không lưu DB).
  - Nút **Duyệt nháp (N)** ở đầu tab Sự kiện; bấm vào thì ghi nhớ `eventFilter.status`
    hiện tại vào `reviewReturnStatus`, đặt `status = 'nhap'` và bật `reviewMode`; vẫn áp
    dụng bộ lọc từ khoá/nhãn hiện có.
  - Thứ tự trong chế độ duyệt: (0) `llm` có confidence thấp, có `validation.uncertain`
    hoặc chưa gắn hồ sơ; (1) `llm` còn lại; (2) `manual`; trong cùng nhóm dùng thứ tự
    thời gian hiện có.
  - Hàm thuần mới `sortDraftsForReview(events, now)` trong `src/core/event-review.ts`
    (tách khỏi `core/events.ts` để giữ file ~300 dòng); **không** sửa `sortEvents()` để
    tránh đổi hành vi toàn app.
  - Khi notification mở tab Sự kiện với `status = 'nhap'`, bật luôn `reviewMode = true`
    và đặt `reviewReturnStatus = 'all'`.
  - Trong `reviewMode`, ô lọc **trạng thái** bị ẩn/disable và hiển thị cố định “Nháp”;
    `applyFilterFromForm()` phải giữ `status = 'nhap'` thay vì đọc giá trị rỗng từ ô bị ẩn.
    `clearFilter()` trong chế độ duyệt chỉ xoá nhãn/nhãn tuỳ chỉnh/từ khoá, vẫn giữ
    `status = 'nhap'`. Thoát chế độ duyệt thì khôi phục `eventFilter.status = reviewReturnStatus`.
  - Nút **Duyệt nháp (N)** chỉ hiện khi `N > 0`; N là số sự kiện `status === 'nhap'`.
  - Trong `reviewMode` luôn có nút **Quay lại danh sách** (kể cả khi đã duyệt hết, N = 0);
    danh sách rỗng hiện empty state “Đã duyệt hết nháp” kèm nút quay lại, không để người dùng kẹt.
  - `Escape` thoát `reviewMode` khi không có form/dialog nào đang mở; không đóng side panel.
- **Không thêm** badge “đã kiểm chứng”, “chính xác” hay phần trăm gây hiểu nhầm.
- Badge **Máy đề xuất** chỉ nói **nguồn tạo**, không nói đã kiểm chứng. Người dùng sửa nội dung
  thì `origin` vẫn là `llm` (đúng hợp đồng hiện tại); không tự đổi sang `manual`.

### D2 — Chọn và duyệt hàng loạt

- **Lựa chọn:** `selectedDraftIds: string[]` trong `AppState`, không lưu DB.
  - Checkbox nằm **ngoài** nút `toggle-event` (không lồng `<input>` trong `<button>`);
    bọc thẻ bằng hàng `event-card__row` gồm checkbox + nút mở rộng; phần chi tiết nằm dưới hàng.
  - Chỉ nháp đang hiện trong chế độ duyệt mới được chọn.
  - Làm sạch lựa chọn khi: đổi bộ lọc, thoát chế độ duyệt, sự kiện đổi trạng thái, xoá,
    hoặc `loadAll()` trả về danh sách mới. Không giữ id “mồ côi”.
- **Chọn tất cả đang hiển thị:** chỉ chọn các nháp đang hiển thị; checkbox tổng có trạng thái
  `indeterminate` khi chọn một phần. Quy tắc bấm: đang `checked` → bỏ chọn các mục đang hiển thị;
  đang `indeterminate` hoặc chưa chọn → chọn tất cả mục đang hiển thị. Vì view render bằng
  `innerHTML`, sau mỗi lần render side panel gọi `syncReviewSelectionUi()` để gán
  `indeterminate` (thuộc tính DOM không thể đặt bằng HTML).
- **Nút Duyệt đã chọn:**
  - Chỉ bật khi có ít nhất một nháp đang hiển thị được chọn; nút Xoá nháp cũng vậy.
  - Lấy giao của `selectedDraftIds` với danh sách nháp đang hiển thị tại thời điểm bấm;
    loại các mục không còn `status === 'nhap'` (đã bị đổi ở nơi khác) khỏi lựa chọn và
    không tính vào X/Y.
  - Chuyển từng mục bằng `setEventStatus(event, 'dang_theo_doi')` (đúng state machine,
    cập nhật `updatedAt`, giữ `origin`/`extractionMeta`/`sources`).
  - Lưu bằng `Promise.allSettled`; chỉ cập nhật store cho mục lưu thành công; mục lỗi
    **giữ nguyên `nhap`** và giữ trong lựa chọn để thử lại.
  - Toast theo KS-08: `Đã lưu N sự kiện vào lịch của bạn.` khi tất cả thành công;
    nếu có lỗi, dùng `Đã lưu X/Y sự kiện vào lịch của bạn.` kèm toast lỗi nêu số mục
    chưa lưu được.
- **Cảnh báo thời điểm:** trước khi duyệt, đếm trong các mục được chọn:
  - `!start.value && start.date` → “chỉ có ngày, chưa có giờ”;
  - `!start.value && !start.date` → “chưa có thời điểm”.
  Nếu có một trong hai, hiện `window.confirm` với số lượng tương ứng; nội dung nói rõ
  **chưa xếp được nhắc việc** cho tới khi có `start.value`. Người dùng huỷ thì không lưu gì.
  Không tự điền `00:00` hay ngày bịa.
- **Không tự duyệt** khi job trích xuất xong; người dùng phải chọn và bấm.
- Bulk approve áp dụng cho cả nháp nhập tay, nhưng chế độ duyệt xếp nháp `llm` lên trước.
- Không gán mốc thông báo: `notifications.milestones` vẫn `[]` vì KS-10 chưa làm.

### D3 — Sửa và loại nháp

- **Sửa:** nút `Sửa` mở form đầy đủ hiện có (`openEventForm({ eventId })`). `updateEvent()`
  đã giữ `origin`/`extractionMeta`; cần test lại sau khi sửa.
- **Sửa nhanh nội tuyến (D3a — tuỳ chọn):** nếu còn thời gian, thêm hàng sửa nhanh ngay
  trong thẻ cho **tiêu đề + ngày/giờ bắt đầu + nhãn**, lưu bằng `updateEvent()`, kèm link
  “Sửa đầy đủ”. Không thêm trường dữ liệu mới.
- **Ghi nhận chỉnh sửa để cải thiện chất lượng:** **không làm trong Slice D**. Chưa có
  dataset/feedback loop; `updatedAt` chỉ là dấu thời gian, không phải tín hiệu huấn luyện.
  Ghi vào `DEVIATIONS.md` (lệch KS-08 bước 4).
- **Bỏ chọn ≠ xoá:** bỏ chọn chỉ bỏ khỏi lựa chọn, không đụng DB.
- **Xoá nháp:** nút **Xoá nháp đã chọn** trong thanh duyệt:
  - chỉ áp dụng cho `status === 'nhap'`; không xoá sự kiện đang theo dõi/hoàn thành/đã huỷ;
    kiểm tra lại status ngay trước khi xoá, mục đã đổi trạng thái thì bỏ qua và báo;
  - `window.confirm` nêu số lượng và tối đa 3 tiêu đề đầu;
  - xoá cứng bằng `deleteEvent()` hiện có, dùng `Promise.allSettled`, cập nhật store cho mục
    xoá thành công; toast `Đã xoá N nháp.` khi tất cả thành công, hoặc
    `Đã xoá X/Y nháp.` kèm lỗi nếu có mục thất bại;
  - không có undo; xác nhận là chốt an toàn.
- **Huỷ mềm:** trạng thái `huy` hiện có vẫn dùng được qua nút chuyển trạng thái; không trộn
  với “Xoá nháp”. Giải thích ngắn trong UI nếu cả hai cùng hiện.

### D4 — Chống trùng khi quét lại / paraphrase

- **Giữ nguyên dedup chắc chắn hiện có** (`isLikelyDuplicate`): chỉ bỏ khi tiêu đề trùng sau
  chuẩn hoá và thời điểm lệch ≤ 1 ngày (hoặc cả hai cùng thiếu thời điểm).
- **Gợi ý gần trùng** (chỉ hiển thị, không ghi DB):
  - Module thuần mới `src/core/extraction/similar.ts` (hoặc `dedup-suggest.ts`).
  - Đầu vào: danh sách `Event`; đầu ra: `Map<eventId, DuplicateSuggestion[]>` với tối đa
    3 gợi ý/sự kiện.
  - Tín hiệu:
    1. **Thời gian:** cùng ngày, hoặc lệch ≤ 1 ngày khi cả hai có `start.value`/`start.date`.
    2. **Tiêu đề:** Jaccard token sau khi bỏ dấu/stopword ≥ 0.5.
    3. **Văn bản:** Jaccard token của `quote` hoặc `summary` (ưu tiên quote) ≥ 0.6.
    4. **Hồ sơ chung:** giao `relatedProfiles` khác rỗng (tín hiệu yếu).
  - **Cổng thời gian (bắt buộc):** nếu cả hai đều có ngày xác định và lệch **> 1 ngày** thì
    không gợi ý, kể cả tiêu đề giống nhau. Khi một hoặc cả hai thiếu ngày, bỏ qua tín hiệu
    thời gian thay vì coi là “khớp”.
  - Chỉ gợi ý khi có **ít nhất 2 tín hiệu**, trong đó **bắt buộc có tín hiệu tiêu đề hoặc
    văn bản**; thời gian/hồ sơ chỉ là tín hiệu phụ để giảm false positive.
  - **Không dùng địa điểm có cấu trúc** vì `Event` không có trường này; địa điểm chỉ được
    so qua văn bản ở tín hiệu 3.
  - Bỏ qua chính nó và sự kiện `huy`; giới hạn 300 sự kiện để tránh O(n²) mất kiểm soát.
- **UI gợi ý:** thẻ thu gọn có chip **Có thể trùng** khi có gợi ý; trong chi tiết nháp,
  mục **Có thể trùng** hiện tiêu đề, ngày, nguồn và lý do (“cùng ngày”, “tiêu đề gần giống”,
  “cùng hồ sơ”). Nút:
  - **Mở bản kia** — nếu bản đối chiếu đang hiển thị: mở rộng và cuộn tới; nếu không
    (khác bộ lọc hoặc đang `dang_theo_doi`): thoát `reviewMode`, đặt bộ lọc trạng thái
    `all`, gán `expandedEventId`, rồi cuộn tới thẻ đó sau khi render;
  - **Giữ cả hai** — thêm cặp id vào `dismissedSuggestionKeys` (UI state, không lưu DB;
    khoá = hai id đã sắp xếp, nối bằng `|`) để không hiện lại trong phiên;
  - **Xoá bản này** — chỉ khi bản hiện tại là `nhap`, dùng xác nhận xoá hiện có.
- **Gộp nguồn (D4b — tuỳ chọn, không bắt buộc nghiệm thu):** nếu làm, chỉ gộp hai bản `nhap`,
  giữ bản người dùng chọn, hợp nhất `sources` (khử theo `documentId + quote`),
  `relatedProfiles`, `tags` (ưu tiên tags của bản sống, thêm từ bản kia đến tối đa 5),
  `summary` (khử trùng, ưu tiên bản sống, tối đa 50), `validation.uncertain`;
  giữ `createdAt` sớm nhất, `notifications` và `origin`/`extractionMeta` của bản sống,
  đặt `updatedAt` mới. **Chỉ xoá bản còn lại sau khi lưu bản sống thành công**; nếu lưu lỗi
  thì giữ nguyên cả hai. Nếu không làm, ghi rõ “gộp thủ công bằng sửa/xoá” trong `DEVIATIONS.md`.
- **Quét lại cùng trang:**
  - Nếu model trả cùng tiêu đề/thời điểm → dedup hiện có bỏ, `savedCount = 0`,
    `duplicateCount > 0`.
  - Nếu model paraphrase tiêu đề → có thể tạo nháp mới; nháp đó **phải** hiện gợi ý gần trùng,
    và không có hành vi tự gộp/xoá.
- Không tự xoá/gộp dữ liệu đã lưu.

### Không thuộc Slice D

- Nhắc việc sự kiện/KS-10, `chrome.alarms`, gán mốc thông báo.
- Gmail API, PDF/DOCX/OCR.
- Classifier TF-IDF.
- Đo recall/p95 và chốt model (Slice E).
- `versionHistory`/KS-12.
- Dataset chỉnh sửa để cải thiện model.

## 6. Quyết định đã chốt trước khi code

| # | Câu hỏi | Chốt |
|---|---|---|
| 1 | Nháp bị bỏ chọn khi duyệt thì xoá hay giữ? | **Giữ**. Bỏ chọn chỉ bỏ lựa chọn; muốn loại phải bấm “Xoá nháp đã chọn” + xác nhận. Ghi lệch KS-08 |
| 2 | Duyệt sự kiện chỉ có ngày / không có ngày? | **Vẫn cho duyệt** nhưng phải xác nhận; cảnh báo chưa xếp được nhắc việc. Không bịa `00:00`/ngày |
| 3 | Có duyệt cả nháp nhập tay không? | Có; review mode xếp `llm` trước, nhưng nút chỉ duyệt các mục được chọn |
| 4 | Confidence hiển thị thế nào? | Ba mức Thấp/Vừa/Cao, ngưỡng `<0.5`, `0.5–<0.8`, `≥0.8`; không hiển thị % |
| 5 | Gộp paraphrase có tự động không? | Không. Chỉ gợi ý; người dùng quyết định. D4b gộp nguồn là tuỳ chọn |
| 6 | Có thêm cột/trường dữ liệu mới không? | Không. Dùng `origin`, `extractionMeta`, `sources`, `validation` sẵn có; `reviewMode`/`reviewReturnStatus`/lựa chọn chỉ nằm trong UI state |
| 7 | Sắp xếp lại danh sách sự kiện toàn cục? | Không. Chỉ thêm `sortDraftsForReview()` cho chế độ duyệt |
| 8 | Có thông báo hệ điều hành khi duyệt xong? | Không. Dùng toast trong side panel; notification chỉ dành cho job trích xuất |
| 9 | Có ghi nhận chỉnh sửa để cải thiện model? | Không trong Slice D; ghi lệch KS-08 và để Slice E/classifier |

## 7. Thứ tự thực hiện và file tác động

1. **Xác nhận mốc code:** `git status`, `git log`; nếu Slice C chưa commit, hỏi người dùng
   có muốn commit trước khi bắt đầu D.
2. **Baseline quality gate:** `typecheck`, `lint`, `test`, `build` trước khi sửa.
3. **D1 — nền tảng hiển thị:**
   - `src/core/extraction/confidence.ts` (mới): `confidenceLevel()`, ngưỡng;
     chuyển `LOW_CONFIDENCE` từ `normalize.ts` sang đây để dùng chung.
   - `src/core/event-review.ts` (mới): `sortDraftsForReview()`, hàm cảnh báo thời điểm.
   - `src/shared/constants.ts`: `CONFIDENCE_TEXT`, `ORIGIN_TEXT`.
   - `src/ui/views/events.ts`: danh sách/lọc; tách `src/ui/views/event-card.ts` (mới) cho
     thẻ/chi tiết/badge/quote và `src/ui/views/event-review.ts` (mới) cho thanh duyệt,
     checkbox, gợi ý trùng — giữ mỗi file dưới ~300 dòng.
   - `src/ui/store.ts`: `reviewMode`, `reviewReturnStatus`, `selectedDraftIds`, `dismissedSuggestionKeys`.
   - `src/ui/actions/data.ts`: `applyFilterFromForm()` và `clearFilter()` giữ
     `status = 'nhap'` khi `reviewMode` thay vì đọc/ghi đè ô trạng thái bị ẩn.
   - `src/ui/styles.css`: thanh duyệt, checkbox, chip “Có thể trùng”, focus ring.
   - `src/ui/sidepanel.ts`: nút vào/thoát chế độ duyệt; notification bật `reviewMode`;
     xử lý `Escape`.
4. **D2 — duyệt hàng loạt:**
   - `src/ui/store.ts`: dùng `selectedDraftIds` đã thêm ở D1.
   - `src/ui/actions/review.ts` (mới): `toggleDraftSelection`, `selectAllVisibleDrafts`,
     `clearDraftSelection`, `bulkApproveDrafts` (allSettled, cảnh báo thời điểm);
     `src/ui/actions/events.ts` giữ CRUD hiện có; `src/ui/actions/index.ts` re-export.
   - `src/ui/sidepanel.ts`: action cases + `syncReviewSelectionUi()` sau render.
5. **D3 — sửa/xoá:**
   - `src/ui/actions/review.ts`: `deleteSelectedDrafts`.
   - `src/ui/views/event-review.ts`: nút sửa, nút xoá nháp, giải thích bỏ chọn ≠ xoá.
   - D3a nội tuyến chỉ làm nếu D1–D3 baseline đã xanh.
6. **D4 — gợi ý trùng:**
   - `src/core/extraction/similar.ts` (mới) + test thuần.
   - `src/ui/views/event-review.ts`: mục “Có thể trùng” + nút Giữ cả hai/Mở bản kia/Xoá.
   - D4b gộp nguồn chỉ làm sau khi D4a xanh và có test dữ liệu.
7. **Kiểm thử + tài liệu:** test mới, cập nhật `docs/kiem-thu-demo.md` (mục KS-08),
   tạo `docs/kiem-tra-slice-d.md` khi nghiệm thu, cập nhật `DEVIATIONS.md`,
   `docs/chuc-nang-demo-vs-chinh-thuc.md` (dòng S3), `README.md` §6, `AGENTS.md` §11 và
   `extension/README.md` nếu có file mới.
8. **Quality gate cuối + báo cáo nghiệm thu.** Chỉ commit khi người dùng đồng ý.

**Thứ tự commit gợi ý** (chỉ dùng khi được phép commit):

1. `feat(ui): hiển thị nguồn và độ tin cậy của sự kiện máy đề xuất`
2. `feat(events): thêm chế độ duyệt và duyệt hàng loạt sự kiện nháp`
3. `feat(events): xoá nháp có xác nhận`
4. `feat(extraction): gợi ý gộp sự kiện gần trùng`
5. `docs: chốt Slice D và cập nhật checklist`

## 8. Kiểm thử và tiêu chí nghiệm thu

### 8.1. Test tự động

| Nhóm | Nội dung |
|---|---|
| Confidence | Ngưỡng `<0.5`, `0.5`, `0.79`, `0.8`; manual không có confidence |
| Review order | `llm` trước `manual`; low-confidence/uncertain lên trước; không đổi `sortEvents()` |
| Review mode filter | Vào ghi nhớ status, ép `nhap`; `applyFilterFromForm()`/`clearFilter()` không ghi đè; thoát khôi phục status |
| Selection | Chỉ nháp hiện thị được chọn; prune khi đổi filter/trạng thái/xoá |
| Bulk approve | Chỉ mục được chọn đổi trạng thái; giữ `origin`/`sources`; lỗi từng phần giữ `nhap` |
| Date-only warning | Có `start.date`/không có ngày → cờ cảnh báo đúng; không sinh `00:00` |
| Duplicate suggest | Cùng ngày + tiêu đề gần giống → gợi ý; khác ngày → không; không mutate dữ liệu |
| Edit origin | Sửa tiêu đề/thời gian giữ `origin='llm'` và `extractionMeta` |
| UI jsdom | Badge “Máy đề xuất”, confidence, review bar, checkbox, nút duyệt/xoá |

Dùng fixture 5 candidate hoặc `MockProvider` để tạo 5 nháp cho test UI; không phụ thuộc
`llama-server` thật. Đo thời gian duyệt thủ công bằng đồng hồ bấm giây và ghi vào
`docs/kiem-tra-slice-d.md`.

### 8.2. Checklist thủ công

- [ ] 5 sự kiện nháp được duyệt trong **≤ 30 giây** mà không mở từng form.
- [ ] Chỉ các mục được chọn chuyển sang `dang_theo_doi`; mục khác giữ `nhap`.
- [ ] Badge **Máy đề xuất**, confidence và nguồn/quote hiển thị đúng; không có dữ liệu bịa.
- [ ] Manual không hiện confidence; confidence không hiện phần trăm.
- [ ] Quote dài hiện đầy đủ/`Xem đầy đủ`; nút **Mở nguồn** mở đúng URL.
- [ ] Chọn một phần → checkbox tổng `indeterminate`; “Chọn tất cả” chỉ chọn mục đang hiện.
- [ ] Duyệt nháp chỉ có ngày/không có ngày → có xác nhận cảnh báo; huỷ xác nhận thì không lưu.
- [ ] Bỏ chọn không xoá; “Xoá nháp đã chọn” có xác nhận và chỉ xoá nháp.
- [ ] Quét lại cùng trang hai lần (cùng output) → lần hai **0 bản ghi mới**.
- [ ] Paraphrase → có gợi ý “Có thể trùng”; không tự gộp/xoá.
- [ ] Side panel 320/360/400 px không tràn ở danh sách/chọn/duyệt.
- [ ] Chỉ dùng bàn phím: Tab tới checkbox/nút, focus ring rõ, `Escape` thoát chế độ duyệt.
- [ ] `typecheck`, `lint`, `test`, `build` xanh; test mới cho confidence/review/bulk approve/dedup.

### 8.3. Rủi ro và cách giảm

| Rủi ro | Cách giảm |
|---|---|
| Gợi ý trùng false positive gây nhiễu | Yêu cầu tín hiệu tiêu đề/văn bản + tín hiệu phụ; tối đa 3 gợi ý; nút “Giữ cả hai” |
| Duyệt nhầm hàng loạt | Chỉ duyệt mục được chọn; xác nhận khi thiếu giờ/ngày; toast X/Y; có thể “Về nháp” |
| Lỗi IndexedDB giữa chừng | `Promise.allSettled`; mục lỗi giữ `nhap` + giữ lựa chọn; báo rõ |
| `events.ts`/`actions.ts` vượt ~300 dòng | Tách `event-card.ts`, `event-review.ts`, `actions/review.ts` ngay từ D1 |
| Review mode làm đổi hành vi danh sách thường | Chỉ override trong `reviewMode`; không sửa `sortEvents()`/`filterEvents()` toàn cục |
| Người dùng hiểu nhầm đã có nhắc việc | Copy nói rõ KS-10 chưa có; `milestones` vẫn rỗng |

## 9. Lệch KS-08 cần ghi vào `DEVIATIONS.md`

| KS-08 | Demo Slice D | Lý do |
|---|---|---|
| Bước 4: sửa nhanh **tại chỗ** | Baseline mở form đầy đủ; D3a nội tuyến là tuỳ chọn | Giữ thay đổi nhỏ, tránh nhân đôi logic form; nếu D3a làm được thì ghi đã đáp ứng |
| Bước 4: ghi nhận chỉnh sửa để cải thiện chất lượng | Không thu thập | Chưa có dataset/feedback loop; để Slice E/classifier |
| Bước 5: mục bỏ chọn bị **loại khỏi danh sách nháp** | Bỏ chọn chỉ bỏ lựa chọn; xoá phải có xác nhận | Tránh xoá im lặng; người dùng có thể duyệt sau |
| Bước 7: thông báo **HOÀN THÀNH** | Toast trong side panel | Không thêm notification cho thao tác duyệt; notification hiện có chỉ cho job trích xuất |
| Kết quả: mốc thông báo mặc định theo KS-10 | `notifications.milestones = []` | KS-10 chưa làm; không hứa nhắc việc |
| — | Không có trường địa điểm | Schema 7 trường không có địa điểm; địa điểm nằm trong `summary`/`quote` |

## 10. Tài liệu tham chiếu

- [`kiem-tra-slice-c.md`](./kiem-tra-slice-c.md) — Slice C đã nghiệm thu, giới hạn.
- [`ke-hoach-llm-trich-xuat.md`](./ke-hoach-llm-trich-xuat.md) §10 — Slice D/E.
- [`script.md`](../script.md) KS-08 — hành vi duyệt sự kiện.
- [`AGENTS.md`](../AGENTS.md) §6 — mô hình `Event`, `status`, `origin`.
- [`DEVIATIONS.md`](./DEVIATIONS.md) — chỗ demo cố ý lệch kế hoạch.
