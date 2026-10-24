import { describe, expect, it } from 'vitest';
import type { EventCandidate } from '../../src/shared/contracts';
import {
  computeMetrics,
  isInventedDate,
  matchExpected,
  passesDateGate,
  percentile,
  titlesMatch,
} from './metrics';
import type { ExpectedEvent } from './metrics';

function candidate(input: {
  title: string;
  startValue?: string | null;
  startDate?: string | null;
  endValue?: string | null;
  endDate?: string | null;
}): EventCandidate {
  const startValue = input.startValue ?? null;
  const startDate = input.startDate ?? null;
  const endValue = input.endValue ?? null;
  const endDate = input.endDate ?? null;
  return {
    title: input.title,
    label: 'công_vụ',
    start: { value: startValue, date: startDate, raw: null },
    end: endValue || endDate ? { value: endValue, date: endDate, raw: null } : null,
    durationMinutes: null,
    summary: [],
    relatedProfiles: [],
    confidence: 0.8,
    uncertain: [],
  };
}

function expected(
  title: string,
  startValue: string | null = null,
  startDate: string | null = null,
): ExpectedEvent {
  return { title, startValue, startDate };
}

describe('titlesMatch', () => {
  it('khớp tiêu đề trùng khít sau chuẩn hoá', () => {
    expect(titlesMatch('Họp nhóm đồ án', 'Họp nhóm đồ án')).toBe(true);
  });

  it('bỏ dấu tiếng Việt và ký tự trang trí', () => {
    expect(titlesMatch('hop nhom do an!', 'Họp nhóm đồ án')).toBe(true);
  });

  it('khớp tiêu đề paraphrase khi Jaccard token ≥ 0.5', () => {
    expect(titlesMatch('Họp nhóm đồ án giữa kỳ', 'Họp nhóm đồ án')).toBe(true);
  });

  it('không khớp hai tiêu đề chỉ chung một token', () => {
    expect(titlesMatch('Họp lớp', 'Họp nhóm đồ án')).toBe(false);
  });
});

describe('passesDateGate', () => {
  it('cùng ngày thì qua cổng', () => {
    expect(
      passesDateGate(
        candidate({ title: 'Họp', startValue: '2026-11-02T09:00' }),
        expected('Họp', '2026-11-02T09:00'),
      ),
    ).toBe(true);
  });

  it('lệch đúng 1 ngày vẫn qua cổng', () => {
    expect(
      passesDateGate(
        candidate({ title: 'Họp', startValue: '2026-11-03T09:00' }),
        expected('Họp', '2026-11-02T09:00'),
      ),
    ).toBe(true);
  });

  it('lệch hơn 1 ngày thì không ghép', () => {
    expect(
      passesDateGate(
        candidate({ title: 'Họp', startValue: '2026-11-04T09:00' }),
        expected('Họp', '2026-11-02T09:00'),
      ),
    ).toBe(false);
  });

  it('đáp án có ngày mà output không có ngày thì không ghép', () => {
    expect(passesDateGate(candidate({ title: 'Họp' }), expected('Họp', null, '2026-11-02'))).toBe(
      false,
    );
  });

  it('đáp án không có ngày thì bỏ qua cổng ngày', () => {
    expect(
      passesDateGate(
        candidate({ title: 'Họp', startValue: '2026-11-04T09:00' }),
        expected('Họp'),
      ),
    ).toBe(true);
  });
});

describe('matchExpected', () => {
  it('ghép 1-1 tham lam, không dùng lại một sự kiện', () => {
    const actual = [
      candidate({ title: 'Họp nhóm đồ án', startValue: '2026-11-02T09:00' }),
      candidate({ title: 'Họp nhóm đồ án', startValue: '2026-11-02T09:00' }),
    ];
    const result = matchExpected(actual, [
      expected('Họp nhóm đồ án', '2026-11-02T09:00'),
    ]);

    expect(result.pairs).toEqual([{ actualIndex: 0, expectedIndex: 0 }]);
    expect(result.missed).toEqual([]);
    expect(result.extra).toEqual([1]);
  });

  it('báo thiếu khi số đáp án nhiều hơn số sự kiện khớp', () => {
    const result = matchExpected(
      [candidate({ title: 'Họp nhóm đồ án', startValue: '2026-11-02T09:00' })],
      [
        expected('Họp nhóm đồ án', '2026-11-02T09:00'),
        expected('Nộp báo cáo', '2026-11-20T17:00'),
      ],
    );

    expect(result.pairs).toHaveLength(1);
    expect(result.missed).toEqual([1]);
    expect(result.extra).toEqual([]);
  });

  it('không ghép khi tiêu đề giống nhưng ngày lệch quá 1 ngày', () => {
    const result = matchExpected(
      [candidate({ title: 'Họp nhóm đồ án', startValue: '2026-11-04T09:00' })],
      [expected('Họp nhóm đồ án', '2026-11-02T09:00')],
    );

    expect(result.pairs).toEqual([]);
    expect(result.missed).toEqual([0]);
    expect(result.extra).toEqual([0]);
  });
});

