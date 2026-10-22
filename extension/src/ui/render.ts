import type { AppState } from './store';
import { countByStatus } from '../core/events';
import { icon, toastHtml } from './components';
import { overviewView } from './views/overview';
import { captureView } from './views/capture';
import { eventsView } from './views/events';
import { profilesView } from './views/profiles';
import { settingsView } from './views/settings';

function tabs(state: AppState): string {
  const counts = countByStatus(state.events);
  const items: { tab: AppState['tab']; label: string; short?: string; count?: number }[] = [
    { tab: 'overview', label: 'Tổng quan', short: 'Tổng quan' },
    { tab: 'capture', label: 'Quét nội dung', short: 'Quét' },
    { tab: 'events', label: 'Sự kiện', short: 'Sự kiện', count: counts.nhap + counts.dang_theo_doi },
    { tab: 'profiles', label: 'Hồ sơ', short: 'Hồ sơ', count: state.profiles.length },
  ];
  return `<nav class="tabs" aria-label="Điều hướng">
    <div class="tabs__scroll" role="tablist">
      ${items
        .map(
          (item) => `<button type="button" role="tab" aria-selected="${state.tab === item.tab}" class="tab ${
            state.tab === item.tab ? 'tab--active' : ''
          }" data-action="tab" data-tab="${item.tab}">
            <span class="tab__full">${item.label}</span>
            <span class="tab__short">${item.short ?? item.label}</span>
            ${item.count ? `<span class="tab__count">${item.count}</span>` : ''}
          </button>`,
        )
        .join('')}
    </div>
    <button type="button" role="tab" aria-selected="${state.tab === 'settings'}" class="tab tab--icon tabs__settings ${
      state.tab === 'settings' ? 'tab--active' : ''
    }" data-action="tab" data-tab="settings" title="Cài đặt" aria-label="Cài đặt">${icon('settings')}</button>
  </nav>`;
}

function viewFor(state: AppState): string {
  switch (state.tab) {
    case 'capture':
      return captureView(state);
    case 'events':
      return eventsView(state);
    case 'profiles':
      return profilesView(state);
    case 'settings':
      return settingsView(state);
    case 'overview':
    default:
      return overviewView(state);
  }
}

function loadingView(state: AppState): string {
  if (state.status === 'error') {
    return `<div class="state-screen">
      ${icon('alert')}
      <h2>Không đọc được dữ liệu</h2>
      <p class="muted">${state.loadError ?? 'Lỗi không xác định'}</p>
      <button type="button" class="btn btn--secondary" data-action="reload">Thử lại</button>
    </div>`;
  }
  return `<div class="state-screen"><span class="spinner"></span><p class="muted">Đang tải dữ liệu cục bộ…</p></div>`;
}

export function renderApp(state: AppState): string {
  const body = state.status === 'ready' ? viewFor(state) : loadingView(state);
  return `<header class="topbar">
      <div class="brand">
        <span class="brand__mark">${icon('calendar', 18)}</span>
        <div>
          <h1>Lịch trình</h1>
          <p>Cá nhân</p>
        </div>
      </div>
      <button type="button" class="icon-btn" data-action="capture-page" title="Quét trang đang mở" aria-label="Quét trang đang mở">${icon('scan')}</button>
    </header>
    ${
      state.status === 'ready'
        ? `${tabs(state)}<main class="view" id="view">${body}</main>`
        : `<main class="view">${body}</main>`
    }
    ${state.toast ? toastHtml(state.toast) : ''}
    ${
      state.busy
        ? `<div class="busy" role="status" aria-live="polite"><span class="spinner spinner--light"></span><span>${state.busy}</span></div>`
        : ''
    }`;
}
