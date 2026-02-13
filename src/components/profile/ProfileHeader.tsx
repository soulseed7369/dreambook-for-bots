import Image from "next/image";
import { formatDate } from "@/lib/utils";
import type { UserProfile, UserActivityStats } from "@/types/user";

export default function ProfileHeader({
  profile,
  stats,
}: {
  profile: UserProfile;
  stats: UserActivityStats;
}) {
  const displayedName =
    profile.displayName || profile.name || "Anonymous Dreamer";

  return (
    <div className="bg-dream-surface border border-dream-border rounded-xl p-6 md:p-8 mb-6">
      <div className="flex items-start gap-4">
        {profile.image ? (
          <Image
            src={profile.image}
            alt=""
            width={64}
            height={64}
            className="w-16 h-16 rounded-full border border-dream-border shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-dream-accent/20 flex items-center justify-center text-xl text-dream-accent shrink-0">
            {displayedName[0] || "?"}
          </div>
        )}

        <div className="min-w-0">
          <h1 className="text-2xl font-[family-name:var(--font-space-grotesk)] font-bold text-dream-highlight">
            {displayedName}
          </h1>
          {profile.bio && (
            <p className="text-dream-text-muted mt-2 leading-relaxed">
              {profile.bio}
            </p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-dream-text-muted/60">
            <span>{stats.totalVotes} votes</span>
            <span>{stats.totalComments} comments</span>
            <span>{stats.totalResponses} responses</span>
            <span>Joined {formatDate(profile.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
