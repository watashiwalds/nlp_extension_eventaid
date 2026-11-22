# Kế hoạch khắc phục và hoàn thiện báo cáo NLP for Schedule Arrangement

## 1. Mục tiêu

Kế hoạch này được xây dựng nhằm khắc phục các hạn chế về phương pháp thực nghiệm, độ tin cậy của kết quả đánh giá, khả năng kiểm chứng các đóng góp kỹ thuật và hình thức trình bày của báo cáo.

Mục tiêu chính:

1. Kiểm chứng hiệu quả thực sự của lớp hậu kiểm ngày giờ.
2. Tách dữ liệu phát triển và dữ liệu kiểm thử độc lập, hạn chế rò rỉ dữ liệu đánh giá.
3. Chuẩn hóa gold set và tiêu chí đối sánh sự kiện.
4. Đánh giá hiệu quả đầu-cuối của thành phần sàng lọc PhoBERT trên các chế độ Off, Report và Screen.
5. Bổ sung baseline rule-based cho bài toán nhận diện và chuẩn hóa biểu thức thời gian tiếng Việt.
6. Tăng độ tin cậy của kết quả đánh giá PhoBERT.
7. Hoàn thiện minh chứng sản phẩm, repository và hình thức báo cáo.

Nguyên tắc thực hiện: **ưu tiên bổ sung thí nghiệm và cải thiện tính minh bạch của kết quả; không thay đổi kiến trúc hệ thống nếu chưa thực sự cần thiết.**

---

## 2. Phân loại mức độ ưu tiên

| Mức | Ý nghĩa | Định hướng |
|---|---|---|
| P0 – Critical | Ảnh hưởng trực tiếp đến tính đúng đắn và độ tin cậy của kết quả | Bắt buộc ưu tiên thực hiện |
| P1 – High | Củng cố đóng góp kỹ thuật, nâng cao chất lượng thực nghiệm | Thực hiện nếu còn thời gian |
| P2 – Medium | Tăng độ tin cậy, khả năng tái lập và tính hoàn thiện | Thực hiện sau P0 |
| P3 – Low | Hoàn thiện hình thức và minh chứng sản phẩm | Hoàn thành trước khi nộp báo cáo |

---

# 3. Kế hoạch công việc chi tiết

## TASK 01 — Kiểm chứng hiệu quả lớp hậu kiểm ngày giờ (Ablation Study)

**Priority:** P0 – Critical

### 3.1. Vấn đề hiện tại

Báo cáo ghi nhận không có ngày giờ bịa đặt trong đầu ra sau hậu kiểm, nhưng chưa có thí nghiệm đối chứng với đầu ra LLM thô để xác định mức đóng góp thực tế của lớp hậu kiểm.

Chưa định lượng được:

- Số trường ngày giờ sai do LLM sinh ra trước hậu kiểm.
- Số trường sai được hậu kiểm phát hiện và loại bỏ.
- Số trường đúng bị hậu kiểm loại nhầm.
- Mức cải thiện độ chính xác của các trường thời gian sau hậu kiểm.

### 3.2. Công việc cần thực hiện

- [ ] Giữ nguyên bộ mẫu E01–E17 hiện có.
- [ ] Cố định prompt, model, cấu hình inference và gold set.
- [ ] Chạy cấu hình Raw LLM: không áp dụng lớp hậu kiểm thời gian.
- [ ] Chạy cấu hình LLM + Post-check: áp dụng lớp hậu kiểm hiện tại.
- [ ] Lưu toàn bộ output thô trước hậu kiểm.
- [ ] Lưu output sau hậu kiểm.
- [ ] Đối chiếu từng trường thời gian với gold.
- [ ] Phân loại các trường sai, trường đúng, trường bị chặn và trường bị loại nhầm.
- [ ] Tổng hợp kết quả thành bảng so sánh.

### 3.3. Các chỉ số cần báo cáo

| Metric | Raw LLM | LLM + Post-check |
|---|---:|---:|
| Số trường thời gian được sinh | | |
| Số trường thời gian đúng | | |
| Số trường thời gian sai | | |
| Số trường thời gian bịa/không có căn cứ | | |
| Date accuracy | | |
| Start-time accuracy | | |
| End-time accuracy | | |
| Số giá trị sai bị chặn | — | |
| Số giá trị đúng bị loại nhầm | — | |
| Valid-value retention rate | — | |
| Hallucination blocking rate | — | |

### 3.4. Deliverables

