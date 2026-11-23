/**
 * Bảo vệ hợp đồng đóng băng của bộ giữ kín 50 mẫu (TASK 03, xem
 * `tests/fixtures/eval-heldout/PROVENANCE.md`): đủ 50 id đúng phân bố,
 * không có `mockOutput`, không trùng text với dev set lẫn nhau (Jaccard < 0,8),
 * mọi ngày kỳ vọng nằm trong `allowedDates`, mẫu âm có `expected: []`.
 *
 * Test này là "khóa" held-out: nó đỏ nghĩa là bộ đã lệch — phải cập nhật
 * PROVENANCE.md + test trong cùng một commit, và nếu đã đo thì chạy lại cả
 * dev + held-out rồi lưu evidence riêng.
 */
import { describe, expect, it } from 'vitest';
import { EVAL_CASES } from '../fixtures/eval/cases';
import {
  HELDOUT_CASES,
  HELDOUT_NEGATIVE,
  HELDOUT_POSITIVE,
} from '../fixtures/eval-heldout/cases';

const POSITIVE_IDS = Array.from({ length: 30 }, (_, index) => `H${String(index + 1).padStart(2, '0')}`);
const NEGATIVE_IDS = Array.from({ length: 20 }, (_, index) => `N${String(index + 1).padStart(2, '0')}`);
const RELATIVE_IDS = ['H23', 'H24', 'H25', 'H26'];

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-zà-ỹđ0-9]+/i)
      .filter(Boolean),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / (a.size + b.size - shared);
}

function maxJaccardAgainst(text: string, corpus: readonly string[]): number {
  const tokens = tokenize(text);
  let max = 0;
  for (const other of corpus) {
    max = Math.max(max, jaccard(tokens, tokenize(other)));
  }
  return max;
}

describe('held-out freeze — bộ giữ kín 50 mẫu', () => {
  it('có đủ 30 dương H01–H30 và 20 âm N01–N20, id không trùng', () => {
    expect(HELDOUT_POSITIVE.map((item) => item.id)).toEqual(POSITIVE_IDS);
    expect(HELDOUT_NEGATIVE.map((item) => item.id)).toEqual(NEGATIVE_IDS);
    expect(new Set(HELDOUT_CASES.map((item) => item.id)).size).toBe(50);
  });

  it('không có mẫu nào mang mockOutput (bộ này chỉ chạy đo thật)', () => {
    for (const item of HELDOUT_CASES) {
      expect('mockOutput' in item, item.id).toBe(false);
      expect('metrics' in item, item.id).toBe(false);
    }
  });

  it('mẫu âm có expected rỗng và allowedDates rỗng', () => {
    for (const item of HELDOUT_NEGATIVE) {
      expect(item.expected, item.id).toEqual([]);
      expect(item.allowedDates, item.id).toEqual([]);
    }
  });

  it('mẫu dương có ít nhất một sự kiện kỳ vọng và allowedDates đúng định dạng', () => {
    for (const item of HELDOUT_POSITIVE) {
      expect(item.expected.length, item.id).toBeGreaterThan(0);
      expect(item.allowedDates.length, item.id).toBeGreaterThan(0);
      for (const date of item.allowedDates) {
        expect(date, `${item.id} allowedDates`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('mọi ngày kỳ vọng nằm trong allowedDates', () => {
    for (const item of HELDOUT_CASES) {
      for (const event of item.expected) {
        const dates = [
          event.startValue?.slice(0, 10),
          event.startDate,
          event.endValue?.slice(0, 10),
          event.endDate,
        ].filter((date): date is string => Boolean(date));

        for (const date of dates) {
          expect(item.allowedDates, `${item.id} thiếu ${date}`).toContain(date);
        }
      }
    }
  });

  it('mẫu tương đối (H23–H26) có ngày kỳ vọng trong vòng 14 ngày sau `now`', () => {
    const NOW_MS = new Date('2026-10-22T08:00:00+07:00').getTime();
    for (const item of HELDOUT_CASES.filter((entry) => RELATIVE_IDS.includes(entry.id))) {
      expect(item.now, item.id).toBe('2026-10-22T08:00:00+07:00');
      for (const event of item.expected) {
        const date = event.startValue?.slice(0, 10) ?? event.startDate;
        expect(date, `${item.id} phải có ngày tuyệt đối suy được`).toBeTruthy();
        const ms = date ? new Date(`${date}T00:00:00+07:00`).getTime() : NaN;
        expect(ms, item.id).toBeGreaterThan(NOW_MS);
        expect(ms - NOW_MS, item.id).toBeLessThanOrEqual(14 * 86_400_000);
      }
    }
  });

  it('không trùng text với dev set (Jaccard < 0,8)', () => {
    const devTexts = EVAL_CASES.map((item) => item.text);
    for (const item of HELDOUT_CASES) {
      expect(
        maxJaccardAgainst(item.text, devTexts),
        `${item.id} quá giống một mẫu dev`,
      ).toBeLessThan(0.8);
    }
  });

  it('không có hai mẫu held-out trùng text (Jaccard < 0,8)', () => {
    const texts = HELDOUT_CASES.map((item) => item.text);
    for (let i = 0; i < texts.length; i += 1) {
      const rest = texts.slice(i + 1);
      const current = HELDOUT_CASES[i];
      expect(
        maxJaccardAgainst(current?.text ?? '', rest),
        `${current?.id} quá giống một mẫu held-out khác`,
      ).toBeLessThan(0.8);
    }
  });
});
