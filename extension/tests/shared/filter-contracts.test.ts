import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTER_ENDPOINT,
  ExtractionJobSchema,
  FilterSettingsSchema,
} from '../../src/shared/contracts';
import { RuntimeMessageSchema } from '../../src/shared/messages';

const NOW = new Date(2026, 9, 21, 8, 0, 0);

describe('hợp đồng bước sàng lọc nội dung', () => {
  it('FilterSettings điền mặc định đã chốt và từ chối giá trị ngoài ngưỡng', () => {
    const settings = FilterSettingsSchema.parse({});
    expect(settings.mode).toBe('screen');
    expect(settings.endpoint).toBe(DEFAULT_FILTER_ENDPOINT);
    expect(settings.endpoint).toBe('http://127.0.0.1:8081');
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