- [ ] Dataset kết quả Raw LLM.
- [ ] Dataset kết quả LLM + Post-check.
- [ ] Bảng đối chiếu theo từng mẫu.
- [ ] Bảng metric tổng hợp.
- [ ] Biểu đồ so sánh trước và sau hậu kiểm.
- [ ] Phần mô tả thực nghiệm bổ sung trong báo cáo.

### 3.5. Tiêu chí hoàn thành

Thí nghiệm được coi là hoàn thành khi có dữ liệu đối chứng trên cùng bộ mẫu, cùng cấu hình, có thể truy xuất từng lỗi thời gian trước và sau hậu kiểm; kết quả được báo cáo bằng các chỉ số định lượng, không chỉ dựa trên nhận xét rằng đầu ra không có lỗi.

---

## TASK 02 — Cố định gold set và xây dựng tiêu chí matching

**Priority:** P0 – Critical

### 3.6. Vấn đề hiện tại

Bộ mẫu E01–E17 đã được sử dụng trong quá trình chỉnh prompt. Số sự kiện kỳ vọng thay đổi giữa các lượt đánh giá, đồng thời báo cáo chưa định nghĩa rõ tiêu chí để xác định một sự kiện dự đoán khớp với sự kiện trong gold set.

Điều này ảnh hưởng đến khả năng so sánh Precision, Recall và F1 giữa các lần chạy.

### 3.7. Công việc cần thực hiện

- [ ] Rà soát toàn bộ gold set E01–E17.
- [ ] Kiểm tra số sự kiện kỳ vọng của từng tài liệu.
- [ ] Xác định nguyên nhân chênh lệch gold giữa các lượt chạy trước.
- [ ] Chốt gold set phiên bản cuối.
- [ ] Gán ID duy nhất cho từng sự kiện.
- [ ] Định nghĩa quy tắc matching giữa predicted events và gold events.
- [ ] Định nghĩa cách xử lý sự kiện bị gộp hoặc tách.
- [ ] Định nghĩa cách xử lý sự kiện khớp tiêu đề nhưng sai thời gian.
- [ ] Định nghĩa cách xử lý sự kiện thiếu một số trường.
- [ ] Đóng băng gold set trước khi thực hiện test cuối.

### 3.8. Đề xuất quy tắc matching

#### Event-level matching

Một predicted event được ghép với một gold event khi nội dung tiêu đề và ngữ nghĩa sự kiện tương đương, không mâu thuẫn với ngữ cảnh nguồn.

- Cho phép khác biệt về cách diễn đạt nhưng cùng ý nghĩa.
- Không coi sự kiện khác nhau về bản chất là khớp chỉ vì cùng ngày.
- Mỗi gold event chỉ được ghép với tối đa một predicted event.
- Mỗi predicted event chỉ được ghép với tối đa một gold event.
- Sự kiện bị gộp hoặc tách sai phải được ghi nhận là lỗi cấu trúc.

#### Field-level matching

| Field | Quy tắc đánh giá |
|---|---|
| Title | Nội dung/ngữ nghĩa tương đương |
| Date | Ngày chuẩn hóa chính xác với gold |
| Start time | Giờ bắt đầu chính xác với gold |
| End time | Giờ kết thúc chính xác với gold |
| Summary | Giữ đúng thông tin chính, không bổ sung chi tiết không có căn cứ |
| Uncertain fields | Phải phản ánh đúng trạng thái thiếu hoặc mơ hồ trong văn bản |

### 3.9. Metric cần báo cáo

- Event Precision.
- Event Recall.
- Event F1.
- Title accuracy.
- Date accuracy.
- Start-time accuracy.
- End-time accuracy.
- Summary accuracy (nếu có quy trình đánh giá thống nhất).
- Số sự kiện gộp/tách sai.

### 3.10. Deliverables

- [ ] Gold set E01–E17 đã chốt.
- [ ] Annotation schema.
- [ ] Matching specification.
- [ ] Metric calculation script hoặc spreadsheet.
- [ ] Bảng kết quả đánh giá được tính lại theo quy tắc thống nhất.

### 3.11. Tiêu chí hoàn thành

Gold set có phiên bản cố định, tiêu chí matching được mô tả trong báo cáo, và toàn bộ chỉ số đánh giá được tính lại dựa trên cùng một quy tắc.

---

## TASK 03 — Xây dựng held-out test set độc lập

**Priority:** P0 – Critical

### 3.12. Mục tiêu

