# Checklist kiểm thử demo (thủ công)

Chạy trước khi demo/báo cáo. Mỗi mục ghi rõ kịch bản `script.md` tương ứng.

## 0. Chuẩn bị

- [ ] `cd extension && npm run build` không lỗi.
- [ ] Load unpacked `extension/dist` trên Chrome sạch; không có cảnh báo quyền lạ.
- [ ] Mở `chrome://extensions` → service worker **không** báo lỗi.
- [ ] DevTools của side panel: console sạch sau khi mở.

## 1. Đọc trang web (KS-04)

- [ ] Mở một bài báo tiếng Việt dài → popup → **Quét trang đang mở** → side panel mở, hiện tiêu đề + toàn văn.
- [ ] Badge phương thức = **Readability**; số ký tự hợp lý; nút “Xem toàn bộ” hoạt động.
- [ ] Mở trang động (SPA) khó đọc → vẫn có nội dung, badge **DOM thô (dự phòng)**.
- [ ] Bôi đen một đoạn → quét → badge **Vùng bôi đen**, nội dung đúng đoạn bôi đen.
- [ ] Trang `chrome://extensions` → popup báo không đọc được, không crash.
- [ ] Quét lại lần 2 → danh sách nguồn gần đây có 2 mục, chọn qua lại được.
- [ ] Xoá nội dung → sự kiện đã tạo vẫn còn.

## 2. Dán văn bản (thay cho Gmail/PDF)

- [ ] Dán nội dung email có ngày giờ → lưu → hiển thị đúng, badge **Văn bản dán**.
- [ ] Bỏ trống nội dung → toast lỗi, không tạo bản ghi rác.

## 3. Hồ sơ (KS-02)

- [ ] Tạo hồ sơ chỉ với tên → thành công.
- [ ] Bỏ trống tên → lỗi tại trường, dữ liệu đã nhập **không mất**.
- [ ] Email sai định dạng → lỗi email.
- [ ] Sửa hồ sơ → giữ nguyên ngày tạo, cập nhật `updatedAt`.
- [ ] Xoá hồ sơ đang gắn với sự kiện → sự kiện được gỡ hồ sơ, không lỗi.
- [ ] Biệt danh/từ khoá nhập cách nhau bằng dấu phẩy → hiển thị thành chip.

## 4. Tạo sự kiện thủ công (KS-08/09)

- [ ] Tạo sự kiện từ nội dung đã đọc → nguồn trích được đính kèm, xem được trong chi tiết.
- [ ] Tạo sự kiện không có thời điểm → lưu được, hiện badge “Chưa rõ thời điểm bắt đầu”.
- [ ] End < start → lỗi, giữ nguyên dữ liệu form.
- [ ] Tóm tắt 6 dòng → lỗi “tối đa 5 ý”.
- [ ] Nhập thời lượng 90 phút, không có end → chi tiết hiện “Kéo dài 1 giờ 30 phút”.
- [ ] Gắn 2 hồ sơ → chip hiển thị đúng tên.
- [ ] Sự kiện mới luôn ở trạng thái **Nháp**.

## 5. Quản lý sự kiện (KS-09)

- [ ] Nháp → **Theo dõi** → **✓ Đã xong** → có `completedAt`; quay lại **Theo dõi** thì mất `completedAt`.
- [ ] Sự kiện đang theo dõi và đã qua giờ → viền đỏ + nhãn “đã qua”.
- [ ] Lọc theo trạng thái, nhãn; tìm theo tiêu đề/tóm tắt/nguồn.
- [ ] Không có kết quả → empty state + nút “Xoá bộ lọc”.
- [ ] Sửa sự kiện → giữ id, trạng thái; nguồn cũ vẫn còn.
- [ ] Xoá sự kiện → biến mất khỏi danh sách và thống kê.

## 6. Dữ liệu (KS-13 một phần)

- [ ] Xuất JSON → tệp tải về, mở được, có `documents/profiles/events`.
- [ ] Xoá toàn bộ → về empty state.
- [ ] Nhập lại tệp vừa xuất → số lượng khôi phục đúng.
- [ ] Nhập tệp JSON rác → toast lỗi, dữ liệu cũ nguyên vẹn.

## 7. Phi chức năng

- [ ] Side panel kéo hẹp ~320px: không tràn ngang, nút vẫn bấm được.
- [ ] Chỉ dùng bàn phím: Tab qua các nút/ô nhập, focus ring rõ.
- [ ] Tắt/mở lại Chrome → dữ liệu còn (IndexedDB).
- [ ] Mở DevTools → Network: **không có** request ra ngoài.
