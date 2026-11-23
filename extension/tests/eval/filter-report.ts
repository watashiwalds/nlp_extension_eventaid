/**
 * Ghi bản ghi + tổng hợp kết quả đo sàng lọc (TASK 04).
 * Module thuần: nhận bản ghi đã ghi, trả tổng hợp / in bảng — không gọi mạng.
 */
import type { FilterDecision, FilterMode } from '../../src/shared/contracts';
import type { FieldMetrics } from './field-metrics';
import { percentile } from './metrics';
import type { EvalMetrics } from './metrics';

export interface FilterRunRecord {
  caseId: string;
  kind: 'positive' | 'negative';
  mode: FilterMode;
  wallMs: number;
  /** Số lượt gọi `/chat/completions` thật (gồm retry). */
  providerCalls: number;
  /** Số đoạn đã chạy = số lượt LLM theo định nghĩa của kế hoạch TASK 04. */
  chunkCount: number;
  candidateCount: number;
  savedCount: number;
  duplicateCount: number;
  truncated: boolean;
  filterApplied: boolean;
  filterDecision: FilterDecision | null;
  filterConfidence: number | null;
  filterTotalSentences: number;
  filterLatencyMs: number;
  filterNote: string | null;
  models: string[];
  /** Chỉ mẫu dương: số đo trích xuất trên sự kiện đã lưu. */
  metrics?: EvalMetrics;
  fieldMetrics?: FieldMetrics;
  error?: string;
}

export interface FilterModeSummary {
  mode: FilterMode;
  docs: number;
  errors: number;
  llmCalls: number;
  savedEvents: number;
  positives: number;
  /** Mẫu dương bị screen bỏ qua (decision `no_event` + `applied`); 0 là mục tiêu. */
  positivesSkipped: number;
  negatives: number;
  negativesSkipped: number;
  /** Recall/precision gộp trên mẫu dương (từ `metrics`). */
  positiveRecall: number | null;
  positivePrecision: number | null;
  filterLatencyP95Ms: number | null;
  wallMsTotal: number;
  wallMsMedian: number | null;
}

export interface FilterSummary {
  modes: FilterModeSummary[];
  /** Mẫu dương bị screen bỏ qua: id + độ chắc chắn bộ lọc báo. */
  positivesSkippedDetail: Array<{ caseId: string; confidence: number | null }>;
  /** Sự kiện mất so với `off` trên mẫu dương: id + matched off → screen. */
  eventsLostDetail: Array<{ caseId: string; off: number; screen: number }>;
  /** Lượt LLM tiết kiệm của `screen` so với `off`. */
  llmCallsSavedByScreen: number;
  /** Thời gian tiết kiệm của `screen` so với `off` (ms, tổng wall time). */
  wallMsSavedByScreen: number;
  models: string[];
}

function matchedOf(record: FilterRunRecord | undefined): number {
  return record?.metrics?.matched ?? 0;
}

/** Bản ghi cho lần chạy ném lỗi (job không hoàn tất) — vẫn đủ trường để tổng hợp. */
export function errorRecord(
  filterCase: { id: string; kind: 'positive' | 'negative' },
  mode: FilterMode,
  error: unknown,
  wallMs: number,
): FilterRunRecord {
  return {
    caseId: filterCase.id,
    kind: filterCase.kind,
    mode,
    wallMs,
    providerCalls: 0,
    chunkCount: 0,
    candidateCount: 0,
    savedCount: 0,
    duplicateCount: 0,
    truncated: false,
    filterApplied: false,
    filterDecision: null,
    filterConfidence: null,
    filterTotalSentences: 0,
    filterLatencyMs: 0,
    filterNote: null,
    models: [],
    error: error instanceof Error ? error.message : String(error),
  };
}

function positiveRecall(records: FilterRunRecord[]): number | null {
  const withMetrics = records.filter((record) => record.metrics && record.kind === 'positive');
  const matched = withMetrics.reduce((sum, record) => sum + (record.metrics?.matched ?? 0), 0);
  const expected = withMetrics.reduce(
    (sum, record) => sum + (record.metrics?.matched ?? 0) + (record.metrics?.missed ?? 0),
    0,
  );
  return expected === 0 ? null : matched / expected;
}

function positivePrecision(records: FilterRunRecord[]): number | null {
  const withMetrics = records.filter((record) => record.metrics && record.kind === 'positive');
  const matched = withMetrics.reduce((sum, record) => sum + (record.metrics?.matched ?? 0), 0);
  const totalActual = withMetrics.reduce((sum, record) => sum + (record.metrics?.totalActual ?? 0), 0);
  return totalActual === 0 ? null : matched / totalActual;
}