Đánh giá cấu hình cuối cùng trên dữ liệu chưa được sử dụng trong quá trình phát triển prompt, tuning hoặc điều chỉnh các thành phần xử lý.

### 3.13. Công việc cần thực hiện

- [ ] Thu thập 40–50 tài liệu tiếng Việt mới.
- [ ] Sử dụng nguồn dữ liệu đa dạng.
- [ ] Ẩn danh thông tin nhạy cảm trong email hoặc tài liệu thực tế.
- [ ] Gán ID tài liệu T001–T050.
- [ ] Gán nhãn có lịch trình/không có lịch trình.
- [ ] Xác định danh sách sự kiện kỳ vọng.
- [ ] Gán các trường thời gian và nguồn bằng chứng.
- [ ] Rà soát gold annotations trước khi chạy hệ thống.
- [ ] Chốt prompt và cấu hình cuối.
- [ ] Chạy test một lần với cấu hình đã chốt.
- [ ] Không chỉnh prompt dựa trên kết quả test.
- [ ] Lưu raw output và log.
- [ ] Đối chiếu kết quả bằng matching specification đã thống nhất.

### 3.14. Phân bố dữ liệu đề xuất

#### Positive samples — 30 tài liệu

| Loại văn bản | Số lượng |
|---|---:|
| Ngày và giờ rõ ràng | 8 |
| Nhiều sự kiện trong cùng văn bản | 6 |
| Ngày thiếu năm | 4 |
| Ngày có nhưng thiếu giờ | 4 |
| Biểu thức thời gian tương đối | 4 |
| Thông báo lịch dạng trần thuật, không phải câu giao việc | 4 |
| **Tổng** | **30** |

#### Negative samples — 20 tài liệu

| Loại văn bản | Số lượng |
|---|---:|
| Văn bản không có lịch trình | 8 |
| Có nhiệm vụ nhưng không có lịch | 4 |
| Có ngày/số liệu nhưng không phải sự kiện lịch | 4 |
| Tin tức, mô tả hoặc thông tin chung | 4 |
| **Tổng** | **20** |

### 3.15. Deliverables

- [ ] Held-out test dataset.
- [ ] Annotation file.
- [ ] Gold event list.
- [ ] Source provenance.
- [ ] Báo cáo thống kê phân bố dữ liệu.
- [ ] Bảng kết quả chạy test.
- [ ] Error analysis.

### 3.16. Tiêu chí hoàn thành

Có một bộ test mới, độc lập, gold được chốt trước khi chạy, và kết quả được báo cáo riêng biệt với kết quả development set.

---

## TASK 04 — Đánh giá đầu-cuối các chế độ Off, Report, Screen

**Priority:** P0 – Critical

### 3.17. Vấn đề hiện tại

PhoBERT đã được đánh giá ở cấp câu, nhưng chưa có đánh giá đầu-cuối của thành phần sàng lọc tài liệu.

Chưa chứng minh được:

- Số lượt gọi LLM được tiết kiệm.
- Thời gian xử lý thực tế giảm.
- Tài liệu có lịch trình bị bỏ qua.
- Số sự kiện bị mất khi bật Screen.
- Trade-off giữa tiết kiệm inference và độ phủ sự kiện.

### 3.18. Công việc cần thực hiện

- [ ] Sử dụng cùng bộ test tài liệu cho cả ba chế độ.
- [ ] Giữ nguyên cấu hình LLM.
- [ ] Chạy Off.
- [ ] Chạy Report.
- [ ] Chạy Screen.
- [ ] Thu log số lần gọi LLM.
- [ ] Thu log thời gian PhoBERT.
- [ ] Thu log thời gian inference LLM.
- [ ] Thu thời gian tổng của pipeline.
- [ ] Đối chiếu sự kiện đầu ra với gold.
- [ ] Ghi nhận các tài liệu có lịch trình bị Screen bỏ qua.
- [ ] Phân tích các false negative của bộ sàng lọc.

### 3.19. Định nghĩa các chế độ

| Mode | PhoBERT | Hành vi |
|---|---|---|
| Off | Không chạy | Mọi tài liệu được chuyển tới LLM |
| Report | Chạy | Ghi nhận kết quả sàng lọc, không chặn LLM |
| Screen | Chạy | Có thể bỏ qua LLM nếu tài liệu không vượt điều kiện sàng lọc |

### 3.20. Metric

