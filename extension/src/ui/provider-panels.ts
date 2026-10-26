/**
 * Chỉ đổi panel đang hiện theo radio “Nơi chạy suy luận”; không ghi settings.
 * Nhờ vậy người dùng xem lại cấu hình remote mà không mất giá trị đang nhập.
 */
export function syncProviderPanels(scope: ParentNode): void {
  const checked = scope.querySelector<HTMLInputElement>('input[name="provider"]:checked');
  const provider = checked?.value ?? 'local';
  for (const panel of scope.querySelectorAll<HTMLElement>('[data-provider-panel]')) {
    panel.hidden = panel.dataset.providerPanel !== provider;
  }
}

/** Đổi radio provider: đổi panel và xoá kết quả kiểm tra của lựa chọn trước. */
export function handleProviderChange(scope: ParentNode, target: EventTarget | null): boolean {
  if (!(target instanceof HTMLInputElement) || target.name !== 'provider') return false;
  syncProviderPanels(scope);
  const health = scope.querySelector<HTMLElement>('#llm-health');
  if (health) {
    health.className = 'llm-health';
    health.innerHTML = '';
  }
  return true;
}
