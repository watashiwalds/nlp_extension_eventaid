import { ACTION_TITLE, EXTRACTION_NOTIFICATION_ID, PENDING_OPEN_KEY } from '../../shared/constants';
import type { ExtractionJob } from '../../shared/contracts';
import type { PendingOpen } from '../../shared/messages';

/** Bước sàng lọc kết luận chắc chắn không có việc nên job dừng trước LLM. */
function skippedByFilter(job: ExtractionJob): boolean {
  return job.filterDecision === 'no_event' && job.savedCount === 0 && job.filterNote === null;
}

function notificationMessage(job: ExtractionJob): string {
  if (skippedByFilter(job)) {
    return 'Bước sàng lọc cho thấy không có nội dung công việc. Mở bảng điều khiển nếu bạn muốn trích xuất toàn bộ.';
  }
  const parts: string[] = [];
  if (job.savedCount > 0) parts.push(`Đã lưu ${job.savedCount} sự kiện nháp.`);
  else parts.push('Không có sự kiện mới để lưu.');
  if (job.duplicateCount > 0) parts.push(`Bỏ qua ${job.duplicateCount} sự kiện trùng.`);
  if (job.truncated) parts.push('Tài liệu dài nên chỉ xử lý phần đầu.');
  return parts.join(' ');
}

function notificationTitle(job: ExtractionJob): string {
  if (skippedByFilter(job)) return 'Không có nội dung công việc';
  return job.savedCount > 0 ? 'Đã trích xuất xong' : 'Không có sự kiện mới';
}

function markPanelFallback(): void {
  void chrome.action.setBadgeBackgroundColor({ color: '#b54708' });
  void chrome.action.setBadgeText({ text: '!' });
  void chrome.action.setTitle({ title: 'Mở bảng điều khiển để xem sự kiện nháp' });
}

async function openEventsTab(): Promise<void> {
  const pending: PendingOpen = {
    tab: 'events',
    status: 'nhap',
    requestedAt: Date.now(),
  };
  void chrome.storage.session.set({ [PENDING_OPEN_KEY]: pending });

  try {
    // Không await trước open(): phải giữ user gesture của cú bấm notification.
    await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  } catch (error) {
    console.warn('[background] Không mở được side panel từ notification', error);
    markPanelFallback();
  }
}

export async function showDoneNotification(job: ExtractionJob): Promise<void> {
  try {
    await chrome.notifications.create(EXTRACTION_NOTIFICATION_ID, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: notificationTitle(job),
      message: notificationMessage(job),
      priority: 2,
      buttons: [
        {
          title: job.savedCount > 0 ? 'Xem sự kiện nháp' : 'Mở bảng điều khiển',
        },
      ],
    });
  } catch (error) {
    console.warn('[background] Không tạo được notification', error);
    markPanelFallback();
  }
}

export async function showFailureNotification(job: ExtractionJob): Promise<void> {
  try {
    await chrome.notifications.create(EXTRACTION_NOTIFICATION_ID, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: 'Trích xuất thất bại',
      message: job.error ?? 'Không trích xuất được sự kiện. Mở bảng điều khiển để thử lại.',
      priority: 2,
      buttons: [{ title: 'Mở bảng điều khiển' }],
    });
  } catch (error) {
    console.warn('[background] Không tạo được notification lỗi', error);
    markPanelFallback();
  }
}

export function registerNotificationHandlers(): void {
  chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId !== EXTRACTION_NOTIFICATION_ID) return;
    void chrome.notifications.clear(notificationId);
    void openEventsTab();
  });

  chrome.notifications.onButtonClicked.addListener((notificationId) => {
    if (notificationId !== EXTRACTION_NOTIFICATION_ID) return;
    void chrome.notifications.clear(notificationId);
    void openEventsTab();
  });

  chrome.notifications.onClosed.addListener((notificationId) => {
    if (notificationId === EXTRACTION_NOTIFICATION_ID) {
      void chrome.action.setTitle({ title: ACTION_TITLE });
    }
  });
}
