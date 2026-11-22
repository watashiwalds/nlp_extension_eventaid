# Kế hoạch cải thiện báo cáo — TASK 01–10

> **Mục đích:** biến [`pham-vi-cai-thien-bao-cao.md`](./pham-vi-cai-thien-bao-cao.md) thành kế hoạch thi hành: việc gì, sửa file nào, đo bằng gì, viết gì vào báo cáo, thứ tự và tiêu chí xong.
> **Nguồn đối chiếu:** scope + [`caithienbaocao.md`](./caithienbaocao.md) + code `extension/` + báo cáo `Bao_cao_NLP_FINAL_Lan1.docx` (md5 `9347b164…`, bản root và `bao-cao/` giống nhau).
> **Ngày rà soát:** 22/11/2026. **Trạng thái:** kế hoạch, chưa thực thi.
> **Nguyên tắc chốt:** chỉ khẳng định điều harness đo được; mọi số trong báo cáo phải truy vết được từ `docs/evidence/`; không sửa `ml_hasevent_filter/`; không sửa pipeline chỉ để làm đẹp số.

---

## 0. Kết luận rà soát — 10 điểm cần đính chính (scope, báo cáo, README)

| # | Nguồn nói (scope / report / README) | Kiểm tra thực tế | Ảnh hưởng tới kế hoạch |
|---|---|---|---|
| C1 | Scope: gold đổi 25 → 23 giữa hai lượt | **Sai.** Gold E01–E17 cố định 25 sự kiện. Lượt 2 bỏ E12 vì E12 chạy `rescan` và harness không ghi `metrics` (`extraction.live.eval.test.ts:168–170, 217`); 25 − 2 = 23. | TASK 02 không phải "điều tra gold drift"; chỉ cần ghi rõ quy ước E12 và sửa câu §5.3.2. |
| C2 | Scope: `model.safetensors` ~515 MB và `training_args.bin` **đã track** trong git | **Sai.** `.gitignore:12` bỏ qua `ml_hasevent_filter/handover_api_code/models`; `git ls-files` không có model/bin; `git log -- models` rỗng. File vẫn nằm trên đĩa (540 MB / 5 KB). | Không cần `git filter-repo`. Chỉ cần untrack `.idea/`, `__pycache__/`; xoá/sanitize `training_args.bin` trước khi chia sẻ thư mục. |
| C3 | README root: 358 test / 36 file (bản cũ); AGENTS.md: 437/44 (ngụ ý xanh) | **Chưa xanh.** Hôm nay có **3 test đỏ**: `event-review.test.ts` (2) và `smoke.test.ts` (1) vì view dùng `new Date()` còn fixture đã ở quá khứ (03–05/11/2026). Tổng thực tế: 437 test / 44 file, 415 pass, 3 fail, 19 skip. | TASK 08 phải sửa time-bomb trước khi được ghi "437/44 pass". Không đổi logic sản phẩm: dùng `vi.setSystemTime(NOW)` / truyền `now`. |
| C4 | Scope: `profileNames` không được dùng trong `computeMetrics` | **Đúng một nửa.** `profileNames` quả thật không được chấm trong `computeMetrics`, nhưng `requiredProfiles` vẫn được assert riêng (`extraction.eval.test.ts:125`, `extraction.eval-cases.test.ts:214`). | Đừng viết "hồ sơ chưa được kiểm". Thêm `computeProfileMetrics` (tùy chọn) hoặc ghi rõ trong matching spec là assert riêng. |
| C5 | Report: "0 ngày giờ bịa đặt" | **Mạnh hơn metric thực tế.** `isInventedDate` chỉ so **phần ngày** với `allowedDates`; không kiểm giờ, không kiểm năm so với nguồn, không kiểm nhãn. `allowedDates` là whitelist theo mẫu. | Đổi cách gọi thành "0 ngày ngoài whitelist"; thêm metric field-level (giờ/ngày chính xác) trước khi giữ câu "0 ngày giờ bịa". |
| C6 | Report §4.6: hậu kiểm kiểm chứng cả ngày tương đối | **Sai.** `normalize.ts:172–177`: khi `isRelative && hasTime`, mọi ISO datetime đều được nhận, không quy đổi thứ/tuần. E10 ("Thứ Ba tuần sau lúc 8:00") là ca liên quan. | TASK 01 phải có E10; sửa §4.6 (và §6.2) hoặc implement resolver tất định (tùy chọn P1.5). Không được để nguyên câu "khớp phép quy đổi thứ". |
| C7 | Scope: nguồn báo cáo để sửa | **Đã mất.** `HEAD~1` có `bao-cao/noi-dung/*.md` + `hinh/so-do-hoat-dong.png`; commit `ea90385` xoá. Bản markdown cũ còn placeholder ở §5.2/§6, không khớp DOCX cuối. | Không chạy `bao_cao.py build` trên markdown cũ. Sửa trực tiếp DOCX bản Lan2; giữ Lan1 để đối chiếu. |
| C8 | README: lệnh chạy PhoBERT | **Sai đường dẫn.** `extension/README.md` ghi `MODEL_DIR=../phobert_task_classifier_final`; thực tế `app.py` mặc định `handover_api_code/models/phobert_task_classifier_final`, còn `../…` không tồn tại. | Sửa lệnh trong TASK 08; nếu không, TASK 04/07 không tái lập được dịch vụ. |
| C9 | README: hứa `FILTER_EVAL=1` + `filter.live.eval.test.ts` | **Đúng là "sẽ thêm ở F3"**, file chưa tồn tại. Không phải tuyên bố sai, nhưng chưa có bằng chứng. | TASK 04 tạo đúng file/biến này; sau đó cập nhật README. |
| C10 | Report: Bảng 5.1 và đoạn §5.3.2 là cùng một thí nghiệm | **Không.** Bảng 5.1 là E01–E15 / prompt v4 (22 và 20 sự kiện); đoạn sau là E01–E17 / prompt v5 (25 và 23). | Tách Bảng 5.1 (v4) và Bảng 5.2 (v5); ghi rõ cấu hình sampler đã chọn. |

