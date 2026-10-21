/**
 * Service worker: chỉ giữ cấu hình mặc định của extension.
 * Demo không có pipeline nền — việc đọc trang do side panel thực hiện khi người dùng bấm.
 */
import { PENDING_CAPTURE_KEY } from '../../shared/constants';

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch((error: unknown) => {
    console.warn('[background] Không đặt được hành vi side panel', error);
  });
  void chrome.storage.session.remove(PENDING_CAPTURE_KEY);
});

chrome.runtime.onStartup.addListener(() => {
  void chrome.storage.session.remove(PENDING_CAPTURE_KEY);
});
