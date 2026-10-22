# Checklist kiểm thử demo (thủ công)

Chạy trước khi demo/báo cáo. Mỗi mục ghi rõ kịch bản `script.md` tương ứng.
Kế hoạch xử lý các mục còn lại: [`phien-lam-viec-tiep-theo.md`](./phien-lam-viec-tiep-theo.md).

> **Trạng thái phiên triển khai (2026-10-22):** 8 vấn đề VĐ-01…VĐ-08 đã được sửa trong mã.
> `typecheck`, `lint`, `test` (40 test), `build` đều xanh. Các ô `[ ]` bên dưới là việc
> **cần chạy lại trên Chrome thật** sau khi build — chưa được đánh dấu đạt trong phiên này.

## 0. Chuẩn bị

- [x] `cd extension && npm run build` không lỗi.
- [x] Load unpacked `extension/dist` trên Chrome sạch; không có cảnh báo quyền lạ.
- [x] Mở `chrome://extensions` → service worker **không** báo lỗi.
- [x] DevTools của side panel: console sạch sau khi mở.

## 1. Đọc trang web (KS-04)

- [x] Mở một bài báo tiếng Việt dài → popup → **Quét trang đang mở** → side panel mở, hiện tiêu đề + toàn văn.
- [x] Badge phương thức = **Readability**; số ký tự hợp lý; nút “Xem toàn bộ” hoạt động.
- [x] Mở trang động (SPA) khó đọc → vẫn có nội dung, badge **DOM thô (dự phòng)**.
- [x] Bôi đen một đoạn → quét → badge **Vùng bôi đen**, nội dung đúng đoạn bôi đen.
- [x] Bôi đen → chuột phải → **Quét sự kiện từ vùng chọn** → side panel mở, đọc đúng vùng chọn.
- [x] Document `raw_dom` hiện cảnh báo giải thích + nút **Dùng nội dung thô** tạo document mới.
- [x] Trang `chrome://extensions` → popup báo không đọc được, không crash.
- [x] Quét lại lần 2 → danh sách nguồn gần đây có 2 mục, chọn qua lại được.
- [x] Xoá nội dung → sự kiện đã tạo vẫn còn.

## 2. Dán văn bản (thay cho Gmail/PDF)

- [x] Khi đã có document, vẫn thấy nút **Dán văn bản** → mở form, dán email có ngày giờ → lưu → hiển thị đúng, badge **Văn bản dán**.
- [x] Bỏ trống nội dung → toast lỗi, không tạo bản ghi rác.

## 3. Hồ sơ (KS-02)

- [x] Tạo hồ sơ chỉ với tên → thành công.
- [x] Bỏ trống tên → lỗi tại trường, dữ liệu đã nhập **không mất**.
- [x] Email sai định dạng → lỗi email.
- [x] Sửa hồ sơ → giữ nguyên ngày tạo, cập nhật `updatedAt`.
- [x] Xoá hồ sơ đang gắn với sự kiện → sự kiện được gỡ hồ sơ, không lỗi.
- [x] Biệt danh/từ khoá nhập cách nhau bằng dấu phẩy → hiển thị thành chip.

## 4. Tạo sự kiện thủ công (KS-08/09)

- [x] Tạo sự kiện từ nội dung đã đọc → nguồn trích được đính kèm, xem được trong chi tiết.
- [x] Tạo sự kiện không có thời điểm → lưu được, hiện badge “Chưa rõ thời điểm bắt đầu”.
- [x] End < start → lỗi, giữ nguyên dữ liệu form.
- [ ] Tóm tắt 6–10 dòng → lưu được, chi tiết hiển thị đủ (không còn lỗi “tối đa 5 ý”).
- [x] Nhập thời lượng 90 phút, không có end → chi tiết hiện “Kéo dài 1 giờ 30 phút”.
- [x] Gắn 2 hồ sơ → chip hiển thị đúng tên.
- [x] Sự kiện mới luôn ở trạng thái **Nháp**.

## 5. Quản lý sự kiện (KS-09)

- [x] Nháp → **Theo dõi** → **✓ Đã xong** → có `completedAt`; quay lại **Theo dõi** thì mất `completedAt`.
- [x] Sự kiện đang theo dõi và đã qua giờ → viền đỏ + nhãn “đã qua”.
- [x] Lọc theo trạng thái, nhãn; tìm theo tiêu đề/tóm tắt/nguồn.
- [x] Không có kết quả → empty state + nút “Xoá bộ lọc”.
- [x] Sửa sự kiện → giữ id, trạng thái; nguồn cũ vẫn còn.
- [x] Xoá sự kiện → biến mất khỏi danh sách và thống kê.

