# Phần 5. Thực nghiệm và kết quả

## 5.1. Quy trình xử lý trong môi trường thực nghiệm

Trong môi trường thực nghiệm, văn bản đầu vào được đưa qua đường ống xử lý tự động từ khâu thu thập đến khi sinh bản nháp sự kiện. Tài liệu sau khi thu thập từ trang web hoặc từ văn bản người dùng cung cấp được chuẩn hoá về cấu trúc thống nhất, đi qua tầng sàng lọc tài liệu bằng mô hình PhoBERT (theo chế độ vận hành được cấu hình), sau đó toàn bộ văn bản gốc được chia thành các đoạn có chồng lấn để đưa vào máy chủ suy luận mô hình ngôn ngữ lớn cục bộ kèm lược đồ JSON Schema ràng buộc. Kết quả sinh ra từ từng đoạn lần lượt đi qua bộ chuẩn hoá và kiểm định ngày giờ đối chiếu nguyên văn, bộ đối sánh hồ sơ nhân sự và bộ khử trùng lặp liên đoạn trước khi ghi nhận thành danh sách sự kiện nháp.

## 5.2. Mô hình phân loại PhoBERT và quá trình tinh chỉnh

`[CẦN-BỔ-SUNG: Nội dung chi tiết về kiến trúc mô hình phân loại PhoBERT, bộ dữ liệu huấn luyện (nguồn, số mẫu, phân bố nhãn, tỉ lệ chia tập), siêu tham số quá trình fine-tuning và kết quả đánh giá trên tập kiểm thử độc lập sẽ được bổ sung sau.]`

## 5.3. Thực nghiệm đánh giá và lựa chọn mô hình ngôn ngữ lớn

### 5.3.1. Môi trường và bộ mẫu đánh giá

Quá trình đo lường thực nghiệm đối với tầng trích xuất sự kiện được thực hiện trên máy tính cá nhân trang bị bộ vi xử lý AMD Ryzen 5 5600H (6 luồng thực thi suy luận) và bộ xử lý đồ hoạ rời NVIDIA GeForce RTX 3050 Laptop với 4 GB VRAM, vận hành động cơ suy luận `llama.cpp` cục bộ (sử dụng bộ nhớ đệm KV lượng tử hoá 8-bit).

Bộ dữ liệu đánh giá (*golden evaluation set*) gồm **17 mẫu tài liệu tiếng Việt** (ký hiệu từ E01 đến E17, tổng cộng 25 sự kiện kỳ vọng trong lượt chạy đầu) được xây dựng theo phương pháp lấy mẫu thuận tiện có chủ đích nhằm bao phủ các tình huống thực tế và các ca biên điển hình:
- **Nhóm thông báo đơn và đa sự kiện chuẩn (E01–E05, E09, E11):** Gồm lịch họp có giờ bắt đầu – kết thúc, hội thảo nhiều phiên liên tiếp trong cùng một ngày, thông báo thực tập có buổi giới thiệu kèm hạn nộp hồ sơ, và lịch công tác nhiều hoạt động.
- **Nhóm biểu thức thời gian khuyết hoặc mơ hồ (E07, E08, E10, E16, E17):** Gồm sự kiện chỉ có ngày không có giờ, sự kiện khuyết năm phải suy đoán theo năm ngữ cảnh và gắn cờ, sự kiện dùng ngày tương đối (*"thứ Ba tuần sau"*), và sự kiện dùng từ chỉ buổi mơ hồ (*"buổi tối"*) phải ánh xạ qua bảng giờ quy ước.
- **Nhóm kiểm tra khử trùng lặp, văn bản dài, hồ sơ và chống tấn công lời nhắc (E12–E15):** Gồm tài liệu quét lặp lại nhiều lần và diễn đạt lại (*paraphrase*) để đo khả năng chặn trùng, tài liệu chứa câu gài bẫy chèn chỉ dẫn giả (*prompt injection* yêu cầu tạo sự kiện giả vào năm 2030), tài liệu rất dài vượt ngân sách 4 đoạn phải cắt bớt, và tài liệu đối sánh tên/biệt danh hồ sơ tiếng Việt có dấu và không dấu.
- **Nhóm tài liệu âm không chứa sự kiện (E06):** Bản tin tổng hợp có nhiều con số thống kê nhưng không có sự kiện lịch trình, dùng để kiểm tra khả năng không sinh sự kiện rác.