---

## 1. Bước 0 — chốt nguồn, mốc đo, evidence (0,5 ngày)

1. **Bản làm việc:** copy `Bao_cao_NLP_FINAL_Lan1.docx` → `bao-cao/Bao_cao_NLP_FINAL_Lan2.docx`; giữ nguyên Lan1; ghi md5 trước/sau mỗi lần sửa lớn.
2. **Cách sửa:** sửa trực tiếp DOCX Lan2 (không có markdown nguồn đáng tin — C7). Nếu nhóm muốn quy trình lặp lại: chuyển DOCX → markdown **một lần**, đối chiếu với bản cũ, rồi mới dùng `bao_cao.py build`; đây là việc tùy chọn, không chặn TASK nào.
3. **Mốc đo cố định:** `EVAL_NOW = 2026-10-22T08:00+07:00` (đã có trong `case-types.ts`); model chốt `Qwen3.5-9B IQ4_XS`; prompt v5; `temperature 0.1`; sampler mặc định của server (ghi rõ trong evidence). Mọi lần chạy ghi: commit hash, ngày, phần cứng, endpoint, model file.
4. **Thư mục evidence:** tạo `docs/evidence/README.md` + template JSON `{commit, model, promptVersion, sampler, endpoint, cases, metrics, rawRecords}`. Không để log ở `/tmp` (các log cũ đã mất).
5. **Đóng băng:** sau khi TASK 02/03 xong, không sửa fixture/gold. Nếu buộc phải sửa, chạy lại toàn bộ và ghi lý do vào evidence; không trộn kết quả cũ/mới.

---

## 2. Kế hoạch từng TASK

### TASK 02 — Chốt gold + matching spec + metric field-level (P0, làm đầu tiên)

**Mục tiêu:** gold E01–E17 bất động; quy tắc đối sánh được viết thành văn; đo được ngày/giờ/nhãn/hồ sơ thay vì chỉ "khớp tiêu đề + ngày ±1".

**Việc cụ thể**
1. Viết `extension/tests/fixtures/eval/README.md`: nguồn 17 mẫu, `EVAL_NOW`, tổng 25 sự kiện, quy ước E12 (lượt 2 = quét lại, không chấm recall), cách thêm mẫu, cam kết không sửa sau khi đo.
2. Thêm `extension/tests/eval/gold-freeze.test.ts`: đủ 17 id E01–E17; `expected.length` tổng = 25; mọi ngày kỳ vọng nằm trong `allowedDates`; `E12.rescan === true`; không trùng text/hash giữa các mẫu; `allowedDates` đúng `YYYY-MM-DD`.
3. Thêm `extension/tests/eval/field-metrics.ts` (hàm bổ sung, **không đổi `EvalMetrics`** để không phá 17 fixture và live harness):
   - `computeFieldMetrics(actual, expected)` trên các cặp đã ghép: `dateExact`, `startTimeExact`, `endExact`, `labelExact`, `uncertainMatch`, `summaryCoverage` (tùy chọn — chỉ là proxy, không phải chấm ngữ nghĩa).
   - `computeProfileMetrics(actual, expected, profiles)` cho `requiredProfiles`: precision/recall theo tên hồ sơ.
   - `countInventedMidnight(actual, expected)`: bắt lỗi điền `T00:00` cho mốc chỉ có ngày.
4. Test đơn vị cho các hàm mới trong `metrics.test.ts`: ca đúng/sai từng trường, ca không ghép được, ca date-only.
5. Viết spec matching (README + report §5.3.1):
   - Tiêu đề: trùng khít sau `normalizeTitleKey` hoặc Jaccard token ≥ 0,5.
   - Cổng ngày: expected không ngày → bỏ qua; expected có ngày, actual không ngày → không ghép; lệch ≤ 1 ngày.
   - Ghép 1-1 tham lam theo thứ tự expected; `missed`/`extra` như code.
   - `inventedDates` = ngày start/end ngoài `allowedDates` (**chỉ phần ngày**); không đo giờ/nhãn/summary.
   - Ghi rõ `allowedDates` là whitelist theo mẫu, không phải bằng chứng "không bịa" tuyệt đối.
6. Chạy `npm test` xác nhận `computeMetrics` không đổi; nếu fixture lệch, sửa fixture (không sửa code) và ghi lý do.
7. Report: thêm đoạn "Quy tắc đối sánh" vào §5.3.1; sửa chú thích 25/23 theo C1; nếu có field metrics, thêm bảng nhỏ.

**File:** `extension/tests/fixtures/eval/README.md`, `extension/tests/eval/gold-freeze.test.ts`, `extension/tests/eval/field-metrics.ts`, `extension/tests/eval/metrics.test.ts`, report §5.3.1.
**Xong khi:** test xanh; gold freeze chạy; spec có trong repo + report; 25/23 được giải thích đúng.
**Ước lượng:** 1 ngày.

---

### TASK 01 — Ablation Raw LLM vs LLM + hậu kiểm (P0)

**Mục tiêu:** chứng minh (hoặc bác bỏ) tác dụng của hậu kiểm bằng **cùng một lần gọi LLM**, tách hai đường xử lý.

