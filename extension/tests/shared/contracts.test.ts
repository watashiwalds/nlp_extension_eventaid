import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  EventCandidateSchema,
  EventSchema,
  ExtractionJobSchema,
  LlmSettingsSchema,
  MAX_EVENT_TAGS,
} from '../../src/shared/contracts';
import { makeEvent } from '../../src/core/events';
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
  it('bản ghi cũ thiếu origin được đọc là manual', () => {
    const parsed = EventSchema.parse(legacyEvent());
    expect(parsed.origin).toBe('manual');
    expect(parsed.extractionMeta).toBeUndefined();
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

  it('LlmSettings điền mặc định và từ chối giá trị ngoài ngưỡng', () => {
    const settings = LlmSettingsSchema.parse({});
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
    expect(ExtractionJobSchema.parse(job).status).toBe('queued');
    expect(() => ExtractionJobSchema.parse({ ...job, status: 'dang_chay' })).toThrow();
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