| Metric | Off | Report | Screen |
|---|---:|---:|---:|
| Tổng tài liệu | | | |
| Tài liệu positive | | | |
| Tài liệu negative | | | |
| Số lượt gọi LLM | | | |
| Số lượt gọi LLM tiết kiệm | | | |
| Tỷ lệ tiết kiệm LLM | | | |
| Thời gian tổng | | | |
| Thời gian trung bình/tài liệu | | | |
| Event Precision | | | |
| Event Recall | | | |
| Event F1 | | | |
| Số sự kiện bị bỏ sót | | | |
| Số tài liệu positive bị Screen loại | | | |

### 3.21. Deliverables

- [ ] Log ba chế độ.
- [ ] Bảng so sánh.
- [ ] Biểu đồ thời gian.
- [ ] Biểu đồ số lần gọi LLM.
- [ ] Bảng phân tích false negative.
- [ ] Nội dung thực nghiệm bổ sung.

### 3.22. Tiêu chí hoàn thành

Chứng minh được định lượng hiệu quả của Screen về chi phí và thời gian, đồng thời đo ảnh hưởng của nó đến độ phủ sự kiện. Không kết luận Screen hiệu quả chỉ dựa vào độ chính xác PhoBERT ở cấp câu.

---

## TASK 05 — Bổ sung baseline rule-based cho nhận diện thời gian

**Priority:** P1 – High

### 3.23. Mục tiêu

So sánh khả năng nhận diện và chuẩn hóa ngày giờ của LLM kết hợp hậu kiểm với phương pháp dựa trên luật, qua đó xác định lợi thế và giới hạn của kiến trúc hybrid.

### 3.24. Công việc cần thực hiện

- [ ] Xây dựng parser rule-based tiếng Việt tối thiểu.
- [ ] Nhận diện ngày/tháng/năm bằng regex.
- [ ] Nhận diện giờ và phút.
- [ ] Chuẩn hóa các biểu thức `9h`, `9:30`, `14 giờ`.
- [ ] Nhận diện khoảng thời gian.
- [ ] Xử lý ngày tương đối dựa trên reference date.
- [ ] Xử lý thứ/ngày trong tuần.
- [ ] Xử lý các biểu thức buổi sáng, chiều, tối.
- [ ] Gắn trạng thái chưa xác định với biểu thức không đủ thông tin.
- [ ] Chạy baseline trên cùng tập test với LLM + Post-check.
- [ ] So sánh kết quả field-level.

### 3.25. Phạm vi baseline

Không cần xây temporal parser đầy đủ. Chỉ tập trung vào các biểu thức phổ biến trong dataset.

| Nhóm biểu thức | Ví dụ |
|---|---|
| Ngày cụ thể | 25/11/2026 |
| Ngày/tháng | 25 tháng 11 |
| Giờ cụ thể | 9:30, 14h, 14 giờ |
| Khoảng thời gian | 9h–11h |
| Ngày tương đối | Ngày mai, hôm nay |
| Thứ tương đối | Thứ Hai tuần sau |
| Buổi | Sáng, chiều, tối |

### 3.26. Metric

- Temporal expression detection.
- Date accuracy.
- Start-time accuracy.
- End-time accuracy.
- Ambiguous-time handling.
- Unsupported-value rate.
- Processing time.

### 3.27. Deliverables

- [ ] Rule-based parser.
- [ ] Source code.
- [ ] Bảng so sánh Rule-based / LLM Raw / LLM + Post-check.
- [ ] Error analysis.
- [ ] Phần baseline trong báo cáo.

### 3.28. Tiêu chí hoàn thành

Có baseline hoạt động trên các biểu thức phổ biến và kết quả được so sánh với cùng gold set, cùng tiêu chí field-level.

---

## TASK 06 — Mở rộng và tăng độ tin cậy đánh giá PhoBERT

**Priority:** P1 – High

### 3.29. Vấn đề hiện tại

Dataset PhoBERT gồm 200 câu, test 42 câu. Kết quả chênh lệch so với SVM chưa đủ để khẳng định ưu thế tổng quát của PhoBERT, đặc biệt khi bài toán sàng lọc ở cấp tài liệu khác với bài toán phân loại câu TASK/NON_TASK.

### 3.30. Công việc cần thực hiện