**Việc cụ thể**
1. Thêm `extension/tests/eval/postcheck.live.eval.test.ts`, gate `LLAMA_EVAL=1`, `LLAMA_ENDPOINT`; dùng `EVAL_CASES` (hoặc `EVAL_SET` của TASK 03).
2. Thiết kế **một lần gọi model, hai đường** để tránh nhiễu sampling:
   - Gọi `chunkText` → `buildPrompt` → `provider.run` → `parseRawExtraction` **một lần**.
   - **Raw:** map `RawEvent` → `EventCandidate` (giữ nguyên chuỗi ISO, không kiểm nguồn; giữ `uncertain` do model tự báo; `relatedProfiles: []`).
   - **Post-check:** gọi `normalizeEvents(raw.events, {now, timezone, sourceText: chunk.text})`, rồi `dedupeCandidates` như pipeline; không sửa `pipeline.ts`.
   - Áp dụng cùng một bước dedup cho cả hai đường (hoặc bỏ dedup ở cả hai) và ghi rõ. **Không chấm hồ sơ ở cả hai đường** để cô lập tác động ngày giờ.
3. Chấm cả hai bằng `computeMetrics` + `computeFieldMetrics` của TASK 02; thêm các cột:
   - `dateOutsideAllowed`, `dateExact`, `startTimeExact`.
   - `inferredYearWithoutFlag` / `inferredTimeWithoutFlag` (raw) và số cờ `nam_suy_doan` / `gio_suy_doan` được hậu kiểm thêm.
   - `valueDroppedByPostcheck` (raw có ngày/giờ, hậu kiểm trả `null`) và `falseNegativeByPostcheck` (raw đúng, hậu kiểm làm mất).
4. Chạy trên IQ4_XS (bắt buộc) và PQ2_0 (nếu có thời gian), prompt v5, temp 0,1; lưu JSON vào `docs/evidence/postcheck-<model>-<date>.json`; viết bảng tổng hợp `docs/evidence/postcheck-ablation.md`.
5. Chuẩn bị **hai kết luận trung thực**:
   - Nếu raw có nhiều ngày ngoài whitelist: "hậu kiểm giảm X → 0, nhưng làm mất Y ngày đúng".
   - Nếu raw cũng 0 ngày ngoài whitelist: "giá trị của hậu kiểm là **chặn/gắn cờ giá trị không kiểm chứng được**, không phải giảm số ngày bịa; raw có Z trường suy đoán không cờ, hậu kiểm chuyển thành `null` + cờ".
6. Report: thêm mục §5.3.3 "Ablation hậu kiểm" với bảng Raw vs Post-check; sửa câu kết §5.3.2 và gạch đầu dòng §6.1 theo số thật; nếu kết quả không như kỳ vọng, vẫn báo cáo và hạ tuyên bố.

**File:** `extension/tests/eval/postcheck.live.eval.test.ts`, `docs/evidence/postcheck-*.json`, `docs/evidence/postcheck-ablation.md`, report §5.3.2–§5.3.3 + §6.1.
**Xong khi:** cùng raw output, hai đường chấm; bảng có cả ưu điểm và cái giá của hậu kiểm; số truy vết được.
**Ước lượng:** 1,5 ngày.

---

### TASK 03 — Held-out set 30 positive + 20 negative (P0)

**Mục tiêu:** một bộ test **chốt trước khi chạy**, không dùng để tune prompt, tách khỏi dev set E01–E17.

**Việc cụ thể**
1. Dùng phân bố đã có trong `caithienbaocao.md` §3.14: **30 positive** (8 đủ ngày giờ, 6 đa sự kiện, 4 thiếu năm, 4 chỉ ngày, 4 tương đối, 4 trần thuật không phải câu giao việc) + **20 negative** (8 không lịch trình, 4 có nhiệm vụ không lịch, 4 có ngày nhưng không phải sự kiện, 4 tin tức/mô tả).
2. Tạo `extension/tests/fixtures/eval-heldout/`:
   - `case-types.ts`: `HeldoutCase` = `Omit<EvalCase, 'mockOutput' | 'metrics'>`; **không cần mockOutput** vì chỉ chạy live.
   - `cases-h01-h15.ts`, `cases-h16-h30.ts`, `cases-n01-n20.ts` (dưới `max-lines`), `cases.ts` export `HELDOUT_CASES`.
   - `PROVENANCE.md`: id, nguồn (trang công khai/email mẫu/tự soạn), ngày thu thập, cách ẩn danh, người gán nhãn, người rà, ghi chú.
3. Quy trình thu thập: chỉ nguồn công khai hoặc tự soạn; xoá tên/email/số điện thoại; giữ ngày giờ; ghi `now` cho từng mẫu (ngày phát hành hoặc mốc cố định) để tái lập.
4. Thêm `extension/tests/eval/heldout-freeze.test.ts`: đủ 50 id; không trùng text/hash với dev set (Jaccard < 0,8); mọi ngày kỳ vọng nằm trong `allowedDates`; negative có `expected: []`; không có `mockOutput`.
5. Sửa live harness: `const CASES = process.env.EVAL_SET === 'heldout' ? HELDOUT_CASES : EVAL_CASES;`; output JSON riêng `docs/evidence/heldout-<model>-<date>.json`.
6. Chạy **một lần** sau khi freeze, cấu hình chốt (IQ4_XS, prompt v5, temp 0,1); không sửa prompt/fixture sau khi chạy. Nếu buộc sửa, ghi rõ và chạy lại cả dev + held-out.
7. Report: mục mới §5.3.4 "Tập giữ kín" với bảng phân bố + kết quả dev vs held-out; cập nhật §6.2 (17 → 17 dev + 50 held-out) và §6.3 (mục tiêu 150 mẫu).

**File:** `extension/tests/fixtures/eval-heldout/**`, `extension/tests/eval/heldout-freeze.test.ts`, `extension/tests/eval/extraction.live.eval.test.ts`, `docs/evidence/heldout-*.json`, report §5.3.4 + §6.2–§6.3.
**Xong khi:** 50 mẫu được freeze trước khi chạy; provenance đầy đủ; kết quả tách khỏi dev; không tune sau khi chạy.
**Ước lượng:** 2,5 ngày (soạn + rà là chính).

