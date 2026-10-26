import { escapeHtml, icon } from './components';

/**
 * Modal xin đồng ý gửi nội dung tới một origin ngoài (KS-14).
 *
 * Cố ý không đưa vào store: mở modal không được render lại form Cài đặt,
 * nếu không người dùng sẽ mất endpoint/key vừa nhập.
 */

let closeActive: ((accepted: boolean) => void) | null = null;

export function askConsent(origin: string): Promise<boolean> {
  // Chỉ một modal tại một thời điểm; modal cũ (nếu có) coi như Huỷ.
  closeActive?.(false);

  return new Promise((resolve) => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div class="modal__head">
        ${icon('alert')}
        <h2 id="consent-title">Cho phép gửi nội dung tới dịch vụ ngoài?</h2>
      </div>
      <p class="modal__lead">Nội dung bạn chọn trích sẽ được gửi tới:</p>
      <p class="modal__origin"><code>${escapeHtml(origin)}</code></p>
      <ul class="bullets small">
        <li>Dữ liệu rời trình duyệt và có thể đi qua nhà cung cấp (Gemini, Cloudflare…).</li>
        <li>API key chỉ lưu trên máy này và không có trong tệp xuất JSON.</li>
        <li>Có thể thu hồi đồng ý bất cứ lúc nào trong <strong>Cài đặt → Nơi chạy suy luận</strong>.</li>
      </ul>
      <p class="small muted">Nếu Huỷ, không có nội dung nào được gửi và cấu hình mới không được lưu.</p>
      <div class="modal__actions">
        <button type="button" class="btn btn--secondary" data-consent="cancel">Huỷ</button>
        <button type="button" class="btn btn--primary" data-consent="accept">Đồng ý</button>
      </div>
    </div>`;

    const dialog = overlay.querySelector<HTMLElement>('.modal');
    if (!dialog) {
      resolve(false);
      return;
    }

    const finish = (accepted: boolean): void => {
      document.removeEventListener('keydown', onKeydown, true);
      overlay.remove();
      closeActive = null;
      previousFocus?.focus();
      resolve(accepted);
    };

    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        finish(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>('button')];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    closeActive = finish;
    overlay.addEventListener('click', (event) => {
      const target = event.target;
      const button = target instanceof Element ? target.closest<HTMLElement>('[data-consent]') : null;
      if (!button) return;
      finish(button.dataset.consent === 'accept');
    });
    document.addEventListener('keydown', onKeydown, true);
    document.body.append(overlay);
    overlay.querySelector<HTMLElement>('[data-consent="accept"]')?.focus();
  });
}
