import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'Lịch trình cá nhân (demo)',
  description:
    'Đọc nội dung trang web, trích sự kiện lịch trình bằng mô hình chạy trên máy và quản lý hồ sơ. Toàn bộ dữ liệu lưu cục bộ.',
  version: pkg.version,
  minimum_chrome_version: '120',
  permissions: ['activeTab', 'scripting', 'storage', 'sidePanel', 'contextMenus'],
  host_permissions: ['http://127.0.0.1:8080/*'],
  action: {
    default_title: 'Lịch trình cá nhân',
    default_popup: 'src/ui/popup.html',
    default_icon: {
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
  },
  icons: {
    16: 'icons/icon16.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
  background: {
    service_worker: 'src/platform/background/index.ts',
    type: 'module',
  },
  side_panel: {
    default_path: 'src/ui/sidepanel.html',
  },
  content_security_policy: {
    extension_pages:
      "script-src 'self'; object-src 'self'; connect-src http://127.0.0.1:8080",
  },
});
