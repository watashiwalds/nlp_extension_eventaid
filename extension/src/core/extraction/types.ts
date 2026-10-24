import type { EventCandidate, ExtractionMeta, NormalizedDocument } from '../../shared/contracts';

/** Một đoạn văn bản gửi cho model; offset trỏ về `NormalizedDocument.text`. */
export interface TextChunk {
  index: number;
  text: string;
  charStart: number;
  charEnd: number;
}

export interface ChunkOptions {
  /** Độ dài tối đa của một đoạn. */
  chunkChars: number;
  /** Số đoạn tối đa mỗi lần trích. */
  maxChunks: number;
  /** Số ký tự chồng lấn giữa hai đoạn liền kề. */
  overlapChars?: number;
}

export interface ChunkResult {
  chunks: TextChunk[];
  /** `true` khi phần cuối tài liệu bị bỏ vì vượt `maxChunks`. */
  truncated: boolean;
  /** Tổng số ký tự của tài liệu gốc. */
  totalChars: number;
}

/** Bối cảnh dựng prompt: tài liệu + "hôm nay". Hồ sơ được khớp sau khi trích. */
export interface PromptContext {
  document: Pick<NormalizedDocument, 'title' | 'sourceUrl'>;
  /** Thời điểm chạy; quy đổi "mai", "tuần sau" theo giá trị này. */
  now: Date;
  timezone: string;
}

export interface BuiltPrompt {
  system: string;
  user: string;
  promptVersion: string;
}

/** Bối cảnh chuẩn hoá output thô thành `EventCandidate`. */
export interface NormalizeContext {
  /** Dùng để quy đổi ngày tương đối nếu model trả chuỗi tương đối. */
  now: Date;
  timezone: string;
  /** Đoạn văn gốc đã gửi cho model; dùng để đối chiếu ngày thay vì tin raw của model. */
  sourceText?: string;
}

/** Thông tin gắn vào `Event.extractionMeta` khi lưu bản ghi. */
export interface CandidateRunMeta {
  runId: string;
  provider: ExtractionMeta['provider'];
  model: string;
  promptVersion: string;
  chunkIndex: number;
  chunkCount: number;
  latencyMs: number;
}

/** Đầu vào tối thiểu để dedup — dùng chung cho candidate và event đã lưu. */
export interface DedupInput {
  title: string;
  startValue: string | null;
  /** `YYYY-MM-DD` khi chỉ biết ngày; dùng thay `startValue` để so trùng. */
  startDate?: string | null;
}

export interface DedupResult {
  kept: EventCandidate[];
  duplicates: EventCandidate[];
}
