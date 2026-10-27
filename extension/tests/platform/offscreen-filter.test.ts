import { describe, expect, it } from 'vitest';
import {
  MockContentFilter,
  mockAnalysis,
  mockTaskAnalysis,
} from '../../src/core/extraction/mock-filter';
import { MOCK_EXTRACTION } from '../../src/core/extraction/mock-provider';
import type { ExtractionProgress } from '../../src/core/extraction/pipeline';
import { FilterError } from '../../src/core/ports/content-filter';
import type { ContentFilter } from '../../src/core/ports/content-filter';
import type { InferenceProvider, InferenceRequest } from '../../src/core/ports/inference';
import { runExtractionJob } from '../../src/platform/offscreen/run-job';
import type { ExtractionJobDeps } from '../../src/platform/offscreen/run-job';
import { DEFAULT_FILTER_SETTINGS } from '../../src/platform/storage/filter-settings';
import { FILTER_FAIL_OPEN_NOTE, FILTER_REPORT_NOTE } from '../../src/shared/constants';
import { LlmSettingsSchema } from '../../src/shared/contracts';
import type {
  Event,
  FilterMode,
  FilterRunMode,
  FilterSettings,
  LlmSettings,
  NormalizedDocument,
} from '../../src/shared/contracts';

const NOW = new Date(2026, 9, 27, 8, 0, 0);

const llmSettings: LlmSettings = LlmSettingsSchema.parse({
  endpoint: 'http://127.0.0.1:8080',
  temperature: 0.1,
  maxTokens: 1200,
  timeoutMs: 120000,
  chunkChars: 5000,
  maxChunks: 4,
});

function makeDocument(overrides: Partial<NormalizedDocument> = {}): NormalizedDocument {
  return {
    documentId: 'doc_filter',
    source: 'web_page',
    title: 'Thông báo lớp',
    text: [
      'Lớp họp nhóm đồ án lúc 9:00 ngày 2/11/2026 tại phòng B203.',
      'Hạn nộp báo cáo giữa kỳ là 20/11.',
      'Mọi người xác nhận tham dự trước thứ Sáu.',
    ].join('\n'),
    sourceUrl: 'https://example.com/thong-bao',
    capturedAt: NOW.toISOString(),
    extractionMethod: 'readability',
    contentHash: 'hash',
    truncated: false,
    charCount: 0,
    ...overrides,
  };
}

interface Harness {
  deps: ExtractionJobDeps;
  doc: NormalizedDocument;
  saved: Event[];
  requests: InferenceRequest[];
  analyzed: string[];
  counters: { provider: number; filter: number };
}

function harness(
  options: {
    mode?: FilterMode;
    filter?: ContentFilter;
    settings?: Partial<FilterSettings>;
    document?: NormalizedDocument;
  } = {},
): Harness {
  const doc = options.document ?? makeDocument();
  const saved: Event[] = [];
  const requests: InferenceRequest[] = [];
  const analyzed: string[] = [];
  const counters = { provider: 0, filter: 0 };

  const filterSettings: FilterSettings = {
    ...DEFAULT_FILTER_SETTINGS,
    ...options.settings,
    mode: options.mode ?? 'screen',
  };
  const filter = options.filter ?? new MockContentFilter([mockAnalysis()]);

  const provider: InferenceProvider = {
    id: 'mock',
    health: async () => ({ ok: true }),
    run: async (request) => {
      requests.push(request);
      return { raw: JSON.stringify(MOCK_EXTRACTION), latencyMs: 0, model: 'mock' };
    },
  };

  const deps: ExtractionJobDeps = {
    getDocument: async () => doc,
    listProfiles: async () => [],
    listEvents: async () => [],
    loadLlmSettings: async () => llmSettings,
    loadFilterSettings: async () => filterSettings,
    saveEvent: async (event) => {
      saved.push(event);
    },
    createProvider: () => {
      counters.provider += 1;
      return provider;
    },
    createFilter: () => {
      counters.filter += 1;
      return {
        id: 'phobert-task',
        health: () => filter.health(),
        analyze: (text, signalOptions) => {
          analyzed.push(text);
          return filter.analyze(text, signalOptions);
        },
      };
    },
    now: () => NOW,
  };

  return { deps, doc, saved, requests, analyzed, counters };
}

async function run(h: Harness, runMode?: FilterRunMode) {
  const progress: ExtractionProgress[] = [];
  const result = await runExtractionJob('doc_filter', h.deps, (item) => progress.push(item), undefined, runMode);
  return { result, progress };
}

