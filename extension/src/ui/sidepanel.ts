import { EXTRACTION_JOB_KEY, PENDING_CAPTURE_KEY, PENDING_OPEN_KEY } from '../shared/constants';
import type { EventStatus } from '../shared/contracts';
import { parseStoredJob } from '../platform/background/jobs';
import { hideToast, loadAll, store } from './store';
import type { Tab } from './store';
import { renderApp } from './render';
import { handleProviderChange, syncProviderPanels } from './provider-panels';
import { checkSettingsHealth, submitSettingsForm } from './settings-wiring';
import { activeDocument } from './store';
import {
  applyFilterFromForm,
  applyJob,
  bulkApproveDrafts,
  captureCurrentPage,
  cancelExtractionAction,
  changeStatusAction,
  clearAllData,
  clearFilter,
  closeEventForm,
  closeProfileForm,
  consumePendingCapture,
  consumePendingOpen,
  deleteActiveDocumentAction,
  deleteEventAction,
  deleteLlmApiKeyAction,
  deleteProfileAction,
  deleteSelectedDrafts,
  deleteUnlinkedDocumentsAction,
  enterReviewMode,
  exitReviewMode,
  exportData,
  extractEventsAction,
  importData,
  keepBothDuplicates,
  openDuplicateEvent,
  openEventForm,
  openProfileForm,
  revokeLlmConsentAction,
  saveEventFromForm,
  savePastedText,
  saveProfileFromForm,
  selectAllVisibleDrafts,
  selectDocument,
  syncExtractionJob,
  syncReviewSelectionUi,
  toggleDraftSelection,
  toggleEventAction,
} from './actions';

const rootElement = document.getElementById('app');
if (!rootElement) throw new Error('Thiếu phần tử #app');
const root: HTMLElement = rootElement;

const STATUSES: EventStatus[] = ['nhap', 'dang_theo_doi', 'hoan_thanh', 'huy'];

let scrollTop = 0;

function render(): void {
  const currentView = root.querySelector('#view');
  if (currentView instanceof HTMLElement) scrollTop = currentView.scrollTop;
  root.innerHTML = renderApp(store.get());
  syncProviderPanels(root);
  syncReviewSelectionUi(root);
  const nextView = root.querySelector('#view');
  if (nextView instanceof HTMLElement) nextView.scrollTop = scrollTop;
}

function isStatus(value: string | undefined): value is EventStatus {
  return value !== undefined && (STATUSES as string[]).includes(value);
}

function handleClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const trigger = target.closest<HTMLElement>('[data-action]');
  if (!trigger) return;

  const id = trigger.dataset.id ?? '';
  const action = trigger.dataset.action ?? '';

  switch (action) {
    case 'tab': {
      const tab = trigger.dataset.tab as Tab | undefined;
      if (tab) store.set({ tab });
      break;
    }
    case 'goto-events':
    case 'goto-profiles': {
      const tab: Tab = action === 'goto-events' ? 'events' : 'profiles';
      const status = trigger.dataset.status;
      const eventId = trigger.dataset.eventId;
      store.set((state) => ({
        ...state,
        tab,
        eventForm: { ...state.eventForm, open: false },
        profileForm: { ...state.profileForm, open: false },
        eventFilter: isStatus(status) ? { ...state.eventFilter, status } : state.eventFilter,
        expandedEventId: eventId ?? state.expandedEventId,
      }));
      break;
    }
    case 'goto-capture':
      store.set({ tab: 'capture' });
      break;
    case 'capture-page':
      void captureCurrentPage();
      break;
    case 'capture-raw':
      void captureCurrentPage({ forceRaw: true });
      break;
    case 'extract-events':
      void extractEventsAction();
      break;
    case 'cancel-extraction':
      cancelExtractionAction();
      break;
    case 'check-llm':
    case 'check-filter':
      checkSettingsHealth(action, trigger);
      break;
    case 'revoke-consent':
      void revokeLlmConsentAction(trigger.dataset.origin ?? '');
      break;
    case 'delete-llm-key':
      void deleteLlmApiKeyAction();
      break;
    case 'open-paste':
      store.set({ tab: 'capture', pasteOpen: true });
      break;
    case 'close-paste':
      store.set({ pasteOpen: false });
      break;
    case 'toggle-document':
      store.set((state) => ({ ...state, expandedDocument: !state.expandedDocument }));
      break;
    case 'delete-document':
      deleteActiveDocumentAction();
      break;
    case 'delete-unlinked-documents':
      deleteUnlinkedDocumentsAction();
      break;
    case 'new-event':
      openEventForm({
        sourceDocumentId: trigger.dataset.docId ?? activeDocument(store.get())?.documentId ?? null,
      });
      break;
    case 'edit-event':
      if (id) openEventForm({ eventId: id });
      break;
    case 'cancel-event-form':
      closeEventForm();
      break;
    case 'delete-event':
      if (id) deleteEventAction(id);
      break;
    case 'toggle-event':
      if (id) toggleEventAction(id);
      break;
    case 'enter-review':
      enterReviewMode();
      break;
    case 'exit-review':
      exitReviewMode();
      break;
    case 'approve-selected-drafts':
      void bulkApproveDrafts();
      break;
    case 'delete-selected-drafts':
      void deleteSelectedDrafts();
      break;
    case 'keep-both-duplicates':
      keepBothDuplicates(id, trigger.dataset.otherId ?? '');
      break;
    case 'open-duplicate':
      if (id) openDuplicateEvent(id);
      break;
    case 'set-status': {
      const status = trigger.dataset.status;
      if (id && isStatus(status)) changeStatusAction(id, status);
      break;
    }
    case 'new-profile':
      openProfileForm();
      break;
    case 'edit-profile':
      if (id) openProfileForm(id);
      break;
    case 'cancel-profile-form':
      closeProfileForm();
      break;
    case 'delete-profile':
      if (id) deleteProfileAction(id);
      break;
    case 'select-overview-profile': {
      const profileId = trigger.dataset.profileId ?? '';
      store.set({ overviewProfileId: profileId || null });
      break;
    }
    case 'clear-filter':
      clearFilter();
      break;
    case 'export-data':
      void exportData();
      break;
    case 'import-data': {
      const input = root.querySelector<HTMLInputElement>('#import-file');
      input?.click();
      break;
    }
    case 'clear-all':
      clearAllData();
      break;
    case 'hide-toast':
      hideToast();
      break;
    case 'reload':
      void loadAll();
      break;
    default:
      break;
  }
}

