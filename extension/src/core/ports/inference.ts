/**
 * Cổng suy luận — điểm duy nhất `core/` được phép "đi ra thế giới".
 * Hiện thực thật nằm ở `platform/inference/llama-cpp.ts` (Slice B);
 * hiện thực cho test/UI là `core/extraction/mock-provider.ts`.
 */

export interface InferenceRequest {
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  signal?: AbortSignal;
}

export interface InferenceResult {
  /** Chuỗi JSON thô do model trả về (có thể còn rào markdown — nơi parse phải chịu được). */
  raw: string;
  latencyMs: number;
  model: string;
}

export type InferenceHealth =
  | { ok: true; /** Model máy chủ báo qua `/v1/models`, nếu đọc được. */ model?: string }
  | { ok: false; reason: string };

export type InferenceErrorKind =
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'http'
  | 'invalid-response';

/**
 * Lỗi có phân loại để UI hiển thị đúng thông điệp và để pipeline biết lần chạy
 * có bị người dùng huỷ hay không. Không phụ thuộc DOM/Chrome.
 */
export class InferenceError extends Error {
  constructor(
    readonly kind: InferenceErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'InferenceError';
  }
}

export function isAbortedError(error: unknown): boolean {
  return error instanceof InferenceError && error.kind === 'aborted';
}

export interface InferenceProvider {
  readonly id: 'llama.cpp' | 'openai-compatible' | 'mock';
  health(): Promise<InferenceHealth>;
  run(request: InferenceRequest): Promise<InferenceResult>;
}
