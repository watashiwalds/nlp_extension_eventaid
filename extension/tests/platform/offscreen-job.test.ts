import { describe, expect, it } from 'vitest';
import { MOCK_EXTRACTION, MockProvider } from '../../src/core/extraction/mock-provider';
import { makeEvent } from '../../src/core/events';
import type { ExtractionProgress } from '../../src/core/extraction/pipeline';
import { runExtractionJob } from '../../src/platform/offscreen/run-job';
import { LlmSettingsSchema } from '../../src/shared/contracts';
import type { Event, LlmSettings, NormalizedDocument, Profile } from '../../src/shared/contracts';

const NOW = new Date(2026, 9, 23, 8, 0, 0);

const document: NormalizedDocument = {
  documentId: 'doc_offscreen',
  source: 'web_page',
  title: 'Thông báo lớp',
  text: [
    'Lớp họp nhóm đồ án lúc 9:00 ngày 2/11/2026 tại phòng B203.',
    'Hạn nộp báo cáo giữa kỳ là 20/11.',
  ].join('\n'),
  sourceUrl: 'https://example.com/thong-bao',
  capturedAt: NOW.toISOString(),
  extractionMethod: 'readability',
  contentHash: 'hash',
  truncated: false,
  charCount: 0,
};

const settings: LlmSettings = LlmSettingsSchema.parse({
  endpoint: 'http://127.0.0.1:8080',
  temperature: 0.1,
  maxTokens: 1200,
  timeoutMs: 120000,
  chunkChars: 5000,
  maxChunks: 4,
});

function deps(overrides: {
  saved: Event[];
  existing?: Event[];
  now?: Date;
  settings?: LlmSettings;
  createProvider?: Parameters<typeof runExtractionJob>[1]['createProvider'];
}): Parameters<typeof runExtractionJob>[1] {
  return {
    getDocument: async () => document,
    listProfiles: async (): Promise<Profile[]> => [],
    listEvents: async () => overrides.existing ?? [],
    loadLlmSettings: async () => overrides.settings ?? settings,
    createProvider:
      overrides.createProvider ??
      (() =>
        new MockProvider(
          () => MOCK_EXTRACTION,
          0,
        )),
    saveEvent: async (event) => {
      overrides.saved.push(event);
    },
    now: () => overrides.now ?? NOW,
  };
}

describe('chạy job trong offscreen', () => {
  it('trích, chuẩn hoá và lưu sự kiện nháp', async () => {
    const saved: Event[] = [];
    const progress: ExtractionProgress[] = [];
    const result = await runExtractionJob('doc_offscreen', deps({ saved }), (item) =>
      progress.push(item),
    );

    expect(result.savedCount).toBe(2);
    expect(result.duplicateCount).toBe(0);
    expect(result.candidateCount).toBe(2);
    expect(saved).toHaveLength(2);
    expect(saved.every((event) => event.status === 'nhap')).toBe(true);
    expect(saved.every((event) => event.origin === 'llm')).toBe(true);
    expect(saved[0]?.sources[0]?.documentId).toBe('doc_offscreen');
    expect(saved[0]?.start.value).toBe('2026-11-02T09:00');
    expect(progress.at(-1)?.phase).toBe('persisting');
  });

  it('bỏ qua sự kiện đã có trong DB', async () => {
    const existing = makeEvent(
      {
        title: 'Họp nhóm đồ án',
        label: 'công_vụ',
        startValue: '2026-11-02T09:00',
        endValue: '2026-11-02T10:30',
        durationMinutesInput: null,
        summary: [],
        relatedProfiles: [],
        sources: [],
      },
      NOW,
    );
    const saved: Event[] = [];
    const result = await runExtractionJob('doc_offscreen', deps({ saved, existing: [existing] }), () => {});

    expect(result.savedCount).toBe(1);
    expect(result.duplicateCount).toBe(1);
    expect(saved[0]?.title).toBe('Nộp báo cáo giữa kỳ');
  });

  it('dừng ghi DB khi bị huỷ giữa lúc lưu', async () => {
    const saved: Event[] = [];
    const controller = new AbortController();
    const job = deps({ saved });
    job.saveEvent = async (event) => {
      saved.push(event);
      controller.abort();
    };

    await expect(
      runExtractionJob('doc_offscreen', job, () => {}, controller.signal),
    ).rejects.toThrow('Đã huỷ trích xuất.');
    expect(saved).toHaveLength(1);
  });

  it('không lưu gì khi tài liệu không còn trong DB', async () => {
    const saved: Event[] = [];
    const broken = deps({ saved });
    broken.getDocument = async () => null;

    await expect(runExtractionJob('doc_missing', broken, () => {})).rejects.toThrow(
      'Không tìm thấy nội dung',
    );
    expect(saved).toHaveLength(0);
  });

  it('chặn endpoint remote chưa đồng ý trước khi tạo provider', async () => {
    const remote = LlmSettingsSchema.parse({
      provider: 'openai-compatible',
      endpoint: 'https://example.test/v1',
    });
    let created = 0;
    const job = deps({
      saved: [],
      settings: remote,
      createProvider: () => {
        created += 1;
        return new MockProvider(() => MOCK_EXTRACTION, 0);
      },
    });

    await expect(runExtractionJob('doc_offscreen', job, () => {})).rejects.toThrow(
      'Chưa đồng ý gửi nội dung tới https://example.test',
    );
    expect(created).toBe(0);
  });
});
