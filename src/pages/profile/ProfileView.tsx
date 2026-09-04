import { useAuth } from '@/lib/auth';
import { ManualProfileHost } from '@/lib/profileHost';
import { type ProfileData, ProfileView as SharedProfileView } from '@honeycomb/profile';
import { useManualProfileSections } from './sections';

export type { ProfileData };

/**
 * PROFILE_SHARED1 — thin adapter over @honeycomb/profile's ProfileView. All
 * roof-specific tabs (forums/events/watching/campaigns/listings/groups/
 * rank/badges) and the timeline feed come from `useManualProfileSections`
 * (this astra's own `sections.tsx`, unchanged in substance from the
 * pre-PROFILE_SHARED1 ProfileView.tsx panes).
 */
export function ProfileView({ profile, isSelf }: { profile: ProfileData; isSelf: boolean }) {
  const { bee } = useAuth();
  const { sections, timelineRows } = useManualProfileSections(profile.id);

  return (
    <ManualProfileHost>
      <SharedProfileView
        profile={profile}
        isSelf={isSelf}
        viewerBeeId={bee?.id ?? null}
        timelineRows={timelineRows}
        sections={sections}
      />
    </ManualProfileHost>
  );
}
