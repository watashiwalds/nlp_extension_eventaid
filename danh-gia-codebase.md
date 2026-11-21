# Đánh giá codebase & ý tưởng — Trích xuất và quản lý lịch trình cá nhân

> **Ngày đánh giá:** 21/11/2026 · **Commit:** `8b2717c` (working tree sạch)
> **Phương pháp:** QA kỹ thuật trực tiếp trên mã nguồn — chạy `typecheck` / `lint` / `build` / `test`,
> đọc pipeline, so đối chiếu ý tưởng (`base_idea.md`) với code thực tế và các tài liệu tự khai báo.
> File đi kèm: [`ke-hoach-hanh-dong.md`](ke-hoach-hanh-dong.md) (kế hoạch sửa theo ưu tiên).

---

## 1. Tóm tắt hiện trạng

Ý tưởng gốc (`base_idea.md`) yêu cầu: đọc nội dung từ **mail/PDF/attachment**, phân loại có sự kiện,
so khớp với hồ sơ cá nhân, quản lý CRUD và **thông báo khi sự kiện đến**. Codebase thực tế là một
extension MV3 làm được ~70% vòng lặp đó nhưng **chỉ trên 1 kênh đầu vào (trang web + dán văn bản)**:

- Trích xuất LLM cục bộ có kiểm chứng ngày giờ — **khá tốt, có số đo thật trên 4 model**.
- Duyệt nháp / chống trùng / quản lý sự kiện — **hoạt động**, đã nghiệm thu tay (Slice D).
- **Nhắc việc (`chrome.alarms`) không có một dòng code nào** — `grep` toàn `src/` trả 0 kết quả.
- Gmail/PDF/DOCX — chỉ thay bằng "Dán văn bản" (`parse.ts:102-110`).
- Sàng lọc PhoBERT (F2) đã nối vào job nhưng đang ở chế độ `report`
  (`contracts.ts:202`) — **không bỏ qua được lần gọi LLM nào**.

Chất lượng kỹ thuật thực chất **tốt hơn nhiều tài liệu mô tả** (test 437, không phải 405/358 như
tài liệu ghi), nhưng **3 test đang đỏ trên HEAD** và các tài liệu đối chiếu đã lệch nghiêm trọng
so với code.

**Kết quả chạy thực tế:**

| Lệnh | Kết quả |
|---|---|
| `npm run typecheck` | ✅ 0 lỗi |
| `npm run lint` | ✅ 0 lỗi |
| `npm run build` | ✅ pass |
| `npx vitest run` | ❌ **3 failed / 415 passed / 19 skipped (437 test, 44 file)** |

Test fail: `tests/core/event-review.test.ts` (2) và `tests/ui/smoke.test.ts` (1) — nguyên nhân ở §5.1.

---

## 2. Đánh giá độ rộng và mức độ tập trung

**Verdict: KHÔNG quá rộng về code, nhưng đang LỆCH TRỌNG TÂM về narrative — và đang có nguy cơ
báo cáo tập trung vào mắt xích yếu nhất.**

Bằng chứng:

- **Ba "trục" song song, chỉ một trục được đo:**
  1. Trích xuất LLM — có eval thật, có số đo, có quyết định model.
  2. Sàng lọc PhoBERT — có code F2 nhưng **không có một artifact đo lường nào**
     (`tests/fixtures/filter/` không tồn tại, `tests/eval/filter.eval.test.ts` không tồn tại,
     `docs/ket-qua-bo-loc.md` không tồn tại — dù kế hoạch `docs/ke-hoach-bo-loc-noi-dung.md`
     §11.2–11.3 đã hứa).
  3. Provider remote (KS-14) — có code + test unit nhưng **chưa chạy nổi một lần thật với
     Gemini/Cloudflared** (2 lần sửa bug đều là "giả thuyết chưa xác nhận" —
     `docs/kiem-thu-demo.md` §8).
- **Điểm nghẽn narrative nghiêm trọng nhất:** khung báo cáo `bao-cao/noi-dung/05-thuc-nghiem.md`
  bắt buộc mục 5.2 viết về "Mô hình PhoBERT: kiến trúc, fine-tuning, dataset, epochs, LR, batch…"
  — nhưng trong repo **không tồn tại** dataset, script huấn luyện, hay bất kỳ số liệu accuracy nào
  cho PhoBERT. `ml_hasevent_filter/` chỉ có model weights + `training_args.bin` (file pickle lộ
  đường dẫn Google Drive `/content/drive/MyDrive/NLP_TASK_NON_TASK/...`). Nếu viết mục 5.2 mà
  không xin được số liệu từ nhóm bàn giao, sẽ phải bịa — hoặc phải chuyển trọng tâm báo cáo.
