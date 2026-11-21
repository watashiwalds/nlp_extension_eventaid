# Kế hoạch hành động sau review

> **Ngày lập:** 21/11/2026 · **Nguồn:** [`danh-gia-codebase.md`](danh-gia-codebase.md)
> **Phạm vi:** 3 nhóm việc — **Cắt gọt** (bớt cam kết), **Tập trung** (củng cố điểm mạnh),
> **Hoàn thiện** (sửa lỗi P0/P1/P2). Mỗi mục ghi rõ: việc, file đụng tới, tiêu chí xong, ước lượng.

---

## 0. Nguyên tắc điều phối

- **Ưu tiên P0 trước P1 trước P2**; P0 là điều kiện để demo/báo cáo không bị chất vấn gãy.
- Mỗi việc xong phải chạy đủ gate: `npm run typecheck && npm run lint && npm test && npm run build`.
- Không hạ ngưỡng nghiệm thu (recall ≥ 80%, 0 ngày bịa, p95 ≤ 90s) để "cho qua" — nguyên tắc đã
  giữ xuyên suốt Slice E, tiếp tục giữ.
- Không thêm tính năng mới trước khi P0 xong.

---

## 1. Giai đoạn 1 — Sửa ngay P0 (~1,5–2 ngày công)

| # | Việc | File đụng tới | Cách làm | Tiêu chí xong | Ước lượng |
|---|---|---|---|---|---|
| P0-1 | **Sửa test time bomb** (3 test đỏ) | `src/ui/views/overview.ts`, `src/core/event-review.ts`, `tests/core/event-review.test.ts`, `tests/ui/smoke.test.ts` | Thêm tham số `now: Date` (hoặc đưa `now` vào `AppState`) cho `overviewView`/`upcoming()`/`sortDraftsForReview()`; view gọi với mặc định `new Date()`; test truyền `NOW` cố định | `npx vitest run` → **0 failed**; CI xanh trên HEAD | 2–3 giờ |
| P0-2 | **Đồng bộ tài liệu với code** | `README.md`, `docs/chuc-nang-demo-vs-chinh-thuc.md`, `docs/DEVIATIONS.md`, `package.json` | Cập nhật Slice F = F0–F2 đã có, mặc định `report`; sửa số test (437/44); sửa description package.json bỏ chữ "khong dung mo hinh hoc may" | Mọi câu "chưa triển khai" khớp `git log`; số test khớp lệnh chạy thật | 1–2 giờ |
| P0-3 | **Chốt câu chuyện PhoBERT trong báo cáo** | `bao-cao/noi-dung/05-thuc-nghiem.md` (mục 5.2, 5.4) | Chọn 1 trong 2: (a) xin số liệu fine-tuning + dataset từ nhóm bàn giao và chạy F3; (b) viết mục 5.2 ở mức "model bàn giao, cấu hình service, trạng thái `report`, chưa đo" — không điền số không có nguồn | Không còn số liệu nào trong báo cáo thiếu nguồn; có quyết định (a)/(b) ghi rõ | 2 giờ (chưa kể chạy F3) |
| P0-4 | **Vá lỗ hổng ngày tương đối** | `src/core/extraction/normalize.ts`, mới `src/core/extraction/relative-date.ts` (hoặc mở rộng `core/dates.ts`), `tests/core/extraction-normalize*.test.ts` | Viết resolver tất định cho "thứ X tuần sau", "tuần sau", "ngày mai"… dựa trên `Hôm nay`; khi `isRelative` → model trả ngày phải **khớp resolver** mới nhận `value`, không khớp → `value=null` + giữ cờ `ngay_tuong_doi` | E10 đo lại không còn "thiếu"; thêm test: model trả ngày sai cho "thứ Ba tuần sau" → bị từ chối | 4–6 giờ |

> **Mốc chốt giai đoạn 1:** CI xanh + tài liệu khớp code + báo cáo không còn chỗ nào phải "bịa số".

---

## 2. Giai đoạn 2 — Củng cố điểm mạnh (~2–3 ngày công)

| # | Việc | File đụng tới | Cách làm | Tiêu chí xong | Ước lượng |
|---|---|---|---|---|---|
| P1-1 | **Commit bằng chứng đo thật vào repo** | `docs/evidence/` (mới), `docs/ket-qua-danh-gia-slice-e.md` §8 | Chạy lại eval live cho 9B IQ4_XS + PQ2_0 trên v5, lưu JSON log vào `docs/evidence/` (ẩn danh, kèm config model + build llama.cpp + ngày đo) | Người khác tái lập được từ repo không cần hỏi lại; §8 bỏ trạng thái "tệp tạm" | 0,5 ngày (cần máy có model) |
| P1-2 | **Mở rộng metric eval** | `tests/eval/metrics.ts`, `tests/fixtures/eval/case-*.ts` | Thêm vào `EvalMetrics`: khớp `end`, khớp `label`, khớp profile (dùng `profileNames` đang bỏ không), đếm cờ `uncertain` đúng; fixture chỉ thêm ca đo mới, không sửa đáp án cũ | `computeMetrics` trả đủ 4 chiều; toàn bộ fixture cũ vẫn pass | 0,5–1 ngày |
| P1-3 | **Mở rộng bộ mẫu** (tuỳ chọn nhưng nên làm) | `tests/fixtures/eval/` | Thêm 10–15 ca từ văn bản thật đã ẩn danh (thông báo trường, email lớp) — ưu tiên ca nhiều sự kiện, ca hạn nộp, ca ngày tương đối | ≥ 30 mẫu; ghi rõ trong báo cáo "17 tự soạn + N ca thật" | 0,5–1 ngày |
| P1-4 | **Hoàn thành vòng lặp cốt lõi: nhắc việc KS-10** | `src/platform/background/alarms.ts` (mới), `manifest.config.ts`, `src/core/events.ts` | `chrome.alarms` + `chrome.notifications` cho 3 mốc (1 tuần / 1 ngày / ngày diễn ra); chỉ sự kiện có `start.value`; bù alarm trễ khi SW restart | `grep chrome.alarms` có kết quả; test scheduled; KS-10 chạy được trên Chrome | 1–1,5 ngày |

