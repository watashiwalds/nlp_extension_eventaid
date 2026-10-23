import type { ChunkOptions, ChunkResult, TextChunk } from './types';

/** Chồng lấn mặc định giữa hai đoạn (kế hoạch §5.1). */
export const DEFAULT_OVERLAP_CHARS = 200;

const PARAGRAPH_BREAK = '\n\n';
const SENTENCE_END = /[.!?…](?=\s)/g;

/**
 * Tìm điểm cắt tốt nhất trong khoảng [minEnd, end): ưu tiên ranh giới đoạn văn,
 * sau đó xuống dòng, sau đó cuối câu. Không tìm được thì cắt cứng tại `end`.
 */
function findBreak(text: string, minEnd: number, end: number): number {
  const window = text.slice(minEnd, end);
  const paragraph = window.lastIndexOf(PARAGRAPH_BREAK);
  if (paragraph >= 0) return minEnd + paragraph + PARAGRAPH_BREAK.length;
  const line = window.lastIndexOf('\n');
  if (line >= 0) return minEnd + line + 1;

  let sentenceEnd = -1;
  SENTENCE_END.lastIndex = 0;
  for (let match = SENTENCE_END.exec(window); match; match = SENTENCE_END.exec(window)) {
    sentenceEnd = match.index + 1;
  }
  return sentenceEnd > 0 ? minEnd + sentenceEnd : end;
}

/**
 * Chia văn bản thành các đoạn ≤ `chunkChars`, giữ offset tuyệt đối để map `quote`
 * về nguồn. Bảo đảm không mất ký tự: `text.slice(charStart, charEnd)` luôn trả
 * đúng `chunk.text`, và các đoạn phủ kín phần đầu tài liệu.
 */
export function chunkText(text: string, options: ChunkOptions): ChunkResult {
  const totalChars = text.length;
  const chunkChars = Math.max(1, Math.floor(options.chunkChars));
  const maxChunks = Math.max(1, Math.floor(options.maxChunks));
  const overlap = Math.min(
    Math.max(0, Math.floor(options.overlapChars ?? DEFAULT_OVERLAP_CHARS)),
    Math.floor(chunkChars / 2),
  );

  if (!text.trim()) return { chunks: [], truncated: false, totalChars };

  const chunks: TextChunk[] = [];
  let cursor = 0;
  let truncated = false;

  while (cursor < totalChars && chunks.length < maxChunks) {
    const targetEnd = Math.min(cursor + chunkChars, totalChars);
    const minEnd = Math.min(cursor + Math.ceil(chunkChars / 2), targetEnd);
    const end = targetEnd >= totalChars ? totalChars : findBreak(text, minEnd, targetEnd);

    const slice = text.slice(cursor, end);
    if (slice.trim()) {
      chunks.push({ index: chunks.length, text: slice, charStart: cursor, charEnd: end });
    }

    if (end >= totalChars) break;
    cursor = Math.max(end - overlap, cursor + 1);
  }

  const last = chunks[chunks.length - 1];
  if (last && last.charEnd < totalChars) truncated = true;

  return { chunks, truncated, totalChars };
}
