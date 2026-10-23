import { describe, expect, it } from 'vitest';
import { chunkText } from '../../src/core/extraction/chunk';

const LONG = [
  'Thông báo lớp học phần XLNNTN.',
  '',
  'Lớp sẽ họp nhóm đồ án lúc 9:00 ngày 2/11/2026 tại phòng B203. Sinh viên chuẩn bị đề cương.',
  '',
  'Hạn nộp báo cáo giữa kỳ là 20/11. Báo cáo dài tối đa 15 trang, nộp qua hệ thống.',
  '',
  'Buổi seminar về máy học diễn ra lúc 14:00 ngày 8/11/2026 tại hội trường A.',
].join('\n');

describe('chunkText', () => {
  it('giữ offset chính xác và phủ kín tài liệu', () => {
    const result = chunkText(LONG, { chunkChars: 80, maxChunks: 10 });
    expect(result.totalChars).toBe(LONG.length);
    expect(result.truncated).toBe(false);
    expect(result.chunks[0]?.charStart).toBe(0);
    expect(result.chunks.at(-1)?.charEnd).toBe(LONG.length);
    for (const chunk of result.chunks) {
      expect(LONG.slice(chunk.charStart, chunk.charEnd)).toBe(chunk.text);
      expect(chunk.text.length).toBeLessThanOrEqual(80);
    }
  });

  it('cắt ở ranh giới đoạn văn khi có thể', () => {
    const text = `${'A'.repeat(50)}\n\n${'B'.repeat(50)}`;
    const result = chunkText(text, { chunkChars: 60, maxChunks: 10 });
    expect(result.chunks[0]?.text).toBe(`${'A'.repeat(50)}\n\n`);
  });

  it('chồng lấn giữa hai đoạn liền kề, không mất ký tự', () => {
    const result = chunkText(LONG, { chunkChars: 80, maxChunks: 10, overlapChars: 20 });
    for (let i = 1; i < result.chunks.length; i += 1) {
      const previous = result.chunks[i - 1];
      const current = result.chunks[i];
      expect(previous && current ? current.charStart < previous.charEnd : true).toBe(true);
    }
  });

  it('đánh dấu truncated khi vượt maxChunks', () => {
    const result = chunkText(LONG, { chunkChars: 60, maxChunks: 2 });
    expect(result.chunks).toHaveLength(2);
    expect(result.truncated).toBe(true);
    expect(result.chunks.at(-1)?.charEnd).toBeLessThan(LONG.length);
  });

  it('văn bản ngắn trả một đoạn duy nhất', () => {
    const result = chunkText('Một câu ngắn.', { chunkChars: 500, maxChunks: 4 });
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]?.text).toBe('Một câu ngắn.');
    expect(result.truncated).toBe(false);
  });

  it('văn bản rỗng trả danh sách rỗng', () => {
    expect(chunkText('   \n\n  ', { chunkChars: 100, maxChunks: 4 }).chunks).toEqual([]);
  });

  it('chunkChars lớn hơn tài liệu không tạo đoạn thừa', () => {
    const result = chunkText(LONG, { chunkChars: 10_000, maxChunks: 4 });
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]?.charEnd).toBe(LONG.length);
  });
});
