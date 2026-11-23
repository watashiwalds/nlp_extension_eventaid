import { E06 } from '../eval/cases-b';
import type { FilterEvalCase } from './case-types';
import { negativeCase, negativeFromEval } from './case-types';

/**
 * 13 mẫu âm của bộ F3: E06 (tái dùng) + 12 mẫu nhiễu web/email tự soạn.
 * Mỗi mẫu ≥ 5 câu, không tên/email/số điện thoại thật, không mốc lịch trình
 * (N10 giữ một ngày đăng bài như E06 để thử khả năng phân biệt "có ngày nhưng
 * không phải sự kiện").
 */
export const FILTER_NEGATIVE_CASES: FilterEvalCase[] = [
  negativeFromEval(E06),
  negativeCase({
    id: 'N01',
    title: 'Trang giới thiệu khoa — lời mở đầu',
    text:
      'Chào mừng bạn đến với cổng thông tin của khoa. ' +
      'Trang này giới thiệu tổng quan về các ngành đào tạo và hoạt động nghiên cứu. ' +
      'Mọi nội dung trên trang được cập nhật bởi ban biên tập của đơn vị. ' +
      'Để đóng góp ý kiến, bạn có thể gửi thư về hòm thư trực tuyến của trang. ' +
      'Thông tin liên hệ và bản quyền được liệt kê ở cuối trang. ' +
      'Cảm ơn bạn đã ghé thăm.',
  }),
  negativeCase({
    id: 'N02',
    title: 'Banner quảng cáo nhà sách',
    text:
      'Bộ sưu tập giáo trình học kỳ mới đã có mặt tại nhà sách của trường. ' +
      'Đây là đợt triển lãm sách thường niên dành cho sinh viên toàn trường. ' +
      'Bạn đọc có thể tham quan và mua trực tiếp tại quầy. ' +
      'Nhà sách phục vụ trong giờ làm việc các ngày trong tuần. ' +
      'Vui lòng liên hệ quầy thu ngân để biết thêm chi tiết. ' +
      'Rất mong nhận được sự ủng hộ của bạn đọc.',
  }),
  negativeCase({
    id: 'N03',
    title: 'Bình luận của bạn đọc',
    text:
      'Tài liệu ở trang này rất hữu ích cho mình trong quá trình làm đồ án. ' +
      'Mình đã đọc qua hai lần và thấy phần ví dụ viết khá dễ hiểu. ' +
      'Tuy nhiên một số đường dẫn trong trang con hiện chưa hoạt động. ' +
      'Mong ban biên tập xem xét cập nhật lại các liên kết đó. ' +
      'Ngoài ra mình góp ý phần tìm kiếm nên hỗ trợ tốt hơn với tiếng Việt có dấu. ' +
      'Cảm ơn nhóm xây dựng trang web bổ ích như vậy.',
  }),
  negativeCase({
    id: 'N04',
    title: 'Trang đăng nhập hệ thống',
    text:
      'Vui lòng đăng nhập để tiếp tục sử dụng hệ thống. ' +
      'Tài khoản của bạn là mã số do nhà trường cấp kèm mật khẩu đã đăng ký. ' +
      'Nếu quên mật khẩu, hãy chọn liên kết khôi phục mật khẩu bên dưới. ' +
      'Hệ thống sẽ gửi hướng dẫn đặt lại mật khẩu qua email đăng ký của bạn. ' +
      'Sau nhiều lần nhập sai, tài khoản sẽ bị khoá tạm thời vì lý do bảo mật. ' +
      'Khi gặp lỗi kỹ thuật, hãy liên hệ bộ phận hỗ trợ của trung tâm.',
  }),
  negativeCase({
    id: 'N05',
    title: 'Email xã giao — cảm ơn',
    text:
      'Em chào thầy, em đã nhận được thư của thầy. ' +
      'Cảm ơn thầy đã dành thời gian xem xét bản nháp của em. ' +
      'Những góp ý của thầy rất chi tiết và giúp em thấy rõ hướng sửa. ' +
      'Em sẽ dành thời gian đọc kỹ từng góp ý. ' +
      'Nếu có điểm nào chưa rõ, em mong được thầy giải thích thêm. ' +
      'Một lần nữa cảm ơn thầy rất nhiều.',
  }),
  negativeCase({
    id: 'N06',
    title: 'Thông báo bảo trì hệ thống',
    text:
      'Trung tâm dữ liệu thông báo về việc bảo trì định kỳ hệ thống. ' +
      'Việc bảo trì nhằm nâng cấp hạ tầng và vá các lỗi bảo mật. ' +
      'Trong quá trình bảo trì, một số dịch vụ có thể truy cập chậm hoặc gián đoạn. ' +
      'Thời điểm cụ thể sẽ được thông báo sau khi chốt kế hoạch chi tiết. ' +
      'Người dùng không cần thực hiện thao tác nào từ phía mình. ' +
      'Xin lỗi vì sự bất tiện và cảm ơn bạn đã thông cảm.',
  }),
  negativeCase({
    id: 'N07',
    title: 'Footer bản quyền và điều khoản sử dụng nội dung',
    text:
      'Nội dung trên trang thuộc sở hữu của đơn vị quản trị website. ' +
      'Việc trích dẫn lại thông tin cần ghi rõ nguồn và đường dẫn tới bài gốc. ' +
      'Mọi yêu cầu sử dụng nội dung vui lòng gửi qua mẫu liên hệ của trang. ' +
      'Các biểu tượng và logo trên trang là thương hiệu tương ứng của chủ sở hữu. ' +
      'Website hiển thị tốt trên cả máy tính và điện thoại. ' +
      'Phiên bản giao diện hiện tại là bản ổn định mới nhất.',
  }),
  negativeCase({
    id: 'N08',
    title: 'Giới thiệu ngành học',
    text:
      'Ngành khoa học máy tính đào tạo kỹ sư có nền tảng vững về lý thuyết và thực hành. ' +
      'Sinh viên được học các môn cơ sở như cấu trúc dữ liệu, hệ điều hành và mạng máy tính. ' +
      'Bên cạnh đó, chương trình có nhiều học phần lựa chọn theo hướng chuyên sâu. ' +
      'Các nhóm nghiên cứu của ngành thường xuyên nhận sinh viên tham gia đề tài. ' +
      'Chất lượng đầu ra được đánh giá qua khảo sát doanh nghiệp sử dụng lao động. ' +
      'Đây là một trong những ngành có chỉ tiêu tuyển sinh lớn của trường.',
  }),
  negativeCase({
    id: 'N09',
    title: 'Câu hỏi thường gặp',
    text:
      'Làm thế nào để đặt lại mật khẩu tài khoản trang sinh viên? ' +
      'Bạn chọn mục khôi phục mật khẩu ở trang đăng nhập và làm theo hướng dẫn. ' +
      'Tại sao tôi không xem được điểm trong một số khung giờ? ' +
      'Hệ thống đồng bộ dữ liệu vào ban đêm nên đôi khi tạm khoá truy cập. ' +
      'Tôi có thể in bản xác nhận sinh viên ở đâu? ' +
      'Chức năng in xác nhận nằm trong mục dịch vụ hành chính. ' +
      'Nếu cần hỗ trợ thêm, hãy gửi yêu cầu qua biểu mẫu trực tuyến.',
  }),
  negativeCase({
    id: 'N10',
    title: 'Tin tức công bố kết quả học bổng',
    text:
      'Trung tâm hỗ trợ sinh viên vừa công bố danh sách sinh viên nhận học bổng đợt này. ' +
      'Kết quả được xây dựng trên cơ sở hồ sơ do các khoa chuyển về trung tâm. ' +
      'Toàn bộ danh sách đã được đăng tải trên bảng tin của trang. ' +
      'Sinh viên có tên trong danh sách nhận thông báo qua biểu mẫu đăng ký của đơn vị. ' +
      'Mọi thắc mắc về kết quả phản hồi qua hộp thư của trung tâm. ' +
      'Tin bài được đăng tải ngày 18/10/2026 trên cổng thông tin trường.',
  }),
  negativeCase({
    id: 'N11',
    title: 'Điều khoản sử dụng website',
    text:
      'Khi sử dụng website, bạn đồng ý với các điều khoản được nêu tại trang này. ' +
      'Nội dung dịch vụ chỉ phục vụ mục đích thông tin trong phạm vi nhà trường. ' +
      'Chúng tôi có quyền cập nhật điều khoản mà không cần báo trước. ' +
      'Việc tiếp tục truy cập sau khi cập nhật được coi là chấp nhận bản mới. ' +
      'Tài khoản vi phạm quy định có thể bị hạn chế một số tính năng. ' +
      'Các điều khoản này được điều chỉnh theo quy định hiện hành.',
  }),
  negativeCase({
    id: 'N12',
    title: 'Email trao đổi công việc — đã nhận tài liệu',
    text:
      'Chào bạn, mình đã nhận được tài liệu bạn gửi hôm nay. ' +
      'Nội dung file ổn và mở được bình thường. ' +
      'Mình sẽ xem và phản hồi ý kiến khi đọc xong. ' +
      'Bạn không cần gửi lại bản khác như nội dung thư trước. ' +
      'Nếu thiếu trang nào, mình sẽ báo bạn bổ sung sau. ' +
      'Cảm ơn bạn đã chuẩn bị tài liệu sớm.',
  }),
];
