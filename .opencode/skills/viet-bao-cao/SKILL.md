---
name: Viết báo cáo DOCX
description: Hoàn thiện báo cáo môn học/đồ án cho repo này thành file .docx chuẩn layout (A4, Times New Roman 13, lề trên/dưới 2.5cm, trái 3cm, phải 2cm, giãn dòng 1.3) và duyệt/chốt từng phần theo 7 phần bắt buộc, trích dẫn IEEE. Dùng khi người dùng yêu cầu viết, sửa, hoàn thiện, chuẩn hoá định dạng báo cáo, tạo file Word, hoặc bổ sung trích dẫn tài liệu tham khảo.
---

# Viết báo cáo DOCX

## Tổng quan

Báo cáo được **sinh tự động từ markdown**: mỗi phần là một file trong `bao-cao/noi-dung/`,
script dựng lại `bao-cao/bao-cao.docx` với layout cố định. Không sửa tay file `.docx` — mọi thay
đổi đi qua markdown rồi build lại. Nhờ vậy layout không bao giờ trôi, và việc "chốt từng phần"
chỉ là ghi nội dung đã duyệt vào đúng file rồi build.

Người dùng duyệt **từng phần một**. Không được viết trước phần sau, không được đưa phần sau vào
docx khi phần trước chưa được chốt.

## Khi nào dùng

- Người dùng muốn viết/hoàn thiện báo cáo cho codebase trong repo này.
- Cần file `.docx` đúng layout trường, có bìa, mục lục, 7 phần, danh mục tham khảo.
- Cần chuẩn hoá lại định dạng hoặc trích dẫn của báo cáo đã có.

**Không dùng** cho bài trình bày/slide (repo đã có `presentation.html`/`generate_pptx.py`).

## Nguyên tắc bất biến

1. **Một nguồn sự thật:** `bao-cao/noi-dung/*.md` → `bao-cao/bao-cao.docx`. Sửa docx bằng tay là
   sai quy trình; lần `build` sau sẽ ghi đè.
2. **Cổng chốt:** chỉ ghi phần N vào file khi người dùng nói rõ "chốt / duyệt / ok phần này".
   Câu hỏi, góp ý, hoặc im lặng **không** phải là chốt.
3. **Không bịa:** số liệu đo, thông số huấn luyện, tên tài liệu, DOI/URL đều phải có thật và
   kiểm chứng được. Thiếu thì ghi `[CẦN-BỔ-SUNG]` / `[CẦN-NGUỒN]` và hỏi — không đoán.
4. **Phần 3 không nhắc codebase:** không tên file/hàm/biến/thành phần nội bộ. Chỉ lý thuyết và
   keyword chuyên ngành.
5. **Tiếng Việt, văn phong báo cáo khoa học:** khách quan, không xưng "tôi/bạn", không emoji,
   không viết tắt tuỳ tiện. Thuật ngữ tiếng Anh in nghiêng hoặc giữ nguyên kèm giải thích lần đầu.
6. **Không đổi thứ tự/tiêu đề 7 phần** và không gộp phần. Mọi thay đổi cấu trúc phải hỏi trước.

## Quy trình

### Phase 0 — Chuẩn bị (một lần)

1. Kiểm tra môi trường, cài `python-docx` nếu chưa có (repo đã tạo sẵn `.venv` thì bỏ qua bước
   này):

```bash
python3 -m venv .opencode/skills/viet-bao-cao/.venv
.opencode/skills/viet-bao-cao/.venv/bin/pip install python-docx
```

2. Thu thập thông tin bìa (hỏi gọn trong **một** lượt, kèm giá trị mặc định để người dùng chỉ cần
   sửa): trường, khoa, loại báo cáo (môn học/đồ án/tiểu luận), tên đề tài, chuyên ngành, giảng viên
   hướng dẫn, sinh viên, MSSV, lớp, địa điểm, năm.
3. Hỏi 3 điều kiện tiên quyết cho Phần 5 (rất quan trọng, repo **không** có):
   - Bộ dữ liệu fine-tuning PhoBERT: nguồn, số mẫu, nhãn, tỉ lệ chia train/val/test.
   - Siêu tham số: epochs, learning rate, batch size, `max_length`, optimizer, phần cứng, thời gian.
   - Kết quả trên tập test: accuracy / precision / recall / F1 (nếu có).
   Nếu người dùng chưa có, ghi nhận là "chưa có" và để placeholder — **không tự suy ra từ
   `training_args.bin` hay từ blog**.
4. Chốt kiểu trích dẫn: mặc định **IEEE** (số `[1]`). Nếu trường yêu cầu APA/Harvard, đổi toàn bộ
   theo `references/trich-dan.md` và ghi rõ đã đổi.
5. Tạo khung + docx:

```bash
.opencode/skills/viet-bao-cao/.venv/bin/python \
  .opencode/skills/viet-bao-cao/scripts/bao_cao.py init --dir bao-cao
```

6. Báo lại: đường dẫn file, cấu trúc 7 phần, những chỗ còn `...` trên bìa. **Dừng** cho người dùng
   xác nhận bìa trước khi soạn Phần 1.

