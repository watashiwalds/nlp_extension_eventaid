import { computeFieldMetrics } from './field-metrics';
import type { FieldMetrics, ProfileMetrics } from './field-metrics';
import { percentile } from './metrics';
import type { EvalMetrics } from './metrics';

/**
 * Kiểu dữ liệu và in kết quả cho ablation Raw vs Post-check (`TASK 01`).
 * Tách khỏi file test để mỗi file dưới ngưỡng `max-lines`.
 */

export interface ItemSummary {
  title: string;
  startValue: string | null;
  startDate: string | null;
  uncertain: string[];
}

export interface PathRecord {
  metrics: EvalMetrics;
  fieldMetrics: FieldMetrics;
  profileMetrics: ProfileMetrics;
  /** Sự kiện có ngày start/end ngoài `allowedDates` — trùng `metrics.inventedDates`. */
  dateOutsideAllowed: number;
  items: ItemSummary[];
}

export interface CaseRecord {
  caseId: string;
  latencyMs: number;
  chunkCount: number;
  providerCalls: number;
  retries: number;
  raw: PathRecord;
  postcheck: PathRecord;
  /** Cờ hậu kiểm thêm mà raw không có (so theo cặp cùng chỉ số, trước dedup). */
  flagsAdded: { nam_suy_doan: number; gio_suy_doan: number };
  /** Giá trị raw có nhưng hậu kiểm trả `null`. */
  valueDropped: { startTime: number; startDate: number; end: number };
  /** Sự kiện raw ghép được mà hậu kiểm mất (chênh `missed` giữa hai đường). */
  falseNegativeByPostcheck: number;
  /** Số trường raw tự điền nhưng nguồn không có căn cứ và không có cờ. */
  inferredWithoutFlagRaw: { inferredYearWithoutFlag: number; inferredTimeWithoutFlag: number };
  error?: string;
}

/** Mọi trường của `FieldMetrics` đều là số nên cộng trực tiếp theo khoá. */
export function sumFieldMetrics(a: FieldMetrics, b: FieldMetrics): FieldMetrics {
  const result = { ...a };
  for (const key of Object.keys(a) as Array<keyof FieldMetrics>) {
    result[key] = a[key] + b[key];
  }
  return result;
}

export function printAblationSummary(
  results: readonly CaseRecord[],
  promptVersions: readonly string[],
  endpoint: string,
): void {
  const ok = results.filter((item) => !item.error);
  const sum = (pick: (item: CaseRecord) => number): number =>
    ok.reduce((total, item) => total + pick(item), 0);
  const aggregate = (path: (item: CaseRecord) => PathRecord) => {
    const metrics = ok.map((item) => path(item).metrics);
    const matched = metrics.reduce((total, item) => total + item.matched, 0);
    const missed = metrics.reduce((total, item) => total + item.missed, 0);
    const extra = metrics.reduce((total, item) => total + item.extra, 0);
    const expected = matched + missed;
    return {
      matched,
      missed,
      extra,
      expected,
      recall: expected === 0 ? 1 : matched / expected,
      precision: matched + extra === 0 ? 1 : matched / (matched + extra),
      dateOutsideAllowed: ok.reduce((total, item) => total + path(item).dateOutsideAllowed, 0),
      fieldMetrics: ok
        .map((item) => path(item).fieldMetrics)
        .reduce(sumFieldMetrics, computeFieldMetrics([], [])),
    };
  };

  const raw = aggregate((item) => item.raw);
  const post = aggregate((item) => item.postcheck);
  const fmt = (value: number): string => `${(value * 100).toFixed(1)}%`;

  console.log('\n## TASK 01 — Bảng ablation Raw vs Post-check\n');
  console.log(
    '| Mẫu | Đường | Đúng/kỳ vọng | Thiếu | Thừa | Ngày ngoài WL | Latency (s) | Ghi chú |',
  );
  console.log('|---|---|---:|---:|---:|---:|---:|---|');
  for (const item of results) {
    if (item.error) {
      console.log(
        `| ${item.caseId} | — | — | — | — | — | ${(item.latencyMs / 1_000).toFixed(2)} | LỖI: ${item.error} |`,
      );
      continue;
    }
    for (const [name, path] of [
      ['raw', item.raw],
      ['post', item.postcheck],
    ] as const) {
      const m = path.metrics;
      console.log(
        `| ${item.caseId} | ${name} | ${m.matched}/${m.matched + m.missed} | ${m.missed} | ${m.extra} | ${path.dateOutsideAllowed} | ${(item.latencyMs / 1_000).toFixed(2)} | |`,
      );
    }
  }

  console.log('\n## Tổng hợp (17 mẫu, 25 sự kiện kỳ vọng)\n');
  console.log(
    `- Prompt: ${promptVersions.join(', ') || '(không rõ)'}; dedup áp dụng cho cả hai đường; không khớp hồ sơ`,
  );
  console.log(
    `- Raw: recall=${fmt(raw.recall)}, precision=${fmt(raw.precision)}, thiếu=${raw.missed}, thừa=${raw.extra}, ngày ngoài whitelist=${raw.dateOutsideAllowed}`,
  );
  console.log(
    `- Post-check: recall=${fmt(post.recall)}, precision=${fmt(post.precision)}, thiếu=${post.missed}, thừa=${post.extra}, ngày ngoài whitelist=${post.dateOutsideAllowed}`,
  );
  console.log(
    `- Trường chính xác (raw → post): ngày ${raw.fieldMetrics.dateExact}/${raw.fieldMetrics.dateComparable} → ${post.fieldMetrics.dateExact}/${post.fieldMetrics.dateComparable}; giờ start ${raw.fieldMetrics.startTimeExact}/${raw.fieldMetrics.startTimeComparable} → ${post.fieldMetrics.startTimeExact}/${post.fieldMetrics.startTimeComparable}`,
  );
  console.log(
    `- Cờ hậu kiểm thêm: nam_suy_doan=${sum((i) => i.flagsAdded.nam_suy_doan)}, gio_suy_doan=${sum((i) => i.flagsAdded.gio_suy_doan)}`,
  );
  console.log(
    `- Giá trị hậu kiểm trả null: giờ start=${sum((i) => i.valueDropped.startTime)}, ngày start=${sum((i) => i.valueDropped.startDate)}, end=${sum((i) => i.valueDropped.end)}`,
  );
  console.log(`- Sự kiện hậu kiểm làm mất: ${sum((i) => i.falseNegativeByPostcheck)}`);
  console.log(
    `- Raw suy đoán không cờ: năm=${sum((i) => i.inferredWithoutFlagRaw.inferredYearWithoutFlag)}, giờ=${sum((i) => i.inferredWithoutFlagRaw.inferredTimeWithoutFlag)}`,
  );
  console.log(
    `- Latency: p95=${percentile(ok.map((i) => i.latencyMs), 0.95) ?? '—'} ms, median=${percentile(ok.map((i) => i.latencyMs), 0.5) ?? '—'} ms; retry=${sum((i) => i.retries)}`,
  );

  console.log('\nPOSTCHECK_ABLATION_JSON_BEGIN');
  console.log(
    JSON.stringify(
      {
        endpoint,
        dedup: 'applied to both paths',
        profileMatching: 'skipped on both paths',
        promptVersions: [...promptVersions],
        results,
      },
      null,
      2,
    ),
  );
  console.log('POSTCHECK_ABLATION_JSON_END');
}
