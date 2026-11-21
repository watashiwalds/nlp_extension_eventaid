/** Chuẩn hoá & hiển thị ngày giờ (thuần, không phụ thuộc DOM). */

const DAY_MS = 86_400_000;

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

/** Chuyển `YYYY-MM-DDTHH:mm` (giờ địa phương) sang Date. */
export function parseLocalDateTime(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    0,
    0,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Chuyển `YYYY-MM-DD` (ngày địa phương) sang Date; null nếu ngày không có thật. */
export function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return toDateOnly(date) === value.trim() ? date : null;
}

export function isValidDateOnly(value: string): boolean {
  return parseDateOnly(value) !== null;
}

export function toDateOnly(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Nhận cả `YYYY-MM-DDTHH:mm` và `YYYY-MM-DD`; dùng cho hiển thị/sắp xếp. */
export function parseEventDate(value: string): Date | null {
  return parseLocalDateTime(value) ?? parseDateOnly(value);
}

/** Hiển thị: nhận thêm ISO có múi giờ (ví dụ `updatedAt`) bên cạnh ngày giờ địa phương. */
function parseDisplayDate(value: string): Date | null {
  const local = parseLocalDateTime(value);
  if (local) return local;
  const dateOnly = parseDateOnly(value);
  if (dateOnly) return dateOnly;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isDateOnlyValue(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

const LOCAL_ISO = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;
const OFFSET_ISO =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/i;

function validParts(year: number, month: number, day: number, hour: number, minute: number, second: number): boolean {
  const check = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day &&
    check.getUTCHours() === hour &&
    check.getUTCMinutes() === minute &&
    check.getUTCSeconds() === second
  );
}

function partsInTimeZone(instant: Date, timezone: string): string | null {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(instant);
    const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
  } catch {
    return null;
  }
}

/**
 * Nhận các biến thể ISO mà model hay trả (`YYYY-MM-DDTHH:mm`, có giây, có `Z`
 * hoặc offset) và quy về `YYYY-MM-DDTHH:mm` theo múi giờ đã chọn.
 * Trả `null` nếu ngày không có thật — tuyệt đối không tự sửa thành ngày khác.
 */
/** Năm hiện tại theo múi giờ đã chọn (dùng cho suy đoán năm ở prompt v5). */
export function yearInTimeZone(now: Date, timezone: string): number {
  const year = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
  }).formatToParts(now);
  return Number(year.find((part) => part.type === 'year')?.value ?? '0');
}

export function normalizeIsoLocal(value: string, timezone = 'Asia/Ho_Chi_Minh'): string | null {
  const text = value.trim();

  const offset = OFFSET_ISO.exec(text);
  if (offset) {
    const [, y, m, d, h, min, sec, zone] = offset;
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    const hour = Number(h);
    const minute = Number(min);
    const second = Number(sec ?? '0');
    if (!validParts(year, month, day, hour, minute, second)) return null;

    const normalizedZone =
      zone?.toUpperCase() === 'Z'
        ? 'Z'
        : zone?.includes(':')
          ? zone
          : `${zone?.slice(0, 3)}:${zone?.slice(3)}`;
    const instant = new Date(`${y}-${m}-${d}T${h}:${min}:${second.toString().padStart(2, '0')}${normalizedZone}`);
    return Number.isNaN(instant.getTime()) ? null : partsInTimeZone(instant, timezone);
  }

  const local = LOCAL_ISO.exec(text);
  if (!local) return null;
  const [, y, m, d, h, min] = local;
  const candidate = `${y}-${m}-${d}T${h}:${min}`;
  const parsed = parseLocalDateTime(candidate);
  return parsed && toInputValue(parsed) === candidate ? candidate : null;
}

export interface DateTimeParts {
  date: string;
  time: string;
}

/** Tách `YYYY-MM-DDTHH:mm` thành hai ô riêng để tránh tràn giao diện hẹp. */
export function splitDateTimeLocal(value: string): DateTimeParts {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return { date: '', time: '' };
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return { date: trimmed, time: '' };
  const [date = '', time = ''] = trimmed.split('T');
  return { date, time };
}

export interface JoinedDateTime {
  /** `YYYY-MM-DDTHH:mm`; rỗng khi chỉ có ngày hoặc cả hai ô đều trống. */
  value: string;
  /** `YYYY-MM-DD` khi biết ngày nhưng chưa biết giờ. */
  date: string | null;
  error: string | null;
}

/** Ghép ô ngày + ô giờ; cho phép chỉ có ngày, không tự điền giờ. */
export function joinDateTimeLocal(dateValue: string, timeValue: string): JoinedDateTime {
  const date = dateValue.trim();
  const time = timeValue.trim();
  if (!date && !time) return { value: '', date: null, error: null };
  if (!date) return { value: '', date: null, error: 'Cần nhập ngày' };
  if (!isValidDateOnly(date)) return { value: '', date: null, error: 'Ngày hoặc giờ không hợp lệ' };
  if (!time) return { value: '', date, error: null };
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return { value: '', date: null, error: 'Ngày hoặc giờ không hợp lệ' };
  }
  const value = `${date}T${time}`;
  const parsed = parseLocalDateTime(value);
  if (!parsed || toInputValue(parsed) !== value) {
    return { value: '', date: null, error: 'Ngày hoặc giờ không hợp lệ' };
  }
  return { value, date: null, error: null };
}

export function toIsoLocal(date: Date): string {
  return toInputValue(date);
}

export function formatTime(value: string): string {
  const date = parseDisplayDate(value);
  if (!date || isDateOnlyValue(value)) return '—';
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function formatDate(value: string): string {
  const date = parseDisplayDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

export function formatDateTime(value: string): string {
  const date = parseDisplayDate(value);
  if (!date) return '—';
  if (isDateOnlyValue(value)) return formatDate(value);
  return `${formatTime(value)} · ${formatDate(value)}`;
}

export function formatDateTimeLong(value: string): string {
  const date = parseDisplayDate(value);
  if (!date) return '—';
  const weekday = new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(date);
  const day = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  return isDateOnlyValue(value) ? `${weekday}, ${day}` : `${weekday}, ${day} · ${formatTime(value)}`;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function daysFromToday(value: string, now: Date = new Date()): number | null {
  const date = parseEventDate(value);
  if (!date) return null;
  return Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS);
}

/** Nhãn tương đối: "Hôm nay · 09:00", "Còn 3 ngày", "Đã qua 2 ngày". */
export function relativeLabel(value: string, now: Date = new Date()): string {
  const days = daysFromToday(value, now);
  if (days === null) return 'Chưa xác định';
  const time = parseLocalDateTime(value) ? formatTime(value) : 'chưa rõ giờ';
  if (days === 0) return `Hôm nay · ${time}`;
  if (days === 1) return `Ngày mai · ${time}`;
  if (days === -1) return `Hôm qua · ${time}`;
  if (days > 1) return `Còn ${days} ngày · ${time}`;
  return `Đã qua ${Math.abs(days)} ngày`;
}

export function isPast(value: string, now: Date = new Date()): boolean {
  const date = parseEventDate(value);
  return date !== null && date.getTime() < now.getTime();
}

export function isSameDay(a: string, b: string): boolean {
  const dateA = parseEventDate(a);
  const dateB = parseEventDate(b);
  if (!dateA || !dateB) return false;
  return startOfDay(dateA) === startOfDay(dateB);
}

export function durationMinutes(startValue: string, endValue: string): number | null {
  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  return Math.round((end - start) / 60_000);
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} giờ` : `${hours} giờ ${rest} phút`;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
