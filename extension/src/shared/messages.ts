import type { NormalizedDocument } from './contracts';

/**
 * Hợp đồng message giữa popup / side panel / service worker.
 * Demo chỉ cần yêu cầu mở panel; nội dung đi qua IndexedDB, không nhét vào message.
 */
export type Request =
  | { type: 'OPEN_SIDE_PANEL'; tabId?: number }
  | { type: 'DOCUMENTS_CHANGED' }
  | { type: 'PROFILES_CHANGED' }
  | { type: 'EVENTS_CHANGED' };

export type Response =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: true; counts: { documents: number; profiles: number; events: number } };

export interface CapturePayload {
  html: string;
  url: string;
  title: string;
  selection: string;
}

/** Kết quả sau khi chạy Readability trong context có DOM. */
export interface ParsedCapture {
  document: NormalizedDocument;
  usedFallback: boolean;
}
