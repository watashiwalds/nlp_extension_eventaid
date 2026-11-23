import type { HeldoutCase } from './case-types';
import { HELDOUT_NOW, } from './case-types';
import { expected } from '../eval/case-types';

/**
 * Held-out H01–H15: H01–H08 ngày giờ rõ ràng, H09–H14 đa sự kiện, H15–H18
 * (H15 ở file này) thiếu năm. Toàn bộ tự soạn, tên cơ quan/đơn vị chung chung.
 */
export const H01: HeldoutCase = {
  id: 'H01',
  category: 'event',
  title: 'Sinh hoạt câu lạc bộ Kỹ thuật số',
  source: 'web_page',
  sourceUrl: 'https://example.com/heldout/h01',
  text:
    'Câu lạc bộ Kỹ thuật số thông báo: buổi sinh hoạt tháng 10 diễn ra lúc 18:00 ngày 28/10/2026 ' +
    'tại phòng 401 nhà B4. Chủ đề buổi sinh hoạt là giới thiệu công nghệ web thời gian thực. ' +
    'Thành viên mang theo máy tính cá nhân để thực hành theo nhóm.',
  now: HELDOUT_NOW,
  expected: [expected('Sinh hoạt CLB Kỹ thuật số', '2026-10-28T18:00', null)],
  allowedDates: ['2026-10-28'],
};

export const H02: HeldoutCase = {
  id: 'H02',
  category: 'recruitment',
  title: 'Giao lưu tuyển dụng thực tập',
  source: 'web_page',
  sourceUrl: 'https://example.com/heldout/h02',
  text:
    'Công ty Phần mềm Sông Hồng phối hợp với khoa tổ chức buổi giao lưu tuyển dụng thực tập sinh ' +
    'lúc 14:30 ngày 04/11/2026 tại giảng đường A2. Đại diện công ty giới thiệu chương trình thực tập ' +
    'và tiêu chí ứng tuyển. Sinh viên quan tâm chuẩn bị sơ yếu lý lịch in sẵn.',
  now: HELDOUT_NOW,
  expected: [expected('Giao lưu tuyển dụng thực tập', '2026-11-04T14:30', null)],
  allowedDates: ['2026-11-04'],
};

export const H03: HeldoutCase = {
  id: 'H03',
  category: 'event',
  title: 'Phiên hướng dẫn tài liệu số của thư viện',
  source: 'web_page',
  sourceUrl: 'https://example.com/heldout/h03',
  text:
    'Thư viện trường mở phiên hướng dẫn sử dụng kho tài liệu số lúc 9:30 ngày 27/10/2026 ' +
    'tại phòng 202 tòa thư viện. Phiên hướng dẫn giới thiệu cách tra cứu và tải tài nguyên học thuật. ' +
    'Bạn đọc đăng ký tham dự tại quầy phục vụ.',
  now: HELDOUT_NOW,
  expected: [expected('Hướng dẫn sử dụng tài liệu số', '2026-10-27T09:30', null)],
  allowedDates: ['2026-10-27'],
};

export const H04: HeldoutCase = {
  id: 'H04',
  category: 'class',
  title: 'Bảo vệ đồ án cơ sở nhóm 12',
  source: 'web_page',
  sourceUrl: 'https://example.com/heldout/h04',
  text:
    'Nhóm 12 bảo vệ đồ án cơ sở môn Hệ nhúng lúc 13:00 ngày 06/11/2026 tại phòng làm việc của khoa. ' +
    'Nhóm chuẩn bị bản cài đặt và bộ slide trình bày. Giảng viên hướng dẫn phản hồi trực tiếp tại buổi bảo vệ.',
  now: HELDOUT_NOW,
  expected: [expected('Bảo vệ đồ án cơ sở', '2026-11-06T13:00', null)],
  allowedDates: ['2026-11-06'],
};

export const H05: HeldoutCase = {
  id: 'H05',
  category: 'seminar',
  title: 'Xưởng viết học thuật',
  source: 'web_page',
  sourceUrl: 'https://example.com/heldout/h05',
  text:
    'Xưởng viết học thuật dành cho sinh viên năm ba diễn ra lúc 15:00 ngày 12/11/2026 ' +
    'tại phòng tự học số 3. Nội dung tập trung vào cách trích dẫn tài liệu và tránh đạo văn. ' +
    'Xưởng có giảng viên chuyên trách văn bản khoa học hướng dẫn.',
  now: HELDOUT_NOW,
  expected: [expected('Xưởng viết học thuật', '2026-11-12T15:00', null)],
  allowedDates: ['2026-11-12'],
};

