import type { Event } from '../../shared/contracts';
import { filterEvents, setEventStatus } from '../../core/events';
import { draftTimeWarning, sortDraftsForReview } from '../../core/event-review';
import { duplicateSuggestionKey } from '../../core/extraction/similar';
import { deleteEvent, saveEvent } from '../../platform/storage/db';
import { showToast, store } from '../store';
import type { AppState } from '../store';

/** Nháp đang hiển thị theo bộ lọc hiện tại, xếp theo thứ tự duyệt. */
export function visibleDrafts(state: AppState = store.get()): Event[] {
  return sortDraftsForReview(filterEvents(state.events, state.eventFilter)).filter(
    (event) => event.status === 'nhap',
  );
}

function selectedVisibleDrafts(state: AppState = store.get()): Event[] {
  return visibleDrafts(state).filter((event) => state.selectedDraftIds.includes(event.id));
}

export function enterReviewMode(): void {
  const state = store.get();
  store.set({
    reviewMode: true,
    reviewReturnStatus: state.reviewMode ? state.reviewReturnStatus : state.eventFilter.status,
    eventFilter: { ...state.eventFilter, status: 'nhap' },
    selectedDraftIds: [],
    expandedEventId: null,
  });
}

export function exitReviewMode(): void {
  const state = store.get();
  if (!state.reviewMode) return;
  store.set({
    reviewMode: false,
    eventFilter: { ...state.eventFilter, status: state.reviewReturnStatus },
    selectedDraftIds: [],
    expandedEventId: null,
  });
}

export function toggleDraftSelection(id: string): void {
  const state = store.get();
  if (!state.reviewMode) return;
  if (!visibleDrafts(state).some((event) => event.id === id)) return;
  const selected = state.selectedDraftIds.includes(id);
  store.set({
    selectedDraftIds: selected
      ? state.selectedDraftIds.filter((item) => item !== id)
      : [...state.selectedDraftIds, id],
  });
}

/** `checked` là trạng thái checkbox tổng sau cú bấm: bật = chọn tất cả mục đang hiển thị. */
export function selectAllVisibleDrafts(checked: boolean): void {
  const state = store.get();
  const visibleIds = visibleDrafts(state).map((event) => event.id);
  if (checked) {
    store.set({ selectedDraftIds: [...new Set([...state.selectedDraftIds, ...visibleIds])] });
  } else {
    const visibleSet = new Set(visibleIds);
    store.set({ selectedDraftIds: state.selectedDraftIds.filter((id) => !visibleSet.has(id)) });
  }
}

export function clearDraftSelection(): void {
  store.set({ selectedDraftIds: [] });
}

function timeWarningConfirm(targets: Event[]): boolean {
  const warning = draftTimeWarning(targets);
  if (warning.total === 0) return true;
  const parts: string[] = [];
  if (warning.dateOnly > 0) parts.push(`${warning.dateOnly} sự kiện chỉ có ngày, chưa có giờ`);
  if (warning.noTime > 0) parts.push(`${warning.noTime} sự kiện chưa có thời điểm`);
  return window.confirm(
    `${parts.join('; ')}. Những sự kiện này sẽ chưa xếp được nhắc việc cho tới khi bạn điền giờ bắt đầu. Vẫn duyệt?`,
  );
}

