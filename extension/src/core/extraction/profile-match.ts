import { EventCandidateSchema } from '../../shared/contracts';
import type { EventCandidate, Profile } from '../../shared/contracts';

/**
 * Khớp hồ sơ SAU khi model đã trích xong sự kiện.
 *
 * Trước đây danh sách hồ sơ nằm trong prompt và model phải vừa trích vừa chọn
 * `profileIds`; với từ 2 hồ sơ, hồ sơ tạo sau thường bị bỏ sót. Cách khớp dưới
 * đây chạy trên toàn bộ hồ sơ, không phụ thuộc thứ tự hay việc model có để ý hay không.
 *
 * Nguyên tắc: chỉ dùng bằng chứng nằm trong chính sự kiện (`quote`, `title`,
 * `summary`, tiêu đề tài liệu). Không quét toàn văn để tránh gán mọi hồ sơ trong
 * một thông báo nhóm.
 */

export interface ProfileMatchInput {
  title: string;
  summary: string[];
  quote?: string;
  /** Dùng cho trường hợp tài liệu là lịch/công tác của một người. */
  documentTitle?: string;
}

type MatchKind = 'name' | 'nickname' | 'email' | 'keyword';
type SourceKind = 'quote' | 'title' | 'summary' | 'documentTitle';

interface MatchTerm {
  /** Chuẩn hoá bỏ dấu, dùng cho cụm từ nhiều token. */
  text: string;
  /** Giữ dấu, dùng cho token đơn ngắn để tránh "An" khớp "án". */
  raw: string;
  singleToken: boolean;
  kind: MatchKind;
  weight: number;
}

interface MatchSource {
  kind: SourceKind;
  text: string;
  raw: string;
  weight: number;
}

interface ScoredProfile {
  profile: Profile;
  score: number;
}

const NAME_WEIGHT = 100;
const NICKNAME_WEIGHT = 80;
const EMAIL_WEIGHT = 100;
const KEYWORD_WEIGHT = 40;

const SOURCE_WEIGHTS: Record<SourceKind, number> = {
  quote: 3,
  title: 2,
  summary: 2,
  documentTitle: 1,
};

/** Bỏ dấu tiếng Việt, lowercase, chỉ giữ chữ/số và gom khoảng trắng. */
function normalizeForMatch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Giữ dấu tiếng Việt, chỉ bỏ ký tự trang trí — dùng cho token đơn. */
function normalizeWordsKeepDiacritics(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsPhrase(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

function termText(text: string, minSingleTokenLength: number): string | null {
  const normalized = normalizeForMatch(text);
  if (!normalized) return null;
  const tokens = normalized.split(' ');
  if (tokens.length === 1 && (tokens[0]?.length ?? 0) < minSingleTokenLength) return null;
  return normalized;
}

function containsTerm(source: MatchSource, term: MatchTerm): boolean {
  if (!term.singleToken) return containsPhrase(source.text, term.text);

  // Token đơn như "An" phải khớp nguyên dạng có dấu, tránh "án" → "an".
  if (containsPhrase(source.raw, term.raw)) return true;

  // Vẫn cho phép "Bình" khớp "binh" khi token đủ dài; token 2 ký tự thì không.
  return term.text.length >= 3 && containsPhrase(source.text, term.text);
}

function profileTerms(profile: Profile, keywordIsUnique: (keyword: string) => boolean): MatchTerm[] {
  const terms: MatchTerm[] = [];
  const add = (text: string, kind: MatchKind, weight: number, minSingleTokenLength: number) => {
    const normalized = termText(text, minSingleTokenLength);
    if (!normalized) return;
    terms.push({
      text: normalized,
      raw: normalizeWordsKeepDiacritics(text),
      singleToken: normalized.split(' ').length === 1,
      kind,
      weight,
    });
  };

  add(profile.name, 'name', NAME_WEIGHT, 2);
  for (const nickname of profile.nicknames) add(nickname, 'nickname', NICKNAME_WEIGHT, 2);
  if (profile.email) add(profile.email, 'email', EMAIL_WEIGHT, 2);
  for (const keyword of profile.keywords) {
    const normalized = termText(keyword, 3);
    if (normalized && keywordIsUnique(normalized)) {
      terms.push({
        text: normalized,
        raw: normalizeWordsKeepDiacritics(keyword),
        singleToken: normalized.split(' ').length === 1,
        kind: 'keyword',
        weight: KEYWORD_WEIGHT,
      });
    }
  }
  return terms;
}

function buildSources(input: ProfileMatchInput): MatchSource[] {
  const quote = input.quote ?? '';
  const title = input.title;
  const summary = input.summary.join(' ');
  const documentTitle = input.documentTitle ?? '';
  return [
    {
      kind: 'quote',
      text: normalizeForMatch(quote),
      raw: normalizeWordsKeepDiacritics(quote),
      weight: SOURCE_WEIGHTS.quote,
    },
    {
      kind: 'title',
      text: normalizeForMatch(title),
      raw: normalizeWordsKeepDiacritics(title),
      weight: SOURCE_WEIGHTS.title,
    },
    {
      kind: 'summary',
      text: normalizeForMatch(summary),
      raw: normalizeWordsKeepDiacritics(summary),
      weight: SOURCE_WEIGHTS.summary,
    },
    {
      kind: 'documentTitle',
      text: normalizeForMatch(documentTitle),
      raw: normalizeWordsKeepDiacritics(documentTitle),
      weight: SOURCE_WEIGHTS.documentTitle,
    },
  ];
}

function matchStrong(
  terms: MatchTerm[],
  profile: Profile,
  sources: MatchSource[],
): ScoredProfile | null {
  let best = 0;
  for (const term of terms) {
    if (term.kind === 'keyword') continue;
    for (const source of sources) {
      if (containsTerm(source, term)) {
        best = Math.max(best, term.weight * source.weight);
      }
    }
  }
  return best > 0 ? { profile, score: best } : null;
}

function matchWeak(
  terms: MatchTerm[],
  profile: Profile,
  sources: MatchSource[],
): ScoredProfile | null {
  const quote = sources.find((source) => source.kind === 'quote');
  if (!quote) return null;

  let best = 0;
  for (const term of terms) {
    if (term.kind !== 'keyword') continue;
    if (containsTerm(quote, term)) {
      best = Math.max(best, term.weight * quote.weight);
    }
  }
  return best > 0 ? { profile, score: best } : null;
}

function sortAndLimit(matches: ScoredProfile[]): string[] {
  return matches
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.profile.name.localeCompare(right.profile.name, 'vi');
    })
    .slice(0, 10)
    .map((match) => match.profile.id);
}

