# Kiểm tra Slice C — offscreen job + thông báo

> **ĐÃ LƯU TRỮ (2026-10-24).** Biên bản nghiệm thu Slice C đã đóng; không dùng làm nguồn
> hiện hành. Tóm tắt kiến trúc, giới hạn và bàn giao sang Slice D nằm ở
> [`ban-giao-slice-d.md`](../ban-giao-slice-d.md) §2–§3. Giữ lại để tra cứu checklist
> KT-C và hợp đồng job tại thời điểm nghiệm thu.

> **Trạng thái (2026-10-24): đã nghiệm thu.** Job trích xuất chạy trong offscreen document,
> lưu tiến trình vào `chrome.storage.session`, đóng side panel không làm mất lần chạy,
> huỷ được và có thông báo khi xong. Người dùng xác nhận Slice C đạt nghiệm thu ngày
> 2026-10-24; checklist thủ công §5 được đóng theo xác nhận đó (không lưu log từng lần chạy).
>
> Phạm vi đúng theo [`ke-hoach-llm-trich-xuat.md`](../ke-hoach-llm-trich-xuat.md) §10 —
> Slice C. **Không** gồm nhắc việc sự kiện (`chrome.alarms`, KS-10), duyệt hàng loạt
> (Slice D) hay đo chất lượng (Slice E). Bàn giao sang Slice D:
> [`ban-giao-slice-d.md`](../ban-giao-slice-d.md).

---

## 1. Kiến trúc sau Slice C

```text
Side panel
  │ RUN_EXTRACTION / CANCEL_EXTRACTION  (to: background)
  ▼
Service worker
  ├─ chrome.storage.session: extraction_job  (job bền theo phiên trình duyệt)
  ├─ chrome.offscreen.createDocument(...)    (tối đa 1)
  └─ notification khi job xong / lỗi
        │ RUN_EXTRACTION / CANCEL_EXTRACTION  (to: offscreen)
        ▼
Offscreen document
  ├─ đọc document + profiles + events + LlmSettings từ IndexedDB
  ├─ LlamaCppProvider.health()
  ├─ core/extraction/pipeline.ts
  └─ ghi Event(status='nhap') + gửi JOB_PROGRESS / JOB_DONE / JOB_FAILED / JOB_CANCELLED
```

`chrome.runtime.sendMessage` phát tới **mọi** context của extension, nên message job có
trường `to: 'background' | 'offscreen'`; mỗi phía bỏ qua message không đúng đích.

## 2. Tệp chính

| Tệp | Vai trò |
|---|---|
| `src/platform/background/index.ts` | Nhận yêu cầu, tạo job, điều phối offscreen, ghi trạng thái, notification |
| `src/platform/background/jobs.ts` | Tạo/patch/đọc/ghi `ExtractionJob`; validate bằng Zod |
| `src/platform/background/offscreen-document.ts` | `ensure` / `close` / gửi message cho offscreen (có retry) |
| `src/platform/background/notifications.ts` | Notification xong/lỗi, mở side panel, fallback badge |
| `src/platform/offscreen/index.html` | Trang offscreen được Vite/CRXJS bundle |
| `src/platform/offscreen/main.ts` | Cầu nối `chrome.runtime`, `AbortController`, gửi tiến trình |
| `src/platform/offscreen/run-job.ts` | Chạy pipeline + lưu nháp; nhận dependency để test |
| `src/shared/messages.ts` | Union message job + `RuntimeMessageSchema` (Zod) |
| `src/ui/actions/extract.ts` | Side panel gửi job/huỷ, áp trạng thái, toast, chuyển tab khi xong |
| `src/ui/sidepanel.ts` | Khôi phục job khi mở panel; nghe `storage.onChanged`; mở tab từ notification |

## 3. Hợp đồng job

`ExtractionJob` giữ các trường cũ và thêm kết quả:

| Trường | Ý nghĩa |
|---|---|
| `status` | `queued` → `running` / `persisting` → `done` / `failed` / `cancelled` |
| `stage` | Câu tiếng Việt đang hiển thị trong thẻ tiến trình |
| `chunkIndex` / `chunkCount` | Tiến trình theo đoạn |
| `candidateCount` | Tổng candidate model trả về (trước dedup) |
| `savedCount` | Số sự kiện nháp đã ghi DB |
| `duplicateCount` | Số candidate bị bỏ vì trùng |
| `truncated` | Tài liệu bị cắt do vượt `maxChunks × chunkChars` |

Bản ghi job cũ thiếu `savedCount` / `duplicateCount` / `truncated` vẫn đọc được với mặc định
`0 / 0 / false`.

## 4. Hành vi đã cài

1. **Bắt đầu:** side panel gửi `RUN_EXTRACTION`; service worker từ chối nếu đang có job
   `queued/running/persisting`, nếu không thì tạo job và tạo offscreen theo nhu cầu.
2. **Đóng side panel:** job vẫn chạy trong offscreen; mở lại panel đọc job từ
   `chrome.storage.session` và hiện lại tiến trình.
3. **Xong:** background đóng offscreen, ghi `done`, hiện notification. Bấm notification
   (hoặc nút) mở side panel ở tab **Sự kiện**, lọc **Nháp**; nếu Chrome chặn
   `sidePanel.open()` thì đặt badge `!` làm fallback.
