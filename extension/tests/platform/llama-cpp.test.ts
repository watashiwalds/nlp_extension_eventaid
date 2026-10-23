import { afterEach, describe, expect, it, vi } from 'vitest';
import { EXTRACTION_RESPONSE_SCHEMA } from '../../src/core/extraction/schema';
import { InferenceError } from '../../src/core/ports/inference';
import {
  buildResponseFormat,
  DEFAULT_LLAMA_ENDPOINT,
  displayModelName,
  LlamaCppProvider,
} from '../../src/platform/inference/llama-cpp';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function completion(content: string): Response {
  return jsonResponse({ model: 'qwen-test', choices: [{ message: { content } }] });
}

function provider(options: Partial<ConstructorParameters<typeof LlamaCppProvider>[0]> = {}) {
  return new LlamaCppProvider({
    endpoint: DEFAULT_LLAMA_ENDPOINT,
    model: 'qwen-test',
    timeoutMs: 1_000,
    ...options,
  });
}

const request = { system: 'system', user: 'user', maxTokens: 100, temperature: 0.1 };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('buildResponseFormat', () => {
  it('dạng mặc định dùng hình dạng OpenAI để thực sự ép schema', () => {
    expect(buildResponseFormat()).toEqual({
      type: 'json_schema',
      json_schema: { name: 'extraction', strict: true, schema: EXTRACTION_RESPONSE_SCHEMA },
    });
  });

  it('vẫn hỗ trợ dạng schema trần cho build cũ và dạng lùi json_object', () => {
    expect(buildResponseFormat('schema')).toEqual({
      type: 'json_schema',
      schema: EXTRACTION_RESPONSE_SCHEMA,
    });
    expect(buildResponseFormat('object')).toEqual({ type: 'json_object' });
  });
});

describe('LlamaCppProvider.health', () => {
  it('200 là sẵn sàng; gửi Authorization khi có API key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await provider({ apiKey: 'secret' }).health();

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('http://127.0.0.1:8080/health');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer secret' });
  });

  it('đọc tên model thật từ /v1/models để không phụ thuộc tên cố định', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse({ data: [{ id: '/models/Qwen_Qwen3.5-4B-Q5_K_S.gguf' }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await provider({ model: '' }).health();

    expect(result).toEqual({ ok: true, model: '/models/Qwen_Qwen3.5-4B-Q5_K_S.gguf' });
    expect(displayModelName('/models/Qwen_Qwen3.5-4B-Q5_K_S.gguf')).toBe('Qwen_Qwen3.5-4B-Q5_K_S.gguf');
  });

  it('503 báo đang tải model, 401 báo sai API key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({}, 503)));
    expect(await provider().health()).toMatchObject({ ok: false, reason: expect.stringContaining('tải model') });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({}, 401)));
    expect(await provider().health()).toMatchObject({ ok: false, reason: expect.stringContaining('API key') });
  });

  it('lỗi mạng trả lý do rõ ràng, không ném', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const result = await provider().health();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('Không kết nối được máy chủ mô hình');
  });
});

describe('LlamaCppProvider.run', () => {
  it('gửi đúng body, đọc choices[0].message.content và model trả về', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completion('{"events":[]}'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await provider().run(request);

    expect(result.raw).toBe('{"events":[]}');
    expect(result.model).toBe('qwen-test');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('http://127.0.0.1:8080/v1/chat/completions');
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.messages).toEqual([
      { role: 'system', content: 'system' },
      { role: 'user', content: 'user' },
    ]);
    expect(body.max_tokens).toBe(100);
    expect(body.temperature).toBe(0.1);
    expect(body.model).toBe('qwen-test');
    expect(body.chat_template_kwargs).toEqual({ enable_thinking: false });
    expect(body.response_format).toEqual({
      type: 'json_schema',
      json_schema: { name: 'extraction', strict: true, schema: EXTRACTION_RESPONSE_SCHEMA },
    });
  });

  it('để trống model thì không gửi trường model, dùng model máy chủ đang nạp', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completion('{"events":[]}'));
    vi.stubGlobal('fetch', fetchMock);

    await provider({ model: '' }).run(request);

    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(body).not.toHaveProperty('model');
  });

  it('build từ chối schema thì lùi dần OpenAI → schema trần → json_object', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'unsupported response_format' }, 400))
      .mockResolvedValueOnce(jsonResponse({ error: 'unsupported response_format' }, 400))
      .mockResolvedValueOnce(completion('{"events":[]}'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await provider().run(request);
    expect(result.raw).toBe('{"events":[]}');
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const secondBody = JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body));
    expect(secondBody.response_format).toMatchObject({ type: 'json_schema', schema: {} });

    const thirdBody = JSON.parse(String((fetchMock.mock.calls[2]?.[1] as RequestInit).body));
    expect(thirdBody.response_format).toEqual({ type: 'json_object' });
  });

  it('lỗi HTTP kèm nội dung máy chủ', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('model not loaded', { status: 500 })));

    await expect(provider().run(request)).rejects.toMatchObject({
      kind: 'http',
      status: 500,
      message: expect.stringContaining('model not loaded'),
    });
  });

  it('từ chối phản hồi rỗng', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ choices: [] })));
    await expect(provider().run(request)).rejects.toMatchObject({ kind: 'invalid-response' });
  });

  it('huỷ theo AbortSignal của người dùng', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: unknown, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      ),
    );

    const controller = new AbortController();
    const promise = provider().run({ ...request, signal: controller.signal });
    controller.abort();

    await expect(promise).rejects.toBeInstanceOf(InferenceError);
    await expect(promise).rejects.toMatchObject({ kind: 'aborted' });
  });

  it('timeout do máy chủ không phản hồi', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: unknown, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      ),
    );

    const promise = provider({ timeoutMs: 50 }).run(request);
    const assertion = expect(promise).rejects.toMatchObject({ kind: 'timeout' });
    await vi.advanceTimersByTimeAsync(60);
    await assertion;
  });
});
