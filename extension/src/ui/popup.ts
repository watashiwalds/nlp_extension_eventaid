import { PENDING_CAPTURE_KEY } from '../shared/constants';
import { openSidePanel } from '../platform/capture/tab';
import { listDocuments, listEvents, listProfiles } from '../platform/storage/db';

const statusEl = document.getElementById('popup-status');
const countsEl = document.getElementById('popup-counts');
const scanButton = document.getElementById('scan');
const panelButton = document.getElementById('open-panel');

/** Tab đang mở, lấy sẵn lúc popup khởi động để giữ user gesture khi gọi sidePanel.open. */
let currentTab: chrome.tabs.Tab | null = null;

function setStatus(text: string, tone: 'info' | 'warning' = 'info'): void {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.dataset.tone = tone;
}

async function activeTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

function isScannable(tab: chrome.tabs.Tab | null): boolean {
  if (!tab?.url) return false;
  return /^https?:/i.test(tab.url);
}

async function refresh(): Promise<void> {
  const tab = await activeTab();
  currentTab = tab;

  if (!isScannable(tab)) {
    setStatus('Tab này không đọc được (trang hệ thống của Chrome). Hãy mở một trang web.', 'warning');
    if (scanButton instanceof HTMLButtonElement) scanButton.disabled = true;
  } else {
    setStatus(tab?.title ? `Tab hiện tại: ${tab.title}` : 'Sẵn sàng đọc tab đang mở.');
    if (scanButton instanceof HTMLButtonElement) scanButton.disabled = false;
  }

  try {
    const [documents, profiles, events] = await Promise.all([listDocuments(), listProfiles(), listEvents()]);
    if (countsEl) {
      countsEl.textContent = `${events.length} sự kiện · ${profiles.length} hồ sơ · ${documents.length} nội dung đã đọc`;
    }
  } catch {
    if (countsEl) countsEl.textContent = 'Chưa đọc được dữ liệu cục bộ';
  }
}

async function startCapture(): Promise<void> {
  const tabId = currentTab?.id ?? (await activeTab())?.id;
  if (!tabId) {
    setStatus('Không tìm thấy tab đang hoạt động.', 'warning');
    return;
  }

  // Ghi cờ trước (không await) để side panel nhận việc ngay khi mở, rồi mới mở panel
  // để không làm mất "user gesture" mà chrome.sidePanel.open yêu cầu.
  void chrome.storage.session.set({ [PENDING_CAPTURE_KEY]: { requestedAt: Date.now() } });
  try {
    await openSidePanel(tabId);
    window.close();
  } catch {
    setStatus('Không mở được side panel. Hãy bấm biểu tượng extension rồi chọn “Mở bảng điều khiển”.', 'warning');
  }
}

scanButton?.addEventListener('click', () => {
  void startCapture();
});

panelButton?.addEventListener('click', () => {
  void (async () => {
    try {
      const tabId = currentTab?.id ?? (await activeTab())?.id;
      await openSidePanel(tabId);
      window.close();
    } catch {
      setStatus('Không mở được side panel cho tab này.', 'warning');
    }
  })();
});

void refresh();
