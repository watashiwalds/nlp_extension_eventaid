import { E01, E02, E03, E04, E05 } from './cases-a';
import { E06, E07, E08, E09, E10 } from './cases-b';
import { E11, E12, E13, E14, E15 } from './cases-c';
import type { EvalCase } from './case-types';

/**
 * Bộ mẫu Slice E — 15 tài liệu tự soạn, không có dữ liệu cá nhân thật.
 *
 * Dữ liệu được chia theo nhóm để mỗi file dưới ngưỡng `max-lines`; thứ tự
 * E01…E15 và hợp đồng `EvalCase` nằm ở `case-types.ts`.
 */

export { EVAL_NOW } from './case-types';
export type { EvalCase, EvalCategory, EvalParaphrase } from './case-types';

export const EVAL_CASES: readonly EvalCase[] = [
  E01,
  E02,
  E03,
  E04,
  E05,
  E06,
  E07,
  E08,
  E09,
  E10,
  E11,
  E12,
  E13,
  E14,
  E15,
];

export function evalCase(id: string): EvalCase {
  const found = EVAL_CASES.find((item) => item.id === id);
  if (!found) throw new Error(`Không có mẫu đánh giá ${id}.`);
  return found;
}
