// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import fixture from '../fixtures/gmail-like.html?raw';
import { snapshotPage } from '../../src/platform/capture/page-snapshot';
import { parseCapture } from '../../src/platform/capture/parse';

function loadFixture(html: string): void {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  document.head.innerHTML = parsed.head.innerHTML;
  document.body.innerHTML = parsed.body.innerHTML;
}

const LONG_TEXT =
  'Hội đồng kiểm tra đề tài, tài liệu tham khảo và bản demo của sinh viên. '.repeat(8);

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  window.getSelection()?.removeAllRanges();
});

describe('snapshotPage', () => {
  it('chọn main và xoá menu, header, aside, khung ẩn', () => {
    loadFixture(fixture);
    const snapshot = snapshotPage();

    expect(snapshot.root).toBe('main');
    expect(snapshot.title).toContain('Gmail');
    expect(snapshot.html).toContain('Lịch bảo vệ đồ án');
    expect(snapshot.html).toContain('phòng B1-201');
    expect(snapshot.html).not.toContain('Compose');
    expect(snapshot.html).not.toContain('Nhãn: Công việc');
    expect(snapshot.html).not.toContain('Khung quảng cáo ẩn');
    expect(snapshot.html).not.toContain('Bản nháp chưa gửi');
    expect(snapshot.likelyDynamic).toBe(false);
  });

  it('rơi về body đã lọc khi main quá ngắn', () => {
    document.body.innerHTML = `<main><p>Ngắn</p></main><div id="content"><p>${LONG_TEXT}</p></div>`;
    const snapshot = snapshotPage();

    expect(snapshot.root).toBe('body');
    expect(snapshot.html).toContain('Hội đồng kiểm tra đề tài');
    expect(snapshot.textLength).toBeGreaterThan(200);
  });

  it('giữ vùng bôi đen hiện tại', () => {
    document.body.innerHTML = `<main><p>${LONG_TEXT}</p></main>`;
    const paragraph = document.querySelector('main p');
    if (!paragraph) throw new Error('thiếu đoạn văn');
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    window.getSelection()?.addRange(range);

    expect(snapshotPage().selection).toContain('Hội đồng kiểm tra đề tài');
  });

  it('đánh dấu trang SPA chưa render nội dung', () => {
    document.body.innerHTML = '<div id="app"><p>Đang tải…</p></div>';
    expect(snapshotPage().likelyDynamic).toBe(true);

    document.body.innerHTML = `<article><h1>Bài viết</h1><p>${LONG_TEXT}</p></article>`;
    expect(snapshotPage().likelyDynamic).toBe(false);
  });

  it('cắt HTML quá lớn và bật cờ htmlTruncated', () => {
    document.body.innerHTML = `<main><p>${'x'.repeat(4_100_000)}</p></main>`;
    const snapshot = snapshotPage();

    expect(snapshot.htmlTruncated).toBe(true);
    expect(snapshot.html.length).toBe(4_000_000);
  });

  it('HTML sau lọc parse được thành nội dung chính, không còn menu Gmail', () => {
    loadFixture(fixture);
    const result = parseCapture({
      ...snapshotPage(),
      selection: '',
    });

    expect(result.usedFallback).toBe(false);
    expect(result.document.title).toContain('Lịch bảo vệ đồ án');
    expect(result.document.text).toContain('lịch bảo vệ đồ án');
    expect(result.document.text).toContain('hội đồng');
    expect(result.document.text).not.toContain('Inbox');
    expect(result.document.text).not.toContain('Compose');
  });
});