- **Sai lệch ngữ nghĩa model:** `app.py:54-56` mô tả model là "Phát hiện các câu **giao việc**
  (TASK)" — không phải "phát hiện sự kiện lịch". Extension đang dùng nó làm bộ lọc sự kiện cấp
  tài liệu (`run-job.ts` → `aggregateDecision`). Đây là phép chiếu khái niệm, chưa được chứng minh.
- **Sản phẩm lõi chưa khép vòng:** `base_idea.md:22` yêu cầu "Cách thông báo khi có sự kiện đến" —
  `chrome.alarms` không tồn tại. Phần "quản lý lịch" — một nửa tên đề tài — hiện chỉ là CRUD +
  badge "đã qua".

**Kết luận:** Phạm vi code hợp lý cho một demo môn học; vấn đề là **cam kết narrative đang trải
trên 3 trục trong khi chỉ trục 1 có bằng chứng**. Cần chọn 1 lõi và kể câu chuyện quanh nó.

---

## 3. Mức độ giải quyết vấn đề cốt lõi

**Verdict: Giải quyết KHÁ TỐT phần "trích xuất có kiểm chứng" (~7/10); CHƯA TRIỆT ĐỂ phần
"quản lý lịch" (~3/10) và phần "so khớp hồ sơ" (~5/10).**

### 3.1. Những gì làm đến tận gốc

- **Không bịa ngày giờ — có kiểm chứng hai lớp:** model đề xuất → `normalize.ts` đối chiếu
  ngày/tháng/năm/giờ với văn bản gốc trước khi chấp nhận. `yearInferrable()`
  (`normalize.ts:49-55`) yêu cầu raw phải nêu đúng ngày/tháng, không chứa năm nào, và năm trả về
  phải trùng năm ngữ cảnh. `vague-time.ts` dùng **cùng một bảng** cho cả prompt lẫn verifier —
  model đề xuất giờ ngoài bảng sẽ bị từ chối.
- **Pipeline có kiến trúc sạch:** `pipeline.ts` chia đoạn → prompt → provider → parse (retry 1 lần)
  → normalize → khớp hồ sơ → dedup; `core/` thuần không đụng `chrome.*`, chạy được cả trong Node.
- **Phòng thủ nhiều lớp đúng chỗ:** consent kiểm tra 2 lần (UI `extract.ts:132-139` + job
  `run-job.ts:187-188`), fail-open khi sàng lọc chết (`run-job.ts:151-154`), chống prompt injection
  có fixture riêng E13.

### 3.2. Những mắt xích yếu / hở (theo thứ tự nghiêm trọng)

1. **Nhắc việc — yêu cầu cốt lõi của đề tài — hoàn toàn vắng mặt.** `notifications.milestones`
   tồn tại trong schema nhưng luôn rỗng (`events.ts:160`); `chrome.alarms` 0 tham chiếu. Sự kiện
   không có `start.value` bị loại khỏi milestone nhưng **không có bộ lập lịch nào để loại**.
2. **Ngày tương đối là lỗ hổng của chính cơ chế "không bịa":** `normalize.ts:172-177` — khi
   `isRelative && hasTime`, ngày model tự quy đổi ("Thứ Ba tuần sau" → bất kỳ ngày nào) được
   **chấp nhận nguyên vẹn** mà không có verifier tất định nào; chỉ gắn cờ `ngay_tuong_doi`. Cả 4
   model đều fail E10 (trả `start=null`), nhưng nếu một model trả **sai ngày kèm giờ**, normalize
   sẽ nuốt trọn. Guard "0 ngày bịa" chỉ bảo đảm tuyệt đối cho ngày tuyệt đối.
3. **So khớp hồ sơ không được đo:** `profile-match.ts` (274 dòng heuristic có trọng số) chỉ được
   test tất định trên đúng 1 fixture (E15). Trường `ExpectedEvent.profileNames` (`metrics.ts:26`)
   **không bao giờ được dùng trong `computeMetrics()`** — không có precision/recall profile.
