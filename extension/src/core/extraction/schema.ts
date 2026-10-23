import { z } from 'zod';
import { LABELS, LabelSchema } from '../../shared/contracts';

/**
 * Hợp đồng output của model: Zod (kiểm tra lúc chạy) + JSON Schema (gửi kèm
 * `response_format` cho llama.cpp). Hai bên phải luôn khớp nhau.
 */

export const MAX_EVENTS_PER_CHUNK = 20;

export const RawEventSchema = z.object({
  title: z.string().trim().min(1).max(120),
  label: LabelSchema,
  /** `YYYY-MM-DDTHH:mm` theo giờ địa phương, hoặc null khi thiếu năm/giờ. */
  start: z.string().nullable(),
  end: z.string().nullable(),
  startRaw: z.string().max(200).default(''),
  endRaw: z.string().max(200).default(''),
  summary: z.array(z.string().trim().min(1).max(300)).max(5).default([]),
  confidence: z.number().min(0).max(1),
  uncertain: z.array(z.string()).max(10).default([]),
  quote: z.string().max(300).default(''),
});
export type RawEvent = z.infer<typeof RawEventSchema>;

export const RawExtractionSchema = z.object({
  events: z.array(RawEventSchema).max(MAX_EVENTS_PER_CHUNK),
});
export type RawExtraction = z.infer<typeof RawExtractionSchema>;

/** JSON Schema gửi cho `response_format` (§6.2). */
export const EXTRACTION_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['events'],
  properties: {
    events: {
      type: 'array',
      maxItems: MAX_EVENTS_PER_CHUNK,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'title',
          'label',
          'start',
          'end',
          'startRaw',
          'endRaw',
          'summary',
          'confidence',
          'uncertain',
          'quote',
        ],
        properties: {
          title: { type: 'string', maxLength: 120 },
          label: { enum: [...LABELS] },
          start: { type: ['string', 'null'] },
          end: { type: ['string', 'null'] },
          startRaw: { type: 'string' },
          endRaw: { type: 'string' },
          summary: { type: 'array', maxItems: 5, items: { type: 'string' } },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          uncertain: { type: 'array', maxItems: 10, items: { type: 'string' } },
          quote: { type: 'string', maxLength: 300 },
        },
      },
    },
  },
} as const;

export type RawParseResult =
  | { ok: true; value: RawExtraction }
  | { ok: false; error: string };

/** Bỏ khối suy luận của các model “thinking” nếu template vẫn chèn vào `content`. */
export function stripThinking(text: string): string {
  return text.replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, '').trim();
}

/** Bỏ rào markdown mà nhiều model vẫn tự thêm dù đã dặn. */
export function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return (fenced?.[1] ?? trimmed).trim();
}

/**
 * Parse output thô. Mọi sai lệch (JSON hỏng, thiếu trường, sai kiểu, quá số
 * lượng) đều bị TỪ CHỐI — không bao giờ tự "vá" để tạo sự kiện rác.
 */
export function parseRawExtraction(raw: string): RawParseResult {
  let json: unknown;
  try {
    json = JSON.parse(stripCodeFence(stripThinking(raw)));
  } catch {
    return { ok: false, error: 'Output không phải JSON hợp lệ' };
  }
  const parsed = RawExtractionSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path.join('.') || '(root)';
    return { ok: false, error: `Output sai schema tại ${path}: ${first?.message ?? 'không rõ'}` };
  }
  return { ok: true, value: parsed.data };
}
