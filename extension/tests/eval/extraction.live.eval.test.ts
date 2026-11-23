/**
 * Đo thật bằng `llama-server` cho bộ mẫu Slice E.
 *
 * Chỉ chạy khi đặt `LLAMA_EVAL=1`; mặc định bị skip để CI không cần model/GPU.
 * Kết quả in ra console, không ghi vào DB và không tự sửa fixture.
 *
 * Cách chạy:
 *   LLAMA_EVAL=1 npx vitest run tests/eval/extraction.live.eval.test.ts \
 *     --reporter=verbose --disableConsoleIntercept
 */
import { describe, it } from 'vitest';
import { candidateDedupInput } from '../../src/core/extraction/dedup';
import { candidateToEvent } from '../../src/core/extraction/normalize';
import { extractEvents } from '../../src/core/extraction/pipeline';
import type { ExtractionOutcome } from '../../src/core/extraction/pipeline';
import { suggestDuplicates } from '../../src/core/extraction/similar';
import { parseRawExtraction } from '../../src/core/extraction/schema';
import type { DedupInput } from '../../src/core/extraction/types';
import { LlamaCppProvider } from '../../src/platform/inference/llama-cpp';
import type {
  InferenceHealth,
  InferenceProvider,
  InferenceRequest,
  InferenceResult,
} from '../../src/core/ports/inference';
import type { EventCandidate, NormalizedDocument } from '../../src/shared/contracts';
import { EVAL_CASES } from '../fixtures/eval/cases';
import type { EvalCase } from '../fixtures/eval/cases';
import { HELDOUT_CASES } from '../fixtures/eval-heldout/cases';
import type { HeldoutCase } from '../fixtures/eval-heldout/case-types';
import { computeMetrics, percentile } from './metrics';
import type { EvalMetrics } from './metrics';

declare const process: { env: Record<string, string | undefined> };

const LIVE = process.env.LLAMA_EVAL === '1';
const ENDPOINT = process.env.LLAMA_ENDPOINT ?? 'http://127.0.0.1:8080';
/** `EVAL_SET=heldout` chạy bộ giữ kín 50 mẫu (TASK 03); mặc định chạy dev E01–E17. */
const USE_HELDOUT = process.env.EVAL_SET === 'heldout';
/**
 * `HeldoutCase` = `EvalCase` thiếu `mockOutput`/`metrics` (chỉ chạy live nên
 * không cần MockProvider). Hai kiểu dùng chung mọi trường harness cần.
 */
type LiveCase = EvalCase | HeldoutCase;
const CASES: readonly LiveCase[] = USE_HELDOUT ? HELDOUT_CASES : EVAL_CASES;
const SETTINGS = { chunkChars: 5_000, maxChunks: 4, maxTokens: 1_200, temperature: 0.1 };
const CASE_TIMEOUT_MS = 15 * 60 * 1_000;

type RunKind = 'fresh' | 'rescan' | 'paraphrase';

interface ItemSummary {
  title: string;
  startValue: string | null;
  startDate: string | null;
  endValue: string | null;
  uncertain: string[];
  confidence: number;
  quote: string;
}

interface RunRecord {
  caseId: string;
  run: number;
  kind: RunKind;
  latencyMs: number;
  chunkCount: number;
  truncated: boolean;
  totalActual: number;
  duplicateCount: number;
  providerCalls: number;
  invalidResponses: number;
  models: string[];
  metrics?: EvalMetrics;
  newRecords?: number;
  suggestionCounts?: number[];
  error?: string;
  items: ItemSummary[];
}

interface RunOutput {
  record: RunRecord;
  outcome: ExtractionOutcome | null;
  document: NormalizedDocument;
}

const RESULTS: RunRecord[] = [];

class RecordingProvider implements InferenceProvider {
  readonly id = 'llama.cpp' as const;
  calls = 0;
  invalid = 0;
  readonly models = new Set<string>();

  constructor(private readonly inner: LlamaCppProvider) {}

  health(): Promise<InferenceHealth> {
    return this.inner.health();
  }

  async run(request: InferenceRequest): Promise<InferenceResult> {
    this.calls += 1;
    const result = await this.inner.run(request);
    this.models.add(result.model);
    if (!parseRawExtraction(result.raw).ok) this.invalid += 1;
    return result;
  }
}

function documentFor(evalCaseItem: LiveCase, text = evalCaseItem.text): NormalizedDocument {
  const extractionMethod: NormalizedDocument['extractionMethod'] =
    evalCaseItem.source === 'web_page'
      ? 'readability'
      : evalCaseItem.source === 'selection'
        ? 'selection'
        : 'paste';

  return {
    documentId: `doc_live_${evalCaseItem.id.toLowerCase()}`,
    source: evalCaseItem.source,
    title: evalCaseItem.title,
    text,
    ...(evalCaseItem.sourceUrl ? { sourceUrl: evalCaseItem.sourceUrl } : {}),
    capturedAt: new Date(evalCaseItem.now).toISOString(),
    extractionMethod,
    contentHash: `hash_live_${evalCaseItem.id}`,
    truncated: false,
    charCount: text.length,
    ...(evalCaseItem.source === 'selection' ? { selection: text } : {}),
  };
}

