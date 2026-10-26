// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LlmSettingsSchema } from '../../src/shared/contracts';
import { parsePastedText } from '../../src/platform/capture/parse';
import { DEFAULT_LLM_SETTINGS } from '../../src/platform/storage/settings';
import { extractEventsAction } from '../../src/ui/actions/extract';
import { store } from '../../src/ui/store';

const REMOTE_ORIGIN = 'https://api.example.com';
const document = parsePastedText('Thông báo họp', 'Họp lúc 9h ngày 2/11 tại phòng B1-201.');

function resetState(llm = DEFAULT_LLM_SETTINGS): void {
  store.set({
    status: 'ready',
    tab: 'capture',
    documents: [document],
    activeDocumentId: document.documentId,
    profiles: [],
    events: [],
    llm,
    extraction: null,
    toast: null,
    busy: null,
  });
}

function stubChrome(permissionGranted = true): { sendMessage: ReturnType<typeof vi.fn> } {
  const sendMessage = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal('chrome', {
    runtime: { sendMessage },
    permissions: { request: vi.fn().mockResolvedValue(permissionGranted) },
    storage: { session: { get: vi.fn().mockResolvedValue({}) } },
  });
  return { sendMessage };
}

beforeEach(() => {
  resetState();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('chặn trích xuất khi chưa đủ điều kiện remote', () => {
  it('origin remote chưa đồng ý: không gửi job, mở Cài đặt', async () => {
    const { sendMessage } = stubChrome();
    resetState(
      LlmSettingsSchema.parse({
        provider: 'openai-compatible',
        endpoint: `${REMOTE_ORIGIN}/v1`,
        consentByOrigin: {},
      }),
    );

    await extractEventsAction();

    expect(sendMessage).not.toHaveBeenCalled();
    expect(store.get().tab).toBe('settings');
    expect(store.get().toast?.message).toContain('Chưa đồng ý');
    expect(store.get().extraction).toBeNull();
  });

  it('local alias chưa được cấp quyền host: không gửi job', async () => {
    const { sendMessage } = stubChrome(false);
    resetState(
      LlmSettingsSchema.parse({
        provider: 'openai-compatible',
        endpoint: 'http://localhost:8080/v1',
      }),
    );

    await extractEventsAction();

    expect(sendMessage).not.toHaveBeenCalled();
    expect(store.get().tab).toBe('settings');
    expect(store.get().toast?.message).toContain('quyền');
  });

  it('remote đã đồng ý + có quyền: gửi job như bình thường', async () => {
    const { sendMessage } = stubChrome(true);
    resetState(
      LlmSettingsSchema.parse({
        provider: 'openai-compatible',
        endpoint: `${REMOTE_ORIGIN}/v1`,
        consentByOrigin: { [REMOTE_ORIGIN]: '2026-10-26T08:00:00.000Z' },
      }),
    );

    await extractEventsAction();

    expect(sendMessage).toHaveBeenCalledWith({
      to: 'background',
      type: 'RUN_EXTRACTION',
      documentId: document.documentId,
    });
    expect(store.get().tab).toBe('capture');
  });
});
