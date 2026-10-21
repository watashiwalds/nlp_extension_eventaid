import type { CapturePayload } from '../../shared/messages';

const MAX_HTML_CHARS = 4_000_000;

/**
 * Đọc HTML thô của tab đang mở bằng `scripting.executeScript`.
 * Chỉ chạy khi người dùng chủ động bấm nút (activeTab); không đọc nền.
 * Readability chạy ở context có DOM (side panel) — xem `parse.ts`.
 */
export async function captureTab(tabId: number): Promise<CapturePayload> {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: false },
    func: () => ({
      html: `<!DOCTYPE html>\n${document.documentElement.outerHTML}`,
      url: location.href,
      title: document.title,
      selection: window.getSelection()?.toString() ?? '',
    }),
  });

  const payload = results[0]?.result;
  if (!payload) {
    throw new Error('Không đọc được trang này. Hãy thử tải lại trang rồi quét lại.');
  }
  if (payload.html.length > MAX_HTML_CHARS) {
    throw new Error('Trang quá lớn để đọc trong demo. Hãy bôi đen phần cần thiết rồi quét lại.');
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
