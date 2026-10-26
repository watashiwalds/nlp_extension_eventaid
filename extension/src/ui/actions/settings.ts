import { LlmSettingsSchema } from '../../shared/contracts';
import type { LlmProvider, LlmSettings } from '../../shared/contracts';
import {
  DEFAULT_LOCAL_ENDPOINT,
  endpointOrigin,
  isLocalEndpoint,
  validateEndpoint,
} from '../../core/inference/provider-choice';
import { createInferenceProvider } from '../../platform/inference/factory';
import { displayModelName } from '../../platform/inference/http';
import {
  ensureHostPermission,
  needsHostPermission,
  removeHostPermission,
} from '../../platform/permissions';
import { saveLlmSettings } from '../../platform/storage/settings';
import { escapeHtml, icon } from '../components';
import { askConsent } from '../consent-dialog';
import { showToast, store } from '../store';
import { messageOf, valueOf } from './shared';

type HealthTone = 'checking' | 'ok' | 'error' | 'warning';

/**
 * Consent vừa đồng ý trong phiên nhưng chưa lưu cùng endpoint (ví dụ người dùng
 * bấm “Kiểm tra kết nối” rồi mới bấm “Lưu”). Giữ ở bộ nhớ để lần lưu sau không
 * hỏi lại, nhưng không đưa vào store để tránh render lại form đang nhập.
 */
const sessionConsent: Record<string, string> = {};

export function clearSessionConsent(): void {
  for (const origin of Object.keys(sessionConsent)) delete sessionConsent[origin];
}

function healthBox(): HTMLElement | null {
  return document.getElementById('llm-health');
}

