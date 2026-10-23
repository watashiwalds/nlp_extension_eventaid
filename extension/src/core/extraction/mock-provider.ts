import type {
  InferenceHealth,
  InferenceProvider,
  InferenceRequest,
  InferenceResult,
} from '../ports/inference';
import type { RawExtraction } from './schema';

/** Model giả — không bao giờ gọi mạng, dùng cho test và UI khi chưa có llama-server. */
export const MOCK_MODEL = 'mock-v1';

/** Fixture: thông báo lớp có 2 sự kiện (đủ cho test xuyên pipeline). */
export const MOCK_EXTRACTION: RawExtraction = {
  events: [
    {
      title: 'Họp nhóm đồ án',
      label: 'công_vụ',
      start: '2026-11-02T09:00',
      end: '2026-11-02T10:30',
      startRaw: '9:00 ngày 2/11/2026',
      endRaw: '10:30 ngày 2/11/2026',
      summary: ['Chốt đề cương và phân công phần việc', 'Họp tại phòng B203'],
      confidence: 0.87,
      uncertain: [],
      quote: 'Lớp họp nhóm đồ án lúc 9:00 ngày 2/11/2026 tại phòng B203.',
    },
    {
      title: 'Nộp báo cáo giữa kỳ',
      label: 'công_vụ',
      start: null,
      end: null,
      startRaw: '20/11',
      endRaw: '',
      summary: ['Hạn nộp báo cáo giữa kỳ cho giảng viên phụ trách'],
      confidence: 0.45,
      uncertain: ['gio_chua_ro', 'nam_chua_ro'],
      quote: 'Hạn nộp báo cáo giữa kỳ là 20/11.',
    },
  ],
};

export type MockResponder = (request: InferenceRequest) => RawExtraction | string;

/**
 * Nhận fixture tĩnh hoặc hàm phản hồi theo prompt. Trả chuỗi thì trả nguyên văn
 * (để test được cả trường hợp JSON hỏng); trả object thì serialize.
 */
export class MockProvider implements InferenceProvider {
  readonly id = 'mock' as const;

  constructor(
    private readonly responder: MockResponder = () => MOCK_EXTRACTION,
    private readonly latencyMs = 0,
  ) {}

  async health(): Promise<InferenceHealth> {
    return { ok: true };
  }

  async run(request: InferenceRequest): Promise<InferenceResult> {
    const value = this.responder(request);
    const raw = typeof value === 'string' ? value : JSON.stringify(value);
    return { raw, latencyMs: this.latencyMs, model: MOCK_MODEL };
  }
}

/** Mặc định cho UI/demo: trả fixture 2 sự kiện. */
export function createMockProvider(latencyMs = 0): MockProvider {
  return new MockProvider(() => MOCK_EXTRACTION, latencyMs);
}
