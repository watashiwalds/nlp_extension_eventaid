# Bản đồ phạm vi cải thiện báo cáo — TASK ↔ Báo cáo ↔ Codebase

> **Nguồn so khớp:**
> 1. `bao-cao/Bao_cao_NLP_FINAL_Lan1.docx` — báo cáo thật (giống hệt bản ở root, md5 `9347b164…`; bản PDF cùng tên đi kèm).
> 2. `bao-cao/caithienbaocao.md` — kế hoạch 10 TASK.
> 3. Codebase `extension/` (**loại trừ** nội dung huấn luyện PhoBERT — `ml_hasevent_filter/` chỉ đọc, không sửa).
>
> **Quy ước:** tham chiếu báo cáo theo mục (§4.6, §5.3.2…) kèm trích dẫn ngắn để Ctrl+F trong Word.
> Hai tài liệu có sẵn trong repo viết gần trùng nội dung này, dùng làm nguồn chi tiết file:line:
> [`danh-gia-codebase.md`](../danh-gia-codebase.md) (đánh giá QA) và [`ke-hoach-hanh-dong.md`](../ke-hoach-hanh-dong.md) (kế hoạch P0/P1/P2).

---

## 0. Bảng tổng hợp

| TASK | Vấn đề nằm ở đâu trong báo cáo | Tài nguyên code có sẵn | Phải tạo mới | Mục báo cáo phải sửa |
|---|---|---|---|---|
| 01 Ablation hậu kiểm | §5.3.2, §6.1: kết luận "0 ngày giờ bịa" **chưa có đối chứng Raw LLM** | `normalize.ts`, `vague-time.ts`, harness đo thật, E01–E17 | Chế độ Raw (bỏ hậu kiểm) + bảng so sánh | §5.3 (mục mới), §6.1 |
| 02 Gold set + matching | §5.3.1–5.3.2: gold đổi 25→23 giữa 2 lượt; **chưa định nghĩa matching** | `tests/eval/metrics.ts` (matching hiện có), fixtures có gold | Spec matching + metric field-level | §5.3.1, Bảng 5.1 |
| 03 Held-out test set | §5.3.1 (17 mẫu tự soạn), §6.2 thừa nhận | Khung `EvalCase`, hướng dẫn soạn ca có sẵn | 40–50 văn bản + gold | §5.3 (mục mới), §6.2 |
| 04 Off/Report/Screen | §5.4, §5.5, §6.2: **tự thừa nhận chưa đo đầu cuối** | `run-job.ts` (đã log đủ chỉ số sàng lọc), 3 chế độ hoạt động | Harness eval 3 chế độ | §5.4 (viết lại), §5.5, §6.1, §6.2 |
| 05 Baseline rule-based | §2 đã dẫn HeidelTime/SUTime; §6.3 nêu là định hướng | `core/dates.ts` + regex trong `normalize.ts` + `vague-time.ts` | Parser rule-based trong `tests/eval/` | §5.3/§5.4 (mục mới) |
| 06 PhoBERT độ tin cậy | §5.2 (200 câu, 42 test) | **Ngoài codebase** — chỉ client wiring thuộc TASK 04 | Dataset/nhãn ngoài repo | §5.2, §6.2 (giữ giới hạn) |
| 07 Screenshot UI | Chỉ có Hình 4.1 (sơ đồ), **không có ảnh sản phẩm thật** | UI 5 tab hoàn chỉnh, chạy được | 3–5 ảnh chụp + caption | Chương 4, danh mục hình |
| 08 Repo + README | Không có link repo trong báo cáo | README root **lệch code**; `extension/README.md` chuẩn; CI có | Đồng bộ README, dọn repo trước khi public | §5.1 + link |
| 09 Bảng phân công | Bìa có 2 SV, **chưa có bảng phân công** | Lịch sử git làm bằng chứng thực tế | Bảng phân công | §1.5 hoặc phụ lục |
| 10 Hình thức | Toàn báo cáo | — | Checklist hình thức | Bìa, mục lục, toàn văn |

---

## 1. Chi tiết từng TASK

### TASK 01 — Ablation hậu kiểm ngày giờ (P0)