### 5.3.2. Kết quả so sánh các mô hình ngôn ngữ lớn lượng tử hoá

Thực nghiệm tiến hành đo bốn cấu hình mô hình ngôn ngữ lớn lượng tử hoá khác nhau (mỗi mẫu chạy lặp lại 2 lượt độc lập để kiểm tra tính ổn định): **Qwen3.5-9B IQ4_XS** (9,2 tỷ tham số, 4,25 bpw, dung lượng 5,5 GB, nạp 16 tầng lên GPU), **Qwen3.5-4B Q5_K_S** (4,3 tỷ tham số, dung lượng 3,2 GB, nạp toàn bộ lên GPU), **Ternary-Bonsai-2-27B PTQ1_0** (26,9 tỷ tham số lượng tử hoá tam phân 1,75 bpw, dung lượng 5,9 GB, nạp 32 tầng lên GPU) và **Ternary-Bonsai-2-9B PQ2_0** (9,2 tỷ tham số lượng tử hoá 2,13 bpw, dung lượng 2,66 GB, nạp gần như toàn bộ lên GPU). Các tiêu chí nghiệm thu cứng được đặt ra gồm: độ phủ sự kiện (*Recall*) đạt từ `80%` trở lên, số ngày giờ bịa đặt bằng `0`, tỉ lệ sinh đúng cấu trúc JSON đạt từ `95%` trở lên và độ trễ phân vị thứ 95 (*p95 latency*) không vượt quá `90 giây`.

> Bảng 1. Kết quả so sánh bốn mô hình ngôn ngữ lớn lượng tử hoá trên bộ mẫu cơ sở (15 mẫu E01–E15, lời nhắc v4).

| Chỉ số đánh giá | Qwen3.5-9B (IQ4_XS) | Qwen3.5-4B (Q5_K_S) | Bonsai-2-27B (PTQ1_0) | Bonsai-2-9B (PQ2_0) | Ngưỡng yêu cầu |
|---|---|---|---|---|---|
| Độ phủ (Recall) lượt 1 | **90,9%** (20/22) | 72,7% (16/22) | **90,9%** (20/22) | 81,8% (18/22) | ≥ 80% |
| Độ phủ (Recall) lượt 2 | **90,0%** (18/20) | 75,0% (15/20) | **90,0%** (18/20) | 80,0% (16/20) | ≥ 80% |
| Độ chuẩn xác (Precision) | **95,2%** | 80,0% | 90,9% | 81,8% | — |
| Số ngày/giờ bịa đặt | **0** | **0** | **0** | **0** | = 0 |
| Tỉ lệ JSON hợp lệ | **100%** | **100%** | **100%** | **100%** | ≥ 95% |
| Độ trễ phân vị 95 (p95) | 34,0 giây | 10,1 giây | 127,3 giây | **6,7 giây** | ≤ 90 giây |
| Độ trễ trung vị (Median) | 19,6 giây | 5,0 giây | 52,4 giây | **3,9 giây** | — |
| Bản ghi trùng khi quét lại | **0** | **0** | **0** | **0** | = 0 |

