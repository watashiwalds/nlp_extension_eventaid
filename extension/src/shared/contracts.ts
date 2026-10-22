import { z } from 'zod';

/**
 * NGUỒN HỢP ĐỒNG DUY NHẤT của demo.
 * Mọi payload đi qua IndexedDB / message giữa các context đều được validate bằng schema ở đây.
 * Bản demo giữ đúng 7 trường sự kiện trong `base_idea.md` và lược bỏ phần do LLM sinh
 * (xem docs/DEVIATIONS.md).
 */

export const LABELS = ['công_vụ', 'giải_trí', 'cá_nhân', 'kỷ_niệm', 'khác'] as const;
export const LabelSchema = z.enum(LABELS);
export type Label = z.infer<typeof LabelSchema>;

export const EVENT_STATUSES = ['nhap', 'dang_theo_doi', 'hoan_thanh', 'huy'] as const;
export const EventStatusSchema = z.enum(EVENT_STATUSES);
export type EventStatus = z.infer<typeof EventStatusSchema>;

export const SOURCE_KINDS = ['web_page', 'selection', 'paste'] as const;
export const SourceKindSchema = z.enum(SOURCE_KINDS);
export type SourceKind = z.infer<typeof SourceKindSchema>;

export const EXTRACTION_METHODS = ['readability', 'raw_dom', 'selection', 'paste'] as const;
export const ExtractionMethodSchema = z.enum(EXTRACTION_METHODS);
export type ExtractionMethod = z.infer<typeof ExtractionMethodSchema>;

export const MILESTONES = ['1_tuan_truoc', '1_ngay_truoc', 'ngay_dien_ra'] as const;
export const MILESTONE_VALUES = ['1_tuan_truoc', '1_ngay_truoc', 'ngay_dien_ra'] as const;

/** Hồ sơ người dùng (KS-02). */
export const ProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, 'Tên hồ sơ không được để trống').max(80, 'Tên hồ sơ tối đa 80 ký tự'),
  role: z.string().trim().max(80, 'Chức vị tối đa 80 ký tự'),
  org: z.string().trim().max(120, 'Đơn vị tối đa 120 ký tự'),
  email: z.union([z.literal(''), z.string().trim().email('Email không hợp lệ')]),
  nicknames: z.array(z.string().trim().min(1).max(40)).max(10, 'Tối đa 10 biệt danh'),
  keywords: z.array(z.string().trim().min(1).max(40)).max(20, 'Tối đa 20 từ khoá'),
  notes: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự'),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Profile = z.infer<typeof ProfileSchema>;

/** Nguồn trích gắn vào sự kiện. */
export const SourceRefSchema = z.object({
  documentId: z.string().min(1),
  kind: SourceKindSchema,
  title: z.string(),
  url: z.string().optional(),
  quote: z.string().optional(),
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

export const DateTimeRefSchema = z.object({
  /** ISO 8601 local, ví dụ `2026-11-02T09:00`. null = chưa xác định. */
  value: z.string().nullable(),
  /** Chuỗi gốc người dùng nhập / đọc được. */
  raw: z.string().nullable(),
});
export type DateTimeRef = z.infer<typeof DateTimeRefSchema>;

/**
 * Tóm tắt nhập tay: không giới hạn 5 ý như LLM.
 * Cap 50 chỉ để tránh dữ liệu rác; pipeline LLM sau này vẫn truyền 5.
 */
export const MAX_SUMMARY_ITEMS = 50;

/** Sự kiện lịch trình — 7 trường trong base_idea.md. */
export const EventSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, 'Tiêu đề không được để trống').max(120, 'Tiêu đề tối đa 120 ký tự'),
  label: LabelSchema,
  start: DateTimeRefSchema,
  end: DateTimeRefSchema.nullable(),
  durationMinutes: z.number().int().positive().max(60 * 24 * 30).nullable(),
  summary: z
    .array(z.string().trim().min(1).max(300))
    .max(MAX_SUMMARY_ITEMS, `Tóm tắt tối đa ${MAX_SUMMARY_ITEMS} ý`),
  relatedProfiles: z.array(z.string()),
  sources: z.array(SourceRefSchema),
  status: EventStatusSchema,
  validation: z.object({ uncertain: z.array(z.string()) }),
  notifications: z.object({
    milestones: z.array(z.enum(MILESTONE_VALUES)),
    fired: z.array(z.string()),
    mute: z.boolean(),
  }),
  origin: z.literal('manual'),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
});
export type Event = z.infer<typeof EventSchema>;

/** Tài liệu đã chuẩn hoá sau bước đọc trang (chưa qua NLP). */
export const NormalizedDocumentSchema = z.object({
  documentId: z.string().min(1),
  source: SourceKindSchema,
  title: z.string(),
  text: z.string(),
  sourceUrl: z.string().optional(),
  capturedAt: z.string(),
  extractionMethod: ExtractionMethodSchema,
  contentHash: z.string(),
  truncated: z.boolean(),
  charCount: z.number().int().nonnegative(),
  selection: z.string().optional(),
});
export type NormalizedDocument = z.infer<typeof NormalizedDocumentSchema>;

/** Bản ghi cài đặt đơn giản (key/value) lưu cùng IndexedDB. */
export const SettingSchema = z.object({
  key: z.string(),
  value: z.unknown(),
});
export type Setting = z.infer<typeof SettingSchema>;

export const STORES = {
  documents: 'documents',
  profiles: 'profiles',
  events: 'events',
  settings: 'settings',
} as const;
