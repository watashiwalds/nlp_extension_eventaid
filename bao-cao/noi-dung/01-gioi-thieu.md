# Phần 1. Giới thiệu bài toán

## 1.1. Bối cảnh và vấn đề

Thông tin lịch trình cá nhân trong môi trường học tập và làm việc thường phân tán trên nhiều nguồn phi cấu trúc như cổng thông báo trực tuyến, thư điện tử và tin nhắn. Việc trích lục và nhập liệu thủ công vào các ứng dụng quản lý lịch tiềm ẩn ba hạn chế lớn: tiêu tốn thời gian thao tác, dễ bỏ sót các mốc sự kiện quan trọng (như hạn nộp hồ sơ, lịch bảo vệ, lịch phỏng vấn) và dễ phát sinh sai sót do cách diễn đạt thời gian tự do trong văn bản.

Trong tiếng Việt, các biểu thức thời gian thường khuyết thành phần (chẳng hạn chỉ ghi ngày và tháng mà không ghi năm, hoặc chỉ nêu ngày mà không có giờ cụ thể), sử dụng mốc tương đối theo thời điểm phát ngôn (như "thứ Ba tuần sau") hoặc dùng từ chỉ buổi mơ hồ (như "đầu giờ sáng", "buổi tối"). Nếu phần mềm tự động điền giá trị còn thiếu mà không có căn cứ, lịch trình sẽ bị sai lệch một cách âm thầm; ngược lại, nếu loại bỏ hoàn toàn các mốc khuyết thành phần, người dùng sẽ bỏ lỡ các sự kiện quan trọng cần theo dõi. Bên cạnh đó, do thông báo nội bộ và thư điện tử là dữ liệu mang tính riêng tư, một công cụ hỗ trợ trích xuất lịch trình không thể mặc định chuyển toàn bộ văn bản lên máy chủ đám mây bên ngoài mà cần ưu tiên xử lý cục bộ trên thiết bị của người dùng.

## 1.2. Phát biểu bài toán

Hệ thống nhận đầu vào là văn bản tiếng Việt do người dùng chủ động cung cấp, bao gồm: nội dung chính của trang web đang mở (đã lọc bỏ phần khung trang), vùng văn bản được bôi đen trực tiếp trên trang, hoặc văn bản dán từ thư điện tử và tài liệu khác. Kênh kết nối trực tiếp qua giao diện lập trình ứng dụng của hộp thư và bộ phân tích tệp đính kèm định dạng PDF/DOCX được đặt trong lộ trình mở rộng tiếp theo.

Đầu ra của bài toán là danh sách các sự kiện lịch trình có cấu trúc, mỗi sự kiện gồm đúng bảy trường thông tin: thời điểm bắt đầu; thời điểm kết thúc (hoặc thời lượng); nhãn phân loại (công vụ, giải trí, cá nhân, kỷ niệm,...); tiêu đề sự kiện; nội dung tóm tắt từ một đến năm ý chính (chủ đề, yêu cầu chuẩn bị, địa điểm, kết quả dự kiến); hồ sơ nhân sự liên quan trong danh sách hồ sơ người dùng đã thiết lập; và thông tin nguồn trích dẫn.

Quá trình xử lý phải thoả mãn ba ràng buộc cốt lõi:

- Mặc định thực thi suy luận cục bộ trên máy tính của người dùng; dữ liệu văn bản chỉ được gửi tới một điểm cuối từ xa khi người dùng chủ động lựa chọn và cấp sự đồng ý tường minh cho định danh nguồn đó.
- Không tự suy diễn dữ liệu thiếu căn cứ: mọi trường thời gian không tìm thấy cơ sở trong văn bản gốc phải được gắn cờ cảnh báo chưa xác định để người dùng kiểm tra, tuyệt đối không điền giá trị suy đoán một cách im lặng.
- Mọi kết quả trích xuất tự động đều khởi tạo ở trạng thái bản nháp để người dùng rà soát và phê duyệt trước khi chuyển sang danh sách theo dõi chính thức.

## 1.3. Cách tiếp cận đề xuất

Báo cáo đề xuất xây dựng một trình hỗ trợ dưới dạng tiện ích mở rộng trình duyệt, xử lý văn bản theo quy trình tuyến tính gồm sáu giai đoạn từ thu thập dữ liệu đến quản lý bản nháp:

