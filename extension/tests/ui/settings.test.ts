// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LlmSettingsSchema } from '../../src/shared/contracts';
import { clearAll } from '../../src/platform/storage/db';
import {
  DEFAULT_LLM_SETTINGS,
  loadLlmSettings,
  saveLlmSettings,
} from '../../src/platform/storage/settings';
import { renderApp } from '../../src/ui/render';
import { store } from '../../src/ui/store';
import {
  checkLlmHealthAction,
  clearSessionConsent,
  deleteLlmApiKeyAction,
  readSettingsForm,
  revokeLlmConsentAction,
  saveLlmSettingsFromForm,
} from '../../src/ui/actions/settings';

const REMOTE_ORIGIN = 'https://api.example.com';

async function waitFor(selector: string): Promise<HTMLElement> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) return element;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`Không thấy ${selector}`);
}

function renderSettings(): void {
  document.body.innerHTML = renderApp(store.get());
}

function formElement(): HTMLFormElement {
  const form = document.querySelector('#llm-settings-form');
  if (!(form instanceof HTMLFormElement)) throw new Error('Thiếu form cài đặt');
  return form;
}

function chooseProvider(provider: 'local' | 'openai-compatible'): void {
  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="provider"]')) {
    input.checked = input.value === provider;
  }
}

function setRemoteForm(endpoint: string, apiKey = '', model = ''): void {
  chooseProvider('openai-compatible');
  const endpointInput = document.querySelector<HTMLInputElement>('#llm-endpoint');
  const keyInput = document.querySelector<HTMLInputElement>('#llm-api-key');
  const modelInput = document.querySelector<HTMLInputElement>('#llm-model');
  if (!endpointInput || !keyInput || !modelInput) throw new Error('Thiếu field remote');
  endpointInput.value = endpoint;
  keyInput.value = apiKey;
  modelInput.value = model;
}

beforeEach(async () => {
  await clearAll();
  clearSessionConsent();
  vi.stubGlobal('chrome', {
    permissions: {
      request: vi.fn().mockResolvedValue(true),
      remove: vi.fn().mockResolvedValue(true),
    },
  });
  store.set({
    status: 'ready',
    tab: 'settings',
    documents: [],
    activeDocumentId: null,
    profiles: [],
    events: [],
    eventFilter: { status: 'all', label: 'all', tag: 'all', query: '' },
    llm: DEFAULT_LLM_SETTINGS,
    toast: null,
    busy: null,
  });
  renderSettings();
});

afterEach(() => {
  document.querySelectorAll('.modal-backdrop').forEach((element) => element.remove());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('form Cài đặt — nơi chạy suy luận', () => {
  it('mặc định chọn Máy này và ẩn cấu hình endpoint ngoài', () => {
    const html = renderApp(store.get());
    expect(html).toContain('name="provider" value="local" checked');
    expect(html).toContain('data-provider-panel="openai-compatible" hidden');
    expect(html).toContain('http://127.0.0.1:8080');
    expect(html).toContain('Kiểm tra kết nối');
  });

  it('provider remote hiện form, consent đã lưu và nút thu hồi', () => {
    store.set({
      llm: LlmSettingsSchema.parse({
        provider: 'openai-compatible',
        endpoint: `${REMOTE_ORIGIN}/v1`,
        apiKey: 'secret-key',
        model: 'gemini-test',
        consentByOrigin: { [REMOTE_ORIGIN]: '2026-10-26T08:00:00.000Z' },
      }),
    });
    const html = renderApp(store.get());
    expect(html).toContain('name="provider" value="openai-compatible" checked');
    expect(html).toContain('data-provider-panel="local" hidden');
    expect(html).not.toContain('data-provider-panel="openai-compatible" hidden');
    expect(html).toContain(REMOTE_ORIGIN);
    expect(html).toContain('data-action="revoke-consent"');
    expect(html).toContain('data-action="delete-llm-key"');
  });

  it('chọn Máy này giữ endpoint/key/model remote để đổi lại', () => {
    const remote = LlmSettingsSchema.parse({
      provider: 'openai-compatible',
      endpoint: `${REMOTE_ORIGIN}/v1`,
      apiKey: 'secret-key',
      model: 'gemini-test',
    });
    chooseProvider('local');

    const read = readSettingsForm(formElement(), remote);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.parsed.settings.provider).toBe('local');
    expect(read.parsed.settings.endpoint).toBe(`${REMOTE_ORIGIN}/v1`);
    expect(read.parsed.settings.apiKey).toBe('secret-key');
    expect(read.parsed.settings.model).toBe('gemini-test');
    expect(read.parsed.local).toBe(false);
    expect(read.parsed.origin).toBeNull();
  });

  it('chuẩn hoá base URL remote và từ chối HTTP ngoài localhost', () => {
    setRemoteForm('https://api.example.com/v1/chat/completions/', 'key', 'model-x');
    const ok = readSettingsForm(formElement(), DEFAULT_LLM_SETTINGS);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.parsed.settings.endpoint).toBe('https://api.example.com/v1');
      expect(ok.parsed.local).toBe(false);
      expect(ok.parsed.origin).toBe(REMOTE_ORIGIN);
    }

    setRemoteForm('http://api.example.com/v1');
    const insecure = readSettingsForm(formElement(), DEFAULT_LLM_SETTINGS);
    expect(insecure.ok).toBe(false);
    if (!insecure.ok) expect(insecure.message).toContain('HTTPS');
  });

  it('localhost nhập ở Endpoint khác không cần consent', () => {
    setRemoteForm('http://localhost:8080/v1');
    const read = readSettingsForm(formElement(), DEFAULT_LLM_SETTINGS);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.parsed.local).toBe(true);
    expect(read.parsed.origin).toBe('http://localhost:8080');
  });
});

