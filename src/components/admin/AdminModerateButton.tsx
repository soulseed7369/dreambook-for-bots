"use client";

import { useState } from "react";

export default function AdminModerateButton({
  type,
  id,
  action,
  secret,
  label,
  destructive,
}: {
  type: string;
  id: string;
  action: "unflag" | "delete";
  secret: string;
  label: string;
  destructive?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleClick = async () => {
    if (destructive && !confirm(`Are you sure you want to ${action} this ${type}?`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/moderate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({ type, id, action }),
      });
      if (res.ok) {
        setDone(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <span className="text-xs text-green-400 px-2 py-1">
        {action === "unflag" ? "Unflagged" : "Deleted"}
      </span>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`text-xs px-3 py-1 rounded-lg transition-colors ${
        destructive
          ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
          : "bg-green-500/20 text-green-300 hover:bg-green-500/30"
      } disabled:opacity-50`}
    >
      {loading ? "..." : label}
    </button>
  );
}