- [ ] Thu thập thêm câu từ nhiều nguồn.
- [ ] Mở rộng dataset lên khoảng 300–500 câu nếu điều kiện cho phép.
- [ ] Bổ sung các câu thông báo lịch dạng trần thuật.
- [ ] Bổ sung các câu giao việc không chứa thời gian.
- [ ] Bổ sung các câu có sự kiện đã kết thúc.
- [ ] Bổ sung câu có ngữ cảnh mơ hồ.
- [ ] Chia train/validation/test theo doc_id.
- [ ] Tránh các câu từ cùng tài liệu xuất hiện ở nhiều tập.
- [ ] Có người thứ hai gán nhãn độc lập trên test set.
- [ ] Thống nhất nhãn bằng adjudication.
- [ ] Đánh giá PhoBERT và SVM trên cùng test set.
- [ ] Báo cáo confusion matrix.
- [ ] Báo cáo Precision, Recall, F1, Accuracy.
- [ ] Cân nhắc bootstrap confidence interval cho F1.

### 3.31. Hướng cải tiến bài toán

Nếu còn thời gian, cân nhắc xây dựng bộ phân loại cấp tài liệu:

- `HAS_SCHEDULE`: tài liệu có ít nhất một sự kiện lịch trình.
- `NO_SCHEDULE`: tài liệu không có sự kiện lịch trình phù hợp.

Việc chuyển từ TASK/NON_TASK ở cấp câu sang HAS_SCHEDULE/NO_SCHEDULE ở cấp tài liệu phù hợp trực tiếp hơn với mục tiêu sàng lọc.

Tuy nhiên, không bắt buộc phải thay mô hình ngay. Nếu thời gian hạn chế, giữ PhoBERT hiện tại, mô tả rõ giới hạn và tập trung vào đánh giá đầu-cuối.

### 3.32. Deliverables

- [ ] Dataset mở rộng.
- [ ] Annotation guideline.
- [ ] Báo cáo thống nhất nhãn.
- [ ] Test set độc lập.
- [ ] Confusion matrix.
- [ ] Bảng so sánh PhoBERT và SVM.
- [ ] Confidence interval nếu triển khai được.
- [ ] Error analysis.

### 3.33. Tiêu chí hoàn thành

Có đánh giá đáng tin cậy hơn trên test độc lập, quy trình gán nhãn rõ ràng và kết luận không vượt quá phạm vi dữ liệu thực nghiệm.

---

## TASK 07 — Hoàn thiện minh chứng giao diện sản phẩm

**Priority:** P2 – Medium

### 3.34. Mục tiêu

Bổ sung hình ảnh thực tế chứng minh hệ thống đã được hiện thực hóa, giúp báo cáo cân đối hơn giữa mô tả kiến trúc, thực nghiệm và sản phẩm.

### 3.35. Công việc cần thực hiện

- [ ] Chụp giao diện Side Panel.
- [ ] Chụp thao tác chọn văn bản hoặc thu thập văn bản từ trang.
- [ ] Chụp danh sách Draft Events.
- [ ] Chụp trạng thái chỉnh sửa/duyệt sự kiện.
- [ ] Chụp cảnh báo thời gian chưa xác định hoặc thiếu thông tin.
- [ ] Chụp thao tác approve hoặc quản lý bản nháp nếu có.
- [ ] Chú thích mỗi hình.
- [ ] Bổ sung danh mục hình nếu cần.

### 3.36. Deliverables

- [ ] 3–5 ảnh chụp màn hình thực tế.
- [ ] Caption cho từng ảnh.
- [ ] Hình minh họa bổ sung trong Chương 4.

### 3.37. Tiêu chí hoàn thành

Hình ảnh rõ ràng, thể hiện tính năng thực tế, không chỉ là mockup, và được dẫn chiếu trong phần mô tả chức năng.

---

## TASK 08 — Repository, README và khả năng tái lập

**Priority:** P2 – Medium

### 3.38. Công việc cần thực hiện

- [ ] Tạo hoặc hoàn thiện repository.
- [ ] Kiểm tra cấu trúc mã nguồn.
- [ ] Loại bỏ secrets, API keys và thông tin nhạy cảm.
- [ ] Bổ sung README.
- [ ] Hướng dẫn cài đặt extension.
- [ ] Hướng dẫn khởi chạy inference server.
- [ ] Ghi rõ cấu hình phần cứng khuyến nghị.
- [ ] Ghi rõ model sử dụng và cách tải.
- [ ] Ghi các cấu hình inference quan trọng.
- [ ] Ghi các bước chạy demo.
- [ ] Ghi các hạn chế đã biết.
- [ ] Thêm link repository vào báo cáo.

### 3.39. Deliverables

