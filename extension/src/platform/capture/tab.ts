import type { CapturePayload } from '../../shared/messages';
import { snapshotPage } from './page-snapshot';

/**
 * Đọc nội dung chính của tab đang mở bằng `scripting.executeScript`.
 * Chỉ chạy khi người dùng chủ động bấm nút (activeTab); không đọc nền.
 * `snapshotPage` đã lọc menu/khung ẩn; Readability chạy trong side panel — xem `parse.ts`.
 */
export async function captureTab(tabId: number): Promise<CapturePayload> {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: false },
    func: snapshotPage,
  });

  const payload = results[0]?.result;
  if (!payload) {
    throw new Error('Không đọc được trang này. Hãy thử tải lại trang rồi quét lại.');
  }
  return payload;
}

export async function activeTabId(): Promise<number | null> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab?.id ?? null;
}

export async function openSidePanel(tabId?: number): Promise<void> {
  if (tabId !== undefined) {
    await chrome.sidePanel.open({ tabId });
    return;
  }
  const id = await activeTabId();
  if (id === null) throw new Error('Không tìm thấy tab đang mở');
  await chrome.sidePanel.open({ tabId: id });
}