export const H06: HeldoutCase = {
  id: 'H06',
  category: 'event',
  title: 'Khai mạc giải bóng đá sinh viên',
  source: 'web_page',
  sourceUrl: 'https://example.com/heldout/h06',
  text:
    'Giải bóng đá sinh viên khai mạc với trận đấu giữa hai đội Khoa CNTT và Khoa Cơ khí ' +
    'lúc 16:00 ngày 08/11/2026 tại sân tập trung. Cổng vào mở sớm nửa giờ cho khán giả. ' +
    'Lịch các lượt tiếp theo được đăng sau mỗi vòng đấu.',
  now: HELDOUT_NOW,
  expected: [expected('Khai mạc giải bóng đá sinh viên', '2026-11-08T16:00', null, { label: 'giải_trí' })],
  allowedDates: ['2026-11-08'],
};

export const H07: HeldoutCase = {
  id: 'H07',
  category: 'meeting',
  title: 'Hẹn gặp giảng viên hướng dẫn',
  source: 'paste',
  text:
    'Nhóm 5 hẹn gặp giảng viên hướng dẫn đồ án lúc 10:00 ngày 30/10/2026 tại văn phòng giảng viên. ' +
    'Nhóm trình bày tiến độ hiện tại và xin ý kiến cho phần kế tiếp. Cuộc hẹn kéo dài khoảng một giờ.',
  now: HELDOUT_NOW,
  expected: [expected('Gặp giảng viên hướng dẫn', '2026-10-30T10:00', null)],
  allowedDates: ['2026-10-30'],
};

export const H08: HeldoutCase = {
  id: 'H08',
  category: 'event',
  title: 'Đêm thơ nhạc Hà Nội mùa thu',
  source: 'web_page',
  sourceUrl: 'https://example.com/heldout/h08',
  text:
    'Đêm thơ nhạc với chủ đề "Hà Nội mùa thu" diễn ra lúc 19:00 ngày 14/11/2026 tại hội trường lớn. ' +
    'Chương trình có sự tham gia của nhóm văn nghệ sinh viên. ' +
    'Vé phát hành miễn phí tại văn phòng Đoàn trường.',
  now: HELDOUT_NOW,
  expected: [expected('Đêm thơ nhạc Hà Nội mùa thu', '2026-11-14T19:00', null, { label: 'giải_trí' })],
  allowedDates: ['2026-11-14'],
};

export const H09: HeldoutCase = {
  id: 'H09',
  category: 'recruitment',
  title: 'Ngày hội việc làm ba hoạt động',
  source: 'web_page',
  sourceUrl: 'https://example.com/heldout/h09',
  text:
    'Ngày hội việc làm của trường diễn ra ngày 21/11/2026 tại nhà văn hoá. ' +
    'Lễ khai mạc bắt đầu lúc 8:00 ngày 21/11/2026. ' +
    'Khu phỏng vấn nhanh hoạt động từ 10:30 ngày 21/11/2026. ' +
    'Buổi chia sẻ từ doanh nghiệp bắt đầu lúc 14:00 ngày 21/11/2026.',
  now: HELDOUT_NOW,
  expected: [
    expected('Lễ khai mạc ngày hội việc làm', '2026-11-21T08:00', null),
    expected('Phỏng vấn nhanh', '2026-11-21T10:30', null),
    expected('Chia sẻ từ doanh nghiệp', '2026-11-21T14:00', null),
  ],
  allowedDates: ['2026-11-21'],
};

export const H10: HeldoutCase = {
  id: 'H10',
  category: 'class',
  title: 'Lịch trực thư viện hai nhóm',
  source: 'paste',
  text:
    'Lớp thông báo lịch trực thư viện tuần tới. Nhóm 1 trực từ 8:00 ngày 26/10/2026. ' +
    'Nhóm 2 trực từ 8:00 ngày 28/10/2026. Bạn nào trùng lịch thì đổi ca với nhau và báo lại lớp trưởng.',
  now: HELDOUT_NOW,
  expected: [
    expected('Trực thư viện nhóm 1', '2026-10-26T08:00', null),
    expected('Trực thư viện nhóm 2', '2026-10-28T08:00', null),
  ],
  allowedDates: ['2026-10-26', '2026-10-28'],
};

