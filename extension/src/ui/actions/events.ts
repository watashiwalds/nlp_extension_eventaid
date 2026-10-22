import type { EventStatus, SourceRef } from '../../shared/contracts';
import { buildEventFromForm } from '../../core/forms';
import { joinDateTimeLocal, splitDateTimeLocal } from '../../core/dates';
import { setEventStatus } from '../../core/events';
import { deleteEvent, saveEvent } from '../../platform/storage/db';
import { EMPTY_EVENT_DRAFT, editingEvent, showToast, store } from '../store';
import type { EventDraft } from '../store';
import { focusFirstError, messageOf, sourceFromDocument, valueOf } from './shared';

function splitDraftDates(start: string, end: string): Pick<EventDraft, 'startDate' | 'startTime' | 'endDate' | 'endTime'> {
  const startParts = splitDateTimeLocal(start);
  const endParts = splitDateTimeLocal(end);
  return {
    startDate: startParts.date,
    startTime: startParts.time,
    endDate: endParts.date,
    endTime: endParts.time,
  };
}

export function openEventForm(
  options: { eventId?: string; sourceDocumentId?: string | null } = {},
): void {
  const state = store.get();
  const event = options.eventId ? state.events.find((item) => item.id === options.eventId) ?? null : null;
  const document = options.sourceDocumentId
    ? state.documents.find((item) => item.documentId === options.sourceDocumentId) ?? null
    : null;

  const values: EventDraft = event
    ? {
        title: event.title,
        label: event.label,
        ...splitDraftDates(event.start.value ?? '', event.end?.value ?? ''),
        duration: event.end?.value ? '' : event.durationMinutes ? String(event.durationMinutes) : '',
        summary: event.summary.join('\n'),
        profileIds: [...event.relatedProfiles],
        attachSource: false,
      }
    : { ...EMPTY_EVENT_DRAFT, attachSource: Boolean(document) };

  store.set({
    tab: 'events',
    expandedEventId: null,
    profileForm: { ...state.profileForm, open: false },
    eventForm: {
      open: true,
      editingId: event?.id ?? null,
      sourceDocumentId: document?.documentId ?? null,
      values,
      errors: {},
    },
  });
}

export function closeEventForm(): void {
  store.set((state) => ({
    ...state,
    eventForm: {
      open: false,
      editingId: null,
      sourceDocumentId: null,
      values: EMPTY_EVENT_DRAFT,
      errors: {},
    },
  }));
}

export async function saveEventFromForm(form: HTMLFormElement): Promise<void> {
  const state = store.get();
  const formData = new FormData(form);
  const attachInput = form.elements.namedItem('attachSource');
  const start = joinDateTimeLocal(valueOf(form, 'startDate'), valueOf(form, 'startTime'));
  const end = joinDateTimeLocal(valueOf(form, 'endDate'), valueOf(form, 'endTime'));
  const draft: EventDraft = {
    title: valueOf(form, 'title'),
    label: valueOf(form, 'label'),
    startDate: valueOf(form, 'startDate'),
    startTime: valueOf(form, 'startTime'),
    endDate: valueOf(form, 'endDate'),
    endTime: valueOf(form, 'endTime'),
    duration: valueOf(form, 'duration'),
    summary: valueOf(form, 'summary'),
    profileIds: formData.getAll('profileIds').map(String),
    attachSource: attachInput instanceof HTMLInputElement ? attachInput.checked : false,
  };

  const dateErrors: Record<string, string> = {};
  if (start.error) dateErrors.start = start.error;
  if (end.error) dateErrors.end = end.error;
  if (Object.keys(dateErrors).length > 0) {
    store.set((current) => ({
      ...current,
      eventForm: { ...current.eventForm, values: draft, errors: dateErrors },
    }));
    focusFirstError('event-form');
    showToast('error', 'Kiểm tra lại ngày và giờ.');
    return;
  }

  const editing = editingEvent(state);
  const document = state.eventForm.sourceDocumentId
    ? state.documents.find((item) => item.documentId === state.eventForm.sourceDocumentId) ?? null
    : null;

  const sources: SourceRef[] = editing ? [...editing.sources] : [];
  if (document && draft.attachSource && !sources.some((item) => item.documentId === document.documentId)) {
    sources.push(sourceFromDocument(document));
  }

  const result = buildEventFromForm(
    {
      title: draft.title,
      label: draft.label,
      start: start.value,
      end: end.value,
      duration: draft.duration,
      summary: draft.summary,
      profileIds: draft.profileIds,
      sources,
    },
    editing,
  );

  if (!result.event) {
    store.set((current) => ({
      ...current,
      eventForm: { ...current.eventForm, values: draft, errors: result.errors },
    }));
    focusFirstError('event-form');
    showToast('error', 'Kiểm tra lại các trường được đánh dấu.');
    return;
  }

  const event = result.event;
  store.set({ busy: editing ? 'Đang lưu thay đổi…' : 'Đang tạo sự kiện…' });
  try {
    await saveEvent(event);
    const events = editing
      ? store.get().events.map((item) => (item.id === event.id ? event : item))
      : [event, ...store.get().events];
    store.set((current) => ({
      ...current,
      events,
      expandedEventId: event.id,
      eventForm: {
        open: false,
        editingId: null,
        sourceDocumentId: null,
        values: EMPTY_EVENT_DRAFT,
        errors: {},
      },
    }));
    showToast('success', editing ? 'Đã lưu thay đổi.' : 'Đã tạo sự kiện ở trạng thái Nháp.');
  } catch (error) {
    showToast('error', messageOf(error));
  } finally {
    store.set({ busy: null });
  }
}

const STATUS_LABEL: Record<EventStatus, string> = {
  nhap: 'Nháp',
  dang_theo_doi: 'Đang theo dõi',
  hoan_thanh: 'Hoàn thành',
  huy: 'Đã huỷ',
};

export function deleteEventAction(id: string): void {
  const event = store.get().events.find((item) => item.id === id);
  if (!event) return;
  if (!window.confirm(`Xoá sự kiện “${event.title}”?`)) return;
  void (async () => {
    try {
      await deleteEvent(id);
      store.set((current) => ({
        ...current,
        events: current.events.filter((item) => item.id !== id),
        expandedEventId: current.expandedEventId === id ? null : current.expandedEventId,
      }));
      showToast('success', 'Đã xoá sự kiện.');
    } catch (error) {
      showToast('error', messageOf(error));
    }
  })();
}

export function changeStatusAction(id: string, status: EventStatus): void {
  const current = store.get().events.find((item) => item.id === id);
  if (!current) return;
  const next = setEventStatus(current, status);
  if (next === current) return;
  void (async () => {
    try {
      await saveEvent(next);
      store.set((state) => ({
        ...state,
        events: state.events.map((item) => (item.id === id ? next : item)),
      }));
      showToast('success', `Đã chuyển sang trạng thái “${STATUS_LABEL[next.status]}”.`);
    } catch (error) {
      showToast('error', messageOf(error));
    }
  })();
}

export function toggleEventAction(id: string): void {
  store.set((state) => ({
    ...state,
    expandedEventId: state.expandedEventId === id ? null : id,
  }));
}
