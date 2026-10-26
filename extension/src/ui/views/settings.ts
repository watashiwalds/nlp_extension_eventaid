import { METHOD_TEXT, SOURCE_TEXT } from '../../shared/constants';
import type { LlmSettings } from '../../shared/contracts';
import {
  DEFAULT_LOCAL_ENDPOINT,
  effectiveLocalEndpoint,
  effectiveLocalValue,
} from '../../core/inference/provider-choice';
import type { AppState } from '../store';
import { activeDocument } from '../store';
import {
  badge,
  escapeAttr,
  escapeHtml,
  field,
  icon,
  secondaryButton,
  sectionHeader,
  textInput,
} from '../components';
import { formatCharCount } from '../format';

function formatConsentTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('vi-VN');
}

function consentList(llm: LlmSettings): string {
  const entries = Object.entries(llm.consentByOrigin).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) {
    return `<p class="muted small">Chưa đồng ý origin ngoài nào. Lần kiểm tra endpoint ngoài đầu tiên sẽ hỏi trước khi gửi.</p>`;
  }

  return `<ul class="consent-list">${entries
    .map(
      ([origin, at]) => `<li>
        <div>
          <code>${escapeHtml(origin)}</code>
          <span class="muted small">Đồng ý lúc ${escapeHtml(formatConsentTime(at))}</span>
        </div>
        <button type="button" class="btn btn--small btn--danger-ghost" data-action="revoke-consent" data-origin="${escapeAttr(
          origin,
        )}">Thu hồi</button>
      </li>`,
    )
    .join('')}</ul>`;
}