export const H11: HeldoutCase = {
  id: 'H11',
  category: 'event',
  title: 'Lễ hội Khoa học hai ngày',
  source: 'web_page',
  sourceUrl: 'https://example.com/heldout/h11',
  text:
    'Lễ hội Khoa học của khoa kéo dài hai ngày. Lễ khai mạc diễn ra lúc 8:00 ngày 17/11/2026 ' +
    'tại sảnh tòa B4. Chương trình giao lưu cựu sinh viên bắt đầu lúc 15:00 ngày 18/11/2026 ' +
    'tại hội trường A. Chào cờ và tham quan gian trưng bày mở cửa suốt hai ngày.',
  now: HELDOUT_NOW,
  expected: [
    expected('Khai mạc lễ hội Khoa học', '2026-11-17T08:00', null),
    expected('Giao lưu cựu sinh viên', '2026-11-18T15:00', null),
  ],
  allowedDates: ['2026-11-17', '2026-11-18'],
};

export const H12: HeldoutCase = {
  id: 'H12',
  category: 'class',
  title: 'Hai hoạt động cuối tuần học dự án',
  source: 'paste',
  text:
    'Tuần học dự án kết thúc bằng hai hoạt động. Phần trình bày phương án diễn ra lúc 9:00 ' +
    'ngày 10/11/2026 tại phòng 305 nhà B4. Phần trưng bày sản phẩm và đánh giá chéo diễn ra ' +
    'lúc 13:30 ngày 13/11/2026 tại sảnh tầng 1.',
  now: HELDOUT_NOW,
  expected: [
    expected('Trình bày phương án', '2026-11-10T09:00', null),
    expected('Trưng bày sản phẩm', '2026-11-13T13:30', null),
  ],
  allowedDates: ['2026-11-10', '2026-11-13'],
};

export const H13: HeldoutCase = {
  id: 'H13',
  category: 'class',
  title: 'Ôn tập và kiểm tra giữa kỳ',
  source: 'paste',
  text:
    'Môn Cơ sở dữ liệu có hai mốc quan trọng trong tuần tới. Buổi ôn tập do lớp tổ chức ' +
    'lúc 18:00 ngày 27/10/2026 tại phòng 201 nhà B3. Bài kiểm tra giữa kỳ diễn ra lúc 7:30 ' +
    'ngày 29/10/2026 tại phòng thi A1. Sinh viên mang thẻ sinh viên khi vào phòng thi.',
  now: HELDOUT_NOW,
  expected: [
    expected('Ôn tập Cơ sở dữ liệu', '2026-10-27T18:00', null),
    expected('Kiểm tra giữa kỳ Cơ sở dữ liệu', '2026-10-29T07:30', null),
  ],
  allowedDates: ['2026-10-27', '2026-10-29'],
};

export const H14: HeldoutCase = {
  id: 'H14',
  category: 'event',
  title: 'Ngày hội sách bốn hoạt động',
  source: 'web_page',
  sourceUrl: 'https://example.com/heldout/h14',
  text:
    'Ngày hội sách của trường diễn ra ngày 19/11/2026 tại quảng trường trung tâm. ' +
    'Gian sách mở cửa từ 8:00 ngày 19/11/2026. Buổi giao lưu với tác giả bắt đầu lúc 10:00 ' +
    'ngày 19/11/2026. Giờ đọc sách chung diễn ra lúc 15:00 ngày 19/11/2026. ' +
    'Lễ bế mạc và trao quà diễn ra lúc 17:00 ngày 19/11/2026.',
  now: HELDOUT_NOW,
  expected: [
    expected('Mở cửa gian sách', '2026-11-19T08:00', null),
    expected('Giao lưu với tác giả', '2026-11-19T10:00', null),
    expected('Giờ đọc sách chung', '2026-11-19T15:00', null),
    expected('Bế mạc ngày hội sách', '2026-11-19T17:00', null),
  ],
  allowedDates: ['2026-11-19'],
};

export const H15: HeldoutCase = {
  id: 'H15',
  category: 'class',
  title: 'Buổi học bù thiếu năm',
  source: 'paste',
  text:
    'Thông báo học bù: buổi học bù môn Mạng máy tính diễn ra lúc 7:30 ngày 29/10 tại phòng 301 nhà B3. ' +
    'Lớp chuẩn bị bài trước khi đến. Danh sách nhóm thực hành giữ nguyên như buổi thường lệ.',
  now: HELDOUT_NOW,
  // Thiếu năm; "hôm nay" 22/10/2026 cho phép suy năm 2026 kèm cờ nam_suy_doan.
  expected: [expected('Học bù Mạng máy tính', '2026-10-29T07:30', null)],
  allowedDates: ['2026-10-29'],
  requiredUncertain: [{ title: 'Học bù Mạng máy tính', keys: ['nam_suy_doan'] }],
};
