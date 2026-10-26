import { afterEach, describe, expect, it, vi } from 'vitest';
import { LlmSettingsSchema } from '../../src/shared/contracts';
import { createInferenceProvider } from '../../src/platform/inference/factory';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('factory chọn provider theo cài đặt', () => {
  it('mặc định là local', () => {
    const provider = createInferenceProvider(LlmSettingsSchema.parse({}));
    expect(provider.id).toBe('llama.cpp');
  });

  it('openai-compatible dùng endpoint người dùng nhập', () => {
    const provider = createInferenceProvider(
      LlmSettingsSchema.parse({
        provider: 'openai-compatible',
        endpoint: 'https://example.test/v1',
      }),
    );
    expect(provider.id).toBe('openai-compatible');
  });

  it('provider remote nhưng endpoint localhost vẫn dùng giao thức OpenAI-compatible', () => {
    const provider = createInferenceProvider(
      LlmSettingsSchema.parse({
        provider: 'openai-compatible',
        endpoint: 'http://localhost:8080/v1',
      }),
    );
    expect(provider.id).toBe('openai-compatible');
  });

  it('local giữ endpoint remote đã lưu nhưng không gửi key/nội dung ra ngoài', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);

    const provider = createInferenceProvider(
      LlmSettingsSchema.parse({
        provider: 'local',
        endpoint: 'https://example.test/v1',
        apiKey: 'remote-key',
        model: 'gemini-test',
      }),
    );

    await provider.health();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('http://127.0.0.1:8080/health');
    expect((init as RequestInit).headers).not.toHaveProperty('Authorization');
  });
});