4. **Chống trùng chỉ ở mức tiêu đề trùng khít:** `dedup.ts:27-41` yêu cầu normalized title giống
   hệt + lệch ≤ 1 ngày. Đo thật E12 paraphrase: 9B/4B/PQ2_0 đều **0 gợi ý trùng** — nhánh "gợi ý
   paraphrase" gần như chưa được chứng minh trên model thật.
5. **Sàng lọc PhoBERT hiện không mang lại giá trị đo được:** `DEFAULT_FILTER_MODE = 'report'`
   (`contracts.ts:202`) → job **luôn gọi LLM** (`run-job.ts:206` chỉ skip khi `mode === 'screen'`).
   Dò tay ghi trong AGENTS §11: 4 tài liệu âm → **không tài liệu nào bị skip** (2 uncertain,
   2 false positive). Chi phí: thêm 1 dịch vụ Python + độ trễ, đổi lại 0 lần gọi LLM tiết kiệm.

---

## 4. Điểm mạnh nhất, quan trọng nhất đã làm được

**#1 — Lõi trích xuất CÓ KIỂM CHỨNG (grounded extraction) + harness đo thật trên model thật.**
Đây là tài sản quý nhất và nên là **trung tâm của báo cáo**.

| Thành phần | File | Bằng chứng |
|---|---|---|
| Verifier ngày giờ | `src/core/extraction/normalize.ts` (391 dòng) | Từ chối ngày không khớp nguồn (`ngay_khong_khop`), không tự điền `T00:00`, suy năm/giờ mơ hồ phải qua điều kiện chặt và luôn gắn cờ `nam_suy_doan`/`gio_suy_doan` |
| Bảng giờ mơ hồ dùng chung 2 phía | `src/core/extraction/vague-time.ts` | Model đề xuất giờ ngoài bảng → bị từ chối, giữ hành vi an toàn |
| Harness đo tất định + live | `tests/eval/{metrics,case-harness}.ts`, `extraction.live.eval.test.ts` | Metric tự kiểm chứng fixture (`extraction.eval.test.ts:27-66`); live suite gate bằng `LLAMA_EVAL=1`, in bảng đầy đủ |
| Kết quả đo thật | `docs/ket-qua-danh-gia-slice-e.md` | **4 model** đo bằng `llama-server` thật: 9B IQ4_XS v5 recall **88,0%/87,0%**, **0 ngày bịa**, 0 JSON lỗi, p95 35,2s; PQ2_0 88,0%/82,6%, p95 6,6s; 4B bị loại vì recall 72,7% < 80%; 27B bị loại vì p95 127,3s > 90s — **quyết định dựa trên số đo, không hạ ngưỡng** |

**Vì sao đây phải là trung tâm báo cáo:**

- Nó giải quyết đúng phần khó nhất của bài toán tiếng Việt (ngày giờ, giờ mơ hồ, chống
  hallucination) — thứ mà "chỉ gọi LLM" không có.
- Nó có số đo, có ngưỡng nghiệm thu, có quyết định loại model — chuyển dự án từ "demo gọi API"
  thành "hệ thống có bằng chứng".
- PhoBERT là **model bàn giao, không phải phần nhóm mình làm**; phần tự làm cho PhoBERT chỉ là
  client + wiring. Nếu để PhoBERT làm trung tâm, đóng góp chính bị đặt vào thành phần không được
  sửa và chưa đo được.