function providerChoices(llm: LlmSettings): string {
  const remote = llm.provider === 'openai-compatible';
  const localEndpoint = effectiveLocalEndpoint(llm);
  const localModel = effectiveLocalValue(llm);
  const remoteEndpoint =
    remote || llm.endpoint !== DEFAULT_LOCAL_ENDPOINT ? llm.endpoint : '';
  const consentCount = Object.keys(llm.consentByOrigin).length;

  return `<section class="card">
    ${sectionHeader('Nơi chạy suy luận')}
    <p class="muted small">Mặc định chạy trên máy này. Nội dung chỉ rời trình duyệt khi bạn chọn endpoint ngoài và đồng ý cho đúng origin.</p>
    <form id="llm-settings-form" class="form" novalidate>
      <fieldset class="provider-choices">
        <legend class="provider-choices__legend">Nơi chạy suy luận</legend>
        <label class="provider-option">
          <input class="provider-option__input" type="radio" name="provider" value="local" ${
            remote ? '' : 'checked'
          }>
          <span class="provider-option__body">
            <span class="provider-option__title">Máy này ${badge('Mặc định', 'success')}</span>
            <span class="muted small">llama-server tại <code>${escapeHtml(localEndpoint)}</code> · ${
              localModel ? `model ${escapeHtml(localModel)}` : 'model đang nạp'
            }</span>
          </span>
        </label>
        <label class="provider-option">
          <input class="provider-option__input" type="radio" name="provider" value="openai-compatible" ${
            remote ? 'checked' : ''
          }>
          <span class="provider-option__body">
            <span class="provider-option__title">Endpoint khác ${badge('OpenAI-compatible', 'info')}</span>
            <span class="muted small">Gemini, dịch vụ OpenAI-compatible hoặc máy trạm qua Cloudflared.</span>
          </span>
        </label>
      </fieldset>

      <div class="provider-config" data-provider-panel="local" ${remote ? 'hidden' : ''}>
        <dl class="detail-grid">
          <div><dt>Địa chỉ</dt><dd><code>${escapeHtml(localEndpoint)}</code></dd></div>
          <div><dt>Model</dt><dd>${localModel ? escapeHtml(localModel) : 'Model đang nạp'}</dd></div>
        </dl>
        <p class="field__hint">Không gửi nội dung ra ngoài máy. Muốn dùng <code>localhost</code> hoặc <code>[::1]</code> cổng 8080, chọn Endpoint khác và nhập địa chỉ đó (vẫn không cần đồng ý gửi dữ liệu).</p>
      </div>

      <div class="provider-config" data-provider-panel="openai-compatible" ${remote ? '' : 'hidden'}>
        ${field({
          id: 'llm-endpoint',
          label: 'Base URL',
          control: textInput('llm-endpoint', 'endpoint', remoteEndpoint, {
            placeholder: 'https://api.example.com/v1',
          }),
          hint: 'Phần trước /chat/completions, thường kết thúc bằng /v1. Endpoint ngoài bắt buộc HTTPS.',
        })}
        ${field({
          id: 'llm-model',
          label: 'Tên model (không bắt buộc)',
          control: textInput('llm-model', 'model', llm.model, {
            placeholder: 'Để trống = tự dò model chat từ /models',
          }),
          hint: 'Để trống để extension tự dò model chat đầu tiên (bỏ qua model embedding); chỉ nhập khi muốn ghi đè. Với Gemini, nhập tên như gemini-3.8-flash (có thể kèm tiền tố models/).',
        })}
        <div class="field">
          <label class="field__label" for="llm-api-key">API key (nếu endpoint yêu cầu)</label>
          ${textInput('llm-api-key', 'apiKey', llm.apiKey, {
            type: 'password',
            placeholder: 'Chỉ lưu trên máy này',
          })}
          <p class="field__hint">Gửi trong header Authorization, không đưa vào URL hay tệp xuất JSON.</p>
          <div class="form__actions">
            <button type="button" class="btn btn--small btn--danger-ghost" data-action="delete-llm-key" ${
              llm.apiKey ? '' : 'disabled'
            }>${icon('trash')}<span>Xoá key đã lưu</span></button>
          </div>
        </div>

        <div class="consent-box">
          <p class="consent-box__title">${icon('alert')} Quyền gửi dữ liệu</p>
          ${consentList(llm)}
          ${consentCount > 0 ? `<p class="field__hint">Đổi sang origin khác sẽ phải đồng ý lại. Thu hồi sẽ chặn lần chạy remote tiếp theo.</p>` : ''}
        </div>
      </div>

      <details class="about">
        <summary>Nâng cao (áp dụng cho cả hai nơi)</summary>
        <div class="grid-2">
          ${field({
            id: 'llm-temperature',
            label: 'Temperature',
            control: textInput('llm-temperature', 'temperature', String(llm.temperature), {
              type: 'number',
            }),
          })}
          ${field({
            id: 'llm-max-tokens',
            label: 'Token tối đa',
            control: textInput('llm-max-tokens', 'maxTokens', String(llm.maxTokens), {
              type: 'number',
            }),
          })}
          ${field({
            id: 'llm-timeout',
            label: 'Timeout (ms)',
            control: textInput('llm-timeout', 'timeoutMs', String(llm.timeoutMs), {
              type: 'number',
            }),
          })}
          ${field({
            id: 'llm-chunk-chars',
            label: 'Ký tự mỗi đoạn',
            control: textInput('llm-chunk-chars', 'chunkChars', String(llm.chunkChars), {
              type: 'number',
            }),
          })}
          ${field({
            id: 'llm-max-chunks',
            label: 'Số đoạn tối đa',
            control: textInput('llm-max-chunks', 'maxChunks', String(llm.maxChunks), {
              type: 'number',
            }),
          })}
        </div>
      </details>

      <div class="form__actions">
        <button type="submit" class="btn btn--primary">${icon('check')}<span>Lưu cài đặt</span></button>
        ${secondaryButton('check-llm', 'Kiểm tra kết nối', 'link')}
      </div>
      <div id="llm-health" class="llm-health" role="status" aria-live="polite"></div>
    </form>
  </section>`;
}

