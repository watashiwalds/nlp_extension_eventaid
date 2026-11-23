# Nguồn gốc bộ giữ kín (TASK 03)

Bộ 50 mẫu **chốt trước khi chạy** lần đo đầu tiên (`EVAL_SET=heldout`), tách khỏi
dev set E01–E17 để đo khả năng tổng quát hoá, không dùng để tune prompt.

## Phân bố (theo `bao-cao/caithienbaocao.md` §3.14)

| Nhóm | Id | Số lượng |
|---|---|---:|
| Dương — ngày giờ rõ ràng | H01–H08 | 8 |
| Dương — nhiều sự kiện trong cùng văn bản | H09–H14 | 6 |
| Dương — ngày thiếu năm | H15–H18 | 4 |
| Dương — ngày có nhưng thiếu giờ | H19–H22 | 4 |
| Dương — biểu thức thời gian tương đối | H23–H26 | 4 |
| Dương — lịch dạng trần thuật, không phải câu giao việc | H27–H30 | 4 |
| Âm — văn bản không có lịch trình | N01–N08 | 8 |
| Âm — có nhiệm vụ nhưng không có lịch | N09–N12 | 4 |
| Âm — có ngày/số liệu nhưng không phải sự kiện lịch | N13–N16 | 4 |
| Âm — tin tức, mô tả hoặc thông tin chung | N17–N20 | 4 |

## Nguồn và quy trình

| Hạng mục | Ghi chú |
|---|---|
| Nguồn | 100% **tự soạn** (23/11/2026) theo từng nhóm phân bố; không chép từ trang/email thật |
| Dữ liệu cá nhân | Không có tên/số điện thoại/email thật; tên đơn vị, công ty đều chung chung hoặc giả ("Sông Hồng", "Viết Máu") |
| `now` mỗi mẫu | Cố định `EVAL_NOW = 2026-10-22T08:00+07:00` (thứ Năm) cho **tất cả** mẫu — đủ để tái lập, kể cả mẫu tương đối (H23–H26) và thiếu năm (H15–H18) |
| Ngày tuyệt đối đã kiểm | Toàn bộ cặp "thứ − ngày" trong text/gold khớp lịch 2026 (ví dụ 19/11/2026 đúng là thứ Năm) |
| Gán nhãn (`expected`, `allowedDates`) | Lê Đăng Sơn (phiên agent 23/11/2026), theo quy ước gold của bộ E |
| Rà độc lập | [chờ thành viên nhóm xác nhận trước lần chạy] |
| Quy ước mẫu âm | `expected: []`, `allowedDates: []` — mọi ngày trong output của mẫu âm được coi là bịa (như E06) |

## Cam kết freeze

Giống dev set: sau lần đo held-out đầu tiên **không sửa** `text`/`expected`/
`allowedDates` của mẫu đã đo. Nếu buộc phải sửa: chạy lại **cả dev + held-out**,
lưu evidence riêng và ghi lý do (kế hoạch TASK 03 mục 6).
