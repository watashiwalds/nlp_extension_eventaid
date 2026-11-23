import type { HeldoutCase } from './case-types';
import { HELDOUT_NOW } from './case-types';
import { expected } from '../eval/case-types';

/**
 * Held-out H16–H30: H16–H18 thiếu năm, H19–H22 chỉ có ngày, H23–H26 biểu thức
 * thời gian tương đối (mốc "hôm nay" cố định 22/10/2026 — thứ Năm),
 * H27–H30 lịch dạng trần thuật (không phải câu mệnh lệnh/giao việc).
 */
export const H16: HeldoutCase = {
  id: 'H16',
  category: 'seminar',
  title: 'Sinh hoạt chuyên đề thiếu năm',
  source: 'web_page',
  sourceUrl: 'https://example.com/heldout/h16',
  text:
    'Sinh hoạt chuyên đề nghiên cứu sinh diễn ra lúc 14:00 ngày 05/11 tại phòng hội thảo tầng 3. ' +
    'Chủ đề tháng này là đạo đức nghiên cứu. Thành viên chuẩn bị một câu hỏi thảo luận cho phiên kết.',
  now: HELDOUT_NOW,
  expected: [expected('Sinh hoạt chuyên đề', '2026-11-05T14:00', null)],
  allowedDates: ['2026-11-05'],
  requiredUncertain: [{ title: 'Sinh hoạt chuyên đề', keys: ['nam_suy_doan'] }],
};

export const H17: HeldoutCase = {
  id: 'H17',
  category: 'event',
  title: 'Cuộc thi ảnh thiếu năm',
  source: 'web_page',
  sourceUrl: 'https://example.com/heldout/h17',
  text:
    'Cuộc thi ảnh "Góc trường xanh" của Đoàn trường có hạn nhận bài lúc 20:00 ngày 08/11. ' +
    'Mỗi tác giả gửi tối đa ba bức ảnh. Kết quả công bố trên trang của Đoàn trường.',
  now: HELDOUT_NOW,
  expected: [expected('Cuộc thi ảnh Góc trường xanh', '2026-11-08T20:00', null, { label: 'giải_trí' })],
  allowedDates: ['2026-11-08'],
  requiredUncertain: [{ title: 'Cuộc thi ảnh Góc trường xanh', keys: ['nam_suy_doan'] }],
};

export const H18: HeldoutCase = {
  id: 'H18',
  category: 'recruitment',
  title: 'Tư vấn hồ sơ thực tập thiếu năm',
  source: 'web_page',
  sourceUrl: 'https://example.com/heldout/h18',
  text:
    'Phòng công tác sinh viên mở đợt tư vấn hồ sơ thực tập lúc 16:00 ngày 06/11 tại phòng 105 nhà A1. ' +
    'Sinh viên mang bản photo thẻ và bảng điểm hiện tại. Đợt tư vấn nhận trực tiếp không cần đăng ký trước.',
  now: HELDOUT_NOW,
  expected: [expected('Tư vấn hồ sơ thực tập', '2026-11-06T16:00', null)],
  allowedDates: ['2026-11-06'],
  requiredUncertain: [{ title: 'Tư vấn hồ sơ thực tập', keys: ['nam_suy_doan'] }],
};

export const H19: HeldoutCase = {
  id: 'H19',
  category: 'class',
  title: 'Hạn đăng ký học bổng chỉ có ngày',
  source: 'paste',
  text:
    'Hạn đăng ký xét học bổng khuyến khích học tập đợt này là ngày 30/10/2026. ' +
    'Sinh viên nộp đơn qua biểu mẫu trực tuyến của phòng Đào tạo. ' +
    'Hồ sơ gồm bảng điểm và xác nhận hoạt động ngoại khoá.',
  now: HELDOUT_NOW,
  expected: [expected('Hạn đăng ký xét học bổng', null, '2026-10-30')],
  allowedDates: ['2026-10-30'],
  requiredUncertain: [{ title: 'Hạn đăng ký xét học bổng', keys: ['gio_chua_ro'] }],
};