- [ ] Git repository.
- [ ] README.
- [ ] Installation instructions.
- [ ] Demo instructions.
- [ ] Link repository trong báo cáo.

### 3.40. Tiêu chí hoàn thành

Một người khác có thể làm theo README để cài đặt và chạy demo cơ bản mà không cần hướng dẫn trực tiếp từ nhóm.

---

## TASK 09 — Bổ sung bảng phân công công việc

**Priority:** P2 – Medium

### 3.41. Công việc cần thực hiện

- [ ] Tổng hợp công việc thực tế của hai thành viên.
- [ ] Chia nhóm công việc theo phát triển, NLP, backend/inference, UI, thực nghiệm, báo cáo.
- [ ] Ghi rõ trách nhiệm chính và phần phối hợp.
- [ ] Đảm bảo nội dung phân công phản ánh công việc thực tế.
- [ ] Bổ sung bảng vào báo cáo.

### 3.42. Mẫu bảng

| Thành viên | Công việc phụ trách | Công việc phối hợp |
|---|---|---|
| Thành viên 1 | Dataset, gold annotation, NLP, đánh giá và phân tích metric | Kiểm thử hệ thống, hoàn thiện báo cáo |
| Thành viên 2 | Extension, tích hợp inference, hậu kiểm, logging, UI | Thu thập test, kiểm thử, hoàn thiện báo cáo |

*Bảng trên là mẫu đề xuất, cần thay bằng phân công thực tế của nhóm.*

### 3.43. Deliverables

- [ ] Bảng phân công.
- [ ] Đối chiếu với công việc đã thực hiện.
- [ ] Chèn vào báo cáo.

---

## TASK 10 — Kiểm tra và hoàn thiện hình thức báo cáo

**Priority:** P3 – Low

### 3.44. Công việc cần thực hiện

- [ ] Kiểm tra trang bìa.
- [ ] Xác minh học vị và cách ghi tên giảng viên.
- [ ] Bổ sung tiền tố học vị theo quy định nếu chính xác.
- [ ] Kiểm tra caption hình.
- [ ] Kiểm tra caption bảng.
- [ ] Kiểm tra danh mục hình và bảng.
- [ ] Kiểm tra mục lục.
- [ ] Kiểm tra đánh số chương/mục.
- [ ] Kiểm tra link tài liệu tham khảo.
- [ ] Kiểm tra format trích dẫn.
- [ ] Kiểm tra thuật ngữ tiếng Anh/tiếng Việt.
- [ ] Kiểm tra lỗi chính tả.
- [ ] Kiểm tra tính nhất quán của số liệu giữa các chương.
- [ ] Kiểm tra tính nhất quán giữa mục tiêu, đóng góp, thực nghiệm và kết luận.

### 3.45. Deliverables

- [ ] Báo cáo Word hoàn chỉnh.
- [ ] PDF cuối.
- [ ] Danh sách kiểm tra hình thức đã hoàn thành.

---

# 4. Kế hoạch thực hiện theo giai đoạn

## Giai đoạn 1 — Chốt phương pháp đánh giá

**Mục tiêu:** Không để dữ liệu hoặc tiêu chí thay đổi giữa các lượt chạy.

- [ ] Khóa gold E01–E17.
- [ ] Định nghĩa matching.
- [ ] Chuẩn hóa metric.
- [ ] Chốt prompt và cấu hình.
- [ ] Tạo held-out test set.
- [ ] Gán nhãn test.

**Đầu ra:** Gold set cố định, test set độc lập và cấu hình đánh giá đã chốt.

---

## Giai đoạn 2 — Thực nghiệm cốt lõi

**Mục tiêu:** Củng cố các đóng góp kỹ thuật quan trọng nhất.

- [ ] Raw LLM vs LLM + Post-check.
- [ ] Off vs Report vs Screen.
- [ ] Thu log thời gian và số lượt gọi LLM.
- [ ] Đối sánh với gold.
- [ ] Phân tích lỗi.

**Đầu ra:** Các bảng thực nghiệm cốt lõi và kết quả định lượng.

---

## Giai đoạn 3 — Baseline và nâng độ tin cậy

**Mục tiêu:** Mở rộng khả năng so sánh và độ tin cậy khoa học.

- [ ] Rule-based temporal baseline.
- [ ] Mở rộng dataset PhoBERT.
- [ ] Gán nhãn độc lập.
- [ ] Đánh giá PhoBERT/SVM.
- [ ] Confusion matrix.
- [ ] Confidence interval nếu có.