- **Trong báo cáo:** §4.6 mô tả 3 bộ lọc hậu kiểm; §5.3.2 kết thúc bằng *"không ghi nhận trường hợp bịa đặt ngày giờ… cơ chế hậu kiểm có tác dụng kiểm soát lỗi thời gian trên tập đánh giá đã khảo sát"*; §6.1 ghi *"0 ngày giờ bịa đặt, 100% đầu ra đúng cấu trúc JSON"*. Không có lượt chạy đối chứng nào không qua hậu kiểm.
- **Code có sẵn:**
  - Lớp hậu kiểm: `extension/src/core/extraction/normalize.ts` (391 dòng — `nam_suy_doan`, `gio_suy_doan`, `ngay_khong_khop`, `yearInferrable()`), bảng dùng chung `core/extraction/vague-time.ts`.
  - Điểm gọi hậu kiểm trong pipeline: `core/extraction/pipeline.ts:126` (`normalizeEvents`) — **khuyến nghị không sửa pipeline**; viết harness riêng trong `tests/eval/` chạy: chunk → prompt → `provider.run` → `parseRawExtraction` → chấm trực tiếp `RawEvent` (bỏ normalize), so với chạy pipeline đầy đủ.
  - Harness đo thật: `tests/eval/extraction.live.eval.test.ts` (gate `LLAMA_EVAL=1`, biến `LLAMA_ENDPOINT`; đã ghi `providerCalls`, `latencyMs`, xuất JSON giữa `SLICE_E_LIVE_JSON_BEGIN/END`).
  - Bộ mẫu: `tests/fixtures/eval/cases-{a,b,c}.ts` (E01–E17), mốc thời gian cố định `EVAL_NOW` trong `case-types.ts`.
- **Khoảng trống:** chế độ Raw; việc lưu raw output (log các lần đo cũ nằm ở `/tmp`, đã mất — xem `danh-gia-codebase.md` §5 mục P1-6); các cột date/start/end accuracy, số trường bị chặn/loại nhầm.
- **Sửa báo cáo:** thêm mục con mới trong §5.3 (bảng Raw LLM vs LLM + Post-check); viết lại câu kết luận §5.3.2 và gạch đầu dòng §6.1 bằng số liệu có đối chứng; §1.4 (gạch *"đều được kiểm chứng ở các phần sau"*) chỉ giữ nếu ablation xong.
- **Phụ thuộc:** dùng metric field-level của TASK 02; chạy trên máy có `llama-server` + model 9B IQ4_XS (hoặc PQ2_0).

### TASK 02 — Chốt gold set và tiêu chí matching (P0)

- **Trong báo cáo:** §5.3.1 *"17 mẫu… 25 sự kiện kỳ vọng trong lượt chạy đầu"*; §5.3.2 phải tự chú thích *"25 ở lượt 1 và 23 ở lượt 2… không được xem là phép so sánh trực tiếp"* — dấu hiệu gold chưa đóng băng; Bảng 5.1 (recall 20/22, 18/20…) tính theo tiêu chí chưa được mô tả.
- **Code có sẵn:**
  - Matching hiện tại: `tests/eval/metrics.ts:71–146` — tiêu đề khớp khi trùng khít qua `normalizeTitleKey` hoặc Jaccard token ≥ 0,5; cổng ngày lệch ≤ 1 ngày (`passesDateGate`); ghép 1-1 tham lam (`matchExpected`). Đây chính là **bản nháp matching specification** cần diễn giải thành văn bản.
  - Gold: trường `expected[]` trong `EvalCase` (`tests/fixtures/eval/case-types.ts`) — đã có `startValue/startDate/endValue/label/uncertain/profileNames` và `allowedDates` (ngày được phép xuất hiện).
  - Lỗ hổng đã biết: `ExpectedEvent.profileNames` (metrics.ts:26) **không bao giờ được dùng** trong `computeMetrics`; chưa đo giờ start/end, label, summary, uncertain.
- **Khoảng trống:** mở rộng `computeMetrics` (việc P1-2 trong `ke-hoach-hanh-dong.md`); spec matching + cách xử lý gộp/tách sai; chốt và đóng băng gold E01–E17 (điều tra nguyên nhân 25 vs 23).
- **Sửa báo cáo:** §5.3.1 bổ sung đoạn "quy tắc đối sánh" (rút từ `metrics.ts`); recalc Bảng 5.1 và P0156 nếu tiêu chí mới làm đổi số; giữ chú thích mẫu số 25/23 hoặc thống nhất lại.
- **Phụ thuộc:** mọi TASK 01/03/04/05 đều chấm bằng metric này — **làm trước tiên**.