/** Cập nhật trực tiếp hộp kết quả, không qua store, để không render lại form đang nhập. */
export function setLlmHealth(tone: HealthTone, message: string): void {
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

export function clearLlmHealth(): void {
  const box = healthBox();
  if (!box) return;
  box.className = 'llm-health';
  box.innerHTML = '';
}

export interface ParsedSettingsForm {
  settings: LlmSettings;
  /** Endpoint đang là localhost (không cần consent). */
  local: boolean;
  /** Origin remote sẽ nhận nội dung; `null` với local. */
  origin: string | null;
}

export type SettingsFormResult =
  | { ok: true; parsed: ParsedSettingsForm }
  | { ok: false; message: string };

/**
 * Đọc form Cài đặt. Khi chọn “Máy này”, endpoint/key/model của cấu hình remote
 * vẫn được giữ nguyên trong settings để đổi lại mà không phải nhập lại.
 */
export function readSettingsForm(
  form: HTMLFormElement,
  current: LlmSettings,
): SettingsFormResult {
  const provider: LlmProvider =
    valueOf(form, 'provider') === 'openai-compatible' ? 'openai-compatible' : 'local';

  let endpoint = current.endpoint || DEFAULT_LOCAL_ENDPOINT;
  let apiKey = current.apiKey;
  let model = current.model;
  let local = isLocalEndpoint(endpoint);
  let origin: string | null = local ? endpointOrigin(endpoint) : null;

  if (provider === 'openai-compatible') {
    const checked = validateEndpoint(valueOf(form, 'endpoint'));
    if (!checked.ok) return { ok: false, message: checked.reason };
    endpoint = checked.endpoint;
    apiKey = valueOf(form, 'apiKey').trim();
    model = valueOf(form, 'model').trim();
    local = checked.local;
    origin = checked.origin;
  }

  const parsed = LlmSettingsSchema.safeParse({
    provider,
    endpoint,
    apiKey,
    model,
    consentByOrigin: { ...current.consentByOrigin, ...sessionConsent },
    temperature: Number(valueOf(form, 'temperature').trim()),
    maxTokens: Number(valueOf(form, 'maxTokens').trim()),
    timeoutMs: Number(valueOf(form, 'timeoutMs').trim()),
    chunkChars: Number(valueOf(form, 'chunkChars').trim()),
    maxChunks: Number(valueOf(form, 'maxChunks').trim()),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.join('.') || 'cài đặt';
    return {
      ok: false,
      message: `Giá trị “${where}” không hợp lệ: ${issue?.message ?? 'kiểm tra lại'}.`,
    };
  }

  return { ok: true, parsed: { settings: parsed.data, local, origin } };
}

interface AccessDenied {
  ok: false;
  message: string;
  cancelled: boolean;
}

type AccessResult = { ok: true; consent: Record<string, string> } | AccessDenied;

/**
 * Xin quyền host rồi consent (nếu là origin remote) TRƯỚC khi gửi request.
 * Consent mới được ghi ngay khi người dùng đồng ý, kể cả khi health sau đó lỗi;
 * riêng endpoint/key chỉ được lưu khi health thành công.
 */
async function ensureRemoteAccess(
  settings: LlmSettings,
  local: boolean,
  origin: string | null,
): Promise<AccessResult> {
  if (needsHostPermission(settings.endpoint)) {
    const permission = await ensureHostPermission(settings.endpoint);
    if (!permission.granted) {
      return {
        ok: false,
        cancelled: false,
        message: permission.reason ?? 'Chưa được cấp quyền truy cập endpoint.',
      };
    }
  }

  const consent = { ...settings.consentByOrigin, ...sessionConsent };
  if (!local && origin && !consent[origin]) {
    const accepted = await askConsent(origin);
    if (!accepted) {
      return {
        ok: false,
        cancelled: true,
        message: 'Đã huỷ đồng ý. Chưa gửi nội dung và chưa lưu cấu hình mới.',
      };
    }
    const stamp = new Date().toISOString();
    consent[origin] = stamp;
    sessionConsent[origin] = stamp;
    // Ghi consent ngay; không cập nhật store để form đang nhập không bị render lại.
    await saveLlmSettings({ ...store.get().llm, consentByOrigin: consent });
  }

  return { ok: true, consent };
}

interface HealthOutcome {
  ok: boolean;
  message: string;
}

async function checkHealth(settings: LlmSettings): Promise<HealthOutcome> {
  try {
    const provider = createInferenceProvider(settings);
    const health = await provider.health();
    if (!health.ok) return { ok: false, message: health.reason };
    return {
      ok: true,
      message: health.model
        ? `Kết nối thành công tới ${settings.endpoint}. Model: ${displayModelName(health.model)}.`
        : `Kết nối thành công tới ${settings.endpoint}. Model đã sẵn sàng.`,
    };
  } catch (error) {
    return { ok: false, message: messageOf(error) };
  }
}

type SaveOutcome =
  | { kind: 'saved'; message: string; health: string | null }
  | { kind: 'denied'; message: string; cancelled: boolean };

async function persistSettings(parsed: ParsedSettingsForm): Promise<SaveOutcome> {
  const { settings, local, origin } = parsed;

  if (settings.provider === 'local') {
    const saved = await saveLlmSettings(settings);
    store.set({ llm: saved });
    return {
      kind: 'saved',
      message: 'Đã lưu cài đặt. Suy luận chạy trên máy này.',
      health: null,
    };
  }

  const access = await ensureRemoteAccess(settings, local, origin);
  if (!access.ok) {
    return { kind: 'denied', message: access.message, cancelled: access.cancelled };
  }

  const next = { ...settings, consentByOrigin: access.consent };
  setLlmHealth('checking', 'Đang kiểm tra kết nối trước khi lưu…');
  const health = await checkHealth(next);
  if (!health.ok) {
    return { kind: 'denied', message: `Chưa lưu: ${health.message}`, cancelled: false };
  }

  const saved = await saveLlmSettings(next);
  store.set({ llm: saved });
  return {
    kind: 'saved',
    message: 'Đã lưu endpoint ngoài. Lần trích xuất sau sẽ dùng cấu hình này.',
    health: health.message,
  };
}

/** Lưu cài đặt; endpoint ngoài chỉ được lưu sau khi xin quyền, consent và health OK. */
export async function saveLlmSettingsFromForm(form: HTMLFormElement): Promise<void> {
  const read = readSettingsForm(form, store.get().llm);
  if (!read.ok) {
    setLlmHealth('error', read.message);
    showToast('error', read.message);
    return;
  }

  // Không dùng store.busy ở đây: render lại sẽ xoá lựa chọn/giá trị đang nhập
  // trước khi kịp lưu. Hộp #llm-health đã hiển thị tiến trình ngay trong form.
  let outcome: SaveOutcome;
  try {
    outcome = await persistSettings(read.parsed);
  } catch (error) {
    outcome = { kind: 'denied', message: messageOf(error), cancelled: false };
  }

  if (outcome.kind === 'saved') {
    clearSessionConsent();
    showToast('success', outcome.message);
    if (outcome.health) setLlmHealth('ok', outcome.health);
    else clearLlmHealth();
    return;
  }

  setLlmHealth('error', outcome.message);
  showToast(outcome.cancelled ? 'info' : 'error', outcome.message);
}

/** Kiểm tra kết nối với đúng giá trị đang nhập trên form (chưa lưu). */
export async function checkLlmHealthAction(form?: HTMLFormElement): Promise<void> {
  const target =
    form ?? document.querySelector<HTMLFormElement>('#llm-settings-form') ?? undefined;
  if (!target) {
    setLlmHealth('error', 'Không đọc được form cài đặt.');
    return;
  }

  const read = readSettingsForm(target, store.get().llm);
  if (!read.ok) {
    setLlmHealth('error', read.message);
    return;
  }

  setLlmHealth('checking', 'Đang kiểm tra kết nối…');
  try {
    const { settings, local, origin } = read.parsed;
    let next = settings;
    if (settings.provider === 'openai-compatible') {
      const access = await ensureRemoteAccess(settings, local, origin);
      if (!access.ok) {
        setLlmHealth(access.cancelled ? 'warning' : 'error', access.message);
        return;
      }
      next = { ...settings, consentByOrigin: access.consent };
    }
    const health = await checkHealth(next);
    setLlmHealth(health.ok ? 'ok' : 'error', health.message);
  } catch (error) {
    setLlmHealth('error', messageOf(error));
  }
}

/** Thu hồi consent theo origin; lần chạy remote sau sẽ bị chặn tới khi đồng ý lại. */
export async function revokeLlmConsentAction(origin: string): Promise<void> {
  if (!origin) return;
  if (!window.confirm(`Thu hồi đồng ý gửi nội dung tới ${origin}?`)) return;

  const current = store.get().llm;
  const consentByOrigin = { ...current.consentByOrigin };
  delete consentByOrigin[origin];
  delete sessionConsent[origin];

  try {
    const saved = await saveLlmSettings({ ...current, consentByOrigin });
    const removed = await removeHostPermission(origin);
    store.set({ llm: saved });
    showToast(
      'success',
      removed
        ? `Đã thu hồi đồng ý và quyền truy cập ${origin}.`
        : `Đã thu hồi đồng ý cho ${origin}.`,
    );
  } catch (error) {
    showToast('error', messageOf(error));
  }
}

/** Xoá API key đã lưu; endpoint/consent giữ nguyên để người dùng nhập key mới. */
export async function deleteLlmApiKeyAction(): Promise<void> {
  const current = store.get().llm;
  if (!current.apiKey) {
    showToast('info', 'Chưa có API key nào được lưu.');
    return;
  }

  let failure: string | null = null;
  try {
    const saved = await saveLlmSettings({ ...current, apiKey: '' });
    store.set({ llm: saved });
    showToast('success', 'Đã xoá API key đã lưu.');
  } catch (error) {
    failure = messageOf(error);
    showToast('error', failure);
  }

  if (!failure) {
    setLlmHealth(
      'warning',
      current.provider === 'openai-compatible'
        ? 'Đã xoá API key. Endpoint ngoài sẽ báo thiếu key cho tới khi bạn nhập key mới.'
        : 'Đã xoá API key đã lưu.',
    );
  }
}
