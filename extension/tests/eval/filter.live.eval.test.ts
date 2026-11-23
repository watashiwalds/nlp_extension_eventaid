/**
 * TASK 04 — Đo đầu-cuối ba chế độ sàng lọc Off / Report / Screen bằng dịch vụ
 * thật: PhoBERT (`/analyze`) + llama-server (trích xuất), qua đúng đường
 * `runExtractionJob` như production.
 *
 * Chỉ chạy khi đặt `FILTER_EVAL=1`; mặc định bị skip để CI không cần dịch vụ.
 * Cách chạy (cần PhoBERT ở 8081 và llama-server ở 8080):
 *   FILTER_EVAL=1 [LLAMA_MODEL=chat] npx vitest run tests/eval/filter.live.eval.test.ts \
 *     --reporter=verbose --disableConsoleIntercept
 *
 * Mỗi (tài liệu × chế độ) chạy với DB in-memory mới, nên kết quả 3 chế độ không
 * dedup lẫn nhau. Kết quả in bảng + khối JSON để lưu vào `docs/evidence/`.
 */
import { describe, it } from 'vitest';
import { LlamaCppProvider } from '../../src/platform/inference/llama-cpp';
import { PhobertTaskFilter } from '../../src/platform/inference/phobert-filter';
import type { FilterMode } from '../../src/shared/contracts';
import type { FilterEvalCase } from '../fixtures/filter/case-types';
import { FILTER_EVAL_CASES } from '../fixtures/filter/cases';
import { filterLlmSettings, recordFromOutcome, runFilterCase } from './filter-harness';
import type { FilterRunRecord } from './filter-report';
import { errorRecord, printFilterSummary } from './filter-report';

declare const process: { env: Record<string, string | undefined> };

const LIVE = process.env.FILTER_EVAL === '1';
/** Endpoint dịch vụ sàng lọc PhoBERT (chỉ loopback). */
const FILTER_ENDPOINT = process.env.FILTER_ENDPOINT ?? 'http://127.0.0.1:8081';
const ENDPOINT = process.env.LLAMA_ENDPOINT ?? 'http://127.0.0.1:8080';
/** Server có bật auth thì đặt `LLAMA_API_KEY`; không commit key vào repo. */
const API_KEY = process.env.LLAMA_API_KEY;
/** Proxy kiểu llama-swap cần tên model để định tuyến (`LLAMA_MODEL=chat`). */
const MODEL = process.env.LLAMA_MODEL;
const CASE_TIMEOUT_MS = 15 * 60 * 1_000;

const MODES: readonly FilterMode[] = ['off', 'report', 'screen'];

const RESULTS: FilterRunRecord[] = [];

const llmSettings = filterLlmSettings(ENDPOINT);

function createLlamaProvider(): LlamaCppProvider {
  return new LlamaCppProvider({
    endpoint: ENDPOINT,
    timeoutMs: 240_000,
    ...(API_KEY ? { apiKey: API_KEY } : {}),
    ...(MODEL ? { model: MODEL } : {}),
  });
}

async function runLiveCase(filterCase: FilterEvalCase): Promise<void> {
  for (const mode of MODES) {
    const started = Date.now();
    try {
      const outcome = await runFilterCase(filterCase, mode, {
        llmSettings,
        createProvider: () => createLlamaProvider(),
        filter: new PhobertTaskFilter({ endpoint: FILTER_ENDPOINT, timeoutMs: 15_000 }),
      });
      const record = recordFromOutcome(filterCase, mode, outcome);
      RESULTS.push(record);
      console.log(
        `[${filterCase.id}/${mode}] decision=${record.filterDecision ?? '—'} ` +
          `conf=${record.filterConfidence ?? '—'} lượtLLM=${record.chunkCount} ` +
          `lưu=${record.savedCount} (${(record.wallMs / 1_000).toFixed(1)} s)` +
          (record.error ? ` LỖI: ${record.error}` : ''),
      );
    } catch (error) {
      RESULTS.push(errorRecord(filterCase, mode, error, Date.now() - started));
      console.log(`[${filterCase.id}/${mode}] LỖI: ${error instanceof Error ? error.message : error}`);
    }
  }
}

describe.runIf(LIVE)('TASK 04 — đo đầu-cuối Off/Report/Screen', () => {
  it('kiểm tra kết nối PhoBERT và llama-server', async () => {
    const filterHealth = await new PhobertTaskFilter({ endpoint: FILTER_ENDPOINT }).health();
    if (!filterHealth.ok) throw new Error(`PhoBERT không sẵn sàng: ${filterHealth.reason}`);
    const providerHealth = await new LlamaCppProvider({ endpoint: ENDPOINT }).health();
    if (!providerHealth.ok) throw new Error(`llama-server không sẵn sàng: ${providerHealth.reason}`);
    console.log(
      `\n[filter-eval] phobert=${FILTER_ENDPOINT} (device=${filterHealth.device ?? '?'}), ` +
        `llama=${ENDPOINT} model=${providerHealth.model ?? '(không đọc được)'}`,
    );
  });

  describe.each(FILTER_EVAL_CASES)('$id — $title', (filterCase) => {
    it(
      'chạy 3 chế độ trên cùng tài liệu',
      async () => {
        await runLiveCase(filterCase);
      },
      CASE_TIMEOUT_MS,
    );
  });

  it(
    'tổng hợp kết quả',
    () => {
      printFilterSummary(RESULTS, {
        endpoint: ENDPOINT,
        filterEndpoint: FILTER_ENDPOINT,
        caseCount: FILTER_EVAL_CASES.length,
      });
    },
    CASE_TIMEOUT_MS,
  );
});