function summarize(candidate: EventCandidate): ItemSummary {
  return {
    title: candidate.title,
    startValue: candidate.start.value,
    startDate: candidate.start.date,
    endValue: candidate.end?.value ?? null,
    uncertain: candidate.uncertain,
    confidence: candidate.confidence,
    quote: candidate.quote ?? '',
  };
}

async function runOnce(
  evalCaseItem: LiveCase,
  run: number,
  kind: RunKind,
  options: { text?: string; existing?: DedupInput[] } = {},
): Promise<RunOutput> {
  const document = documentFor(evalCaseItem, options.text);
  const provider = new RecordingProvider(
    new LlamaCppProvider({ endpoint: ENDPOINT, timeoutMs: 240_000 }),
  );
  const started = Date.now();

  try {
    const outcome = await extractEvents({
      document,
      profiles: evalCaseItem.profiles ?? [],
      settings: SETTINGS,
      provider,
      now: new Date(evalCaseItem.now),
      ...(options.existing ? { existing: options.existing } : {}),
    });
    const candidates = outcome.items.map((item) => item.candidate);
    const record: RunRecord = {
      caseId: evalCaseItem.id,
      run,
      kind,
      latencyMs: Date.now() - started,
      chunkCount: outcome.chunkCount,
      truncated: outcome.truncated,
      totalActual: candidates.length,
      duplicateCount: outcome.duplicates.length,
      providerCalls: provider.calls,
      invalidResponses: provider.invalid,
      models: [...provider.models],
      ...(kind === 'rescan'
        ? { newRecords: candidates.length }
        : { metrics: computeMetrics(candidates, evalCaseItem.expected, evalCaseItem.allowedDates) }),
      items: candidates.map(summarize),
    };
    RESULTS.push(record);
    return { record, outcome, document };
  } catch (error) {
    const record: RunRecord = {
      caseId: evalCaseItem.id,
      run,
      kind,
      latencyMs: Date.now() - started,
      chunkCount: 0,
      truncated: false,
      totalActual: 0,
      duplicateCount: 0,
      providerCalls: provider.calls,
      invalidResponses: provider.invalid,
      models: [...provider.models],
      error: error instanceof Error ? error.message : String(error),
      items: [],
    };
    RESULTS.push(record);
    return { record, outcome: null, document };
  }
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

describe.runIf(LIVE)('đo thật bằng llama-server', () => {
  it('kiểm tra kết nối và model đang nạp', async () => {
    const health = await new LlamaCppProvider({ endpoint: ENDPOINT }).health();
    if (!health.ok) throw new Error(`llama-server không sẵn sàng: ${health.reason}`);
    console.log(
      `\n[Slice E] set=${USE_HELDOUT ? 'heldout (50 mẫu)' : 'dev E01–E17'} endpoint=${ENDPOINT} model=${health.model ?? '(không đọc được)'}`,
    );
  });

  describe.each(CASES)('$id — $title', (evalCaseItem) => {
    it(
      'chạy 2 lần và ghi số đo',
      async () => {
        const first = await runOnce(evalCaseItem, 1, 'fresh');

        if (evalCaseItem.id === 'E12') {
          const existing = (first.outcome?.items ?? []).map((item) =>
            candidateDedupInput(item.candidate),
          );
          const second = await runOnce(evalCaseItem, 2, 'rescan', { existing });
          const paraphrase = evalCaseItem.paraphrase;
          const third = paraphrase
            ? await runOnce(evalCaseItem, 3, 'paraphrase', {
                text: paraphrase.text,
                existing,
              })
            : null;
          if (paraphrase && third) {
            const now = new Date(evalCaseItem.now);
            const events = [
              ...(first.outcome?.items ?? []).map((item) =>
                candidateToEvent(item.candidate, { document: first.document, run: item.run }, now),
              ),
              ...(third.outcome?.items ?? []).map((item) =>
                candidateToEvent(item.candidate, { document: third.document, run: item.run }, now),
              ),
            ];
            const suggestions = suggestDuplicates(events);
            third.record.suggestionCounts = paraphrase.suggestedTitles.map((title) => {
              const event = events.find((item) => item.title === title);
              return event ? (suggestions.get(event.id) ?? []).length : -1;
            });
          }
          console.log(
            `[E12] lần 1=${first.record.totalActual} sự kiện, quét lại=${second.record.newRecords ?? '?'} mới, gợi ý=${JSON.stringify(third?.record.suggestionCounts ?? [])}`,
          );
          return;
        }

        await runOnce(evalCaseItem, 2, 'fresh');
      },
      CASE_TIMEOUT_MS,
    );
  });

  it('tổng hợp kết quả', () => {
    const freshRuns = RESULTS.filter((item) => item.kind === 'fresh');
    const firstRuns = freshRuns.filter((item) => item.run === 1);
    const secondRuns = freshRuns.filter((item) => item.run === 2);
    const errors = firstRuns.filter((item) => item.error);

    const aggregate = (runs: RunRecord[]) => {
      const metrics = runs
        .map((item) => item.metrics)
        .filter((item): item is EvalMetrics => Boolean(item));
      const matched = metrics.reduce((sum, item) => sum + item.matched, 0);
      const missed = metrics.reduce((sum, item) => sum + item.missed, 0);
      const extra = metrics.reduce((sum, item) => sum + item.extra, 0);
      const invented = metrics.reduce((sum, item) => sum + item.inventedDates, 0);
      const expected = matched + missed;
      return {
        matched,
        missed,
        extra,
        invented,
        recall: expected === 0 ? 1 : matched / expected,
        precision: matched + extra === 0 ? 1 : matched / (matched + extra),
        latencyP95: percentile(
          runs.map((item) => item.latencyMs),
          0.95,
        ),
        latencyMedian: percentile(
          runs.map((item) => item.latencyMs),
          0.5,
        ),
        retries: runs.reduce(
          (sum, item) => sum + Math.max(0, item.providerCalls - item.chunkCount),
          0,
        ),
        invalidResponses: runs.reduce((sum, item) => sum + item.invalidResponses, 0),
        truncated: runs.filter((item) => item.truncated).length,
      };
    };

    const first = aggregate(firstRuns);
    const second = aggregate(secondRuns);
    const rescan = RESULTS.find((item) => item.caseId === 'E12' && item.kind === 'rescan');
    const paraphrase = RESULTS.find((item) => item.caseId === 'E12' && item.kind === 'paraphrase');
    const models = [...new Set(RESULTS.flatMap((item) => item.models))];

    console.log('\n## Bảng đo thật\n');
    console.log(
      '| Mẫu | Lần | Đúng/kỳ vọng | Thiếu | Thừa | Ngày bịa | Retry | Latency (s) | Ghi chú |',
    );
    console.log('|---|---:|---:|---:|---:|---:|---:|---:|---|');
    for (const record of RESULTS) {
      const metrics = record.metrics;
      console.log(
        `| ${record.caseId} | ${record.run}${record.kind === 'rescan' ? ' (quét lại)' : record.kind === 'paraphrase' ? ' (paraphrase)' : ''} | ${
          metrics ? `${metrics.matched}/${metrics.matched + metrics.missed}` : `${record.newRecords ?? 0} mới`
        } | ${metrics?.missed ?? '—'} | ${metrics?.extra ?? '—'} | ${metrics?.inventedDates ?? '—'} | ${
          Math.max(0, record.providerCalls - record.chunkCount)
        } | ${(record.latencyMs / 1_000).toFixed(2)} | ${
          record.error ? `LỖI: ${record.error}` : record.truncated ? 'truncated' : ''
        } |`,
      );
    }

    console.log('\n## Tổng hợp\n');
    console.log(`- Model: ${models.join(', ') || '(không rõ)'}`);
    console.log(`- Lần 1: recall=${formatPercent(first.recall)}, precision=${formatPercent(first.precision)}, thiếu=${first.missed}, thừa=${first.extra}, ngày bịa=${first.invented}`);
    console.log(`- Lần 2: recall=${formatPercent(second.recall)}, precision=${formatPercent(second.precision)}, thiếu=${second.missed}, thừa=${second.extra}, ngày bịa=${second.invented}`);
    console.log(`- Latency lần 1: p95=${first.latencyP95 ?? '—'} ms, median=${first.latencyMedian ?? '—'} ms`);
    console.log(`- JSON lỗi/retry lần 1: ${first.invalidResponses} response lỗi, ${first.retries} lần retry`);
    console.log(`- Lỗi không hoàn tất lần 1: ${errors.length}`);
    console.log(`- E12 quét lại: ${rescan?.newRecords ?? '?'} bản ghi mới (kỳ vọng 0)`);
    console.log(`- E12 paraphrase: gợi ý theo tiêu đề = ${JSON.stringify(paraphrase?.suggestionCounts ?? [])}`);
    console.log(`- Số mẫu bị cắt: ${first.truncated}`);

    console.log('\n## Chi tiết sự kiện\n');
    console.log('SLICE_E_LIVE_JSON_BEGIN');
    console.log(
      JSON.stringify(
        {
          set: USE_HELDOUT ? 'heldout' : 'dev',
          endpoint: ENDPOINT,
          models,
          results: RESULTS,
        },
        null,
        2,
      ),
    );
    console.log('SLICE_E_LIVE_JSON_END');
  }, CASE_TIMEOUT_MS);
});
