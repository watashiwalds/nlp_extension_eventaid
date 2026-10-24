import { parseEventDate } from '../core/dates';
import { escapeHtml } from './components';

export function hostnameOf(url?: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function formatCharCount(count: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(count)} ký tự`;
}

/** Câu nhắc khi tài liệu dài hơn giới hạn trích xuất. */
export function truncationText(processedChars: number): string {
  return `Chỉ xử lý khoảng ${formatCharCount(processedChars)} đầu tiên. Tăng "Số đoạn tối đa" hoặc "Ký tự mỗi đoạn" trong Cài đặt nếu cần.`;
}

/** Chuyển văn bản thuần thành các đoạn HTML đã escape (giữ xuống dòng). */
export function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function shorten(text: string, max = 180): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export function monthShort(value: string): string {
  const date = parseEventDate(value);
  if (!date) return '—';
  return `TH${date.getMonth() + 1}`;
}

export function dayOfMonth(value: string): string {
  const date = parseEventDate(value);
  if (!date) return '?';
  return date.getDate().toString().padStart(2, '0');
}
