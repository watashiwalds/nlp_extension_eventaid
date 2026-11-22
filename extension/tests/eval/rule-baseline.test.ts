import { describe, expect, it } from 'vitest';
import { EventCandidateSchema } from '../../src/shared/contracts';
import { extractWithRules } from './rule-baseline';

/** Mốc cố định: thứ Năm 22/10/2026 — cùng `EVAL_NOW` của bộ mẫu. */
const NOW = new Date(2026, 9, 22, 8, 0, 0);

describe('extractWithRules — ngày tuyệt đối', () => {
  it('đọc dd/mm/yyyy + HH:mm', () => {
    const [event] = extractWithRules('Lớp họp nhóm đồ án lúc 9:00 ngày 2/11/2026 tại B203.', NOW);

    expect(event?.start).toEqual({ value: '2026-11-02T09:00', date: null, raw: '2/11/2026 9:00' });
    expect(event?.title).toBe('Lớp họp nhóm đồ án');
  });

  it('đọc "ngày dd tháng mm" không năm → năm ngữ cảnh + cờ nam_suy_doan', () => {
    const [event] = extractWithRules('Hội chợ sách mở cửa ngày 3 tháng 12.', NOW);

    expect(event?.start).toEqual({ value: null, date: '2026-12-03', raw: 'ngày 3 tháng 12' });
    expect(event?.uncertain).toContain('nam_suy_doan');
  });

  it('chỉ có ngày thì value=null, date=YYYY-MM-DD (đúng hợp đồng DateTimeRef)', () => {
    const [event] = extractWithRules('Hạn nhận vé là 29/10.', NOW);

    expect(event?.start).toEqual({ value: null, date: '2026-10-29', raw: '29/10' });
    expect(event?.uncertain).toContain('nam_suy_doan');
  });
});

describe('extractWithRules — giờ và khoảng', () => {
  it('đọc khoảng "từ A đến B"', () => {
    const [event] = extractWithRules('Lớp học từ 9:00 đến 11:30 ngày 2/11/2026.', NOW);

    expect(event?.start.value).toBe('2026-11-02T09:00');
    expect(event?.end?.value).toBe('2026-11-02T11:30');
  });

  it('đọc "H giờ rưỡi" và "Hhmm"', () => {
    const [a] = extractWithRules('Họp vào 14 giờ rưỡi ngày 3/11/2026.', NOW);
    const [b] = extractWithRules('Họp lúc 14h30 ngày 3/11/2026.', NOW);

    expect(a?.start.value).toBe('2026-11-03T14:30');
    expect(b?.start.value).toBe('2026-11-03T14:30');
  });

  it('câu không có giờ rõ nhưng có cụm mơ hồ trong bảng → quy ước + cờ gio_suy_doan', () => {
    const [event] = extractWithRules('Đóng cửa vào buổi tối ngày 7/12.', NOW);

    expect(event?.start.value).toBe('2026-12-07T19:00');
    expect(event?.uncertain).toEqual(expect.arrayContaining(['gio_suy_doan']));
  });
});

describe('extractWithRules — ngày tương đối (quy ước baseline)', () => {
  it('"mai" = +1 ngày và gắn ngay_tuong_doi', () => {
    const [event] = extractWithRules('Họp nhóm vào lúc 9h mai.', NOW);

    expect(event?.start.value).toBe('2026-10-23T09:00');
    expect(event?.uncertain).toContain('ngay_tuong_doi');
  });

  it('"thứ 3" = thứ Ba kế tiếp sau now (C6 resolver của baseline)', () => {
    const [event] = extractWithRules('Họp phụ huynh vào thứ 3 lúc 8:00.', NOW);

    // 22/10/2026 là thứ Năm → thứ Ba kế tiếp là 27/10/2026.
    expect(event?.start.value).toBe('2026-10-27T08:00');
    expect(event?.uncertain).toContain('ngay_tuong_doi');
  });
});

describe('extractWithRules — giới hạn có chủ đích', () => {
  it('một câu nhiều biểu thức ngày → tối đa 2 sự kiện (cap theo câu, không theo văn bản)', () => {
    const events = extractWithRules(
      'Chương trình gồm hội thảo 3/11/2026, triển lãm 4/11/2026 và gala 5/11/2026.',
      NOW,
    );
    expect(events).toHaveLength(2);

    const fourSentences = extractWithRules(
      'Sáng 3/11/2026 khai mạc. Chiều 4/11/2026 hội thảo. Tối 5/11/2026 gala. Ngày 6/11/2026 bế mạc.',
      NOW,
    );
    expect(fourSentences).toHaveLength(4);
  });

  it('câu không có ngày thì không sinh sự kiện; mọi candidate hợp lệ schema', () => {
    const events = extractWithRules('Nội dung chỉ là giới thiệu chung.', NOW);
    expect(events).toEqual([]);

    for (const event of extractWithRules('Họp 2/11/2026. Nộp 20/11/2026.', NOW)) {
      expect(EventCandidateSchema.safeParse(event).success).toBe(true);
    }
  });
});
