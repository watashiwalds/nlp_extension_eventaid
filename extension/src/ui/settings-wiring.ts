import { checkFilterHealthAction, saveFilterSettingsFromForm } from './actions/filter-settings';
import { checkLlmHealthAction, saveLlmSettingsFromForm } from './actions/settings';

/**
 * Nối form Cài đặt (LLM + sàng lọc) với handler chung để `sidepanel.ts`
 * không phình thêm mỗi lần có một form mới.
 */

export function submitSettingsForm(form: HTMLFormElement): boolean {
  if (form.id === 'llm-settings-form') {
    void saveLlmSettingsFromForm(form);
    return true;
  }
  if (form.id === 'filter-settings-form') {
    void saveFilterSettingsFromForm(form);
    return true;
  }
  return false;
}

export function isSettingsHealthAction(action: string): boolean {
  return action === 'check-llm' || action === 'check-filter';
}

/** Gọi đúng hàm kiểm tra của form chứa nút; trả `false` nếu không phải nút Cài đặt. */
export function checkSettingsHealth(action: string, trigger: HTMLElement): boolean {
  if (!isSettingsHealthAction(action)) return false;
  const form = trigger.closest('form');
  const element = form instanceof HTMLFormElement ? form : undefined;
  if (action === 'check-filter') void checkFilterHealthAction(element);
  else void checkLlmHealthAction(element);
  return true;
}
