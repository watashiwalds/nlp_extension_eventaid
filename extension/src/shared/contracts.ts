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

/* --------------------------- lớp trích xuất LLM -------------------------- */

/** Sự kiện do người dùng nhập (`manual`) hay do pipeline LLM đề xuất (`llm`). */
export const EventOriginSchema = z.enum(['manual', 'llm']);
export type EventOrigin = z.infer<typeof EventOriginSchema>;

/** Dấu vết của lần chạy sinh ra sự kiện; chỉ có ở bản ghi `origin: 'llm'`. */
export const ExtractionMetaSchema = z.object({
  runId: z.string().min(1),
  documentId: z.string().min(1),
  provider: z.enum(['llama.cpp', 'mock']),
  model: z.string().min(1),
  promptVersion: z.string().min(1),
  chunkIndex: z.number().int().nonnegative(),
  chunkCount: z.number().int().positive(),
  /** Model tự báo, KHÔNG phải xác suất đã hiệu chuẩn. */
  confidence: z.number().min(0).max(1),
  latencyMs: z.number().int().nonnegative(),
});
export type ExtractionMeta = z.infer<typeof ExtractionMetaSchema>;

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

/**
 * Nhãn tuỳ chỉnh (tags) — bổ sung ngoài `label` phân loại cố định.
 * `.default([])` giữ tương thích với bản ghi/JSON cũ chưa có trường này.
 */
export const MAX_EVENT_TAGS = 5;
export const MAX_EVENT_TAG_LENGTH = 24;
export const EventTagSchema = z
  .string()
  .trim()
  .min(1, 'Nhãn tuỳ chỉnh không được để trống')
  .max(MAX_EVENT_TAG_LENGTH, `Mỗi nhãn tối đa ${MAX_EVENT_TAG_LENGTH} ký tự`);

/** Sự kiện lịch trình — 7 trường trong base_idea.md. */
export const EventSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, 'Tiêu đề không được để trống').max(120, 'Tiêu đề tối đa 120 ký tự'),
  label: LabelSchema,
  /** Nhãn tuỳ chỉnh do người dùng nhập; không thay thế `label`. */
  tags: z.array(EventTagSchema).max(MAX_EVENT_TAGS, `Tối đa ${MAX_EVENT_TAGS} nhãn tuỳ chỉnh`).default([]),
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
  /** `.default('manual')` giữ đọc được bản ghi cũ chưa có trường này. */
  origin: EventOriginSchema.default('manual'),
  extractionMeta: ExtractionMetaSchema.optional(),
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

/** Số ý tóm tắt tối đa của một candidate do LLM sinh (khác nhập tay). */
export const MAX_CANDIDATE_SUMMARY_ITEMS = 5;

/**
 * Sự kiện đã chuẩn hoá từ output của model — CHƯA phải `Event`:
 * không có `id`, `status`, `sources`, `notifications`.
 */
export const EventCandidateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  label: LabelSchema,
  /** `value = null` khi thiếu ngày hoặc thiếu giờ (không bịa). */
  start: DateTimeRefSchema,
  end: DateTimeRefSchema.nullable(),
  durationMinutes: z.number().int().positive().nullable(),
  summary: z.array(z.string().trim().min(1).max(300)).max(MAX_CANDIDATE_SUMMARY_ITEMS),
  /** Chỉ id trong closed set hồ sơ do người dùng đã tạo. */
  relatedProfiles: z.array(z.string()).max(10),
  confidence: z.number().min(0).max(1),
  uncertain: z.array(z.string()).max(10),
  /** Đoạn nguyên văn dùng để đối chiếu khi duyệt; có thể rỗng. */
  quote: z.string().max(500).optional(),
});
export type EventCandidate = z.infer<typeof EventCandidateSchema>;

export const ExtractionJobStatusSchema = z.enum([
  'queued',
  'running',
  'persisting',
  'done',
  'failed',
  'cancelled',
]);
export type ExtractionJobStatus = z.infer<typeof ExtractionJobStatusSchema>;

/** Trạng thái job trích xuất; lưu ở `chrome.storage.session` (không nằm trong IndexedDB). */
export const ExtractionJobSchema = z.object({
  jobId: z.string().min(1),
  documentId: z.string().min(1),
  status: ExtractionJobStatusSchema,
  /** Chuỗi hiển thị trực tiếp trên UI, ví dụ "Đang đọc đoạn 2/3…". */
  stage: z.string(),
  chunkIndex: z.number().int().nonnegative(),
  chunkCount: z.number().int().nonnegative(),
  candidateCount: z.number().int().nonnegative(),
  error: z.string().nullable(),
  startedAt: z.string(),
  updatedAt: z.string(),
});
export type ExtractionJob = z.infer<typeof ExtractionJobSchema>;

/** Cấu hình máy chủ mô hình cục bộ (llama.cpp) — đọc lên phải validate bằng Zod. */
export const LlmSettingsSchema = z.object({
  endpoint: z.string().url().default('http://127.0.0.1:8080'),
  apiKey: z.string().default(''),
  /** Để trống = dùng đúng model llama-server đang nạp; không khoá cứng một tên. */
  model: z.string().trim().max(200).default(''),
  temperature: z.number().min(0).max(1).default(0.1),
  maxTokens: z.number().int().positive().max(2048).default(1200),
  timeoutMs: z.number().int().positive().max(180_000).default(120_000),
  chunkChars: z.number().int().positive().max(8_000).default(5_000),
  maxChunks: z.number().int().positive().max(20).default(4),
});
export type LlmSettings = z.infer<typeof LlmSettingsSchema>;

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
