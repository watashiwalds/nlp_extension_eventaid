import type { EvalCase } from './case-types';
import { EVAL_NOW, expected, metrics, rawEvent } from './case-types';

export const E01: EvalCase = {
  id: 'E01',
  category: 'class',
  title: 'Thông báo lớp XLNNTN',
  source: 'paste',
  text:
    'Thông báo lớp XLNNTN. Lớp họp nhóm đồ án lúc 9:00 ngày 2/11/2026 tại phòng B203. ' +
    'Hạn nộp báo cáo giữa kỳ là 20/11/2026. Báo cáo dài tối đa 15 trang.',
  now: EVAL_NOW,
  expected: [
    expected('Họp nhóm đồ án', '2026-11-02T09:00', null),
    expected('Nộp báo cáo giữa kỳ', null, '2026-11-20'),
  ],
  allowedDates: ['2026-11-02', '2026-11-20'],
  mockOutput: {
    events: [
      rawEvent({
        title: 'Họp nhóm đồ án',
        start: '2026-11-02T09:00',
        startRaw: '9:00 ngày 2/11/2026',
        summary: ['Họp tại phòng B203', 'Chuẩn bị đề cương'],
        confidence: 0.9,
        quote: 'Lớp họp nhóm đồ án lúc 9:00 ngày 2/11/2026 tại phòng B203.',
      }),
      rawEvent({
        title: 'Nộp báo cáo giữa kỳ',
        start: null,
        startRaw: '20/11/2026',
        summary: ['Hạn nộp báo cáo giữa kỳ'],
        confidence: 0.7,
        uncertain: ['gio_chua_ro'],
        quote: 'Hạn nộp báo cáo giữa kỳ là 20/11/2026.',
      }),
    ],
  },
  metrics: metrics({ matched: 2, missed: 0, extra: 0, inventedDates: 0, totalActual: 2 }),
  requiredUncertain: [{ title: 'Nộp báo cáo giữa kỳ', keys: ['gio_chua_ro'] }],
};

export const E02: EvalCase = {
  id: 'E02',
  category: 'meeting',
  title: 'Email mời họp kế hoạch học kỳ',
  source: 'selection',
  text:
    'Kính mời anh/chị tham dự cuộc họp kế hoạch học kỳ bắt đầu lúc 14:00 ngày 5/11/2026 ' +
    'và kết thúc lúc 15:30 ngày 5/11/2026 tại phòng họp A. ' +
    'Tham dự: Nguyễn Văn An, Trần Thị Bình.',
  now: EVAL_NOW,
  expected: [
    expected('Họp kế hoạch học kỳ', '2026-11-05T14:00', null, {
      endValue: '2026-11-05T15:30',
      endDate: null,
    }),
  ],
  allowedDates: ['2026-11-05'],
  mockOutput: {
    events: [
      rawEvent({
        title: 'Họp kế hoạch học kỳ',
        start: '2026-11-05T14:00',
        end: '2026-11-05T15:30',
        startRaw: '14:00 ngày 5/11/2026',
        endRaw: '15:30 ngày 5/11/2026',
        summary: ['Họp tại phòng họp A', 'Tham dự: Nguyễn Văn An, Trần Thị Bình'],
        confidence: 0.92,
        quote: 'Cuộc họp kế hoạch học kỳ bắt đầu lúc 14:00 ngày 5/11/2026 và kết thúc lúc 15:30 ngày 5/11/2026.',
      }),
    ],
  },
  metrics: metrics({ matched: 1, missed: 0, extra: 0, inventedDates: 0, totalActual: 1 }),
};

