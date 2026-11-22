/**
 * Bảo vệ hợp đồng đóng băng của gold set E01–E17 (xem
 * `tests/fixtures/eval/README.md`): tổng 25 sự kiện, quy ước E12 rescan,
 * không trùng text giữa các mẫu và `allowedDates` đúng định dạng.
 *
 * Test này là "khóa" gold: nó đỏ nghĩa là gold đã lệch so với tài liệu —
 * khi đó phải cập nhật README + test trong cùng một commit và ghi lý do.
 */
import { describe, expect, it } from 'vitest';
import { EVAL_CASES } from '../fixtures/eval/cases';

const EXPECTED_CASE_IDS = Array.from(
  { length: 17 },
  (_, index) => `E${String(index + 1).padStart(2, '0')}`,
);
const TOTAL_EXPECTED_EVENTS = 25;

describe('gold freeze — bộ mẫu E01–E17', () => {
  it('có đủ 17 mẫu với id E01–E17 không trùng', () => {
    expect(EVAL_CASES.map((item) => item.id)).toEqual(EXPECTED_CASE_IDS);
  });

  it('tổng số sự kiện kỳ vọng của gold là 25', () => {
    const total = EVAL_CASES.reduce((sum, item) => sum + item.expected.length, 0);
    expect(total).toBe(TOTAL_EXPECTED_EVENTS);
  });

  it('E12 là mẫu rescan (lượt 2 không chấm metrics)', () => {
    const rescanCases = EVAL_CASES.filter((item) => item.rescan === true);
    expect(rescanCases.map((item) => item.id)).toEqual(['E12']);
  });

  it('không có hai mẫu trùng text (contentHash là phái sinh của id nên duy nhất theo id)', () => {
    const texts = EVAL_CASES.map((item) => item.text.trim());
    expect(new Set(texts).size).toBe(EVAL_CASES.length);
  });

  it('allowedDates đúng định dạng YYYY-MM-DD và chứa mọi ngày kỳ vọng', () => {
    for (const evalCaseItem of EVAL_CASES) {
      for (const date of evalCaseItem.allowedDates) {
        expect(date, `${evalCaseItem.id} allowedDates`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }

      for (const event of evalCaseItem.expected) {
        const dates = [
          event.startValue?.slice(0, 10),
          event.startDate,
          event.endValue?.slice(0, 10),
          event.endDate,
        ].filter((date): date is string => Boolean(date));

        for (const date of dates) {
          expect(evalCaseItem.allowedDates, `${evalCaseItem.id} thiếu ${date}`).toContain(date);
        }
      }
    }
  });
});
