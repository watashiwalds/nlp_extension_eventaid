# Phần 6. Kết luận

## 6.1. Kết quả đạt được

Đối chiếu với mục tiêu và các đóng góp đặt ra ở Phần 1, dự án đã hoàn thành việc thiết kế và hiện thực hoá một trình hỗ trợ trích xuất kế hoạch cá nhân từ văn bản tiếng Việt dưới dạng tiện ích mở rộng trình duyệt chuẩn Manifest V3 với các kết quả cụ thể sau:

- **Kiến trúc tiện ích mở rộng phân tách thu thập và xử lý ngôn ngữ, bảo vệ quyền riêng tư theo mặc định:** Hệ thống đã xây dựng hoàn chỉnh kênh thu thập văn bản trang web đa tầng (ưu tiên vùng văn bản chọn, tách bài viết bằng thuật toán Readability kết hợp lọc khung điều hướng và phương án dự phòng lấy văn bản DOM thô, cùng kênh dán văn bản trực tiếp), đi kèm giao diện quản lý hồ sơ, phát hiện sự kiện tương đồng và phê duyệt bản nháp hàng loạt. Quy trình suy luận chạy độc lập trong tài liệu ngoài màn hình (*offscreen document*), mặc định kết nối với máy chủ suy luận cục bộ trên thiết bị người dùng và chỉ mở kết nối HTTPS tới điểm cuối từ xa tương thích OpenAI khi người dùng chủ động xác nhận sự đồng ý (*consent*) cùng quyền truy cập mạng theo từng định danh nguồn.
- **Cơ chế kiểm định ngày giờ hậu kiểm chống ảo giác:** Bằng cách kết hợp giải mã có ràng buộc theo lược đồ JSON Schema với tầng hậu kiểm tất định đối chiếu trực tiếp cụm từ thời gian nguyên văn trong văn bản gốc, hệ thống đã triệt tiêu hoàn toàn hiện tượng mô hình ngôn ngữ lớn tự bịa ngày giờ trong toàn bộ các lượt đo thực nghiệm (0 ngày giờ bịa đặt, 100% đầu ra đúng cấu trúc JSON), đồng thời hỗ trợ suy đoán có kiểm soát và gắn cờ cảnh báo tường minh đối với trường hợp khuyết năm hoặc dùng từ chỉ buổi mơ hồ.
- **Đánh giá định lượng và lựa chọn mô hình ngôn ngữ lớn lượng tử hoá phù hợp phần cứng cá nhân:** Đã xây dựng bộ mẫu đánh giá tiếng Việt gồm 17 kịch bản bao phủ các ca biên thực tế và tiến hành đo kiểm bốn cấu hình mô hình từ 4 tỷ đến 27 tỷ tham số trên máy tính cá nhân trang bị 4 GB VRAM, qua đó xác lập hai cấu hình đạt chuẩn nghiệm thu là mô hình 9B lượng tử hoá 4-bit (độ phủ 88,0%, độ chuẩn xác 91,7%, ưu tiên độ ổn định) và mô hình 9B lượng tử hoá 2-bit (độ phủ 88,0%, độ trễ phân vị thứ 95 chỉ 6,6 giây, ưu tiên tốc độ phản hồi).
- **Thành phần sàng lọc tài liệu bằng mô hình PhoBERT:** `[CẦN-BỔ-SUNG: Kết luận về kết quả huấn luyện, tích hợp và hiệu quả thực nghiệm của mô hình sàng lọc PhoBERT sẽ được bổ sung sau khi hoàn thiện số liệu ở Phần 5.]`

## 6.2. Hạn chế

Bên cạnh các kết quả đã đạt được, hệ thống hiện tại vẫn còn một số hạn chế cần được nhìn nhận khách quan:

- **Quy mô bộ mẫu đánh giá:** Bộ dữ liệu đánh giá trích xuất hiện tại gồm 17 mẫu tài liệu được chọn theo phương pháp lấy mẫu thuận tiện để kiểm tra các ca biên kỹ thuật, chưa đạt tới quy mô bộ dữ liệu lớn đa miền.
- **Hạn chế của tầng sàng lọc PhoBERT:** `[CẦN-BỔ-SUNG: Các hạn chế thực nghiệm của mô hình phân loại PhoBERT và chế độ sàng lọc tài liệu sẽ được bổ sung sau khi hoàn tất đo lường ở Phần 5.]`
- **Xử lý biểu thức thời gian tương đối phức tạp:** Các mô hình ngôn ngữ lớn cục bộ 9 tỷ tham số vẫn còn gặp khó khăn khi phải tự tính toán lịch để quy đổi một số cụm từ thời gian tương đối phức tạp (như *"thứ Ba tuần sau"*) sang ngày dương lịch chính xác, dẫn tới việc hệ thống phải hạ về trạng thái chưa xác định để đảm bảo an toàn không bịa ngày.
- **Phạm vi kênh thu thập và tính năng nhắc việc tự động:** Hệ thống chưa tích hợp trực tiếp kênh kết nối Gmail API, chưa có bộ phân tích trực tiếp tệp đính kèm định dạng PDF/DOCX và chưa kích hoạt bộ lập lịch phát thông báo nhắc việc tự động theo mốc thời gian sự kiện trên trình duyệt.
- **Sự phụ thuộc vào tiến trình máy chủ suy luận cục bộ:** Khi vận hành ở chế độ mặc định trên máy cá nhân, người dùng cần khởi chạy dịch vụ máy chủ suy luận bên ngoài trình duyệt.

## 6.3. Định hướng phát triển

Từ các hạn chế nêu trên, lộ trình phát triển tiếp theo của hệ thống được xác định theo hai giai đoạn ưu tiên:

1. **Định hướng ngắn hạn:**
   - `[CẦN-BỔ-SUNG: Định hướng cải thiện mô hình và ngưỡng quyết định cho bước sàng lọc PhoBERT dựa trên kết quả thực nghiệm Phần 5.]`
   - Bổ sung bộ quy đổi biểu thức thời gian tương đối tiếng Việt bằng quy tắc tất định kết hợp với mốc ngày tham chiếu để hỗ trợ mô hình ngôn ngữ lớn xử lý chính xác các cụm từ chỉ thứ – tuần tương đối.
   - Hiện thực hoá thành phần lập lịch nhắc việc tự động bằng `chrome.alarms` và thông báo hệ thống cho các sự kiện đang theo dõi đã có đầy đủ ngày giờ bắt đầu.
2. **Định hướng dài hạn:**
   - Mở rộng tầng thu thập dữ liệu sang kênh kết nối trực tiếp Gmail API (quyền chỉ đọc) và bổ sung các bộ phân tích chuyên biệt cho tệp đính kèm PDF, DOCX, iCalendar (`.ics`) đổ vào cùng cấu trúc tài liệu chuẩn hoá hiện có.
   - Mở rộng quy mô bộ dữ liệu đánh giá chuẩn tiếng Việt lên trên 150 mẫu thực tế đã ẩn danh và thử nghiệm tinh chỉnh lời nhắc cho các mô hình nhỏ hơn (như nhóm 3B–4B tham số) để giảm hơn nữa yêu cầu phần cứng cho người dùng phổ thông.