### TASK 03 — Held-out test set độc lập (P0)

- **Trong báo cáo:** §5.3.1 (17 mẫu lấy mẫu thuận tiện); §6.2 gạch *"Quy mô dữ liệu đánh giá… còn hạn chế"*; §6.3 đặt "150 mẫu" là định hướng dài hạn.
- **Code có sẵn:**
  - Khung ca đánh giá hoàn chỉnh: `EvalCase` (text, now, expected, allowedDates, metrics kỳ vọng, profiles) — thêm ca mới = thêm file `cases-*.ts`, không đụng pipeline.
  - Hướng dẫn soạn ca đã có: `huong_dan_tao_testcase_llm.md` (root).
  - Live harness chạy lần lượt mọi `EVAL_CASES` — tách thêm `HELDOUT_CASES` + biến env (ví dụ `EVAL_SET=heldout`) để chạy cấu hình chốt một lần, không sửa fixture sau khi chạy.
  - Nguồn đa dạng hỗ trợ sẵn: `source: web_page | selection | paste` + `sourceUrl` trong `NormalizedDocument`.
- **Khoảng trống:** 40–50 văn bản thật đã ẩn danh + gold + provenance (thu thập thủ công); cấu hình chốt (model + prompt v5) trước khi chạy.
- **Sửa báo cáo:** mục mới trong §5.3 trình bày bộ test độc lập (phân bố, quy trình gán nhãn, kết quả riêng với dev set); cập nhật §6.2.
- **Phụ thuộc:** gold/matching của TASK 02; kết quả giữ riêng, không tune lại prompt sau khi chạy.

### TASK 04 — Đánh giá đầu-cuối Off/Report/Screen (P0)

- **Trong báo cáo:** §4.4 P0114 định nghĩa 3 chế độ + fail-open; §5.4 mô tả nguyên lý và **tự thừa nhận**: *"mức tiết kiệm thực tế và ảnh hưởng tới recall sự kiện cấp tài liệu vẫn là các chỉ số cần kiểm chứng bằng phép đo đầu cuối"*; §5.5, §6.1 (gạch PhoBERT), §6.2 (gạch *"Chưa có phép đo đầu cuối đối chứng… nên chưa được định lượng"*) lặp lại giới hạn này.
- **Code có sẵn (phía extension — đúng phạm vi được giao):**
  - Điều phối chế độ: `platform/offscreen/run-job.ts` — `resolveFilterMode`, skip LLM khi `screen` + `no_event` + `applied` (dòng 191–220).
  - Job result **đã log đủ** chỉ số sàng lọc: `filterApplied, filterDecision, filterConfidence, filterLatencyMs, filterEvidenceCount, filterTotalSentences` (`ExtractionJobResult`, run-job.ts:40–53) + `candidateCount/savedCount/chunkCount/truncated` phía LLM → đủ để tính "số lượt LLM tiết kiệm" và "thời gian PhoBERT vs LLM".
  - Lõi thuần: `core/extraction/prefilter.ts` (chia cửa sổ, `summarizeFilter`, ngưỡng 0.85, tối thiểu 3 câu); `core/extraction/mock-filter.ts` (`MockContentFilter` — đo tất định không cần dịch vụ Python).
  - Client thật: `platform/inference/phobert-filter.ts` (health 2 s, `/analyze`); mặc định `report` tại `shared/contracts.ts:202` (`DEFAULT_FILTER_MODE`).
  - Tests mẫu để dựng eval: `tests/platform/offscreen-filter.test.ts`, `tests/core/extraction-prefilter.test.ts`, `tests/core/extraction-mock-filter.test.ts`.
  - Tài liệu: `docs/ke-hoach-bo-loc-noi-dung.md` (kế hoạch F3, tiêu chí 0 tài liệu dương bị bỏ sót), `docs/kiem-thu-demo.md` §9 (checklist 3 chế độ), `extension/README.md` (đã hứa `tests/eval/filter.eval.test.ts` + biến `FILTER_EVAL=1` — **chưa tồn tại**).