describe('computeMetrics', () => {
  it('tính recall/precision và đếm thiếu/thừa', () => {
    const actual = [
      candidate({ title: 'Họp nhóm đồ án', startValue: '2026-11-02T09:00' }),
      candidate({ title: 'Sự kiện thừa', startValue: '2026-11-03T09:00' }),
    ];
    const expectedEvents = [
      expected('Họp nhóm đồ án', '2026-11-02T09:00'),
      expected('Nộp báo cáo', '2026-11-20T17:00'),
    ];

    expect(computeMetrics(actual, expectedEvents, ['2026-11-02', '2026-11-03'])).toEqual({
      recall: 0.5,
      precision: 0.5,
      matched: 1,
      missed: 1,
      extra: 1,
      inventedDates: 0,
      totalActual: 2,
    });
  });

  it('mẫu âm đạt recall/precision khi không trả về sự kiện nào', () => {
    expect(computeMetrics([], [], [])).toEqual({
      recall: 1,
      precision: 1,
      matched: 0,
      missed: 0,
      extra: 0,
      inventedDates: 0,
      totalActual: 0,
    });
  });

  it('mẫu âm trả về sự kiện thì recall/precision bằng 0 và bị tính là ngày bịa', () => {
    const metrics = computeMetrics(
      [candidate({ title: 'Sự kiện bịa', startValue: '2026-10-20T09:00' })],
      [],
      [],
    );

    expect(metrics).toMatchObject({
      recall: 0,
      precision: 0,
      matched: 0,
      extra: 1,
      inventedDates: 1,
      totalActual: 1,
    });
  });

  it('đếm ngày bịa trên cả start và end', () => {
    const metrics = computeMetrics(
      [
        candidate({
          title: 'Họp',
          startValue: '2026-11-02T09:00',
          endValue: '2026-11-03T17:00',
        }),
      ],
      [expected('Họp', '2026-11-02T09:00')],
      ['2026-11-02'],
    );

    expect(metrics.matched).toBe(1);
    expect(metrics.inventedDates).toBe(1);
  });
});

describe('isInventedDate', () => {
  it('ngày start nằm trong danh sách cho phép thì không bịa', () => {
    expect(
      isInventedDate(candidate({ title: 'Họp', startValue: '2026-11-02T09:00' }), [
        '2026-11-02',
      ]),
    ).toBe(false);
  });

  it('ngày start.date nằm ngoài danh sách là bịa', () => {
    expect(
      isInventedDate(candidate({ title: 'Họp', startDate: '2026-11-03' }), ['2026-11-02']),
    ).toBe(true);
  });

  it('ngày end nằm ngoài danh sách là bịa', () => {
    expect(
      isInventedDate(
        candidate({
          title: 'Họp',
          startValue: '2026-11-02T09:00',
          endValue: '2026-11-03T17:00',
        }),
        ['2026-11-02'],
      ),
    ).toBe(true);
  });

  it('sự kiện không có ngày thì không bị coi là bịa', () => {
    expect(isInventedDate(candidate({ title: 'Họp' }), [])).toBe(false);
  });

  it('danh sách cho phép rỗng mà có ngày thì là bịa', () => {
    expect(
      isInventedDate(candidate({ title: 'Họp', startValue: '2026-11-02T09:00' }), []),
    ).toBe(true);
  });

  it('raw một mình không phải bằng chứng cho ngày', () => {
    const event = candidate({ title: 'Họp' });
    event.start.raw = '2/11/2026';
    expect(isInventedDate(event, [])).toBe(false);
  });
});

describe('percentile', () => {
  it('mảng rỗng trả null thay vì bịa số 0', () => {
    expect(percentile([], 0.95)).toBeNull();
  });

  it('một giá trị trả chính nó', () => {
    expect(percentile([42], 0.95)).toBe(42);
  });

  it('dùng nearest-rank: p95 của 20 giá trị là giá trị thứ 19', () => {
    const values = Array.from({ length: 20 }, (_, index) => index + 1);
    expect(percentile(values, 0.95)).toBe(19);
  });

  it('p95 của hai giá trị là giá trị lớn hơn', () => {
    expect(percentile([1, 2], 0.95)).toBe(2);
  });

  it('không phụ thuộc thứ tự đầu vào', () => {
    expect(percentile([5, 1, 3], 0.95)).toBe(5);
  });
});
