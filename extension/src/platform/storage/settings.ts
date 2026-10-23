import { LlmSettingsSchema } from '../../shared/contracts';
import type { LlmSettings } from '../../shared/contracts';
import { getSetting, setSetting } from './db';

/** Khoá trong object store `settings`; không nằm trong IndexedDB riêng. */
export const LLM_SETTINGS_KEY = 'llm';

/** Giá trị mặc định lấy từ Zod để không lệch với hợp đồng. */
export const DEFAULT_LLM_SETTINGS: LlmSettings = LlmSettingsSchema.parse({});

/** Tên model từng bị gán cứng trước khi chuyển sang “để trống = model đang nạp”. */
const LEGACY_DEFAULT_MODEL = 'qwen2.5-3b-instruct';

/**
 * Đọc cài đặt và LUÔN validate. Bản ghi hỏng/thiếu trường được thay bằng mặc định
 * thay vì làm sập trang cài đặt hay gửi request sai.
 */
export async function loadLlmSettings(): Promise<LlmSettings> {
  try {
    const raw = await getSetting<unknown>(LLM_SETTINGS_KEY);
    const parsed = LlmSettingsSchema.safeParse(raw ?? {});
    if (!parsed.success) return DEFAULT_LLM_SETTINGS;
    return parsed.data.model === LEGACY_DEFAULT_MODEL ? { ...parsed.data, model: '' } : parsed.data;
  } catch (error) {
    console.warn('[settings] Không đọc được cài đặt mô hình', error);
    return DEFAULT_LLM_SETTINGS;
  }
}

/** Validate trước khi ghi; ném lỗi để form hiển thị thông điệp cụ thể. */
export async function saveLlmSettings(input: unknown): Promise<LlmSettings> {
  const parsed = LlmSettingsSchema.parse(input);
  await setSetting(LLM_SETTINGS_KEY, parsed);
  return parsed;
}
