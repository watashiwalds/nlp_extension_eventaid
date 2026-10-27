import { afterEach, describe, expect, it, vi } from 'vitest';
import { FilterError, isFilterAborted } from '../../src/core/ports/content-filter';
import { DEFAULT_FILTER_ENDPOINT } from '../../src/shared/contracts';
import {
  FILTER_HEALTH_TIMEOUT_MS,
  PhobertTaskFilter,
} from '../../src/platform/inference/phobert-filter';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const NO_TASK = {
  has_task: false,
  confidence: 0.91,
  needs_review: false,
  evidence: [],
  total_sentences: 12,
};

function filter(options: Partial<ConstructorParameters<typeof PhobertTaskFilter>[0]> = {}) {
  return new PhobertTaskFilter({
    endpoint: DEFAULT_FILTER_ENDPOINT,
    timeoutMs: 1_000,
    ...options,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('PhobertTaskFilter.health', () => {
  it('200 trả thiết bị và gọi đúng /health', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: 'ok', model: 'PhoBERT', device: 'cuda' }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await filter().health()).toEqual({ ok: true, device: 'cuda' });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${DEFAULT_FILTER_ENDPOINT}/health`);
    expect((init as RequestInit).method).toBe('GET');
    expect((init as RequestInit).signal).toBeInstanceOf(AbortSignal);
  });

  it('200 thiếu device vẫn coi là sẵn sàng', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ status: 'ok' })));
    expect(await filter().health()).toEqual({ ok: true });
  });

  it('503 báo đang tải model', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 503)));
    expect(await filter().health()).toMatchObject({
      ok: false,
      reason: expect.stringContaining('tải model'),
    });
  });

  it('lỗi mạng trả lý do rõ ràng, không ném', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const result = await filter().health();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('Không kết nối được dịch vụ sàng lọc');
  });

  it('health dùng timeout 2 giây cố định', async () => {
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

    const promise = filter({ timeoutMs: 60_000 }).health();
    await vi.advanceTimersByTimeAsync(FILTER_HEALTH_TIMEOUT_MS + 10);
    expect(await promise).toMatchObject({
      ok: false,
      reason: expect.stringContaining('không phản hồi'),
    });
  });
});

describe('PhobertTaskFilter.analyze', () => {
  it('gửi đúng body, map snake_case và đo latency phía client', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        has_task: true,
        confidence: 0.6447,
        needs_review: true,
        evidence: [
          {
            sentence_index: 1,
            sentence: 'Hải gửi báo cáo tiến độ trước 17 giờ hôm nay.',
            task_confidence: 0.6447,
          },
        ],
        total_sentences: 1,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await filter().analyze('Hải gửi báo cáo tiến độ trước 17 giờ hôm nay.');

    expect(result.hasTask).toBe(true);
    expect(result.confidence).toBeCloseTo(0.6447);
    expect(result.needsReview).toBe(true);
    expect(result.evidence).toEqual([
      {
        sentence: 'Hải gửi báo cáo tiến độ trước 17 giờ hôm nay.',
        taskConfidence: 0.6447,
      },
    ]);
    expect(result.totalSentences).toBe(1);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${DEFAULT_FILTER_ENDPOINT}/analyze`);
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      text: 'Hải gửi báo cáo tiến độ trước 17 giờ hôm nay.',
    });
  });

  it('200 thiếu trường hoặc confidence ngoài [0,1] ⇒ invalid-response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ has_task: false })));
    await expect(filter().analyze('x')).rejects.toMatchObject({ kind: 'invalid-response' });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ ...NO_TASK, confidence: 1.5 })),
    );
    await expect(filter().analyze('x')).rejects.toMatchObject({ kind: 'invalid-response' });
  });

  it('422 gợi ý giới hạn 5000 ký tự', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"detail":"too long"}', { status: 422 })),
    );
    const error = await filter()
      .analyze('x'.repeat(5_001))
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(FilterError);
    expect(error).toMatchObject({ kind: 'http', status: 422 });
    expect((error as FilterError).message).toContain('5000');
  });

  it('lỗi HTTP khác kèm nội dung máy chủ', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('model not loaded', { status: 500 })),
    );
    await expect(filter().analyze('x')).rejects.toMatchObject({
      kind: 'http',
      status: 500,
      message: expect.stringContaining('model not loaded'),
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
    const promise = filter().analyze('x', { signal: controller.signal });
    controller.abort();

    const error = await promise.catch((caught: unknown) => caught);
    expect(isFilterAborted(error)).toBe(true);
  });

  it('timeout do dịch vụ không phản hồi', async () => {
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

    const promise = filter({ timeoutMs: 50 }).analyze('x');
    const assertion = expect(promise).rejects.toMatchObject({ kind: 'timeout' });
    await vi.advanceTimersByTimeAsync(60);
    await assertion;
  });

  it('cắt dấu / ở cuối endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(NO_TASK));
    vi.stubGlobal('fetch', fetchMock);

    await filter({ endpoint: 'http://127.0.0.1:8081///' }).analyze('x');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://127.0.0.1:8081/analyze');
  });
});
