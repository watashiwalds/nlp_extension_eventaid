import { MAX_EVENT_TAG_LENGTH, MAX_EVENT_TAGS, MAX_SUMMARY_ITEMS } from '../shared/contracts';

/** Tiện ích văn bản thuần — dùng chung cho capture, form và UI. */

export function normalizeWhitespace(input: string): string {
  return input
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** FNV-1a 32-bit: đủ để phát hiện trùng nội dung trong demo, không dùng cho bảo mật. */
export function hashText(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${hash.toString(16).padStart(8, '0')}-${input.length.toString(16)}`;
}

export function truncateText(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  return { text: text.slice(0, maxChars), truncated: true };
}

/** Tách danh sách nhập tay: mỗi dòng, hoặc phân tách bởi dấu phẩy / chấm phẩy. */
export function parseListInput(value: string, maxItems = 20): string[] {
  return dedupe(
    value
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean),
  ).slice(0, maxItems);
}

/** Mỗi dòng là một ý tóm tắt; bỏ ký hiệu bullet. Mặc định 50 ý cho nhập tay; LLM có thể truyền 5. */
export function parseSummaryInput(value: string, maxItems = MAX_SUMMARY_ITEMS): string[] {
  return value
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

export function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}

export interface ParsedTags {
  tags: string[];
  error: string | null;
}

/**
 * Tách nhãn tuỳ chỉnh: dấu phẩy, chấm phẩy hoặc xuống dòng.
 * Khử trùng không phân biệt hoa/thường (giữ cách viết lần đầu) và báo lỗi rõ
 * khi vượt quá số lượng/độ dài — không tự cắt bớt để tránh mất dữ liệu âm thầm.
 */
export function parseTagsInput(value: string): ParsedTags {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of value.split(/[,;\n]/)) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  if (tags.length > MAX_EVENT_TAGS) {
    return { tags, error: `Tối đa ${MAX_EVENT_TAGS} nhãn tuỳ chỉnh` };
  }
  const tooLong = tags.find((tag) => tag.length > MAX_EVENT_TAG_LENGTH);
  if (tooLong) {
    return { tags, error: `Mỗi nhãn tối đa ${MAX_EVENT_TAG_LENGTH} ký tự: “${tooLong}”` };
  }
  return { tags, error: null };
}

export function pluralize(count: number): string {
  return count === 1 ? '' : 's';
}
