/**
 * Hàm tự chứa (self-contained) để inject vào tab bằng `chrome.scripting.executeScript`.
 *
 * Quan trọng: hàm KHÔNG được tham chiếu biến/hàm bên ngoài — Chrome serialize
 * `func.toString()` và chạy trong context của trang. Mọi hằng số phải khai báo bên trong.
 *
 * Mục tiêu: lọc bớt menu/khung ẩn của trang động (Gmail, dashboard SPA) trước khi
 * chuyển HTML cho Readability, thay vì gửi toàn bộ `documentElement.outerHTML`.
 */
export interface PageSnapshot {
  html: string;
  url: string;
  title: string;
  selection: string;
  /** Số ký tự chữ sau khi lọc — dùng để phát hiện trang chưa render. */
  textLength: number;
  /** Vùng gốc được chọn: `main`, `[role="main"]`, `article`, `body`… */
  root: string;
  /** Trang có dấu hiệu SPA chưa tải xong nội dung. */
  likelyDynamic: boolean;
  /** HTML sau lọc đã bị cắt bớt do quá lớn. */
  htmlTruncated: boolean;
}

export function snapshotPage(): PageSnapshot {
  const MAX_HTML_CHARS = 4_000_000;
  const MIN_PRIMARY_CHARS = 200;
  const DYNAMIC_CHARS = 400;

  const NOISE_SELECTOR = [
    'script',
    'style',
    'noscript',
    'template',
    'svg',
    'canvas',
    'iframe',
    'nav',
    'header',
    'footer',
    'aside',
    '[role="navigation"]',
    '[role="banner"]',
    '[role="contentinfo"]',
    '[aria-hidden="true"]',
    '[hidden]',
  ].join(',');

  const APP_SHELL_SELECTOR =
    '#app, #root, #__next, #___gatsby, [data-reactroot], [ng-version], [data-v-app]';

  const textOf = (node: Element | null): string =>
    (node?.textContent ?? '').replace(/\s+/g, ' ').trim();

  const cleanClone = (source: Element): Element => {
    const clone = source.cloneNode(true) as Element;
    for (const noisy of clone.querySelectorAll(NOISE_SELECTOR)) noisy.remove();
    return clone;
  };

  let root: Element | null = document.body;
  let rootName = 'body';
  // Ưu tiên landmark theo đúng thứ tự, không để CSS selector list chọn theo document order.
  for (const selector of ['main', '[role="main"]', 'article', '[role="article"]']) {
    const candidate = document.querySelector(selector);
    if (!candidate) continue;
    root = candidate;
    rootName = candidate.tagName.toLowerCase();
    break;
  }

  let cleaned = cleanClone(root);
  let text = textOf(cleaned);

  // Trang có <main> rỗng (SPA chưa render) nhưng body còn nội dung: dùng body đã lọc.
  if (text.length < MIN_PRIMARY_CHARS && rootName !== 'body') {
    const bodyClone = cleanClone(document.body);
    const bodyText = textOf(bodyClone);
    if (bodyText.length > text.length) {
      cleaned = bodyClone;
      text = bodyText;
      rootName = 'body';
    }
  }

  const appShell = document.querySelector(APP_SHELL_SELECTOR) !== null;
  const likelyDynamic =
    document.readyState === 'loading' || (appShell && text.length < DYNAMIC_CHARS);

  const fullHtml = `<!DOCTYPE html>\n${cleaned.outerHTML}`;
  const htmlTruncated = fullHtml.length > MAX_HTML_CHARS;

  return {
    html: htmlTruncated ? fullHtml.slice(0, MAX_HTML_CHARS) : fullHtml,
    url: location.href,
    title: document.title,
    selection: window.getSelection()?.toString() ?? '',
    textLength: text.length,
    root: rootName,
    likelyDynamic,
    htmlTruncated,
  };
}
