/**
 * Unit test hành vi prompt v5 trong `normalizeDateTime`: suy năm từ ngữ cảnh
 * (gắn cờ `nam_suy_doan`) và giờ nói mơ hồ theo bảng quy ước
 * (`gio_suy_doan`). Tách khỏi `extraction-normalize.test.ts` để dưới ngưỡng
 * `max-lines`.
 *
 * Nguyên tắc an toàn: suy đoán chỉ được nhận khi điều kiện kiểm chứng khớp;
 * mọi trường hợp khác giữ hành vi cũ (value null + cờ "chưa rõ").
 */
import { describe, expect, it } from 'vitest';
import { normalizeDateTime } from '../../src/core/extraction/normalize';
import { vagueTimeFromRaw } from '../../src/core/extraction/vague-time';

const TZ = 'Asia/Ho_Chi_Minh';

describe('normalizeDateTime v5 — suy đoán có gắn cờ', () => {
  it('raw thiếu năm + model trả đủ năm ngữ cảnh → nhận value, gắn nam_suy_doan', () => {
    const result = normalizeDateTime('2026-11-15T08:00', '8:00 ngày 15/11', TZ, '', 2026);
    expect(result.ref.value).toBe('2026-11-15T08:00');
    expect(result.ref.raw).toBe('8:00 ngày 15/11');
    expect(result.uncertain).toContain('nam_suy_doan');
    expect(result.uncertain).not.toContain('nam_chua_ro');
  });

  it('model trả năm khác năm ngữ cảnh → từ chối, giữ nam_chua_ro', () => {
    const result = normalizeDateTime('2027-11-15T08:00', '8:00 ngày 15/11', TZ, '', 2026);
    expect(result.ref.value).toBeNull();
    expect(result.uncertain).toContain('nam_chua_ro');
    expect(result.uncertain).not.toContain('nam_suy_doan');
  });

  it('ngày/tháng không khớp raw → không suy năm', () => {
    const result = normalizeDateTime('2026-11-16T08:00', '8:00 ngày 15/11', TZ, '', 2026);
    expect(result.ref.value).toBeNull();
    expect(result.uncertain).toContain('nam_chua_ro');
  });

  it('raw nêu sẵn năm khác → đi đường thường, không gắn nam_suy_doan', () => {
    const result = normalizeDateTime('2027-11-15T08:00', '8:00 ngày 15/11/2027', TZ, '', 2026);
    expect(result.ref.value).toBe('2027-11-15T08:00');
    expect(result.uncertain).not.toContain('nam_suy_doan');
  });

  it('chỉ có ngày: nhận YYYY-MM-DD suy năm, giữ date + gio_chua_ro', () => {
    const result = normalizeDateTime('2026-11-15', '15/11', TZ, '', 2026);
    expect(result.ref.value).toBeNull();
    expect(result.ref.date).toBe('2026-11-15');
    expect(result.ref.raw).toBe('15/11');
    expect(result.uncertain).toContain('nam_suy_doan');
    expect(result.uncertain).toContain('gio_chua_ro');
  });

  it('"chiều muộn" + model trả đúng 18:00 → nhận value, gắn gio_suy_doan', () => {
    const result = normalizeDateTime('2026-10-31T18:00', 'chiều muộn ngày 31/10', TZ, '', 2026);
    expect(result.ref.value).toBe('2026-10-31T18:00');
    expect(result.ref.raw).toBe('chiều muộn ngày 31/10');
    expect(result.uncertain).toContain('nam_suy_doan');
    expect(result.uncertain).toContain('gio_suy_doan');
    expect(result.uncertain).not.toContain('gio_chua_ro');
  });

  it('giờ mơ hồ nhưng model trả giờ ngoài bảng → từ chối, giữ date', () => {
    const result = normalizeDateTime('2026-10-31T20:30', 'chiều muộn ngày 31/10', TZ, '', 2026);
    expect(result.ref.value).toBeNull();
    expect(result.ref.date).toBe('2026-10-31');
    expect(result.uncertain).toContain('gio_chua_ro');
    expect(result.uncertain).not.toContain('gio_suy_doan');
  });

  it('"chiều muộn" phải thắng "chiều" trong bảng (không khớp nhầm 15:00)', () => {
    expect(vagueTimeFromRaw('kết thúc vào chiều muộn ngày 31/10')).toBe('18:00');
    expect(vagueTimeFromRaw('họp vào buổi chiều')).toBe('15:00');
    expect(vagueTimeFromRaw('họp vào buổi tối')).toBe('19:00');
    expect(vagueTimeFromRaw('cụm không có trong bảng')).toBeNull();
  });
});