- **Thu thập và chuẩn hoá nội dung:** Ưu tiên vùng văn bản người dùng bôi đen; tách nội dung chính của trang web kèm phương án dự phòng lấy văn bản khung trang hoặc nhận văn bản dán trực tiếp.
- **Sàng lọc tài liệu:** Sử dụng mô hình phân loại câu giao việc tiếng Việt đánh giá ở cấp độ tài liệu nhằm nhận diện văn bản có khả năng chứa thông tin lịch trình trước khi gọi mô hình trích xuất, tránh lãng phí thời gian suy luận trên văn bản không liên quan.
- **Trích xuất thông tin bằng mô hình ngôn ngữ lớn cục bộ:** Chia đoạn văn bản dài và thực hiện suy luận qua máy chủ cục bộ trên thiết bị người dùng với đầu ra tuân thủ lược đồ JSON ràng buộc.
- **Kiểm định và chuẩn hoá thời gian:** Đối chiếu mọi mốc thời gian mô hình sinh ra với văn bản gốc; chỉ cho phép suy đoán năm khuyết hoặc giờ mơ hồ khi thoả mãn bộ quy ước chặt và luôn gắn cờ cảnh báo để người dùng rà soát.
- **Khử trùng lặp và đối sánh hồ sơ:** Loại bỏ hoặc cảnh báo các bản ghi trùng tiêu đề – thời gian giữa các đoạn văn, đồng thời liên kết sự kiện với hồ sơ người liên quan dựa trên tên, biệt danh và từ khoá.
- **Quản lý và duyệt bản nháp:** Lưu sự kiện ở trạng thái bản nháp, hỗ trợ người dùng kiểm tra, chỉnh sửa và phê duyệt hàng loạt trước khi đưa vào lịch theo dõi.

## 1.4. Đóng góp chính

Báo cáo tập trung vào bốn đóng góp chính, mỗi đóng góp đều được kiểm chứng ở các phần sau:

- Xây dựng quy trình kiểm định ngày giờ hậu kiểm cho đầu ra của mô hình ngôn ngữ lớn, ngăn chặn hiện tượng tự bịa mốc thời gian thiếu căn cứ trong văn bản gốc và gắn cờ tường minh cho các trường suy đoán theo quy ước (trình bày ở Phần 4, đánh giá ở Phần 5).
- Thiết kế kiến trúc tiện ích mở rộng trình duyệt tách biệt tầng thu thập dữ liệu với quy trình xử lý ngôn ngữ dùng chung, đảm bảo mặc định suy luận cục bộ và kiểm soát quyền truy cập theo từng điểm cuối từ xa (Phần 4).
- Thiết lập bộ mẫu đánh giá định lượng tiếng Việt cùng quy trình đối sánh, lựa chọn mô hình lượng tử hoá theo sự đánh đổi giữa độ phủ sự kiện, độ chính xác thời gian và độ trễ suy luận (Phần 5).
- Thiết kế, tích hợp và đánh giá thực nghiệm thành phần sàng lọc tài liệu bằng mô hình PhoBERT đứng trước bước trích xuất của mô hình ngôn ngữ lớn (Phần 5).

## 1.5. Bố cục báo cáo

Nội dung báo cáo được tổ chức thành bảy phần. Phần 1 giới thiệu bối cảnh, phát biểu bài toán, cách tiếp cận và đóng góp chính. Phần 2 tổng quan các hướng nghiên cứu và công cụ liên quan, từ đó chỉ ra các khoảng trống kỹ thuật. Phần 3 hệ thống hoá các kiến thức nền tảng về xử lý văn bản tiếng Việt, mô hình ngôn ngữ tiền huấn luyện, sinh cấu trúc có ràng buộc, trích xuất thời gian và kiến trúc tiện ích mở rộng trình duyệt. Phần 4 trình bày chi tiết giải pháp đề xuất gồm kiến trúc hệ thống, luồng xử lý, các quyết định kỹ thuật, hợp đồng dữ liệu và cơ chế bảo mật. Phần 5 mô tả quy trình thực nghiệm, cấu hình mô hình phân loại và mô hình ngôn ngữ lớn, kịch bản đo lường cùng các kết quả định lượng. Phần 6 tổng kết các kết quả đạt được, phân tích hạn chế và đề xuất hướng phát triển. Phần 7 liệt kê danh mục tài liệu tham khảo.