### Phase 1–7 — Vòng lặp có cổng

Lặp cho từng phần, đúng thứ tự 1 → 7:

1. **Thu thập dữ kiện** từ nguồn trong bảng dưới. Đọc file thật, không nhớ lại.
2. **Soạn nháp trong chat** (markdown, đúng mẫu ở `references/noi-dung.md`). Cuối bản nháp ghi:
   - số liệu lấy từ file/dòng nào;
   - chỗ còn thiếu (`[CẦN-BỔ-SUNG]`, `[CẦN-NGUỒN]`);
   - câu hỏi cần người dùng trả lời.
3. **Chờ chốt.** Không ghi file, không build.
4. Khi được chốt: ghi đè `bao-cao/noi-dung/NN-ten.md` (**giữ dòng `# Phần N. ...` ở đầu
   file** — đó là tiêu đề phần trong docx), rồi:

```bash
.opencode/skills/viet-bao-cao/.venv/bin/python \
  .opencode/skills/viet-bao-cao/scripts/bao_cao.py build --dir bao-cao
```

5. Báo tiến độ ngắn: `Đã vào docx: Phần 1, 2 (2/7)`. Rồi trình bày nháp phần kế tiếp.
6. Nếu người dùng yêu cầu sửa phần **đã chốt**: chỉ sửa phần đó, build lại, và nói rõ đã đổi gì.
   Không tự sửa lan sang phần khác.

### Phase cuối — Nghiệm thu

```bash
.opencode/skills/viet-bao-cao/.venv/bin/python \
  .opencode/skills/viet-bao-cao/scripts/bao_cao.py check --dir bao-cao --strict
```

Chỉ kết thúc khi: layout ĐẠT, không còn `[CẦN-NGUỒN]`, trích dẫn khớp danh mục, không phần nào
chưa chốt. Sau đó hướng dẫn người dùng mở Word, `Ctrl+A` → `F9` để cập nhật mục lục và số trang,
và kiểm tra mắt thường: bìa, bảng không tràn lề, hình có chú thích.

## Nguồn dữ kiện theo phần

| Phần | Nội dung bắt buộc | Nguồn trong repo |
|---|---|---|
| 1 | Vấn đề, phạm vi, cách tiếp cận, đóng góp | `base_idea.md`, `README.md`, `docs/chuc-nang-demo-vs-chinh-thuc.md` |
| 2 | Giải pháp trước đó, khoảng trống | `docs/ke-hoach-bo-loc-noi-dung.md` §2.4, `proposed_technical.md` §8–9 + tài liệu ngoài |
| 3 | Lý thuyết + keyword, **không** nhắc codebase | `proposed_technical.md`, `ke_hoach_phat_trien.md` §6–7 + tài liệu gốc |
| 4 | Giới thiệu codebase, kiến trúc, phương pháp | `AGENTS.md` §5, `extension/README.md`, `extension/src/shared/contracts.ts`, `docs/DEVIATIONS.md` |
| 5 | Pipeline, PhoBERT + fine-tuning, kịch bản, so sánh có/không, kết luận | `ml_hasevent_filter/`, `docs/ke-hoach-bo-loc-noi-dung.md` §2 + §12, `docs/ket-qua-danh-gia-slice-e.md`, `extension/tests/`, `docs/kiem-thu-demo.md` §9 |
| 6 | Mục tiêu đạt, hạn chế, định hướng | `AGENTS.md` §11, `docs/DEVIATIONS.md` |
| 7 | Danh mục tham khảo | các nguồn đã trích ở Phần 1–6 |

Chi tiết đề cương từng phần: `references/noi-dung.md`.

**Cảnh báo dữ kiện Phần 5:** repo chỉ có trọng số đã huấn luyện
(`ml_hasevent_filter/models/phobert_task_classifier_final/`) và `model_config.json`
(`vinai/phobert-base-v2`, `max_length 128`, `task_threshold 0.5`, 2 nhãn NON_TASK/TASK).
**Không có** dataset, log huấn luyện hay bảng kết quả test → phải hỏi người dùng, không suy diễn.
Số liệu đo trong repo (latency, recall của LLM, probe sàng lọc 2026-10-27) là **của codebase**,
được dùng ở Phần 5 nhưng phải ghi đúng ngày/chế độ như tài liệu.

## Trích dẫn

- Kiểu IEEE: `[1]`, nhiều nguồn `[1], [3]`, dải `[1]–[3]`; đặt **trước** dấu chấm câu.
- Mỗi khẳng định không xuất phát từ codebase phải có nguồn. Không trích cho có.
- Thứ tự đánh số theo **lần xuất hiện đầu tiên** trong thân bài.
- Mỗi tài liệu một dòng trong `07-trich-dan.md`, dạng `1. Tác giả. (Năm). *Tên*. Nguồn. DOI/URL`.
- Phải mở/kiểm tra URL hoặc DOI trước khi đưa vào; không chấp nhận nguồn "nghe nói".
- Không trích tài liệu không được dùng trong bài (script `check` sẽ cảnh báo).
- Thiếu nguồn thì để `[CẦN-NGUỒN]` — `check --strict` sẽ chặn cho tới khi bổ sung.

