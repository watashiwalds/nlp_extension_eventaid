# Layout chuẩn

## 1. Thông số bắt buộc

| Hạng mục | Giá trị | Ghi chú |
|---|---|---|
| Khổ giấy | A4 (21 × 29.7 cm) | dọc |
| Lề trên | 2.5 cm | |
| Lề dưới | 2.5 cm | |
| Lề trái | 3.0 cm | dùng để đóng gáy |
| Lề phải | 2.0 cm | |
| Phông chữ | Times New Roman | áp cho cả 4 slot: `ascii`, `hAnsi`, `eastAsia`, `cs` |
| Cỡ chữ thường | 13 pt | style `Normal` |
| Giãn dòng | 1.3 dòng | multiple, áp cho `Normal` và các heading |
| Căn lề thường | đều hai bên (justify) | |
| Heading 1 | 16 pt, đậm, căn trái | mỗi phần bắt đầu trang mới |
| Heading 2 | 14 pt, đậm + nghiêng, căn trái | |
| Heading 3 | 13 pt, đậm, căn trái | yêu cầu gốc chỉ ghi "13px", đặt đậm theo quy ước |
| Số trang | giữa chân trang | trường `PAGE`, Times New Roman |
| Mục lục | sau bìa | trường `TOC \o "1-3"` |

Khoảng cách đoạn: `Normal` sau 6 pt, trước 0 pt. Heading 1 sau 12 pt; Heading 2 trước 12/sau 6;
Heading 3 trước 8/sau 4. Heading có `keep_with_next` để không nằm cuối trang một mình.

## 2. Vì sao phải can thiệp XML

`python-docx` đặt `style.font.name` chỉ ghi 2 slot `ascii`/`hAnsi`. Word và LibreOffice dùng thêm
`eastAsia` (chữ Việt/CJK) và `cs` (complex script), nên nếu thiếu, một số ký tự rơi về font theme.
Ngoài ra heading mặc định của template dính `asciiTheme="majorHAnsi"` và màu `themeColor="accent1"`
(xanh). Script `scripts/bao_cao.py` xử lý:

- `_set_fonts()`: ghi đủ 4 slot và **xoá** các thuộc tính `*Theme`.
- `_black()`: đặt `w:color` = `000000` và xoá `themeColor`/`themeShade`/`themeTint`.
- `configure_document()`: đặt `docDefaults` (font + cỡ 13 + `lang vi-VN`) để mọi run mới thừa kế.

Không sửa style bằng tay trong Word: lần `build` sau sẽ ghi đè.

## 3. Style phụ (ngoài yêu cầu gốc)

Các style này chỉ dùng cho thành phần không phải văn bản thường, không thay đổi layout cơ bản:

| Style | Dùng cho | Định dạng |
|---|---|---|
| `ChuThich` | chú thích bảng/hình | 12 pt, nghiêng, căn giữa, trước 3/sau 6 |
| `MaNguon` | khối mã, sơ đồ ASCII | Consolas 11, trái, giãn dòng 1.0, nền `F2F2F2` |
| `TieuDeMucLuc` | chữ "MỤC LỤC" | 16 pt đậm, giữa — **không** phải Heading 1 để không tự lặp trong mục lục |

Bảng dùng style `Table Grid`, chữ 13 pt (thừa kế `Normal`), hàng tiêu đề đậm và lặp lại khi sang
trang (`tblHeader`). Ảnh chèn rộng 14 cm, canh giữa, chú thích bên dưới.

## 4. Quy ước trình bày

- **Bảng:** chú thích **trên** bảng, dạng `Bảng 1. ...`; trong văn bản phải nhắc "Bảng 1".
- **Hình:** chú thích **dưới** hình, dạng `Hình 1. ...`; trong văn bản phải nhắc "Hình 1".
- **Đánh số mục:** `1.1.`, `1.1.1.` thủ công trong markdown, không dùng auto-numbering của Word
  (tránh lệch khi trộn nhiều nguồn nội dung).
- **Danh sách:** gạch đầu dòng dùng `- `; danh sách có thứ tự viết `1. ` và script in đúng số đã
  ghi (không tự đánh lại) — nhờ vậy trích dẫn kiểu "bước 3" luôn khớp.
- **Nhấn mạnh:** chỉ dùng đậm cho thuật ngữ/keyword, nghiêng cho từ nước ngoài hoặc tên tài liệu.
  Không dùng màu, không gạch chân (trừ liên kết nếu có).
- **Khoảng trắng:** một dòng trống giữa các đoạn trong markdown; không dùng nhiều dòng trống liên
  tiếp để "đẩy trang" — dùng ngắt trang tự động của Heading 1.

## 5. Chỗ cần sửa khi trường đổi quy định

Mở `scripts/bao_cao.py`, sửa hằng số ở đầu file rồi `build` lại:

```python
FONT = "Times New Roman"
BODY_PT = 13
LINE_SPACING = 1.3
MARGINS_CM = {"top": 2.5, "bottom": 2.5, "left": 3.0, "right": 2.0}
```

Cỡ heading nằm trong `configure_document()` (dict `headings`). Nếu đổi `BODY_PT`, cỡ bảng và
`docDefaults` tự theo; style `ChuThich`/`MaNguon` đặt cỡ riêng nên phải sửa tay nếu muốn.

## 6. Kiểm tra tự động

`check` mở lại file `.docx` và đối chiếu: 4 slot font, cỡ, đậm/nghiêng, căn lề, giãn dòng của
`Normal` + 3 heading; lề 4 phía; khổ giấy. Sai lệch nào cũng in `✗` kèm giá trị thực tế.

Giới hạn đã biết:

- Trường `TOC` chỉ hiện nội dung sau khi Word cập nhật (`Ctrl+A` → `F9`). LibreOffice có thể không
  tự cập nhật — mở bằng Word để nghiệm thu.
- Số trang hiện bắt đầu từ bìa (trang 1). Nếu trường yêu cầu bỏ số ở bìa hoặc đánh lại từ phần mở
  đầu, cần bổ sung section break — hỏi người dùng trước khi đổi.
- Script không tự co chữ trong bảng; bảng quá nhiều cột phải gộp cột hoặc chuyển thành danh sách.
