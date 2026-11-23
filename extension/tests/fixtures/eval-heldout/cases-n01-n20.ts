import type { HeldoutCase } from './case-types';
import { HELDOUT_NOW } from './case-types';

/**
 * Held-out âm N01–N20 theo phân bố §3.14: N01–N08 không có lịch trình,
 * N09–N12 có nhiệm vụ nhưng không lịch, N13–N16 có ngày/số liệu nhưng không
 * phải sự kiện lịch, N17–N20 tin tức/mô tả. Mọi mẫu `expected: []` và
 * `allowedDates: []` (quy ước mẫu âm như E06: mọi ngày trong output là bịa).
 */
function negative(input: { id: string; title: string; text: string; source?: 'web_page' | 'paste' }): HeldoutCase {
  return {
    id: input.id,
    category: 'negative',
    title: input.title,
    source: input.source ?? 'paste',
    ...(input.source === 'web_page' ? { sourceUrl: `https://example.com/heldout/${input.id.toLowerCase()}` } : {}),
    text: input.text,
    now: HELDOUT_NOW,
    expected: [],
    allowedDates: [],
  };
}

export const N01: HeldoutCase = negative({
  id: 'N01',
  title: 'Hỏi đáp về thẻ thư viện',
  source: 'web_page',
  text:
    'Làm thế nào để làm thẻ thư viện lần đầu? Bạn mang thẻ sinh viên đến quầy phục vụ tầng 1 ' +
    'và điền mẫu đăng ký. Thẻ mất bao lâu để kích hoạt? Thẻ được kích hoạt ngay sau khi hoàn tất thủ tục. ' +
    'Tôi bị mất thẻ thì làm sao? Bạn báo mất tại quầy và xin cấp lại theo lệ phí quy định.',
});

export const N02: HeldoutCase = negative({
  id: 'N02',
  title: 'Quy định sử dụng tài nguyên số',
  source: 'web_page',
  text:
    'Người dùng chỉ sử dụng tài nguyên số cho mục đích học tập và nghiên cứu. ' +
    'Việc tải hàng loạt bằng công cụ tự động bị xem là vi phạm quy định. ' +
    'Tài khoản vi phạm có thể bị dừng quyền truy cập tạm thời. ' +
    'Mọi trích dẫn từ tài nguyên phải ghi rõ nguồn theo chuẩn học thuật. ' +
    'Câu hỏi về bản quyền gửi về bộ phận quản trị nội dung.',
});

export const N03: HeldoutCase = negative({
  id: 'N03',
  title: 'Trang liên hệ hỗ trợ kỹ thuật',
  source: 'web_page',
  text:
    'Bộ phận hỗ trợ kỹ thuật tiếp nhận yêu cầu qua biểu mẫu trực tuyến trên trang. ' +
    'Khi gửi yêu cầu, bạn mô tả rõ lỗi gặp phải và kèm ảnh chụp màn hình. ' +
    'Mỗi yêu cầu nhận một mã theo dõi để bạn kiểm tra tiến độ xử lý. ' +
    'Các câu hỏi thường gặp được tổng hợp ở mục trợ giúp của trang. ' +
    'Trường hợp khẩn, liên hệ quầy hỗ trợ tại tầng trệt.',
});

export const N04: HeldoutCase = negative({
  id: 'N04',
  title: 'Quy trình xin xác nhận sinh viên',
  text:
    'Quy trình xin xác nhận sinh viên gồm bốn bước. Một là chuẩn bị đơn theo mẫu của phòng Đào tạo. ' +
    'Hai là nộp đơn tại bộ phận một cửa kèm thẻ sinh viên. Ba là chờ bộ phận soạn và trình ký. ' +
    'Bốn là nhận xác nhận tại bộ phận một cửa. Thời gian xử lý phụ thuộc số lượng đơn đang tồn.',
});

export const N05: HeldoutCase = negative({
  id: 'N05',
  title: 'Email cảm ơn sau phỏng vấn',
  text:
    'Em chào anh, em cảm ơn anh đã dành thời gian phỏng vấn em hôm qua. ' +
    'Cuộc trao đổi giúp em hiểu rõ hơn về công việc và định hướng của phòng. ' +
    'Em rất mong có cơ hội được cộng tác cùng nhóm của anh. ' +
    'Nếu cần bổ sung thông tin gì, anh cứ nhắn em. Em chúc anh một tuần làm việc hiệu quả.',
});

