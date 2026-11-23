# Bản thảo sửa báo cáo — dán vào `Bao_cao_NLP_FINAL_Lan2.docx`

> **Nguồn số:** mọi số dưới đây truy vết được trong `docs/evidence/`:
> `postcheck-iq4_xs-2026-11-22.json` + `postcheck-ablation.md` (TASK 01),
> `rule-baseline-2026-11-23.json` + `.md` (TASK 05), `phobert-handover.md` (TASK 06),
> `filter-iq4_xs-2026-11-23.json` + `docs/ket-qua-bo-loc.md` (TASK 04),
> và `docs/ket-qua-danh-gia-slice-e.md` §7 (số v5 tháng 10).
> **Ngày soạn:** 23/11/2026. **Quy ước:** văn bản in nghiêng trong khối là phần
> thay thế/ngày thêm; phần "[chờ số]" đánh dấu chỗ chưa thể viết vì TASK 03/04 chưa đo.

---

## §1.4 — Đóng góp (sửa câu hứa quá mức)

**Thay** "mỗi đóng góp đều được kiểm chứng"
**bằng:**

> mỗi đóng góp đều được hiện thực hoá trong demo và, nơi có thể, được đánh giá
> định lượng bằng bộ mẫu cố định; các khẳng định chưa đo được ghi rõ là hạn chế.

## §4.6 — Hậu kiểm thời gian (C6 — câu đang sai)

**Bỏ** cụm "khớp phép quy đổi thứ trong tuần".
**Thay toàn bộ đoạn mô tả khả năng hậu kiểm ngày tương đối bằng:**

> Với ngày tương đối ("thứ Ba tuần sau", "tuần sau"), hậu kiểm hiện chỉ gắn cờ
> `ngay_tuong_doi` để người dùng duyệt, chưa quy đổi sang ngày dương lịch cụ thể.
> Khi model tự đề xuất một ngày tuyệt đối cho câu nói tương đối và có giờ kèm theo,
> hậu kiểm chấp nhận giá trị đó nếu định dạng hợp lệ — đây là lỗ hổng đã biết,
> được ghi nhận ở §6.2. Trên lần đo tại `docs/evidence/postcheck-ablation.md`,
> model không đề xuất ngày tuyệt đối nào cho mẫu E10 nên lỗ hổng chưa phát sinh
> trong số đo, nhưng về mặt code vẫn cần xử lý.

## §5.1 — Tái lập (thêm vào cuối mục)

> Toàn bộ code, bộ mẫu và bằng chứng số liệu nằm trong repo công khai của nhóm:
> `<link repo>` (commit `252a3d3` nhánh `main` tại thời điểm nộp). Bộ mẫu đánh giá
> E01–E17 (25 sự kiện gold, mốc `EVAL_NOW = 22/10/2026 08:00+07:00`) nằm tại
> `extension/tests/fixtures/eval/`; hợp đồng đóng băng gold tại
> `extension/tests/fixtures/eval/README.md`; quy tắc đối sánh tại
> `extension/tests/eval/README.md`. Phần cứng đo: AMD Ryzen 5 5600H, RTX 3050
> Laptop 4 GB; model `Qwen_Qwen3.5-9B-IQ4_XS.gguf` chạy bằng `llama-server`
> (build b10101), ngữ cảnh 8192, `-ngl 16`, KV cache q8_0; sampler là mặc định
> của server với `temperature 0.1`, `max_tokens 1200`; prompt v5. Lệnh đo:
> `LLAMA_EVAL=1 npx vitest run tests/eval/extraction.live.eval.test.ts` (kết quả
> từng mẫu) và `LLAMA_EVAL=1 LLAMA_MODEL=chat npx vitest run
> tests/eval/postcheck.live.eval.test.ts` (ablation §5.3.3).

## §5.3.1 — Quy tắc đối sánh + gold freeze (thêm mục con mới)