4. **Huỷ:** side panel gửi `CANCEL_EXTRACTION`; background gửi tín hiệu cho offscreen,
   đóng offscreen rồi ghi `cancelled` ngay (không chờ `JOB_CANCELLED`, tránh kẹt job).
   Offscreen `abort()` provider và kiểm tra `signal` trước mỗi lần ghi DB; message
   hoàn tất đến muộn bị bỏ qua.
5. **Lỗi:** job chuyển `failed`, giữ `error`, đóng offscreen và hiện notification lỗi.
6. **Tắt trình duyệt:** `chrome.storage.session` bị xoá và offscreen biến mất; không resume.
7. **Kết quả:** mọi sự kiện do LLM tạo vẫn có `status = 'nhap'`, `origin = 'llm'`,
   `sources` trỏ về `documentId`.

## 5. Checklist thủ công (đã đóng theo nghiệm thu 2026-10-24)

- [x] **KT-C-01** — Server tắt: bấm Trích sự kiện → job `failed`, có thông báo lỗi, không treo UI.
- [x] **KT-C-02** — Trang thật + server chạy: bấm Trích → đóng side panel ngay → mở lại thấy tiến trình.
- [x] **KT-C-03** — Để job chạy xong khi panel đóng → notification hiện đúng số sự kiện nháp.
- [x] **KT-C-04** — Bấm notification → side panel mở đúng tab **Sự kiện**, lọc **Nháp**.
- [x] **KT-C-05** — Huỷ giữa lúc gọi model → job `cancelled`, không có sự kiện mới.
- [x] **KT-C-06** — Huỷ trong lúc đang ghi DB → không còn sự kiện nào được ghi thêm.
- [x] **KT-C-07** — Bấm Trích lần hai khi job đang chạy → bị từ chối, job cũ không đổi.
- [x] **KT-C-08** — Quét cùng trang hai lần → lần hai báo số trùng, không nhân đôi sự kiện.
- [x] **KT-C-09** — Tắt/mở lại trình duyệt giữa chừng → không còn job cũ.
- [x] **KT-C-10** — Side panel 320/360/400 px → thẻ tiến trình và toast không tràn.
- [x] **KT-C-11** — `chrome://extensions` → service worker bị dừng (Stop) giữa chừng → job vẫn xong và có notification.
- [x] **KT-C-12** — Kiểm tra `chrome.storage.session` không còn job rác sau khi xong (job cuối được giữ để hiển thị; job mới ghi đè).

## 6. Kết quả tự động (2026-10-23)

```bash
cd extension
npm run typecheck   # xanh
npm run lint        # xanh
npm test -- --run   # 180 test / 21 file
npm run build       # xanh; dist/src/platform/offscreen/index.html + assets/offscreen-*.js
```

Test mới:

- `tests/platform/jobs.test.ts` — tạo/patch job, trạng thái active, đọc job cũ, bỏ dữ liệu hỏng.
- `tests/platform/offscreen-job.test.ts` — chạy pipeline thật với `MockProvider`, lưu nháp,
  dedup với sự kiện có sẵn, tài liệu biến mất, tiến trình `persisting`, và dừng ghi DB
  khi bị huỷ giữa lúc lưu.
- `tests/shared/contracts.test.ts` — mặc định trường kết quả + validate `RuntimeMessageSchema`.

## 7. Giới hạn / việc còn lại

- Đã nghiệm thu thủ công; không có bảng đo latency riêng sau khi chuyển sang offscreen —
  việc đo chất lượng và p95 thuộc **Slice E**.
- Không resume sau khi tắt trình duyệt (đúng phạm vi đã chốt).
- Nếu offscreen bị Chrome đóng bất ngờ, job có thể kẹt `running`; người dùng bấm Huỷ để
  chuyển `cancelled` rồi chạy lại. Chưa có watchdog/heartbeat.
- Notification chỉ dùng **1 nút**; giới hạn 2 nút của Chrome vẫn giữ cho KS-10 sau này.
- Nhắc việc sự kiện (`chrome.alarms`, mốc 1 tuần / 1 ngày / ngày diễn ra) **chưa làm** —
  thuộc KS-10, không phải phạm vi Slice C này.
- Review hàng loạt, badge “Máy đề xuất”, gộp trùng gợi ý vẫn thuộc Slice D.

## 8. Chốt Slice C

| Hạng mục | Trạng thái |
|---|---|
| Code offscreen + job + notification | ✅ Xong |
| Quality gate gần nhất | ✅ `typecheck`, `lint`, `test` (180 test / 21 file), `build` — 2026-10-23 |
| Nghiệm thu thủ công | ✅ Người dùng xác nhận ngày 2026-10-24 |
| Tài liệu | ✅ Trang này + `ke-hoach-llm-trich-xuat.md` + [`ban-giao-slice-d.md`](../ban-giao-slice-d.md) |
| Commit | ⏳ Chưa commit tại thời điểm chốt; thay đổi Slice C vẫn ở working tree |
| Việc tiếp theo | **Slice D** — duyệt nháp, badge/confidence, bulk approve, chống trùng |

**Điều kiện bắt đầu Slice D:** giữ nguyên các quyết định của Slice C (local-only, job
offscreen, draft `nhap`), không mở rộng sang KS-10/Gmail, và đọc
[`ban-giao-slice-d.md`](../ban-giao-slice-d.md) trước khi sửa code.