export const H20: HeldoutCase = {
  id: 'H20',
  category: 'recruitment',
  title: 'Ngày hội việc làm chỉ có ngày',
  source: 'web_page',
  sourceUrl: 'https://example.com/heldout/h20',
  text:
    'Ngày hội việc làm chuyên ngành dữ liệu diễn ra vào ngày 15/12/2026 tại nhà văn hoá sinh viên. ' +
    'Sân chơi có hơn 20 doanh nghiệp tham gia. Chi tiết danh sách doanh nghiệp cập nhật trên trang sự kiện.',
  now: HELDOUT_NOW,
  expected: [expected('Ngày hội việc làm dữ liệu', null, '2026-12-15')],
  allowedDates: ['2026-12-15'],
  requiredUncertain: [{ title: 'Ngày hội việc làm dữ liệu', keys: ['gio_chua_ro'] }],
};

export const H21: HeldoutCase = {
  id: 'H21',
  category: 'class',
  title: 'Kết thúc đợt đăng ký học phần',
  source: 'paste',
  text:
    'Đợt đăng ký học phần đợt 2 của học kỳ này kết thúc vào ngày 06/11/2026. ' +
    'Sinh viên kiểm tra kế hoạch học tập trước khi chốt đăng ký. ' +
    'Sau thời điểm kết thúc, mọi thay đổi phải xin phép riêng.',
  now: HELDOUT_NOW,
  expected: [expected('Kết thúc đăng ký học phần đợt 2', null, '2026-11-06')],
  allowedDates: ['2026-11-06'],
  requiredUncertain: [{ title: 'Kết thúc đăng ký học phần đợt 2', keys: ['gio_chua_ro'] }],
};

export const H22: HeldoutCase = {
  id: 'H22',
  category: 'event',
  title: 'Đêm ra mắt sân khấu chỉ có ngày',
  source: 'web_page',
  sourceUrl: 'https://example.com/heldout/h22',
  text:
    'Đêm ra mắt sân khấu sinh viên tổ chức vào ngày 21/11/2026 tại phòng đa năng. ' +
    'Chương trình giới thiệu các tiết mục dự thi hội diễn cuối năm. ' +
    'Vào cửa tự do cho toàn thể sinh viên.',
  now: HELDOUT_NOW,
  expected: [expected('Đêm ra mắt sân khấu sinh viên', null, '2026-11-21', { label: 'giải_trí' })],
  allowedDates: ['2026-11-21'],
  requiredUncertain: [{ title: 'Đêm ra mắt sân khấu sinh viên', keys: ['gio_chua_ro'] }],
};

export const H23: HeldoutCase = {
  id: 'H23',
  category: 'event',
  title: 'Tổng kết với "thứ Hai tuần sau"',
  source: 'paste',
  text:
    'Buổi tổng kết hoạt động phong trào của Đoàn trường sẽ diễn ra vào thứ Hai tuần sau ' +
    'lúc 16:00 tại hội trường B. Các đơn vị chuẩn bị báo cáo ngắn 10 phút. ' +
    'Danh sách đại biểu gửi về văn phòng Đoàn trước buổi tổng kết.',
  now: HELDOUT_NOW,
  // 22/10/2026 là thứ Năm → "thứ Hai tuần sau" = 26/10/2026.
  expected: [expected('Tổng kết hoạt động phong trào', '2026-10-26T16:00', null)],
  allowedDates: ['2026-10-26'],
  requiredUncertain: [{ title: 'Tổng kết hoạt động phong trào', keys: ['ngay_tuong_doi'] }],
};

export const H24: HeldoutCase = {
  id: 'H24',
  category: 'meeting',
  title: 'Gặp mentor "ngày mai"',
  source: 'paste',
  text:
    'Mentor nhắc nhóm: buổi gặp định kỳ dời thành ngày mai lúc 9:00 tại văn phòng dự án. ' +
    'Nhóm mang theo bản demo mới nhất. Nếu bận, báo lại trước một ngày.',
  now: HELDOUT_NOW,
  // "ngày mai" từ mốc 22/10/2026 = 23/10/2026.
  expected: [expected('Gặp mentor định kỳ', '2026-10-23T09:00', null)],
  allowedDates: ['2026-10-23'],
  requiredUncertain: [{ title: 'Gặp mentor định kỳ', keys: ['ngay_tuong_doi'] }],
};

export const H25: HeldoutCase = {
  id: 'H25',
  category: 'class',
  title: 'Hạn chốt bài "thứ Sáu tuần sau"',
  source: 'paste',
  text:
    'Ban biên tập kỷ yếu nhắc: hạn chốt bài viết là thứ Sáu tuần sau. ' +
    'Bài gửi qua biểu mẫu kèm ảnh minh hoạ. Bản quá hạn không được xét vào kỷ yếu.',
  now: HELDOUT_NOW,
  // 22/10/2026 là thứ Năm → "thứ Sáu tuần sau" = 30/10/2026; không có giờ.
  expected: [expected('Chốt bài kỷ yếu', null, '2026-10-30')],
  allowedDates: ['2026-10-30'],
  requiredUncertain: [{ title: 'Chốt bài kỷ yếu', keys: ['ngay_tuong_doi', 'gio_chua_ro'] }],
};

