import { afterEach, describe, expect, it, vi } from 'vitest';
import { EXTRACTION_RESPONSE_SCHEMA } from '../../src/core/extraction/schema';
import { InferenceError } from '../../src/core/ports/inference';
import { OpenAiCompatibleProvider } from '../../src/platform/inference/openai-compatible';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function completion(content: string, finishReason = 'stop'): Response {
  return jsonResponse({
    model: 'gemini-test',
    choices: [{ message: { content }, finish_reason: finishReason }],
  });
}

function provider(options: Partial<ConstructorParameters<typeof OpenAiCompatibleProvider>[0]> = {}) {
  return new OpenAiCompatibleProvider({
    endpoint: 'https://example.test/v1/',
    model: 'gemini-test',
    timeoutMs: 1_000,
    ...options,
  });
}

const request = { system: 'system', user: 'user', maxTokens: 100, temperature: 0.1 };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('OpenAiCompatibleProvider.health', () => {
  it('gọi /models, gửi Bearer key và đọc cả hai hình dạng phản hồi', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: [{ id: 'gemini-2.5-flash' }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await provider({ model: '', apiKey: 'secret' }).health();

    expect(result).toEqual({ ok: true, model: 'gemini-2.5-flash' });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://example.test/v1/models');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer secret' });

    fetchMock.mockResolvedValueOnce(jsonResponse({ models: [{ model: 'qwen3-8b' }] }));
    expect(await provider().health()).toEqual({ ok: true, model: 'qwen3-8b' });
  });

  it('không có danh sách model thì vẫn OK và giữ tên đã cấu hình', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: [] })));
    expect(await provider({ apiKey: 'secret' }).health()).toEqual({ ok: true, model: 'gemini-test' });
  });

  it('map 401/403/404/429/5xx sang thông điệp tiếng Việt', async () => {
    const cases: Array<[number, string, Record<string, string>?]> = [
      [401, 'API key không đúng'],
      [403, 'chưa được cấp quyền'],
      [404, 'Không thấy model/endpoint'],
      [429, 'giới hạn tần suất/quota', { 'Retry-After': '5' }],
      [500, 'Dịch vụ đang lỗi'],
    ];

    for (const [status, expected, headers] of cases) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, status, headers)));
      const result = await provider().health();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain(expected);
    }
  });

  it('lỗi mạng nêu endpoint, không nêu key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const result = await provider({ apiKey: 'secret-key' }).health();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('Không kết nối được endpoint');
      expect(result.reason).not.toContain('secret-key');
    }
  });
});

describe('OpenAiCompatibleProvider.run', () => {
  it('gửi body chuẩn OpenAI, không gửi chat_template_kwargs của llama.cpp', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completion('{"events":[]}'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await provider({ apiKey: 'secret' }).run(request);

    expect(result.raw).toBe('{"events":[]}');
    expect(result.model).toBe('gemini-test');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://example.test/v1/chat/completions');
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.messages).toEqual([
      { role: 'system', content: 'system' },
      { role: 'user', content: 'user' },
    ]);
    expect(body.max_tokens).toBe(100);
    expect(body.temperature).toBe(0.1);
    expect(body.stream).toBe(false);
    expect(body.model).toBe('gemini-test');
    expect(body).not.toHaveProperty('chat_template_kwargs');
    expect(body.response_format).toEqual({
      type: 'json_schema',
      json_schema: { name: 'extraction', strict: true, schema: EXTRACTION_RESPONSE_SCHEMA },
    });
  });

  it('để trống model thì không gửi trường model', async () => {
    const fetchMock = vi.fn().mockResolvedValue(completion('{"events":[]}'));
    vi.stubGlobal('fetch', fetchMock);

    await provider({ model: '' }).run(request);
    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(body).not.toHaveProperty('model');
  });

  it('429/5xx được thử lại đúng một lần', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 503, { 'Retry-After': '0' }))
      .mockResolvedValueOnce(completion('{"events":[]}'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await provider().run(request);
    expect(result.raw).toBe('{"events":[]}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('400 do schema không retry và giữ chi tiết để kiểm tra provider', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('response_format json_schema not supported', { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(provider().run(request)).rejects.toMatchObject({
      kind: 'http',
      status: 400,
      message: expect.stringContaining('json_schema not supported'),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('không đưa key vào thông báo lỗi dù máy chủ echo lại', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('bad key: secret-key', { status: 400 })),
    );

    const error = await provider({ apiKey: 'secret-key' }).run(request).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(InferenceError);
    expect((error as Error).message).not.toContain('secret-key');
  });

  it('phân biệt hết token với nội dung rỗng', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(completion('', 'length')));
    await expect(provider().run(request)).rejects.toMatchObject({
      kind: 'invalid-response',
      message: expect.stringContaining('hết token'),
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(completion('', 'content_filter')));
    await expect(provider().run(request)).rejects.toMatchObject({
      message: expect.stringContaining('bộ lọc an toàn'),
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ choices: [] })));
    await expect(provider().run(request)).rejects.toMatchObject({ kind: 'invalid-response' });
  });

  it('map finishReason viết hoa của Gemini (MAX_TOKENS/SAFETY/RECITATION)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(completion('', 'MAX_TOKENS')));
    await expect(provider().run(request)).rejects.toMatchObject({
      message: expect.stringContaining('hết token'),
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(completion('', 'SAFETY')));
    await expect(provider().run(request)).rejects.toMatchObject({
      message: expect.stringContaining('bộ lọc an toàn'),
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(completion('', 'RECITATION')));
    await expect(provider().run(request)).rejects.toMatchObject({
      message: expect.stringContaining('trích dẫn/bản quyền'),
    });
  });

  it('báo promptFeedback.blockReason thay vì "output rỗng"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          choices: [],
          promptFeedback: { blockReason: 'SAFETY' },
        }),
      ),
    );

    await expect(provider().run(request)).rejects.toMatchObject({
      kind: 'invalid-response',
      message: expect.stringContaining('bộ lọc an toàn'),
    });
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

    await expect(promise).rejects.toMatchObject({ kind: 'aborted' });
  });

  it('timeout do endpoint không phản hồi', async () => {
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