---

### TASK 04 — Đo đầu-cuối Off / Report / Screen (P0)

**Mục tiêu:** thay câu "cần kiểm chứng" ở §5.4/§5.5/§6.2 bằng bảng đo thật: tiết kiệm bao nhiêu lượt LLM, mất bao nhiêu sự kiện, mẫu dương nào bị bỏ.

**Việc cụ thể**
1. Tạo `extension/tests/fixtures/filter/`:
   - Positive: 14 mẫu E01–E05, E07–E15 theo đúng bộ F3 (dùng lại text), **ép `source: 'web_page'`** + `sourceUrl` giả; nếu để `paste`, `resolveFilterMode` trả `off` và phép đo vô nghĩa (`prefilter.ts:148`). E16/E17 có thể thêm thành nhóm phụ (thiếu năm/giờ mơ hồ) nhưng **không trộn** vào chỉ số 14 mẫu của F3.
   - Negative: E06 + 10–15 mẫu mới (menu/footer/quảng cáo/bình luận/đăng nhập/email xã giao/thông báo bảo trì), mỗi mẫu ≥ 5 câu.
   - `case-types.ts`: `FilterEvalCase {id, text, source, expectedDecision, goldEvents?, allowedDates?}`.
2. `extension/tests/eval/filter.eval.test.ts` (tất định, `MockContentFilter`): `screen` + `no_event` → không gọi provider; `has_event`/`uncertain` → gọi; `selection`/`paste` → không lọc; lỗi filter → fail-open. Đây là test hành vi, **không** dùng để tuyên bố độ chính xác.
3. `extension/tests/eval/filter.live.eval.test.ts`, gate `FILTER_EVAL=1`, `FILTER_ENDPOINT`:
   - Dùng `runExtractionJob` với deps in-memory (`getDocument`, `listProfiles`, `listEvents`, `saveEvent`, `createProvider`, `createFilter`, `now`), `PhobertTaskFilter` + `LlamaCppProvider`.
   - Chạy 3 chế độ `off` / `report` / `screen` trên cùng bộ; đo `filterDecision`, `filterConfidence`, `filterLatencyMs`, `filterTotalSentences`, `candidateCount`, `savedCount`, `chunkCount`, `truncated`, wall time. Số lượt LLM = tổng `chunkCount` (mỗi chunk là một lượt gọi); tài liệu bị `screen` bỏ có `chunkCount = 0`.
   - Chuyển `Event` đã lưu → `EventCandidate` (adapter nhỏ) để chấm `computeMetrics` + `computeFieldMetrics`; so `screen` với `off`.
4. Bảng cần có: tổng tài liệu, positive/negative, số lượt LLM, lượt LLM tiết kiệm, tỉ lệ tiết kiệm, tổng thời gian, trung bình/tài liệu, precision/recall/F1, số sự kiện mất, số tài liệu dương bị `screen` loại, filter p95.
5. Tiêu chí nghiệm thu (theo `docs/ke-hoach-bo-loc-noi-dung.md` §11.4): **0 tài liệu dương bị bỏ**, **0 sự kiện mất** so với `off`, fail-open không làm hỏng job, tỉ lệ bỏ qua mẫu âm ≥ 70% (mục tiêu). Nếu không đạt, báo cáo số thật; **không** đổi `DEFAULT_FILTER_MODE` khỏi `report`.
6. Report: viết lại §5.4 bằng bảng 3 chế độ; cập nhật §5.5, §6.1 (gạch PhoBERT), §6.2 (bỏ câu "chưa có phép đo đầu cuối" nếu đã đo; giữ nếu chưa); thêm một câu về mặc định `report` và điều kiện nâng `screen`.

**File:** `extension/tests/fixtures/filter/**`, `extension/tests/eval/filter.eval.test.ts`, `extension/tests/eval/filter.live.eval.test.ts`, `docs/ket-qua-bo-loc.md`, `docs/evidence/filter-*.json`, report §5.4–§5.5 + §6.1–§6.2.
**Xong khi:** 3 chế độ chạy trên cùng bộ; 0 dương bị bỏ; bảng + JSON evidence; report không còn câu "cần kiểm chứng" nếu đã có số.
**Ước lượng:** 1,5 ngày (+0,5 nếu tự soạn negative).

---

### TASK 05 — Baseline rule-based cho thời gian (P1)

**Mục tiêu:** có mốc so sánh "luật tất định" với LLM + hậu kiểm, trả lời câu §2/§6.3.

**Việc cụ thể**
1. `extension/tests/eval/rule-baseline.ts`: `extractWithRules(text, now): EventCandidate[]`.
   - Ngày tuyệt đối: `dd/mm/yyyy`, `dd/mm`, `dd tháng mm`, `ngày dd tháng mm`, ISO.
   - Giờ: `HH:mm`, `Hh`, `H giờ`, `H giờ rưỡi`; khoảng `từ A đến B`, `A–B`.
   - Tương đối: `hôm nay`, `mai`, `ngày kia`, `thứ 2–7`, `chủ nhật`, `tuần sau/trước`, `tháng sau/trước`.
   - Buổi mơ hồ: dùng `vagueTimeFromRaw` của `core/extraction/vague-time.ts`.
   - Title heuristic: mệnh đề trước biểu thức thời gian đầu tiên; fallback 8 từ đầu; label `công_vụ`; summary `[câu]`; quote câu.
2. Giới hạn có chủ đích: không xử lý đại từ hồi chỉ, không tách câu phức tạp; mỗi câu tối đa 1–2 sự kiện; ghi rõ trong README của baseline.
3. Chấm hai lớp:
   - **Event-level** bằng `computeMetrics` (title + date gate) — đây là lower bound vì title heuristic yếu.
   - **Temporal-field** trên các câu có biểu thức ngày/giờ rõ: `dateExact`, `startTimeExact`, `endExact` bằng `computeFieldMetrics`; bộ này công bằng hơn cho baseline.
