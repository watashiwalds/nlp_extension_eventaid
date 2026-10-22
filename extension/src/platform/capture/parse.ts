import { Readability } from '@mozilla/readability';
import { MAX_DOCUMENT_CHARS } from '../../shared/constants';
import { hashText, normalizeWhitespace, truncateText } from '../../core/text';
import { newId } from '../../core/ids';
import type { NormalizedDocument } from '../../shared/contracts';
import type { CapturePayload } from '../../shared/messages';

/** Phần trăm/URL tối thiểu để coi là đọc được. */
const MIN_ARTICLE_CHARS = 120;

export interface ParseResult {
  document: NormalizedDocument;
  usedFallback: boolean;
}

function buildDocument(input: {
  source: NormalizedDocument['source'];
  title: string;
  text: string;
  url?: string;
  method: NormalizedDocument['extractionMethod'];
  selection?: string;
}): NormalizedDocument {
  const normalized = normalizeWhitespace(input.text);
  const limited = truncateText(normalized, MAX_DOCUMENT_CHARS);
  return {
    documentId: newId('doc'),
    source: input.source,
    title: input.title.trim() || 'Không có tiêu đề',
    text: limited.text,
    ...(input.url ? { sourceUrl: input.url } : {}),
    capturedAt: new Date().toISOString(),
    extractionMethod: input.method,
    contentHash: hashText(limited.text),
    truncated: limited.truncated,
    charCount: normalized.length,
    ...(input.selection ? { selection: input.selection } : {}),
  };
}

export interface ParseOptions {
  /** Người dùng chủ động bỏ qua Readability (VĐ-01). */
  forceRaw?: boolean;
}

/**
 * Chuẩn hoá nội dung trang: ưu tiên Readability, thất bại thì rơi về DOM thô.
 * Vùng bôi đen được ưu tiên hơn Readability (theo AGENTS.md §4).
 * `forceRaw` bỏ qua Readability để lấy toàn bộ DOM theo yêu cầu người dùng.
 */
export function parseCapture(payload: CapturePayload, options: ParseOptions = {}): ParseResult {
  const selection = normalizeWhitespace(payload.selection);
  if (selection.length > 0) {
    return {
      document: buildDocument({
        source: 'selection',
        title: payload.title,
        text: selection,
        url: payload.url,
        method: 'selection',
        selection,
      }),
      usedFallback: false,
    };
  }

  const dom = new DOMParser().parseFromString(payload.html, 'text/html');
  let text = '';
  let title = payload.title;
  let usedFallback = true;

  if (!options.forceRaw) {
    try {
      const article = new Readability(dom, { charThreshold: MIN_ARTICLE_CHARS }).parse();
      const content = article?.textContent?.trim() ?? '';
      if (content.length >= MIN_ARTICLE_CHARS) {
        text = content;
        title = article?.title || payload.title;
        usedFallback = false;
      }
    } catch (error) {
      console.warn('[capture] Readability thất bại, dùng DOM thô', error);
    }
  }

  if (usedFallback) {
    text = dom.body?.textContent ?? '';
  }

  return {
    document: buildDocument({
      source: 'web_page',
      title,
      text,
      url: payload.url,
      method: usedFallback ? 'raw_dom' : 'readability',
    }),
    usedFallback,
  };
}

/** Dán văn bản tay — dùng khi trang chặn quyền đọc hoặc chỉ có nội dung trong email/PDF. */
export function parsePastedText(title: string, text: string): NormalizedDocument {
  return buildDocument({
    source: 'paste',
    title: title.trim() || 'Văn bản dán tay',
    text,
    method: 'paste',
  });
}
