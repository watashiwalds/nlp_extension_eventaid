# Bàn giao phiên cải thiện báo cáo — TASK 01–10 (kế hoạch `bao-cao/ke-hoach-cai-thien-bao-cao.md`)

> **Ngày bàn giao:** 23/11/2026. **Nhánh:** `main`.
> **Mục đích:** phiên sau (hoặc thành viên khác) tiếp tục đúng thứ tự mà không phải dò lại.

## 1. Trạng thái các TASK

| TASK | Trạng thái | Commit / bằng chứng |
|---|---|---|
| Bước 0 (evidence + Lan2) | ✅ xong | `dbe5a33` — `docs/evidence/README.md` + template; `bao-cao/Bao_cao_NLP_FINAL_Lan2.docx` (bản copy Lan1, md5 `9347b164…`; **Lan1 giữ nguyên**) |
| TASK 02 (gold freeze + matching spec + field metrics) | ✅ xong | `e9965e0` — `gold-freeze.test.ts` (5 test), `field-metrics.ts` + 12 unit test, spec trong 2 README. Gold chốt: **17 mẫu / 25 sự kiện**, quy ước E12 → lượt 2 chấm 23 |
| TASK 01 (ablation Raw vs hậu kiểm) | ✅ xong, **đã chạy thật** | harness `postcheck.live.eval.test.ts` + `postcheck-report.ts` (`10ff593`); chạy trên IQ4_XS thật 374,9 s, 0 lỗi; evidence `docs/evidence/postcheck-iq4_xs-2026-11-22.json` + `postcheck-ablation.md` |
| TASK 03 (held-out 50) | ⬜ chưa làm | — |
| TASK 04 (Off/Report/Screen) | ⬜ chưa làm (viết được fixtures + test tất định + harness; **chạy live cần PhoBERT ở 8081**) | — |
| TASK 05 (baseline rule-based) | ✅ xong | `82d1747` + `46f7cfa` — `rule-baseline.ts` + 10 unit test + runner luôn chạy trong `npm test`; evidence `docs/evidence/rule-baseline-2026-11-23.{json,md}` |
| TASK 06 (provenance PhoBERT) | ✅ xong | `dbe5a33` — `docs/evidence/phobert-handover.md`; số huấn luyện = "chỉ bàn giao", nhất quán số học đã kiểm |
| TASK 07 (screenshot) | ⬜ chưa làm — **cần Chrome thật** | — |
| TASK 08 | ✅ xong phần code | `0e6f259` (sửa 3 test time-bomb — **CI đã xanh**), `252a3d3` (2 README + package.json + untrack `.idea`/`__pycache__`/zip + `.gitignore` thêm `.idea/`) |
| TASK 09 (phân công) | ⬜ chỉ có bảng nháp trong `bao-cao/ban-thao-sua-bao-cao.md` — **cần nhóm xác nhận** | — |
| TASK 10 (hình thức DOCX) | ⬜ chưa làm — **cần sửa Word trực tiếp**; bản thảo câu thay thế đã soạn | `bao-cao/ban-thao-sua-bao-cao.md` |

## 2. Số đo đã có (tóm tắt)

- **Ablation (IQ4_XS, prompt v5, temp 0.1, 1 lần/mẫu):** recall/precision Raw = Post-check = **88,0% / 91,7%** (trùng khớp số L1 của lần đo v5 tháng 10 → tái lập được). **0 ngày ngoài whitelist ở CẢ HAI đường.** Giá trị hậu kiểm đo được: sửa **3/24** sự kiện vi phạm hình hợp đồng (chuỗi ngày-only nằm trong `start.value` — E01/E07/E16) → `value=null` + `date` + cờ `gio_chua_ro`; **0 sự kiện bị mất**; cờ `nam_suy_doan`/`gio_suy_doan` thêm = 0. Ba mẫu thiếu: E04 (paraphrase dưới ngưỡng Jaccard), E10 (model không đề xuất ngày tuyệt đối — lỗ hổng C6 không được kích hoạt trong lần này nhưng vẫn là fact về code), E13 (model trả rỗng — biến thiên giữa lần chạy). p95 36,5 s / median 23,6 s.
- **Baseline rule-based (Node, không model):** event-level **80,0% / 60,6%** (lower bound do title heuristic, 13 thừa / 5 thiếu); temporal-field trên cặp ghép **20/20 ngày, 17/17 giờ chính xác**; end 0/1 (tách câu đa ngày thành 2 sự kiện thay vì 1 sự kiện có end — giới hạn đã ghi).
- **Test suite:** **485 test / 49 file — 447 pass, 38 skip (2 harness live), 0 fail.** 3 test time-bomb đã hết. Gate: `npm run typecheck && npm run lint && npm test && npm run build` đều xanh.

## 3. Điều kiện môi trường ghi lại được trong phiên này

