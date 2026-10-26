import {
  effectiveLocalApiKey,
  effectiveLocalEndpoint,
  effectiveLocalValue,
} from '../../core/inference/provider-choice';
import type { InferenceProvider } from '../../core/ports/inference';
import type { LlmSettings } from '../../shared/contracts';
import { LlamaCppProvider } from './llama-cpp';
import { OpenAiCompatibleProvider } from './openai-compatible';

/**
 * Chọn provider theo `LlmSettings.provider`. UI/offscreen không tự `new` provider
 * để mọi đường chạy dùng chung một quy tắc.
 */
export function createInferenceProvider(settings: LlmSettings): InferenceProvider {
  if (settings.provider === 'openai-compatible') {
    return new OpenAiCompatibleProvider({
      endpoint: settings.endpoint,
      apiKey: settings.apiKey,
      model: settings.model,
      timeoutMs: settings.timeoutMs,
    });
  }

  return new LlamaCppProvider({
    endpoint: effectiveLocalEndpoint(settings),
    apiKey: effectiveLocalApiKey(settings),
    model: effectiveLocalValue(settings),
    timeoutMs: settings.timeoutMs,
  });
}
