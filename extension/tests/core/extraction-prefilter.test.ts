import { describe, expect, it } from 'vitest';
import {
  aggregateDecision,
  buildFilterWindows,
  failOpenNote,
  filterCharBudget,
  resolveFilterMode,
  summarizeFilter,
} from '../../src/core/extraction/prefilter';
import { mockAnalysis, mockTaskAnalysis } from '../../src/core/extraction/mock-filter';
import type { FilterWindow, WindowAnalysis } from '../../src/core/extraction/filter-types';
import { FILTER_FAIL_OPEN_NOTE } from '../../src/shared/constants';

const SETTINGS = { skipConfidence: 0.85, minSentencesToSkip: 3 };

function makeWindow(index: number): FilterWindow {
  return { index, text: `cửa sổ ${index}`, charStart: index * 100, charEnd: index * 100 + 100 };
}

function ok(window: FilterWindow, analysis = mockAnalysis()): WindowAnalysis {
  return { ok: true, window, analysis };
}

function failed(window: FilterWindow, reason = 'network'): WindowAnalysis {
  return { ok: false, window, reason };
}

describe('buildFilterWindows', () => {
  it('mỗi cửa sổ ≤ windowChars, phủ kín và liền mạch tới effectiveChars', () => {
    const text = 'Câu một ngắn. '.repeat(200);
    const windows = buildFilterWindows(text, { windowChars: 300, effectiveChars: 1_500 });

    expect(windows.length).toBeGreaterThanOrEqual(5);
    expect(windows[0]?.charStart).toBe(0);
    expect(windows.at(-1)?.charEnd).toBe(1_500);
    for (const window of windows) {
      expect(window.text).toBe(text.slice(window.charStart, window.charEnd));
      expect(window.text.length).toBeLessThanOrEqual(300);
      expect(window.index).toBe(windows.indexOf(window));
    }
    for (let i = 1; i < windows.length; i += 1) {
      expect(windows[i]?.charStart).toBe(windows[i - 1]?.charEnd);
    }
  });

  it('không cắt giữa từ khi có khoảng trắng để lùi về', () => {
    const text = Array.from({ length: 400 }, (_, i) => `từ${i}`).join(' ');
    const windows = buildFilterWindows(text, { windowChars: 100 });

    expect(windows.length).toBeGreaterThan(1);
    for (const window of windows.slice(0, -1)) {
      expect(window.text).toMatch(/\s$/);
    }
    expect(windows.at(-1)?.text.endsWith('từ399')).toBe(true);
  });

  it('cắt cứng khi không có ranh giới nào (khối ký tự liền)', () => {
    const windows = buildFilterWindows('a'.repeat(500), { windowChars: 100 });
    expect(windows.map((window) => window.text.length)).toEqual([100, 100, 100, 100, 100]);
  });

  it('tài liệu ngắn trả một cửa sổ; tài liệu rỗng trả danh sách rỗng', () => {
    const single = buildFilterWindows('Một câu ngắn.', { windowChars: 500 });
    expect(single).toHaveLength(1);
    expect(single[0]?.text).toBe('Một câu ngắn.');
    expect(buildFilterWindows('   \n\n  ', { windowChars: 100 })).toEqual([]);
  });

  it('không sàng lọc phần đuôi mà chunkText chắc chắn bỏ', () => {
    const text = 'x'.repeat(1_000);
    const windows = buildFilterWindows(text, { windowChars: 100, effectiveChars: 250 });
    expect(windows.at(-1)?.charEnd).toBe(250);
    expect(windows).toHaveLength(3);
  });
});

describe('filterCharBudget', () => {
  it('lấy min(độ dài tài liệu, chunkChars × maxChunks)', () => {
    expect(filterCharBudget(10_000, 5_000, 4)).toBe(10_000);
    expect(filterCharBudget(200_000, 5_000, 4)).toBe(20_000);
    expect(filterCharBudget(0, 5_000, 4)).toBe(0);
  });
});

describe('aggregateDecision', () => {
  it('không có cửa sổ nào ⇒ uncertain', () => {
    expect(aggregateDecision([], [], SETTINGS)).toBe('uncertain');
  });

  it('một cửa sổ có task là đủ để kết luận has_event', () => {
    const [first, second] = [makeWindow(0), makeWindow(1)];
    const decision = aggregateDecision(
      [first!, second!],
      [ok(first!, mockAnalysis()), ok(second!, mockTaskAnalysis())],
      SETTINGS,
    );
    expect(decision).toBe('has_event');
  });

  it('has_event thắng cả khi có cửa sổ lỗi', () => {
    const [first, second] = [makeWindow(0), makeWindow(1)];
    const decision = aggregateDecision(
      [first!, second!],
      [failed(first!), ok(second!, mockTaskAnalysis())],
      SETTINGS,
    );
    expect(decision).toBe('has_event');
  });

  it('một cửa sổ lỗi ⇒ uncertain (fail-open)', () => {
    const [first, second] = [makeWindow(0), makeWindow(1)];
    const decision = aggregateDecision([first!, second!], [ok(first!), failed(second!)], SETTINGS);
    expect(decision).toBe('uncertain');
  });

  it('tài liệu quá ngắn để kết luận ⇒ uncertain dù rất chắc', () => {
    const window = makeWindow(0);
    const analysis = mockAnalysis({ confidence: 0.99, totalSentences: 2 });
    expect(aggregateDecision([window], [ok(window, analysis)], SETTINGS)).toBe('uncertain');
  });

  it('ngưỡng đúng biên: 0.84 ⇒ uncertain, 0.85 ⇒ no_event', () => {
    const window = makeWindow(0);
    expect(aggregateDecision([window], [ok(window, mockAnalysis({ confidence: 0.84 }))], SETTINGS)).toBe(
      'uncertain',
    );
    expect(aggregateDecision([window], [ok(window, mockAnalysis({ confidence: 0.85 }))], SETTINGS)).toBe(
      'no_event',
    );
  });

  it('nhiều cửa sổ lấy bằng chứng yếu nhất', () => {
    const [first, second] = [makeWindow(0), makeWindow(1)];
    const strong = mockAnalysis({ confidence: 0.9 });
    const decision = (weak: number): string =>
      aggregateDecision([first!, second!], [ok(first!, strong), ok(second!, mockAnalysis({ confidence: weak }))], SETTINGS);

    expect(decision(0.86)).toBe('no_event');
    expect(decision(0.8)).toBe('uncertain');
  });
});