describe('job trích xuất có bước sàng lọc', () => {
  it('screen + no_event: không tạo provider, không lưu sự kiện', async () => {
    const h = harness({ mode: 'screen' });
    const { result, progress } = await run(h);

    expect(h.counters.provider).toBe(0);
    expect(h.saved).toHaveLength(0);
    expect(result).toMatchObject({
      savedCount: 0,
      candidateCount: 0,
      chunkCount: 0,
      filterApplied: true,
      filterDecision: 'no_event',
      filterEvidenceCount: 0,
      filterTotalSentences: 10,
      filterConfidence: 0.95,
      filterNote: null,
    });
    expect(progress.some((item) => item.stage.includes('Đang sàng lọc nội dung'))).toBe(true);
    expect(progress.at(-1)?.stage).toContain('không có nội dung công việc');
  });

  it('screen + has_event: LLM nhận nguyên văn và lưu nháp', async () => {
    const h = harness({
      mode: 'screen',
      filter: new MockContentFilter([mockTaskAnalysis({ latencyMs: 12 })]),
    });
    const { result } = await run(h);

    expect(h.counters.provider).toBe(1);
    expect(result.filterDecision).toBe('has_event');
    expect(result.filterApplied).toBe(true);
    expect(result.filterEvidenceCount).toBe(1);
    expect(result.filterConfidence).toBe(0.92);
    expect(result.filterLatencyMs).toBe(12);
    expect(h.requests[0]?.user).toContain(h.doc.text);
    expect(result.savedCount).toBe(2);
  });

  it('report + no_event: vẫn gọi LLM và ghi ghi chú chế độ báo cáo', async () => {
    const h = harness({ mode: 'report' });
    const { result } = await run(h);

    expect(h.counters.provider).toBe(1);
    expect(result.filterDecision).toBe('no_event');
    expect(result.filterApplied).toBe(true);
    expect(result.filterNote).toBe(FILTER_REPORT_NOTE);
    expect(result.savedCount).toBe(2);
  });

  it('nguồn vùng chọn/văn bản dán: không tạo filter (Q2)', async () => {
    for (const source of ['selection', 'paste'] as const) {
      const h = harness({ mode: 'screen', document: makeDocument({ source }) });
      const { result } = await run(h);

      expect(h.counters.filter).toBe(0);
      expect(h.analyzed).toHaveLength(0);
      expect(result.filterDecision).toBeNull();
      expect(result.filterApplied).toBe(false);
      expect(result.savedCount).toBe(2);
    }
  });

  it('filterRunMode off: bỏ qua sàng lọc dù cài đặt là screen', async () => {
    const h = harness({ mode: 'screen' });
    const { result } = await run(h, 'off');

    expect(h.counters.filter).toBe(0);
    expect(result.filterDecision).toBeNull();
    expect(result.filterApplied).toBe(false);
    expect(h.counters.provider).toBe(1);
  });

  it('filterRunMode force: chạy sàng lọc dù cài đặt là off', async () => {
    const h = harness({ mode: 'off' });
    const { result } = await run(h, 'force');

    expect(h.counters.filter).toBe(1);
    expect(result.filterDecision).toBe('no_event');
    expect(h.counters.provider).toBe(0);
  });

  it('lỗi /analyze: fail-open, gửi toàn văn và ghi chú rõ', async () => {
    const h = harness({
      mode: 'screen',
      filter: new MockContentFilter([
        new FilterError('timeout', 'Dịch vụ sàng lọc không phản hồi sau 15 giây.'),
      ]),
    });
    const { result } = await run(h);

    expect(h.counters.provider).toBe(1);
    expect(result.filterApplied).toBe(false);
    expect(result.filterDecision).toBe('uncertain');
    expect(result.filterNote).toContain(FILTER_FAIL_OPEN_NOTE);
    expect(h.requests[0]?.user).toContain(h.doc.text);
    expect(result.savedCount).toBe(2);
  });

  it('health lỗi: fail-open trước khi gọi /analyze', async () => {
    const h = harness({
      mode: 'screen',
      filter: new MockContentFilter([mockAnalysis()], {
        ok: false,
        reason: 'Không kết nối được dịch vụ sàng lọc.',
      }),
    });
    const { result } = await run(h);

    expect(h.analyzed).toHaveLength(0);
    expect(result.filterApplied).toBe(false);
    expect(result.filterNote).toContain(FILTER_FAIL_OPEN_NOTE);
    expect(h.counters.provider).toBe(1);
    expect(result.savedCount).toBe(2);
  });

  it('nhiều cửa sổ: một cửa sổ có việc là đủ kết luận has_event', async () => {
    const longText = Array.from(
      { length: 40 },
      (_, i) => `Câu số ${i} nói về lớp học và bài tập.`,
    ).join(' ');
    const h = harness({
      mode: 'screen',
      settings: { windowChars: 200 },
      document: makeDocument({ text: longText, charCount: longText.length }),
      filter: new MockContentFilter([mockAnalysis(), mockTaskAnalysis(), mockAnalysis()]),
    });
    const { result } = await run(h);

    expect(h.counters.filter).toBe(1);
    expect(h.analyzed.length).toBeGreaterThan(1);
    expect(result.filterDecision).toBe('has_event');
    expect(result.filterApplied).toBe(true);
    expect(result.filterEvidenceCount).toBe(1);
  });

  it('huỷ giữa bước sàng lọc: ném lỗi aborted, không gọi LLM', async () => {
    const controller = new AbortController();
    const filter: ContentFilter = {
      id: 'phobert-task',
      health: async () => ({ ok: true }),
      analyze: async () => {
        controller.abort();
        throw new FilterError('aborted', 'Đã huỷ bước sàng lọc.');
      },
    };
    const h = harness({ mode: 'screen', filter });

    await expect(
      runExtractionJob('doc_filter', h.deps, () => {}, controller.signal),
    ).rejects.toBeInstanceOf(FilterError);
    expect(h.saved).toHaveLength(0);
    expect(h.counters.provider).toBe(0);
  });
});
