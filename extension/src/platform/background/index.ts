/**
 * Service worker: cấu hình side panel + menu chuột phải cho vùng bôi đen.
 * Demo không có pipeline nền — việc đọc trang do side panel thực hiện khi người dùng bấm.
 */
import { ACTION_TITLE, PENDING_CAPTURE_KEY, SELECTION_MENU_ID } from '../../shared/constants';
import type { PendingCapture } from '../../shared/messages';

function registerContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: SELECTION_MENU_ID,
      title: 'Quét sự kiện từ vùng chọn',
      contexts: ['selection'],
    });
  });
}

/** Không mở được panel từ menu: nhắc bằng badge, không thêm permission notifications. */
function markPendingFallback(): void {
  void chrome.action.setBadgeBackgroundColor({ color: '#b54708' });
  void chrome.action.setBadgeText({ text: '!' });
  void chrome.action.setTitle({ title: 'Mở bảng điều khiển để quét vùng chọn' });
}

function clearActionHint(): void {
  void chrome.action.setBadgeText({ text: '' });
  void chrome.action.setTitle({ title: ACTION_TITLE });
}

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch((error: unknown) => {
    console.warn('[background] Không đặt được hành vi side panel', error);
  });
  void chrome.storage.session.remove(PENDING_CAPTURE_KEY);
  registerContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  void chrome.storage.session.remove(PENDING_CAPTURE_KEY);
  registerContextMenus();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== SELECTION_MENU_ID) return;
  const tabId = tab?.id;
  if (tabId === undefined) return;

  const pending: PendingCapture = {
    mode: 'selection',
    selectionText: info.selectionText ?? '',
    requestedAt: Date.now(),
  };

  // Ghi cờ và gọi open() ngay trong cùng user gesture; không await storage trước open().
  void chrome.storage.session.set({ [PENDING_CAPTURE_KEY]: pending });
  chrome.sidePanel
    .open({ tabId })
    .then(() => {
      clearActionHint();
    })
    .catch((error: unknown) => {
      console.warn('[background] Không mở được side panel từ context menu', error);
      markPendingFallback();
    });
});