- **Khoảng trống:** harness 3 chế độ chạy trên cùng bộ tài liệu (dùng held-out của TASK 03, hoặc E01–E17 trước mắt); tổng hợp bảng so sánh + phân tích false negative của screen.
- **Sửa báo cáo:** viết lại §5.4 bằng số đo (bảng Off/Report/Screen); cập nhật §5.5, §6.1, §6.2 — đây là chỗ khẳng định lớn nhất cần bằng chứng.
- **Phạm vi:** số liệu cấp câu của PhoBERT (§5.2) giữ nguyên từ nhóm bàn giao; phần này chỉ đo tác động hệ thống.

### TASK 05 — Baseline rule-based cho thời gian (P1)

- **Trong báo cáo:** §2 đã giới thiệu HeidelTime/SUTime/Duckling (hệ luật) — có sẵn để nối vào phần so sánh; §6.3 ghi *"Bổ sung bộ quy đổi biểu thức thời gian tương đối tiếng Việt bằng quy tắc tất định"* là định hướng — TASK này biến định hướng thành kết quả.
- **Code có sẵn (không phải viết từ đầu):** `core/dates.ts` (parse/format ngày giờ, nhãn tương đối); regex đối chiếu ngày/tháng/giờ trong `core/extraction/normalize.ts`; bảng buổi → giờ + ngày tương đối trong `core/extraction/vague-time.ts`. Toàn bộ thuần, chạy được trong Node.
- **Khoảng trống:** parser rule-based đóng gói trong `tests/eval/` (ví dụ `rule-baseline.ts`): regex ngày `25/11/2026`, `25 tháng 11`, giờ `9h/9:30/14 giờ`, khoảng `9h–11h`, tương đối `ngày mai`, `thứ Hai tuần sau`, buổi; chấm bằng metric field-level của TASK 02 trên E01–E17 + held-out.
- **Sửa báo cáo:** mục baseline mới trong §5.3 hoặc §5.4; bảng Rule-based vs Raw LLM vs LLM + Post-check; nối dẫn chiếu Chương 2.
- **Lưu ý phạm vi:** đúng như kế hoạch — chỉ phủ biểu thức phổ biến trong dataset, không làm temporal parser đầy đủ.

### TASK 06 — Độ tin cậy đánh giá PhoBERT (P1) — *ngoài codebase*

- **Trong báo cáo:** §5.2 (200 câu, chia theo `doc_id`, test 42 câu giữ kín, accuracy 92,86%, F1 TASK 93,02%, so với NB/LR/SVM); §5.5 lặp lại; §6.2 đã ghi đúng giới hạn (*"chưa đủ để khẳng định khả năng tổng quát hóa"*).
- **Về codebase:** theo phạm vi giao, phần huấn luyện/dataset nằm ngoài repo (`ml_hasevent_filter/` chỉ đọc — model + `handover_api_code`). Trong repo chỉ có client + wiring (đã nêu ở TASK 04).
- **Việc khả thi trong phạm vi này:** rà soát phần §5.2 khớp với số liệu từ nhóm bàn giao (không tự điền số); các việc mở rộng dataset, người gán nhãn thứ hai, bootstrap CI là việc ngoài repo — nếu không kịp, **giữ nguyên các câu giới hạn đã viết đúng** ở §6.2 và §5.5 (báo cáo hiện đã trung thực về điểm này).
- **Không cần sửa thêm** nếu TASK 04 đo được đầu-cuối — phần "hướng cải tiến HAS_SCHEDULE/NO_SCHEDULE" đã có sẵn ở §6.3.

### TASK 07 — Screenshot giao diện (P2)

- **Trong báo cáo:** chỉ có Hình 4.1 (sơ đồ luồng); danh mục hình có đúng 1 mục. Không có ảnh sản phẩm thật nào.
- **Nguồn chụp (UI chạy được, load unpacked từ `dist/`):**
  1. Tab **Quét nội dung** khi đang chạy: checkbox sàng lọc, dòng kết luận (độ chắc chắn, số câu giao việc, thời gian), nút "Trích xuất toàn bộ" — `ui/views/capture.ts`.
  2. Danh sách **bản nháp** với huy hiệu độ tin cậy, cờ cảnh báo (`nam_suy_doan`, `gio_suy_doan`, `gio_chua_ro`), câu trích dẫn nguồn — `ui/views/event-card.ts`, `ui/views/events.ts`.
  3. **Chế độ duyệt hàng loạt** (chọn/phê duyệt/xoá) — `ui/views/event-review.ts`, `ui/actions/review.ts`.
  4. Chi tiết sự kiện + cảnh báo thời gian chưa xác định — `ui/views/event-card.ts`, `core/event-review.ts` (thứ tự ưu tiên duyệt).
  5. **Cài đặt**: chọn nơi suy luận + hộp thoại consent theo origin — `ui/views/settings.ts`, `ui/provider-panels.ts`, `ui/consent-dialog.ts`; hoặc card PhoBERT — `ui/views/filter-settings.ts`.
