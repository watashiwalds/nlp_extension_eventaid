import { E01, E02, E03, E04, E05 } from '../eval/cases-a';
import { E07, E08, E09, E10 } from '../eval/cases-b';
import { E11, E12, E13, E14, E15 } from '../eval/cases-c';
import type { FilterEvalCase } from './case-types';
import { positiveFromEval } from './case-types';

/**
 * 14 mẫu dương của bộ F3 = E01–E05 + E07–E15 (E06 là mẫu âm, E16/E17 không
 * thuộc bộ 14 này). Text và gold giữ nguyên từ bộ E đã freeze; chỉ ép nguồn
 * `web_page` kèm `sourceUrl` giả để bước sàng lọc thực sự chạy.
 */
export const FILTER_POSITIVE_CASES: FilterEvalCase[] = [
  E01,
  E02,
  E03,
  E04,
  E05,
  E07,
  E08,
  E09,
  E10,
  E11,
  E12,
  E13,
  E14,
  E15,
].map(positiveFromEval);
