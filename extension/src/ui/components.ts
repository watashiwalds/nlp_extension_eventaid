import type { ToastTone } from './store';

/** Escape toàn bộ nội dung động trước khi chèn vào innerHTML (chống XSS). */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeAttr(value: unknown): string {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

type Tone = 'muted' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export function badge(text: string, tone: Tone = 'muted'): string {
  return `<span class="badge badge--${tone}">${escapeHtml(text)}</span>`;
}

export function chip(text: string, tone: 'plain' | 'label' = 'plain'): string {
  return `<span class="chip chip--${tone}">${escapeHtml(text)}</span>`;
}

export function iconButton(
  action: string,
  label: string,
  iconName: IconName,
  extra = '',
): string {
  return `<button type="button" class="icon-btn" data-action="${action}" title="${escapeAttr(label)}" aria-label="${escapeAttr(label)}" ${extra}>${icon(iconName)}</button>`;
}

export function primaryButton(action: string, label: string, iconName?: IconName, extra = ''): string {
  return `<button type="button" class="btn btn--primary" data-action="${action}" ${extra}>${iconName ? icon(iconName) : ''}<span>${escapeHtml(label)}</span></button>`;
}

export function secondaryButton(action: string, label: string, iconName?: IconName, extra = ''): string {
  return `<button type="button" class="btn btn--secondary" data-action="${action}" ${extra}>${iconName ? icon(iconName) : ''}<span>${escapeHtml(label)}</span></button>`;
}

export function field(options: {
  id: string;
  label: string;
  control: string;
  hint?: string;
  error?: string;
  required?: boolean;
}): string {
  const error = options.error
    ? `<p class="field__error" role="alert">${escapeHtml(options.error)}</p>`
    : '';
  const hint = options.hint ? `<p class="field__hint">${escapeHtml(options.hint)}</p>` : '';
  return `<div class="field ${options.error ? 'field--error' : ''}">
    <label class="field__label" for="${escapeAttr(options.id)}">${escapeHtml(options.label)}${
      options.required ? '<span class="required">*</span>' : ''
    }</label>
    ${options.control}
    ${hint}
    ${error}
  </div>`;
}

export function textInput(
  id: string,
  name: string,
  value: string,
  options: {
    placeholder?: string;
    type?: string;
    required?: boolean;
    autofocus?: boolean;
    maxLength?: number;
    min?: string;
  } = {},
): string {
  return `<input class="input" id="${escapeAttr(id)}" name="${escapeAttr(name)}" type="${escapeAttr(
    options.type ?? 'text',
  )}" value="${escapeAttr(value)}" placeholder="${escapeAttr(options.placeholder ?? '')}"${
    options.required ? ' required' : ''
  }${options.autofocus ? ' autofocus' : ''}${
    options.maxLength ? ` maxlength="${options.maxLength}"` : ''
  }${options.min ? ` min="${escapeAttr(options.min)}"` : ''}>`;
}

export function emptyState(options: {
  iconName: IconName;
  title: string;
  description: string;
  actions?: string;
}): string {
  return `<div class="empty">
    <div class="empty__icon">${icon(options.iconName)}</div>
    <h3>${escapeHtml(options.title)}</h3>
    <p>${escapeHtml(options.description)}</p>
    ${options.actions ? `<div class="empty__actions">${options.actions}</div>` : ''}
  </div>`;
}

export function toastHtml(toast: { tone: ToastTone; message: string }): string {
  return `<div class="toast toast--${toast.tone}" role="status">
    <span>${escapeHtml(toast.message)}</span>
    <button type="button" class="toast__close" data-action="hide-toast" aria-label="Đóng">×</button>
  </div>`;
}

export function sectionHeader(title: string, action = ''): string {
  return `<div class="section-header"><h2>${escapeHtml(title)}</h2>${action}</div>`;
}

export type IconName =
  | 'scan'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'check'
  | 'close'
  | 'chevron'
  | 'user'
  | 'calendar'
  | 'settings'
  | 'document'
  | 'clock'
  | 'alert'
  | 'download'
  | 'upload'
  | 'search'
  | 'link'
  | 'copy'
  | 'layers'
  | 'info';

const PATHS: Record<IconName, string> = {
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  chevron: '<polyline points="6 9 12 15 18 9"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  document: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>',
  clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.7" y2="16.7"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1 1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7.1 7.1l1-1"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
};

export function icon(name: IconName, size = 16): string {
  return `<svg class="icon icon--${size}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`;
}
