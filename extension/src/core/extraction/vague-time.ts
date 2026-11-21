/**
 * Quy ước giờ cho cách nói thời gian mơ hồ (prompt v5).
 *
 * Cùng một bảng phục vụ hai phía để không bao giờ lệch nhau:
 * - `RULE_TEXT`: nhúng vào system prompt để model biết quy đổi.
 * - `vagueTimeFromRaw`: normalize dùng để KIỂM CHỨNG lời đề xuất của model —
 *   model đề xuất giờ không nằm trong bảng sẽ bị từ chối (giữ hành vi an toàn cũ).
 *
 * Nguyên tắc: chỉ áp dụng khi văn bản KHÔNG ghi giờ cụ thể; cụm mơ hồ ngoài
 * bảng vẫn để null + `gio_chua_ro`, không đoán lan man.
 */

/** Cụm từ → giờ quy ước `HH:mm`. Cụm riêng (muộn/khuya) phải đứng trước cụm chung. */
const VAGUE_TIME_TABLE: ReadonlyArray<readonly [RegExp, string, string]> = [
  [/sáng sớm/i, '07:00', 'sáng sớm'],
  [/buổi sáng|đầu buổi sáng/i, '09:00', 'buổi sáng'],
  [/buổi trưa|giờ trưa|\btrưa\b/i, '12:00', 'buổi trưa'],
  [/đầu giờ chiều/i, '13:00', 'đầu giờ chiều'],
  [/chiều muộn|muộn chiều|cuối giờ chiều/i, '18:00', 'chiều muộn'],
  [/buổi chiều|\bchiều\b/i, '15:00', 'buổi chiều'],
  [/tối muộn|về khuya|\bkhuya\b/i, '21:00', 'tối muộn'],
  [/buổi tối|\btối\b/i, '19:00', 'buổi tối'],
];

/** Dòng bảng cho system prompt: `"chiều muộn"=18:00, …`. */
export const VAGUE_TIME_RULE_TEXT = VAGUE_TIME_TABLE.map(
  ([, time, label]) => `"${label}"=${time}`,
).join(', ');

/** Trả giờ quy ước nếu `raw` chứa một cụm mơ hồ trong bảng; ngược lại null. */
export function vagueTimeFromRaw(raw: string): string | null {
  const text = (raw ?? '').trim();
  if (!text) return null;
  for (const [pattern, time] of VAGUE_TIME_TABLE) {
    if (pattern.test(text)) return time;
  }
  return null;
}
