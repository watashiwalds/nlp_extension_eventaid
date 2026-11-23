/**
 * Test TẤT ĐỊNH cho harness đo sàng lọc (TASK 04) — dùng `MockContentFilter`
 * đóng vai "bộ lọc hoàn hảo" theo ground truth của fixture và `MockProvider`
 * cho LLM. Mục đích: chứng minh công cụ đo + fixture + wiring job chạy đúng
 * (dương được gọi LLM, âm bị bỏ qua, không mất sự kiện khi bật screen).
 * Đây là test hành vi, KHÔNG dùng để tuyên bố độ chính xác của PhoBERT —
 * phần đó thuộc `filter.live.eval.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { chunkText } from '../../src/core/extraction/chunk';
import { MOCK_EXTRACTION, MockProvider } from '../../src/core/extraction/mock-provider';
import {
  MockContentFilter,
  mockAnalysis,
  mockTaskAnalysis,
} from '../../src/core/extraction/mock-filter';
import type { InferenceProvider } from '../../src/core/ports/inference';
import type { FilterMode } from '../../src/shared/contracts';
import { FILTER_REPORT_NOTE } from '../../src/shared/constants';
import type { FilterEvalCase } from '../fixtures/filter/case-types';
import { EVAL_NOW } from '../fixtures/eval/case-types';
import { FILTER_EVAL_CASES, FILTER_NEGATIVE, FILTER_POSITIVE } from '../fixtures/filter/cases';
import {
  eventToCandidate,
  filterLlmSettings,
  recordFromOutcome,
  runFilterCase,
} from './filter-harness';
import type { FilterRunRecord } from './filter-report';
import { summarizeMode } from './filter-report';
import { computeMetrics } from './metrics';

const POSITIVE_IDS = [
  'E01',
  'E02',
  'E03',
  'E04',
  'E05',
  'E07',
  'E08',
  'E09',
  'E10',
  'E11',
  'E12',
  'E13',
  'E14',
  'E15',
];
const NEGATIVE_IDS = [
  'E06',
  'N01',
  'N02',
  'N03',
  'N04',
  'N05',
  'N06',
  'N07',
  'N08',
  'N09',
  'N10',
  'N11',
  'N12',
];

const llmSettings = filterLlmSettings('http://127.0.0.1:8080');

/** Bộ lọc hoàn hảo: trả lời đúng theo ground truth của từng mẫu. */
function oracleFilter(filterCase: FilterEvalCase): MockContentFilter {
  return new MockContentFilter([
    filterCase.expectedDecision === 'has_event' ? mockTaskAnalysis() : mockAnalysis(),
  ]);
}

function mockParts(filterCase: FilterEvalCase) {
  return {
    llmSettings,
    createProvider: (): InferenceProvider => new MockProvider(() => MOCK_EXTRACTION),
    filter: oracleFilter(filterCase),
  };
}

async function runRecord(
  filterCase: FilterEvalCase,
  mode: FilterMode,
): Promise<FilterRunRecord> {
  const outcome = await runFilterCase(filterCase, mode, mockParts(filterCase));
  return recordFromOutcome(filterCase, mode, outcome);
}