4. Chạy trên E01–E17 (và held-out nếu TASK 03 xong); lưu `docs/evidence/rule-baseline-<date>.json`; bảng Rule-based vs Raw LLM vs LLM + Post-check.
5. Report: mục mới §5.3.5 (hoặc §5.4) "Baseline rule-based"; nối dẫn chiếu HeidelTime/SUTime ở §2; nêu rõ baseline chỉ phủ biểu thức phổ biến, không phải temporal parser đầy đủ.
6. **Tùy chọn P1.5:** nếu muốn đóng lỗ hổng C6, chuyển resolver thứ/tuần thành `core/extraction/relative-date.ts` và dùng trong `normalizeDateTime`; chỉ làm sau khi TASK 01 đo xong, và phải chạy lại eval + cập nhật §4.6.

**File:** `extension/tests/eval/rule-baseline.ts`, `extension/tests/eval/rule-baseline.test.ts`, `docs/evidence/rule-baseline-*.json`, report §5.3.5 + §2.
**Xong khi:** baseline chạy trong Node không cần model; có bảng so sánh; report nêu rõ giới hạn.
**Ước lượng:** 1,5 ngày.

---

### TASK 06 — Rà độ tin cậy số liệu PhoBERT (P1, ngoài codebase)

**Mục tiêu:** mọi số ở §5.2/§5.5 có nguồn hoặc được đánh dấu "do nhóm huấn luyện bàn giao"; không tự điền, không suy diễn.

**Việc cụ thể**
1. Tạo `docs/evidence/phobert-handover.md`: bảng "số trong báo cáo" ↔ "nguồn" (`README_API.md`, `model_config.json`, `training_args.bin` strings, thông tin nhóm bàn giao) ↔ "trạng thái" (xác minh được / chỉ bàn giao / chưa xác minh).
2. Đối chiếu nhất quán nội bộ: 200 = 114 + 44 + 42; 58+56=114; 22+22=44; 20+22=42; accuracy 39/42 = 92,86%; precision 20/(20+3) = 86,96%; F1 93,02%; validation 97,73%/97,78%. Nếu lệch, sửa báo cáo theo số đúng.
3. Đối chiếu `model_config.json` (`max_length 128`, threshold 0,5/0,65, labels) và `training_args.bin` (batch, epochs, lr, fp16, output_dir) — đọc và ghi lại thông tin cần thiết **trước khi** TASK 08 xoá/sanitize file này; không đưa path cá nhân vào báo cáo.
4. Nếu nhóm bàn giao có log/test predictions: thêm vào `docs/evidence/phobert/`, có thể tính bootstrap CI (tùy chọn). Nếu không: giữ nguyên các câu giới hạn đã đúng ở §5.5/§6.2, thêm footnote "số liệu do nhóm huấn luyện cung cấp".
5. Report: chỉ sửa nếu phát hiện lệch; thêm footnote nguồn; **không** thêm số mới.

**File:** `docs/evidence/phobert-handover.md`, report §5.2 + §5.5 + §6.2.
**Xong khi:** mỗi số có nguồn/trạng thái; không còn số "không biết từ đâu".
**Ước lượng:** 0,5 ngày.

---

### TASK 07 — Screenshot giao diện (P2)

**Mục tiêu:** có 3–5 ảnh sản phẩm thật, thay vì chỉ Hình 4.1 sơ đồ.

**Việc cụ thể**
1. Build + load unpacked từ `dist/`; chạy `llama-server` (8080) và PhoBERT (8081) nếu muốn chụp trạng thái sàng lọc thật; dùng dữ liệu mẫu, không dùng dữ liệu cá nhân thật.
2. Chụp tối thiểu:
   - **S1** tab Quét nội dung có checkbox sàng lọc + dòng kết luận (`no_event`, độ chắc chắn, số câu, thời gian) + nút "Trích xuất toàn bộ".
   - **S2** danh sách bản nháp có huy hiệu tin cậy + cờ `nam_suy_doan`/`gio_suy_doan`/`gio_chua_ro` + câu trích nguồn.
   - **S3** chế độ duyệt hàng loạt (chọn/phê duyệt/xoá).
   - **S4** Cài đặt: chọn nơi suy luận + hộp thoại consent theo origin, hoặc card PhoBERT.
   - **S5** chi tiết sự kiện + cảnh báo thời gian chưa xác định.
3. Quy cách: side panel 360–400 px, zoom 100%, light mode, che/thay tên thật; lưu PNG vào `bao-cao/hinh/` với tên `hinh-4-2-capture.png`…
4. Report: chèn vào §4.3/§4.4/§4.7; caption dưới hình; nhắc trong văn bản ("Hình 4.2 minh hoạ…"); cập nhật danh mục hình + mục lục.
5. **Không dùng** `slides_img/` (ảnh concept) làm minh chứng sản phẩm.

**File:** `bao-cao/hinh/*.png`, report Chương 4 + danh mục hình.
**Xong khi:** 3–5 ảnh thật, caption + tham chiếu, không lộ dữ liệu cá nhân.
**Ước lượng:** 0,5 ngày.

---

### TASK 08 — Repo, README, tái lập (P2)

**Mục tiêu:** repo public được, README khớp code, báo cáo có link + lệnh tái lập.