- **llama-server:** do người dùng khởi động qua **llama-swap** proxy tại `127.0.0.1:8080`, alias **`chat`**, model `Qwen_Qwen3.5-9B-IQ4_XS.gguf`, ctx 8192, `-ngl 16`, KV q8_0, build `b10101-4310aa4f8`. Proxy này **yêu cầu trường `model` trong request** → harness phải truyền `LLAMA_MODEL=chat` (đã hỗ trợ sẵn). Ban đầu bật auth 401 → người dùng đã **tắt auth tạm**; nếu bật lại, dùng `LLAMA_API_KEY` (harness đã hỗ trợ, không commit key).
- **PhoBERT 8081: KHÔNG chạy** trong phiên này. Lệnh chạy đúng (đã sửa C8 trong `extension/README.md`): `cd ml_hasevent_filter/handover_api_code && uvicorn app:app --host 127.0.0.1 --port 8081` (không cần `MODEL_DIR`).
- **Không được thiếu khi đo:** fixture/gold đã freeze — không sửa `text`/`expected`/`allowedDates`/`mockOutput` của mẫu đã đo; nếu buộc sửa → chạy lại toàn bộ, lưu evidence riêng.

## 4. Việc còn lại — thứ tự đề xuất

1. **TASK 04** (P0): viết `tests/fixtures/filter/` (14 positive ÉP `source: 'web_page'` + `sourceUrl` giả, 12–15 negative ≥ 5 câu) → `filter.eval.test.ts` (tất định, `MockContentFilter`) → `filter.live.eval.test.ts` (gate `FILTER_EVAL=1`, deps in-memory + `PhobertTaskFilter` + `LlamaCppProvider`, chạy 3 chế độ trên cùng bộ). Chạy live **cần PhoBERT 8081 + llama 8080**. Tiêu chí: 0 dương bị bỏ, 0 sự kiện mất, ≥70% bỏ qua mẫu âm; **không đổi `DEFAULT_FILTER_MODE`**. Sau đó mới sửa README FILTER_EVAL + viết `docs/ket-qua-bo-loc.md`.
2. **TASK 03** (P0): soạn 50 held-out (hoặc rút 20–30 nếu ít thời gian — ghi rõ "bộ giữ kín quy mô nhỏ"), `HeldoutCase` không cần `mockOutput`, freeze test chống trùng dev (Jaccard < 0,8), `EVAL_SET=heldout` trong live harness. Chạy **một lần** sau khi freeze.
3. **TASK 07** (P2): cần Chrome thật + `dist/` + dịch vụ; chụp S1–S5 theo `bao-cao/ban-thao-sua-bao-cao.md`? (xem kế hoạch TASK 07) — ảnh vào `bao-cao/hinh/`.
4. **TASK 09** (P2): xác nhận bảng phân công với cả hai thành viên trước khi dán vào §1.5.
5. **TASK 10** (P3): dán bản thảo `bao-cao/ban-thao-sua-bao-cao.md` vào Lan2 (các chỗ `[chờ số]` điền sau TASK 03/04), cập nhật mục lục (F9), xuất PDF.
6. **P1.5 (tùy chọn, cần quyết định riêng):** đưa resolver "thứ n/tuần sau" vào `core/extraction/relative-date.ts` + `normalizeDateTime` — phải chạy lại eval toàn bộ và sửa §4.6 lần nữa; hiện baseline có resolver riêng nên số không phụ thuộc.

## 5. Lưu ý quan trọng cho phiên sau

- **`local_infer/` (untracked, mới xuất hiện ở root) là việc của người dùng — KHÔNG đụng vào.**
- `extension/trolylichtrinh.zip` đã untrack (chứa `dist/` — build artifact). File vẫn nằm trên đĩa. Nếu là gói nộp bài cần đưa lại vào repo: `git show 252a3d3~1:extension/trolylichtrinh.zip > extension/trolylichtrinh.zip`.
- `training_args.bin` **vẫn còn trên đĩa, chưa track** (models/ đã ignore từ trước — C2 đúng như plan rà). Cần **sanitize/xoá trước khi chia sẻ thư mục** (chứa đường dẫn Colab cá nhân; giá trị tham số không đọc được — xem `docs/evidence/phobert-handover.md`).
- Không sửa `ml_hasevent_filter/` (ngoại lệ duy nhất đã làm: untrack `.idea`/`__pycache__` — không đụng nội dung file).
- Sửa DOCX chỉ trên **Lan2**; Lan1 giữ nguyên để đối chiếu. md5 Lan1 gốc: `9347b164438ef94f3596613be619f8ef`.
- Harness live đều gate bằng biến môi trường (`LLAMA_EVAL=1`, `LLAMA_MODEL=chat`, `LLAMA_API_KEY`, `FILTER_EVAL=1` tương lai) — CI không cần model.

## 6. Commit của phiên (theo thứ tự)

```
e9965e0 eval (TASK 02): freeze gold set E01-E17 (25 events, E12 rescan convention) + field-level metrics
0e6f259 tests (TASK 08.1): fix 3 time-bomb failures by removing hidden new Date()
dbe5a33 evidence (TASK 06 + Bước 0): PhoBERT number provenance + working copy Lan2
10ff593 eval (TASK 01): raw-vs-postcheck ablation harness + IQ4_XS evidence
82d1747 eval (TASK 05): deterministic rule-based temporal baseline + 3-way comparison
46f7cfa eval (TASK 05): fix strict-mode indexing and lint escapes in rule baseline
252a3d3 docs (TASK 08): README matches code, repro evidence link, repo cleanup
```
