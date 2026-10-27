import { FilterSettingsSchema } from '../../shared/contracts';
import type { FilterSettings } from '../../shared/contracts';
import { PhobertTaskFilter } from '../../platform/inference/phobert-filter';
import { saveFilterSettings } from '../../platform/storage/filter-settings';
import { escapeHtml, icon } from '../components';
import { showToast, store } from '../store';
import { messageOf, valueOf } from './shared';

type FilterHealthTone = 'checking' | 'ok' | 'error' | 'warning';

/** Cổng đã khai báo trong `host_permissions` và `connect-src` của manifest. */
const ALLOWED_FILTER_PORTS = new Set(['8000', '8081']);
const ALLOWED_FILTER_HOSTS = new Set(['127.0.0.1', 'localhost']);

export type FilterEndpointCheck = { ok: true } | { ok: false; message: string };

/**
 * Chỉ cho phép dịch vụ cục bộ ở đúng các cổng manifest đã cấp quyền.
 * Việc chặn ở UI giúp người dùng nhận lỗi rõ thay vì `fetch` bị Chrome chặn.
 */
export function validateFilterEndpoint(raw: string): FilterEndpointCheck {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, message: 'Địa chỉ máy chủ sàng lọc không hợp lệ.' };
  }

  const port = url.port || '80';
  const supported =
    url.protocol === 'http:' &&
    ALLOWED_FILTER_HOSTS.has(url.hostname) &&
    ALLOWED_FILTER_PORTS.has(port) &&
    !url.username &&
    !url.password &&
    (url.pathname === '/' || url.pathname === '') &&
    !url.search &&
    !url.hash;

  return supported
    ? { ok: true }
    : {
        ok: false,
        message:
          'Chỉ hỗ trợ dịch vụ sàng lọc cục bộ tại 127.0.0.1 hoặc localhost, cổng 8000/8081.',
      };
}

function healthBox(): HTMLElement | null {
  return document.getElementById('filter-health');
}

/** Cập nhật trực tiếp hộp kết quả, không qua store, để không render lại form đang nhập. */
export function setFilterHealth(tone: FilterHealthTone, message: string): void {
  const box = healthBox();
  if (!box) return;
  box.className = `alert llm-health ${
    tone === 'ok'
      ? 'alert--success'
      : tone === 'error'
        ? 'alert--danger'
        : tone === 'warning'
          ? 'alert--warning'
          : ''
  }`.trim();
  box.innerHTML =
    tone === 'checking'
      ? `<span class="spinner"></span><span>${escapeHtml(message)}</span>`
      : `${icon(tone === 'ok' ? 'check' : 'alert')}<span>${escapeHtml(message)}</span>`;
}

export function clearFilterHealth(): void {
  const box = healthBox();
  if (!box) return;
  box.className = 'llm-health';
  box.innerHTML = '';
}

export type FilterFormResult =
  | { ok: true; settings: FilterSettings }
  | { ok: false; message: string };

/** Đọc form cài đặt sàng lọc; giữ `windowChars` hiện tại vì card chưa mở trường này. */
export function readFilterForm(
  form: HTMLFormElement,
  current: FilterSettings,
): FilterFormResult {
  const endpoint = valueOf(form, 'filterEndpoint').trim().replace(/\/+$/, '');
  const endpointCheck = validateFilterEndpoint(endpoint);
  if (!endpointCheck.ok) return endpointCheck;

  const parsed = FilterSettingsSchema.safeParse({
    mode: valueOf(form, 'filterMode'),
    endpoint,
    timeoutMs: Number(valueOf(form, 'filterTimeout').trim()),
    windowChars: current.windowChars,
    skipConfidence: Number(valueOf(form, 'filterSkipConfidence').trim()),
    minSentencesToSkip: Number(valueOf(form, 'filterMinSentences').trim()),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.join('.') || 'cài đặt';
    return {
      ok: false,
      message: `Giá trị “${where}” không hợp lệ: ${issue?.message ?? 'kiểm tra lại'}.`,
    };
  }

  return { ok: true, settings: parsed.data };
}

/** Lưu cài đặt sàng lọc; không gọi mạng. */
export async function saveFilterSettingsFromForm(form: HTMLFormElement): Promise<void> {
  const read = readFilterForm(form, store.get().contentFilter);
  if (!read.ok) {
    setFilterHealth('error', read.message);
    showToast('error', read.message);
    return;
  }

  try {
    const saved = await saveFilterSettings(read.settings);
    store.set({ contentFilter: saved });
    showToast('success', 'Đã lưu cài đặt sàng lọc nội dung.');
    clearFilterHealth();
  } catch (error) {
    const message = messageOf(error);
    setFilterHealth('error', message);
    showToast('error', message);
  }
}

/** Kiểm tra kết nối với đúng giá trị đang nhập trên form (chưa lưu). */
export async function checkFilterHealthAction(form?: HTMLFormElement): Promise<void> {
  const target =
    form ?? document.querySelector<HTMLFormElement>('#filter-settings-form') ?? undefined;
  if (!target) {
    setFilterHealth('error', 'Không đọc được form cài đặt sàng lọc.');
    return;
  }

  const read = readFilterForm(target, store.get().contentFilter);
  if (!read.ok) {
    setFilterHealth('error', read.message);
    return;
  }

  setFilterHealth('checking', 'Đang kiểm tra dịch vụ sàng lọc…');
  try {
    const filter = new PhobertTaskFilter({
      endpoint: read.settings.endpoint,
      timeoutMs: read.settings.timeoutMs,
    });
    const health = await filter.health();
    if (!health.ok) {
      setFilterHealth('error', health.reason);
      return;
    }
    setFilterHealth(
      'ok',
      health.device
        ? `Kết nối thành công tới ${read.settings.endpoint}. Thiết bị: ${health.device}.`
        : `Kết nối thành công tới ${read.settings.endpoint}.`,
    );
  } catch (error) {
    setFilterHealth('error', messageOf(error));
  }
}