export const N06: HeldoutCase = negative({
  id: 'N06',
  title: 'Khuyến nghị bảo mật tài khoản',
  source: 'web_page',
  text:
    'Trung tâm dữ liệu khuyến nghị người dùng đổi mật khẩu định kỳ để bảo vệ tài khoản. ' +
    'Mật khẩu mạnh gồm chữ hoa, chữ thường, số và ký tự đặc biệt. ' +
    'Không dùng lại mật khẩu đã dùng cho dịch vụ khác. ' +
    'Không chia sẻ mật khẩu cho người khác kể cả cán bộ hỗ trợ. ' +
    'Khi nghi ngờ tài khoản bị truy cập trái phép, đổi mật khẩu ngay và báo trung tâm.',
});

export const N07: HeldoutCase = negative({
  id: 'N07',
  title: 'Hướng dẫn cài mạng riêng ảo',
  source: 'web_page',
  text:
    'Để cài đặt mạng riêng ảo, bạn tải phần mềm từ trang trung tâm dữ liệu. ' +
    'Chạy bộ cài và nhập địa chỉ máy chủ được cung cấp trong tài liệu hướng dẫn. ' +
    'Đăng nhập bằng tài khoản mạng của trường. ' +
    'Kết nối thành công khi biểu tượng trạng thái chuyển màu xanh. ' +
    'Nếu lỗi xác thực, kiểm tra lại mật khẩu mạng và thử lại.',
});

export const N08: HeldoutCase = negative({
  id: 'N08',
  title: 'Giới thiệu câu lạc bộ Nhiếp ảnh',
  source: 'web_page',
  text:
    'Câu lạc bộ Nhiếp ảnh tập hợp những bạn yêu thích chụp ảnh trong trường. ' +
    'Hoạt động chính là chia sẻ kỹ thuật chụp, hậu kỳ và tổ chức các buổi đi thực tế. ' +
    'Thành viên lâu năm hướng dẫn bạn mới từ những kiến thức cơ bản nhất. ' +
    'CLB chào đón mọi trình độ, không yêu cầu có máy ảnh chuyên dụng. ' +
    'Thông tin trao đổi được đăng trên nhóm của câu lạc bộ.',
});

export const N09: HeldoutCase = negative({
  id: 'N09',
  title: 'Danh sách việc nhóm cần làm',
  text:
    'Công việc nhóm cần làm: hoàn thiện phần giao diện trang quản trị. ' +
    'Viết lại phần mô tả dữ liệu cho báo cáo. Chuẩn bị slide giới thiệu sản phẩm. ' +
    'Gửi lại bản đã góp ý cho phần kiểm thử. Kiểm tra toàn bộ đường dẫn ảnh trước khi đóng gói bản dùng thử.',
});

export const N10: HeldoutCase = negative({
  id: 'N10',
  title: 'Thành phần hồ sơ thực tập',
  text:
    'Hồ sơ thực tập gồm các thành phần sau: đơn đăng ký thực tập có xác nhận của khoa. ' +
    'Bản sao thẻ sinh viên. Sơ yếu lý lịch viết tay hoặc in kèm chữ ký. ' +
    'Bản sao bảng điểm hiện tại. Hai tấm ảnh cỡ 3x4. ' +
    'Hồ sơ nộp tại bộ phận quan hệ doanh nghiệp của khoa.',
});

export const N11: HeldoutCase = negative({
  id: 'N11',
  title: 'Email nhờ góp ý bản nháp',
  text:
    'Chào bạn, mình gửi bạn bản nháp phần phân tích yêu cầu. ' +
    'Bạn rà giúp mình phần luồng dữ liệu có mâu thuẫn chỗ nào không. ' +
    'Góp ý ghi thẳng vào file cũng được, không cần soạn văn bản riêng. ' +
    'Mình sẽ tổng hợp ý kiến của cả nhóm rồi cập nhật lại bản chung. Cảm ơn bạn nhiều.',
});

export const N12: HeldoutCase = negative({
  id: 'N12',
  title: 'Ghi nhớ việc cá nhân',
  text:
    'Một vài việc cá nhân cần nhớ: nạp mực máy in ở nhà. Mua thêm giấy in khổ A4. ' +
    'Đổi bình nước sang loại nhỏ gọn hơn. Kiểm tra vỏ xe trước chuyến đi xa. ' +
    'Gọi đặt lịch bảo dưỡng máy lạnh.',
});

export const N13: HeldoutCase = negative({
  id: 'N13',
  title: 'Báo cáo thống kê tháng',
  source: 'web_page',
  text:
    'Báo cáo tổng hợp tháng 9/2026: khoa nhận 120 hồ sơ đăng ký đề tài nghiên cứu, ' +
    'tăng 15% so với cùng kỳ năm trước. Trong đó có 78 đề tài thuộc hướng xử lý ngôn ngữ và thị giác. ' +
    'Số đề tài do nhóm sinh viên năm ba đề xuất chiếm gần một nửa. ' +
    'Tỉ lệ hồ sơ đủ điều kiện duyệt đạt mức cao nhất trong ba năm.',
});

