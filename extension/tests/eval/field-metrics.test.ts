import { describe, expect, it } from 'vitest';
import type { EventCandidate, Profile } from '../../src/shared/contracts';
import type { ExpectedEvent } from './metrics';
import {
  computeFieldMetrics,
  computeProfileMetrics,
  countInventedMidnight,
} from './field-metrics';

function candidate(input: {
  title: string;
  startValue?: string | null;
  startDate?: string | null;
  endValue?: string | null;
  endDate?: string | null;
  label?: EventCandidate['label'];
  uncertain?: string[];
  summary?: string[];
  relatedProfiles?: string[];
}): EventCandidate {
  const startValue = input.startValue ?? null;
  const startDate = input.startDate ?? null;
  const endValue = input.endValue ?? null;
  const endDate = input.endDate ?? null;
  return {
    title: input.title,
    label: input.label ?? 'công_vụ',
    start: { value: startValue, date: startDate, raw: null },
    end: endValue || endDate ? { value: endValue, date: endDate, raw: null } : null,
    durationMinutes: null,
    summary: input.summary ?? [],
    relatedProfiles: input.relatedProfiles ?? [],
    confidence: 0.8,
    uncertain: input.uncertain ?? [],
  };
}

function expected(
  title: string,
  startValue: string | null = null,
  startDate: string | null = null,
  extra: Partial<ExpectedEvent> = {},
): ExpectedEvent {
  return { title, startValue, startDate, ...extra };
}

const HOPT = { title: 'Họp nhóm đồ án', startValue: '2026-11-02T09:00' } as const;

describe('computeFieldMetrics', () => {
  it('mọi trường khớp thì đếm đủ trên một cặp', () => {
    const actual = [
      candidate({
        ...HOPT,
        endValue: '2026-11-02T11:00',
        label: 'công_vụ',
        uncertain: ['gio_chua_ro'],
        summary: ['Họp tại B203'],
      }),
    ];
    const targets = [
      expected('Họp nhóm đồ án', '2026-11-02T09:00', null, {
        endValue: '2026-11-02T11:00',
        label: 'công_vụ',
        uncertain: ['gio_chua_ro'],
      }),
    ];

    expect(computeFieldMetrics(actual, targets)).toEqual({
      pairs: 1,
      dateExact: 1,
      dateComparable: 1,
      startTimeExact: 1,
      startTimeComparable: 1,
      endExact: 1,
      endComparable: 1,
      endTimeExact: 1,
      endTimeComparable: 1,
      labelExact: 1,
      labelComparable: 1,
      uncertainMatch: 1,
      uncertainComparable: 1,
      summaryPresent: 1,
    });
  });

  it('sai giờ thì startTimeExact bằng 0 dù vẫn ghép được cặp', () => {
    const metrics = computeFieldMetrics(
      [candidate({ ...HOPT, startValue: '2026-11-02T10:00' })],
      [expected(HOPT.title, '2026-11-02T09:00')],
    );

    expect(metrics.startTimeComparable).toBe(1);
    expect(metrics.startTimeExact).toBe(0);
    expect(metrics.dateExact).toBe(1);
  });

  it('lệch 1 ngày (vẫn qua cổng ghép) thì dateExact bằng 0', () => {
    const metrics = computeFieldMetrics(
      [candidate({ ...HOPT, startValue: '2026-11-03T09:00' })],
      [expected(HOPT.title, '2026-11-02T09:00')],
    );

    expect(metrics.pairs).toBe(1);
    expect(metrics.dateExact).toBe(0);
    expect(metrics.startTimeExact).toBe(1);
  });

  it('gold chỉ có ngày thì không chấm giờ start và không đếm summary thiếu', () => {
    const metrics = computeFieldMetrics(
      [candidate({ title: 'Hạn nhận vé', startDate: '2026-11-05' })],
      [expected('Hạn nhận vé', null, '2026-11-05')],
    );

    expect(metrics).toMatchObject({
      pairs: 1,
      dateExact: 1,
      dateComparable: 1,
      startTimeComparable: 0,
      startTimeExact: 0,
      summaryPresent: 0,
    });
  });

  it('chấm end date-only qua endDate của gold', () => {
    const metrics = computeFieldMetrics(
      [
        candidate({
          title: 'Hội chợ sách',
          startValue: '2026-12-03T09:00',
          endValue: '2026-12-07T19:00',
        }),
      ],
      [
        expected('Hội chợ sách', '2026-12-03T09:00', null, {
          endDate: '2026-12-07',
        }),
      ],
    );

    expect(metrics).toMatchObject({ endComparable: 1, endExact: 1, endTimeComparable: 0 });
  });

  it('sự kiện không ghép được không góp vào số đo trường', () => {
    const metrics = computeFieldMetrics(
      [candidate({ ...HOPT }), candidate({ title: 'Sự kiện thừa', startValue: '2026-11-03T09:00' })],
      [expected(HOPT.title, '2026-11-02T09:00'), expected('Sự kiện bị bỏ lỡ', '2026-11-20T17:00')],
    );

    expect(metrics.pairs).toBe(1);
    expect(metrics.dateComparable).toBe(1);
  });

  it('nhãn sai và thiếu cờ uncertain đều bị bắt', () => {
    const metrics = computeFieldMetrics(
      [candidate({ ...HOPT, label: 'cá_nhân', uncertain: [] })],
      [
        expected(HOPT.title, '2026-11-02T09:00', null, {
          label: 'công_vụ',
          uncertain: ['nam_suy_doan'],
        }),
      ],
    );

    expect(metrics).toMatchObject({ labelComparable: 1, labelExact: 0, uncertainMatch: 0 });
  });

  it('actual gắn thừa cờ uncertain vẫn tính là khớp (không được thiếu, được thừa)', () => {
    const metrics = computeFieldMetrics(
      [candidate({ ...HOPT, uncertain: ['nam_suy_doan', 'gio_suy_doan'] })],
      [expected(HOPT.title, '2026-11-02T09:00', null, { uncertain: ['nam_suy_doan'] })],
    );

    expect(metrics.uncertainMatch).toBe(1);
  });
});

