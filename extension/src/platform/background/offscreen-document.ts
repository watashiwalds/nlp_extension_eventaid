import { OFFSCREEN_DOCUMENT_PATH } from '../../shared/constants';
import type { RuntimeMessage } from '../../shared/messages';

const JUSTIFICATION =
  'Chạy suy luận cục bộ với llama-server, không dừng khi đóng side panel hoặc service worker bị tạm dừng.';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function hasOffscreenDocument(): Promise<boolean> {
  return chrome.offscreen.hasDocument();
}

export async function ensureOffscreenDocument(): Promise<void> {
  if (await hasOffscreenDocument()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: [chrome.offscreen.Reason.WORKERS],
    justification: JUSTIFICATION,
  });
}

export async function closeOffscreenDocument(): Promise<void> {
  if (await hasOffscreenDocument()) await chrome.offscreen.closeDocument();
}

/**
 * `createDocument()` resolve trước khi listener của trang offscreen sẵn sàng,
 * nên thử lại vài lần thay vì làm job thất bại ngay.
 */
export async function sendToOffscreen(message: RuntimeMessage): Promise<void> {
  const delays = [0, 50, 100, 200, 400, 800, 1200];
  let lastError: unknown = null;
  for (const delay of delays) {
    if (delay > 0) await sleep(delay);
    try {
      await chrome.runtime.sendMessage(message);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Không gửi được việc sang tiến trình nền.');
}