describe('bộ mẫu sàng lọc (freeze cấu trúc)', () => {
  it('đúng 14 dương + 13 âm, mọi mẫu ép nguồn web_page', () => {
    expect(FILTER_POSITIVE.map((item) => item.id)).toEqual(POSITIVE_IDS);
    expect(FILTER_NEGATIVE.map((item) => item.id)).toEqual(NEGATIVE_IDS);

    for (const item of FILTER_EVAL_CASES) {
      expect(item.source).toBe('web_page');
      expect(item.sourceUrl).toMatch(/^https:\/\/example\.com\/eval\//);
      expect(item.now).toBe(EVAL_NOW);
      expect(item.goldEvents.length > 0).toBe(item.kind === 'positive');
      expect(item.expectedDecision).toBe(item.kind === 'positive' ? 'has_event' : 'no_event');
      if (item.kind === 'positive') {
        expect(item.allowedDates.length).toBeGreaterThan(0);
      }
    }

    const texts = new Set(FILTER_EVAL_CASES.map((item) => item.text));
    expect(texts.size).toBe(FILTER_EVAL_CASES.length);
  });

  it('mẫu âm tự soạn (N01–N12) có ít nhất 5 câu', () => {
    // E06 tái dùng nguyên văn từ bộ E đã freeze (3 câu, vẫn ≥ ngưỡng
    // minSentencesToSkip = 3), nên yêu cầu ≥ 5 câu chỉ áp dụng cho mẫu mới.
    for (const item of FILTER_NEGATIVE) {
      if (item.id === 'E06') continue;
      const sentenceCount = item.text.split(/[.!?](?:\s|$)/).filter((part) => part.trim()).length;
      expect(sentenceCount).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('harness đo với bộ lọc chuẩn', () => {
  it('screen: mẫu dương gọi LLM, mẫu âm bị bỏ qua không tạo provider', async () => {
    const records: FilterRunRecord[] = [];
    for (const filterCase of FILTER_EVAL_CASES) {
      records.push(await runRecord(filterCase, 'screen'));
    }

    for (const record of records) {
      if (record.kind === 'positive') {
        expect(record.filterDecision).toBe('has_event');
        expect(record.filterApplied).toBe(true);
        expect(record.chunkCount).toBeGreaterThanOrEqual(1);
        expect(record.providerCalls).toBe(record.chunkCount);
        expect(record.savedCount).toBe(MOCK_EXTRACTION.events.length);
      } else {
        expect(record.filterDecision).toBe('no_event');
        expect(record.filterApplied).toBe(true);
        expect(record.filterConfidence).toBe(0.95);
        expect(record.chunkCount).toBe(0);
        expect(record.providerCalls).toBe(0);
        expect(record.savedCount).toBe(0);
      }
    }

    const summary = summarizeMode(records, 'screen');
    expect(summary.positivesSkipped).toBe(0);
    expect(summary.negativesSkipped).toBe(FILTER_NEGATIVE.length);
    // Số lượt LLM = tổng số đoạn: 13 mẫu ngắn 1 đoạn, E14 dài được cắt 4 đoạn.
    const expectedCalls = FILTER_POSITIVE.reduce(
      (sum, item) =>
        sum + chunkText(item.text, { chunkChars: 5_000, maxChunks: 4 }).chunks.length,
      0,
    );
    expect(summary.llmCalls).toBe(expectedCalls);
  });

  it('report: không bỏ tài liệu nào, mẫu âm vẫn gọi LLM kèm ghi chú chế độ', async () => {
    const negative = FILTER_NEGATIVE[0];
    if (!negative) throw new Error('thiếu mẫu âm');
    const record = await runRecord(negative, 'report');

    expect(record.filterDecision).toBe('no_event');
    expect(record.filterApplied).toBe(true);
    expect(record.chunkCount).toBe(1);
    expect(record.savedCount).toBe(MOCK_EXTRACTION.events.length);
    expect(record.filterNote).toBe(FILTER_REPORT_NOTE);

    const positive = FILTER_POSITIVE[0];
    if (!positive) throw new Error('thiếu mẫu dương');
    const positiveRecord = await runRecord(positive, 'report');
    expect(positiveRecord.filterDecision).toBe('has_event');
    expect(positiveRecord.filterNote).toBeNull();
  });

  it('off: không chạy sàng lọc (filterDecision null)', async () => {
    const positive = FILTER_POSITIVE[0];
    if (!positive) throw new Error('thiếu mẫu dương');
    const record = await runRecord(positive, 'off');

    expect(record.filterDecision).toBeNull();
    expect(record.filterApplied).toBe(false);
    expect(record.filterLatencyMs).toBe(0);
    expect(record.savedCount).toBe(MOCK_EXTRACTION.events.length);
  });

  it('screen không làm mất sự kiện so với off (cùng provider, chấm qua adapter Event → Candidate)', async () => {
    const positive = FILTER_POSITIVE[0];
    if (!positive) throw new Error('thiếu mẫu dương');

    const offOutcome = await runFilterCase(positive, 'off', mockParts(positive));
    const screenOutcome = await runFilterCase(positive, 'screen', mockParts(positive));

    const offMetrics = computeMetrics(
      offOutcome.saved.map(eventToCandidate),
      positive.goldEvents,
      positive.allowedDates,
    );
    const screenMetrics = computeMetrics(
      screenOutcome.saved.map(eventToCandidate),
      positive.goldEvents,
      positive.allowedDates,
    );
    expect(screenMetrics).toEqual(offMetrics);
    // MockProvider không cung cấp ngày cho sự kiện thứ hai (startRaw "20/11"
    // không đủ để ghép cổng ngày), nên chỉ khẳng định không mất gì so với off.
    expect(screenMetrics.matched).toBe(offMetrics.matched);
    expect(screenMetrics.matched).toBeGreaterThan(0);
    expect(screenOutcome.saved.map((event) => event.title)).toEqual(
      offOutcome.saved.map((event) => event.title),
    );
  });
});
