import type { EventStatus, Label } from '../../shared/contracts';
import { clearAll, exportAll, importAll } from '../../platform/storage/db';
import { DEFAULT_LLM_SETTINGS } from '../../platform/storage/settings';
import { EMPTY_EVENT_DRAFT, EMPTY_PROFILE_DRAFT, loadAll, showToast, store } from '../store';
import { messageOf, valueOf } from './shared';

export async function exportData(): Promise<void> {
  try {
    const payload = await exportAll();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `lich-trinh-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Đã xuất dữ liệu ra tệp JSON.');
  } catch (error) {
    showToast('error', messageOf(error));
  }
}

export async function importData(file: File): Promise<void> {
  store.set({ busy: 'Đang nhập dữ liệu…' });
  try {
    const text = await file.text();
    const parsed: unknown = JSON.parse(text);
    const summary = await importAll(parsed);
    await loadAll();
    showToast(
      'success',
      `Đã nhập ${summary.profiles} hồ sơ, ${summary.events} sự kiện, ${summary.documents} nội dung${
        summary.skipped ? ` (bỏ qua ${summary.skipped} bản ghi lỗi)` : ''
      }.`,
    );
  } catch (error) {
    showToast('error', `Không nhập được tệp: ${messageOf(error)}`);
  } finally {
    store.set({ busy: null });
  }
}

export function clearAllData(): void {
  if (!window.confirm('Xoá toàn bộ nội dung, hồ sơ và sự kiện? Thao tác này không thể hoàn tác.')) {
    return;
  }
  void (async () => {
    store.set({ busy: 'Đang xoá dữ liệu…' });
    try {
      await clearAll();
      store.set({
        documents: [],
        activeDocumentId: null,
        profiles: [],
        events: [],
        expandedEventId: null,
        overviewProfileId: null,
        eventForm: {
          open: false,
          editingId: null,
          sourceDocumentId: null,
          values: EMPTY_EVENT_DRAFT,
          errors: {},
        },
        profileForm: { open: false, editingId: null, values: EMPTY_PROFILE_DRAFT, errors: {} },
        llm: DEFAULT_LLM_SETTINGS,
        llmHealth: null,
      });
      showToast('success', 'Đã xoá toàn bộ dữ liệu cục bộ.');
    } catch (error) {
      showToast('error', messageOf(error));
    } finally {
      store.set({ busy: null });
    }
  })();
}

const STATUS_VALUES: Array<EventStatus | 'all'> = ['nhap', 'dang_theo_doi', 'hoan_thanh', 'huy', 'all'];
const LABEL_VALUES: Array<Label | 'all'> = ['công_vụ', 'giải_trí', 'cá_nhân', 'kỷ_niệm', 'khác', 'all'];

export function applyFilterFromForm(form: HTMLFormElement): void {
  const statusValue = valueOf(form, 'status');
  const labelValue = valueOf(form, 'label');
  const tagValue = valueOf(form, 'tag').trim();
  const status = STATUS_VALUES.find((item) => item === statusValue) ?? 'all';
  const label = LABEL_VALUES.find((item) => item === labelValue) ?? 'all';
  store.set({
    eventFilter: { status, label, tag: tagValue || 'all', query: valueOf(form, 'query') },
  });
}

export function clearFilter(): void {
  store.set({ eventFilter: { status: 'all', label: 'all', tag: 'all', query: '' } });
}
