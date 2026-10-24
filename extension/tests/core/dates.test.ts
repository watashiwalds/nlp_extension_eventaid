import { describe, expect, it } from 'vitest';
import {
  daysFromToday,
  durationMinutes,
  formatDate,
  formatDateTimeLong,
  formatDuration,
  joinDateTimeLocal,
  parseLocalDateTime,
  relativeLabel,
  splitDateTimeLocal,
  toInputValue,
} from '../../src/core/dates';

const NOW = new Date(2026, 9, 21, 8, 0, 0); // 21/10/2026 08:00 giờ địa phương

describe('dates', () => {
  it('parse được chuỗi datetime-local', () => {
    const date = parseLocalDateTime('2026-11-02T09:30');
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(10);
    expect(date?.getDate()).toBe(2);
    expect(date?.getHours()).toBe(9);
    expect(date?.getMinutes()).toBe(30);
  });

  it('trả null với chuỗi sai định dạng', () => {
    expect(parseLocalDateTime('02/11/2026 09:30')).toBeNull();
    expect(parseLocalDateTime('')).toBeNull();
  });

  it('round-trip qua toInputValue', () => {
    const date = parseLocalDateTime('2026-01-05T07:05');
    expect(date).not.toBeNull();
    expect(toInputValue(date as Date)).toBe('2026-01-05T07:05');
  });

  it('đếm ngày và nhãn tương đối', () => {
    expect(daysFromToday('2026-10-21T23:00', NOW)).toBe(0);
    expect(daysFromToday('2026-10-22T01:00', NOW)).toBe(1);
    expect(daysFromToday('2026-10-24T09:00', NOW)).toBe(3);
    expect(relativeLabel('2026-10-21T09:00', NOW)).toBe('Hôm nay · 09:00');
    expect(relativeLabel('2026-10-22T09:00', NOW)).toBe('Ngày mai · 09:00');
    expect(relativeLabel('2026-10-24T09:00', NOW)).toBe('Còn 3 ngày · 09:00');
    expect(relativeLabel('2026-10-19T09:00', NOW)).toBe('Đã qua 2 ngày');
  });

  it('định dạng được ngày chỉ có ngày và ISO có múi giờ', () => {
    expect(formatDate('2026-11-20')).toContain('20/11/2026');
    expect(formatDateTimeLong('2026-11-20')).toContain('20/11/2026');
    expect(formatDateTimeLong('2026-11-20')).not.toContain('—');
    expect(formatDateTimeLong('2026-10-23T12:00:00.000Z')).not.toContain('—');
  });

  it('tính thời lượng và định dạng', () => {
    expect(durationMinutes('2026-11-02T09:00', '2026-11-02T10:30')).toBe(90);
    expect(durationMinutes('2026-11-02T10:00', '2026-11-02T09:00')).toBeNull();
    expect(formatDuration(90)).toBe('1 giờ 30 phút');
    expect(formatDuration(120)).toBe('2 giờ');
    expect(formatDuration(45)).toBe('45 phút');
    expect(formatDuration(null)).toBe('—');
  });

  it('tách và ghép ô ngày/giờ round-trip', () => {
    expect(splitDateTimeLocal('2026-11-02T09:30')).toEqual({ date: '2026-11-02', time: '09:30' });
    expect(joinDateTimeLocal('2026-11-02', '09:30')).toEqual({
      value: '2026-11-02T09:30',
      date: null,
      error: null,
    });
    expect(splitDateTimeLocal('2026-11-02')).toEqual({ date: '2026-11-02', time: '' });
  });

  it('ghép ô ngày/giờ xử lý rỗng và giá trị thiếu', () => {
    expect(joinDateTimeLocal('', '')).toEqual({ value: '', date: null, error: null });
    expect(splitDateTimeLocal('')).toEqual({ date: '', time: '' });
    expect(joinDateTimeLocal('2026-11-02', '')).toEqual({
      value: '',
      date: '2026-11-02',
      error: null,
    });
    expect(joinDateTimeLocal('', '09:30').error).toBe('Cần nhập ngày');
    expect(joinDateTimeLocal('2026-11-31', '09:30').error).toBe('Ngày hoặc giờ không hợp lệ');
    expect(joinDateTimeLocal('2026-11-02', '99:99').error).toBe('Ngày hoặc giờ không hợp lệ');
  });
});
