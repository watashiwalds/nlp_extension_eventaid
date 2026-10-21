import { PENDING_CAPTURE_KEY } from '../shared/constants';
import type { EventStatus } from '../shared/contracts';
import { hideToast, loadAll, store } from './store';
import type { Tab } from './store';
import { renderApp } from './render';
import { activeDocument } from './store';
import {
  applyFilterFromForm,
  captureCurrentPage,
  changeStatusAction,
  clearAllData,
  clearFilter,
  closeEventForm,
  closeProfileForm,
  deleteActiveDocumentAction,
  deleteEventAction,
  deleteProfileAction,
  exportData,
  importData,
  openEventForm,
  openProfileForm,
  saveEventFromForm,
  savePastedText,
  saveProfileFromForm,
  selectDocument,
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
  const nextView = root.querySelector('#view');
  if (nextView instanceof HTMLElement) nextView.scrollTop = scrollTop;
}

function isStatus(value: string | undefined): value is EventStatus {
  return value !== undefined && (STATUSES as string[]).includes(value);
}

function handleClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
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
    case 'capture-page':
      void captureCurrentPage();
      break;
    case 'open-paste':
      store.set({ pasteOpen: true });
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

  const filterForm = target.closest<HTMLFormElement>('#filter-form');
  if (filterForm) applyFilterFromForm(filterForm);
}

let consuming = false;

async function consumePendingCapture(): Promise<void> {
  if (consuming) return;
  consuming = true;
  try {
    const bag = await chrome.storage.session.get(PENDING_CAPTURE_KEY);
    if (!bag[PENDING_CAPTURE_KEY]) return;
    await chrome.storage.session.remove(PENDING_CAPTURE_KEY);
    await captureCurrentPage();
  } catch (error) {
    console.warn('[sidepanel] Không xử lý được yêu cầu quét', error);
  } finally {
    consuming = false;
  }
}

root.addEventListener('click', handleClick);
root.addEventListener('submit', handleSubmit);
root.addEventListener('change', handleChange);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'session' && changes[PENDING_CAPTURE_KEY]?.newValue) {
    void consumePendingCapture();
  }
});

store.subscribe(render);
render();
void loadAll();
void consumePendingCapture();