Số liệu ở Bảng 1 cho thấy sự đánh đổi rõ rệt giữa kích thước mô hình, mức độ lượng tử hoá và chất lượng trích xuất tiếng Việt:
- **Mô hình 4B (Q5_K_S)** có tốc độ nhanh (trung vị 5,0 giây) nhưng bị loại do độ phủ chỉ đạt `72,7%–75,0%` (dưới ngưỡng `80%`), thường xuyên gộp nhầm nhiều phiên hội thảo cùng ngày thành một sự kiện duy nhất và làm rơi mốc thời gian ở các sự kiện dạng hạn chót.
- **Mô hình 27B tam phân (PTQ1_0)** đạt độ phủ cao `90,9%` nhưng dung lượng vượt VRAM 4 GB khiến độ trễ p95 lên tới `127,3 giây` (vượt ngưỡng `90 giây`), chậm hơn mô hình 9B khoảng 2,7 lần mà không cải thiện thêm độ phủ nên cũng bị loại.
- **Hai mô hình 9B (Qwen3.5-9B IQ4_XS và Bonsai-2-9B PQ2_0)** đều vượt qua toàn bộ tiêu chí nghiệm thu cứng. Khi nâng cấp lên bộ lời nhắc phiên bản `v5` (bổ sung cơ chế suy đoán năm khuyết và ánh xạ từ chỉ buổi mơ hồ có gắn cờ cảnh báo trên toàn bộ 17 mẫu E01–E17 với 25 sự kiện kỳ vọng), kết quả đo thực tế ghi nhận: **Qwen3.5-9B IQ4_XS** đạt độ phủ ổn định **88,0%** ở lượt 1 (22/25 sự kiện) và **87,0%** ở lượt 2 (20/23 sự kiện), độ chuẩn xác **91,7%**, độ trễ p95 là **35,2 giây** (trung vị 21,0 giây); trong khi **Bonsai-2-9B PQ2_0** đạt độ phủ **88,0%** ở lượt 1 và **82,6%** ở lượt 2 với độ trễ p95 chỉ **6,6 giây** (trung vị 4,0 giây — nhanh hơn khoảng 5 lần nhờ lượng tử hoá 2,13 bpw nằm gọn trong VRAM). Từ kết quả này, **Qwen3.5-9B IQ4_XS** được chọn làm mô hình chuẩn khi ưu tiên độ ổn định và độ chuẩn xác cao nhất, còn **Bonsai-2-9B PQ2_0** là phương án tối ưu tốc độ trên phần cứng VRAM 4 GB.

Trên tất cả các lượt chạy của cả bốn mô hình ở cả hai phiên bản lời nhắc, **số lượng ngày giờ bịa đặt luôn bằng 0** và **tỉ lệ JSON hợp lệ đạt 100% ngay từ lần gọi đầu tiên**. Các mẫu chỉ có ngày đều được giữ đúng ở trường ngày mà không tự gán giờ; các mẫu khuyết năm hoặc có cụm từ *"buổi tối"* đều được điền đúng năm ngữ cảnh và giờ quy ước `19:00` kèm theo đầy đủ cờ cảnh báo suy đoán; mẫu tấn công chèn chỉ dẫn giả hoàn toàn không tạo ra sự kiện bịa năm 2030. Điều này chứng minh sự kết hợp giữa giải mã ràng buộc JSON Schema và tầng kiểm định ngày giờ hậu kiểm đã kiểm soát triệt để hiện tượng ảo giác thời gian.

## 5.4. Thực nghiệm so sánh có và không sử dụng bước sàng lọc PhoBERT

`[CẦN-BỔ-SUNG: Kịch bản thử nghiệm và bảng kết quả so sánh định lượng giữa ba điều kiện Tắt sàng lọc (off), Chỉ báo cáo (report) và Sàng lọc trước trích xuất (screen) bằng mô hình PhoBERT sẽ được bổ sung sau khi hoàn tất đo lường.]`

## 5.5. Kết luận về vai trò của mô hình PhoBERT và tổng kết thực nghiệm

`[CẦN-BỔ-SUNG: Kết luận định lượng về vai trò, mức độ tiết kiệm thời gian, ảnh hưởng tới độ phủ của mô hình PhoBERT và tổng kết chung toàn bộ phần thực nghiệm sẽ được bổ sung sau.]`
