import type { EvalCase } from './case-types';
import { EVAL_NOW, expected, metrics, rawEvent } from './case-types';

export const E06: EvalCase = {
  id: 'E06',
  category: 'negative',
  title: 'Bản tin không có sự kiện',
  source: 'paste',
  text:
    'Bản tin tuần này: Khoa CNTT công bố danh sách sinh viên đạt học bổng. ' +
    'Bài viết được đăng ngày 20/10/2026. Cảm ơn bạn đã đọc.',
  now: EVAL_NOW,
  expected: [],
  // Mẫu âm: mọi ngày trong output đều bị coi là bịa, kể cả ngày đăng bài.
  allowedDates: [],
  mockOutput: { events: [] },
  metrics: metrics({ matched: 0, missed: 0, extra: 0, inventedDates: 0, totalActual: 0 }),
};

export const E07: EvalCase = {
  id: 'E07',
  category: 'edge',
  title: 'Hạn nhận vé chỉ có ngày',
  source: 'paste',
  text: 'Thông báo nhận vé: Hạn nhận vé là 29/10/2026 tại quầy lễ tân. Vé không nhận thay.',
  now: EVAL_NOW,
  expected: [expected('Hạn nhận vé', null, '2026-10-29')],
  allowedDates: ['2026-10-29'],
  mockOutput: {
    events: [
      rawEvent({
        title: 'Hạn nhận vé',
        label: 'giải_trí',
        start: null,
        startRaw: '29/10/2026',
        summary: ['Nhận vé tại quầy lễ tân'],
        confidence: 0.8,
        uncertain: ['gio_chua_ro'],
        quote: 'Hạn nhận vé là 29/10/2026 tại quầy lễ tân.',
      }),
    ],
  },
  metrics: metrics({ matched: 1, missed: 0, extra: 0, inventedDates: 0, totalActual: 1 }),
  requiredUncertain: [{ title: 'Hạn nhận vé', keys: ['gio_chua_ro'] }],
};

export const E08: EvalCase = {
  id: 'E08',
  category: 'edge',
  title: 'Buổi học bù thiếu năm',
  source: 'paste',
  text: 'Thông báo học bù: Buổi học bù diễn ra lúc 8h ngày 15/11 tại phòng C101. Sinh viên có mặt đúng giờ.',
  now: EVAL_NOW,
  expected: [expected('Buổi học bù', null, null)],
  // Không có ngày nào được phép: mọi ngày trong output đều là bịa.
  allowedDates: [],
  mockOutput: {
    events: [
      rawEvent({
        title: 'Buổi học bù',
        start: null,
        startRaw: '8h ngày 15/11',
        summary: ['Học bù tại phòng C101'],
        confidence: 0.6,
        uncertain: ['nam_chua_ro'],
        quote: 'Buổi học bù diễn ra lúc 8h ngày 15/11 tại phòng C101.',
      }),
    ],
  },
  metrics: metrics({ matched: 1, missed: 0, extra: 0, inventedDates: 0, totalActual: 1 }),
  requiredUncertain: [{ title: 'Buổi học bù', keys: ['nam_chua_ro'] }],
};

export const E09: EvalCase = {
  id: 'E09',
  category: 'edge',
  title: 'Khoảng thời gian rõ ràng',
  source: 'paste',
  text: 'Lớp học diễn ra từ 8:00 ngày 25/10/2026 đến 17:00 ngày 29/10/2026 tại giảng đường D.',
  now: EVAL_NOW,
  expected: [
    expected('Lớp học', '2026-10-25T08:00', null, {
      endValue: '2026-10-29T17:00',
      endDate: null,
    }),
  ],
  allowedDates: ['2026-10-25', '2026-10-29'],
  mockOutput: {
    events: [
      rawEvent({
        title: 'Lớp học',
        start: '2026-10-25T08:00',
        end: '2026-10-29T17:00',
        startRaw: 'từ 8:00 ngày 25/10/2026',
        endRaw: 'đến 17:00 ngày 29/10/2026',
        summary: ['Lớp học tại giảng đường D'],
        confidence: 0.92,
        quote: 'Lớp học diễn ra từ 8:00 ngày 25/10/2026 đến 17:00 ngày 29/10/2026 tại giảng đường D.',
      }),
    ],
  },
  metrics: metrics({ matched: 1, missed: 0, extra: 0, inventedDates: 0, totalActual: 1 }),
};

export const E10: EvalCase = {
  id: 'E10',
  category: 'edge',
  title: 'Họp phụ huynh với ngày tương đối',
  source: 'paste',
  text: 'Buổi họp phụ huynh sẽ diễn ra vào Thứ Ba tuần sau lúc 8:00 tại phòng họp số 2.',
  now: EVAL_NOW,
  // 22/10/2026 là thứ Năm; "Thứ Ba tuần sau" = 27/10/2026.
  // Khi đo thật ở ngày khác, phải ghi lại ngày chạy và đổi đáp án tương ứng.
  expected: [expected('Họp phụ huynh', '2026-10-27T08:00', null)],
  allowedDates: ['2026-10-27'],
  mockOutput: {
    events: [
      rawEvent({
        title: 'Họp phụ huynh',
        start: '2026-10-27T08:00',
        startRaw: 'Thứ Ba tuần sau lúc 8:00',
        summary: ['Họp tại phòng họp số 2'],
        confidence: 0.75,
        uncertain: ['ngay_tuong_doi'],
        quote: 'Buổi họp phụ huynh sẽ diễn ra vào Thứ Ba tuần sau lúc 8:00 tại phòng họp số 2.',
      }),
    ],
  },
  metrics: metrics({ matched: 1, missed: 0, extra: 0, inventedDates: 0, totalActual: 1 }),
  requiredUncertain: [{ title: 'Họp phụ huynh', keys: ['ngay_tuong_doi'] }],
};