**Đầu ra:** Baseline, kết quả NLP bổ sung và error analysis.

---

## Giai đoạn 4 — Hoàn thiện báo cáo và sản phẩm

**Mục tiêu:** Đảm bảo báo cáo thể hiện đúng những gì hệ thống thực sự làm và đã được kiểm chứng.

- [ ] Bổ sung hình ảnh UI.
- [ ] Bổ sung repository.
- [ ] Bổ sung README.
- [ ] Bổ sung bảng phân công.
- [ ] Sửa Chương 1 theo đóng góp thực tế.
- [ ] Bổ sung Chương 5.
- [ ] Cập nhật Chương 6.
- [ ] Kiểm tra hình thức.

**Đầu ra:** Báo cáo cuối cùng và bộ minh chứng sản phẩm.

---

# 5. Timeline đề xuất

Timeline dưới đây là kế hoạch dự kiến, có thể điều chỉnh theo thời gian còn lại.

| Ngày | Công việc chính | Đầu ra |
|---|---|---|
| Ngày 1 | Khóa gold, matching, prompt, tạo test set | Dataset và protocol cố định |
| Ngày 2 | Raw vs Post-check, bắt đầu chạy test độc lập | Log và kết quả ablation |
| Ngày 3 | Off/Report/Screen | Bảng số liệu đầu-cuối |
| Ngày 4 | Temporal baseline, tổng hợp metric, error analysis | Baseline và phân tích lỗi |
| Ngày 5 | Screenshot, repo, README, sửa báo cáo | Báo cáo hoàn thiện |

Nếu chỉ còn 1–2 ngày, ưu tiên TASK 01, 02, 03 và sửa các kết luận cho đúng phạm vi bằng chứng. Các TASK 05 và 06 có thể thu hẹp hoặc chuyển thành hạn chế/định hướng nếu chưa thể thực hiện nghiêm túc.

---

# 6. Phân công công việc đề xuất cho hai thành viên

## Thành viên 1 — Dataset, Annotation và Evaluation

- [ ] Thu thập tài liệu.
- [ ] Xây dựng held-out test set.
- [ ] Gán gold annotation.
- [ ] Chuẩn hóa matching.
- [ ] Tính Precision, Recall, F1.
- [ ] Tính field-level accuracy.
- [ ] Đánh giá PhoBERT và SVM.
- [ ] Phân tích lỗi.
- [ ] Tổng hợp bảng số liệu.
- [ ] Bổ sung nội dung Chương 5.

## Thành viên 2 — System, Inference và Baseline

- [ ] Chạy Raw LLM.
- [ ] Chạy LLM + Post-check.
- [ ] Chạy Off, Report, Screen.
- [ ] Thu log inference.
- [ ] Đo thời gian và số lượt gọi LLM.
- [ ] Xây dựng temporal baseline.
- [ ] Chụp screenshot UI.
- [ ] Hoàn thiện repository và README.
- [ ] Hỗ trợ chỉnh sửa Chương 4 và Chương 5.

## Công việc phối hợp

- [ ] Cùng chốt gold set.
- [ ] Review các trường hợp matching khó.
- [ ] Xác nhận số liệu.
- [ ] Chốt kết luận.
- [ ] Chỉnh Chương 1 và Chương 6.
- [ ] Kiểm tra báo cáo trước khi nộp.

---

# 7. Definition of Done — Điều kiện hoàn thành toàn bộ kế hoạch

Kế hoạch khắc phục được coi là hoàn thành khi đáp ứng các tiêu chí sau:

### Thực nghiệm

- [ ] Có đối chứng Raw LLM vs LLM + Post-check.
- [ ] Có gold set cố định.
- [ ] Có tiêu chí matching được định nghĩa.
- [ ] Có held-out test set độc lập.
- [ ] Có đánh giá Off/Report/Screen đầu-cuối hoặc nêu rõ lý do chưa thực hiện và giới hạn.
- [ ] Có số liệu tiết kiệm LLM và thời gian xử lý.
- [ ] Có phân tích false negative của Screen.
- [ ] Có baseline thời gian nếu đủ điều kiện thực hiện.

### PhoBERT

- [ ] Có phân tích giới hạn TASK/NON_TASK so với HAS_SCHEDULE/NO_SCHEDULE.
- [ ] Có test set độc lập.
- [ ] Có kiểm soát leakage theo doc_id.
- [ ] Có quy trình gán nhãn rõ ràng.
- [ ] Kết luận không vượt quá quy mô dữ liệu.