- **Cảnh báo:** `slides_img/` chỉ có ảnh concept minh hoạ — **không dùng** làm minh chứng sản phẩm. Kịch bản demo theo `docs/kiem-thu-demo.md` §1–§5.
- **Sửa báo cáo:** chèn 3–5 hình vào Chương 4 (§4.3 thu thập, §4.4 sàng lọc, §4.7 duyệt nháp) + caption + cập nhật danh mục hình.

### TASK 08 — Repository, README, tái lập (P2)

- **Trong báo cáo:** không có link repo nào (TÀI LIỆU THAM KHẢO chỉ dẫn nguồn ngoài).
- **Trạng thái repo:**
  - `README.md` (root) có đủ mục nhưng **lệch code**: vẫn ghi Slice F "chưa triển khai", số test 405/358 (thực tế 437/44) — chi tiết tại `danh-gia-codebase.md` §5 mục P0-2; `extension/README.md` chuẩn hơn (bản đồ file, lệnh chạy eval, cách bật dịch vụ PhoBERT).
  - CI có sẵn: `.github/workflows/ci.yml`.
  - **Việc bắt buộc trước khi public:** dọn repo — `model.safetensors` ~515 MB đã track trong git, `training_args.bin` (pickle) lộ đường dẫn cá nhân `/content/drive/...`, `__pycache__/`, `.idea/` bị track (`danh-gia-codebase.md` §5 mục P2-1).
  - Bằng chứng đo nên commit vào `docs/evidence/` (mục P1-1) — hiện log chỉ ở `/tmp` và đã mất.
- **Sửa báo cáo:** thêm link repo + 1 đoạn "tái lập" trong §5.1 (phần cứng, model, lệnh eval) hoặc ghi chú chân trang.

### TASK 09 — Bảng phân công (P2)

- **Trong báo cáo:** bìa ghi 2 sinh viên (Lê Đăng Sơn 221230972, Trần Thùy Dương 221230783); chưa có bảng phân công.
- **Bằng chứng thực tế (git):** `watashiWalds <dangson2124.ld@gmail.com>` — 50 commits (toàn bộ code, eval, docs kỹ thuật) ≈ Lê Đăng Sơn; `chanh68` — 3 commits (báo cáo) ≈ Trần Thùy Dương. Mẫu bảng trong `caithienbaocao.md` §6 cần đảo vai cho khớp thực tế (bên "hệ thống/inference/baseline" tương ứng người viết code), xác nhận lại với nhóm trước khi chèn.
- **Sửa báo cáo:** thêm bảng vào §1.5 hoặc phần phụ lục; nội dung phản ánh công việc thật theo git log.

### TASK 10 — Hình thức báo cáo (P3)

Các điểm cụ thể phát hiện khi rà báo cáo:

- **Bìa:** dòng "Giảng viên hướng dẫn: Nguyễn Quang Trung" **chưa có tiền tố học vị** — chỉ thêm nếu xác minh được và đúng quy định.
- **Danh mục hình/bảng:** hiện gộp trong mục lục, mỗi loại đúng 1 mục (Hình 4.1, Bảng 5.1) — sau TASK 07 và các bảng thực nghiệm mới phải cập nhật; cân nhắc tách "Danh mục hình" / "Danh mục bảng".
- **Nhất quán số liệu:** Bảng 5.1 đo trên E01–E15/prompt v4, phần chữ §5.3.2 và §6.1 đo trên E01–E17/prompt v5 — sau khi recalc (TASK 02) phải đồng bộ cả hai nơi và §6.1.
- **Nhất quán tên chế độ:** §4.4 dùng tên Việt ("Tắt sàng lọc", "Chỉ báo cáo", "Sàng lọc trước trích xuất") còn §5.4 dùng `off`/`report`/`screen` — thêm một câu ánh xạ ở lần đầu xuất hiện.
- **Thuật ngữ:** các cụm tiếng Anh in nghiêng (*Content Capture*, *Service Worker*…) ở §4.2 — rà nhất quán cách dùng.
- **Trích dẫn:** [1]–[22] theo IEEE, có DOI/URL — định dạng đồng đều, chỉ cần rà lại sau khi thêm tài liệu mới (nếu có).
- **Số liệu chéo chương:** đối chiếu mục tiêu (§1.4) – đóng góp – thực nghiệm (§5) – kết luận (§6) sau khi các TASK P0 đổi số.