**Việc cụ thể**
1. **Sửa CI đỏ (C3):** dùng `vi.useFakeTimers(); vi.setSystemTime(NOW)` trong `tests/ui/smoke.test.ts`; truyền `now` tường minh trong `tests/core/event-review.test.ts` (hàm đã nhận `now`). Không đổi logic sản phẩm.
2. **README root:** cập nhật trạng thái Slice F (F0+F1+F2, mặc định `report`), số test thật sau khi xanh, lệnh build/test/eval, link `extension/README.md`, mục "hạn chế" (F3/P7 chưa đo).
3. **`extension/README.md`:** sửa lệnh PhoBERT thành `MODEL_DIR=./models/phobert_task_classifier_final` (hoặc bỏ hẳn để dùng default của `app.py`); thêm `FILTER_EVAL=1` + `tests/eval/filter.live.eval.test.ts` sau TASK 04; thêm `EVAL_SET=heldout` sau TASK 03; link `docs/evidence/`.
4. **`package.json`:** sửa `description` còn "khong dung mo hinh hoc may" — đã lỗi thời.
5. **Dọn repo:**
   - `git rm -r --cached ml_hasevent_filter/handover_api_code/.idea ml_hasevent_filter/handover_api_code/__pycache__`; thêm `.idea/` vào `.gitignore`.
   - Xoá `training_args.bin` khỏi thư mục bàn giao (không cần cho suy luận) hoặc thay bằng JSON đã lọc path `/content/drive/...`.
   - Kiểm tra `extension/trolylichtrinh.zip` (424 KB): nếu là build artifact cũ thì untrack; nếu là gói nộp bài thì giữ + ghi chú.
   - Không cần xoá `model.safetensors` khỏi git history (chưa từng track — C2); chỉ đảm bảo `.gitignore` còn hiệu lực.
6. **Evidence:** commit `docs/evidence/` (JSON + README) từ TASK 01/03/04/05; mỗi file ghi commit/model/prompt/sampler/ngày.
7. **Report §5.1:** thêm link repo + đoạn tái lập (phần cứng, model file, lệnh eval, commit hash); không đưa API key/đường dẫn cá nhân.

**File:** `README.md`, `extension/README.md`, `package.json`, `.gitignore`, `tests/ui/smoke.test.ts`, `tests/core/event-review.test.ts`, `docs/evidence/**`, report §5.1.
**Xong khi:** `npm run typecheck && npm run lint && npm test && npm run build` xanh; `git ls-files` không còn `.idea`/`__pycache__`/model/bin; README khớp số thật; report có link + lệnh.
**Ước lượng:** 1 ngày.

---

### TASK 09 — Bảng phân công (P2)

**Mục tiêu:** bìa có 2 SV nhưng báo cáo chưa nói ai làm gì; thêm bảng phản ánh công việc thật.

**Việc cụ thể**
1. Dựa trên git (`watashiWalds` 50 commit code/eval/docs; `chanh68` 3 commit báo cáo) **và** xác nhận với nhóm; không suy ra đóng góp chỉ từ số commit.
2. Bảng nháp:
   | Thành viên | MSSV | Công việc chính | Sản phẩm/ghi chú |
   |---|---|---|---|
   | Lê Đăng Sơn | 221230972 | Kiến trúc extension, pipeline trích xuất, hậu kiểm, sàng lọc (client), eval harness, tài liệu kỹ thuật | 50 commit code/eval/docs |
   | Trần Thùy Dương | 221230783 | Nội dung báo cáo, rà soát/định dạng, tổng hợp kết quả, thuyết trình | 3 commit báo cáo |
3. Bổ sung dòng "công việc ngoài repo" nếu có (dataset/PhoBERT training/thu thập dữ liệu) — đây là phần git không thấy.
4. Chèn vào §1.5 hoặc phụ lục; ghi rõ "đã xác nhận với nhóm"; nếu giảng viên yêu cầu %, thống nhất trước khi ghi.

**File:** report §1.5 hoặc phụ lục.
**Xong khi:** cả hai thành viên đồng ý; bảng không suy diễn quá mức từ git.
**Ước lượng:** 0,25 ngày.

---

### TASK 10 — Hình thức báo cáo (P3, chốt sau cùng)

**Mục tiêu:** báo cáo nhất quán, không còn số cũ/mâu thuẫn, đúng layout.

**Checklist**
- **Bìa:** học vị giảng viên (chỉ thêm nếu xác minh), tên học phần, lớp, năm; không còn dòng dính chữ.
- **Mục lục + danh mục:** cập nhật field (`Ctrl+A` → `F9`); tách "Danh mục hình"/"Danh mục bảng" nếu quy định yêu cầu; số trang khớp.
- **Số liệu chéo:** Bảng 5.1 (v4/E01–E15) vs Bảng 5.2 (v5/E01–E17) vs §5.3.2 vs §6.1 vs §6.2 — cùng một bộ số; không trộn 22/25/23.
- **Cấu hình sampler:** ghi rõ IQ4_XS chốt là server defaults + temp 0,1 (88,0%/87,0%); nêu lý do không chọn temp 0,7 (L2 78,3% < 80%) để tránh cherry-pick.
- **Tên chế độ:** lần đầu §4.4 thêm câu ánh xạ "Tắt sàng lọc (`off`)", "Chỉ báo cáo (`report`)", "Sàng lọc trước trích xuất (`screen`)".
- **Thuật ngữ:** thống nhất "hậu kiểm", "sàng lọc", "độ chuẩn xác" (precision) vs "độ chính xác" (accuracy); "ngày giờ bịa" → "ngày ngoài whitelist" nếu chưa có metric giờ.
- **Trích dẫn:** [1]–[22] IEEE; mọi mục được trích, không mục mồ côi; ngày truy cập nhất quán; DOI/URL đầy đủ.
- **Layout:** Times New Roman 13, giãn 1,3, lề 2,5/2,5/3/2, justified, thụt đầu dòng; bảng 12 pt, caption bảng trên/bảng, caption hình dưới/hình; chương mới sang trang.
- **PDF:** nhúng font, ảnh ≥ 150 dpi, mục lục bấm được; kiểm tra bằng mắt 3–5 trang ngẫu nhiên.