> **Quy tắc đối sánh.** Một sự kiện trích ra được ghép với đáp án khi: (1) tiêu
> đề trùng khít sau chuẩn hoá (bỏ dấu, bỏ ký tự trang trí) hoặc Jaccard token
> ≥ 0,5; (2) qua cổng ngày — đáp án không có ngày thì bỏ qua cổng, có ngày mà
> sự kiện không có ngày thì không ghép, lệch tối đa ±1 ngày thì được ghép. Ghép
> 1-1 tham lam theo thứ tự đáp án; phần còn lại là thiếu (`missed`) và thừa
> (`extra`). "Ngày bịa" được đo là ngày start/end nằm ngoài `allowedDates` —
> whitelist ngày của từng mẫu (ngày kỳ vọng cộng ngày tuyệt đối có trong văn
> bản), **chỉ chấm phần ngày**, không chấm giờ.
>
> **Gold set đóng băng.** Bộ E01–E17 gồm 25 sự kiện kỳ vọng (mẫu âm E06 có 0 sự
> kiện), chốt trước khi đo bằng test `gold-freeze` và cam kết không sửa sau khi
> có số liệu (`extension/tests/fixtures/eval/README.md`). Ngoài chỉ tiêu đề +
> ngày, số đo mức trường chấm thêm ngày/giờ/end chính xác tuyệt đối trên từng
> cặp ghép, nhãn, cờ uncertain và recall/precision hồ sơ.

## Bảng 5.1 — giữ nguyên (v4/E01–E15), chỉ sửa tiêu đề cột

- Tiêu đề cột "Số ngày/giờ bịa" → **"Số ngày ngoài whitelist"**.
- Thêm chú thích bảng: *Đo trên prompt v4, bộ 15 mẫu; cột này chỉ đếm ngày
  nằm ngoài whitelist của mẫu, chưa đo giờ.*

## Bảng 5.2 (mới) — prompt v5 / E01–E17, tách khỏi Bảng 5.1

| Chỉ số | Qwen3.5-9B IQ4_XS | Qwen3.5-9B PQ2_0 |
|---|---:|---:|
| Recall L1 (22/25) | 88,0% | 88,0% |
| Recall L2 (20/23)* | 87,0% | 82,6% |
| Precision L1 | 91,7% | 88,0% |
| p95 L1 | 35,2 s | 6,6 s |

\* Lượt 2 chấm trên 23 sự kiện vì E12 chạy quét lại (không chấm recall); gold
không đổi. Sampler chốt: mặc định server + `temperature 0.1` (phương án
`temperature 0.7` không chọn vì recall L2 78,3% < 80% ở E03). Nguồn:
`docs/ket-qua-danh-gia-slice-e.md` §7 và `docs/evidence/`.

## §5.3.2 — sửa câu 25/23 + lý do sampler

**Thay** câu "gold đổi từ 25 sang 23 giữa hai lượt" (nếu có) **bằng:**

> Lượt 1 chấm đủ 25 sự kiện; lượt 2 chấm 23 vì E12 là mẫu quét lại — lần chạy
> thứ hai của E12 chỉ đo số bản ghi mới (kỳ vọng 0) nên không ghi recall/precision.
> Gold set không hề thay đổi giữa hai lượt.

**Thêm** một câu về sampler:

> Cấu hình sampler chốt là mặc định của server cộng `temperature 0.1`; phương án
> `temperature 0.7` (khuyến nghị của nhóm model) cho recall L1 tốt hơn (96,0%)
> nhưng recall L2 giảm còn 78,3% do E03 bị gộp — dưới ngưỡng 80% nên không chọn,
> tránh chọn số đẹp theo từng lần đo (cherry-pick).

## §5.3.3 (mới) — Ablation hậu kiểm (TASK 01)

> **Ablation Raw LLM vs LLM + hậu kiểm.** Để tách tác dụng của hậu kiểm khỏi
> nhiễu sampling, mỗi đoạn văn bản chỉ gọi model **một lần**; output thô được
> chia hai đường xử lý: (a) *Raw* — giữ nguyên chuỗi ngày giờ model trả, không
> kiểm chứng nguồn; (b) *Hậu kiểm* — chuẩn hoá và kiểm chứng như pipeline.
> Cả hai đường dùng cùng một bước khử trùng và đều không khớp hồ sơ.
>
> | Chỉ số (17 mẫu, 25 kỳ vọng) | Raw | LLM + hậu kiểm |
> |---|---:|---:|
> | Recall L1 | 88,0% (22/25) | 88,0% (22/25) |
> | Precision L1 | 91,7% (22/24) | 91,7% (22/24) |
> | Ngày ngoài whitelist | 0 | 0 |
> | Giá trị bị trả `null` bởi hậu kiểm | — | 3 (E01, E07, E16) |
> | Sự kiện hậu kiểm làm mất | — | 0 |
>
> Kết quả cho thấy, với model chốt, output thô đã không chứa ngày nào ngoài
> whitelist; giá trị đo được của hậu kiểm là **sửa 3/24 sự kiện vi phạm hình
> hợp đồng** (chuỗi chỉ có ngày bị đặt nhầm vào trường giá trị đầy đủ) — hậu
> kiểm chuyển về đúng hợp đồng và gắn cờ `gio_chua_ro` — với **không mất sự
> kiện nào** và recall/precision không đổi. Ba mẫu thiếu (E04, E10, E13) giống
> hệt nhau ở cả hai đường: E04 do paraphrase tiêu đề dưới ngưỡng đối sánh, E10
> do model không đề xuất ngày tuyệt đối, E13 do model trả rỗng trong lần chạy
> này (biến thiên giữa các lần chạy). Số liệu: `docs/evidence/postcheck-ablation.md`.

