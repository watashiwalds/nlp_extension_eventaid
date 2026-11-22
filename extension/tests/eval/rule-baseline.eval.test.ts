/**
 * TASK 05 — Chạy baseline rule-based trên bộ mẫu E01–E17 và chấm bằng cùng
 * công cụ đo với LLM (computeMetrics + computeFieldMetrics).
 *
 * Chạy tất định trong Node, không cần model, luôn chạy cùng `npm test`.
 * Đây là phép ĐO, không phải ngưỡng nghiệm thu: baseline chỉ phủ biểu thức
 * ngày/giờ phổ biến (xem header của `rule-baseline.ts`), nên event-level là
 * lower bound (title heuristic yếu), temporal-field là phép so công bằng hơn.
 */
import { describe, expect, it } from 'vitest';
import { EventCandidateSchema } from '../../src/shared/contracts';
import { EVAL_CASES } from '../fixtures/eval/cases';
import { computeFieldMetrics } from './field-metrics';
import { computeMetrics, isInventedDate } from './metrics';
import { extractWithRules } from './rule-baseline';

interface CaseRecord {
  caseId: string;
  totalActual: number;
  metrics: ReturnType<typeof computeMetrics>;
  fieldMetrics: ReturnType<typeof computeFieldMetrics>;
  dateOutsideAllowed: number;
}

const RESULTS: CaseRecord[] = [];

describe('baseline rule-based trên bộ mẫu E01–E17', () => {
  it('chạy tất định trên 17 mẫu, output hợp lệ schema', () => {
    for (const evalCaseItem of EVAL_CASES) {
      const candidates = extractWithRules(evalCaseItem.text, new Date(evalCaseItem.now));
      for (const candidate of candidates) {
        expect(EventCandidateSchema.safeParse(candidate).success, evalCaseItem.id).toBe(true);
      }
      RESULTS.push({
        caseId: evalCaseItem.id,
        totalActual: candidates.length,
        metrics: computeMetrics(candidates, evalCaseItem.expected, evalCaseItem.allowedDates),
        fieldMetrics: computeFieldMetrics(candidates, evalCaseItem.expected),
        dateOutsideAllowed: candidates.filter((item) =>
          isInventedDate(item, evalCaseItem.allowedDates),
        ).length,
      });
    }
    expect(RESULTS).toHaveLength(17);
  });

  it('in bảng so sánh và JSON evidence', () => {
    const sum = (pick: (item: CaseRecord) => number): number =>
      RESULTS.reduce((total, item) => total + pick(item), 0);
    const matched = sum((item) => item.metrics.matched);
    const missed = sum((item) => item.metrics.missed);
    const extra = sum((item) => item.metrics.extra);
    const expected = matched + missed;
    const fmt = (value: number): string => `${(value * 100).toFixed(1)}%`;

    console.log('\n## TASK 05 — Baseline rule-based trên E01–E17\n');
    console.log('| Mẫu | Sinh ra | Đúng/kỳ vọng | Thiếu | Thừa | Ngày ngoài WL |');
    console.log('|---|---:|---:|---:|---:|---:|');
    for (const item of RESULTS) {
      console.log(
        `| ${item.caseId} | ${item.totalActual} | ${item.metrics.matched}/${item.metrics.matched + item.metrics.missed} | ${item.metrics.missed} | ${item.metrics.extra} | ${item.dateOutsideAllowed} |`,
      );
    }
    console.log(
      `\n- Event-level: recall=${fmt(expected === 0 ? 1 : matched / expected)}, precision=${fmt(matched + extra === 0 ? 1 : matched / (matched + extra))}, đúng=${matched}, thiếu=${missed}, thừa=${extra}`,
    );
    const f = RESULTS.reduce(
      (acc, item) => {
        for (const key of Object.keys(item.fieldMetrics) as Array<keyof typeof acc>) {
          acc[key] += item.fieldMetrics[key];
        }
        return acc;
      },
      {
        pairs: 0,
        dateExact: 0,
        dateComparable: 0,
        startTimeExact: 0,
        startTimeComparable: 0,
        endExact: 0,
        endComparable: 0,
        endTimeExact: 0,
        endTimeComparable: 0,
        labelExact: 0,
        labelComparable: 0,
        uncertainMatch: 0,
        uncertainComparable: 0,
        summaryPresent: 0,
      },
    );
    console.log(
      `- Temporal-field (trên cặp ghép): ngày ${f.dateExact}/${f.dateComparable}, giờ start ${f.startTimeExact}/${f.startTimeComparable}, end ${f.endExact}/${f.endComparable}`,
    );

    console.log('\nRULE_BASELINE_JSON_BEGIN');
    console.log(JSON.stringify({ caseSet: 'E01-E17 dev, 25 expected events', results: RESULTS }, null, 2));
    console.log('RULE_BASELINE_JSON_END');
  });
});
