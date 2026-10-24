import { ACTION_TITLE, PENDING_CAPTURE_KEY, PENDING_OPEN_KEY } from '../../shared/constants';
import type { EventStatus } from '../../shared/contracts';
import type { PendingCapture, PendingOpen } from '../../shared/messages';
import { store } from '../store';
import { captureCurrentPage } from './documents';

const STATUSES: EventStatus[] = ['nhap', 'dang_theo_doi', 'hoan_thanh', 'huy'];

function isStatus(value: string | undefined): value is EventStatus {
  return value !== undefined && (STATUSES as string[]).includes(value);
}

export function clearActionHint(): void {
  void chrome.action.setBadgeText({ text: '' });
  void chrome.action.setTitle({ title: ACTION_TITLE });
}

/** Mở tab đích sau khi người dùng bấm notification kết quả trích xuất. */
export async function consumePendingOpen(): Promise<void> {
  try {
    const bag = await chrome.storage.session.get(PENDING_OPEN_KEY);
    const pending = bag[PENDING_OPEN_KEY] as PendingOpen | undefined;
    if (!pending) return;
    await chrome.storage.session.remove(PENDING_OPEN_KEY);
    store.set((state) => ({
      ...state,
      tab: pending.tab,
      eventForm: { ...state.eventForm, open: false },
      profileForm: { ...state.profileForm, open: false },
      eventFilter: isStatus(pending.status)
        ? { ...state.eventFilter, status: pending.status }
        : state.eventFilter,
      // Notification của job trích xuất mở tab Nháp → vào luôn chế độ duyệt.
      reviewMode: pending.status === 'nhap',
      reviewReturnStatus: 'all',
      selectedDraftIds: [],
      expandedEventId: null,
    }));
    clearActionHint();
  } catch (error) {
    console.warn('[sidepanel] Không mở được tab từ notification', error);
  }
}

let consuming = false;

export async function consumePendingCapture(): Promise<void> {
  if (consuming) return;
  consuming = true;
  try {
    const bag = await chrome.storage.session.get(PENDING_CAPTURE_KEY);
    const pending = bag[PENDING_CAPTURE_KEY] as PendingCapture | undefined;
    if (!pending) return;
    await chrome.storage.session.remove(PENDING_CAPTURE_KEY);
    await captureCurrentPage(
      pending.mode === 'page'
        ? { ignoreSelection: true }
        : { selectionFallback: pending.mode === 'selection' ? pending.selectionText : undefined },
    );
  } catch (error) {
    console.warn('[sidepanel] Không xử lý được yêu cầu quét', error);
  } finally {
    consuming = false;
    clearActionHint();
  }
}