## §5.3.4 (mới) — Tập giữ kín (TASK 03, đã đo 23/11/2026)

> **Thêm mục con mới vào §5.3:**
>
> **Tập giữ kín.** Để đo khả năng tổng quát hoá, nhóm soạn một bộ 50 mẫu **chốt
> trước khi chạy**, tách khỏi dev set: 30 dương (8 ngày giờ rõ, 6 đa sự kiện,
> 4 thiếu năm, 4 chỉ có ngày, 4 ngày tương đối, 4 lịch dạng trần thuật) và
> 20 âm (8 không lịch trình, 4 có nhiệm vụ nhưng không lịch, 4 có ngày/số liệu
> nhưng không phải sự kiện, 4 tin tức/mô tả). Bộ được đóng băng bằng test
> riêng (không trùng văn bản với dev set, Jaccard < 0,8) và chỉ chạy **một
> lần** sau khi chốt, với đúng cấu hình đã chọn (IQ4_XS, prompt v5, temp 0,1).
>
> | Chỉ số | Lượt 1 | Lượt 2 |
> |---|---:|---:|
> | Recall (39 sự kiện kỳ vọng) | **92,3% (36/39)** | 89,7% (35/39) |
> | Precision | 90,0% (36/40) | 85,4% |
> | Ngày ngoài whitelist | 0 | 0 |
> | Sự kiện sinh trên 20 mẫu âm | **0** | 0 |
> | p95 thời gian | 30,5 s | — |
>
> Kết quả held-out **không tụt so với dev set** (recall L1 92,3% so với 88,0%),
> cho thấy pipeline không bị tune theo 17 mẫu dev. Ba sự kiện thiếu nằm ở hai
> điểm yếu đã biết: ngày tương đối ("thứ Hai/thứ Sáu tuần sau" — H23, H25) và
> paraphrase tiêu đề (H12). Bốn sự kiện thừa là "sự kiện cả ngày" model tạo
> thêm từ dòng mở đầu của văn bản nhiều hoạt động (H09, H14). Không một mẫu âm
> nào sinh sự kiện — model không bịa lịch trên nhiễu. Số liệu:
> `docs/evidence/heldout-iq4_xs-2026-11-23.json`.

## §5.3.5 (mới) — Baseline rule-based (TASK 05)

