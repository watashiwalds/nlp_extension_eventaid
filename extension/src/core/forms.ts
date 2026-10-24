import { z } from 'zod';
import { EventSchema, LabelSchema, MAX_SUMMARY_ITEMS, ProfileSchema } from '../shared/contracts';
import type { Event, Label, Profile, SourceRef } from '../shared/contracts';
import { isValidDateOnly } from './dates';
import { makeEvent, updateEvent } from './events';
import type { EventInput } from './events';
import { makeProfile, updateProfile } from './profiles';
import type { ProfileInput } from './profiles';
import { parseSummaryInput, parseTagsInput } from './text';

export type FormErrors = Record<string, string>;

export interface FormResult<T> {
  data?: T;
  errors: FormErrors;
}

export function mapZodIssues(error: z.ZodError): FormErrors {
  const errors: FormErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

const PLACEHOLDER_DATE = '2026-01-01T00:00:00.000Z';

export function validateProfileInput(input: ProfileInput): FormResult<ProfileInput> {
  const result = ProfileSchema.safeParse({
    ...input,
    id: 'prf_placeholder',
    createdAt: PLACEHOLDER_DATE,
    updatedAt: PLACEHOLDER_DATE,
  });
  if (!result.success) return { errors: mapZodIssues(result.error) };
  return { data: input, errors: {} };
}

/** Giá trị form sự kiện lấy trực tiếp từ DOM (toàn chuỗi). */
export interface EventFormValues {
  title: string;
  label: string;
  /** Chuỗi thô người dùng nhập, phân tách bởi dấu phẩy; rỗng = không có tags. */
  tags: string;
  /** `YYYY-MM-DDTHH:mm` khi đủ ngày giờ. */
  start: string;
  /** `YYYY-MM-DD` khi chỉ biết ngày. */
  startDate?: string | null;
  end: string;
  /** `YYYY-MM-DD` khi chỉ biết ngày. */
  endDate?: string | null;
  duration: string;
  summary: string;
  profileIds: string[];
  sources: SourceRef[];
}

export interface EventBuildResult {
  event?: Event;
  errors: FormErrors;
}

function parsePositiveInt(value: string): number | null | 'invalid' {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  if (!Number.isFinite(number) || !Number.isInteger(number) || number <= 0) return 'invalid';
  return number;
}

export function buildEventFromForm(
  values: EventFormValues,
  existing: Event | null,
  now: Date = new Date(),
): EventBuildResult {
  const errors: FormErrors = {};

  const labelParsed = LabelSchema.safeParse(values.label);
  if (!labelParsed.success) errors.label = 'Nhãn không hợp lệ';

  const tagsParsed = parseTagsInput(values.tags);
  if (tagsParsed.error) errors.tags = tagsParsed.error;

  const start = values.start.trim() || null;
  const startDate = values.startDate?.trim() || null;
  const end = values.end.trim() || null;
  const endDate = values.endDate?.trim() || null;
  if (start && Number.isNaN(new Date(start).getTime())) errors.start = 'Thời điểm bắt đầu không hợp lệ';
  if (startDate && !isValidDateOnly(startDate)) errors.start = 'Ngày bắt đầu không hợp lệ';
  if ((end || endDate) && !start && !startDate) errors.end = 'Cần nhập thời điểm bắt đầu trước';
  if (start && end && new Date(end).getTime() <= new Date(start).getTime()) {
    errors.end = 'Kết thúc phải sau thời điểm bắt đầu';
  }
  if (!start && !end && startDate && endDate && endDate < startDate) {
    errors.end = 'Ngày kết thúc phải sau ngày bắt đầu';
  }

  const durationParsed = parsePositiveInt(values.duration);
  if (durationParsed === 'invalid') errors.duration = 'Thời lượng phải là số phút dương';
  const duration = durationParsed === 'invalid' ? null : durationParsed;

  const summaryLines = values.summary
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
  if (summaryLines.length > MAX_SUMMARY_ITEMS) {
    errors.summary = `Tóm tắt tối đa ${MAX_SUMMARY_ITEMS} ý`;
  }

  if (Object.keys(errors).length > 0 || !labelParsed.success) {
    return { errors };
  }

  const input: EventInput = {
    title: values.title,
    label: labelParsed.data as Label,
    tags: tagsParsed.tags,
    startValue: start,
    startDate,
    endValue: end,
    endDate,
    durationMinutesInput: duration,
    summary: parseSummaryInput(values.summary),
    relatedProfiles: values.profileIds,
    sources: values.sources,
  };

  try {
    const event = existing ? updateEvent(existing, input, now) : makeEvent(input, now);
    return { event, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) return { errors: mapZodIssues(error) };
    return { errors: { form: error instanceof Error ? error.message : 'Không tạo được sự kiện' } };
  }
}

export function saveProfileInput(
  input: ProfileInput,
  existing: Profile | null,
  now: Date = new Date(),
): FormResult<Profile> {
  const validation = validateProfileInput(input);
  if (!validation.data) return { errors: validation.errors };
  try {
    const profile = existing ? updateProfile(existing, validation.data, now) : makeProfile(validation.data, now);
    return { data: profile, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) return { errors: mapZodIssues(error) };
    return { errors: { form: 'Không lưu được hồ sơ' } };
  }
}

/** Kiểm tra nhanh cấu trúc sự kiện khi đọc lại từ IndexedDB. */
export function isStoredEvent(value: unknown): value is Event {
  return EventSchema.safeParse(value).success;
}
