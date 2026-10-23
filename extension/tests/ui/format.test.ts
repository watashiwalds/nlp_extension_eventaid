import { describe, expect, it } from 'vitest';
import { formatCharCount, truncationText } from '../../src/ui/format';

describe('format UI', () => {
  it('định dạng số ký tự theo vi-VN', () => {
    expect(formatCharCount(5000)).toBe('5.000 ký tự');
  });

  it('nhắc tăng giới hạn khi tài liệu bị cắt', () => {
    const text = truncationText(10000);
    expect(text).toContain('10.000 ký tự');
    expect(text).toContain('Số đoạn tối đa');
    expect(text).toContain('Ký tự mỗi đoạn');
    expect(text).toContain('Cài đặt');
  });
});
