import type { EventCandidate, NormalizedDocument, Profile } from '../../shared/contracts';
import { newId } from '../ids';
import { InferenceError } from '../ports/inference';
import type { InferenceProvider } from '../ports/inference';
import { chunkText } from './chunk';
import { dedupeCandidates } from './dedup';
import { normalizeEvents } from './normalize';
import { attachProfiles } from './profile-match';
import { buildPrompt, DEFAULT_TIMEZONE, RETRY_SUFFIX } from './prompt';
import { parseRawExtraction } from './schema';
import type { CandidateRunMeta, DedupInput } from './types';

/**
 * Ghép các mảnh thuần của Slice A thành một lần trích hoàn chỉnh:
 * chia đoạn → prompt → provider → parse (retry 1 lần) → normalize → khớp hồ sơ → dedup.
 * Không đọc DOM, không ghi DB, không phụ thuộc Chrome.
 */

export interface ExtractionProgress {
  stage: string;
  chunkIndex: number;
  chunkCount: number;
  /** Giai đoạn ghi DB; mặc định là đang gọi model. */
  phase?: 'running' | 'persisting';
}

export interface ExtractionSettings {
  chunkChars: number;
  maxChunks: number;
  maxTokens: number;
  temperature: number;
}

export interface ExtractRequest {
  document: Pick<NormalizedDocument, 'documentId' | 'source' | 'title' | 'sourceUrl' | 'text'>;
  profiles: Profile[];
  settings: ExtractionSettings;
  provider: InferenceProvider;
  /** Mốc "hôm nay" cố định cho cả lần chạy. */
  now?: Date;
  timezone?: string;
  signal?: AbortSignal;
  /** Sự kiện đã có trong DB, để không sinh trùng khi quét lại. */
  existing?: DedupInput[];
  onProgress?: (progress: ExtractionProgress) => void;
}

export interface ExtractedCandidate {
  candidate: EventCandidate;
  run: CandidateRunMeta;
}

export interface ExtractionOutcome {
  runId: string;
  items: ExtractedCandidate[];
  duplicates: EventCandidate[];
  chunkCount: number;
  /** `true` khi tài liệu dài hơn `maxChunks × chunkChars`. */
  truncated: boolean;
  totalChars: number;
  latencyMs: number;
}

function assertNotAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new InferenceError('aborted', 'Đã huỷ trích xuất.');
}

export async function extractEvents(request: ExtractRequest): Promise<ExtractionOutcome> {
  const now = request.now ?? new Date();
  const timezone = request.timezone ?? DEFAULT_TIMEZONE;
  const { chunks, truncated, totalChars } = chunkText(request.document.text, {
    chunkChars: request.settings.chunkChars,
    maxChunks: request.settings.maxChunks,
  });

  if (chunks.length === 0) {
    throw new Error('Nội dung này không có chữ để trích xuất.');
  }

  const runId = newId('run');
  const collected: ExtractedCandidate[] = [];
  let latencyMs = 0;

  for (const chunk of chunks) {
    assertNotAborted(request.signal);
    request.onProgress?.({
      stage: `Đang đọc đoạn ${chunk.index + 1}/${chunks.length}…`,
      chunkIndex: chunk.index + 1,
      chunkCount: chunks.length,
    });

    const prompt = buildPrompt({ document: request.document, now, timezone }, chunk);
    const base = {
      system: prompt.system,
      user: prompt.user,
      maxTokens: request.settings.maxTokens,
      temperature: request.settings.temperature,
      signal: request.signal,
    };

    let result = await request.provider.run(base);
    let parsed = parseRawExtraction(result.raw);

    // Chỉ retry khi JSON sai schema; lỗi mạng/timeout đã ném từ provider.
    if (!parsed.ok) {
      assertNotAborted(request.signal);
      result = await request.provider.run({ ...base, user: `${prompt.user}\n\n${RETRY_SUFFIX}` });
      parsed = parseRawExtraction(result.raw);
    }
    if (!parsed.ok) {
      throw new Error(
        `Đoạn ${chunk.index + 1}/${chunks.length}: ${parsed.error}. Không lưu sự kiện nào để tránh dữ liệu rác.`,
      );
    }

    latencyMs += result.latencyMs;
    const run: CandidateRunMeta = {
      runId,
      provider: request.provider.id,
      model: result.model,
      promptVersion: prompt.promptVersion,
      chunkIndex: chunk.index,
      chunkCount: chunks.length,
      latencyMs: result.latencyMs,
    };
    const candidates = normalizeEvents(parsed.value.events, {
      now,
      timezone,
      sourceText: chunk.text,
    }).map((candidate) =>
      attachProfiles(candidate, request.profiles, request.document.title),
    );
    for (const candidate of candidates) collected.push({ candidate, run });
  }

  const deduped = dedupeCandidates(
    collected.map((item) => item.candidate),
    request.existing ?? [],
  );
  const duplicateSet = new Set(deduped.duplicates);

  return {
    runId,
    items: collected.filter((item) => !duplicateSet.has(item.candidate)),
    duplicates: deduped.duplicates,
    chunkCount: chunks.length,
    truncated,
    totalChars,
    latencyMs,
  };
}