describe('summarizeFilter', () => {
  it('applied chỉ true khi mọi cửa sổ phân tích thành công', () => {
    const [first, second] = [makeWindow(0), makeWindow(1)];
    const complete = summarizeFilter([first!, second!], [ok(first!), ok(second!)], SETTINGS);
    expect(complete.applied).toBe(true);
    expect(complete.windowCount).toBe(2);

    const partial = summarizeFilter([first!, second!], [ok(first!), failed(second!)], SETTINGS);
    expect(partial.applied).toBe(false);
    expect(partial.decision).toBe('uncertain');
    expect(partial.confidence).toBeNull();
  });

  it('cộng dồn câu, bằng chứng và latency; lấy min confidence khi no_event', () => {
    const [first, second] = [makeWindow(0), makeWindow(1)];
    const report = summarizeFilter(
      [first!, second!],
      [
        ok(first!, mockAnalysis({ confidence: 0.92, totalSentences: 20, latencyMs: 400 })),
        ok(
          second!,
          mockTaskAnalysis({ confidence: 0.88, totalSentences: 28, latencyMs: 600 }),
        ),
      ],
      SETTINGS,
    );
    expect(report.decision).toBe('has_event');
    expect(report.evidenceCount).toBe(1);
    expect(report.totalSentences).toBe(48);
    expect(report.latencyMs).toBe(1_000);
    expect(report.confidence).toBe(0.88);
  });

  it('no_event lấy confidence thấp nhất; has_event lấy confidence cao nhất của cửa sổ có task', () => {
    const [first, second] = [makeWindow(0), makeWindow(1)];
    const noEvent = summarizeFilter(
      [first!, second!],
      [ok(first!, mockAnalysis({ confidence: 0.95 })), ok(second!, mockAnalysis({ confidence: 0.9 }))],
      SETTINGS,
    );
    expect(noEvent.decision).toBe('no_event');
    expect(noEvent.confidence).toBe(0.9);

    const hasEvent = summarizeFilter(
      [first!, second!],
      [
        ok(first!, mockTaskAnalysis({ confidence: 0.71 })),
        ok(second!, mockAnalysis({ confidence: 0.99 })),
      ],
      SETTINGS,
    );
    expect(hasEvent.decision).toBe('has_event');
    expect(hasEvent.confidence).toBe(0.71);
  });

  it('văn bản rỗng: uncertain, không áp dụng, không confidence', () => {
    const report = summarizeFilter([], [], SETTINGS);
    expect(report).toEqual({
      applied: false,
      decision: 'uncertain',
      evidenceCount: 0,
      totalSentences: 0,
      confidence: null,
      latencyMs: 0,
      windowCount: 0,
      note: null,
    });
  });
});

describe('resolveFilterMode', () => {
  it('off do lần chạy chỉ định thắng mọi cấu hình', () => {
    expect(resolveFilterMode('screen', 'off', 'web_page')).toBe('off');
    expect(resolveFilterMode('report', 'off', 'web_page')).toBe('off');
  });

  it('vùng chọn và văn bản dán luôn bỏ qua, kể cả khi force', () => {
    expect(resolveFilterMode('screen', 'force', 'selection')).toBe('off');
    expect(resolveFilterMode('screen', 'force', 'paste')).toBe('off');
    expect(resolveFilterMode('screen', undefined, 'selection')).toBe('off');
  });

  it('force chạy screen; auto/không có theo cài đặt', () => {
    expect(resolveFilterMode('off', 'force', 'web_page')).toBe('screen');
    expect(resolveFilterMode('report', 'auto', 'web_page')).toBe('report');
    expect(resolveFilterMode('screen', undefined, 'web_page')).toBe('screen');
    expect(resolveFilterMode('off', undefined, 'web_page')).toBe('off');
  });
});

describe('failOpenNote', () => {
  it('trả ghi chú chuẩn, thêm lý do khi có', () => {
    expect(failOpenNote()).toBe(FILTER_FAIL_OPEN_NOTE);
    expect(failOpenNote('timeout')).toContain(FILTER_FAIL_OPEN_NOTE);
    expect(failOpenNote('timeout')).toContain('timeout');
  });
});
