import type { FilterEvalCase } from './case-types';
import { FILTER_NEGATIVE_CASES } from './cases-negative';
import { FILTER_POSITIVE_CASES } from './cases-positive';

/**
 * Bộ mẫu đo sàng lọc (TASK 04 / F3): 14 dương + 13 âm = 27 tài liệu.
 * Sau khi đo lần đầu, bộ này được freeze — xem README.md cùng thư mục.
 */
export const FILTER_POSITIVE = FILTER_POSITIVE_CASES;
export const FILTER_NEGATIVE = FILTER_NEGATIVE_CASES;
export const FILTER_EVAL_CASES: FilterEvalCase[] = [...FILTER_POSITIVE_CASES, ...FILTER_NEGATIVE_CASES];
