// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderApp } from '../../src/ui/render';
import { EMPTY_EVENT_DRAFT, store } from '../../src/ui/store';
import { clearAll, listEvents } from '../../src/platform/storage/db';
import { parsePastedText } from '../../src/platform/capture/parse';
import { makeEvent } from '../../src/core/events';
import { makeProfile } from '../../src/core/profiles';
import { saveEventFromForm } from '../../src/ui/actions';

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
    eventForm: { open: false, editingId: null, sourceDocumentId: null, values: EMPTY_EVENT_DRAFT, errors: {} },
    expandedEventId: null,
    toast: null,
    busy: null,
  });
});

describe('render side panel', () => {
  it('hiển thị màn hình tải dữ liệu', () => {
    store.set({ status: 'loading' });
    expect(renderApp(store.get())).toContain('Đang tải dữ liệu');
  });

  it('hiển thị nội dung đã đọc và nhãn phương thức', () => {
    const document = parsePastedText('Thông báo lịch bảo vệ', 'Hội đồng gồm 3 giảng viên. Phòng B1-201.');
    store.set({ documents: [document], activeDocumentId: document.documentId });

    const html = renderApp(store.get());
    expect(html).toContain('Thông báo lịch bảo vệ');
    expect(html).toContain('Văn bản dán');
    expect(html).toContain('Tạo sự kiện');
    expect(html).toContain('Hội đồng gồm 3 giảng viên');
    expect(html).toContain('Dán văn bản');
    expect(html).toContain('Xem toàn bộ');
  });

  it('luôn có nút dán và nút xem toàn bộ khi đã có nội dung', () => {
    const document = parsePastedText('Thông báo ngắn', 'Nội dung ngắn.');
    store.set({ documents: [document], activeDocumentId: document.documentId, expandedDocument: false });

    const html = renderApp(store.get());
    expect(html).toContain('data-action="open-paste"');
    expect(html).toContain('data-action="toggle-document"');
    expect(html).toContain('Dùng nội dung thô');
  });

  it('giải thích khi nội dung đọc bằng DOM thô', () => {
    const document = { ...parsePastedText('Trang SPA', 'Nội dung thô'), extractionMethod: 'raw_dom' as const };
    store.set({ documents: [document], activeDocumentId: document.documentId });

    const html = renderApp(store.get());
    expect(html).toContain('toàn bộ DOM thay vì Readability');
    expect(html).toContain('data-action="capture-raw"');
  });

  it('hiển thị sự kiện đang mở với đủ 7 trường', () => {
    const profile = makeProfile(
      {
        name: 'Nguyễn Minh An',
        role: 'Sinh viên',
        org: 'ĐH Bách khoa',
        email: '',
        nicknames: [],
        keywords: [],
        notes: '',
      },
      NOW,
    );
    const document = parsePastedText('Lịch bảo vệ', 'Bảo vệ đồ án tại phòng B1-201.');
    const event = makeEvent(
      {
        title: 'Bảo vệ đồ án',
        label: 'công_vụ',
        startValue: '2026-11-02T09:00',
        endValue: '2026-11-02T10:30',
        durationMinutesInput: null,
        summary: ['Hội đồng: 3 giảng viên', 'Địa điểm: phòng B1-201'],
        relatedProfiles: [profile.id],
        sources: [{ documentId: document.documentId, kind: 'paste', title: document.title }],
      },
      NOW,
    );

    store.set({
      tab: 'events',
      documents: [document],
      profiles: [profile],
      events: [event],
      expandedEventId: event.id,
    });

    const html = renderApp(store.get());
    expect(html).toContain('Bảo vệ đồ án');
    expect(html).toContain('Hội đồng: 3 giảng viên');
    expect(html).toContain('Nguyễn Minh An');
    expect(html).toContain('Lịch bảo vệ');
  });

  it('render được tab hồ sơ và cài đặt', () => {
    const profile = makeProfile(
      {
        name: 'Trần Bảo',
        role: 'Kỹ sư',
        org: 'Acme',
        email: 'bao@example.com',
        nicknames: ['Bảo'],
        keywords: ['dự án'],
        notes: '',
      },
      NOW,
    );
    store.set({ tab: 'profiles', profiles: [profile] });
    expect(renderApp(store.get())).toContain('Trần Bảo');

    store.set({ tab: 'settings' });
    const settings = renderApp(store.get());
    expect(settings).toContain('Xuất JSON');
    expect(settings).toContain('Giới hạn của bản demo');
  });

  it('hiển thị lỗi validate khi form sự kiện thiếu tiêu đề', async () => {
    document.body.innerHTML = `<form id="event-form">
      <input name="title" value="">
      <select name="label"><option value="công_vụ" selected>công_vụ</option></select>
      <input name="start" value="">
      <input name="end" value="">
      <input name="duration" value="">
      <textarea name="summary"></textarea>
    </form>`;
    const form = document.querySelector('form');
    if (!(form instanceof HTMLFormElement)) throw new Error('thiếu form');

    store.set({
      tab: 'events',
      eventForm: {
        open: true,
        editingId: null,
        sourceDocumentId: null,
        values: EMPTY_EVENT_DRAFT,
        errors: {},
      },
    });

    await saveEventFromForm(form);
    const state = store.get();
    expect(state.eventForm.errors.title).toBeTruthy();
    expect(state.eventForm.open).toBe(true);
    expect(renderApp(state)).toContain('Chưa lưu được sự kiện');
  });
});

describe('luồng tạo sự kiện', () => {
  it('lưu sự kiện + nguồn trích vào IndexedDB', async () => {
    const profile = makeProfile(
      {
        name: 'Nguyễn Minh An',
        role: '',
        org: '',
        email: '',
        nicknames: [],
        keywords: [],
        notes: '',
      },
      NOW,
    );
    const doc = parsePastedText('Thông báo', 'Họp lớp lúc 9h ngày 2/11 tại B1-201.');

    document.body.innerHTML = `<form id="event-form">
      <input name="title" value="Họp lớp">
      <select name="label"><option value="cá_nhân" selected>cá nhân</option></select>
      <input name="start" value="2026-11-02T09:00">
      <input name="end" value="">
      <input name="duration" value="60">
      <textarea name="summary">Chủ đề: tổng kết học kỳ
Địa điểm: B1-201</textarea>
      <input type="checkbox" name="profileIds" value="${profile.id}" checked>
      <input type="checkbox" name="attachSource" checked>
    </form>`;
    const form = document.querySelector('form');
    if (!(form instanceof HTMLFormElement)) throw new Error('thiếu form');

    store.set({
      tab: 'events',
      documents: [doc],
      activeDocumentId: doc.documentId,
      profiles: [profile],
      eventForm: {
        open: true,
        editingId: null,
        sourceDocumentId: doc.documentId,
        values: EMPTY_EVENT_DRAFT,
        errors: {},
      },
    });

    await saveEventFromForm(form);

    const state = store.get();
    expect(state.events).toHaveLength(1);
    const event = state.events[0];
    expect(event?.title).toBe('Họp lớp');
    expect(event?.label).toBe('cá_nhân');
    expect(event?.durationMinutes).toBe(60);
    expect(event?.relatedProfiles).toEqual([profile.id]);
    expect(event?.sources[0]?.documentId).toBe(doc.documentId);
    expect(event?.status).toBe('nhap');
    expect(state.eventForm.open).toBe(false);

    const stored = await listEvents();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.id).toBe(event?.id);
  });
});
