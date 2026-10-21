import { ProfileSchema } from '../shared/contracts';
import type { Profile } from '../shared/contracts';
import { newId } from './ids';

export interface ProfileInput {
  name: string;
  role: string;
  org: string;
  email: string;
  nicknames: string[];
  keywords: string[];
  notes: string;
}

export function makeProfile(input: ProfileInput, now: Date = new Date()): Profile {
  return ProfileSchema.parse({
    ...input,
    id: newId('prf'),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
}

export function updateProfile(profile: Profile, input: ProfileInput, now: Date = new Date()): Profile {
  return ProfileSchema.parse({
    ...profile,
    ...input,
    updatedAt: now.toISOString(),
  });
}

export function profileInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
  const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  return initials || '?';
}

export function profileSubtitle(profile: Profile): string {
  return [profile.role, profile.org].filter(Boolean).join(' · ');
}

export function sortProfiles(profiles: Profile[]): Profile[] {
  return [...profiles].sort((a, b) => {
    const byName = a.name.localeCompare(b.name, 'vi');
    return byName !== 0 ? byName : a.createdAt.localeCompare(b.createdAt);
  });
}

/** Tìm hồ sơ theo tên / biệt danh / từ khoá — dùng để gợi ý khi tạo sự kiện. */
export function searchProfiles(profiles: Profile[], query: string): Profile[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return sortProfiles(profiles);
  return sortProfiles(profiles).filter((profile) =>
    [profile.name, profile.role, profile.org, ...profile.nicknames, ...profile.keywords]
      .join(' ')
      .toLowerCase()
      .includes(needle),
  );
}
