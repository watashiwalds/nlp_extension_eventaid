/**
 * Test tất định cho bộ mẫu đánh giá: kiểm tra công cụ đo và pipeline bằng
 * MockProvider. KHÔNG dùng số liệu ở đây để tuyên bố model đạt recall 80% —
 * con số nghiệm thu phải đến từ lần chạy `llama-server` thật.
 *
 * Các test theo từng "bẫy" (E01–E17) nằm ở `extraction.eval-cases.test.ts`;
 * helper chạy mẫu dùng chung nằm ở `case-harness.ts`.
 */
import { describe, expect, it } from 'vitest';
import { MOCK_MODEL } from '../../src/core/extraction/mock-provider';
import { candidateToEvent } from '../../src/core/extraction/normalize';
import { PROMPT_VERSION } from '../../src/core/extraction/prompt';
import { RawExtractionSchema } from '../../src/core/extraction/schema';
import { EVAL_CASES } from '../fixtures/eval/cases';
import { computeMetrics } from './metrics';
import { findCandidate, runCase } from './case-harness';

describe('bộ mẫu đánh giá', () => {
  it('có đủ 17 mẫu, id duy nhất và đúng thứ tự', () => {
    expect(EVAL_CASES).toHaveLength(17);
    expect(EVAL_CASES.map((item) => item.id)).toEqual(
      Array.from({ length: 17 }, (_, index) => `E${String(index + 1).padStart(2, '0')}`),
    );
    expect(new Set(EVAL_CASES.map((item) => item.id)).size).toBe(17);
  });

  it('mockOutput hợp lệ schema, ngày cho phép đúng định dạng và khớp số sự kiện', () => {
    for (const evalCaseItem of EVAL_CASES) {
      expect(RawExtractionSchema.safeParse(evalCaseItem.mockOutput).success, evalCaseItem.id).toBe(
        true,
      );
      expect(evalCaseItem.text.trim().length, evalCaseItem.id).toBeGreaterThan(0);
      expect(Number.isNaN(new Date(evalCaseItem.now).getTime()), evalCaseItem.id).toBe(false);
      expect(evalCaseItem.metrics.totalActual, evalCaseItem.id).toBe(
        evalCaseItem.mockOutput.events.length,
      );

      for (const date of evalCaseItem.allowedDates) {
        expect(date, `${evalCaseItem.id} allowedDates`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('có đủ nguồn trang thật, dán tay, vùng chọn và mẫu âm', () => {
    expect(EVAL_CASES.some((item) => item.source === 'web_page')).toBe(true);
    expect(EVAL_CASES.some((item) => item.source === 'paste')).toBe(true);
    expect(EVAL_CASES.some((item) => item.source === 'selection')).toBe(true);
    expect(EVAL_CASES.some((item) => item.category === 'negative')).toBe(true);
  });

  it('mọi ngày kỳ vọng đều nằm trong allowedDates', () => {
    for (const evalCaseItem of EVAL_CASES) {
      for (const event of evalCaseItem.expected) {
        const dates = [
          event.startValue?.slice(0, 10),
          event.startDate,
          event.endValue?.slice(0, 10),
          event.endDate,
        ].filter((date): date is string => Boolean(date));

        for (const date of dates) {
          expect(evalCaseItem.allowedDates, `${evalCaseItem.id} thiếu ${date}`).toContain(date);
        }
      }
    }
  });
});

describe.each(EVAL_CASES)('$id — $title', (evalCaseItem) => {
  it('khớp đáp án, giữ nguồn tạo và không sửa fixture', async () => {
    const snapshot = structuredClone(evalCaseItem);
    const { outcome, document } = await runCase(evalCaseItem);

    expect(evalCaseItem).toEqual(snapshot);
    expect(
      computeMetrics(
        outcome.items.map((item) => item.candidate),
        evalCaseItem.expected,
        evalCaseItem.allowedDates,
      ),
    ).toEqual(evalCaseItem.metrics);
    expect(outcome.items).toHaveLength(evalCaseItem.metrics.totalActual);
    if (evalCaseItem.id !== 'E14') expect(outcome.chunkCount).toBe(1);

    for (const item of outcome.items) {
      const event = candidateToEvent(
        item.candidate,
        { document, run: item.run },
        new Date(evalCaseItem.now),
      );

      expect(event.status).toBe('nhap');
      expect(event.origin).toBe('llm');
      expect(event.sources).toHaveLength(1);
      expect(event.sources[0]).toMatchObject({
        documentId: document.documentId,
        kind: document.source,
        title: document.title,
      });
      if (document.sourceUrl) expect(event.sources[0]?.url).toBe(document.sourceUrl);
      if (item.candidate.quote) expect(event.sources[0]?.quote).toBe(item.candidate.quote);
      expect(event.extractionMeta).toMatchObject({
        documentId: document.documentId,
        provider: 'mock',
        model: MOCK_MODEL,
        promptVersion: PROMPT_VERSION,
        chunkIndex: item.run.chunkIndex,
        chunkCount: outcome.chunkCount,
        confidence: item.candidate.confidence,
        latencyMs: item.run.latencyMs,
      });
      expect(event.notifications.milestones).toEqual([]);
    }

    for (const requirement of evalCaseItem.requiredUncertain ?? []) {
      const item = findCandidate(outcome.items, requirement.title);
      expect(item, `${evalCaseItem.id}: thiếu ${requirement.title}`).toBeDefined();
      expect(item?.candidate.uncertain).toEqual(expect.arrayContaining(requirement.keys));
    }

    for (const requirement of evalCaseItem.requiredProfiles ?? []) {
      const item = findCandidate(outcome.items, requirement.title);
      expect(item, `${evalCaseItem.id}: thiếu hồ sơ ${requirement.title}`).toBeDefined();

      const expectedIds = requirement.profileNames.map((name) => {
        const profile = (evalCaseItem.profiles ?? []).find((entry) => entry.name === name);
        expect(profile, `${evalCaseItem.id}: thiếu hồ sơ ${name}`).toBeDefined();
        return profile?.id;
      });
      expect(item?.candidate.relatedProfiles).toEqual(expect.arrayContaining(expectedIds));
      expect(item?.candidate.relatedProfiles).toHaveLength(expectedIds.length);
    }
  });
});
