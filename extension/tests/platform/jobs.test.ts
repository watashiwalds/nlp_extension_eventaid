import { describe, expect, it } from 'vitest';
import {
  isActiveJob,
  makeJob,
  parseStoredJob,
  patchJob,
} from '../../src/platform/background/jobs';

const NOW = new Date(2026, 9, 23, 8, 0, 0);
const LATER = new Date(2026, 9, 23, 8, 1, 0);

describe('job trích xuất', () => {
  it('tạo job queued và cập nhật trạng thái, giữ nguyên id', () => {
    const job = makeJob('doc_1', NOW);
    expect(job.status).toBe('queued');
    expect(job.documentId).toBe('doc_1');
    expect(job.startedAt).toBe(NOW.toISOString());

    const running = patchJob(
      job,
      { status: 'running', stage: 'Đang đọc đoạn 1/2…', chunkIndex: 1, chunkCount: 2 },
      LATER,
    );
    expect(running.jobId).toBe(job.jobId);
    expect(running.status).toBe('running');
    expect(running.updatedAt).toBe(LATER.toISOString());
    expect(isActiveJob(running)).toBe(true);
  });

  it('job kết thúc không còn active', () => {
    const job = makeJob('doc_1', NOW);
    expect(isActiveJob(patchJob(job, { status: 'done' }))).toBe(false);
    expect(isActiveJob(patchJob(job, { status: 'failed' }))).toBe(false);
    expect(isActiveJob(patchJob(job, { status: 'cancelled' }))).toBe(false);
  });

  it('job cũ thiếu trường kết quả vẫn đọc được với mặc định', () => {
    const job = makeJob('doc_1', NOW);
    const legacy = {
      ...job,
      savedCount: undefined,
      duplicateCount: undefined,
      truncated: undefined,
    };
    const parsed = parseStoredJob(legacy);
    expect(parsed?.savedCount).toBe(0);
    expect(parsed?.duplicateCount).toBe(0);
    expect(parsed?.truncated).toBe(false);
  });

  it('storage hỏng hoặc trạng thái lạ bị bỏ qua', () => {
    const job = makeJob('doc_1', NOW);
    expect(parseStoredJob({ ...job, status: 'dang_chay' })).toBeNull();
    expect(parseStoredJob(null)).toBeNull();
  });
});