/**
 * Trả về id các hồ sơ khớp với một sự kiện.
 *
 * Tín hiệu mạnh (tên đầy đủ, biệt danh, email) thắng tín hiệu yếu (từ khoá).
 * Từ khoá chỉ được dùng khi không có tín hiệu mạnh, chỉ xét trong `quote`, và
 * phải là từ khoá duy nhất của đúng một hồ sơ.
 */
export function matchProfileIds(input: ProfileMatchInput, profiles: Profile[]): string[] {
  if (profiles.length === 0) return [];

  const keywordOwners = new Map<string, Set<string>>();
  for (const profile of profiles) {
    for (const keyword of profile.keywords) {
      const normalized = normalizeForMatch(keyword);
      if (!normalized) continue;
      const owners = keywordOwners.get(normalized) ?? new Set<string>();
      owners.add(profile.id);
      keywordOwners.set(normalized, owners);
    }
  }
  const keywordIsUnique = (keyword: string): boolean => (keywordOwners.get(keyword)?.size ?? 0) === 1;

  const sources = buildSources(input);
  const termsByProfile = new Map(
    profiles.map((profile) => [profile.id, profileTerms(profile, keywordIsUnique)] as const),
  );

  const strong: ScoredProfile[] = [];
  for (const profile of profiles) {
    const match = matchStrong(termsByProfile.get(profile.id) ?? [], profile, sources);
    if (match) strong.push(match);
  }
  if (strong.length > 0) return sortAndLimit(strong);

  const weak: ScoredProfile[] = [];
  for (const profile of profiles) {
    const match = matchWeak(termsByProfile.get(profile.id) ?? [], profile, sources);
    if (match) weak.push(match);
  }
  return sortAndLimit(weak);
}

/** Gắn `relatedProfiles` đã khớp vào candidate; giữ candidate hợp lệ theo schema. */
export function attachProfiles(
  candidate: EventCandidate,
  profiles: Profile[],
  documentTitle?: string,
): EventCandidate {
  const relatedProfiles = matchProfileIds(
    {
      title: candidate.title,
      summary: candidate.summary,
      ...(candidate.quote ? { quote: candidate.quote } : {}),
      ...(documentTitle ? { documentTitle } : {}),
    },
    profiles,
  );

  return EventCandidateSchema.parse({ ...candidate, relatedProfiles });
}
