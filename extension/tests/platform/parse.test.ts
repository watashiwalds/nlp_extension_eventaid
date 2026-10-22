// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { parseCapture } from '../../src/platform/capture/parse';

const LONG_PARAGRAPH = 'Hội đồng gồm ba giảng viên, kiểm tra đề tài và tài liệu tham khảo. '.repeat(6);

function payload(html: string, selection = '') {
  return {
    html: `<!DOCTYPE html><html><head><title>Trang mẫu</title></head><body>${html}</body></html>`,
    url: 'https://example.com/thong-bao',
    title: 'Trang mẫu',
    selection,
  };
}

describe('parseCapture', () => {
  it('dùng Readability khi tìm thấy bài viết đủ dài', () => {
    const result = parseCapture(
      payload(`<nav>Menu nhiễu</nav><article><h1>Lịch bảo vệ</h1><p>${LONG_PARAGRAPH}</p></article>`),
    );

    expect(result.usedFallback).toBe(false);
    expect(result.document.extractionMethod).toBe('readability');
    expect(result.document.text).toContain('Hội đồng gồm ba giảng viên');
  });

  it('forceRaw bỏ qua Readability và lấy toàn bộ DOM', () => {
    const result = parseCapture(
      payload(`<nav>Menu nhiễu</nav><article><h1>Lịch bảo vệ</h1><p>${LONG_PARAGRAPH}</p></article>`),
      { forceRaw: true },
    );

    expect(result.usedFallback).toBe(true);
    expect(result.document.extractionMethod).toBe('raw_dom');
    expect(result.document.text).toContain('Menu nhiễu');
  });

  it('ưu tiên vùng bôi đen kể cả khi forceRaw', () => {
    const result = parseCapture(payload(`<article><p>${LONG_PARAGRAPH}</p></article>`, 'Đoạn cần lấy'), {
      forceRaw: true,
    });

    expect(result.document.extractionMethod).toBe('selection');
    expect(result.document.text).toBe('Đoạn cần lấy');
  });
});
