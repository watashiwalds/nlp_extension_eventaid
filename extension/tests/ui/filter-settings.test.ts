// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FilterMode } from '../../src/shared/contracts';
import { clearAll } from '../../src/platform/storage/db';
import {
  DEFAULT_FILTER_SETTINGS,
  loadFilterSettings,
} from '../../src/platform/storage/filter-settings';
import { DEFAULT_LLM_SETTINGS } from '../../src/platform/storage/settings';
import { renderApp } from '../../src/ui/render';
import { store } from '../../src/ui/store';
import {
  checkFilterHealthAction,
  readFilterForm,
  saveFilterSettingsFromForm,
  validateFilterEndpoint,
} from '../../src/ui/actions/filter-settings';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderSettings(): void {
  document.body.innerHTML = renderApp(store.get());
}

function formElement(): HTMLFormElement {
  const form = document.querySelector('#filter-settings-form');
  if (!(form instanceof HTMLFormElement)) throw new Error('Thiếu form sàng lọc');
  return form;
}

function chooseMode(mode: FilterMode): void {
  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="filterMode"]')) {
    input.checked = input.value === mode;
  }
}

function setField(id: string, value: string): void {
  const input = document.querySelector<HTMLInputElement>(`#${id}`);
  if (!input) throw new Error(`Thiếu field ${id}`);
  input.value = value;
}

beforeEach(async () => {
  await clearAll();
  store.set({
    status: 'ready',
    tab: 'settings',
    documents: [],
    activeDocumentId: null,
    profiles: [],
    events: [],
    eventFilter: { status: 'all', label: 'all', tag: 'all', query: '' },
    llm: DEFAULT_LLM_SETTINGS,
    contentFilter: DEFAULT_FILTER_SETTINGS,
    toast: null,
    busy: null,
  });
  renderSettings();
});

afterEach(() => {
  document.querySelectorAll('.modal-backdrop').forEach((element) => element.remove());
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('card sàng lọc trong Cài đặt', () => {
  it('mặc định screen, endpoint 8081 và đủ trường theo kế hoạch', () => {
    const html = renderApp(store.get());
    expect(html).toContain('Sàng lọc nội dung (PhoBERT)');
    expect(html).toContain('name="filterMode" value="screen" checked');
    expect(html).toContain('http://127.0.0.1:8081');
    expect(html).toContain('name="filterSkipConfidence"');
    expect(html).toContain('name="filterMinSentences"');
    expect(html).toContain('data-action="check-filter"');
  });

  it('lưu chế độ, endpoint và ngưỡng rồi đọc lại từ IndexedDB', async () => {
    chooseMode('report');
    setField('filter-endpoint', 'http://127.0.0.1:8081/');
    setField('filter-timeout', '9000');
    setField('filter-skip-confidence', '0.9');
    setField('filter-min-sentences', '4');

    await saveFilterSettingsFromForm(formElement());

    const saved = await loadFilterSettings();
    expect(saved).toMatchObject({
      mode: 'report',
      endpoint: 'http://127.0.0.1:8081',
      timeoutMs: 9_000,
      skipConfidence: 0.9,
      minSentencesToSkip: 4,
    });
    expect(store.get().contentFilter.mode).toBe('report');
    expect(store.get().toast?.message).toContain('Đã lưu cài đặt sàng lọc');
  });

  it('từ chối endpoint ngoài loopback và không ghi đè cài đặt cũ', async () => {
    setField('filter-endpoint', 'https://api.example.com');
    await saveFilterSettingsFromForm(formElement());

    expect((await loadFilterSettings()).endpoint).toBe('http://127.0.0.1:8081');
    expect(store.get().contentFilter.endpoint).toBe('http://127.0.0.1:8081');
    expect(store.get().toast?.tone).toBe('error');
    expect(store.get().toast?.message).toContain('cục bộ');
  });

  it('từ chối ngưỡng ngoài [0.5,1] và số câu bằng 0', async () => {
    setField('filter-skip-confidence', '1.5');
    await saveFilterSettingsFromForm(formElement());
    expect(store.get().toast?.tone).toBe('error');
    expect(store.get().toast?.message).toContain('không hợp lệ');

    setField('filter-skip-confidence', '0.85');
    setField('filter-min-sentences', '0');
    await saveFilterSettingsFromForm(formElement());
    expect(store.get().toast?.tone).toBe('error');
    expect((await loadFilterSettings()).minSentencesToSkip).toBe(3);
  });

  it('readFilterForm giữ windowChars hiện tại vì card không mở trường này', () => {
    const read = readFilterForm(formElement(), { ...DEFAULT_FILTER_SETTINGS, windowChars: 2_500 });
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.settings.windowChars).toBe(2_500);
  });
});

describe('kiểm tra kết nối dịch vụ sàng lọc', () => {
  it('200 hiển thị thiết bị và chỉ gọi /health', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: 'ok', model: 'PhoBERT', device: 'cuda' }));
    vi.stubGlobal('fetch', fetchMock);

    await checkFilterHealthAction(formElement());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://127.0.0.1:8081/health');
    expect(document.querySelector('#filter-health')?.textContent).toContain('cuda');
    expect((await loadFilterSettings()).mode).toBe('screen');
  });

  it('lỗi kết nối hiện thông điệp rõ, không lưu cài đặt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await checkFilterHealthAction(formElement());

    expect(document.querySelector('#filter-health')?.textContent).toContain(
      'Không kết nối được dịch vụ sàng lọc',
    );
    expect(await loadFilterSettings()).toEqual(DEFAULT_FILTER_SETTINGS);
  });

  it('503 hiển thị trạng thái đang tải model', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 503)));

    await checkFilterHealthAction(formElement());

    expect(document.querySelector('#filter-health')?.textContent).toContain('tải model');
  });
});

describe('validateFilterEndpoint', () => {
  it('chấp nhận 127.0.0.1/localhost ở cổng 8000 và 8081', () => {
    for (const endpoint of [
      'http://127.0.0.1:8081',
      'http://127.0.0.1:8000',
      'http://localhost:8081',
      'http://localhost:8000/',
    ]) {
      expect(validateFilterEndpoint(endpoint).ok).toBe(true);
    }
  });

  it('từ chối cổng khác, HTTPS, host ngoài và đường dẫn con', () => {
    for (const endpoint of [
      'http://127.0.0.1:9000',
      'https://127.0.0.1:8081',
      'http://api.example.com:8081',
      'http://127.0.0.1:8081/analyze',
      'http://127.0.0.1:8081?x=1',
      'không-phải-url',
    ]) {
      expect(validateFilterEndpoint(endpoint).ok).toBe(false);
    }
  });
});
