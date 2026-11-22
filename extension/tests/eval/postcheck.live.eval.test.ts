/**
 * TASK 01 — Ablation Raw LLM vs LLM + hậu kiểm.
 *
 * Cùng MỘT lần gọi model cho mỗi đoạn, tách hai đường xử lý để đo tác dụng
 * thật của hậu kiểm (`normalize.ts` + dedup) mà không nhiễm nhiễu sampling:
 * - Raw: giữ nguyên chuỗi ISO do model trả, không kiểm chứng nguồn, không suy
 *   ngày-only, giữ `uncertain` model tự báo, `relatedProfiles: []`.
 * - Post-check: `normalizeEvents()` + `dedupeCandidates()` như pipeline
 *   (không gọi `pipeline.ts`, không khớp hồ sơ ở cả hai đường để cô lập
 *   tác động ngày/giờ). Cả hai đường đều đi qua cùng một bước dedup.
 *
 * Chỉ chạy khi đặt `LLAMA_EVAL=1`; mặc định bị skip để CI không cần model.
 *   LLAMA_EVAL=1 npx vitest run tests/eval/postcheck.live.eval.test.ts \
 *     --reporter=verbose --disableConsoleIntercept
 */
import { describe, it } from 'vitest';
import { chunkText } from '../../src/core/extraction/chunk';
import { dedupeCandidates } from '../../src/core/extraction/dedup';
import { normalizeEvents } from '../../src/core/extraction/normalize';
import { buildPrompt, DEFAULT_TIMEZONE, RETRY_SUFFIX } from '../../src/core/extraction/prompt';
import { parseRawExtraction } from '../../src/core/extraction/schema';
import type { RawEvent } from '../../src/core/extraction/schema';
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
import { computeFieldMetrics, computeProfileMetrics } from './field-metrics';
import { computeMetrics, isInventedDate } from './metrics';
import { printAblationSummary } from './postcheck-report';
import type { CaseRecord, ItemSummary, PathRecord } from './postcheck-report';

declare const process: { env: Record<string, string | undefined> };

const LIVE = process.env.LLAMA_EVAL === '1';
const ENDPOINT = process.env.LLAMA_ENDPOINT ?? 'http://127.0.0.1:8080';
/** Server có bật auth thì đặt `LLAMA_API_KEY`; không commit key vào repo. */
const API_KEY = process.env.LLAMA_API_KEY;
/** Proxy kiểu llama-swap cần tên model để định tuyến (`LLAMA_MODEL=chat`). */
const MODEL = process.env.LLAMA_MODEL;
const SETTINGS = { chunkChars: 5_000, maxChunks: 4, maxTokens: 1_200, temperature: 0.1 };
const CASE_TIMEOUT_MS = 15 * 60 * 1_000;

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

function documentFor(evalCaseItem: EvalCase, text = evalCaseItem.text): NormalizedDocument {
  const extractionMethod: NormalizedDocument['extractionMethod'] =
    evalCaseItem.source === 'web_page'
      ? 'readability'
      : evalCaseItem.source === 'selection'
        ? 'selection'
        : 'paste';

  return {
    documentId: `doc_postcheck_${evalCaseItem.id.toLowerCase()}`,
    source: evalCaseItem.source,
    title: evalCaseItem.title,
    text,
    ...(evalCaseItem.sourceUrl ? { sourceUrl: evalCaseItem.sourceUrl } : {}),
    capturedAt: new Date(evalCaseItem.now).toISOString(),
    extractionMethod,
    contentHash: `hash_postcheck_${evalCaseItem.id}`,
    truncated: false,
    charCount: text.length,
    ...(evalCaseItem.source === 'selection' ? { selection: text } : {}),
  };
}

