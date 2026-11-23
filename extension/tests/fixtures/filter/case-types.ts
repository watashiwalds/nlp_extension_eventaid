import type { SourceKind } from '../../../src/shared/contracts';
import type { ExpectedEvent } from '../../eval/metrics';
import type { EvalCase } from '../eval/cases';
import { EVAL_NOW } from '../eval/case-types';

/**
 * Kiểu dữ liệu bộ mẫu đo sàng lọc đầu-cuối (TASK 04 / Slice F3).
 *
 * Bộ gồm hai nhóm:
 * - Positive: dùng lại gold E01–E05, E07–E15 (bộ F3 đã chốt) nhưng **ép
 *   `source: 'web_page'`** — `resolveFilterMode()` trả `off` cho
 *   `selection`/`paste`, để nguyên nguồn thì phép đo sàng lọc vô nghĩa.
 * - Negative: E06 + các mẫu nhiễu tự soạn (menu/footer, quảng cáo, bình luận,
 *   đăng nhập, email xã giao, bảo trì…), mỗi mẫu ≥ 5 câu.
 *
 * `expectedDecision` là ground truth "bộ lọc hoàn hảo phải kết luận gì", dùng
 * để chấm tỉ lệ bỏ đúng mẫu âm và phát hiện mẫu dương bị bỏ sót. Đây KHÔNG phải
 * thứ model phải đạt tuyệt đối — số thật được ghi vào evidence để báo cáo.
 */

/** Mốc "hôm nay" cố định, dùng chung với bộ E để tái lập. */
export const FILTER_EVAL_NOW = EVAL_NOW;

export type FilterGroundTruth = 'has_event' | 'no_event';

export interface FilterEvalCase {
  id: string;
  /** Nhóm của F3: dương (có lịch trình) hoặc âm (nhiễu). */
  kind: 'positive' | 'negative';
  title: string;
  /** Ép `web_page`; test freeze chốt không có mẫu selection/paste. */
  source: SourceKind;
  sourceUrl: string;
  text: string;
  now: string;
  /** Kết luận đúng của bộ lọc hoàn hảo. */
  expectedDecision: FilterGroundTruth;
  /** Gold sự kiện (mẫu dương: dùng lại `expected` của bộ E; mẫu âm: rỗng). */
  goldEvents: ExpectedEvent[];
  /** Whitelist ngày cho metric; mẫu âm để rỗng như E06. */
  allowedDates: string[];
}

/**
 * Mẫu dương tái dùng nguyên văn text/gold/allowedDates của bộ E đã freeze —
 * không sao chép dữ liệu để hai bộ không bao giờ lệch nhau.
 */
export function positiveFromEval(evalCase: EvalCase): FilterEvalCase {
  return {
    id: evalCase.id,
    kind: 'positive',
    title: evalCase.title,
    source: 'web_page',
    sourceUrl: `https://example.com/eval/${evalCase.id.toLowerCase()}`,
    text: evalCase.text,
    now: evalCase.now,
    expectedDecision: 'has_event',
    goldEvents: evalCase.expected,
    allowedDates: evalCase.allowedDates,
  };
}

/** Mẫu âm tái dùng từ bộ E (hiện có E06). */
export function negativeFromEval(evalCase: EvalCase): FilterEvalCase {
  return {
    ...positiveFromEval(evalCase),
    kind: 'negative',
    expectedDecision: 'no_event',
    goldEvents: [],
    allowedDates: [],
  };
}

/** Mẫu âm tự soạn (N01…): nhiễu web/email, không chứa mốc lịch trình. */
export function negativeCase(input: { id: string; title: string; text: string }): FilterEvalCase {
  return {
    id: input.id,
    kind: 'negative',
    title: input.title,
    source: 'web_page',
    sourceUrl: `https://example.com/eval/${input.id.toLowerCase()}`,
    text: input.text,
    now: FILTER_EVAL_NOW,
    expectedDecision: 'no_event',
    goldEvents: [],
    allowedDates: [],
  };
}