export function settingsView(state: AppState): string {
  const doc = activeDocument(state);
  return `<div class="stack">
    <div class="view-head">
      <div>
        <h2>Cài đặt & dữ liệu</h2>
        <p class="muted small">Dữ liệu được lưu trên thiết bị này.</p>
      </div>
    </div>

    ${providerChoices(state.llm)}

    <section class="card">
      ${sectionHeader('Dữ liệu cục bộ')}
      <dl class="detail-grid">
        <div><dt>Nội dung đã đọc</dt><dd>${state.documents.length}</dd></div>
        <div><dt>Hồ sơ</dt><dd>${state.profiles.length}</dd></div>
        <div><dt>Sự kiện</dt><dd>${state.events.length}</dd></div>
      </dl>
      ${
        doc
          ? `<p class="muted small">Lần đọc gần nhất: ${escapeHtml(doc.title)} · ${escapeHtml(
              formatCharCount(doc.charCount),
            )} · ${badge(METHOD_TEXT[doc.extractionMethod], 'info')} ${badge(SOURCE_TEXT[doc.source], 'muted')}</p>`
          : ''
      }
      <div class="card__actions">
        ${secondaryButton('export-data', 'Xuất JSON', 'download')}
        ${secondaryButton('import-data', 'Nhập JSON', 'upload')}
        <input type="file" id="import-file" accept="application/json,.json" hidden>
      </div>
      <div class="danger-zone">
        <div>
          <strong>Xoá toàn bộ dữ liệu</strong>
          <p class="muted small">Xoá nội dung đã đọc, hồ sơ, sự kiện, cài đặt và consent. Không thể hoàn tác.</p>
        </div>
        <button type="button" class="btn btn--danger" data-action="clear-all">${icon('trash')}<span>Xoá</span></button>
      </div>
    </section>

    <section class="card">
      ${sectionHeader('Quyền riêng tư')}
      <ul class="bullets">
        <li><strong>Chỉ đọc khi bạn bấm.</strong> Trang chỉ được đọc khi bạn chủ động quét hoặc chọn menu chuột phải; không đọc nền.</li>
        <li><strong>Mặc định chỉ chạy trên máy bạn.</strong> Suy luận dùng <code>llama-server</code> tại <code>127.0.0.1</code>; không có dữ liệu nào rời máy nếu bạn không đổi cấu hình.</li>
        <li><strong>Endpoint ngoài phải được bạn cho phép.</strong> Nội dung chỉ được gửi sau khi bạn đồng ý cho đúng origin, và có thể thu hồi bất cứ lúc nào.</li>
        <li><strong>API key chỉ lưu cục bộ.</strong> Key nằm trong bộ nhớ trình duyệt trên máy này, không có trong tệp xuất JSON và không ghi log.</li>
      </ul>
    </section>

    <section class="card card--muted">
      ${sectionHeader('Về phiên bản này')}
      <details class="about">
        <summary>Thông tin phiên bản và giới hạn hiện tại</summary>
        <dl class="detail-grid about__grid">
          <div><dt>Phiên bản</dt><dd>0.1.0</dd></div>
          <div><dt>Nền tảng</dt><dd>Tiện ích Chrome (Manifest V3)</dd></div>
          <div><dt>Nơi lưu dữ liệu</dt><dd>Bộ nhớ cục bộ của trình duyệt trên máy này</dd></div>
        </dl>
        <p class="small"><strong>Giới hạn hiện tại</strong></p>
        <ul class="bullets small">
          <li>Sự kiện do máy đề xuất vẫn ở trạng thái Nháp cho tới khi bạn duyệt.</li>
          <li>Chưa có nhắc việc theo mốc thời gian.</li>
          <li>Chưa đọc trực tiếp Gmail hay tệp PDF/DOCX — hãy dùng “Dán văn bản”.</li>
        </ul>
        <p class="small muted">Mặc định mọi suy luận chạy trên máy này. Nếu bạn chọn endpoint ngoài, nội dung chỉ được gửi sau khi bạn đồng ý.</p>
      </details>
    </section>
  </div>`;
}
