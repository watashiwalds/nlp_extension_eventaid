import { z } from 'zod';
import { FilterDecisionSchema, FilterRunModeSchema } from './contracts';
import type { EventStatus, NormalizedDocument } from './contracts';

/**
 * Hợp đồng message giữa popup / side panel / service worker / offscreen.
 * Nội dung tài liệu đi qua IndexedDB, không nhét vào message.
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

/**
 * Message nội bộ cho job trích xuất chạy trong offscreen document.
 * Validate ở biên nhận để một context lỗi không làm hỏng job của context khác.
 */
export const RuntimeMessageSchema = z.union([
  z.object({
    to: z.literal('background'),
    type: z.literal('RUN_EXTRACTION'),
    documentId: z.string().min(1),
    /** Không có = `auto` (theo cài đặt đã lưu). */
    filterRunMode: FilterRunModeSchema.optional(),
  }),
  z.object({
    to: z.literal('background'),
    type: z.literal('CANCEL_EXTRACTION'),
    jobId: z.string().min(1),
  }),
  z.object({
    to: z.literal('offscreen'),
    type: z.literal('RUN_EXTRACTION'),
    jobId: z.string().min(1),
    documentId: z.string().min(1),
    filterRunMode: FilterRunModeSchema.optional(),
  }),
  z.object({
    to: z.literal('offscreen'),
    type: z.literal('CANCEL_EXTRACTION'),
    jobId: z.string().min(1),
  }),
  z.object({
    to: z.literal('background'),
    type: z.literal('JOB_PROGRESS'),
    jobId: z.string().min(1),
    status: z.enum(['running', 'persisting']).default('running'),
    stage: z.string(),
    chunkIndex: z.number().int().nonnegative(),
    chunkCount: z.number().int().nonnegative(),
  }),
  z.object({
    to: z.literal('background'),
    type: z.literal('JOB_DONE'),
    jobId: z.string().min(1),
    candidateCount: z.number().int().nonnegative(),
    savedCount: z.number().int().nonnegative(),
    duplicateCount: z.number().int().nonnegative(),
    chunkCount: z.number().int().nonnegative(),
    truncated: z.boolean(),
    /** Bộ trường sàng lọc — mặc định để message cũ vẫn parse được. */
    filterApplied: z.boolean().default(false),
    filterDecision: FilterDecisionSchema.nullable().default(null),
    filterEvidenceCount: z.number().int().nonnegative().default(0),
    filterTotalSentences: z.number().int().nonnegative().default(0),
    filterConfidence: z.number().min(0).max(1).nullable().default(null),
    filterLatencyMs: z.number().int().nonnegative().default(0),
    filterNote: z.string().nullable().default(null),
  }),
  z.object({
    to: z.literal('background'),
    type: z.literal('JOB_FAILED'),
    jobId: z.string().min(1),
    error: z.string().min(1),
  }),
  z.object({
    to: z.literal('background'),
    type: z.literal('JOB_CANCELLED'),
    jobId: z.string().min(1),
  }),
]);

export type RuntimeMessage = z.infer<typeof RuntimeMessageSchema>;

export type RuntimeResponse =
  | { ok: true; jobId?: string }
  | { ok: false; error: string };

export interface CapturePayload {
  html: string;
  url: string;
  title: string;
  selection: string;
  /** Trang có dấu hiệu SPA chưa render xong nội dung chính. */
  likelyDynamic?: boolean;
  /** HTML sau lọc đã bị cắt do vượt giới hạn. */
  htmlTruncated?: boolean;
}

/** Kết quả sau khi chạy Readability trong context có DOM. */
export interface ParsedCapture {
  document: NormalizedDocument;
  usedFallback: boolean;
}

/** Cờ bàn giao giữa popup / context menu và side panel. */
export interface PendingCapture {
  mode?: 'page' | 'selection';
  /** Vùng chọn do context menu lưu, dự phòng khi selection trên trang đã mất. */
  selectionText?: string;
  requestedAt: number;
}

/** Cờ mở side panel đúng tab sau khi bấm notification. */
export interface PendingOpen {
  tab: 'events';
  status?: EventStatus;
  requestedAt: number;
}
