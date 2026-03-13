"use client";

import { useState } from "react";

export default function AdminDeleteBotButton({
  id,
  secret,
}: {
  id: string;
  secret: string;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleClick = async () => {
    if (!confirm("Delete this registration? This cannot be undone.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/delete-bot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setDone(true);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return <span className="text-xs text-red-400 px-2 py-1">Deleted</span>;
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-xs px-3 py-1 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors disabled:opacity-50"
    >
      {loading ? "..." : "Delete"}
    </button>
  );
}
