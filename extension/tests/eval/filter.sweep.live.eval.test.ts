/**
 * Quét ngưỡng sàng lọc (TASK 04 phụ — chỉ chạy khi `FILTER_SWEEP=1`).
 *
 * Gọi đúng dịch vụ PhoBERT cho bộ 27 mẫu, ghi kết quả **từng cửa sổ**, sau đó
 * quét lưới `(skipConfidence × minSentencesToSkip)` bằng chính `aggregateDecision`
 * của core để trả lời câu hỏi: có điểm ngưỡng nào vừa **0 dương bị bỏ** vừa
 * **≥ 70% mẫu âm bị bỏ qua** hay không.
 *
 * Đây là phép CHARACTERISE model, không phải tune: không sửa
 * `DEFAULT_FILTER_MODE` hay cài đặt mặc định dựa trên kết quả này; kết quả dùng
 * để biết biên giới hạn của model bàn giao (bằng chứng cho §6.2 của báo cáo).
 *
 *   FILTER_SWEEP=1 npx vitest run tests/eval/filter.sweep.live.eval.test.ts \
 *     --reporter=verbose --disableConsoleIntercept
 */
import { describe, it } from 'vitest';
import {
  aggregateDecision,
  buildFilterWindows,
  filterCharBudget,
} from '../../src/core/extraction/prefilter';
import type { FilterWindow, WindowAnalysis } from '../../src/core/extraction/filter-types';
import { PhobertTaskFilter } from '../../src/platform/inference/phobert-filter';
import { DEFAULT_FILTER_SETTINGS } from '../../src/platform/storage/filter-settings';
import type { FilterSettings } from '../../src/shared/contracts';
import { FILTER_EVAL_CASES } from '../fixtures/filter/cases';

declare const process: { env: Record<string, string | undefined> };

const SWEEP = process.env.FILTER_SWEEP === '1';
const FILTER_ENDPOINT = process.env.FILTER_ENDPOINT ?? 'http://127.0.0.1:8081';
const LLM_SETTINGS = { chunkChars: 5_000, maxChunks: 4 };

interface CaseWindows {
  caseId: string;
  kind: 'positive' | 'negative';
  windows: FilterWindow[];
  analyses: WindowAnalysis[];
}

interface SweepPoint {
  skipConfidence: number;
  minSentencesToSkip: number;
  positivesSkipped: number;
  negativesSkipped: number;
}

function settings(skipConfidence: number, minSentencesToSkip: number): FilterSettings {
  return { ...DEFAULT_FILTER_SETTINGS, skipConfidence, minSentencesToSkip };
}

describe.runIf(SWEEP)('quét ngưỡng sàng lọc PhoBERT', () => {
  it('gọi /analyze từng cửa sổ rồi quét lưới ngưỡng', async () => {
    const filter = new PhobertTaskFilter({ endpoint: FILTER_ENDPOINT });
    const health = await filter.health();
    if (!health.ok) throw new Error(`PhoBERT không sẵn sàng: ${health.reason}`);

    const cases: CaseWindows[] = [];
    for (const filterCase of FILTER_EVAL_CASES) {
      const windows = buildFilterWindows(filterCase.text, {
        windowChars: DEFAULT_FILTER_SETTINGS.windowChars,
        effectiveChars: filterCharBudget(
          filterCase.text.length,
          LLM_SETTINGS.chunkChars,
          LLM_SETTINGS.maxChunks,
        ),
      });
      const analyses: WindowAnalysis[] = [];
      for (const window of windows) {
        const analysis = await filter.analyze(window.text);
        analyses.push({ ok: true, window, analysis });
      }
      cases.push({ caseId: filterCase.id, kind: filterCase.kind, windows, analyses });
    }

    const points: SweepPoint[] = [];
    for (let conf = 50; conf <= 95; conf += 5) {
      for (let minSentences = 1; minSentences <= 6; minSentences += 1) {
        const s = settings(conf / 100, minSentences);
        let positivesSkipped = 0;
        let negativesSkipped = 0;
        for (const entry of cases) {
          const decision = aggregateDecision(entry.windows, entry.analyses, s);
          if (decision === 'no_event') {
            if (entry.kind === 'positive') positivesSkipped += 1;
            else negativesSkipped += 1;
          }
        }
        points.push({
          skipConfidence: conf / 100,
          minSentencesToSkip: minSentences,
          positivesSkipped,
          negativesSkipped,
        });
      }
    }

    const negatives = cases.filter((entry) => entry.kind === 'negative').length;
    const goal = points.filter(
      (point) => point.positivesSkipped === 0 && point.negativesSkipped / negatives >= 0.7,
    );
    const noLoss = points.filter((point) => point.positivesSkipped === 0);
    const bestNoLoss = [...noLoss].sort(
      (a, b) => b.negativesSkipped - a.negativesSkipped || a.skipConfidence - b.skipConfidence,
    )[0];

    console.log(`\n[sweep] ${cases.length} mẫu, ${cases.reduce((sum, entry) => sum + entry.windows.length, 0)} cửa sổ, ${negatives} mẫu âm`);
    console.log(
      `[sweep] điểm đạt cả hai tiêu chí (0 dương bị bỏ + ≥70% âm bị bỏ): ${goal.length === 0 ? 'KHÔNG CÓ' : JSON.stringify(goal)}`,
    );
    if (bestNoLoss) {
      console.log(
        `[sweep] điểm tốt nhất mà vẫn 0 dương bị bỏ: skipConfidence=${bestNoLoss.skipConfidence}, minSentences=${bestNoLoss.minSentencesToSkip} → bỏ ${bestNoLoss.negativesSkipped}/${negatives} mẫu âm`,
      );
    }
    console.log('\n| skipConf | minSents | dương bị bỏ | âm bỏ qua |');
    console.log('|---|---:|---:|---:|');
    for (const point of points) {
      console.log(
        `| ${point.skipConfidence.toFixed(2)} | ${point.minSentencesToSkip} | ${point.positivesSkipped} | ${point.negativesSkipped}/${negatives} |`,
      );
    }

    console.log('\n## FILTER_SWEEP_JSON_BEGIN');
    console.log(
      JSON.stringify(
        {
          filterEndpoint: FILTER_ENDPOINT,
          caseCount: cases.length,
          negatives,
          perWindow: cases.map((entry) => ({
            caseId: entry.caseId,
            kind: entry.kind,
            windows: entry.analyses.map((item) =>
              item.ok
                ? {
                    hasTask: item.analysis.hasTask,
                    confidence: item.analysis.confidence,
                    totalSentences: item.analysis.totalSentences,
                  }
                : { error: item.reason },
            ),
          })),
          grid: points,
        },
        null,
        2,
      ),
    );
    console.log('FILTER_SWEEP_JSON_END');
  }, 5 * 60 * 1_000);
});
