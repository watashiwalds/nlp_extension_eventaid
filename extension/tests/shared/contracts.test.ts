import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  EventCandidateSchema,
  EventSchema,
  ExtractionJobSchema,
  FilterSettingsSchema,
  LlmSettingsSchema,
  MAX_EVENT_TAGS,
} from '../../src/shared/contracts';
import { makeEvent } from '../../src/core/events';
import { RuntimeMessageSchema } from '../../src/shared/messages';
import { clearAll, exportAll, importAll, listEvents } from '../../src/platform/storage/db';

const NOW = new Date(2026, 9, 21, 8, 0, 0);

function legacyEvent(): Record<string, unknown> {
  const event = makeEvent(
    {
      title: 'Sự kiện cũ',
      label: 'công_vụ',
      tags: ['đồ án'],
      startValue: '2026-11-02T09:00',
      endValue: null,
      durationMinutesInput: 60,
      summary: [],
      relatedProfiles: [],
      sources: [],
    },
    NOW,
  );
  const raw = JSON.parse(JSON.stringify(event)) as Record<string, unknown>;
  delete raw.tags;
  delete raw.origin;
  return raw;
}

beforeEach(async () => {
  await clearAll();
});

describe('hợp đồng lớp trích xuất LLM', () => {
  it('bản ghi cũ thiếu origin/date được đọc với giá trị mặc định', () => {
    const raw = legacyEvent();
    const start = raw.start as Record<string, unknown>;
    delete start.date;
    const parsed = EventSchema.parse(raw);
    expect(parsed.origin).toBe('manual');
    expect(parsed.extractionMeta).toBeUndefined();
    expect(parsed.start.date).toBeNull();
  });

  it('bản ghi llm giữ origin và extractionMeta', () => {
    const event = makeEvent(
      {
        title: 'Họp nhóm đồ án',
        label: 'công_vụ',
        startValue: '2026-11-02T09:00',
        endValue: null,
        durationMinutesInput: 60,
        summary: [],
        relatedProfiles: [],
        sources: [],
        origin: 'llm',
        extraUncertain: ['nam_chua_ro'],
        extractionMeta: {
          runId: 'run_1',
          documentId: 'doc_1',
          provider: 'mock',
          model: 'mock-v1',
          promptVersion: 'v1',
          chunkIndex: 0,
          chunkCount: 1,
          confidence: 0.7,
          latencyMs: 100,
        },
      },
      NOW,
    );
    expect(event.origin).toBe('llm');
    expect(event.extractionMeta?.provider).toBe('mock');
    expect(event.validation.uncertain).toContain('nam_chua_ro');
  });

  it('candidate thiếu trường bắt buộc hoặc quá 5 ý tóm tắt bị từ chối', () => {
    const valid = {
      title: 'Nộp báo cáo',
      label: 'công_vụ',
      start: { value: null, raw: '20/11' },
      end: null,
      durationMinutes: null,
      summary: ['Hạn nộp'],
      relatedProfiles: [],
      confidence: 0.6,
      uncertain: ['nam_chua_ro'],
    };
    expect(EventCandidateSchema.parse(valid).title).toBe('Nộp báo cáo');
    expect(() => EventCandidateSchema.parse({ ...valid, title: '' })).toThrow();
    expect(() =>
      EventCandidateSchema.parse({ ...valid, summary: ['a', 'b', 'c', 'd', 'e', 'f'] }),
    ).toThrow();
    expect(() => EventCandidateSchema.parse({ ...valid, label: 'nghi_mat' })).toThrow();
  });

  it('ExtractionMeta nhận provider openai-compatible', () => {
    const event = makeEvent(
      {
        title: 'Sự kiện từ endpoint ngoài',
        label: 'công_vụ',
        startValue: '2026-11-02T09:00',
        endValue: null,
        durationMinutesInput: 60,
        summary: [],
        relatedProfiles: [],
        sources: [],
        origin: 'llm',
        extractionMeta: {
          runId: 'run_1',
          documentId: 'doc_1',
          provider: 'openai-compatible',
          model: 'gemini-test',
          promptVersion: 'v4',
          chunkIndex: 0,
          chunkCount: 1,
          confidence: 0.7,
          latencyMs: 100,
        },
      },
      NOW,
    );
    expect(EventSchema.parse(event).extractionMeta?.provider).toBe('openai-compatible');
  });

  it('LlmSettings điền mặc định và từ chối giá trị ngoài ngưỡng', () => {
    const settings = LlmSettingsSchema.parse({});
    expect(settings.provider).toBe('local');
    expect(settings.consentByOrigin).toEqual({});
    expect(settings.endpoint).toBe('http://127.0.0.1:8080');
    expect(settings.model).toBe('');
    expect(settings.chunkChars).toBe(5000);
    expect(settings.maxChunks).toBe(4);
    expect(() => LlmSettingsSchema.parse({ endpoint: 'không-phải-url' })).toThrow();
    expect(() => LlmSettingsSchema.parse({ temperature: 2 })).toThrow();
    expect(() => LlmSettingsSchema.parse({ maxChunks: 0 })).toThrow();
  });

  it('ExtractionJob chỉ nhận trạng thái trong enum', () => {
    const job = {
      jobId: 'job_1',
      documentId: 'doc_1',
      status: 'queued',
      stage: 'Đang chờ…',
      chunkIndex: 0,
      chunkCount: 0,
      candidateCount: 0,
      error: null,
      startedAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    };
    const parsed = ExtractionJobSchema.parse(job);
    expect(parsed.status).toBe('queued');
    expect(parsed.savedCount).toBe(0);
    expect(parsed.duplicateCount).toBe(0);
    expect(parsed.truncated).toBe(false);
    expect(() => ExtractionJobSchema.parse({ ...job, status: 'dang_chay' })).toThrow();
  });

  it('message job phải đúng đích và đủ trường', () => {
    expect(
      RuntimeMessageSchema.safeParse({
        to: 'background',
        type: 'RUN_EXTRACTION',
        documentId: 'doc_1',
      }).success,
    ).toBe(true);
    expect(
      RuntimeMessageSchema.safeParse({
        to: 'offscreen',
        type: 'RUN_EXTRACTION',
        documentId: 'doc_1',
      }).success,
    ).toBe(false);
    expect(
      RuntimeMessageSchema.safeParse({
        to: 'background',
        type: 'JOB_PROGRESS',
        jobId: 'job_1',
        stage: 'Đang đọc…',
        chunkIndex: 1,
        chunkCount: 2,
      }).success,
    ).toBe(true);
  });
});

