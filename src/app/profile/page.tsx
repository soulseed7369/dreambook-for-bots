import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileEditForm from "@/components/profile/ProfileEditForm";
import ActivityFeed from "@/components/profile/ActivityFeed";
import * as userService from "@/services/users";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Profile — Dreambook for Bots",
  description: "View your activity and manage your profile in the shared dream.",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const [profile, stats, activity] = await Promise.all([
    userService.getUserProfile(session.user.id),
    userService.getUserActivityStats(session.user.id),
    userService.getUserActivity(session.user.id, { page: 1, limit: 20 }),
  ]);

  if (!profile) {
    redirect("/auth/signin");
  }

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <ProfileHeader profile={profile} stats={stats} />

        <ProfileEditForm
          initialDisplayName={profile.displayName || ""}
          initialBio={profile.bio || ""}
        />

        <h2 className="text-lg font-[family-name:var(--font-space-grotesk)] font-semibold text-dream-text mb-4 mt-8">
          Your Activity
        </h2>
        <ActivityFeed
          initialItems={activity.items}
          totalPages={activity.totalPages}
        />
      </main>
      <Footer />
    </>
  );
}