**File:** `bao-cao/Bao_cao_NLP_FINAL_Lan2.docx` (+ PDF).
**Xong khi:** không còn số cũ/mâu thuẫn; mục lục/figures/tables cập nhật; layout đạt; PDF mở ổn.
**Ước lượng:** 1 ngày.

---

## 3. Thứ tự, phụ thuộc, lịch

```text
TASK 02 (gold + spec + field metrics)
   ├─► TASK 01 (ablation, dùng field metrics)
   ├─► TASK 04 (Off/Report/Screen, dùng event metrics)
   ├─► TASK 03 (held-out; có thể chạy song song sau khi 02 xong)
   │       └─► chạy lại TASK 04 trên held-out (nếu kịp)
   └─► TASK 05 (baseline, dùng field metrics)
TASK 06, 07, 09  → song song, không chặn
TASK 08          → làm sau khi 01/03/04 có evidence (để README khớp số)
TASK 10          → chốt sau cùng
```

| Ngày | Việc chính | Output |
|---|---|---|
| D1 | TASK 02 + bắt đầu soạn TASK 03 | metrics/spec/freeze test |
| D2 | TASK 01 (harness + chạy) + soạn TASK 03 | bảng Raw vs Post-check |
| D3 | Chốt + chạy TASK 03; review kết quả | held-out JSON + bảng |
| D4 | TASK 04 (fixtures + 3 chế độ) | bảng Off/Report/Screen |
| D5 | TASK 05 + TASK 06 | baseline + phobert-handover |
| D6 | TASK 07 + TASK 08 | ảnh + README/evidence |
| D7 | TASK 09 + bắt đầu TASK 10 | bảng phân công + bản nháp Lan2 |
| D8 | TASK 10 + đọc soát + PDF | Lan2 + PDF |

**Đường găng:** 02 → 01 → 04 → 10. TASK 03 có thể trượt sang D4–D5 nếu thiếu thời gian soạn; TASK 05/06/07/09 là nhánh song song.

---

## 4. Phương án khi thiếu thời gian

| Mức | Việc giữ | Việc cắt | Hệ quả báo cáo |
|---|---|---|---|
| **Tối thiểu (2–3 ngày)** | 02 (spec + gold freeze, không field metrics) → 01 (ablation trên E01–E17) → sửa §1.4/§4.6/§5.3.2/§6.1 | 03, 04, 05, 06 mở rộng | Giữ câu "hạn chế" ở §5.4/§6.2; **không** được nói PhoBERT đã đo đầu-cuối; sửa §4.6 vì đang sai. |
| **Khá (5–6 ngày)** | 02 + 01 + 04 (E01–E17 + negative) + 07 + 08 + 09 + 10 | 03 (hoặc rút còn 20 held-out), 05 | §5.4 có số thật; §5.3.1 vẫn 17 mẫu; §6.2 ghi held-out là hướng tiếp theo. |
| **Đầy đủ (8–10 ngày)** | 02 → 01 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 | — | Đủ bằng chứng cho cả 4 đóng góp; báo cáo không còn tuyên bố chưa đo. |

**Không được cắt:** TASK 02 (nếu không, mọi số vô nghĩa), việc sửa §4.6 (đang khẳng định điều code không làm), và việc sửa các câu kết luận nếu số đo không như kỳ vọng.

---

## 5. Bảng số liệu gốc để đối chiếu khi sửa báo cáo

| Thí nghiệm | Bộ mẫu / prompt | IQ4_XS | 4B Q5_K_S | 27B PTQ1_0 | PQ2_0 |
|---|---|---:|---:|---:|---:|
| Recall L1 | E01–E15 / v4 | 90,9% (20/22) | 72,7% (16/22) | 90,9% (20/22) | 81,8% (18/22) |
| Recall L2 | E01–E15 / v4 | 90,0% (18/20) | 75,0% (15/20) | 90,0% (18/20) | 80,0% (16/20) |
| Precision L1 | E01–E15 / v4 | 95,2% | 80,0% | 90,9% | 81,8% |
| p95 | E01–E15 / v4 | 34,0 s | 10,1 s | 127,3 s | 6,7 s |
| Recall L1 | E01–E17 / v5 | 88,0% (22/25) | — | — | 88,0% (22/25) |
| Recall L2 | E01–E17 / v5 | 87,0% (20/23) | — | — | 82,6% (19/23) |
| Precision L1 | E01–E17 / v5 | 91,7% | — | — | 88,0% |
| p95 | E01–E17 / v5 | 35,2 s | — | — | 6,6 s |

Nguồn: `docs/ket-qua-danh-gia-slice-e.md` §3 và §7. Khi sửa báo cáo, **không** trộn hai bảng này; Bảng 5.1 giữ v4, Bảng 5.2 thêm v5.

---

## 6. Checklist sửa báo cáo (theo mục)

