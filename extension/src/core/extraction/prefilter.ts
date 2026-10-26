import { FILTER_FAIL_OPEN_NOTE } from '../../shared/constants';
import type { FilterSettings, SourceKind } from '../../shared/contracts';
import type { WindowAnalysis, FilterMode, FilterReport, FilterRunMode, FilterWindow } from './filter-types';

/**
 * Phần THUẦN của bước sàng lọc nội dung: chia cửa sổ, gộp quyết định, chọn chế độ.
 * Không gọi mạng, không `chrome.*`, chạy được trong Node để test và trong offscreen.
 */

const PARAGRAPH_BREAK = '\n\n';
const SENTENCE_END = /[.!?…](?=\s)/g;

export interface FilterWindowOptions {
  /** Độ dài tối đa của một cửa sổ (ký tự). */
  windowChars: number;
  /** Chỉ sàng lọc phần đầu mà LLM chắc chắn nhận; mặc định bằng cả tài liệu. */
  effectiveChars?: number;
}

/**
 * Số ký tự tối đa nên sàng lọc: phần đầu tài liệu mà `chunkText` chắc chắn gửi cho
 * LLM (kế hoạch §6.1). Sàng lọc dư vài trăm ký tự là chấp nhận được, thiếu thì không.
 */
export function filterCharBudget(textLength: number, chunkChars: number, maxChunks: number): number {
  if (textLength <= 0) return 0;
  return Math.min(textLength, Math.max(1, Math.floor(chunkChars) * Math.floor(maxChunks)));
}

/** Tìm điểm cắt tốt nhất trong nửa sau của cửa sổ; không cắt giữa từ nếu tránh được. */
function findWindowEnd(text: string, start: number, targetEnd: number): number {
  const minEnd = start + Math.ceil((targetEnd - start) / 2);
  const tail = text.slice(minEnd, targetEnd);

  const paragraph = tail.lastIndexOf(PARAGRAPH_BREAK);
  if (paragraph >= 0) return minEnd + paragraph + PARAGRAPH_BREAK.length;

  const line = tail.lastIndexOf('\n');
  if (line >= 0) return minEnd + line + 1;

  let sentenceEnd = -1;
  SENTENCE_END.lastIndex = 0;
  for (let match = SENTENCE_END.exec(tail); match; match = SENTENCE_END.exec(tail)) {
    sentenceEnd = match.index + 1;
  }
  if (sentenceEnd > 0) return minEnd + sentenceEnd;

  // Cắt cứng nhưng lùi về khoảng trắng cuối cùng để không chẻ đôi một từ.
  const space = tail.search(/\s\S*$/);
  return space > 0 ? minEnd + space + 1 : targetEnd;
}

/**
 * Chia văn bản thành các cửa sổ ≤ `windowChars`, phủ kín `effectiveChars`, không
 * chồng lấn. Mỗi cửa sổ là một lần `POST /analyze` độc lập.
 */
export function buildFilterWindows(text: string, options: FilterWindowOptions): FilterWindow[] {
  const size = Math.max(1, Math.floor(options.windowChars));
  const limit = Math.min(text.length, Math.max(0, Math.floor(options.effectiveChars ?? text.length)));
  if (limit <= 0 || !text.slice(0, limit).trim()) return [];

  const windows: FilterWindow[] = [];
  let cursor = 0;

  while (cursor < limit) {
    const targetEnd = Math.min(cursor + size, limit);
    const end = targetEnd >= limit ? limit : findWindowEnd(text, cursor, targetEnd);
    const slice = text.slice(cursor, end);
    if (slice.trim()) {
      windows.push({ index: windows.length, text: slice, charStart: cursor, charEnd: end });
    }
    if (end >= limit) break;
    cursor = end;
  }

  return windows;
}

function isOk(analysis: WindowAnalysis): analysis is Extract<WindowAnalysis, { ok: true }> {
  return analysis.ok;
}

/**
 * Gộp kết quả các cửa sổ thành quyết định cấp tài liệu (kế hoạch §6.2).
 * Bảo thủ cho recall: chỉ `no_event` khi mọi cửa sổ đều chắc chắn và tài liệu đủ dài.
 */
export function aggregateDecision(
  windows: readonly FilterWindow[],
  analyses: readonly WindowAnalysis[],
  settings: Pick<FilterSettings, 'skipConfidence' | 'minSentencesToSkip'>,
): FilterReport['decision'] {
  if (windows.length === 0) return 'uncertain';

  const succeeded = analyses.filter(isOk);
  if (succeeded.some((entry) => entry.analysis.hasTask)) return 'has_event';
  if (succeeded.length !== windows.length) return 'uncertain';

  const totalSentences = succeeded.reduce((sum, entry) => sum + entry.analysis.totalSentences, 0);
  if (totalSentences < settings.minSentencesToSkip) return 'uncertain';

  const weakest = Math.min(...succeeded.map((entry) => entry.analysis.confidence));
  return weakest >= settings.skipConfidence ? 'no_event' : 'uncertain';
}

/**
 * Dựng bộ số liệu ghi vào job và hiển thị trên UI.
 * `note` để trống; job tự đặt ghi chú fail-open khi cần.
 */
export function summarizeFilter(
  windows: readonly FilterWindow[],
  analyses: readonly WindowAnalysis[],
  settings: Pick<FilterSettings, 'skipConfidence' | 'minSentencesToSkip'>,
): FilterReport {
  const decision = aggregateDecision(windows, analyses, settings);
  const succeeded = analyses.filter(isOk);
  const allSucceeded = windows.length > 0 && analyses.length === windows.length && succeeded.length === analyses.length;

  const withTask = succeeded.filter((entry) => entry.analysis.hasTask);
  let confidence: number | null = null;
  if (decision === 'has_event' && withTask.length > 0) {
    confidence = Math.max(...withTask.map((entry) => entry.analysis.confidence));
  } else if (decision === 'no_event' && succeeded.length === windows.length) {
    confidence = Math.min(...succeeded.map((entry) => entry.analysis.confidence));
  }

  return {
    applied: allSucceeded,
    decision,
    evidenceCount: succeeded.reduce((sum, entry) => sum + entry.analysis.evidence.length, 0),
    totalSentences: succeeded.reduce((sum, entry) => sum + entry.analysis.totalSentences, 0),
    confidence,
    latencyMs: succeeded.reduce((sum, entry) => sum + entry.analysis.latencyMs, 0),
    windowCount: windows.length,
    note: null,
  };
}

/**
 * Chọn chế độ sàng lọc thực tế cho một lần chạy (kế hoạch §0.1 Q9):
 * `off` do lần chạy chỉ định thắng mọi cấu hình; vùng chọn/văn bản dán luôn bỏ qua
 * (Q2) kể cả khi bị `force`; `force` còn lại chạy `screen`; mặc định theo cài đặt.
 */
export function resolveFilterMode(
  settingsMode: FilterMode,
  runMode: FilterRunMode | undefined,
  source: SourceKind,
): FilterMode {
  if (runMode === 'off') return 'off';
  if (source === 'selection' || source === 'paste') return 'off';
  if (runMode === 'force') return 'screen';
  return settingsMode;
}

/** Ghi chú chuẩn khi bước sàng lọc lỗi giữa chừng và job chạy tiếp với toàn văn. */
export function failOpenNote(reason?: string): string {
  return reason ? `${FILTER_FAIL_OPEN_NOTE} (${reason})` : FILTER_FAIL_OPEN_NOTE;
}
