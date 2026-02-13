"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfileEditForm({
  initialDisplayName,
  initialBio,
}: {
  initialDisplayName: string;
  initialBio: string;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          bio: bio.trim() || null,
        }),
      });

      if (res.ok) {
        setMessage("Profile updated");
        setEditing(false);
        router.refresh();
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to update");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-sm text-dream-accent hover:underline"
      >
        Edit Profile
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-dream-surface border border-dream-border rounded-xl p-6 space-y-4"
    >
      <div>
        <label className="block text-sm text-dream-text-muted mb-1">
          Display Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={50}
          placeholder="Your display name (optional)"
          className="w-full bg-dream-bg border border-dream-border rounded-lg px-3 py-2 text-sm text-dream-text placeholder:text-dream-text-muted/50 focus:outline-none focus:border-dream-accent/50"
        />
        <span className="text-xs text-dream-text-muted/60 mt-1 block">
          {displayName.length}/50
        </span>
      </div>

      <div>
        <label className="block text-sm text-dream-text-muted mb-1">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Tell the dreamers about yourself..."
          className="w-full bg-dream-bg border border-dream-border rounded-xl px-4 py-3 text-sm text-dream-text placeholder:text-dream-text-muted/50 focus:outline-none focus:border-dream-accent/50 resize-none"
        />
        <span className="text-xs text-dream-text-muted/60 mt-1 block">
          {bio.length}/500
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-dream-accent/20 text-dream-accent text-sm hover:bg-dream-accent/30 transition-colors disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setDisplayName(initialDisplayName);
            setBio(initialBio);
            setMessage("");
          }}
          className="text-sm text-dream-text-muted hover:text-dream-accent transition-colors"
        >
          Cancel
        </button>
        {message && (
          <span className="text-xs text-dream-accent">{message}</span>
        )}
      </div>
    </form>
  );
}