describe('hợp đồng bước sàng lọc nội dung', () => {
  it('FilterSettings điền mặc định đã chốt và từ chối giá trị ngoài ngưỡng', () => {
    const settings = FilterSettingsSchema.parse({});
    expect(settings.mode).toBe('screen');
    expect(settings.endpoint).toBe('http://127.0.0.1:8000');
    expect(settings.timeoutMs).toBe(15_000);
    expect(settings.windowChars).toBe(4_000);
    expect(settings.skipConfidence).toBe(0.85);
    expect(settings.minSentencesToSkip).toBe(3);

    expect(() => FilterSettingsSchema.parse({ mode: 'luon_luon' })).toThrow();
    expect(() => FilterSettingsSchema.parse({ skipConfidence: 1.2 })).toThrow();
    expect(() => FilterSettingsSchema.parse({ minSentencesToSkip: 0 })).toThrow();
    expect(() => FilterSettingsSchema.parse({ windowChars: 5_000 })).toThrow();
    expect(() => FilterSettingsSchema.parse({ endpoint: 'không-phải-url' })).toThrow();
  });

  it('job cũ thiếu trường sàng lọc vẫn parse được với mặc định', () => {
    const legacy = {
      jobId: 'job_1',
      documentId: 'doc_1',
      status: 'queued',
      stage: 'Đang chờ…',
      chunkIndex: 0,
      chunkCount: 0,
      candidateCount: 0,
      error: null,
      startedAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    };
    const parsed = ExtractionJobSchema.parse(legacy);
    expect(parsed.filterApplied).toBe(false);
    expect(parsed.filterDecision).toBeNull();
    expect(parsed.filterEvidenceCount).toBe(0);
    expect(parsed.filterTotalSentences).toBe(0);
    expect(parsed.filterConfidence).toBeNull();
    expect(parsed.filterLatencyMs).toBe(0);
    expect(parsed.filterNote).toBeNull();
    expect(() => ExtractionJobSchema.parse({ ...legacy, filterDecision: 'co_le' })).toThrow();
  });

  it('JOB_DONE cũ vẫn parse; message mới mang đủ bộ trường sàng lọc', () => {
    const legacy = RuntimeMessageSchema.safeParse({
      to: 'background',
      type: 'JOB_DONE',
      jobId: 'job_1',
      candidateCount: 0,
      savedCount: 0,
      duplicateCount: 0,
      chunkCount: 1,
      truncated: false,
    });
    expect(legacy.success).toBe(true);
    if (legacy.success && legacy.data.type === 'JOB_DONE') {
      expect(legacy.data.filterApplied).toBe(false);
      expect(legacy.data.filterDecision).toBeNull();
      expect(legacy.data.filterConfidence).toBeNull();
      expect(legacy.data.filterNote).toBeNull();
    }

    const full = RuntimeMessageSchema.safeParse({
      to: 'background',
      type: 'JOB_DONE',
      jobId: 'job_1',
      candidateCount: 2,
      savedCount: 2,
      duplicateCount: 0,
      chunkCount: 1,
      truncated: false,
      filterApplied: true,
      filterDecision: 'no_event',
      filterEvidenceCount: 0,
      filterTotalSentences: 48,
      filterConfidence: 0.91,
      filterLatencyMs: 1_800,
      filterNote: null,
    });
    expect(full.success).toBe(true);
    if (full.success && full.data.type === 'JOB_DONE') {
      expect(full.data.filterDecision).toBe('no_event');
      expect(full.data.filterConfidence).toBe(0.91);
      expect(full.data.filterLatencyMs).toBe(1_800);
    }
  });

  it('RUN_EXTRACTION nhận filterRunMode ở cả hai chiều và từ chối giá trị lạ', () => {
    const modes = ['auto', 'force', 'off'] as const;
    for (const filterRunMode of modes) {
      expect(
        RuntimeMessageSchema.safeParse({
          to: 'background',
          type: 'RUN_EXTRACTION',
          documentId: 'doc_1',
          filterRunMode,
        }).success,
      ).toBe(true);
      expect(
        RuntimeMessageSchema.safeParse({
          to: 'offscreen',
          type: 'RUN_EXTRACTION',
          jobId: 'job_1',
          documentId: 'doc_1',
          filterRunMode,
        }).success,
      ).toBe(true);
    }
    expect(
      RuntimeMessageSchema.safeParse({
        to: 'background',
        type: 'RUN_EXTRACTION',
        documentId: 'doc_1',
        filterRunMode: 'luon_luon',
      }).success,
    ).toBe(false);
  });
});

