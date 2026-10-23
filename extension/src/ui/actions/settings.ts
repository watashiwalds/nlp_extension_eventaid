import { LlmSettingsSchema } from '../../shared/contracts';
import { displayModelName, LlamaCppProvider } from '../../platform/inference/llama-cpp';
import { saveLlmSettings } from '../../platform/storage/settings';
import { showToast, store } from '../store';
import { messageOf, valueOf } from './shared';

function numberField(form: HTMLFormElement, name: string): number {
  return Number(valueOf(form, name).trim());
}

/** Lưu cấu hình máy chủ mô hình; validate trước khi ghi và báo lỗi theo trường. */
export async function saveLlmSettingsFromForm(form: HTMLFormElement): Promise<void> {
  const parsed = LlmSettingsSchema.safeParse({
    endpoint: valueOf(form, 'endpoint').trim(),
    apiKey: valueOf(form, 'apiKey'),
    model: valueOf(form, 'model').trim(),
    temperature: numberField(form, 'temperature'),
    maxTokens: numberField(form, 'maxTokens'),
    timeoutMs: numberField(form, 'timeoutMs'),
    chunkChars: numberField(form, 'chunkChars'),
    maxChunks: numberField(form, 'maxChunks'),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.join('.') ?? 'cài đặt';
    showToast('error', `Giá trị “${where}” không hợp lệ: ${issue?.message ?? 'kiểm tra lại'}.`);
    return;
  }

  store.set({ busy: 'Đang lưu cài đặt…' });
  try {
    const saved = await saveLlmSettings(parsed.data);
    store.set({ llm: saved, llmHealth: null });
    showToast('success', 'Đã lưu cài đặt máy chủ mô hình.');
  } catch (error) {
    showToast('error', messageOf(error));
  } finally {
    store.set({ busy: null });
  }
}

/** Gọi `/health` với timeout 2 giây và hiển thị kết quả ngay dưới form. */
export async function checkLlmHealthAction(): Promise<void> {
  const llm = store.get().llm;
  store.set({ llmHealth: { status: 'checking', message: 'Đang kiểm tra kết nối…' } });

  const provider = new LlamaCppProvider({
    endpoint: llm.endpoint,
    apiKey: llm.apiKey,
    model: llm.model,
    timeoutMs: llm.timeoutMs,
  });
  const health = await provider.health();
  const message = health.ok
    ? health.model
      ? `Kết nối được máy chủ. Model: ${displayModelName(health.model)}.`
      : 'Kết nối được máy chủ và model đã sẵn sàng.'
    : health.reason;

  store.set({
    llmHealth: health.ok
      ? { status: 'ok', message }
      : { status: 'error', message: health.reason },
  });
}