function handleSubmit(event: SubmitEvent): void {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();

  if (form.id === 'paste-form') {
    void savePastedText(form);
    return;
  }
  if (form.id === 'event-form') {
    void saveEventFromForm(form);
    return;
  }
  if (form.id === 'profile-form') {
    void saveProfileFromForm(form);
    return;
  }
  if (form.id === 'llm-settings-form' || form.id === 'filter-settings-form') {
    submitSettingsForm(form);
    return;
  }
  if (form.id === 'filter-form') {
    applyFilterFromForm(form);
  }
}

function handleChange(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;

  if (target instanceof HTMLInputElement && target.id === 'import-file') {
    const file = target.files?.[0];
    target.value = '';
    if (file) void importData(file);
    return;
  }

  if (target.dataset.action === 'select-document') {
    selectDocument(target.value);
    return;
  }

  if (handleProviderChange(root, target)) return;

  if (target.dataset.action === 'toggle-draft') {
    toggleDraftSelection(target.dataset.id ?? '');
    return;
  }

  if (target.dataset.action === 'select-all-drafts') {
    selectAllVisibleDrafts(target instanceof HTMLInputElement && target.checked);
    return;
  }

  const filterForm = target.closest<HTMLFormElement>('#filter-form');
  if (filterForm) applyFilterFromForm(filterForm);
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;
  const state = store.get();
  if (state.eventForm.open) {
    closeEventForm();
  } else if (state.profileForm.open) {
    closeProfileForm();
  } else if (state.pasteOpen) {
    store.set({ pasteOpen: false });
  } else if (state.reviewMode) {
    exitReviewMode();
  }
}

root.addEventListener('click', handleClick);
root.addEventListener('submit', handleSubmit);
root.addEventListener('change', handleChange);
root.addEventListener('keydown', handleKeydown);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'session') return;
  if (changes[PENDING_CAPTURE_KEY]?.newValue) void consumePendingCapture();
  if (changes[PENDING_OPEN_KEY]?.newValue) void consumePendingOpen();

  const jobChange = changes[EXTRACTION_JOB_KEY];
  if (jobChange) {
    const job = parseStoredJob(jobChange.newValue);
    if (job) applyJob(job);
    else store.set({ extraction: null });
  }
});

store.subscribe(render);
render();
void loadAll();
void consumePendingCapture();
void consumePendingOpen();
void syncExtractionJob();

/**
 * Nhãn thời gian ("đang diễn ra", "còn N ngày"…) được tính tại thời điểm render,
 * nên cần render lại định kỳ để không bị "đóng băng" theo mốc cũ.
 */
const CLOCK_REFRESH_MS = 30_000;

function hasFocusedField(): boolean {
  const active = document.activeElement;
  return (
    active instanceof Element &&
    active.closest('input, textarea, select, [contenteditable="true"]') !== null
  );
}

function refreshClock(): void {
  const state = store.get();
  if (state.status !== 'ready') return;
  if (state.eventForm.open || state.profileForm.open || state.pasteOpen) return;
  if (hasFocusedField()) return;
  store.set((current) => ({ ...current }));
}

window.setInterval(refreshClock, CLOCK_REFRESH_MS);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshClock();
});
