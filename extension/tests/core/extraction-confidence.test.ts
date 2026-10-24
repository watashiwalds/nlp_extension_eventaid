import { describe, expect, it } from 'vitest';
import { confidenceLevel, eventConfidenceLevel } from '../../src/core/extraction/confidence';
import { makeEvent } from '../../src/core/events';
import type { ExtractionMeta } from '../../src/shared/contracts';

const NOW = new Date(2026, 9, 22, 8, 0, 0);

function meta(confidence: number): ExtractionMeta {
  return {
    runId: 'run-1',
    documentId: 'doc-1',
    provider: 'mock',
    model: 'test',
    promptVersion: 'v4',
    chunkIndex: 0,
    chunkCount: 1,
    confidence,
    latencyMs: 100,
  };
}

function event(confidence?: number) {
  return makeEvent(
    {
      title: 'Họp nhóm',
      label: 'công_vụ',
      startValue: '2026-11-02T09:00',
      endValue: null,
      durationMinutesInput: null,
      summary: [],
      relatedProfiles: [],
      sources: [],
      ...(confidence === undefined ? {} : { origin: 'llm' as const, extractionMeta: meta(confidence) }),
    },
    NOW,
  );
}

describe('confidence level', () => {
  it('chia ba mức theo ngưỡng 0.5 và 0.8', () => {
    expect(confidenceLevel(0)).toBe('thap');
    expect(confidenceLevel(0.49)).toBe('thap');
    expect(confidenceLevel(0.5)).toBe('vua');
    expect(confidenceLevel(0.79)).toBe('vua');
    expect(confidenceLevel(0.8)).toBe('cao');
    expect(confidenceLevel(1)).toBe('cao');
  });

  it('sự kiện nhập tay không có confidence', () => {
    expect(eventConfidenceLevel(event())).toBeNull();
  });

  it('sự kiện máy đề xuất đọc confidence từ extractionMeta', () => {
    expect(eventConfidenceLevel(event(0.62))).toBe('vua');
  });
});
