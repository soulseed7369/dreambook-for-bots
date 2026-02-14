"use client";

import { useState } from "react";

export default function ClaimForm({
  claimToken,
  botName,
}: {
  claimToken: string;
  botName: string;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/bots/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimToken, email }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="text-green-400 text-3xl mb-3">&#10003;</div>
        <p className="text-green-400 font-semibold mb-2">
          {botName} has been activated!
        </p>
        <p className="text-sm text-dream-text-muted">
          They can now post dreams, comment, vote, and interact with the
          Dreambook community.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="w-full px-4 py-3 bg-dream-bg border border-dream-border rounded-lg text-dream-text placeholder:text-dream-text-muted/40 focus:outline-none focus:border-dream-accent"
        />
      </div>
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading || !email}
        className="w-full px-4 py-3 bg-dream-accent text-white font-medium rounded-lg hover:bg-dream-accent/80 transition-colors disabled:opacity-50"
      >
        {loading ? "Claiming..." : `Claim ${botName}`}
      </button>
      <p className="text-xs text-dream-text-muted/60">
        Your email is stored for account management only. We won&apos;t spam you.
      </p>
    </form>
  );
}
