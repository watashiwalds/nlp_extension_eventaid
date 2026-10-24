// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../src/ui/render';
import { EMPTY_EVENT_DRAFT, store } from '../../src/ui/store';
import { clearAll, listEvents } from '../../src/platform/storage/db';
import { makeEvent } from '../../src/core/events';
import type { EventInput } from '../../src/core/events';
import { bulkApproveDrafts, deleteSelectedDrafts, syncReviewSelectionUi } from '../../src/ui/actions';
import { enterReviewMode, exitReviewMode } from '../../src/ui/actions/review';
import { applyFilterFromForm } from '../../src/ui/actions/data';
import type { ExtractionMeta } from '../../src/shared/contracts';

const NOW = new Date(2026, 9, 22, 8, 0, 0);

function meta(confidence: number): ExtractionMeta {
  return {
    runId: 'run-1',
    documentId: 'doc-1',
    provider: 'mock',
    model: 'test',
    promptVersion: 'v4',
    chunkIndex: 0,
    chunkCount: 1,
    confidence,
    latencyMs: 100,
  };
}

function llmDraft(title: string, confidence: number, patch: Partial<EventInput> = {}) {
  return makeEvent(
    {
      title,
      label: 'công_vụ',
      startValue: '2026-11-02T09:00',
      endValue: null,
      durationMinutesInput: null,
      summary: [],
      relatedProfiles: [],
      sources: [],
      ...patch,
      origin: 'llm',
      extractionMeta: meta(confidence),
    },
    NOW,
  );
}

function reset(events: ReturnType<typeof llmDraft>[] = [], patch: Record<string, unknown> = {}) {
  store.set({
    status: 'ready',
    tab: 'events',
    documents: [],
    activeDocumentId: null,
    profiles: [],
    events,
    eventFilter: { status: 'all', label: 'all', tag: 'all', query: '' },
    reviewMode: false,
    reviewReturnStatus: 'all',
    selectedDraftIds: [],
    dismissedSuggestionKeys: [],
    eventForm: {
      open: false,
      editingId: null,
      sourceDocumentId: null,
      values: EMPTY_EVENT_DRAFT,
      errors: {},
    },
    expandedEventId: null,
    toast: null,
    busy: null,
    ...patch,
  });
}

beforeEach(async () => {
  await clearAll();
  document.body.innerHTML = '';
  reset();
});

describe('badge nguồn và độ tin cậy', () => {
  it('nháp llm có badge Máy đề xuất + mức tin cậy, có nút Duyệt nháp', () => {
    reset([llmDraft('Họp nhóm đồ án', 0.42)]);
    const html = renderApp(store.get());

    expect(html).toContain('Máy đề xuất');
    expect(html).toContain('Máy tự báo: Thấp');
    expect(html).toContain('Duyệt nháp (1)');
    expect(html).not.toContain('%');
  });

  it('sự kiện nhập tay không có badge/độ tin cậy', () => {
    const manual = makeEvent(
      {
        title: 'Đi xem phim',
        label: 'giải_trí',
        startValue: '2026-11-03T19:00',
        endValue: null,
        durationMinutesInput: null,
        summary: [],
        relatedProfiles: [],
        sources: [],
      },
      NOW,
    );
    reset([manual]);
    const html = renderApp(store.get());
    expect(html).not.toContain('Máy đề xuất');
    expect(html).not.toContain('Máy tự báo');
  });

  it('chi tiết hiện Nguồn tạo và quote dài không bị cắt im lặng', () => {
    const quote = 'Nội dung rất dài '.repeat(30);
    const draft = llmDraft('Họp nhóm', 0.9, {
      sources: [{ documentId: 'doc-1', kind: 'web_page', title: 'Nguồn', url: 'https://example.com/a', quote }],
    });
    reset([draft], { expandedEventId: draft.id });
    const html = renderApp(store.get());
    expect(html).toContain('Nguồn tạo');
    expect(html).toContain('Xem trích dẫn đầy đủ');
    expect(html).toContain('Mở nguồn');
  });
});

