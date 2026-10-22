import { describe, expect, it } from 'vitest';
import {
  hashText,
  normalizeWhitespace,
  parseListInput,
  parseSummaryInput,
  parseTagsInput,
  truncateText,
} from '../../src/core/text';

describe('text', () => {
  it('chuẩn hoá khoảng trắng và xuống dòng', () => {
    expect(normalizeWhitespace('  a   b\r\n\r\n\r\nc  ')).toBe('a b\n\nc');
  });

  it('băm ổn định và phân biệt nội dung', () => {
    expect(hashText('xin chào')).toBe(hashText('xin chào'));
    expect(hashText('xin chào')).not.toBe(hashText('xin chào!'));
  });

  it('cắt văn bản dài và báo cờ', () => {
    const short = truncateText('abc', 10);
    expect(short).toEqual({ text: 'abc', truncated: false });

    const long = truncateText('a'.repeat(20), 5);
    expect(long.text).toHaveLength(5);
    expect(long.truncated).toBe(true);
  });

  it('tách danh sách nhập tay', () => {
    expect(parseListInput('An, Bình; Chi\nDũng')).toEqual(['An', 'Bình', 'Chi', 'Dũng']);
    expect(parseListInput('An, An, Bình')).toEqual(['An', 'Bình']);
    expect(parseListInput('a,b,c', 2)).toEqual(['a', 'b']);
  });

  it('tách tóm tắt, bỏ bullet và mặc định cho phép 50 ý', () => {
    expect(parseSummaryInput('- Ý một\n2. Ý hai\n• Ý ba')).toEqual(['Ý một', 'Ý hai', 'Ý ba']);
    expect(parseSummaryInput('1\n2\n3\n4\n5\n6')).toHaveLength(6);
    expect(parseSummaryInput('1\n2\n3\n4\n5\n6', 5)).toHaveLength(5);
    expect(parseSummaryInput('   ')).toEqual([]);
  });

  it('tách nhãn tuỳ chỉnh và khử trùng không phân biệt hoa/thường', () => {
    expect(parseTagsInput('đồ án, Họp nhóm; đồ án\nThư viện')).toEqual({
      tags: ['đồ án', 'Họp nhóm', 'Thư viện'],
      error: null,
    });
    expect(parseTagsInput('   ')).toEqual({ tags: [], error: null });
  });

  it('báo lỗi khi quá 5 nhãn hoặc nhãn quá dài', () => {
    expect(parseTagsInput('a,b,c,d,e,f').error).toMatch(/Tối đa 5/);
    expect(parseTagsInput('a'.repeat(25)).error).toMatch(/24 ký tự/);
    expect(parseTagsInput('a'.repeat(24)).error).toBeNull();
  });
});