Định dạng chi tiết và ví dụ: `references/trich-dan.md`.

## Lệnh thường dùng

```bash
PY=.opencode/skills/viet-bao-cao/.venv/bin/python
S=.opencode/skills/viet-bao-cao/scripts/bao_cao.py

$PY $S init  --dir bao-cao            # tạo khung + docx lần đầu
$PY $S build --dir bao-cao            # dựng lại docx sau mỗi lần chốt
$PY $S check --dir bao-cao            # kiểm tra layout + trích dẫn + tiến độ
$PY $S check --dir bao-cao --strict   # nghiệm thu cuối
```

Xuất PDF để gửi kèm (không bắt buộc):

```bash
soffice --headless --convert-to pdf --outdir bao-cao bao-cao/bao-cao.docx
```

## Cấu trúc thư mục

```text
bao-cao/
├── bao-cao.docx          # sinh tự động, không sửa tay
├── noi-dung/
│   ├── 00-bia.md         # thông tin bìa (key: value)
│   ├── 01-gioi-thieu.md
│   ├── 02-tong-quan.md
│   ├── 03-kien-thuc-nen-tang.md
│   ├── 04-de-xuat-giai-phap.md
│   ├── 05-thuc-nghiem.md
│   ├── 06-ket-luan.md
│   └── 07-trich-dan.md
└── hinh/                 # ảnh chèn vào báo cáo (nếu có)
```

## Markdown được hỗ trợ

| Cú pháp | Kết quả trong docx |
|---|---|
| `# ` | Heading 1 (16pt, đậm, trái) — mỗi phần một trang |
| `## ` | Heading 2 (14pt, đậm nghiêng, trái) |
| `### ` | Heading 3 (13pt, đậm, trái) |
| đoạn văn | Normal 13pt, căn đều hai bên, giãn dòng 1.3 |
| `- ` / `1. ` | gạch đầu dòng / đánh số thủ công, treo lề 0.75cm |
| `**đậm**`, `*nghiêng*`, `` `mã` `` | định dạng trong dòng |
| bảng `\| ... \|` | Table Grid, hàng đầu đậm, lặp tiêu đề khi sang trang |
| `> Chú thích` | dòng chú thích hình/bảng (12pt nghiêng, giữa) |
| ` ```...``` ` | khối mã (Consolas 11, nền xám) |
| `![Chú thích](hinh/x.png)` | ảnh rộng 14cm + chú thích |
| `<!-- ... -->` | ghi chú soạn thảo, không in ra |

Quy ước đặt chú thích: **Bảng** đặt trên bảng, **Hình** đặt dưới hình, đánh số tăng dần
(`Bảng 1.`, `Hình 1.`). Chi tiết layout: `references/layout.md`.

## Cổng chất lượng

Trước khi tuyên bố hoàn thành:

- [ ] `check --strict` trả về `Kết quả: ĐẠT`.
- [ ] Bìa không còn `...`; đúng tên trường/khoa/giảng viên/sinh viên.
- [ ] Đủ 7 phần, đúng tiêu đề, đúng thứ tự.
- [ ] Phần 3 không có `extension/`, `src/`, tên hàm/file nội bộ.
- [ ] Mỗi bảng/hình có chú thích và được nhắc trong văn bản ("Bảng 1 cho thấy...").
- [ ] Số liệu Phần 5 khớp tài liệu đo, có ngày và điều kiện đo.
- [ ] Trích dẫn `[n]` khớp 1–1 với danh mục, không có mục tham khảo "mồ côi".
- [ ] Mở Word: cập nhật mục lục, kiểm tra số trang, không có dòng tràn lề.

## Lỗi thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| Heading bị xanh, font Calibri | Style dính theme font/màu. Script đã xoá `asciiTheme`/`themeColor`; không sửa style bằng tay, build lại. |
| Mục lục trống | Trường `TOC` chưa cập nhật. Word: `Ctrl+A` → `F9` → "Update entire table". |
| Chữ tiếng Việt bị lệch font | Chỉ đặt `font.name` sẽ thiếu slot `eastAsia`/`cs`; script đặt cả 4 slot. |
| Bảng tràn lề | Quá nhiều cột: gộp cột hoặc chuyển sang danh sách; script không tự co chữ. |
| Nội dung bị mất sau khi sửa docx | Đã sửa tay docx. Khôi phục bằng `build` từ markdown. |
| `check` báo "Tài liệu [n] không được trích" | Xoá mục tham khảo thừa hoặc bổ sung trích dẫn trong thân bài. |

## Ghi chú đã hiệu chỉnh so với yêu cầu gốc

- "Time News Roman" → **Times New Roman**.
- "giãn dòng 1.3px" → **1.3 dòng** (Word không có đơn vị px cho line spacing; 1.3px là không
  thể đọc được). Nếu trường yêu cầu "Exactly 1.3pt" thì đó là hiểu nhầm đơn vị — hỏi lại.
- Heading 3 được đặt **đậm** (yêu cầu chỉ ghi "13px"); nếu cần thường, sửa `_style_font` trong
  script và build lại.