/** Đường Raw: giữ nguyên ISO do model trả, không kiểm nguồn, không suy ngày-only. */
function rawToCandidate(raw: RawEvent): EventCandidate {
  return {
    title: raw.title,
    label: raw.label,
    start: { value: raw.start, date: null, raw: raw.startRaw || null },
    end: raw.end ? { value: raw.end, date: null, raw: raw.endRaw || null } : null,
    durationMinutes: null,
    summary: raw.summary,
    relatedProfiles: [],
    confidence: raw.confidence,
    uncertain: raw.uncertain,
    ...(raw.quote ? { quote: raw.quote } : {}),
  };
}

/* Regex y hệt `normalize.ts` — định nghĩa "nguồn không có căn cứ" nhất quán. */
const HAS_YEAR = /\b(?:19|20)\d{2}\b/;
const HAS_TIME = /\b\d{1,2}\s*(?::\s*\d{2}|h\s*\d{0,2}|giờ)/i;

function inferredWithoutFlag(raws: readonly RawEvent[], sourceText: string) {
  const result = { inferredYearWithoutFlag: 0, inferredTimeWithoutFlag: 0 };
  for (const raw of raws) {
    const flagged = new Set(raw.uncertain);
    for (const iso of [raw.start, raw.end]) {
      if (!iso) continue;
      const hasDate = Boolean(iso.slice(0, 10));
      const hasTime = iso.length >= 16;
      if (hasDate && !HAS_YEAR.test(sourceText) && !flagged.has('nam_suy_doan')) {
        result.inferredYearWithoutFlag += 1;
      }
      if (hasTime && !HAS_TIME.test(sourceText) && !flagged.has('gio_suy_doan')) {
        result.inferredTimeWithoutFlag += 1;
      }
    }
  }
  return result;
}

function pathRecord(candidates: EventCandidate[], evalCaseItem: EvalCase): PathRecord {
  const expected = evalCaseItem.expected;
  const profiles = evalCaseItem.profiles ?? [];
  return {
    metrics: computeMetrics(candidates, expected, evalCaseItem.allowedDates),
    fieldMetrics: computeFieldMetrics(candidates, expected),
    profileMetrics: computeProfileMetrics(candidates, expected, profiles),
    dateOutsideAllowed: candidates.filter((item) => isInventedDate(item, evalCaseItem.allowedDates))
      .length,
    items: candidates.map(
      (item): ItemSummary => ({
        title: item.title,
        startValue: item.start.value,
        startDate: item.start.date,
        uncertain: item.uncertain,
      }),
    ),
  };
}

function emptyPathRecord(): PathRecord {
  return {
    metrics: computeMetrics([], [], []),
    fieldMetrics: computeFieldMetrics([], []),
    profileMetrics: computeProfileMetrics([], [], []),
    dateOutsideAllowed: 0,
    items: [],
  };
}

const RESULTS: CaseRecord[] = [];
const PROMPT_VERSIONS = new Set<string>();