export const E03: EvalCase = {
  id: 'E03',
  category: 'seminar',
  title: 'Lịch seminar khoa CNTT',
  source: 'paste',
  text:
    'Lịch seminar ngày 6/11/2026 tại hội trường B. ' +
    'Phiên khai mạc lúc 8:30 ngày 6/11/2026. ' +
    'Phiên xử lý ngôn ngữ tự nhiên lúc 10:00 ngày 6/11/2026. ' +
    'Phiên thị giác máy tính lúc 14:00 ngày 6/11/2026.',
  now: EVAL_NOW,
  expected: [
    expected('Phiên khai mạc', '2026-11-06T08:30', null),
    expected('Phiên xử lý ngôn ngữ tự nhiên', '2026-11-06T10:00', null),
    expected('Phiên thị giác máy tính', '2026-11-06T14:00', null),
  ],
  allowedDates: ['2026-11-06'],
  mockOutput: {
    events: [
      rawEvent({
        title: 'Phiên khai mạc',
        start: '2026-11-06T08:30',
        startRaw: '8:30 ngày 6/11/2026',
        summary: ['Seminar tại hội trường B'],
        confidence: 0.9,
        quote: 'Phiên khai mạc lúc 8:30 ngày 6/11/2026.',
      }),
      rawEvent({
        title: 'Phiên xử lý ngôn ngữ tự nhiên',
        start: '2026-11-06T10:00',
        startRaw: '10:00 ngày 6/11/2026',
        summary: ['Seminar tại hội trường B'],
        confidence: 0.88,
        quote: 'Phiên xử lý ngôn ngữ tự nhiên lúc 10:00 ngày 6/11/2026.',
      }),
      rawEvent({
        title: 'Phiên thị giác máy tính',
        start: '2026-11-06T14:00',
        startRaw: '14:00 ngày 6/11/2026',
        summary: ['Seminar tại hội trường B'],
        confidence: 0.88,
        quote: 'Phiên thị giác máy tính lúc 14:00 ngày 6/11/2026.',
      }),
    ],
  },
  metrics: metrics({ matched: 3, missed: 0, extra: 0, inventedDates: 0, totalActual: 3 }),
};

export const E04: EvalCase = {
  id: 'E04',
  category: 'recruitment',
  title: 'Thông báo tuyển dụng thực tập',
  source: 'paste',
  text:
    'Chương trình thực tập của công ty ABC mở đơn đăng ký tại buổi giới thiệu lúc 9:00 ngày 3/11/2026 ' +
    'tại hội trường A. Hạn nộp hồ sơ là 17:00 ngày 10/11/2026.',
  now: EVAL_NOW,
  expected: [
    expected('Buổi giới thiệu chương trình thực tập', '2026-11-03T09:00', null),
    expected('Hạn nộp hồ sơ thực tập', '2026-11-10T17:00', null),
  ],
  allowedDates: ['2026-11-03', '2026-11-10'],
  mockOutput: {
    events: [
      rawEvent({
        title: 'Buổi giới thiệu chương trình thực tập',
        start: '2026-11-03T09:00',
        startRaw: '9:00 ngày 3/11/2026',
        summary: ['Mở đơn đăng ký tại hội trường A'],
        confidence: 0.88,
        quote: 'Buổi giới thiệu lúc 9:00 ngày 3/11/2026 tại hội trường A.',
      }),
      rawEvent({
        title: 'Hạn nộp hồ sơ thực tập',
        start: '2026-11-10T17:00',
        startRaw: '17:00 ngày 10/11/2026',
        summary: ['Hạn nộp hồ sơ'],
        confidence: 0.9,
        quote: 'Hạn nộp hồ sơ là 17:00 ngày 10/11/2026.',
      }),
    ],
  },
  metrics: metrics({ matched: 2, missed: 0, extra: 0, inventedDates: 0, totalActual: 2 }),
};

export const E05: EvalCase = {
  id: 'E05',
  category: 'event',
  title: 'Đêm nhạc Mùa thu Hà Nội',
  source: 'web_page',
  sourceUrl: 'https://example.com/su-kien/mua-thu-ha-noi',
  text:
    'Đêm nhạc acoustic “Mùa thu Hà Nội” sẽ diễn ra lúc 19:30 ngày 7/11/2026 tại Nhà hát Lớn, Hà Nội. ' +
    'Thông tin vé liên hệ ban tổ chức.',
  now: EVAL_NOW,
  expected: [expected('Đêm nhạc acoustic Mùa thu Hà Nội', '2026-11-07T19:30', null)],
  allowedDates: ['2026-11-07'],
  mockOutput: {
    events: [
      rawEvent({
        title: 'Đêm nhạc acoustic Mùa thu Hà Nội',
        label: 'giải_trí',
        start: '2026-11-07T19:30',
        startRaw: '19:30 ngày 7/11/2026',
        summary: ['Địa điểm: Nhà hát Lớn, Hà Nội'],
        confidence: 0.9,
        quote: 'Đêm nhạc acoustic “Mùa thu Hà Nội” sẽ diễn ra lúc 19:30 ngày 7/11/2026 tại Nhà hát Lớn, Hà Nội.',
      }),
    ],
  },
  metrics: metrics({ matched: 1, missed: 0, extra: 0, inventedDates: 0, totalActual: 1 }),
};