describe('chế độ duyệt nháp', () => {
  it('hiện thanh duyệt, checkbox và nút duyệt/xoá', () => {
    const a = llmDraft('Họp nhóm', 0.9);
    const b = llmDraft('Bảo vệ đồ án', 0.3);
    reset([a, b], { reviewMode: true, eventFilter: { status: 'nhap', label: 'all', tag: 'all', query: '' } });

    const html = renderApp(store.get());
    expect(html).toContain('data-action="select-all-drafts"');
    expect(html).toContain('data-action="toggle-draft"');
    expect(html).toContain('Duyệt đã chọn (0)');
    expect(html).toContain('Xoá nháp đã chọn');
    expect(html).toContain('Quay lại danh sách');
    expect(html).toContain('value="nhap" selected');
    expect(html).toContain('disabled');
  });

  it('chọn một phần → checkbox tổng indeterminate', () => {
    const a = llmDraft('Họp nhóm', 0.9);
    const b = llmDraft('Bảo vệ đồ án', 0.3);
    reset([a, b], {
      reviewMode: true,
      eventFilter: { status: 'nhap', label: 'all', tag: 'all', query: '' },
      selectedDraftIds: [a.id],
    });

    document.body.innerHTML = renderApp(store.get());
    syncReviewSelectionUi(document.body);
    const box = document.querySelector<HTMLInputElement>('#select-all-drafts');
    expect(box?.indeterminate).toBe(true);
    expect(box?.checked).toBe(false);
  });

  it('vào chế độ ghi nhớ trạng thái, bộ lọc không ghi đè Nháp, thoát thì khôi phục', () => {
    reset([llmDraft('Họp nhóm', 0.9)], {
      eventFilter: { status: 'hoan_thanh', label: 'all', tag: 'all', query: '' },
    });

    enterReviewMode();
    expect(store.get().eventFilter.status).toBe('nhap');
    expect(store.get().reviewReturnStatus).toBe('hoan_thanh');

    document.body.innerHTML = `<form id="filter-form">
      <select name="status"><option value="" selected></option></select>
      <select name="label"><option value="all" selected>all</option></select>
      <select name="tag"><option value="all" selected>all</option></select>
      <input name="query" value="">
    </form>`;
    const form = document.querySelector('form');
    if (!(form instanceof HTMLFormElement)) throw new Error('thiếu form');
    applyFilterFromForm(form);
    expect(store.get().eventFilter.status).toBe('nhap');

    exitReviewMode();
    expect(store.get().eventFilter.status).toBe('hoan_thanh');
    expect(store.get().reviewMode).toBe(false);
  });
});

describe('duyệt và xoá hàng loạt', () => {
  it('chỉ duyệt mục được chọn, giữ nguyên bản còn lại', async () => {
    const a = llmDraft('Họp nhóm', 0.9);
    const b = llmDraft('Bảo vệ đồ án', 0.3);
    reset([a, b], {
      reviewMode: true,
      eventFilter: { status: 'nhap', label: 'all', tag: 'all', query: '' },
      selectedDraftIds: [a.id],
    });

    await bulkApproveDrafts();

    const byId = new Map(store.get().events.map((event) => [event.id, event]));
    expect(byId.get(a.id)?.status).toBe('dang_theo_doi');
    expect(byId.get(b.id)?.status).toBe('nhap');
    expect(byId.get(a.id)?.origin).toBe('llm');
    expect(byId.get(a.id)?.extractionMeta?.confidence).toBe(0.9);
    expect(store.get().selectedDraftIds).toEqual([]);

    const stored = await listEvents();
    expect(stored.find((event) => event.id === a.id)?.status).toBe('dang_theo_doi');
  });

  it('nháp chỉ có ngày: huỷ xác nhận thì không lưu', async () => {
    const dateOnly = llmDraft('Hạn nhận vé', 0.9, { startValue: null, startDate: '2026-11-20' });
    reset([dateOnly], {
      reviewMode: true,
      eventFilter: { status: 'nhap', label: 'all', tag: 'all', query: '' },
      selectedDraftIds: [dateOnly.id],
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await bulkApproveDrafts();

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('chưa xếp được nhắc việc'));
    expect(store.get().events[0]?.status).toBe('nhap');
    expect(await listEvents()).toHaveLength(0);
    confirmSpy.mockRestore();
  });

  it('xoá nháp đã chọn có xác nhận và chỉ xoá nháp', async () => {
    const draft = llmDraft('Họp nhóm', 0.9);
    const tracked = { ...llmDraft('Đã theo dõi', 0.9), status: 'dang_theo_doi' as const };
    reset([draft, tracked], {
      reviewMode: true,
      eventFilter: { status: 'nhap', label: 'all', tag: 'all', query: '' },
      selectedDraftIds: [draft.id],
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await deleteSelectedDrafts();

    expect(store.get().events.map((event) => event.id)).toEqual([tracked.id]);
    confirmSpy.mockRestore();
  });
});

describe('gợi ý trùng trên UI', () => {
  it('hiện chip Có thể trùng cho nháp paraphrase', () => {
    const quote = 'Nhóm đồ án họp trao đổi tiến độ lúc 9 giờ tại phòng B1-201.';
    const a = llmDraft('Họp nhóm đồ án', 0.9, {
      sources: [{ documentId: 'doc-1', kind: 'web_page', title: 'Nguồn', quote }],
    });
    const b = llmDraft('Trao đổi tiến độ đồ án', 0.9, {
      startValue: '2026-11-02T14:00',
      sources: [{ documentId: 'doc-1', kind: 'web_page', title: 'Nguồn', quote }],
    });
    reset([a, b], {
      reviewMode: true,
      eventFilter: { status: 'nhap', label: 'all', tag: 'all', query: '' },
    });

    const html = renderApp(store.get());
    expect(html).toContain('Có thể trùng');
  });
});
