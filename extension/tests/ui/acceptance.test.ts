// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderApp } from '../../src/ui/render';
import { EMPTY_EVENT_DRAFT, store } from '../../src/ui/store';
import { clearAll } from '../../src/platform/storage/db';
import { parsePastedText } from '../../src/platform/capture/parse';
import { makeEvent } from '../../src/core/events';
import { toInputValue } from '../../src/core/dates';

const NOW = new Date(2026, 9, 21, 8, 0, 0);

beforeEach(async () => {
  await clearAll();
  store.set({
    status: 'ready',
    tab: 'overview',
    documents: [],
    activeDocumentId: null,
    profiles: [],
    events: [],
    eventFilter: { status: 'all', label: 'all', tag: 'all', query: '' },
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
  });
});

describe('cải thiện sau nghiệm thu phiên 2', () => {
  it('không còn header logo/icon quét ở đầu side panel', () => {
    store.set({ tab: 'overview' });
    const html = renderApp(store.get());
    expect(html).not.toContain('class="topbar"');
    expect(html).not.toContain('Lịch trình</h1>');
  });

  it('hiển thị nhãn “đang diễn ra” cho sự kiện trong khoảng bắt đầu–kết thúc', () => {
    // View dùng thời gian thực, nên dựng khoảng đang diễn ra quanh hiện tại.
    const start = toInputValue(new Date(Date.now() - 30 * 60_000));
    const end = toInputValue(new Date(Date.now() + 30 * 60_000));
    const event = makeEvent(
      {
        title: 'Họp nhóm đồ án',
        label: 'công_vụ',
        startValue: start,
        endValue: end,
        durationMinutesInput: null,
        summary: [],
        relatedProfiles: [],
        sources: [],
      },
      NOW,
    );
    store.set({ tab: 'events', events: [event] });

    const html = renderApp(store.get());
    expect(html).toContain('Đang diễn ra');
    expect(html).toContain('event-card--ongoing');
  });

  it('cho phép xoá nội dung đã quét không liên kết với sự kiện', () => {
    const orphan = parsePastedText('Bản nháp', 'Nội dung chưa gắn sự kiện nào.');
    store.set({
      tab: 'capture',
      documents: [orphan],
      activeDocumentId: orphan.documentId,
      events: [],
    });

    const html = renderApp(store.get());
    expect(html).toContain('data-action="delete-unlinked-documents"');
    expect(html).toContain('Nội dung không liên kết');

    const event = makeEvent(
      {
        title: 'Họp nhóm',
        label: 'công_vụ',
        startValue: '2026-11-02T09:00',
        endValue: null,
        durationMinutesInput: 60,
        summary: [],
        relatedProfiles: [],
        sources: [{ documentId: orphan.documentId, kind: 'paste', title: orphan.title }],
      },
      NOW,
    );
    store.set({ events: [event] });
    expect(renderApp(store.get())).not.toContain('data-action="delete-unlinked-documents"');
  });
});