> **Lưu ý P1-4:** `base_idea.md:22` yêu cầu "Cách thông báo khi có sự kiện đến" — đây là phần còn
> thiếu lớn nhất của đề tài. Nếu chỉ đủ thời gian cho MỘT việc lớn ở giai đoạn 2, chọn P1-4 thay
> vì P1-3: nó biến dự án từ "trích xuất" thành "quản lý lịch trình" đúng tên đề tài.

---

## 3. Giai đoạn 3 — Hardening & dọn dẹp (~0,5–1 ngày công)

| # | Việc | File đụng tới | Cách làm | Tiêu chí xong | Ước lượng |
|---|---|---|---|---|---|
| P2-1 | **Dọn repo** | `.gitignore`, `git rm --cached` | Bỏ khỏi git: `__pycache__/*.pyc`, `.idea/`; cân nhắc Git LFS hoặc GitHub Release cho `model.safetensors` (515MB); xoá/giữ `training_args.bin` sau khi trích số liệu cần thiết | `.git` < 100MB (sau rewrite) hoặc ít nhất không còn file rác mới được track | 2–4 giờ |
| P2-2 | **Chặn loopback ở tầng storage** | `src/platform/storage/filter-settings.ts`, `tests/platform/filter-settings.test.ts` | `saveFilterSettings` từ chối endpoint không phải `127.0.0.1/localhost/[::1]` ở cổng 8000/8081 (tái dùng logic validate của UI) | Lưu endpoint lạ → throw; test phủ ca | 1–2 giờ |
| P2-3 | **Test suy năm qua ranh giới năm** | `tests/core/extraction-normalize-v5.test.ts` | Thêm ca: `now` = 30/12/2026, văn bản "5/1" → kỳ vọng `nam_chua_ro` (không tự suy nhầm năm hiện tại) hoặc suy sang 2027 nếu làm resolver | Có test; hành vi rõ ràng, có tài liệu | 1–2 giờ |
| P2-4 | **Xử lý sự kiện qua đêm** | `src/core/dates.ts`, `src/core/events.ts` | Quy ước: end < start ≤ 24h → hiểu là qua đêm (+1 ngày) hoặc báo lỗi form; chọn 1 và ghi vào `script.md` Appendix A | Có test; hành vi khớp tài liệu | 2–3 giờ |

---

## 4. Việc CẮT GỌT (không làm, chỉ ghi nhận trong báo cáo)

| Hạng mục | Xử lý trong báo cáo |
|---|---|
| Gmail API / PDF / DOCX | Ghi ở "Hạn chế & hướng phát triển": hiện thay bằng **Dán văn bản** (`parse.ts:102-110`) |
| Sàng lọc PhoBERT (F3/screen) | Ghi ở "Hạn chế": đã có F0–F2, **mặc định `report`**, chưa đo F3, chưa bỏ qua lần gọi LLM nào |
| Provider remote (KS-14) | Ghi: "đã có code + test unit, **chưa kiểm chứng endpoint thật**" — KHÔNG viết "đã hỗ trợ Gemini" |
| Golden set 150 mẫu | Ghi thẳng: hiện 17 mẫu tự soạn (+ số ca thật nếu làm P1-3) |
| Gộp trùng paraphrase tự động | Ghi: chỉ gợi ý, không tự gộp (đúng thiết kế — giữ nguyên, đừng hứa thêm) |

---

## 5. Checklist trước khi nộp báo cáo / demo

- [ ] `npx vitest run` → **0 failed** (P0-1)
- [ ] `grep -rn "chưa triển khai" README.md docs/` → không còn chỗ nào sai lệch code (P0-2)
- [ ] Mục 5.2 báo cáo có nguồn cho mọi số liệu PhoBERT (P0-3)
- [ ] Ngày tương đối: có resolver + test từ chối ngày sai (P0-4)
- [ ] Log đo thật nằm trong repo (P1-1) — hoặc ghi rõ "log không commit, số liệu lấy từ lần đo ngày X"
- [ ] Demo chạy được trên Chrome: quét trang → trích → duyệt nháp → (P1-4 nếu làm) nhận thông báo
- [ ] `docs/kiem-thu-demo.md`: chạy lại KT-13/KT-14 và ghi kết quả
- [ ] Đọc lại §2–§4 của [`danh-gia-codebase.md`](danh-gia-codebase.md) để khớp narrative với bằng chứng

---

## 6. Tóm tắt theo kịch bản thời gian

| Thời gian còn lại | Làm gì |
|---|---|
| ~1 ngày | P0-1 + P0-2 + P0-3 (b) — "an toàn trình bày" |
| ~3 ngày | + P0-4 + P1-1 — "có bằng chứng mạnh" |
| ~5 ngày | + P1-4 (nhắc việc) — "đề tài khép vòng" |
| ≥ 1 tuần | + P1-2, P1-3, P2 — "bộ hồ sơ đầy đủ cho kỳ nghiệm thu" |