export const H26: HeldoutCase = {
  id: 'H26',
  category: 'meeting',
  title: 'Họp chi đoàn "Chủ nhật này"',
  source: 'paste',
  text:
    'Chi đoàn 2 thông báo: cuộc họp chi đoàn diễn ra vào Chủ nhật này lúc 19:00 tại phòng truyền thống. ' +
    'Nội dung họp là chốt danh sách tham gia hội trại. Mọi thành viên sắp xếp tham dự đủ.',
  now: HELDOUT_NOW,
  // 22/10/2026 là thứ Năm → "Chủ nhật này" = 25/10/2026.
  expected: [expected('Họp chi đoàn', '2026-10-25T19:00', null)],
  allowedDates: ['2026-10-25'],
  requiredUncertain: [{ title: 'Họp chi đoàn', keys: ['ngay_tuong_doi'] }],
};

export const H27: HeldoutCase = {
  id: 'H27',
  category: 'event',
  title: 'Lễ trao giải dạng trần thuật',
  source: 'web_page',
  sourceUrl: 'https://example.com/heldout/h27',
  text:
    'Theo lịch của khoa, lễ trao giải nghiên cứu khoa học sinh viên được tổ chức vào lúc 8:00 ' +
    'ngày 12/11/2026 tại hội trường A. Ban tổ chức mời các nhóm tác giả có đề tài đạt giải đến nhận thưởng. ' +
    'Chương trình dự kiến kéo dài đến trưa.',
  now: HELDOUT_NOW,
  expected: [expected('Lễ trao giải nghiên cứu khoa học', '2026-11-12T08:00', null)],
  allowedDates: ['2026-11-12'],
};

export const H28: HeldoutCase = {
  id: 'H28',
  category: 'class',
  title: 'Kỳ thi cuối kỳ dạng trần thuật',
  source: 'web_page',
  sourceUrl: 'https://example.com/heldout/h28',
  text:
    'Lịch thi của phòng Đào tạo ghi rõ kỳ thi cuối kỳ môn Hệ phân tán được bố trí vào lúc 13:00 ' +
    'ngày 24/11/2026 tại phòng thi B2. Danh sách phòng thi chi tiết đăng trước một tuần. ' +
    'Sinh viên xem số báo danh trên trang đăng ký thi.',
  now: HELDOUT_NOW,
  expected: [expected('Thi cuối kỳ Hệ phân tán', '2026-11-24T13:00', null)],
  allowedDates: ['2026-11-24'],
};

export const H29: HeldoutCase = {
  id: 'H29',
  category: 'event',
  title: 'Hiến máu dạng trần thuật',
  source: 'web_page',
  sourceUrl: 'https://example.com/heldout/h29',
  text:
    'Chương trình hiến máu tình nguyện do Hội sinh viên phối hợp với Viết Máu tổ chức vào ' +
    'thứ Năm ngày 19/11/2026, bắt đầu từ 7:30 tại sảnh nhà A1. Người tham gia ăn sáng nhẹ ' +
    'và mang giấy tờ tuỳ thân. Đăng ký trước qua biểu mẫu của Hội.',
  now: HELDOUT_NOW,
  expected: [expected('Hiến máu tình nguyện', '2026-11-19T07:30', null)],
  allowedDates: ['2026-11-19'],
};

export const H30: HeldoutCase = {
  id: 'H30',
  category: 'event',
  title: 'Chung kết bóng chuyền dạng trần thuật',
  source: 'web_page',
  sourceUrl: 'https://example.com/heldout/h30',
  text:
    'Theo kết quả bốc thăm, trận chung kết bóng chuyền giữa hai đội khoa CNTT và khoa Điện ' +
    'được bố trí lúc 15:30 ngày 22/11/2026 tại nhà thi đấu. Khán giả vào cổng phía nam. ' +
    'Trận đấu có bình luận trực tiếp của đài truyền hình trường.',
  now: HELDOUT_NOW,
  expected: [expected('Chung kết bóng chuyền', '2026-11-22T15:30', null, { label: 'giải_trí' })],
  allowedDates: ['2026-11-22'],
};