> **Baseline luật tất định.** Để trả lời câu hỏi "liệu luật đơn giản có đủ
> không", nhóm hiện thực một bộ luật tất định cho các dạng ngày/giờ phổ biến
> (dd/mm/yyyy, ISO, "ngày dd tháng mm", HH:mm, "H giờ rưỡi", khoảng "từ A đến
> B", ngày tương đối "mai/thứ n/tuần sau") và chạy trên cùng bộ E01–E17 với
> cùng công cụ đo.
>
> | Chỉ số | Rule-based | Raw LLM | LLM + hậu kiểm |
> |---|---:|---:|---:|
> | Recall L1 | 80,0% (20/25) | 88,0% (22/25) | 88,0% (22/25) |
> | Precision L1 | 60,6% (20/33) | 91,7% (22/24) | 91,7% (22/24) |
> | Ngày chính xác trên cặp ghép | 20/20 | 22/22 | 22/22 |
> | Giờ start chính xác trên cặp ghép | 17/17 | 19/19 | 19/19 |
>
> Baseline yếu ở mức sự kiện do heuristic tiêu đề (13 sự kiện thừa, 5 thiếu) —
> đúng như dự kiến vì đây là lower bound; nhưng trên các cặp ghép được, ngày và
> giờ chính xác tuyệt đối. Kết luận: phần khó của bài toán không nằm ở việc đọc
> ngày giờ mà ở việc hiểu ngữ nghĩa câu (tiêu đề, ranh giới sự kiện, start/end —
> baseline xử lý sai ca "từ 9:00 ngày 3/12 … buổi tối ngày 7/12" là một sự kiện
> kéo dài). Điều này giải thích lựa chọn LLM + hậu kiểm. Baseline chỉ phủ biểu
> thức phổ biến, không phải temporal parser đầy đủ (so sánh với HeidelTime/SUTime
> ở §2 mang tính định hướng).

## §5.4 — Đo đầu-cuối ba chế độ sàng lọc (TASK 04, đã đo 23/11/2026)

> **Thay toàn bộ phần "cần kiểm chứng" của §5.4 bằng:**
>
> Ba chế độ sàng lọc được đo đầu-cuối trên cùng một bộ 27 tài liệu (14 dương —
> dùng lại 14 mẫu gold của bộ đánh giá chính, ép nguồn trang web; 13 âm — bản
> tin không lịch trình, menu/footer, quảng cáo, bình luận, trang đăng nhập,
> email xã giao, thông báo bảo trì, câu hỏi thường gặp, điều khoản), mỗi tài
> liệu chạy ba chế độ với kho dữ liệu mới nên kết quả giữa các chế độ không
> khử trùng lặp lẫn nhau. Cấu hình: model IQ4_XS chốt, prompt v5, temp 0,1;
> dịch vụ PhoBERT chạy cục bộ trên GPU.
>
> | Chỉ số | Tắt sàng lọc (`off`) | Chỉ báo cáo (`report`) | Sàng lọc trước trích xuất (`screen`) |
> |---|---:|---:|---:|
> | Lượt gọi LLM | 30 | 30 | 30 |
> | Lượt LLM tiết kiệm so với `off` | — | 0 | **0 (0,0%)** |
> | Tài liệu dương bị bỏ qua | — | 0 | **0/14** |
> | Mẫu âm bị bỏ qua | — | 0/13 | **0/13 (0%)** |
> | Sự kiện mất so với `off` | — | 0 | **0** |
> | Ngày ngoài whitelist | 0 | 0 | 0 |
> | Độ trễ bước lọc p95 | — | 1,32 s* | 0,05 s* |
> | Tổng thời gian (27 tài liệu) | 394,7 s | 397,1 s | 393,2 s |
>
> \* p95 `report` gồm một lần khởi động dịch vụ ở tài liệu đầu (4,6 s); sau khi
> dịch vụ ấm, độ trễ điển hình của bước lọc là 11–51 ms mỗi cửa sổ.
>
> Kết quả cho thấy bộ lọc PhoBERT bàn giao ở mức tài liệu **an toàn nhưng không
> tiết kiệm**: không một tài liệu dương hay một sự kiện nào bị bỏ (26/28 lần
> lọc trên mẫu dương trả "có nội dung công việc", 2 lần "không chắc chắn"),
> nhưng cũng không mẫu âm nào bị bỏ qua — model trả "có nội dung công việc"
> trên hầu hết văn bản nhiễu (menu, FAQ, footer) với độ chắc chắn 0,51–0,64,
> không bao giờ chạm ngưỡng bỏ 0,85. Do đó số lượt gọi LLM giữ nguyên ở cả ba
> chế độ. Vì điều kiện "bỏ được ít nhất 70% mẫu âm" không đạt, nhóm **giữ mặc
> định `report`**: người dùng vẫn bật được `screen` trong Cài đặt, và nút
> "Trích xuất toàn bộ" luôn cho chạy lại không lọc. Số liệu: `docs/ket-qua-bo-loc.md`,
> `docs/evidence/filter-iq4_xs-2026-11-23.json`.

## §5.5 — Số đo chất lượng trích xuất trong phép so ba (chú thích cho bảng trên)

> **Thêm một câu sau bảng §5.4 (hoặc vào §5.5):**
>
> Trong phép so ba này, chất lượng trích xuất trên nhóm mẫu dương là 72,7–77,3%
> recall / 80,0–85,0% precision tùy chế độ (chênh lệch do biến thiên giữa các
> lần chạy, mỗi cặp tài liệu–chế độ chỉ chạy một lần; bốn ca thiếu là các điểm
> yếu đã biết của model — E03 gộp nhiều phiên, E04 paraphrase tiêu đề, E10 ngày
> tương đối, E13 prompt injection). So sánh giữa các chế độ vẫn công bằng vì
> cùng tài liệu, cùng cấu hình, chỉ khác việc có bước lọc; chất lượng LLM được
> kết luận riêng ở §5.3.2–§5.3.3 trên bộ 17 mẫu với hai lượt chạy.

## §6.1 — Kết luận (sửa các gạch đầu dòng)

- Gạch "0 ngày giờ bịa" → **"0 ngày nằm ngoài whitelist ngày của mẫu trên cả
  output thô lẫn sau hậu kiểm; hậu kiểm sửa thêm 3/24 sự kiện vi phạm hình hợp
  đồng thời gian với 0 sự kiện bị mất (§5.3.3)"**.
- Gạch PhoBERT: giữ trạng thái "đã nối vào job, mặc định report"; **thay** câu
  "chưa có phép đo đầu-cuối" **bằng**: "đã đo đầu-cuối ba chế độ trên 27 tài liệu:
  không bỏ nhầm tài liệu dương hay mất sự kiện nào, nhưng không bỏ được mẫu âm
  nào (model dương tính giả ở mức tài liệu) nên giữ mặc định report (§5.4)".
- Thêm gạch baseline: "luật tất định đạt 80,0% recall nhưng precision 60,6% —
  xác nhận lựa chọn LLM + hậu kiểm (§5.3.5)".

## §6.2 — Hạn chế

- Thay "chưa có phép đo đầu-cuối cho sàng lọc" bằng: "sàng lọc đã đo đầu-cuối
  (§5.4): an toàn (0 bỏ nhầm) nhưng chưa tiết kiệm lượt gọi model trên bộ mẫu
  hiện có; cần model phân loại tốt hơn hoặc ngưỡng hiệu chỉnh trên bộ dữ liệu
  riêng trước khi nâng mặc định lên `screen`".
- Thêm: "ngày tương đối chỉ gắn cờ, chưa quy đổi lịch (§4.6)".
- Thay câu "bộ giữ kín 50 mẫu là hướng tiếp theo" bằng: "ablation và baseline
  chạy trên dev set 17 mẫu; bộ giữ kín 50 mẫu đã đo cho recall 92,3% — không
  tụt so với dev set (§5.3.4)".
- Thêm: "số liệu huấn luyện PhoBERT do nhóm huấn luyện cung cấp; nhóm báo cáo
  chỉ kiểm tra nhất quán số học và cấu hình suy luận" (footnote của §5.2/§5.5,
  xem `docs/evidence/phobert-handover.md`).