## 6. Dữ liệu (KS-13 một phần)

- [x] Xuất JSON → tệp tải về, mở được, có `documents/profiles/events`.
- [x] Xoá toàn bộ → về empty state.
- [x] Nhập lại tệp vừa xuất → số lượng khôi phục đúng.
- [x] Nhập tệp JSON rác → toast lỗi, dữ liệu cũ nguyên vẹn.

## 7. Phi chức năng

- [ ] Side panel kéo hẹp 320 / 360 / 400px: không tràn ngang, ô ngày giờ hiển thị trọn, nút vẫn bấm được.
- [ ] Ở 320px và 400px: bấm mọi nút hiển thị đúng action, kể cả khi toast đang hiện.
- [x] Chỉ dùng bàn phím: Tab qua các nút/ô nhập, focus ring rõ.
- [x] Tắt/mở lại Chrome → dữ liệu còn (IndexedDB).
- [x] Mở DevTools → Network: **không có** request ra ngoài.

# VẤN ĐỀ

| ID | Nội dung | Trạng thái |
|---|---|---|
| VĐ-01 | Chưa rõ điều kiện dùng DOM thô | ✅ Đã sửa: cảnh báo khi `raw_dom` + nút **Dùng nội dung thô** (`forceRaw`), test `tests/platform/parse.test.ts` |
| VĐ-02 | Nút “Xem toàn bộ” nên hiển thị mọi lúc | ✅ Đã sửa: luôn render khi có document; test smoke |
| VĐ-03 | Bôi đen → chuột phải → “Quét sự kiện” | ✅ Đã thêm `contextMenus` + menu vùng chọn; cần xác nhận `sidePanel.open()` trên Chrome thật |
| VĐ-04 | Không thấy nút dán | ✅ Đã sửa: nút **Dán văn bản** luôn có trong card document; test smoke |
| VĐ-05 | Click area không ổn định | ✅ Đã giảm nguyên nhân: bỏ chặn click của gradient/toast/busy, tăng hit area icon/link, bỏ dịch nút khi bấm; cần kiểm thủ công |
| VĐ-06 | Tràn ngang khi nhập ngày giờ | ✅ Đã sửa: `minmax(0, 1fr)`, `min-width: 0`, stack 1 cột ≤ 420px; cần kiểm ở 320/360/400px |
| VĐ-07 | Tóm tắt không giới hạn 5 ý khi nhập tay | ✅ Đã sửa: cap 50 ý; LLM sau này truyền `maxItems = 5`; đã sync `script.md` + `DEVIATIONS.md` |
| VĐ-08 | Một số Tab focus không cần thiết | ✅ Đã sửa: bỏ `autofocus`, focus ô lỗi đầu tiên sau validate, thêm `:focus-visible`, Esc đóng form |

**Ghi chú:** các mục ✅ là thay đổi mã đã qua test tự động/build. Các kiểm tra cần Chrome thật
(menu chuột phải, kéo side panel, vùng click) được liệt kê ở §1, §2, §7 và cần chạy lại thủ công.

## Vấn đề tồn đọng

- Trang web động (Gmail) vượt ngưỡng giới hạn của chức năng quét + raw DOM
- Giao diện chọn ngày và chọn giờ chi tiết vẫn tràn khi UI hẹp

## Gợi ý cải thiện

- Ưu tiên hiển thị sự kiện gần nhất chưa diễn ra thay vì xếp toàn bộ sự kiện theo thời gian tuyệt đối.
- Thêm context menu "Quét nội dung trên trang" khi chuột phải, kích hoạt chức năng tương tự nút "Quét trang đang mở" của UI nhỏ.
- Cho phép người dùng tạo nhãn tuỳ chỉnh.
- Tab "Tổng quan" hiển thị kế hoạch của từng hồ sơ theo dạng tab.
- UI "Quét nội dung" nằm trong tab riêng.
- Lược bỏ các chuỗi liên quan đến hệ thống (ví dụ: demo, trong IndexedDB,...) khỏi các phần UI thông thường, thêm mục "Về phiên bản này" trong tab "Cài đặt" cho các thông tin đó.