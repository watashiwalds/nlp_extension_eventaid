import type {
  Event,
  EventStatus,
  Label,
  LlmSettings,
  NormalizedDocument,
  Profile,
} from '../shared/contracts';
import type { FormErrors } from '../core/forms';
import { pruneDraftSelectionIds } from '../core/event-review';
import { listDocuments, listEvents, listProfiles } from '../platform/storage/db';
import { DEFAULT_LLM_SETTINGS, loadLlmSettings } from '../platform/storage/settings';

/** Store pub/sub tối giản — không dùng Redux/Zustand. */
export function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<(state: T) => void>();

  return {
    get(): T {
      return state;
    },
    set(patch: Partial<T> | ((current: T) => T)): void {
      state = typeof patch === 'function' ? patch(state) : { ...state, ...patch };
      for (const listener of listeners) listener(state);
    },
    subscribe(listener: (state: T) => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type Tab = 'overview' | 'capture' | 'events' | 'profiles' | 'settings';
export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  tone: ToastTone;
  message: string;
}

export interface EventFilterState {
  status: EventStatus | 'all';
  label: Label | 'all';
  /** Nhãn tuỳ chỉnh đang lọc; `'all'` = mọi nhãn. */
  tag: string | 'all';
  query: string;
}

/** Giá trị thô của form sự kiện (chuỗi từ DOM), giữ lại khi validate lỗi. */
export interface EventDraft {
  title: string;
  label: string;
  /** Nhãn tuỳ chỉnh, chuỗi thô cách nhau bằng dấu phẩy. */
  tags: string;
  /** Ngày và giờ tách riêng để form không tràn khi side panel hẹp. */
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  duration: string;
  summary: string;
  profileIds: string[];
  attachSource: boolean;
}

export interface ProfileDraft {
  name: string;
  role: string;
  org: string;
  email: string;
  nicknames: string;
  keywords: string;
  notes: string;
}

export interface EventFormState {
  open: boolean;
  editingId: string | null;
  sourceDocumentId: string | null;
  values: EventDraft;
  errors: FormErrors;
}

export interface ProfileFormState {
  open: boolean;
  editingId: string | null;
  values: ProfileDraft;
  errors: FormErrors;
}

/** Tiến trình một lần trích, hiển thị ở tab Quét nội dung. */
export interface ExtractionState {
  /** ID job trong `chrome.storage.session`; `'pending'` khi vừa gửi yêu cầu. */
  jobId?: string;
  stage: string;
  chunkIndex: number;
  chunkCount: number;
}

export interface AppState {
  tab: Tab;
  status: 'loading' | 'ready' | 'error';
  loadError: string | null;
  documents: NormalizedDocument[];
  activeDocumentId: string | null;
  profiles: Profile[];
  events: Event[];
  eventFilter: EventFilterState;
  /** Chế độ Duyệt nháp — chỉ UI state, không lưu DB. */
  reviewMode: boolean;
  /** Trạng thái cần khôi phục khi thoát chế độ duyệt. */
  reviewReturnStatus: EventStatus | 'all';
  /** Id nháp đang được chọn để duyệt/xoá hàng loạt (chỉ UI state). */
  selectedDraftIds: string[];
  /** Cặp gợi ý trùng người dùng đã chọn “Giữ cả hai” (chỉ UI state). */
  dismissedSuggestionKeys: string[];
  /** Hồ sơ đang xem ở tab Tổng quan; `null` = tất cả. */
  overviewProfileId: string | null;
  eventForm: EventFormState;
  profileForm: ProfileFormState;
  expandedEventId: string | null;
  expandedDocument: boolean;
  pasteOpen: boolean;
  llm: LlmSettings;
  extraction: ExtractionState | null;
  toast: Toast | null;
  busy: string | null;
}

export const EMPTY_EVENT_DRAFT: EventDraft = {
  title: '',
  label: 'công_vụ',
  tags: '',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  duration: '',
  summary: '',
  profileIds: [],
  attachSource: true,
};

export const EMPTY_PROFILE_DRAFT: ProfileDraft = {
  name: '',
  role: '',
  org: '',
  email: '',
  nicknames: '',
  keywords: '',
  notes: '',
};

export const store = createStore<AppState>({
  tab: 'overview',
  status: 'loading',
  loadError: null,
  documents: [],
  activeDocumentId: null,
  profiles: [],
  events: [],
  eventFilter: { status: 'all', label: 'all', tag: 'all', query: '' },
  reviewMode: false,
  reviewReturnStatus: 'all',
  selectedDraftIds: [],
  dismissedSuggestionKeys: [],
  overviewProfileId: null,
  eventForm: {
    open: false,
    editingId: null,
    sourceDocumentId: null,
    values: EMPTY_EVENT_DRAFT,
    errors: {},
  },
  profileForm: { open: false, editingId: null, values: EMPTY_PROFILE_DRAFT, errors: {} },
  expandedEventId: null,
  expandedDocument: false,
  pasteOpen: false,
  llm: DEFAULT_LLM_SETTINGS,
  extraction: null,
  toast: null,
  busy: null,
});

export function activeDocument(state: AppState): NormalizedDocument | null {
  const id = state.activeDocumentId;
  if (!id) return state.documents[0] ?? null;
  return state.documents.find((doc) => doc.documentId === id) ?? null;
}

export function editingEvent(state: AppState): Event | null {
  const id = state.eventForm.editingId;
  return id ? state.events.find((event) => event.id === id) ?? null : null;
}

export function editingProfile(state: AppState): Profile | null {
  const id = state.profileForm.editingId;
  return id ? state.profiles.find((profile) => profile.id === id) ?? null : null;
}

export async function loadAll(): Promise<void> {
  try {
    const [documents, profiles, events, llm] = await Promise.all([
      listDocuments(),
      listProfiles(),
      listEvents(),
      loadLlmSettings(),
    ]);
    const current = store.get();
    const mergedDocuments = mergeById(documents, current.documents, (doc) => doc.documentId).sort(
      (a, b) => b.capturedAt.localeCompare(a.capturedAt),
    );
    const mergedProfiles = mergeById(profiles, current.profiles, (profile) => profile.id);
    const mergedEvents = mergeById(events, current.events, (event) => event.id);
    const activeId =
      current.activeDocumentId &&
      mergedDocuments.some((doc) => doc.documentId === current.activeDocumentId)
        ? current.activeDocumentId
        : mergedDocuments[0]?.documentId ?? null;

    store.set({
      documents: mergedDocuments,
      profiles: mergedProfiles,
      events: mergedEvents,
      selectedDraftIds: pruneDraftSelectionIds(current.selectedDraftIds, mergedEvents),
      llm,
      activeDocumentId: activeId,
      overviewProfileId:
        current.overviewProfileId &&
        mergedProfiles.some((profile) => profile.id === current.overviewProfileId)
          ? current.overviewProfileId
          : null,
      status: 'ready',
      loadError: null,
    });
  } catch (error) {
    store.set({
      status: 'error',
      loadError: error instanceof Error ? error.message : 'Không đọc được dữ liệu cục bộ',
    });
  }
}

/** Giữ bản ghi vừa tạo trong bộ nhớ nếu lần đọc DB chạy trước khi ghi xong. */
function mergeById<T>(persisted: T[], current: T[], keyOf: (item: T) => string): T[] {
  const map = new Map(persisted.map((item) => [keyOf(item), item]));
  for (const item of current) map.set(keyOf(item), item);
  return [...map.values()];
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function showToast(tone: ToastTone, message: string): void {
  if (toastTimer) clearTimeout(toastTimer);
  store.set({ toast: { tone, message } });
  toastTimer = setTimeout(() => {
    store.set({ toast: null });
  }, 4200);
}

export function hideToast(): void {
  if (toastTimer) clearTimeout(toastTimer);
  store.set({ toast: null });
}

export function isoNow(): string {
  return new Date().toISOString();
}
