import { describe, expect, it } from 'vitest';
import { makeEvent, updateEvent } from '../../src/core/events';
import type { EventInput } from '../../src/core/events';
import {
  countDrafts,
  draftTimeWarning,
  needsReviewAttention,
  pruneDraftSelectionIds,
  sortDraftsForReview,
} from '../../src/core/event-review';
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

function input(patch: Partial<EventInput> = {}): EventInput {
  return {
    title: 'Họp nhóm',
    label: 'công_vụ',
    startValue: '2026-11-02T09:00',
    endValue: null,
    durationMinutesInput: null,
    summary: [],
    relatedProfiles: [],
    sources: [],
    ...patch,
  };
}

function llm(confidence: number, patch: Partial<EventInput> = {}) {
  return makeEvent(
    { ...input(patch), origin: 'llm', extractionMeta: meta(confidence) },
    NOW,
  );
}

describe('review order', () => {
  it('xếp llm cần chú ý → llm thường → nhập tay', () => {
    const manual = makeEvent(input({ title: 'Cá nhân' }), NOW);
    const high = llm(0.9, {
      title: 'Họp nhóm',
      endValue: '2026-11-02T10:00',
      relatedProfiles: ['p1'],
    });
    const low = llm(0.2, { title: 'Bảo vệ đồ án' });

    const sorted = sortDraftsForReview([manual, high, low]);
    expect(sorted.map((event) => event.id)).toEqual([low.id, high.id, manual.id]);
  });

  it('cờ uncertain cũng đưa nháp llm lên nhóm ưu tiên', () => {
    const uncertain = llm(0.9, { startValue: null, startDate: '2026-11-02' });
    const normal = llm(0.9, { title: 'Khác', relatedProfiles: ['p1'] });
    expect(needsReviewAttention(uncertain)).toBe(true);
    expect(sortDraftsForReview([normal, uncertain])[0]?.id).toBe(uncertain.id);
  });

  it('không đổi thứ tự thời gian trong cùng nhóm', () => {
    const later = llm(0.9, { title: 'Sau', startValue: '2026-11-05T09:00' });
    const sooner = llm(0.9, { title: 'Trước', startValue: '2026-11-02T09:00' });
    expect(sortDraftsForReview([later, sooner]).map((event) => event.title)).toEqual([
      'Trước',
      'Sau',
    ]);
  });
});

describe('cảnh báo thời điểm và lựa chọn', () => {
  it('đếm đúng nháp chỉ có ngày và không có thời điểm', () => {
    const dateOnly = makeEvent(input({ startValue: null, startDate: '2026-11-02' }), NOW);
    const noTime = makeEvent(input({ startValue: null, startDate: null, startRaw: 'tuần sau' }), NOW);
    const full = makeEvent(input(), NOW);

    const warning = draftTimeWarning([dateOnly, noTime, full]);
    expect(warning.dateOnly).toBe(1);
    expect(warning.noTime).toBe(1);
    expect(warning.total).toBe(2);
  });

  it('đếm và làm sạch lựa chọn nháp', () => {
    const draft = makeEvent(input(), NOW);
    const tracked = { ...draft, id: 'evt-tracked', status: 'dang_theo_doi' as const };

    expect(countDrafts([draft, tracked])).toBe(1);
    expect(pruneDraftSelectionIds([draft.id, tracked.id, 'missing'], [draft, tracked])).toEqual([
      draft.id,
    ]);
  });
});

describe('sửa nội dung nháp', () => {
  it('giữ origin và extractionMeta', () => {
    const original = llm(0.7);
    const edited = updateEvent(original, input({ title: 'Họp nhóm đổi tên' }), NOW);
    expect(edited.origin).toBe('llm');
    expect(edited.extractionMeta?.confidence).toBe(0.7);
    expect(edited.title).toBe('Họp nhóm đổi tên');
  });
});