### Báo cáo

- [ ] Chương 1 phản ánh đúng đóng góp đã kiểm chứng.
- [ ] Chương 5 có protocol, matching, metric, bảng kết quả và error analysis.
- [ ] Chương 6 có hạn chế và định hướng nhất quán với thực nghiệm.
- [ ] Không còn số liệu gold thay đổi không giải thích.
- [ ] Không khẳng định quá mức các kết quả chưa có đối chứng.

### Sản phẩm và hình thức

- [ ] Có screenshot UI.
- [ ] Có repository.
- [ ] Có README cài đặt/chạy.
- [ ] Có bảng phân công.
- [ ] Đã kiểm tra hình thức và tài liệu tham khảo.

---

# 8. Bảng theo dõi tiến độ tổng hợp

| ID | Công việc | Priority | Phụ trách | Trạng thái |
|---|---|---|---|---|
| TASK-01 | Ablation Raw vs Post-check | P0 | Member 2 | ⬜ Chưa làm |
| TASK-02 | Gold set và matching specification | P0 | Member 1 + 2 | ⬜ Chưa làm |
| TASK-03 | Held-out test set 40–50 văn bản | P0 | Member 1 | ⬜ Chưa làm |
| TASK-04 | Off/Report/Screen evaluation | P0 | Member 2 + 1 | ⬜ Chưa làm |
| TASK-05 | Temporal rule-based baseline | P1 | Member 2 | ⬜ Chưa làm |
| TASK-06 | PhoBERT dataset/test mở rộng | P1 | Member 1 | ⬜ Chưa làm |
| TASK-07 | Screenshot UI | P2 | Member 2 | ⬜ Chưa làm |
| TASK-08 | Repository + README | P2 | Member 2 | ⬜ Chưa làm |
| TASK-09 | Bảng phân công | P2 | Member 1 + 2 | ⬜ Chưa làm |
| TASK-10 | Hoàn thiện hình thức báo cáo | P3 | Member 1 + 2 | ⬜ Chưa làm |

---

# 9. Chiến lược tối ưu khi thiếu thời gian

Nếu không đủ nguồn lực để thực hiện toàn bộ, áp dụng thứ tự ưu tiên sau:

### Nhóm A — Không nên bỏ

1. Chốt gold set.
2. Định nghĩa matching.
3. Raw vs Post-check.
4. Held-out test set.
5. Sửa các tuyên bố trong báo cáo theo đúng bằng chứng.

### Nhóm B — Cố gắng hoàn thành

6. Off/Report/Screen đầu-cuối.
7. Bổ sung screenshot UI.
8. Repository và README.

### Nhóm C — Có thể thu hẹp

9. Temporal baseline.
10. Mở rộng PhoBERT quy mô lớn và bootstrap confidence interval.

Nếu không hoàn thành Nhóm C, cần nêu rõ là hạn chế hoặc hướng phát triển tiếp theo, không trình bày như kết quả đã thực hiện.

---

# 10. Kết luận

Hướng khắc phục tập trung vào việc củng cố tính khoa học và khả năng kiểm chứng của báo cáo, thay vì mở rộng quá nhiều chức năng của sản phẩm.

Các ưu tiên quan trọng nhất là:

1. **Chứng minh tác dụng của lớp hậu kiểm ngày giờ bằng ablation.**
2. **Khóa gold set và định nghĩa tiêu chí matching.**
3. **Tạo test set độc lập để đánh giá cấu hình cuối.**
4. **Đánh giá sàng lọc PhoBERT ở cấp hệ thống, đo cả lợi ích và rủi ro bỏ sót.**
5. **Bổ sung baseline temporal parser nếu còn thời gian.**
6. **Hoàn thiện hình ảnh, repository, README và hình thức báo cáo.**

Việc hoàn thành các công việc ưu tiên P0 sẽ tạo nền tảng vững chắc hơn cho các kết quả thực nghiệm và các đóng góp được nêu trong báo cáo. Các công việc P1–P3 sẽ tiếp tục tăng tính thuyết phục, khả năng tái lập và độ hoàn thiện của bài tập lớn.

Nguyên tắc cuối cùng khi sửa báo cáo: **chỉ khẳng định điều mà dữ liệu thực nghiệm thực sự chứng minh; những kết quả chưa đo được phải được trình bày là hạn chế hoặc định hướng phát triển.**
