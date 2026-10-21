### Đề tài: Trích xuất và quản lý lịch trình cá nhân

Đầu vào: Nội dung text (mail, pdf, attachment)
Đầu ra: Lịch trình liên quan đến cá nhân

Bài toán xử lý: 

- Đầu vào lấy thế nào
 
        nội dung web raw (Mozila Readability)
        pdf (người dùng có thể bôi đen, tự động thì thế nào?)
        mail attachment (quyền, cách xử lý file khi chưa mở thế nào?)

- Quy trình xử lý
 
        Phân loại nội dung có chứa "sự kiện" nói chung không
        So khớp sự kiện với thông tin cá nhân của người dùng

- Quản lý đầu ra
 
        CRUD sự kiện thế nào
        Cách thông báo khi có sự kiện đến

---

### Cấu trúc của một "sự kiện":

        Thời điểm bắt đầu
        Thời điểm kết thúc / Thời lượng
        Nhãn sự kiện (công vụ, giải trí, cá nhân, kỷ niệm,...)
        Tiêu đề
        Nội dung tóm gọn (1-5 ý) gồm chủ đề chính, yêu cầu, địa điểm, kết quả sau sự kiện,...
        Hồ sơ liên quan (trong số các hồ sơ người dùng đã thiết lập)
        Nguồn trích
        