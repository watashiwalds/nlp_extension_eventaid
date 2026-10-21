import type { Profile } from '../../shared/contracts';
import { saveProfileInput } from '../../core/forms';
import { parseListInput } from '../../core/text';
import { deleteProfile, saveEvent, saveProfile } from '../../platform/storage/db';
import { EMPTY_PROFILE_DRAFT, editingProfile, showToast, store } from '../store';
import type { ProfileDraft } from '../store';
import { messageOf, valueOf } from './shared';

export function openProfileForm(profileId?: string): void {
  const state = store.get();
  const profile = profileId ? state.profiles.find((item) => item.id === profileId) ?? null : null;
  const values: ProfileDraft = profile
    ? {
        name: profile.name,
        role: profile.role,
        org: profile.org,
        email: profile.email,
        nicknames: profile.nicknames.join(', '),
        keywords: profile.keywords.join(', '),
        notes: profile.notes,
      }
    : { ...EMPTY_PROFILE_DRAFT };

  store.set({
    tab: 'profiles',
    eventForm: { ...state.eventForm, open: false },
    profileForm: { open: true, editingId: profile?.id ?? null, values, errors: {} },
  });
}

export function closeProfileForm(): void {
  store.set((state) => ({
    ...state,
    profileForm: { open: false, editingId: null, values: EMPTY_PROFILE_DRAFT, errors: {} },
  }));
}

export async function saveProfileFromForm(form: HTMLFormElement): Promise<void> {
  const draft: ProfileDraft = {
    name: valueOf(form, 'name'),
    role: valueOf(form, 'role'),
    org: valueOf(form, 'org'),
    email: valueOf(form, 'email'),
    nicknames: valueOf(form, 'nicknames'),
    keywords: valueOf(form, 'keywords'),
    notes: valueOf(form, 'notes'),
  };

  const existing: Profile | null = editingProfile(store.get());
  const result = saveProfileInput(
    {
      name: draft.name,
      role: draft.role,
      org: draft.org,
      email: draft.email,
      nicknames: parseListInput(draft.nicknames, 10),
      keywords: parseListInput(draft.keywords, 20),
      notes: draft.notes,
    },
    existing,
  );

  if (!result.data) {
    store.set((state) => ({
      ...state,
      profileForm: { ...state.profileForm, values: draft, errors: result.errors },
    }));
    showToast('error', 'Kiểm tra lại các trường được đánh dấu.');
    return;
  }

  const profile = result.data;
  store.set({ busy: existing ? 'Đang lưu hồ sơ…' : 'Đang tạo hồ sơ…' });
  try {
    await saveProfile(profile);
    store.set((state) => ({
      ...state,
      profiles: existing
        ? state.profiles.map((item) => (item.id === profile.id ? profile : item))
        : [profile, ...state.profiles],
      profileForm: { open: false, editingId: null, values: EMPTY_PROFILE_DRAFT, errors: {} },
    }));
    showToast('success', existing ? 'Đã lưu hồ sơ.' : 'Đã tạo hồ sơ.');
  } catch (error) {
    showToast('error', messageOf(error));
  } finally {
    store.set({ busy: null });
  }
}

export function deleteProfileAction(id: string): void {
  const profile = store.get().profiles.find((item) => item.id === id);
  if (!profile) return;
  if (!window.confirm(`Xoá hồ sơ “${profile.name}”? Hồ sơ sẽ được gỡ khỏi các sự kiện liên quan.`)) {
    return;
  }
  void (async () => {
    try {
      const affected = store.get().events.filter((event) => event.relatedProfiles.includes(id));
      const updated = affected.map((event) => ({
        ...event,
        relatedProfiles: event.relatedProfiles.filter((profileId) => profileId !== id),
        updatedAt: new Date().toISOString(),
      }));
      await Promise.all(updated.map((event) => saveEvent(event)));
      await deleteProfile(id);
      store.set((state) => ({
        ...state,
        profiles: state.profiles.filter((item) => item.id !== id),
        events: state.events.map((event) => updated.find((item) => item.id === event.id) ?? event),
      }));
      showToast('success', 'Đã xoá hồ sơ.');
    } catch (error) {
      showToast('error', messageOf(error));
    }
  })();
}