## §6.3 — Hướng phát triển

- Thay "mục tiêu 150 mẫu" bằng: "đã có 17 mẫu dev đóng băng và 50 mẫu giữ kín
  đã đo; mở rộng lên 150 mẫu là việc tiếp theo".
- Thêm: "quy đổi ngày tương đối trong hậu kiểm (xây được trong baseline, xem
  §5.3.5) và đưa vào pipeline sau khi đo lại toàn bộ".

## TASK 09 — Bảng phân công (cần xác nhận của nhóm trước khi dán)

> Bảng nháp theo git + phân công thực tế (bổ sung dòng "ngoài repo" nếu có):
>
> | Thành viên | MSSV | Công việc chính |
> |---|---|---|
> | Lê Đăng Sơn | 221230972 | Kiến trúc extension, pipeline trích xuất, hậu kiểm, sàng lọc (client), harness đánh giá, tài liệu kỹ thuật |
> | Trần Thuỳ Dương | 221230783 | Nội dung báo cáo, rà soát/định dạng, tổng hợp kết quả, thuyết trình |

## Việc hình thức (TASK 10) — checklist ngắn

- Bìa: học vị giảng viên (chỉ thêm nếu xác minh được), tên học phần, lớp, năm.
- Mục lục/danh mục hình–bảng: cập nhật field (Ctrl+A → F9); tách danh mục
  hình/bảng nếu quy định yêu cầu.
- Thuật ngữ: "hậu kiểm" (post-check), "sàng lọc" (screening), "độ chuẩn xác"
  (precision) vs "độ chính xác" (accuracy); dùng "ngày ngoài whitelist" thay
  "ngày giờ bịa" ở mọi bảng/chú thích.
- Layout: Times New Roman 13, giãn 1,3, lề 2,5/2,5/3/2, caption bảng trên,
  caption hình dưới, chương mới sang trang; PDF nhúng font.
