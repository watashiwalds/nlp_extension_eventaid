/**
 * Dựng phụ trợ chạy `runExtractionJob` cho bộ mẫu sàng lọc (TASK 04): tài liệu
 * `web_page`, DB in-memory **mới cho mỗi lần chạy** (kết quả 3 chế độ không dedup
 * lẫn nhau), đếm lượt gọi provider. Dùng chung cho test tất định và harness live.
 */
import type { ExtractionProgress } from '../../src/core/extraction/pipeline';
import type { ContentFilter } from '../../src/core/ports/content-filter';
import type {
  InferenceProvider,
  InferenceRequest,
  InferenceResult,
} from '../../src/core/ports/inference';
import { runExtractionJob } from '../../src/platform/offscreen/run-job';
import type { ExtractionJobDeps, ExtractionJobResult } from '../../src/platform/offscreen/run-job';
import { DEFAULT_FILTER_SETTINGS } from '../../src/platform/storage/filter-settings';
import type {
  Event,
  EventCandidate,
  FilterMode,
  FilterSettings,
  LlmSettings,
  NormalizedDocument,
} from '../../src/shared/contracts';
import { LlmSettingsSchema } from '../../src/shared/contracts';
import type { FilterEvalCase } from '../fixtures/filter/case-types';
import { computeFieldMetrics } from './field-metrics';
import { computeMetrics } from './metrics';
import type { FilterRunRecord } from './filter-report';

/** Cấu hình LLM đo: giống harness Slice E/postcheck (5k × 4 đoạn, temp 0,1). */
export const FILTER_RUN_SETTINGS = {
  chunkChars: 5_000,
  maxChunks: 4,
  maxTokens: 1_200,
  temperature: 0.1,
};

export function filterLlmSettings(endpoint: string): LlmSettings {
  return LlmSettingsSchema.parse({
    endpoint,
    temperature: FILTER_RUN_SETTINGS.temperature,
    maxTokens: FILTER_RUN_SETTINGS.maxTokens,
    timeoutMs: 120_000,
    chunkChars: FILTER_RUN_SETTINGS.chunkChars,
    maxChunks: FILTER_RUN_SETTINGS.maxChunks,
  });
}

export function filterDocumentFor(filterCase: FilterEvalCase): NormalizedDocument {
  return {
    documentId: `doc_filter_${filterCase.id.toLowerCase()}`,
    source: filterCase.source,
    title: filterCase.title,
    text: filterCase.text,
    sourceUrl: filterCase.sourceUrl,
    capturedAt: new Date(filterCase.now).toISOString(),
    extractionMethod: 'readability',
    contentHash: `hash_filter_${filterCase.id}`,
    truncated: false,
    charCount: filterCase.text.length,
  };
}

/** Adapter nhỏ `Event` (đã lưu) → `EventCandidate` để chấm `computeMetrics`. */
export function eventToCandidate(event: Event): EventCandidate {
  const quote = event.sources.find((source) => source.quote)?.quote;
  return {
    title: event.title,
    label: event.label,
    start: event.start,
    end: event.end,
    durationMinutes: event.durationMinutes,
    summary: event.summary,
    relatedProfiles: event.relatedProfiles,
    confidence: event.extractionMeta?.confidence ?? 0.5,
    uncertain: event.validation.uncertain,
    ...(quote ? { quote } : {}),
  };
}

export interface ProviderCallStats {
  run: number;
  models: Set<string>;
}

/** Bọc provider để đếm lượt `/chat/completions` thật (gồm cả retry). */
export function countingProvider(inner: InferenceProvider): {
  provider: InferenceProvider;
  stats: ProviderCallStats;
} {
  const stats: ProviderCallStats = { run: 0, models: new Set<string>() };
  const provider: InferenceProvider = {
    id: inner.id,
    health: () => inner.health(),
    run: async (request: InferenceRequest): Promise<InferenceResult> => {
      stats.run += 1;
      const result = await inner.run(request);
      stats.models.add(result.model);
      return result;
    },
  };
  return { provider, stats };
}

export interface FilterRunParts {
  llmSettings: LlmSettings;
  /** Factory: mỗi lần chạy một provider mới (giống factory trong offscreen). */
  createProvider: () => InferenceProvider;
  filter: ContentFilter;
}

export interface FilterRunOutcome {
  result: ExtractionJobResult;
  saved: Event[];
  wallMs: number;
  providerCalls: number;
  models: string[];
  progress: ExtractionProgress[];
}

/** Chạy một tài liệu ở một chế độ; DB/`listEvents` mới hoàn toàn cho lần chạy này. */
export async function runFilterCase(
  filterCase: FilterEvalCase,
  mode: FilterMode,
  parts: FilterRunParts,
): Promise<FilterRunOutcome> {
  const document = filterDocumentFor(filterCase);
  const saved: Event[] = [];
  const progress: ExtractionProgress[] = [];
  const filterSettings: FilterSettings = { ...DEFAULT_FILTER_SETTINGS, mode };
  const { provider, stats } = countingProvider(parts.createProvider());
  const started = Date.now();

  const deps: ExtractionJobDeps = {
    getDocument: async () => document,
    listProfiles: async () => [],
    listEvents: async () => [],
    loadLlmSettings: async () => parts.llmSettings,
    loadFilterSettings: async () => filterSettings,
    saveEvent: async (event) => {
      saved.push(event);
    },
    createProvider: () => provider,
    createFilter: () => parts.filter,
    now: () => new Date(filterCase.now),
  };

  const result = await runExtractionJob(document.documentId, deps, (item) => progress.push(item));
  return {
    result,
    saved,
    wallMs: Date.now() - started,
    providerCalls: stats.run,
    models: [...stats.models],
    progress,
  };
}

/** Ghi kết quả một lần chạy thành `FilterRunRecord`; mẫu dương được chấm metrics. */
export function recordFromOutcome(
  filterCase: FilterEvalCase,
  mode: FilterMode,
  outcome: FilterRunOutcome,
): FilterRunRecord {
  const candidates = outcome.saved.map(eventToCandidate);
  const isPositive = filterCase.kind === 'positive';
  return {
    caseId: filterCase.id,
    kind: filterCase.kind,
    mode,
    wallMs: outcome.wallMs,
    providerCalls: outcome.providerCalls,
    chunkCount: outcome.result.chunkCount,
    candidateCount: outcome.result.candidateCount,
    savedCount: outcome.result.savedCount,
    duplicateCount: outcome.result.duplicateCount,
    truncated: outcome.result.truncated,
    filterApplied: outcome.result.filterApplied,
    filterDecision: outcome.result.filterDecision,
    filterConfidence: outcome.result.filterConfidence,
    filterTotalSentences: outcome.result.filterTotalSentences,
    filterLatencyMs: outcome.result.filterLatencyMs,
    filterNote: outcome.result.filterNote,
    models: outcome.models,
    ...(isPositive
      ? {
          metrics: computeMetrics(candidates, filterCase.goldEvents, filterCase.allowedDates),
          fieldMetrics: computeFieldMetrics(candidates, filterCase.goldEvents),
        }
      : {}),
  };
}