describe('lưu endpoint ngoài — consent và health', () => {
  it('Huỷ consent: không gửi request, không lưu provider/endpoint', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    setRemoteForm(`${REMOTE_ORIGIN}/v1`, 'secret-key');

    const saving = saveLlmSettingsFromForm(formElement());
    const cancel = await waitFor('[data-consent="cancel"]');
    cancel.click();
    await saving;

    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.get().llm.provider).toBe('local');
    expect((await loadLlmSettings()).provider).toBe('local');
    expect((await loadLlmSettings()).endpoint).toBe('http://127.0.0.1:8080');
  });

  it('Đồng ý: gọi health, lưu provider/endpoint/key và mốc consent', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ data: [{ id: 'gemini-test' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    setRemoteForm(`${REMOTE_ORIGIN}/v1`, 'secret-key', 'gemini-test');

    const saving = saveLlmSettingsFromForm(formElement());
    const accept = await waitFor('[data-consent="accept"]');
    accept.click();
    await saving;

    const saved = await loadLlmSettings();
    expect(saved.provider).toBe('openai-compatible');
    expect(saved.endpoint).toBe(`${REMOTE_ORIGIN}/v1`);
    expect(saved.apiKey).toBe('secret-key');
    expect(saved.model).toBe('gemini-test');
    expect(saved.consentByOrigin[REMOTE_ORIGIN]).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${REMOTE_ORIGIN}/v1/models`);
    expect(store.get().llm.provider).toBe('openai-compatible');
  });

  it('health lỗi 401: không lưu endpoint mới, nhưng giữ consent đã đồng ý', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: async () => ({}),
      }),
    );
    setRemoteForm(`${REMOTE_ORIGIN}/v1`, 'wrong-key');

    const saving = saveLlmSettingsFromForm(formElement());
    const accept = await waitFor('[data-consent="accept"]');
    accept.click();
    await saving;

    const saved = await loadLlmSettings();
    expect(saved.provider).toBe('local');
    expect(saved.endpoint).toBe('http://127.0.0.1:8080');
    expect(saved.consentByOrigin[REMOTE_ORIGIN]).toBeTruthy();
    expect(document.querySelector('#llm-health')?.textContent).toContain('API key');
  });

  it('Kiểm tra kết nối trước rồi Lưu: không hỏi consent lần hai', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ data: [{ id: 'gemini-test' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    setRemoteForm(`${REMOTE_ORIGIN}/v1`, 'secret-key');

    const checking = checkLlmHealthAction(formElement());
    (await waitFor('[data-consent="accept"]')).click();
    await checking;

    const saving = saveLlmSettingsFromForm(formElement());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector('.modal-backdrop')).toBeNull();
    await saving;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((await loadLlmSettings()).consentByOrigin[REMOTE_ORIGIN]).toBeTruthy();
  });
});

describe('thu hồi consent và xoá key', () => {
  it('thu hồi consent xoá mốc origin và chặn chạy remote', async () => {
    const remote = LlmSettingsSchema.parse({
      provider: 'openai-compatible',
      endpoint: `${REMOTE_ORIGIN}/v1`,
      consentByOrigin: { [REMOTE_ORIGIN]: '2026-10-26T08:00:00.000Z' },
    });
    await saveLlmSettings(remote);
    store.set({ llm: remote });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await revokeLlmConsentAction(REMOTE_ORIGIN);

    expect((await loadLlmSettings()).consentByOrigin[REMOTE_ORIGIN]).toBeUndefined();
    expect(store.get().llm.consentByOrigin[REMOTE_ORIGIN]).toBeUndefined();
  });

  it('xoá key đã lưu nhưng giữ endpoint và consent', async () => {
    const remote = LlmSettingsSchema.parse({
      provider: 'openai-compatible',
      endpoint: `${REMOTE_ORIGIN}/v1`,
      apiKey: 'secret-key',
      consentByOrigin: { [REMOTE_ORIGIN]: '2026-10-26T08:00:00.000Z' },
    });
    await saveLlmSettings(remote);
    store.set({ llm: remote });

    await deleteLlmApiKeyAction();

    const saved = await loadLlmSettings();
    expect(saved.apiKey).toBe('');
    expect(saved.endpoint).toBe(`${REMOTE_ORIGIN}/v1`);
    expect(saved.consentByOrigin[REMOTE_ORIGIN]).toBeTruthy();
  });
});