**Hai phần còn lại là phụ trợ:** offscreen job + review UI (kỹ thuật tốt nhưng là "kỹ sư hệ
thống", không phải "nghiên cứu"), và PhoBERT screening (chưa có số đo — chỉ được kể là "bước
thí nghiệm đang mở").

---

## 5. Các vấn đề QA kỹ thuật cần khắc phục

### P0 — phải sửa trước khi demo/báo cáo

1. **Test đỏ trên HEAD, nguyên nhân là time bomb.** `tests/core/event-review.test.ts` (2 test) và
   `tests/ui/smoke.test.ts:212` fail vì fixture cố định ngày 2–5/11/2026 nhưng
   `sortDraftsForReview()` mặc định `new Date()` và `overviewView` → `upcoming()` tự gọi
   `new Date()` bên trong (`overview.ts:59`). Hôm nay 21/11/2026 → sự kiện rơi vào nhóm "đã qua",
   "Sắp diễn ra" trống. **CI sẽ đỏ từ 06/11 trở đi.** Sửa: inject `now` vào view/hàm sort, test
   truyền `NOW` cố định.
2. **Tài liệu đối chiếu lệch code ở mức gây hiểu sai.** `README.md:15,62,97,128,160` và
   `docs/chuc-nang-demo-vs-chinh-thuc.md:13,51,74,99-100,172` vẫn ghi Slice F "chưa triển khai"
   trong khi code đã có F0–F2; `DEVIATIONS.md:39` + `AGENTS.md:277` ghi "405 test pass" — thực tế
   437 test với 3 fail; `README.md:76` ghi 358/36; `package.json` description còn ghi
   "khong dung mo hinh hoc may" trong khi dự án dùng LLM + PhoBERT.
3. **Lỗ hổng ngày tương đối** (`normalize.ts:172-177`) — xem §3.2. Đây là lỗi thiết kế của chính
   tính năng "không bịa", không phải bug vặt.
4. **F3 hoàn toàn không có artifact** dù kế hoạch đã cam kết (`ke-hoach-bo-loc-noi-dung.md`
   §11.2–11.4). Hiện trạng: không fixture âm, không eval, không kết quả → **không được tuyên bố
   "sàng lọc giúp tiết kiệm gọi LLM"** ở bất kỳ đâu.
5. **Mục 5.2 báo cáo yêu cầu số liệu fine-tuning PhoBERT mà repo không có.** Phải xin từ nhóm bàn
   giao hoặc viết lại phạm vi mục đó — tuyệt đối không tự điền số.

### P1 — nên sửa

6. **Bằng chứng đo thật không tái lập từ repo.** Toàn bộ log JSON nằm ở `/tmp/opencode/*.log`
   (đã xác nhận thư mục hiện không còn file nào). Cần commit log/JSON xuất ra `docs/evidence/`
   kèm config model để ai cũng chạy lại được.
7. **Metric eval quá hẹp.** Chỉ khớp tiêu đề (Jaccard ≥ 0,5) + ngày (≤ 1 ngày) —
   `metrics.ts:71-110`; không đo label/summary/end/uncertain/profile. 17 fixture tự soạn vs 150
   golden; 1 người gán nhãn, 2 lần chạy. Recall 88% trên 17 mẫu **không** ngoại suy được cho dữ
   liệu thật.
8. **Repo hygiene.** `model.safetensors` 515MB nằm trong git (`.git` đã 486MB); 2 file
   `__pycache__/*.pyc` bị track dù `.gitignore` có; `training_args.bin` (pickle — rủi ro thực thi)
   lộ đường dẫn cá nhân; `.idea/` bị track.
9. **Remote provider chưa được xác nhận thật.** 2 fix Gemini (404, 400) đều là giả thuyết. Đừng
   viết "đã hỗ trợ Gemini" trong báo cáo; viết "đã có code, chờ kiểm chứng endpoint thật".

### P2 — hardening

10. `FilterSettingsSchema.endpoint` chỉ validate `z.string().url()` — chặn loopback chỉ nằm ở UI
    (`validateFilterEndpoint`); đường lưu cài đặt (`saveFilterSettings`) chấp nhận mọi URL. Nên
    chặn loopback ở tầng storage/client.
11. Suy năm qua ranh giới năm mới: văn bản viết "5/1" vào tháng 12 sẽ bị suy thành năm hiện tại
    thay vì năm sau — chưa có test.
12. `durationMinutes` trả `null` khi end < start → sự kiện qua đêm không có thời lượng; chưa xử lý.

---

## 6. Kết luận

Codebase này **tốt hơn những gì tài liệu của chính nó đang nói** — nhưng cũng **y hơn những gì
khung báo cáo đang đòi hỏi**. Ba việc quyết định trước khi trình bày:

1. Cắm mốc câu chuyện vào phần làm tốt nhất: **trích xuất có kiểm chứng + đo thật trên model**.
2. Vá 3 lỗ hổng P0 (test time bomb, tài liệu lệch, ngày tương đối).
3. Quyết định số phận PhoBERT trong narrative: hoặc đo thật (F3), hoặc kể trung thực là
   "thí nghiệm đang mở".

Chi tiết từng việc: [`ke-hoach-hanh-dong.md`](ke-hoach-hanh-dong.md).
