import type { EvalCase } from '../eval/cases';
import { EVAL_NOW } from '../eval/case-types';

/**
 * Mẫu giữ kín (TASK 03) — giống `EvalCase` nhưng KHÔNG có `mockOutput`/`metrics`:
 * bộ này chỉ chạy đo thật qua `EVAL_SET=heldout` (provider thật), không chạy
 * MockProvider. Phân bố theo `bao-cao/caithienbaocao.md` §3.14:
 * 30 dương (8 ngày-gờ rõ / 6 đa sự kiện / 4 thiếu năm / 4 chỉ ngày / 4 tương
 * đối / 4 trần thuật) + 20 âm (8 không lịch / 4 nhiệm vụ không lịch / 4 có ngày
 * không phải sự kiện / 4 tin tức).
 */
export type HeldoutCase = Omit<EvalCase, 'mockOutput' | 'metrics'>;

/** Mốc "hôm nay" cố định dùng chung cho các mẫu tương đối/thiếu năm. */
export const HELDOUT_NOW = EVAL_NOW;