export async function bulkApproveDrafts(): Promise<void> {
  const state = store.get();
  const targets = selectedVisibleDrafts(state);
  if (targets.length === 0) return;
  if (!timeWarningConfirm(targets)) return;

  const approved = targets.map((event) => setEventStatus(event, 'dang_theo_doi'));
  const results = await Promise.allSettled(approved.map((event) => saveEvent(event)));
  const saved = approved.filter((_, index) => results[index]?.status === 'fulfilled');
  const failedCount = approved.length - saved.length;
  const savedIds = new Set(saved.map((event) => event.id));

  store.set((current) => ({
    ...current,
    events: current.events.map((event) => saved.find((item) => item.id === event.id) ?? event),
    selectedDraftIds: current.selectedDraftIds.filter((id) => !savedIds.has(id)),
    expandedEventId: savedIds.has(current.expandedEventId ?? '') ? null : current.expandedEventId,
  }));

  if (failedCount === 0) {
    showToast('success', `Đã lưu ${saved.length} sự kiện vào lịch của bạn.`);
  } else {
    showToast(
      'error',
      `Đã lưu ${saved.length}/${approved.length} sự kiện vào lịch của bạn. Chưa lưu được ${failedCount} mục; chúng vẫn ở Nháp và được giữ trong lựa chọn.`,
    );
  }
}

export async function deleteSelectedDrafts(): Promise<void> {
  const state = store.get();
  const targets = selectedVisibleDrafts(state);
  if (targets.length === 0) return;

  const titles = targets.slice(0, 3).map((event) => `“${event.title}”`).join(', ');
  const more = targets.length > 3 ? ` và ${targets.length - 3} mục khác` : '';
  if (
    !window.confirm(
      `Xoá ${targets.length} sự kiện nháp (${titles}${more})? Thao tác này không thể hoàn tác.`,
    )
  ) {
    return;
  }

  const results = await Promise.allSettled(targets.map((event) => deleteEvent(event.id)));
  const deleted = targets.filter((_, index) => results[index]?.status === 'fulfilled');
  const failedCount = targets.length - deleted.length;
  const deletedIds = new Set(deleted.map((event) => event.id));

  store.set((current) => ({
    ...current,
    events: current.events.filter((event) => !deletedIds.has(event.id)),
    selectedDraftIds: current.selectedDraftIds.filter((id) => !deletedIds.has(id)),
    expandedEventId: deletedIds.has(current.expandedEventId ?? '') ? null : current.expandedEventId,
  }));

  if (failedCount === 0) {
    showToast('success', `Đã xoá ${deleted.length} nháp.`);
  } else {
    showToast(
      'error',
      `Đã xoá ${deleted.length}/${targets.length} nháp. Chưa xoá được ${failedCount} mục; chúng vẫn ở Nháp.`,
    );
  }
}

export function keepBothDuplicates(id: string, otherId: string): void {
  if (!id || !otherId) return;
  const key = duplicateSuggestionKey(id, otherId);
  const state = store.get();
  if (state.dismissedSuggestionKeys.includes(key)) return;
  store.set({ dismissedSuggestionKeys: [...state.dismissedSuggestionKeys, key] });
}

function scrollToEvent(id: string): void {
  const element = document.getElementById(`event-${id}`);
  if (element) element.scrollIntoView({ block: 'center' });
}

/** Mở bản đối chiếu: mở rộng + cuộn tới, hoặc bỏ bộ lọc để bản đó hiện ra. */
export function openDuplicateEvent(id: string): void {
  const state = store.get();
  const target = state.events.find((event) => event.id === id);
  if (!target) return;

  const visible = filterEvents(state.events, state.eventFilter).some(
    (event) => event.id === id && (!state.reviewMode || event.status === 'nhap'),
  );

  if (visible) {
    store.set({ expandedEventId: id });
  } else {
    store.set({
      reviewMode: false,
      selectedDraftIds: [],
      eventFilter: { status: 'all', label: 'all', tag: 'all', query: '' },
      expandedEventId: id,
    });
  }
  scrollToEvent(id);
}

/** Gán `indeterminate` cho checkbox tổng sau mỗi lần render bằng innerHTML. */
export function syncReviewSelectionUi(root: ParentNode): void {
  const box = root.querySelector<HTMLInputElement>('#select-all-drafts');
  if (!box) return;
  const state = store.get();
  if (!state.reviewMode) return;
  const visible = visibleDrafts(state);
  const selected = visible.filter((event) => state.selectedDraftIds.includes(event.id)).length;
  box.indeterminate = selected > 0 && selected < visible.length;
}
