// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parsePastedText } from '../../src/platform/capture/parse';
import { DEFAULT_FILTER_SETTINGS } from '../../src/platform/storage/filter-settings';
import { DEFAULT_LLM_SETTINGS } from '../../src/platform/storage/settings';
import { renderApp } from '../../src/ui/render';
import { store } from '../../src/ui/store';
import type { ExtractionSummary } from '../../src/ui/store';
import { extractEventsAction } from '../../src/ui/actions/extract';
import { FILTER_FAIL_OPEN_NOTE } from '../../src/shared/constants';
import type { NormalizedDocument } from '../../src/shared/contracts';

const NOW = new Date(2026, 9, 27, 8, 0, 0);

const webDocument: NormalizedDocument = {
  documentId: 'doc_web',
  source: 'web_page',
  title: 'Thông báo lớp',
  text: 'Lớp họp nhóm đồ án lúc 9:00 ngày 2/11/2026 tại phòng B203.',
  sourceUrl: 'https://example.com/thong-bao',
  capturedAt: NOW.toISOString(),
  extractionMethod: 'readability',
  contentHash: 'hash',
  truncated: false,
  charCount: 0,
};

function summary(overrides: Partial<ExtractionSummary> = {}): ExtractionSummary {
  return {
    documentId: webDocument.documentId,
    savedCount: 0,
    filterApplied: true,
    filterDecision: 'no_event',
    filterEvidenceCount: 0,
    filterTotalSentences: 12,
    filterConfidence: 0.91,
    filterLatencyMs: 1_800,
    filterNote: null,
    ...overrides,
  };
}

beforeEach(() => {
  store.set({
    status: 'ready',
    tab: 'capture',
    documents: [webDocument],
    activeDocumentId: webDocument.documentId,
    profiles: [],
    events: [],
    eventFilter: { status: 'all', label: 'all', tag: 'all', query: '' },
    llm: DEFAULT_LLM_SETTINGS,
    contentFilter: DEFAULT_FILTER_SETTINGS,
    filterScreenEnabled: true,
    extraction: null,
    lastExtraction: null,
    toast: null,
    busy: null,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('checkbox và kết luận sàng lọc ở tab Quét nội dung', () => {
  it('hiện checkbox khi chế độ sàng lọc đang bật', () => {
    const html = renderApp(store.get());
    expect(html).toContain('data-action="toggle-filter-screen"');
    expect(html).toContain('Sàng lọc nội dung trước khi trích xuất');
    expect(html).toContain('Chế độ chỉ báo cáo');
  });

  it('ẩn checkbox khi chế độ là off', () => {
    store.set({ contentFilter: { ...DEFAULT_FILTER_SETTINGS, mode: 'off' } });
    expect(renderApp(store.get())).not.toContain('data-action="toggle-filter-screen"');
  });

  it('ẩn checkbox với nguồn văn bản dán / vùng chọn (Q2)', () => {
    const pasted = parsePastedText('Thông báo', 'Nội dung ngắn.');
    store.set({ documents: [pasted], activeDocumentId: pasted.documentId });
    expect(renderApp(store.get())).not.toContain('data-action="toggle-filter-screen"');
  });

  it('no_event: hiện kết luận, độ chắc chắn, thời gian và nút trích xuất toàn bộ', () => {
    store.set({ lastExtraction: summary() });
    const html = renderApp(store.get());

    expect(html).toContain('Sàng lọc:');
    expect(html).toContain('không thấy nội dung công việc');
    expect(html).toContain('chắc chắn 91%');
    expect(html).toContain('đã bỏ qua lần gọi LLM');
    expect(html).toContain('1,8 s');
    expect(html).toContain('data-action="extract-events-all"');
    expect(html).toContain('Trích xuất toàn bộ');
  });

  it('has_event: nêu số câu giao việc và không có nút trích xuất toàn bộ', () => {
    store.set({
      lastExtraction: summary({
        filterDecision: 'has_event',
        filterEvidenceCount: 5,
        filterTotalSentences: 48,
        filterConfidence: 0.88,
        savedCount: 2,
      }),
    });
    const html = renderApp(store.get());

    expect(html).toContain('có nội dung đáng trích');
    expect(html).toContain('5/48 câu giao việc');
    expect(html).toContain('đã trích xuất toàn bộ');
    expect(html).not.toContain('data-action="extract-events-all"');
  });

  it('fail-open: hiện cảnh báo vàng thay vì lỗi', () => {
    store.set({
      lastExtraction: summary({
        savedCount: 2,
        filterApplied: false,
        filterDecision: 'uncertain',
        filterConfidence: null,
        filterNote: `${FILTER_FAIL_OPEN_NOTE} (timeout)`,
      }),
    });
    const html = renderApp(store.get());

    expect(html).toContain('alert--warning');
    expect(html).toContain(FILTER_FAIL_OPEN_NOTE);
    expect(html).not.toContain('data-action="extract-events-all"');
  });

  it('không hiện kết luận của tài liệu khác', () => {
    store.set({ lastExtraction: summary({ documentId: 'doc_khac' }) });
    const html = renderApp(store.get());
    expect(html).not.toContain('Sàng lọc:');
  });
});

describe('gửi chế độ sàng lọc khi bắt đầu trích xuất', () => {
  function stubChrome(): { sendMessage: ReturnType<typeof vi.fn> } {
    const sendMessage = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('chrome', {
      runtime: { sendMessage },
      permissions: { request: vi.fn().mockResolvedValue(true) },
      storage: { session: { get: vi.fn().mockResolvedValue({}) } },
    });
    return { sendMessage };
  }

  it('checkbox bật: không gửi filterRunMode (theo cài đặt đã lưu)', async () => {
    const { sendMessage } = stubChrome();
    await extractEventsAction();

    expect(sendMessage).toHaveBeenCalledWith({
      to: 'background',
      type: 'RUN_EXTRACTION',
      documentId: webDocument.documentId,
    });
  });

  it('checkbox tắt: gửi filterRunMode off', async () => {
    const { sendMessage } = stubChrome();
    store.set({ filterScreenEnabled: false });
    await extractEventsAction();

    expect(sendMessage).toHaveBeenCalledWith({
      to: 'background',
      type: 'RUN_EXTRACTION',
      documentId: webDocument.documentId,
      filterRunMode: 'off',
    });
  });

  it('nút "Trích xuất toàn bộ" luôn gửi filterRunMode off', async () => {
    const { sendMessage } = stubChrome();
    await extractEventsAction('off');

    expect(sendMessage).toHaveBeenCalledWith({
      to: 'background',
      type: 'RUN_EXTRACTION',
      documentId: webDocument.documentId,
      filterRunMode: 'off',
    });
  });
});