---

## 2. Thứ tự thực hiện và phụ thuộc

```text
TASK 02 (chốt gold + mở rộng metric)          ← nền cho mọi phép chấm
   ├─► TASK 01 (ablation Raw vs Post-check)   ← dùng metric mới + harness live
   ├─► TASK 03 (held-out set, chạy 1 lần)
   │       └─► TASK 04 (Off/Report/Screen trên cùng bộ test)
   └─► TASK 05 (baseline rule-based, cùng gold)
TASK 06  → chủ yếu giữ/rà soát văn bản, việc ngoài repo
TASK 07, 08, 09  → song song, không phụ thuộc thực nghiệm
TASK 10  → chốt sau cùng (số liệu mới thay đổi mục lục, bảng, kết luận)
```

- **Nếu thiếu thời gian** (theo `caithienbaocao.md` §9 — Nhóm A): TASK 02 → TASK 01 → TASK 03 → sửa các tuyên bố (§1.4, §5.3.2, §6.1) theo đúng bằng chứng còn lại. TASK 04 thu hẹp còn E01–E17 thay vì held-out; TASK 05/06 chuyển thành "hạn chế/định hướng" — báo cáo §5.4/§6.2 hiện đã viết sẵn các câu giới hạn này, chỉ cần giữ.
- **Nguyên tắc chốt:** chỉ khẳng định trong báo cáo những gì harness đo được; mọi kết quả chưa đo giữ ở dạng "hạn chế" hoặc "định hướng".

---

## 3. Phụ lục — bộ tài nguyên eval dùng chung (điểm rơi của TASK 01/02/03/04/05)

| Tài nguyên | Vai trò |
|---|---|
| `extension/tests/fixtures/eval/case-types.ts` | Hợp đồng `EvalCase`: text, now, `expected[]` (gold), `allowedDates`, metrics kỳ vọng, `requiredUncertain`, `requiredProfiles` |
| `extension/tests/fixtures/eval/cases-{a,b,c}.ts` | E01–E17 (gold hiện tại, 17 mẫu, `EVAL_NOW` cố định 22/10/2026 08:00+07) |
| `extension/tests/eval/metrics.ts` | Matching (Jaccard ≥ 0,5 + cổng ngày ≤ 1 ngày, ghép 1-1), `computeMetrics`, `percentile` |
| `extension/tests/eval/case-harness.ts` + `extraction.eval.test.ts` + `extraction.eval-cases.test.ts` | Chạy tất định bằng `MockProvider` (không cần model) |
| `extension/tests/eval/extraction.live.eval.test.ts` | Đo thật `llama-server` (`LLAMA_EVAL=1`, `LLAMA_ENDPOINT`); đã ghi latency, providerCalls, JSON tổng |
| `extension/src/core/extraction/{pipeline,normalize,vague-time,chunk,prompt,schema}.ts` | Trục trích xuất + hậu kiểm (thuần, test bằng Node) |
| `extension/src/core/extraction/{prefilter,mock-filter}.ts` + `platform/offscreen/run-job.ts` + `platform/inference/phobert-filter.ts` | Trục sàng lọc 3 chế độ + chỉ số đã log sẵn |
| `extension/src/core/dates.ts` | Nền parser ngày giờ cho baseline rule-based |
| `docs/ket-qua-danh-gia-slice-e.md` | Số đo 4 model đã công bố (nguồn của Bảng 5.1) |
| `docs/ke-hoach-bo-loc-noi-dung.md`, `docs/kiem-thu-demo.md` §8–§9 | Kế hoạch F3 + checklist thủ công 3 chế độ |
| `huong_dan_tao_testcase_llm.md` | Hướng dẫn soạn ca đánh giá mới (TASK 03) |
| `danh-gia-codebase.md`, `ke-hoach-hanh-dong.md` | QA toàn codebase + kế hoạch P0/P1/P2 ánh xạ gần 1-1 với 10 TASK |