export function summarizeMode(records: readonly FilterRunRecord[], mode: FilterMode): FilterModeSummary {
  const rows = records.filter((record) => record.mode === mode);
  const positives = rows.filter((record) => record.kind === 'positive');
  const negatives = rows.filter((record) => record.kind === 'negative');
  return {
    mode,
    docs: rows.length,
    errors: rows.filter((record) => record.error).length,
    llmCalls: rows.reduce((sum, record) => sum + record.chunkCount, 0),
    savedEvents: rows.reduce((sum, record) => sum + record.savedCount, 0),
    positives: positives.length,
    positivesSkipped: positives.filter(
      (record) => record.filterDecision === 'no_event' && record.filterApplied,
    ).length,
    negatives: negatives.length,
    negativesSkipped: negatives.filter(
      (record) => record.filterDecision === 'no_event' && record.filterApplied,
    ).length,
    positiveRecall: positiveRecall(positives),
    positivePrecision: positivePrecision(positives),
    filterLatencyP95Ms: percentile(
      rows.map((record) => record.filterLatencyMs),
      0.95,
    ),
    wallMsTotal: rows.reduce((sum, record) => sum + record.wallMs, 0),
    wallMsMedian: percentile(
      rows.map((record) => record.wallMs),
      0.5,
    ),
  };
}

/** Tổng hợp 3 chế độ + so sánh `screen` với `off` (baseline). */
export function buildFilterSummary(records: readonly FilterRunRecord[]): FilterSummary {
  const modes = (['off', 'report', 'screen'] as const).map((mode) => summarizeMode(records, mode));
  const byKey = (caseId: string, mode: FilterMode) =>
    records.find((record) => record.caseId === caseId && record.mode === mode);

  const positivesSkippedDetail = records
    .filter(
      (record) =>
        record.kind === 'positive' &&
        record.mode === 'screen' &&
        record.filterDecision === 'no_event' &&
        record.filterApplied,
    )
    .map((record) => ({ caseId: record.caseId, confidence: record.filterConfidence }));

  const positiveIds = [...new Set(records.filter((r) => r.kind === 'positive').map((r) => r.caseId))];
  const eventsLostDetail = positiveIds
    .map((caseId) => ({
      caseId,
      off: matchedOf(byKey(caseId, 'off')),
      screen: matchedOf(byKey(caseId, 'screen')),
    }))
    .filter((entry) => entry.screen < entry.off);

  const off = modes.find((mode) => mode.mode === 'off');
  const screen = modes.find((mode) => mode.mode === 'screen');
  return {
    modes,
    positivesSkippedDetail,
    eventsLostDetail,
    llmCallsSavedByScreen: (off?.llmCalls ?? 0) - (screen?.llmCalls ?? 0),
    wallMsSavedByScreen: (off?.wallMsTotal ?? 0) - (screen?.wallMsTotal ?? 0),
    models: [...new Set(records.flatMap((record) => record.models))],
  };
}

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`;
}

export function printFilterSummary(
  records: readonly FilterRunRecord[],
  context: { endpoint: string; filterEndpoint: string; caseCount: number },
): FilterSummary {
  const summary = buildFilterSummary(records);

  console.log('\n## Bảng 3 chế độ sàng lọc\n');
  console.log(
    '| Chế độ | Tài liệu | Lỗi | Lượt LLM | SK lưu | Dương bỏ sót | Âm bỏ qua | Recall (dương) | Precision (dương) | Filter p95 (s) | Tổng thời gian (s) |',
  );
  console.log('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const mode of summary.modes) {
    console.log(
      `| ${mode.mode} | ${mode.docs} | ${mode.errors} | ${mode.llmCalls} | ${mode.savedEvents} | ${mode.positivesSkipped} | ${mode.negativesSkipped}/${mode.negatives} | ${formatPercent(mode.positiveRecall)} | ${formatPercent(mode.positivePrecision)} | ${
        mode.filterLatencyP95Ms === null ? '—' : (mode.filterLatencyP95Ms / 1_000).toFixed(2)
      } | ${(mode.wallMsTotal / 1_000).toFixed(1)} |`,
    );
  }

  console.log('\n## Tiết kiệm của screen so với off\n');
  const off = summary.modes.find((mode) => mode.mode === 'off');
  console.log(
    `- Lượt LLM: off=${off?.llmCalls ?? '—'} → screen giảm ${summary.llmCallsSavedByScreen} lượt` +
      (off?.llmCalls ? ` (${((summary.llmCallsSavedByScreen / off.llmCalls) * 100).toFixed(1)}%)` : ''),
  );
  console.log(`- Thời gian tổng: giảm ${(summary.wallMsSavedByScreen / 1_000).toFixed(1)} s`);
  console.log(`- Mẫu dương bị bỏ: ${summary.positivesSkippedDetail.length ? JSON.stringify(summary.positivesSkippedDetail) : '0'}`);
  console.log(`- Sự kiện mất so với off (mẫu dương): ${summary.eventsLostDetail.length ? JSON.stringify(summary.eventsLostDetail) : '0'}`);
  console.log(`- Model: ${summary.models.join(', ') || '(không rõ)'}`);

  const failed = records.filter((record) => record.error);
  if (failed.length > 0) {
    console.log('\n## Lỗi theo mẫu\n');
    for (const record of failed) {
      console.log(`- ${record.caseId}/${record.mode}: ${record.error}`);
    }
  }

  console.log('\n## FILTER_LIVE_JSON_BEGIN');
  console.log(
    JSON.stringify(
      {
        endpoint: context.endpoint,
        filterEndpoint: context.filterEndpoint,
        caseCount: context.caseCount,
        summary,
        results: records,
      },
      null,
      2,
    ),
  );
  console.log('FILTER_LIVE_JSON_END');
  return summary;
}