describe('computeProfileMetrics', () => {
  const profiles: Profile[] = [
    { id: 'p1', name: 'Thầy An' },
    { id: 'p2', name: 'Lan' },
  ] as unknown as Profile[];

  it('đếm khớp, thiếu và thừa theo tên hồ sơ', () => {
    const metrics = computeProfileMetrics(
      [candidate({ ...HOPT, relatedProfiles: ['p1', 'p9'] })],
      [expected(HOPT.title, '2026-11-02T09:00', null, { profileNames: ['Thầy An', 'Lan'] })],
      profiles,
    );

    expect(metrics).toEqual({
      expectedProfiles: 2,
      matchedProfiles: 1,
      extraProfiles: 1,
      recall: 0.5,
      precision: 0.5,
    });
  });

  it('không có hồ sơ nào ở cả hai phía thì recall/precision bằng 1', () => {
    const metrics = computeProfileMetrics([candidate({ ...HOPT })], [expected(HOPT.title, '2026-11-02T09:00')], []);
    expect(metrics).toMatchObject({ expectedProfiles: 0, recall: 1, precision: 1 });
  });
});

describe('countInventedMidnight', () => {
  it('gold chỉ có ngày mà actual điền T00:00 thì bị đếm', () => {
    const count = countInventedMidnight(
      [candidate({ title: 'Hạn nhận vé', startValue: '2026-11-05T00:00' })],
      [expected('Hạn nhận vé', null, '2026-11-05')],
    );
    expect(count).toBe(1);
  });

  it('gold có giờ hoặc actual không điền giờ thì không đếm', () => {
    expect(
      countInventedMidnight(
        [candidate({ ...HOPT, startValue: '2026-11-02T00:00' })],
        [expected(HOPT.title, '2026-11-02T00:00')],
      ),
    ).toBe(0);

    expect(
      countInventedMidnight(
        [candidate({ title: 'Hạn nhận vé', startDate: '2026-11-05' })],
        [expected('Hạn nhận vé', null, '2026-11-05')],
      ),
    ).toBe(0);
  });
});