export const N14: HeldoutCase = negative({
  id: 'N14',
  title: 'Quy định phí có hiệu lực',
  source: 'web_page',
  text:
    'Quy định mới về phí in tài liệu có hiệu lực từ 01/10/2026. ' +
    'Mức phí áp dụng cho trang khổ A4 in một mặt. ' +
    'Nội dung phục vụ học tập vẫn được hỗ trợ theo hạn mức của sinh viên. ' +
    'Phí in màu tính riêng theo trang. Chi tiết hạn mức tra cứu trên mục dịch vụ của trang.',
});

export const N15: HeldoutCase = negative({
  id: 'N15',
  title: 'Kết quả xét tuyển bổ sung',
  source: 'web_page',
  text:
    'Kết quả xét tuyển bổ sung đợt 1 (chốt danh sách ngày 10/10/2026): ngành Khoa học máy tính nhận 45 thí sinh. ' +
    'Ngành Hệ thống thông tin nhận 30 thí sinh. Danh sách chi tiết đã đăng trên bảng tin tuyển sinh. ' +
    'Hồ sơ không trúng tuyển được bảo lưu theo quy chế hiện hành.',
});

export const N16: HeldoutCase = negative({
  id: 'N16',
  title: 'Mô tả bộ dữ liệu',
  text:
    'Bộ dữ liệu phản hồi sinh viên được thu thập từ 01/06/2026 đến 31/08/2026 qua biểu mẫu trực tuyến. ' +
    'Tổng cộng nhận được 5.000 bản ghi hợp lệ sau khi loại bỏ mẫu trùng lặp. ' +
    'Mỗi bản ghi gồm 12 trường thông tin về trải nghiệm học tập. ' +
    'Dữ liệu đã được ẩn danh hoá trước khi phân tích.',
});

export const N17: HeldoutCase = negative({
  id: 'N17',
  title: 'Tin tức hội thảo đã diễn ra',
  source: 'web_page',
  text:
    'Hội thảo "Trí tuệ nhân tạo trong giáo dục" đã diễn ra thành công với hơn 200 người tham dự. ' +
    'Các báo cáo viên giới thiệu nhiều ứng dụng thực tiễn trong giảng dạy. ' +
    'Phần thảo luận nhận nhiều câu hỏi quanh vấn đề dữ liệu học tập. ' +
    'Tài liệu hội thảo đã được đăng tải trên trang của khoa. Ban tổ chức cảm ơn các đơn vị đồng hành.',
});

export const N18: HeldoutCase = negative({
  id: 'N18',
  title: 'Mô tả chương trình đào tạo',
  source: 'web_page',
  text:
    'Chương trình đào tạo ngành Khoa học máy tính gồm ba khối kiến thức. ' +
    'Khối giáo dục đại cương cung cấp nền tảng toán và khoa học tự nhiên. ' +
    'Khối giáo dục chuyên nghiệp tập trung vào cấu trúc dữ liệu, thuật toán và hệ thống phần mềm. ' +
    'Khối bổ trợ phát triển kỹ năng mềm và ngoại ngữ. ' +
    'Sinh viên chọn đồ án tốt nghiệp theo hướng chuyên sâu phù hợp.',
});

export const N19: HeldoutCase = negative({
  id: 'N19',
  title: 'Thông tin chung về tuyển sinh',
  source: 'web_page',
  text:
    'Thông tin tuyển sinh đại học hệ chính quy: chỉ tiêu và mã ngành cập nhật theo công bố của Bộ. ' +
    'Thí sinh xét tuyển bằng điểm thi tốt nghiệp hoặc kết quả học tập. ' +
    'Phương thức và tổ hợp môn xem chi tiết trên trang tuyển sinh. ' +
    'Mỗi năm nhà trường công bố đề án tuyển sinh trước kỳ xét tuyển. ' +
    'Câu hỏi gửi về hòm thư tuyển sinh của trường.',
});

export const N20: HeldoutCase = negative({
  id: 'N20',
  title: 'Giới thiệu phòng nghiên cứu',
  source: 'web_page',
  text:
    'Phòng nghiên cứu Hệ thống thông tin thông minh tập trung vào bài toán hiểu dữ liệu lớn. ' +
    'Phòng phối hợp với doanh nghiệp trong nhiều đề tài ứng dụng. ' +
    'Sinh viên tham gia phòng được hướng dẫn từ nền tảng đến nghiên cứu chuyên sâu. ' +
    'Sản phẩm của phòng gồm bài báo, công cụ nền và hệ thống thử nghiệm. ' +
    'Bạn quan tâm liên hệ trợ giảng của phòng qua trang thông tin.',
});
