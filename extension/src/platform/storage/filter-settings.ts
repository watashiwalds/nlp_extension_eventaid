import { FilterSettingsSchema } from '../../shared/contracts';
import type { FilterSettings } from '../../shared/contracts';
import { FILTER_SETTINGS_KEY } from '../../shared/constants';
import { getSetting, setSetting } from './db';

/** Giá trị mặc định lấy từ Zod để không lệch với hợp đồng. */
export const DEFAULT_FILTER_SETTINGS: FilterSettings = FilterSettingsSchema.parse({});

/**
 * Đọc cài đặt và LUÔN validate. Bản ghi hỏng/thiếu trường được thay bằng mặc định
 * thay vì làm sập trang cài đặt hay gửi request sai.
 */
export async function loadFilterSettings(): Promise<FilterSettings> {
  try {
    const raw = await getSetting<unknown>(FILTER_SETTINGS_KEY);
    const parsed = FilterSettingsSchema.safeParse(raw ?? {});
    return parsed.success ? parsed.data : DEFAULT_FILTER_SETTINGS;
  } catch (error) {
    console.warn('[filter-settings] Không đọc được cài đặt sàng lọc', error);
    return DEFAULT_FILTER_SETTINGS;
  }
}

/** Validate trước khi ghi; ném lỗi để form hiển thị thông điệp cụ thể. */
export async function saveFilterSettings(input: unknown): Promise<FilterSettings> {
  const parsed = FilterSettingsSchema.parse(input);
  await setSetting(FILTER_SETTINGS_KEY, parsed);
  return parsed;
}