| Mục | Sửa gì | Căn cứ | Xong khi |
|---|---|---|---|
| §1.4 | Đổi "mỗi đóng góp đều được kiểm chứng" → "được hiện thực hoá và, nơi có thể, đánh giá định lượng"; chỉ giữ nếu 01/04 xong | C1, C6 | Câu không hứa quá mức |
| §4.6 | Bỏ "khớp phép quy đổi thứ trong tuần"; thêm câu "ngày tương đối chỉ gắn cờ `ngay_tuong_doi`, chưa kiểm chứng ngày dương lịch" **hoặc** cập nhật nếu TASK 05 P1.5 implement resolver | C6 | Không còn khẳng định sai |
| §5.1 | Thêm link repo + đoạn tái lập (phần cứng, model, prompt, lệnh, commit) | TASK 08 | Người đọc chạy lại được |
| §5.3.1 | Thêm "Quy tắc đối sánh" + gold freeze 17 mẫu/25 sự kiện + quy ước E12 | TASK 02 | Spec rõ, 25/23 đúng |
| Bảng 5.1 | Giữ nguyên v4/E01–E15; đổi tiêu đề cột "Số ngày/giờ bịa" → "Số ngày ngoài whitelist" | C5, C10 | Không overclaim |
| Bảng 5.2 (mới) | Thêm v5/E01–E17 cho IQ4_XS + PQ2_0; ghi rõ sampler chốt (server defaults + temp 0,1) | C10 | Tách hai thí nghiệm |
| §5.3.2 | Sửa câu 25/23: "lượt 2 bỏ E12 vì quét lại; gold không đổi"; thêm lý do không chọn temp 0,7 (L2 78,3%) | C1, C10 | Không còn "gold đổi" |
| §5.3.3 (mới) | Bảng Raw vs Post-check + số trường suy đoán không cờ / bị mất | TASK 01 | Có đối chứng |
| §5.3.4 (mới) | Bảng held-out 30 positive + 20 negative; dev vs held-out | TASK 03 | Kết quả tách biệt |
| §5.3.5 (mới) | Baseline rule-based vs Raw vs Post-check | TASK 05 | Có mốc so sánh |
| §5.4 | Viết lại bằng bảng 3 chế độ: lượt LLM, tiết kiệm, sự kiện mất, dương bị bỏ, thời gian | TASK 04 | Không còn "cần kiểm chứng" |
| §5.5 | Bỏ "phép so sánh định lượng … là hướng tiếp theo" nếu TASK 04 xong; thay bằng kết quả | TASK 04 | Nhất quán §5.4 |
| §6.1 | Sửa gạch "0 ngày giờ bịa" theo C5; thêm số ablation; cập nhật gạch PhoBERT nếu TASK 04 xong | C5, TASK 01/04 | Số khớp bảng |
| §6.2 | Cập nhật quy mô (17 + 50 held-out); bỏ câu "chưa có phép đo đầu cuối" nếu đã đo; thêm hạn chế ngày tương đối (C6) | TASK 03/04 | Hạn chế đúng thực tế |
| §6.3 | Đổi "150 mẫu" thành "đã có 50 held-out; mục tiêu 150"; thêm baseline/resolver nếu làm | TASK 03/05 | Định hướng khớp |
| §1.5/phụ lục | Bảng phân công 2 SV + xác nhận | TASK 09 | Không misattribute |
| Bìa/mục lục/hình | Học vị GV, danh mục hình/bảng, số trang, caption, tham chiếu | TASK 07/10 | Layout đạt, F9 xong |

---

## 7. Rủi ro và cách giảm

| Rủi ro | Xác suất | Cách giảm |
|---|---|---|
| Không có `llama-server`/model 9B khi cần đo | Trung bình | Chốt lịch đo sớm; dùng PQ2_0 (nhanh) cho TASK 04; ghi rõ model nếu đổi |
| PhoBERT service không chạy đúng lệnh (C8) | Cao | Sửa README trước; dùng default `MODEL_DIR` của `app.py`; health check 8081 |
| Held-out 50 mẫu không kịp | Cao | Rút còn 20–30; ghi rõ là "bộ giữ kín quy mô nhỏ"; không gọi là "độc lập ngoài" |
| Số đo làm thay đổi kết luận | Trung bình | Chuẩn bị trước 2 kịch bản (TASK 01); nguyên tắc "số nào viết số đó" |
| Sửa DOCX làm trôi mục lục/bảng | Cao | Sửa Lan2, chừa thời gian F9 + đọc soát; không sửa Lan1 |
| Trộn số v4/v5 | Cao | Dùng bảng §5 của kế hoạch này; tách Bảng 5.1/5.2 |
| CI đỏ vì test thời gian | Đã xảy ra | `vi.setSystemTime(NOW)` + truyền `now`; không đổi logic |
| Lộ dữ liệu cá nhân trong ảnh/evidence | Thấp | Dùng dữ liệu mẫu; che tên/email; không commit log có path `/content/drive` |

---

## 8. Definition of Done

- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` xanh; không còn 3 test time-bomb.
- [ ] Gold E01–E17 freeze test chạy; tổng 25 sự kiện; E12 rescan được ghi rõ.
- [ ] `computeFieldMetrics` + `computeProfileMetrics` có test; `computeMetrics` không đổi.
- [ ] TASK 01 có bảng Raw vs Post-check trên cùng raw output; có cả ưu điểm và cái giá.
- [ ] TASK 03 có 50 mẫu (hoặc số đã chốt) + provenance + freeze test; kết quả tách khỏi dev.
- [ ] TASK 04 có bảng 3 chế độ; 0 dương bị bỏ; 0 sự kiện mất; fail-open không hỏng job.
- [ ] TASK 05 có baseline + bảng so sánh; nêu rõ giới hạn.
- [ ] TASK 06 có bảng nguồn số PhoBERT; không số nào vô chủ.
- [ ] TASK 07 có 3–5 ảnh thật + caption + tham chiếu.
- [ ] TASK 08 README khớp code; repo sạch `.idea`/`__pycache__`/`training_args.bin`; evidence committed.
- [ ] TASK 09 bảng phân công được cả nhóm xác nhận.
- [ ] TASK 10 mục lục/hình/bảng cập nhật; không còn số cũ; PDF mở ổn.
- [ ] Mọi số trong báo cáo truy vết được từ `docs/evidence/`; không còn câu "0 ngày giờ bịa" nếu chưa có metric giờ.
- [ ] §4.6 không còn khẳng định hậu kiểm kiểm chứng ngày tương đối (trừ khi resolver được implement và đo).