describe.runIf(LIVE)('TASK 01 — ablation Raw LLM vs LLM + hậu kiểm', () => {
  it('kiểm tra kết nối và model đang nạp', async () => {
    const health = await new LlamaCppProvider({ endpoint: ENDPOINT }).health();
    if (!health.ok) throw new Error(`llama-server không sẵn sàng: ${health.reason}`);
    console.log(`\n[postcheck] endpoint=${ENDPOINT} model=${health.model ?? '(không đọc được)'}`);
  });

  describe.each(EVAL_CASES)('$id — $title', (evalCaseItem) => {
    it(
      'chạy 1 lần gọi model, chấm 2 đường xử lý',
      async () => {
        const now = new Date(evalCaseItem.now);
        const document = documentFor(evalCaseItem);
        const provider = new RecordingProvider(
          new LlamaCppProvider({
            endpoint: ENDPOINT,
            timeoutMs: 240_000,
            ...(API_KEY ? { apiKey: API_KEY } : {}),
            ...(MODEL ? { model: MODEL } : {}),
          }),
        );
        const { chunks } = chunkText(document.text, {
          chunkChars: SETTINGS.chunkChars,
          maxChunks: SETTINGS.maxChunks,
        });
        const started = Date.now();

        try {
          const rawPath: EventCandidate[] = [];
          const postPath: EventCandidate[] = [];
          const allRaws: RawEvent[] = [];

          for (const chunk of chunks) {
            const prompt = buildPrompt({ document, now, timezone: DEFAULT_TIMEZONE }, chunk);
            PROMPT_VERSIONS.add(prompt.promptVersion);
            const base = {
              system: prompt.system,
              user: prompt.user,
              maxTokens: SETTINGS.maxTokens,
              temperature: SETTINGS.temperature,
            };

            let result = await provider.run(base);
            let parsed = parseRawExtraction(result.raw);
            if (!parsed.ok) {
              result = await provider.run({ ...base, user: `${prompt.user}\n\n${RETRY_SUFFIX}` });
              parsed = parseRawExtraction(result.raw);
            }
            if (!parsed.ok) {
              throw new Error(`Đoạn ${chunk.index + 1}/${chunks.length}: ${parsed.error}`);
            }

            const raws: RawEvent[] = parsed.value.events;
            allRaws.push(...raws);
            // Hai đường dùng chung output thô của cùng một lần gọi model.
            rawPath.push(...raws.map(rawToCandidate));
            postPath.push(
              ...normalizeEvents(raws, {
                now,
                timezone: DEFAULT_TIMEZONE,
                sourceText: chunk.text,
              }),
            );
          }

          const rawRecord = pathRecord(dedupeCandidates(rawPath, []).kept, evalCaseItem);
          const postRecord = pathRecord(dedupeCandidates(postPath, []).kept, evalCaseItem);

          const flagsAdded = { nam_suy_doan: 0, gio_suy_doan: 0 };
          const valueDropped = { startTime: 0, startDate: 0, end: 0 };
          for (let i = 0; i < rawPath.length; i += 1) {
            const raw = rawPath[i];
            const post = postPath[i];
            if (!raw || !post) continue;
            for (const key of ['nam_suy_doan', 'gio_suy_doan'] as const) {
              if (post.uncertain.includes(key) && !raw.uncertain.includes(key)) flagsAdded[key] += 1;
            }
            if (raw.start.value && !post.start.value) valueDropped.startTime += 1;
            if ((raw.start.value || raw.start.date) && !post.start.value && !post.start.date) {
              valueDropped.startDate += 1;
            }
            if (raw.end && !post.end) valueDropped.end += 1;
          }

          RESULTS.push({
            caseId: evalCaseItem.id,
            latencyMs: Date.now() - started,
            chunkCount: chunks.length,
            providerCalls: provider.calls,
            retries: Math.max(0, provider.calls - chunks.length),
            raw: rawRecord,
            postcheck: postRecord,
            flagsAdded,
            valueDropped,
            falseNegativeByPostcheck: Math.max(
              0,
              postRecord.metrics.missed - rawRecord.metrics.missed,
            ),
            inferredWithoutFlagRaw: inferredWithoutFlag(
              allRaws,
              chunks.map((chunk) => chunk.text).join('\n'),
            ),
          });
        } catch (error) {
          RESULTS.push({
            caseId: evalCaseItem.id,
            latencyMs: Date.now() - started,
            chunkCount: chunks.length,
            providerCalls: provider.calls,
            retries: Math.max(0, provider.calls - chunks.length),
            raw: emptyPathRecord(),
            postcheck: emptyPathRecord(),
            flagsAdded: { nam_suy_doan: 0, gio_suy_doan: 0 },
            valueDropped: { startTime: 0, startDate: 0, end: 0 },
            falseNegativeByPostcheck: 0,
            inferredWithoutFlagRaw: { inferredYearWithoutFlag: 0, inferredTimeWithoutFlag: 0 },
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
      CASE_TIMEOUT_MS,
    );
  });

  it('tổng hợp kết quả', () => {
    printAblationSummary(RESULTS, [...PROMPT_VERSIONS], ENDPOINT);
  }, CASE_TIMEOUT_MS);
});
