import { METHOD_TEXT, SOURCE_TEXT } from '../../shared/constants';
import type { AppState } from '../store';
import { activeDocument } from '../store';
import { badge, escapeHtml, icon, secondaryButton, sectionHeader } from '../components';
import { formatCharCount } from '../format';

export function settingsView(state: AppState): string {
  const doc = activeDocument(state);
  return `<div class="stack">
    <div class="view-head">
      <div>
        <h2>Cài đặt & dữ liệu</h2>
        <p class="muted small">Dữ liệu được lưu trên thiết bị này.</p>
      </div>
    </div>

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
          <p class="muted small">Xoá nội dung đã đọc, hồ sơ và sự kiện khỏi trình duyệt. Không thể hoàn tác.</p>
        </div>
        <button type="button" class="btn btn--danger" data-action="clear-all">${icon('trash')}<span>Xoá</span></button>
      </div>
    </section>

    <section class="card">
      ${sectionHeader('Quyền riêng tư')}
      <ul class="bullets">
        <li><strong>Chỉ đọc khi bạn bấm.</strong> Trang chỉ được đọc khi bạn chủ động quét hoặc chọn menu chuột phải; không đọc nền.</li>
        <li><strong>Không gửi dữ liệu đi đâu.</strong> Nội dung trang, hồ sơ và sự kiện chỉ nằm trên máy này; ứng dụng không gọi mạng.</li>
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
          <li>Sự kiện do bạn nhập tay; chưa có trích xuất tự động bằng mô hình.</li>
          <li>Chưa có nhắc việc theo mốc thời gian.</li>
          <li>Chưa đọc trực tiếp Gmail hay tệp PDF/DOCX — hãy dùng “Dán văn bản”.</li>
        </ul>
        <p class="small muted">Khi bổ sung mô hình, mọi xử lý vẫn sẽ chạy trên máy này và nội dung sẽ không được gửi ra ngoài.</p>
      </details>
    </section>
  </div>`;
}