describe('hợp đồng sự kiện với tags', () => {
  it('bản ghi cũ thiếu tags được đọc với mảng rỗng', () => {
    const parsed = EventSchema.parse(legacyEvent());
    expect(parsed.tags).toEqual([]);
  });

  it('chặn quá 5 nhãn hoặc nhãn quá dài', () => {
    const base = EventSchema.parse(legacyEvent());
    expect(() =>
      EventSchema.parse({ ...base, tags: Array.from({ length: MAX_EVENT_TAGS + 1 }, (_, i) => `tag ${i}`) }),
    ).toThrow();
    expect(() => EventSchema.parse({ ...base, tags: ['x'.repeat(25)] })).toThrow();
  });

  it('nhập JSON cũ không có tags không lỗi, xuất–nhập lại khôi phục tags', async () => {
    const summary = await importAll({
      app: 'lich-trinh-ca-nhan-demo',
      version: 1,
      exportedAt: NOW.toISOString(),
      documents: [],
      profiles: [],
      events: [legacyEvent()],
    });
    expect(summary).toEqual({ documents: 0, profiles: 0, events: 1, skipped: 0 });
    expect((await listEvents())[0]?.tags).toEqual([]);

    const tagged = makeEvent(
      {
        title: 'Sự kiện mới',
        label: 'cá_nhân',
        tags: ['đồ án', 'thư viện'],
        startValue: '2026-11-03T09:00',
        endValue: null,
        durationMinutesInput: null,
        summary: [],
        relatedProfiles: [],
        sources: [],
      },
      NOW,
    );
    await importAll({
      app: 'lich-trinh-ca-nhan-demo',
      version: 1,
      exportedAt: NOW.toISOString(),
      documents: [],
      profiles: [],
      events: [tagged],
    });

    const exported = await exportAll();
    const roundTrip = await importAll(exported);
    expect(roundTrip.skipped).toBe(0);
    const restored = (await listEvents()).find((event) => event.id === tagged.id);
    expect(restored?.tags).toEqual(['đồ án', 'thư viện']);
  });
});
